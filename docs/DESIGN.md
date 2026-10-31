# Design system — Miss Holi Voyage

## Intention

Une identité que le gabarit famille ne produit pas tout seul : un **atlas
vivant**. La palette et le fond suivent l’heure solaire locale de l’appareil
(`data-solar`), les méridiens bougent en CSS, la typo couple un display
narratif (Literata) à une UI claire (DM Sans). Les composants restent ceux du
socle (`data-dwc`) ; on ne repeint que les jetons `--dwc-*`.

## Palette « Meridian »

| Rôle     | Clair                   | Sombre                      |
| -------- | ----------------------- | --------------------------- |
| Fond     | `#e8f2f5` (brume océan) | `#061018` (nuit atlantique) |
| Surface  | `#ffffff`               | `#0c1c28`                   |
| Primaire | `#0b6e6e` (sarcelle)    | `#f0a202` (safran)          |
| Accent   | `#1a8f8f`               | `#3dccc7`                   |
| Texte    | `#0a1620`               | `#e8f4f7`                   |

Écart volontaire des biais courant (violet, crème/terracotta, broadsheet).

## Typographie

- **Display / marque** : Literata Variable (optical size)
- **UI** : DM Sans Variable

## Motion

1. Dérive lente des arcs de grand cercle (60–90 s)
2. Pulsation des waypoints (2,4 s)
3. Fondu d’entrée des cartes foyer (stagger 40 ms)

## Solar phases

`dawn` · `day` · `dusk` · `night` — posées sur `<html data-solar="…">` par
`useSolarPhase`. Elles n’écrasent pas clair/sombre : elles teintent
`--voyage-glow` et l’intensité du champ méridien.
