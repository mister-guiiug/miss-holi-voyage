"""Outils MCP : lire / écrire foyer, voyageurs, voyages, destinations."""

from __future__ import annotations

from typing import Annotated, Any

from fastmcp import FastMCP
from fastmcp.exceptions import ToolError
from mcp.types import ToolAnnotations
from pydantic import Field

from miss_holi_voyage_mcp import destinations, store
from miss_holi_voyage_mcp.ticket_age import (
    excursion_ticket_class,
    flight_ticket_class,
)

serveur = FastMCP("voyage")

LECTURE = ToolAnnotations(readOnlyHint=True, idempotentHint=True, openWorldHint=False)
ECRITURE = ToolAnnotations(readOnlyHint=False, idempotentHint=False, openWorldHint=False)


@serveur.tool(
    name="etat",
    title="État du magasin voyage",
    annotations=LECTURE,
)
def etat() -> dict[str, Any]:
    """Résumé du snapshot partagé (foyers, membres, voyages) et chemin du fichier."""
    snap = store.load()
    return {
        "storePath": str(store.store_path()),
        "households": len(snap["households"]),
        "members": len(snap["members"]),
        "trips": len(snap["trips"]),
        "householdList": [
            {"id": h["id"], "name": h["name"]} for h in snap["households"]
        ],
        "tripList": [
            {
                "id": t["id"],
                "title": t["title"],
                "householdId": t["householdId"],
                "destinationCountry": t.get("destinationCountry") or "",
            }
            for t in snap["trips"]
        ],
    }


@serveur.tool(
    name="lister_membres",
    title="Lister les voyageurs d’un foyer",
    annotations=LECTURE,
)
def lister_membres(
    household_id: Annotated[str, Field(description="Identifiant du foyer")],
    reference_date: Annotated[
        str | None,
        Field(description="Date ISO YYYY-MM-DD pour classes billet (défaut: aujourd’hui)"),
    ] = None,
) -> dict[str, Any]:
    """Profils voyageurs avec classes billet avion et excursion à la date donnée."""
    snap = store.load()
    members = [m for m in snap["members"] if m["householdId"] == household_id]
    rows = []
    for m in members:
        rows.append(
            {
                **m,
                "flightTicket": flight_ticket_class(
                    m.get("birthDate"), reference_date, m.get("ageBand", "adult")
                ),
                "excursionTicket": excursion_ticket_class(
                    m.get("birthDate"), reference_date, m.get("ageBand", "adult")
                ),
            }
        )
    return {"householdId": household_id, "referenceDate": reference_date, "members": rows}


@serveur.tool(
    name="creer_foyer",
    title="Créer un foyer",
    annotations=ECRITURE,
)
def creer_foyer(
    name: Annotated[str, Field(description="Nom du foyer", min_length=1, max_length=80)],
) -> dict[str, Any]:
    """Crée un foyer dans le magasin MCP partagé."""
    return store.create_household(name)


@serveur.tool(
    name="upsert_voyageur",
    title="Créer ou mettre à jour un voyageur",
    annotations=ECRITURE,
)
def upsert_voyageur(
    household_id: Annotated[str, Field(description="Foyer")],
    display_name: Annotated[str, Field(description="Prénom / surnom", min_length=1)],
    birth_date: Annotated[
        str | None,
        Field(description="Date de naissance YYYY-MM-DD (préférée pour billetterie)"),
    ] = None,
    member_id: Annotated[
        str | None, Field(description="Si fourni : mise à jour ; sinon création")
    ] = None,
    age_band: Annotated[
        str | None,
        Field(description="infant|child|teen|adult|senior si pas de birth_date"),
    ] = None,
    gender: Annotated[
        str | None,
        Field(description="female|male|other|unspecified"),
    ] = None,
    interests: Annotated[
        list[str] | None,
        Field(
            description=(
                "Centres d’intérêt (max 4) : detente, culturel, nature, "
                "gastronomie, randonnee, plongee, familial, baroudeur, "
                "photographe, sportif, festivalier, romantique, lent"
            )
        ),
    ] = None,
) -> dict[str, Any]:
    """Profil voyageur : naissance, sexe, centres d’intérêt (détente / culturel / nature…)."""
    try:
        return store.upsert_member(
            household_id,
            member_id=member_id,
            display_name=display_name,
            birth_date=birth_date,
            age_band=age_band,
            gender=gender,
            interests=interests,
        )
    except ValueError as exc:
        raise ToolError(str(exc)) from exc


