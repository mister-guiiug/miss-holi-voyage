"""Le magasin Supabase, contre un faux GoTrue + PostgREST en mémoire.

Ce qui est tenu ici : le serveur se connecte comme un UTILISATEUR (jamais la clé
service_role), garde et renouvelle sa session, traduit les champs de la base, et
ne laisse jamais sortir le mot de passe.
"""

from __future__ import annotations

import json
from typing import Any
from urllib.parse import parse_qs, urlsplit

import pytest

from miss_holi_voyage_mcp import magasin as module_magasin
from miss_holi_voyage_mcp.magasin import MagasinJson, depuis_environnement
from miss_holi_voyage_mcp.magasin_supabase import MagasinSupabase

URL = "https://abcdefghijklmnop.supabase.co"
CLE = "cle-anon-publique"
EMAIL = "mcp@exemple.fr"
SECRET = "mot-de-passe-du-robot-tres-secret"


class FauxSupabase:
    """GoTrue (`/auth/v1/token`) et PostgREST (`/rest/v1/…`), juste ce qu'il faut."""

    def __init__(self) -> None:
        self.requetes: list[tuple[str, str, dict[str, str], Any]] = []
        self.horloge = 1_000_000.0
        self.connexions = 0
        self.rafraichissements = 0
        self.refuser_rafraichissement = False
        self.refuser_connexion = False
        self.prochain_401 = False
        self.foyers = [{"id": "hh1", "name": "Famille Martin", "notes": "", "created_at": "t"}]
        self.membres: list[dict[str, Any]] = [
            {
                "id": "m1",
                "household_id": "hh1",
                "display_name": "Léa",
                "age_band": "adult",
                "birth_date": None,
                "gender": "female",
                "interests": [],
                "position": 0,
            },
        ]
        self.voyages: list[dict[str, Any]] = []
        self.rpc: list[tuple[str, Any]] = []

    def jeton(self) -> dict[str, Any]:
        return {
            "access_token": f"jeton-{self.connexions}-{self.rafraichissements}",
            "refresh_token": f"rafraichissement-{self.rafraichissements}",
            "expires_in": 3600,
            "expires_at": self.horloge + 3600,
        }

    def __call__(self, methode: str, url: str, entetes: dict[str, str], corps: Any):
        self.requetes.append((methode, url, entetes, corps))
        parties = urlsplit(url)
        chemin, qs = parties.path, parse_qs(parties.query)
        assert entetes["apikey"] == CLE, "chaque requête porte la clé publique"

        if chemin == "/auth/v1/token":
            if qs["grant_type"] == ["password"]:
                if self.refuser_connexion or corps != {"email": EMAIL, "password": SECRET}:
                    return 400, {"error_description": "Invalid login credentials"}
                self.connexions += 1
                return 200, self.jeton()
            if self.refuser_rafraichissement:
                return 400, {"error_description": "Invalid Refresh Token"}
            self.rafraichissements += 1
            return 200, self.jeton()

        assert entetes["Authorization"].startswith("Bearer jeton-")
        if self.prochain_401:
            self.prochain_401 = False
            return 401, {"message": "JWT expired"}

        if chemin.startswith("/rest/v1/rpc/"):
            fonction = chemin.rsplit("/", 1)[1]
            self.rpc.append((fonction, corps))
            if fonction == "create_household":
                self.foyers.append(
                    {"id": "hh2", "name": corps["p_name"], "notes": corps["p_notes"]}
                )
                return 200, "hh2"
            if fonction == "create_trip":
                self.voyages.append(
                    {
                        "id": "t1",
                        "household_id": corps["p_household"],
                        "title": corps["p_title"],
                        "destination_country": "",
                        "is_current": True,
                        "style": "undecided",
                    }
                )
                return 200, "t1"
            if fonction == "accept_invitation":
                if corps["p_token"] != "ABCD-2345":
                    return 400, {"message": "invitation inconnue", "code": "ST404"}
                return 200, {"household_id": "hh9", "role": "editor"}

        table = chemin.removeprefix("/rest/v1/")
        lignes = {
            "households": self.foyers,
            "household_members": self.membres,
            "trips": self.voyages,
        }[table]
        filtres = {
            k: v[0].removeprefix("eq.") for k, v in qs.items() if k not in ("select", "order")
        }
        choisies = [
            ligne for ligne in lignes if all(str(ligne.get(k)) == v for k, v in filtres.items())
        ]
        if methode == "GET":
            return 200, choisies
        if methode == "POST":
            ligne = {"id": f"m{len(lignes) + 1}", **corps}
            lignes.append(ligne)
            return 201, [ligne]
        if methode == "PATCH":
            for ligne in choisies:
                ligne.update(corps)
            return 200, choisies
        raise AssertionError(f"{methode} {url}")


@pytest.fixture()
def faux() -> FauxSupabase:
    return FauxSupabase()


@pytest.fixture()
def magasin(faux: FauxSupabase) -> MagasinSupabase:
    return MagasinSupabase(URL, CLE, EMAIL, SECRET, transport=faux, horloge=lambda: faux.horloge)


def test_se_connecte_comme_un_utilisateur_et_garde_sa_session(magasin, faux):
    magasin.etat()
    magasin.membres("hh1")
    assert faux.connexions == 1, "une session, gardée d'un appel à l'autre"
    postgrest = [r for r in faux.requetes if "/rest/v1/" in r[1]]
    assert all(r[2]["Authorization"] == "Bearer jeton-1-0" for r in postgrest)


