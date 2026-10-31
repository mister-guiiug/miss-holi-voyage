"""Catalogue destinations inspiré de partir.com — sans scrape live.

Chaque entrée pointe vers une page publique partir.com (guide ou « où partir »)
pour attribution. Les mois favorables et filtres sont une synthèse éditoriale
locale, pas un miroir automatique du site.
"""

from __future__ import annotations

from typing import Any

# Mois 1–12. Tags : plage | culture | nature | famille | budget | direct_eu
DESTINATIONS: list[dict[str, Any]] = [
    {
        "id": "hanoi",
        "name": "Hanoï",
        "country": "Vietnam",
        "region": "Nord",
        "months": [10, 11, 12, 1, 2, 3, 4],
        "tags": ["culture", "famille", "budget"],
        "summary": "Vie locale, marchés, climat doux hors mousson.",
        "sourceUrl": "https://www.partir.com/vietnam/",
    },
    {
        "id": "athenes",
        "name": "Athènes",
        "country": "Grèce",
        "region": "Attique",
        "months": [3, 4, 5, 9, 10, 11],
        "tags": ["culture", "famille", "direct_eu"],
        "summary": "Capitale avant / après la haute saison, flânerie antique.",
        "sourceUrl": "https://www.partir.com/grece/",
    },
    {
        "id": "amazonie",
        "name": "Amazonie",
        "country": "Brésil",
        "region": "Bassin amazonien",
        "months": [5, 6, 7, 8, 9],
        "tags": ["nature"],
        "summary": "Hautes eaux, immersion faune et communautés riveraines.",
        "sourceUrl": "https://www.partir.com/bresil/",
    },
    {
        "id": "loire-velo",
        "name": "La Loire à vélo",
        "country": "France",
        "region": "Val de Loire",
        "months": [4, 5, 6, 7, 8, 9],
        "tags": ["nature", "famille", "budget", "direct_eu"],
        "summary": "Châteaux et paysages ligériens à rythme doux.",
        "sourceUrl": "https://www.partir.com/france/",
    },
    {
        "id": "georgie",
        "name": "Géorgie",
        "country": "Géorgie",
        "region": "Caucase",
        "months": [5, 6, 7, 8, 9],
        "tags": ["culture", "nature", "budget"],
        "summary": "Villages de montagne, hospitalité, loin des flux massifs.",
        "sourceUrl": "https://www.partir.com/ou-partir/",
    },
    {
        "id": "allemagne-rando",
        "name": "Randonner en Allemagne",
        "country": "Allemagne",
        "region": "Divers",
        "months": [5, 6, 7, 8, 9],
        "tags": ["nature", "famille", "direct_eu", "budget"],
        "summary": "Sentiers balisés, forêts et villages hors Alpes saturées.",
        "sourceUrl": "https://www.partir.com/allemagne/",
    },
    {
        "id": "oaxaca",
        "name": "Oaxaca",
        "country": "Mexique",
        "region": "Oaxaca",
        "months": [11, 12, 1, 2, 3],
        "tags": ["culture", "famille"],
        "summary": "Marchés, cuisine, artisanat — voyage par les sens.",
        "sourceUrl": "https://www.partir.com/mexique/",
    },
    {
        "id": "rep-dominicaine",
        "name": "République dominicaine",
        "country": "République dominicaine",
        "region": "Caraïbes",
        "months": [12, 1, 2, 3, 4],
        "tags": ["plage", "famille", "nature"],
        "summary": "Soleil d’hiver, littoral et intérieur verdoyant.",
        "sourceUrl": "https://www.partir.com/republique-dominicaine/",
    },
    {
        "id": "lisbonne",
        "name": "Lisbonne",
        "country": "Portugal",
        "region": "Lisbonne",
        "months": [3, 4, 5, 6, 9, 10],
        "tags": ["culture", "famille", "direct_eu", "budget"],
        "summary": "Ville compacte, tramways, escapades Sintra / océan.",
        "sourceUrl": "https://www.partir.com/portugal/",
    },
    {
        "id": "sicile",
        "name": "Sicile",
        "country": "Italie",
        "region": "Sicile",
        "months": [4, 5, 6, 9, 10],
        "tags": ["culture", "plage", "famille", "direct_eu"],
        "summary": "Volcans, villages et mer — hub ou roadtrip.",
        "sourceUrl": "https://www.partir.com/italie/",
    },
    {
        "id": "crete",
        "name": "Crète",
        "country": "Grèce",
        "region": "Crète",
        "months": [5, 6, 9, 10],
        "tags": ["plage", "famille", "direct_eu"],
        "summary": "Plages et gorges ; éviter le pic d’août avec jeunes enfants.",
        "sourceUrl": "https://www.partir.com/grece/",
    },
    {
        "id": "maroc-atlas",
        "name": "Atlas et Médina",
        "country": "Maroc",
        "region": "Marrakech / Atlas",
        "months": [3, 4, 5, 10, 11],
        "tags": ["culture", "famille", "budget", "direct_eu"],
        "summary": "Médinas et villages berbères ; chaleur d’été à éviter.",
        "sourceUrl": "https://www.partir.com/maroc/",
    },
    {
        "id": "japon-printemps",
        "name": "Japon (printemps / automne)",
        "country": "Japon",
        "region": "Honshu",
        "months": [3, 4, 5, 10, 11],
        "tags": ["culture", "famille"],
        "summary": "Hanami ou momiji ; rail et rythme urbain dense.",
        "sourceUrl": "https://www.partir.com/japon/",
    },
    {
        "id": "canada-est",
        "name": "Québec et Maritime",
        "country": "Canada",
        "region": "Est",
        "months": [6, 7, 8, 9],
        "tags": ["nature", "famille"],
        "summary": "Grands espaces, lacs, été court mais généreux.",
        "sourceUrl": "https://www.partir.com/canada/",
    },
    {
        "id": "islande",
        "name": "Islande",
        "country": "Islande",
        "region": "Île",
        "months": [6, 7, 8],
        "tags": ["nature"],
        "summary": "Routes et cascades ; budget élevé, peu adapté aux bébés.",
        "sourceUrl": "https://www.partir.com/islande/",
    },
    {
        "id": "senegal",
        "name": "Sénégal",
        "country": "Sénégal",
        "region": "Dakar / Petite Côte",
        "months": [11, 12, 1, 2, 3, 4],
        "tags": ["plage", "culture", "famille", "direct_eu"],
        "summary": "Saison sèche, vols directs possibles depuis la France.",
        "sourceUrl": "https://www.partir.com/senegal/",
    },
    {
        "id": "ou-partir-hub",
        "name": "Toutes les idées du mois",
        "country": "",
        "region": "",
        "months": list(range(1, 13)),
        "tags": ["famille", "plage", "culture", "nature", "budget"],
        "summary": "Page éditoriale partir.com filtrable par mois et envies.",
        "sourceUrl": "https://www.partir.com/ou-partir/",
    },
]


def propose(
    month: int | None = None,
    tags: list[str] | None = None,
    family_friendly: bool = False,
    limit: int = 8,
) -> list[dict[str, Any]]:
    wanted = {t.lower() for t in (tags or [])}
    out: list[dict[str, Any]] = []
    for dest in DESTINATIONS:
        if dest["id"] == "ou-partir-hub":
            continue
        if month is not None and month not in dest["months"]:
            continue
        dest_tags = {t.lower() for t in dest["tags"]}
        if wanted and not wanted.intersection(dest_tags):
            continue
        if family_friendly and "famille" not in dest_tags:
            continue
        out.append({**dest, "attribution": "inspiré de partir.com (catalogue local)"})
        if len(out) >= limit:
            break
    if not out:
        hub = next(d for d in DESTINATIONS if d["id"] == "ou-partir-hub")
        out.append({**hub, "attribution": "inspiré de partir.com (catalogue local)"})
    return out
