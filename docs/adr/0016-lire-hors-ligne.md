# 0016 — Connecté hors ligne : la dernière copie, jamais le magasin local

## Contexte

Audit hors ligne du parc, 05/11/2026 : l'application était classée
**CASSÉE**. Le port voyage choisissait distant ou local selon
`auth.getUser()`, qui interroge le **serveur**. Hors ligne, la réponse était
« personne » : un utilisateur connecté lisait et écrivait en silence dans le
magasin de l'appareil, voyait un foyer vide ou celui d'une autre époque, et ce
qu'il y créait ne partait jamais. `acceptInvite` retombait aussi sur le local
après un refus distant. Les notes, elles, rendaient `[]` — « tout est effacé ».

Deux phrases avaient laissé passer le défaut : « hors ligne, c'est le service
worker qui répond » (`queued-notes.ts`, ADR 0010). Aucun cache du service
worker ne couvre Supabase.

## Décision

**Connecté se lit sur l'appareil.** `backend/session.ts` lit la session que le
SDK y a rangée — celle de **ce** projet : la famille partage une origine, donc
un `localStorage`, et `storedSupabaseSession()` du socle rend la première
session venue, celle d'une autre app au besoin. `auth.getSession()` est
demandé en ligne, borné à cinq secondes, parce qu'il renouvelle un jeton
périmé en réessayant une demi-minute. C'est le chemin de l'adaptateur du
socle et de `mister-settle/src/backend/sessionUserId.ts`.

**Connecté = toujours distant.** Le magasin local n'est que celui de la
personne sans compte. Hors ligne :

- **la lecture** ressert la **dernière copie** lue au serveur
  (`backend/dernier-etat.ts`, IndexedDB du socle, motif de
  `mister-settle/src/backend/cached.ts`), revalidée par le schéma du port et
  **datée** à l'écran (`VoyageEtat`). Sans copie, l'erreur remonte : l'accueil
  dit « foyer indisponible », jamais « aucun foyer » avec un formulaire de
  création ;
- **les écritures du voyage sont refusées** (`HorsLigneError`), et le bandeau
  le dit. Pas de file pour le voyage : ses gestes ne nomment pas tous une
  ligne (`runSuggestQuestions` efface puis réinsère), et deux membres d'un
  foyer touchent les mêmes lignes — ADR 0010, « ce qui remplace tout ne
  s'enfile pas » ;
- **les notes** ressortent de leur copie, et la file y pose ce qui attend
  encore (ajouts montrés, suppressions retirées).

**Une erreur reste une erreur.** `acceptInvite` ne retombe plus sur le local.

**La copie part avec la session.** La déconnexion (geste, `SIGNED_OUT`,
suppression du compte) vide la base des copies ; chaque copie porte en outre
l'identifiant de son propriétaire (`voyage:<uid>`), qu'un appareil partagé
ne mélange pas.

**L'écran de notes du squelette est supprimé.** Il n'était plus routé depuis
que le voyage a pris l'accueil (31/10/2026) ; son `SyncStatusBadge` ne
s'affichait donc nulle part, alors que la file tourne. L'indicateur est monté
dans les réglages, carte « Données », là où les notes se manient encore
(exporter, importer, tout effacer). Le brancher sur une route aurait ajouté au
produit un écran que rien ne demande.

## Conséquences

- Hors ligne, un utilisateur connecté voit son foyer **tel qu'il était**, et
  le sait. Il ne peut rien y changer avant le retour du réseau.
- Les actions du magasin voyage ne rejettent plus quand une écriture échoue :
  les écrans les appelaient sans attendre leur issue, et un refus « hors
  ligne » aurait fini dans le rapporteur d'erreurs. L'échec est porté par le
  magasin et affiché. `acceptInvite`, `createInvite` et `clear` rejettent
  toujours : leurs écrans le disent eux-mêmes.
- Le nom de la case de session est **dérivé** de l'URL du projet, comme le
  fait le SDK. `session.test.ts` le confronte au SDK installé : une montée qui
  changerait la formule se verra en CI.

## Ce que ça écarte

- **Une file d'écritures pour le voyage.** Possible plus tard, port par port,
  pour les gestes qui nomment leur ligne ; pas sans trancher les conflits
  entre membres.
- **Un cache Supabase dans le service worker.** Il ne sait rien de la
  session : sur un appareil partagé, le compte suivant relirait les réponses
  du précédent, et la déconnexion ne pourrait pas le purger proprement.
- **Le repli silencieux sur le magasin local.** C'est le défaut corrigé.
