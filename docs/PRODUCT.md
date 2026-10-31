# Miss Holi Voyage — produit

Agent PWA multi-foyers d’aide à la préparation de voyage. MVP = **W1** (profil
+ destination + questions IA) et **W3** (dates/vols, hub vs roadtrip,
préselection d’excursions). Les artefacts pays (**W2**) sont stockables mais
non générés en v1.

## Job to be done

Quand un foyer prépare un voyage, il veut une suite guidée qui pose les bonnes
questions, garde le contexte familial, et aide à trancher destination →
dates/vol → style (hub vs roadtrip) → shortlist d’excursions, sans perdre les
décisions ni les brouillons structurés de l’IA.

## Non-goals (v1)

- Génération Fiche_urgences, Visa, Pourboires, My Maps KML, Programme PDF
- Réservation / paiement / scraping de billets
- Chat libre sans schéma
- IA 100 % hors ligne

## Parcours

`foyer → destination → questions IA → fenêtre dates → options vol A/R → hub|roadtrip → propositions POI → préselection → décision figée`

Chaque étape a un statut `draft | ready | locked`.

## Entités (Zod)

Voir `src/entities/` — schémas source de vérité côté client ; tables
homonymes côté Supabase (`supabase/migrations/0006_voyage.sql`).

- `Household`, `HouseholdMembership`, `HouseholdMember`
- `Trip`, `TripStep`
- `FlightOption`, `FlightChoice`
- `PoiCandidate`, `PoiVote`
- `SpecQuestion`
- `Artifact` (schéma prêt, génération UI désactivée)
- `DecisionLogEntry`

## Contrats IA

Sorties JSON schema uniquement ; l’humain édite et valide.

1. **`suggest_spec_questions`** — 5–10 questions prioritaires à partir des
   trous du profil/voyage (impact dates, vol, style, budget).
2. **`propose_itinerary_style`** — hub vs roadtrip + implications aéroports /
   durée.
3. **`propose_pois`** — liste structurée (nom, zone, durée, âge min, saison,
   coût ordre de grandeur, pourquoi ça matche le foyer).

Implémentation : heuristiques locales toujours disponibles ; Edge Function
`ai-tools` quand une clé LLM serveur est configurée.

## Critères d’acceptation MVP

- Un second membre rejoint le foyer (invitation) et vote sur les POI.
- En &lt; 30 min : destination `ready`, ≥ 3 questions résolues, 1 vol retenu,
  style choisi, shortlist ≥ 5 POI.
- Aucune clé LLM dans le client.
- Aucune génération W2 dans le happy path.
