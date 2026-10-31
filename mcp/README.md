# MCP Miss Holi Voyage

Serveur [MCP](https://modelcontextprotocol.io) **lecture + écriture** pour préparer
un voyage avec une IA à distance : foyers, profils voyageurs (dates de naissance →
classes billet avion / excursion), voyages, propositions de destinations inspirées
de [partir.com](https://www.partir.com/ou-partir/).

Écrit avec [FastMCP](https://gofastmcp.com) 4, déployable sur
[Prefect Horizon](https://horizon.prefect.io) (même pattern que `mister-parc-mcp`).

## Outils (`voyage_*`)

| Outil                          | Rôle                                         |
| ------------------------------ | -------------------------------------------- |
| `voyage_etat`                  | résumé du magasin + chemins                  |
| `voyage_lister_membres`        | voyageurs + classes billet à une date        |
| `voyage_creer_foyer`           | créer un foyer                               |
| `voyage_upsert_voyageur`       | créer / maj (naissance ou tranche d’âge)     |
| `voyage_creer_voyage`          | créer un voyage                              |
| `voyage_maj_voyage`            | destination, dates, titre                    |
| `voyage_proposer_destinations` | catalogue local (mois, tags, famille)        |
| `voyage_appliquer_destination` | écrire pays/région/notes depuis le catalogue |

## Magasin

Fichier JSON (enveloppe versionnée `{ v, data }`), compatible en esprit avec le
snapshot voyage de la PWA.

- `VOYAGE_MCP_STORE` — chemin absolu (recommandé)
- sinon `~/.miss-holi-voyage/voyage-mcp.json`

La PWA reste local-first ; ce fichier est le pont pour le travail complémentaire
IA. Import / sync Supabase : chantier suivant (voir ADR 0013).

## Local

```bash
cd mcp
uv sync
uv run fastmcp run serveur.py:mcp
```

Cursor / Claude (stdio) :

```json
{
  "mcpServers": {
    "miss-holi-voyage": {
      "command": "uv",
      "args": [
        "run",
        "--directory",
        "D:/Src/GithubMisterGuiiuG/miss-holi-voyage/mcp",
        "fastmcp",
        "run",
        "serveur.py:mcp"
      ],
      "env": {
        "VOYAGE_MCP_STORE": "D:/Src/GithubMisterGuiiuG/miss-holi-voyage/mcp/data/voyage.json"
      }
    }
  }
}
```

## Horizon

Pointer l’entrée `serveur.py:mcp` comme pour `mister-parc-mcp`. Authentification
gateway Horizon ; ne pas exposer le magasin en lecture publique.

## partir.com

**Pas de scrape.** Catalogue embarqué + liens `sourceUrl` vers les guides /
[où partir](https://www.partir.com/ou-partir/). L’éditorial live reste sur le site.
