# 0014 — Sexe et centres d’intérêt sur le profil voyageur

- Statut : accepté
- Date : 2026-10-31

## Contexte

La saisie famille ne portait que le prénom et la naissance. Pour proposer des
destinations et des excursions, il manque un signal de **goût** (détente,
culturel, nature…) et un **sexe** pour l’avatar — sans ouvrir un questionnaire
de vingt écrans.

## Décision

- Champ `gender` : `female | male | other | unspecified` (libellés FR en i18n).
- Catalogue figé de centres d’intérêt (max **4**), avec détente / culturel /
  nature en tête, plus les profils voyageur usuels (gastronomie, randonnée…).
- Avatars SVG dérivés de l’âge + du sexe ; pas d’assets externes.

## Conséquences

- Migration SQL `0010_member_gender` ; `interests text[]` existait déjà.
- MCP `upsert_voyageur` accepte `gender` et `interests`.
- Un intérêt hors catalogue est ignoré à l’écriture (pas d’erreur bloquante).

## Écarté

- Questionnaire « affiner mon profil » multi-sections (contraintes, saison…) :
  trop lourd pour le MVP foyer.
- Avatars raster / Lottie : poids et thème sombre à maintenir.
