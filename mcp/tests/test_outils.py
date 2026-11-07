"""Les outils, appelés comme le fera un client MCP, sur le magasin fichier.

Ce qui est tenu : chaque outil passe par `magasin()`, et ses refus reviennent en
erreur d'outil lisible plutôt qu'en exception brute.
"""

from __future__ import annotations

import asyncio
from typing import Any

import pytest
from fastmcp import Client
from fastmcp.exceptions import ToolError

from miss_holi_voyage_mcp import magasin as module_magasin
from serveur import mcp


@pytest.fixture(autouse=True)
def magasin_fichier(tmp_path, monkeypatch):
    for nom in module_magasin.VARIABLES_SUPABASE:
        monkeypatch.delenv(nom, raising=False)
    monkeypatch.setenv("VOYAGE_MCP_STORE", str(tmp_path / "voyage.json"))
    module_magasin.oublier()
    yield
    module_magasin.oublier()


def appeler(nom: str, arguments: dict[str, Any] | None = None) -> Any:
    async def _appel() -> Any:
        async with Client(mcp) as client:
            return (await client.call_tool(nom, arguments or {})).data

    return asyncio.run(_appel())


def test_un_voyage_se_prepare_de_bout_en_bout_dans_le_fichier():
    foyer = appeler("voyage_creer_foyer", {"name": "Famille Martin"})
    appeler(
        "voyage_upsert_voyageur",
        {"household_id": foyer["id"], "display_name": "Tom", "birth_date": "2020-05-01"},
    )
    voyage = appeler("voyage_creer_voyage", {"household_id": foyer["id"], "title": "Crète"})
    appeler("voyage_maj_voyage", {"trip_id": voyage["id"], "destination_country": "Grèce"})

    etat = appeler("voyage_etat")
    assert etat["backend"] == "json"
    assert (etat["households"], etat["members"], etat["trips"]) == (1, 1, 1)
    assert etat["tripList"][0]["destinationCountry"] == "Grèce"

    membres = appeler("voyage_lister_membres", {"household_id": foyer["id"]})["members"]
    assert membres[0]["ageBand"] == "child"


def test_un_refus_du_magasin_revient_en_erreur_d_outil():
    with pytest.raises(ToolError, match="foyer inconnu"):
        appeler("voyage_creer_voyage", {"household_id": "hh-inconnu", "title": "X"})


def test_rejoindre_un_foyer_demande_supabase():
    with pytest.raises(ToolError, match="pas d'invitations"):
        appeler("voyage_rejoindre_foyer", {"code": "ABCD-2345"})


def test_une_configuration_supabase_partielle_le_dit_a_l_appel(monkeypatch):
    monkeypatch.setenv("SUPABASE_URL", "https://abcdefghijklmnop.supabase.co")
    module_magasin.oublier()
    with pytest.raises(ToolError, match="configuration Supabase incomplète"):
        appeler("voyage_etat")
