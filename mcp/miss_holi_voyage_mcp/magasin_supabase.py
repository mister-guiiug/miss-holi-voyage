"""Le magasin voyage dans Supabase, sous l'identité d'un compte ROBOT.

POURQUOI UN ROBOT ET PAS LA CLÉ `service_role` (ADR 0017). La base de l'app
protège chaque table par la RLS : un utilisateur ne voit que les foyers dont il
est membre, et n'écrit que là où son rôle le permet. La clé `service_role`
contournerait tout cela — n'importe quel client du serveur MCP verrait tous les
foyers de tous les comptes. Le serveur se connecte donc comme un utilisateur
ordinaire, un compte dédié que le propriétaire INVITE dans un foyer depuis la
PWA (`voyage_rejoindre_foyer` accepte le code). Retirer le robot du foyer lui
coupe l'accès ; ses écritures portent son identifiant (`created_by`).

Rien que la bibliothèque standard : l'archive envoyée à Horizon reste petite, et
le transport HTTP s'injecte (`transport=`) pour que les tests n'aient pas besoin
du réseau.

Le mot de passe ne sort jamais d'ici : ni dans `etat`, ni dans un message
d'erreur, ni dans les journaux.
"""

from __future__ import annotations

import json
import threading
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from typing import Any
from urllib.parse import quote, urlsplit

from miss_holi_voyage_mcp.store import GENDERS, INTERESTS, MAX_INTERESTS
from miss_holi_voyage_mcp.ticket_age import age_band_from_birth

# (méthode, url, en-têtes, corps JSON ou None) -> (statut, corps décodé)
Transport = Callable[[str, str, dict[str, str], Any], tuple[int, Any]]

#: Renouveler le jeton un peu avant son expiration, jamais sur le fil.
_MARGE_S = 60


def _transport_urllib(
    methode: str, url: str, entetes: dict[str, str], corps: Any
) -> tuple[int, Any]:
    donnees = None if corps is None else json.dumps(corps).encode("utf-8")
    requete = urllib.request.Request(url, data=donnees, method=methode, headers=entetes)
    try:
        with urllib.request.urlopen(requete, timeout=20) as reponse:
            brut = reponse.read()
            statut = reponse.status
    except urllib.error.HTTPError as erreur:
        brut = erreur.read()
        statut = erreur.code
    texte = brut.decode("utf-8") if brut else ""
    try:
        return statut, json.loads(texte) if texte else None
    except json.JSONDecodeError:
        return statut, texte


def _message(corps: Any, statut: int) -> str:
    """Le message lisible d'une erreur Supabase, sans rien de la requête."""
    if isinstance(corps, dict):
        for cle in ("message", "msg", "error_description", "error"):
            if isinstance(corps.get(cle), str) and corps[cle]:
                return corps[cle]
    return f"Supabase a répondu {statut}"


# ─── Correspondances base ↔ outils (snake_case ↔ camelCase) ──────────────────

_MEMBRE = {
    "id": "id",
    "household_id": "householdId",
    "display_name": "displayName",
    "birth_date": "birthDate",
    "age_band": "ageBand",
    "gender": "gender",
    "mobility_notes": "mobilityNotes",
    "food_notes": "foodNotes",
    "sleep_notes": "sleepNotes",
    "interests": "interests",
    "position": "position",
}
_VOYAGE = {
    "id": "id",
    "household_id": "householdId",
    "title": "title",
    "destination_country": "destinationCountry",
    "destination_region": "destinationRegion",
    "destination_notes": "destinationNotes",
    "date_window_start": "dateWindowStart",
    "date_window_end": "dateWindowEnd",
    "budget_ceiling": "budgetCeiling",
    "budget_currency": "budgetCurrency",
    "style": "style",
    "style_notes": "styleNotes",
    "is_current": "isCurrent",
    "created_at": "createdAt",
    "updated_at": "updatedAt",
}
_VOYAGE_INVERSE = {v: k for k, v in _VOYAGE.items()}
#: Ce que `maj_voyage` a le droit de toucher — ni l'identifiant, ni le foyer.
_VOYAGE_MODIFIABLE = {
    "title",
    "destinationCountry",
    "destinationRegion",
    "destinationNotes",
    "dateWindowStart",
    "dateWindowEnd",
}


