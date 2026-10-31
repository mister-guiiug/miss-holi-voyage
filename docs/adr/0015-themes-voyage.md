# 0015 — Trois thèmes voyage, locaux, orthogonaux au clair/sombre

## Contexte

La refonte « carnet » a tranché une ambiance (papier, méridien, phases
solaires). Deux autres directions avaient été écartées le même jour :
**album de famille** et **instrument de bord**. Les laisser mortes dans le
transcript, c’est forcer toute la famille à un seul look alors que le choix
coûte peu une fois les jetons CSS isolés.

Le socle a déjà clair / sombre / système (`ThemeProvider`, `data-theme`). Ce
n’est pas le même axe : changer de « peau voyage » ne doit pas casser la
bascule nuit.

## Décision

Trois skins, sélectionnables dans Réglages :

| Id           | Rôle                                         |
| ------------ | -------------------------------------------- |
| `ambiance`   | Carnet / méridien + phases solaires — défaut |
| `album`      | Plus chaud, rythme lent                      |
| `instrument` | Sec, géométrique                             |

- Attribut `data-voyage-theme` sur `<html>`, posé avant le premier paint.
- Persistance : `localStorage` (`miss-holi-voyage:voyage-theme`), pas le
  magasin versionné domaine (ADR 0002) ni le compte distant.
- Clair/sombre reste celui du socle.
- **Mêmes composants React**, autre habillage : jetons + composition CSS
  (panneaux album, cadres instrument) + décor (`VoyageAtmosphere`). Pas de
  layouts parallèles en TSX.

## Conséquences

Changer de thème reclasse filets, paddings, typo et panneaux sans remonter
l’arbre d’écrans. Les phases solaires ne s’appliquent qu’en `ambiance`.

Le prix : trois palettes et trois jeux d’overrides structurels à tenir au
contraste. Pas de sync multi-appareils du thème.

## Ce qu’on écarte

**Un seul look figé.** Trop tôt pour l’imposer alors que les trois directions
étaient déjà nommées.

**Trois arbres d’écrans.** Dupliquer Home / Foyer / Wizard par thème ferait
diverger les gestes ; l’habillage CSS sur les classes `voyage-*` suffit.

**Persister le thème dans Supabase.** Une préférence chrome n’est pas une
donnée de voyage ; le coût RLS / schéma dépasse le gain.
