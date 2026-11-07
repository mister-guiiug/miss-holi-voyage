# MCP Miss Holi Voyage

Serveur [MCP](https://modelcontextprotocol.io) **lecture + écriture** pour préparer
un voyage avec une IA à distance : foyers, profils voyageurs (dates de naissance →
classes billet avion / excursion), voyages, propositions de destinations inspirées
de [partir.com](https://www.partir.com/ou-partir/).

Écrit avec [FastMCP](https://gofastmcp.com) 4, déployable sur
[Prefect Horizon](https://horizon.prefect.io) (même pattern que `mister-parc-mcp`).

## Outils (`voyage_*`)

| Outil                          | Rôle                                                      |
| ------------------------------ | --------------------------------------------------------- |
| `voyage_etat`                  | résumé du magasin + chemins                               |
| `voyage_lister_membres`        | voyageurs + classes billet à une date                     |
| `voyage_creer_foyer`           | créer un foyer                                            |
| `voyage_upsert_voyageur`       | créer / maj (naissance ou tranche d’âge)                  |
| `voyage_creer_voyage`          | créer un voyage                                           |
| `voyage_maj_voyage`            | destination, dates, titre                                 |
| `voyage_proposer_destinations` | catalogue local (mois, tags, famille)                     |
| `voyage_appliquer_destination` | écrire pays/région/notes depuis le catalogue              |
| `voyage_rejoindre_foyer`       | entrer dans un foyer par son code d’invitation (Supabase) |

## Magasin

Deux magasins, le même contrat ; `voyage_etat` dit lequel est en service.

### Supabase, sous un compte robot (ADR 0017)

Le serveur lit et écrit **la base de l’application** : ce que l’IA écrit apparaît
dans la PWA. Il s’y connecte comme un **utilisateur ordinaire**, un compte dédié,
soumis à la RLS : il ne voit que les foyers où il a été **invité**. Jamais la clé
`service_role`, qui contournerait les droits.

| Variable              | Valeur                                                |
| --------------------- | ----------------------------------------------------- |
| `SUPABASE_URL`        | l’URL du projet (`https://<ref>.supabase.co`)         |
| `SUPABASE_ANON_KEY`   | la clé publique (`anon`), celle de la PWA             |
| `VOYAGE_MCP_EMAIL`    | l’e-mail du compte robot                              |
| `VOYAGE_MCP_PASSWORD` | son mot de passe — **secret**, jamais dans un fichier |

Toutes ou aucune : une configuration partielle est **refusée** (le serveur
écrirait sinon dans un fichier que Horizon efface).

Mise en service, une fois :

1. Dans Supabase : Authentication → Users → **Add user**, e-mail du robot,
   mot de passe, « Auto Confirm User ». Le fournisseur e-mail doit accepter le
   mot de passe.
2. Dans Horizon : poser les quatre variables (le mot de passe en secret), puis
   redéployer.
3. Dans la PWA : créer une **invitation** au foyer, en éditeur, et donner le code
   à l’IA, qui appelle `voyage_rejoindre_foyer`.

Retirer le robot du foyer, dans la PWA, lui coupe l’accès.

### Fichier JSON (local, tests)

Sans aucune des quatre variables : fichier JSON (enveloppe versionnée
`{ v, data }`), compatible en esprit avec le snapshot voyage de la PWA. Il n’a pas
d’invitations.

- `VOYAGE_MCP_STORE` — chemin absolu (recommandé)
- sinon `~/.miss-holi-voyage/voyage-mcp.json`

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

En ligne : **`https://miss-holi-voyage-mcp.fastmcp.app/mcp`**
(organisation [mister-guiiug](https://horizon.prefect.io/mister-guiiug/),
projet `miss-holi-voyage-mcp`). Authentification gateway activée (OAuth ou
Bearer `fmcp_…`).

```bash
claude mcp add --transport http miss-holi-voyage \
  https://miss-holi-voyage-mcp.fastmcp.app/mcp
```

Déploiement initial : archive du dossier `mcp/` (entrypoint `serveur.py:mcp`,
`pyproject.toml`). Le disque Horizon est éphémère entre requêtes : en production,
le magasin est **Supabase** (variables ci-dessus), jamais le fichier.

## Vérifier

```bash
cd mcp
uv run ruff check && uv run ruff format --check
uv run pytest
uv run fastmcp inspect serveur.py:mcp
```

C’est ce que joue `.github/workflows/mcp.yml` sur chaque PR qui touche `mcp/`.
Les tests jouent Supabase contre un faux serveur en mémoire : aucun secret, aucun
réseau.

Tableau de bord :
`https://horizon.prefect.io/mister-guiiug/miss-holi-voyage-mcp`

## partir.com

**Pas de scrape.** Catalogue embarqué + liens `sourceUrl` vers les guides /
[où partir](https://www.partir.com/ou-partir/). L’éditorial live reste sur le site.