def _camel(ligne: dict[str, Any], table: dict[str, str]) -> dict[str, Any]:
    return {camel: ligne.get(snake) for snake, camel in table.items() if snake in ligne}


class MagasinSupabase:
    """Foyers, voyageurs et voyages lus et écrits dans Supabase, sous la RLS."""

    def __init__(
        self,
        url: str,
        cle_anon: str,
        email: str,
        mot_de_passe: str,
        *,
        transport: Transport | None = None,
        horloge: Callable[[], float] = time.time,
    ) -> None:
        self._url = url.rstrip("/")
        self._cle = cle_anon
        self._email = email
        self._mot_de_passe = mot_de_passe
        self._transport = transport or _transport_urllib
        self._horloge = horloge
        self._verrou = threading.Lock()
        self._jeton: str | None = None
        self._rafraichissement: str | None = None
        self._expire_a = 0.0

    # ─── Session ────────────────────────────────────────────────────────────

    def _auth(self, grant: str, corps: dict[str, str]) -> None:
        statut, reponse = self._transport(
            "POST",
            f"{self._url}/auth/v1/token?grant_type={grant}",
            {"apikey": self._cle, "Content-Type": "application/json"},
            corps,
        )
        if statut != 200 or not isinstance(reponse, dict) or "access_token" not in reponse:
            # Le message de GoTrue (« Invalid login credentials »), jamais le corps
            # envoyé : il porte le mot de passe.
            raise PermissionError(f"connexion du compte MCP refusée : {_message(reponse, statut)}")
        self._jeton = reponse["access_token"]
        self._rafraichissement = reponse.get("refresh_token")
        duree = reponse.get("expires_in") or 3600
        self._expire_a = float(reponse.get("expires_at") or self._horloge() + duree)

    def _connecter(self) -> None:
        self._auth("password", {"email": self._email, "password": self._mot_de_passe})

    def _jeton_valide(self, *, forcer: bool = False) -> str:
        with self._verrou:
            if forcer or self._jeton is None:
                self._connecter()
            elif self._horloge() > self._expire_a - _MARGE_S:
                try:
                    if not self._rafraichissement:
                        raise PermissionError("pas de jeton de rafraîchissement")
                    self._auth("refresh_token", {"refresh_token": self._rafraichissement})
                except PermissionError:
                    # Le jeton de rafraîchissement a pu être révoqué ou tourner :
                    # le mot de passe reconstruit une session neuve.
                    self._connecter()
            assert self._jeton is not None
            return self._jeton

    # ─── PostgREST ──────────────────────────────────────────────────────────

    def _requete(
        self,
        methode: str,
        chemin: str,
        corps: Any = None,
        *,
        representation: bool = False,
    ) -> Any:
        for tentative in range(2):
            entetes = {
                "apikey": self._cle,
                "Authorization": f"Bearer {self._jeton_valide(forcer=tentative == 1)}",
                "Content-Type": "application/json",
            }
            if representation:
                entetes["Prefer"] = "return=representation"
            statut, reponse = self._transport(methode, f"{self._url}{chemin}", entetes, corps)
            if statut == 401 and tentative == 0:
                continue  # jeton refusé (révoqué, horloge) : une session neuve, une fois
            if statut >= 400:
                raise ValueError(_message(reponse, statut))
            return reponse
        raise PermissionError("session Supabase refusée deux fois")

    def _rpc(self, fonction: str, arguments: dict[str, Any]) -> Any:
        return self._requete("POST", f"/rest/v1/rpc/{fonction}", arguments)

    def _un(self, table: str, identifiant: str, colonnes: str = "*") -> dict[str, Any] | None:
        lignes = self._requete(
            "GET", f"/rest/v1/{table}?id=eq.{quote(identifiant)}&select={colonnes}"
        )
        return lignes[0] if lignes else None

    # ─── Le contrat des outils ──────────────────────────────────────────────

    def etat(self) -> dict[str, Any]:
        foyers = self._requete("GET", "/rest/v1/households?select=id,name&order=created_at")
        voyages = self._requete(
            "GET",
            "/rest/v1/trips?select=id,title,household_id,destination_country&order=created_at",
        )
        membres = self._requete("GET", "/rest/v1/household_members?select=id")
        return {
            "backend": "supabase",
            "project": urlsplit(self._url).hostname,
            "account": self._email,
            "households": len(foyers),
            "members": len(membres),
            "trips": len(voyages),
            "householdList": [{"id": f["id"], "name": f["name"]} for f in foyers],
            "tripList": [
                {
                    "id": v["id"],
                    "title": v["title"],
                    "householdId": v["household_id"],
                    "destinationCountry": v.get("destination_country") or "",
                }
                for v in voyages
            ],
        }

    def membres(self, household_id: str) -> list[dict[str, Any]]:
        lignes = self._requete(
            "GET",
            f"/rest/v1/household_members?household_id=eq.{quote(household_id)}"
            "&select=*&order=position",
        )
        return [_camel(ligne, _MEMBRE) for ligne in lignes]

    def creer_foyer(self, name: str, notes: str = "") -> dict[str, Any]:
        identifiant = self._rpc("create_household", {"p_name": name.strip(), "p_notes": notes})
        ligne = self._un("households", identifiant, "id,name,notes,created_at,updated_at")
        if ligne is None:
            raise ValueError("foyer créé mais illisible")
        return {
            "id": ligne["id"],
            "name": ligne["name"],
            "notes": ligne.get("notes", ""),
            "createdAt": ligne.get("created_at"),
            "updatedAt": ligne.get("updated_at"),
        }

    def upsert_membre(
        self,
        household_id: str,
        *,
        member_id: str | None = None,
        display_name: str,
        birth_date: str | None = None,
        age_band: str | None = None,
        gender: str | None = None,
        interests: list[str] | None = None,
    ) -> dict[str, Any]:
        tranche = age_band_from_birth(birth_date) if birth_date else (age_band or "adult")
        champs: dict[str, Any] = {
            "display_name": display_name,
            "birth_date": birth_date,
            "age_band": tranche,
        }
        if gender in GENDERS:
            champs["gender"] = gender
        if interests is not None:
            champs["interests"] = [i for i in interests if i in INTERESTS][:MAX_INTERESTS]

        if member_id:
            lignes = self._requete(
                "PATCH",
                f"/rest/v1/household_members?id=eq.{quote(member_id)}"
                f"&household_id=eq.{quote(household_id)}",
                champs,
                representation=True,
            )
            if not lignes:
                # La RLS ne dit pas « interdit » : elle ne trouve rien.
                raise ValueError(f"membre inconnu ou hors de portée : {member_id}")
            return _camel(lignes[0], _MEMBRE)

        deja = self._requete(
            "GET", f"/rest/v1/household_members?household_id=eq.{quote(household_id)}&select=id"
        )
        lignes = self._requete(
            "POST",
            "/rest/v1/household_members",
            {"household_id": household_id, "position": len(deja), **champs},
            representation=True,
        )
        return _camel(lignes[0], _MEMBRE)

    def creer_voyage(self, household_id: str, title: str) -> dict[str, Any]:
        identifiant = self._rpc("create_trip", {"p_household": household_id, "p_title": title})
        ligne = self._un("trips", identifiant)
        if ligne is None:
            raise ValueError("voyage créé mais illisible")
        return _camel(ligne, _VOYAGE)

    def maj_voyage(self, trip_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        inconnus = set(patch) - _VOYAGE_MODIFIABLE
        if inconnus:
            raise ValueError(f"champs non modifiables : {', '.join(sorted(inconnus))}")
        champs = {_VOYAGE_INVERSE[cle]: valeur for cle, valeur in patch.items()}
        lignes = self._requete(
            "PATCH", f"/rest/v1/trips?id=eq.{quote(trip_id)}", champs, representation=True
        )
        if not lignes:
            raise ValueError(f"voyage inconnu ou hors de portée : {trip_id}")
        return _camel(lignes[0], _VOYAGE)

    def rejoindre_foyer(self, code: str) -> dict[str, Any]:
        reponse = self._rpc("accept_invitation", {"p_token": code})
        return {"householdId": reponse.get("household_id"), "role": reponse.get("role")}