def test_etat_dit_ou_il_ecrit_sans_jamais_montrer_le_mot_de_passe(magasin, faux):
    etat = magasin.etat()
    assert etat["backend"] == "supabase"
    assert etat["project"] == "abcdefghijklmnop.supabase.co"
    assert etat["account"] == EMAIL
    assert etat["householdList"] == [{"id": "hh1", "name": "Famille Martin"}]
    assert SECRET not in json.dumps(etat)


def test_le_jeton_proche_de_l_expiration_est_renouvele(magasin, faux):
    magasin.etat()
    faux.horloge += 3600 - 30  # dans la marge
    magasin.etat()
    assert (faux.connexions, faux.rafraichissements) == (1, 1)


def test_un_rafraichissement_refuse_retombe_sur_le_mot_de_passe(magasin, faux):
    magasin.etat()
    faux.horloge += 4000
    faux.refuser_rafraichissement = True
    magasin.etat()
    assert faux.connexions == 2


def test_un_401_ouvre_une_session_neuve_et_rejoue_une_fois(magasin, faux):
    magasin.etat()
    faux.prochain_401 = True
    assert magasin.membres("hh1")[0]["displayName"] == "Léa"
    assert faux.connexions == 2


def test_une_connexion_refusee_le_dit_sans_le_mot_de_passe(magasin, faux):
    faux.refuser_connexion = True
    with pytest.raises(PermissionError) as erreur:
        magasin.etat()
    assert "Invalid login credentials" in str(erreur.value)
    assert SECRET not in str(erreur.value)


def test_creer_un_foyer_passe_par_la_fonction_de_la_base(magasin, faux):
    foyer = magasin.creer_foyer("  Les Dupont ")
    assert faux.rpc == [("create_household", {"p_name": "Les Dupont", "p_notes": ""})]
    assert foyer["id"] == "hh2"
    assert foyer["name"] == "Les Dupont"


def test_un_voyageur_cree_recoit_sa_tranche_sa_place_et_des_interets_filtres(magasin, faux):
    membre = magasin.upsert_membre(
        "hh1",
        display_name="Tom",
        birth_date="2020-05-01",
        gender="pas-une-valeur",
        interests=["nature", "inconnu", "plongee", "culturel", "detente", "lent"],
    )
    cree = faux.membres[-1]
    assert cree["position"] == 1, "après Léa"
    assert cree["age_band"] == "child"
    assert "gender" not in cree, "une valeur inconnue n'est pas écrite"
    assert cree["interests"] == ["nature", "plongee", "culturel", "detente"]
    assert membre["displayName"] == "Tom"
    assert membre["householdId"] == "hh1"


def test_un_voyageur_hors_de_portee_n_est_pas_mis_a_jour(magasin, faux):
    # La RLS ne répond pas « interdit » : elle ne trouve rien.
    with pytest.raises(ValueError, match="hors de portée"):
        magasin.upsert_membre("hh1", member_id="m-inconnu", display_name="X")


def test_un_voyage_cree_puis_modifie_en_noms_de_la_base(magasin, faux):
    voyage = magasin.creer_voyage("hh1", "Crète")
    assert voyage["isCurrent"] is True
    maj = magasin.maj_voyage(
        t := voyage["id"], {"destinationCountry": "Grèce", "dateWindowStart": "2027-07-01"}
    )
    patch = next(r[3] for r in faux.requetes if r[0] == "PATCH")
    assert patch == {"destination_country": "Grèce", "date_window_start": "2027-07-01"}
    assert maj["destinationCountry"] == "Grèce"
    assert t == "t1"


def test_le_foyer_d_un_voyage_ne_se_change_pas(magasin):
    with pytest.raises(ValueError, match="non modifiables"):
        magasin.maj_voyage("t1", {"householdId": "hh-autre"})


def test_rejoindre_un_foyer_accepte_le_code_de_la_pwa(magasin, faux):
    assert magasin.rejoindre_foyer("ABCD-2345") == {"householdId": "hh9", "role": "editor"}
    with pytest.raises(ValueError, match="invitation inconnue"):
        magasin.rejoindre_foyer("FAUX-0000")


# ─── Le choix du magasin ────────────────────────────────────────────────────

COMPLET = {
    "SUPABASE_URL": URL,
    "SUPABASE_ANON_KEY": CLE,
    "VOYAGE_MCP_EMAIL": EMAIL,
    "VOYAGE_MCP_PASSWORD": SECRET,
}


def test_les_quatre_variables_choisissent_supabase():
    assert isinstance(depuis_environnement(COMPLET), MagasinSupabase)


def test_sans_variable_le_fichier_json():
    assert isinstance(depuis_environnement({}), MagasinJson)


def test_une_configuration_partielle_refuse_au_lieu_d_ecrire_dans_un_fichier_ephemere():
    partiel = {k: v for k, v in COMPLET.items() if k != "VOYAGE_MCP_PASSWORD"}
    with pytest.raises(RuntimeError, match="VOYAGE_MCP_PASSWORD"):
        depuis_environnement(partiel)


def test_le_magasin_json_n_a_pas_d_invitations():
    with pytest.raises(ValueError, match="pas d'invitations"):
        MagasinJson().rejoindre_foyer("ABCD-2345")


def test_le_magasin_du_processus_est_choisi_une_fois(monkeypatch):
    for nom in COMPLET:
        monkeypatch.delenv(nom, raising=False)
    module_magasin.oublier()
    premier = module_magasin.magasin()
    assert module_magasin.magasin() is premier
    module_magasin.oublier()