@serveur.tool(
    name="creer_voyage",
    title="Créer un voyage",
    annotations=ECRITURE,
)
def creer_voyage(
    household_id: Annotated[str, Field(description="Foyer")],
    title: Annotated[str, Field(description="Titre du voyage", min_length=1)],
) -> dict[str, Any]:
    try:
        return store.create_trip(household_id, title)
    except ValueError as exc:
        raise ToolError(str(exc)) from exc


@serveur.tool(
    name="maj_voyage",
    title="Mettre à jour un voyage",
    annotations=ECRITURE,
)
def maj_voyage(
    trip_id: Annotated[str, Field(description="Identifiant du voyage")],
    destination_country: Annotated[str | None, Field(description="Pays")] = None,
    destination_region: Annotated[str | None, Field(description="Région")] = None,
    destination_notes: Annotated[str | None, Field(description="Notes")] = None,
    date_window_start: Annotated[
        str | None, Field(description="Début de fenêtre YYYY-MM-DD")
    ] = None,
    date_window_end: Annotated[
        str | None, Field(description="Fin de fenêtre YYYY-MM-DD")
    ] = None,
    title: Annotated[str | None, Field(description="Nouveau titre")] = None,
) -> dict[str, Any]:
    """Met à jour destination, dates ou titre."""
    patch: dict[str, Any] = {}
    if destination_country is not None:
        patch["destinationCountry"] = destination_country
    if destination_region is not None:
        patch["destinationRegion"] = destination_region
    if destination_notes is not None:
        patch["destinationNotes"] = destination_notes
    if date_window_start is not None:
        patch["dateWindowStart"] = date_window_start or None
    if date_window_end is not None:
        patch["dateWindowEnd"] = date_window_end or None
    if title is not None:
        patch["title"] = title
    if not patch:
        raise ToolError("aucun champ à mettre à jour")
    try:
        return store.update_trip(trip_id, patch)
    except ValueError as exc:
        raise ToolError(str(exc)) from exc


@serveur.tool(
    name="proposer_destinations",
    title="Proposer des destinations (inspiré partir.com)",
    annotations=LECTURE,
)
def proposer_destinations(
    month: Annotated[
        int | None, Field(description="Mois de départ 1–12", ge=1, le=12)
    ] = None,
    tags: Annotated[
        list[str] | None,
        Field(description="Filtres : plage, culture, nature, famille, budget, direct_eu"),
    ] = None,
    family_friendly: Annotated[
        bool, Field(description="Ne garder que les destinations taguées famille")
    ] = False,
    limit: Annotated[int, Field(description="Nombre max", ge=1, le=20)] = 8,
) -> dict[str, Any]:
    """Catalogue local inspiré de partir.com — liens sourceUrl, pas de scrape live."""
    items = destinations.propose(
        month=month, tags=tags, family_friendly=family_friendly, limit=limit
    )
    return {
        "month": month,
        "tags": tags or [],
        "familyFriendly": family_friendly,
        "count": len(items),
        "destinations": items,
        "hub": "https://www.partir.com/ou-partir/",
        "note": (
            "Catalogue embarqué, non synchronisé automatiquement avec partir.com. "
            "Consulter sourceUrl / hub pour l’éditorial à jour."
        ),
    }


@serveur.tool(
    name="appliquer_destination",
    title="Appliquer une destination au voyage",
    annotations=ECRITURE,
)
def appliquer_destination(
    trip_id: Annotated[str, Field(description="Voyage")],
    destination_id: Annotated[
        str, Field(description="Identifiant du catalogue (ex. athenes, hanoi)")
    ],
) -> dict[str, Any]:
    """Copie pays / région / notes + lien partir.com dans le voyage."""
    dest = next((d for d in destinations.DESTINATIONS if d["id"] == destination_id), None)
    if not dest:
        raise ToolError(f"destination inconnue: {destination_id}")
    notes = f"{dest['summary']}\nSource: {dest['sourceUrl']}"
    try:
        return store.update_trip(
            trip_id,
            {
                "destinationCountry": dest["country"],
                "destinationRegion": dest.get("region") or dest["name"],
                "destinationNotes": notes,
            },
        )
    except ValueError as exc:
        raise ToolError(str(exc)) from exc
