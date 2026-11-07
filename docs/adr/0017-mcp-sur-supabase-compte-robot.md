# 0017 — Le MCP écrit dans Supabase, sous un compte robot invité

## Contexte

L'ADR 0013 a livré le contrat d'outils du MCP sur un fichier JSON, en laissant
le pont vers Supabase pour plus tard. Deux défauts en découlaient :

- **Sur Horizon, le disque est éphémère.** Ce que l'IA écrivait (un voyageur,
  une destination) disparaissait au redémarrage suivant, sans le dire.
- **Rien n'était partagé avec la PWA.** Un voyage préparé avec l'IA n'apparaissait
  pas dans l'application, et inversement.

La base de l'application protège chaque table par la RLS (ADR 0007) : un
utilisateur ne voit que les foyers dont il est membre, et n'écrit que là où son
rôle le permet. Les écritures qui touchent à la structure (créer un foyer, un
voyage, accepter une invitation) passent par des fonctions de la base.

## Décision

1. **Le serveur se connecte comme un utilisateur ordinaire, jamais avec la clé
   `service_role`.** Celle-ci contournerait la RLS : tout client du serveur
   verrait tous les foyers de tous les comptes.
2. **Un compte dédié, le « robot »** (ex. `mcp@…`), et non le compte du
   propriétaire. Le propriétaire l'**invite** dans un foyer depuis la PWA, en
   éditeur ; l'outil `voyage_rejoindre_foyer` accepte le code (la fonction
   `accept_invitation`, qui prend le code court depuis 0012). Le robot ne voit
   que les foyers où il est invité ; ses écritures portent son identifiant
   (`created_by`) ; le retirer du foyer lui coupe l'accès. Aucun mot de passe
   personnel ne vit sur Horizon.
3. **Session par mot de passe**, gardée en mémoire et renouvelée par le jeton de
   rafraîchissement ; un rafraîchissement refusé ou un 401 rouvre une session
   avec le mot de passe. Pas de jeton de rafraîchissement en secret : Supabase
   le fait tourner à chaque usage, et le disque éphémère ne saurait garder le
   suivant.
4. **Quatre variables, toutes ou aucune** : `SUPABASE_URL`, `SUPABASE_ANON_KEY`
   (publique), `VOYAGE_MCP_EMAIL`, `VOYAGE_MCP_PASSWORD` (secret). Toutes
   posées : Supabase. Aucune : le fichier JSON d'avant, pour le travail local et
   les tests. **Une configuration partielle est refusée**, en nommant ce qui
   manque : un repli silencieux écrirait dans un fichier que Horizon efface.
5. **La bibliothèque standard seulement** (`urllib`) : pas de dépendance
   nouvelle dans l'archive envoyée à Horizon, et un transport injectable pour
   des tests sans réseau.

## Conséquences

- Ce que l'IA écrit apparaît dans la PWA, et ce qui est saisi dans la PWA est
  visible de l'IA, dans les foyers où le robot a été invité.
- **Gestes du propriétaire**, hors du code : créer le compte robot dans
  Supabase (Authentication → Add user, e-mail confirmé, mot de passe), poser
  les quatre variables dans Horizon, puis inviter le robot depuis la PWA et lui
  donner le code (`voyage_rejoindre_foyer`).
- Un foyer créé par l'outil `voyage_creer_foyer` a le robot pour propriétaire :
  pour le voir dans la PWA, le robot doit y inviter un humain. L'usage prévu
  est l'inverse : le foyer naît dans la PWA, le robot y est invité.
- Le magasin JSON reste le magasin local ; il n'a pas d'invitations.
- `mcp/` a désormais sa CI (`.github/workflows/mcp.yml`) : ruff, pytest,
  `fastmcp inspect`.

## Écarté

- **La clé `service_role`** : elle contourne la RLS, donc tout le modèle de
  droits de l'application.
- **Le compte du propriétaire** : son mot de passe personnel sur Horizon, et
  des écritures indiscernables des siennes.
- **Un jeton de rafraîchissement en secret** : il tourne à chaque usage.
- **Le jeton de l'utilisateur transmis par le client MCP** : l'en-tête
  `Authorization` est déjà celui de la passerelle Horizon.
