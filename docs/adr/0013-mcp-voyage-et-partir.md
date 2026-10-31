# 0013 — MCP voyage (écriture) et destinations partir.com sans scrape

## Contexte

Préparer un voyage en complémentaire avec une IA exige d’**interroger et
mettre à jour** le même état que la PWA (foyer, voyageurs, destination) hors
du navigateur. Le MCP Horizon du parc (`mister-parc-mcp`) est en lecture seule
et ne porte pas le domaine voyage.

Les classes billet avion / excursion dépendent de l’âge à une date de voyage,
pas seulement d’une tranche UX (`infant` / `child` / …). Sans date de naissance,
l’IA invente ou se trompe sur « l’enfant compte-t-il adulte ? ».

[partir.com](https://www.partir.com/ou-partir/) est la référence éditoriale
demandée pour proposer des destinations. Il n’expose pas d’API publique ; un
scrape live serait fragile, contraire aux conditions d’usage, et hors des
non-goals (pas de scraping de billets / inventaires tiers).

## Décision

1. **Serveur FastMCP** dans `mcp/` du dépôt (même famille que
   `mister-parc-mcp`), outils en écriture sous le préfixe `voyage_*`, magasin
   JSON versionné (`VOYAGE_MCP_STORE`).
2. **`birthDate`** sur `household_members` (client Zod + migration SQL) ;
   `ageBand` recalculé ; helpers `flightTicketClass` / `excursionTicketClass`
   (heuristiques IATA-ish / 18 ans excursion).
3. **Catalogue destinations embarqué**, inspiré de partir.com, chaque entrée
   avec `sourceUrl` vers le guide / hub — **pas de fetch scrape** au runtime.

## Conséquences

- L’IA distante et la PWA ne partagent pas encore le même magasin par défaut :
  le MCP écrit un fichier ; la PWA reste local-first (IndexedDB). Le pont
  d’import/export ou Supabase est le prochain chantier — volontairement hors
  de cette ADR pour livrer le contrat d’outils.
- Le catalogue vieillit : il faut le réviser à la main ; l’outil renvoie
  toujours le hub `ou-partir` en repli.
- Horizon peut héberger le serveur ; le fichier magasin doit alors être un
  volume durable ou remplacé par Supabase.

## Écarté

- Scrape live de partir.com.
- MCP navigateur-only (injoignable à distance).
- Étendre `mister-parc-mcp` (lecture parc ≠ écriture métier voyage).
