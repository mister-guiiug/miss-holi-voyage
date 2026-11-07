"""Le magasin des outils : Supabase sous un compte robot si configuré, sinon le fichier JSON.

Les deux tiennent le même contrat (`etat`, `membres`, `creer_foyer`,
`upsert_membre`, `creer_voyage`, `maj_voyage`, `rejoindre_foyer`), si bien que
les outils ne savent pas où ils écrivent.

UNE CONFIGURATION PARTIELLE EST UNE ERREUR, PAS UN REPLI. Trois variables sur
quatre posées sur Horizon, et le serveur écrirait en silence dans un fichier que
le disque éphémère efface — l'IA croirait avoir enregistré le voyage. Il refuse
donc, en nommant ce qui manque.
"""

from __future__ import annotations

import os
from collections.abc import Mapping
from typing import Any

from miss_holi_voyage_mcp import store
from miss_holi_voyage_mcp.magasin_supabase import MagasinSupabase

#: Dans cet ordre : URL du projet, clé publique, identifiants du compte robot.
VARIABLES_SUPABASE = (
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "VOYAGE_MCP_EMAIL",
    "VOYAGE_MCP_PASSWORD",
)


class MagasinJson:
    """Le fichier JSON (`VOYAGE_MCP_STORE`) : travail local, tests, sans compte."""

    def etat(self) -> dict[str, Any]:
        snap = store.load()
        return {
            "backend": "json",
            "storePath": str(store.store_path()),
            "households": len(snap["households"]),
            "members": len(snap["members"]),
            "trips": len(snap["trips"]),
            "householdList": [{"id": h["id"], "name": h["name"]} for h in snap["households"]],
            "tripList": [
                {
                    "id": t["id"],
                    "title": t["title"],
                    "householdId": t["householdId"],
                    "destinationCountry": t.get("destinationCountry") or "",
                }
                for t in snap["trips"]
            ],
        }

    def membres(self, household_id: str) -> list[dict[str, Any]]:
        return [m for m in store.load()["members"] if m["householdId"] == household_id]

    def creer_foyer(self, name: str, notes: str = "") -> dict[str, Any]:
        return store.create_household(name, notes)

    def upsert_membre(self, household_id: str, **champs: Any) -> dict[str, Any]:
        return store.upsert_member(household_id, **champs)

    def creer_voyage(self, household_id: str, title: str) -> dict[str, Any]:
        return store.create_trip(household_id, title)

    def maj_voyage(self, trip_id: str, patch: dict[str, Any]) -> dict[str, Any]:
        return store.update_trip(trip_id, patch)

    def rejoindre_foyer(self, code: str) -> dict[str, Any]:
        raise ValueError(
            "le magasin JSON n'a pas d'invitations : configurer Supabase "
            f"({', '.join(VARIABLES_SUPABASE)})"
        )


def depuis_environnement(env: Mapping[str, str] = os.environ) -> MagasinSupabase | MagasinJson:
    valeurs = {nom: (env.get(nom) or "").strip() for nom in VARIABLES_SUPABASE}
    manquantes = [nom for nom, valeur in valeurs.items() if not valeur]
    if not manquantes:
        return MagasinSupabase(*valeurs.values())
    if len(manquantes) < len(VARIABLES_SUPABASE):
        raise RuntimeError(f"configuration Supabase incomplète : manque {', '.join(manquantes)}")
    return MagasinJson()


_courant: MagasinSupabase | MagasinJson | None = None


def magasin() -> MagasinSupabase | MagasinJson:
    """Le magasin du processus, choisi une fois : la session Supabase se garde."""
    global _courant
    if _courant is None:
        _courant = depuis_environnement()
    return _courant


def oublier() -> None:
    """Pour les tests : le prochain appel relit l'environnement."""
    global _courant
    _courant = None
