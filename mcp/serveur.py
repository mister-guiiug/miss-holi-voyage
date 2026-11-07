"""Point d’entrée FastMCP : `serveur.py:mcp` (Horizon) ou stdio local.

uv run fastmcp run serveur.py:mcp
"""

from __future__ import annotations

import tomllib
from pathlib import Path

from fastmcp import FastMCP

from miss_holi_voyage_mcp import outils

_PROJET = tomllib.loads((Path(__file__).parent / "pyproject.toml").read_text("utf-8"))
VERSION: str = _PROJET["project"]["version"]

INSTRUCTIONS = """\
Miss Holi Voyage — préparation de voyage multi-foyers.

Ce serveur lit et écrit les foyers, voyageurs et voyages de l'application. \
Configuré, il écrit dans sa base Supabase sous un compte dédié, qui ne voit que \
les foyers où il a été invité : ce qu'il écrit apparaît dans la PWA. Sinon, il \
écrit un fichier JSON local (VOYAGE_MCP_STORE). Il complète la PWA quand une IA \
travaille à distance : profils voyageurs (dates de naissance → classes billet \
avion / excursion), voyages, destinations inspirées de partir.com.

Commencer par `voyage_etat` (il dit où le serveur écrit). Aucun foyer visible : \
demander au propriétaire un code d'invitation créé dans la PWA, puis \
`voyage_rejoindre_foyer`. Ensuite `voyage_upsert_voyageur` pour les naissances, \
`voyage_proposer_destinations` puis `voyage_appliquer_destination`.
"""

mcp = FastMCP(
    "miss-holi-voyage",
    instructions=INSTRUCTIONS,
    version=VERSION,
    website_url="https://github.com/mister-guiiug/miss-holi-voyage",
    cache_ttl=3600,
    cache_scope="private",
)
mcp.mount(outils.serveur, namespace="voyage")

if __name__ == "__main__":
    mcp.run()
