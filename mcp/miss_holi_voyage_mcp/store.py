"""Snapshot voyage partagé (JSON) — même forme que le magasin local de la PWA."""

from __future__ import annotations

import json
import os
import uuid
from copy import deepcopy
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from miss_holi_voyage_mcp.ticket_age import age_band_from_birth

EMPTY: dict[str, Any] = {
    "households": [],
    "memberships": [],
    "members": [],
    "trips": [],
    "steps": [],
    "flights": [],
    "flightChoices": {},
    "pois": [],
    "votes": [],
    "questions": [],
    "artifacts": [],
    "decisions": [],
    "inviteTokens": [],
}


def store_path() -> Path:
    raw = os.environ.get("VOYAGE_MCP_STORE")
    if raw:
        return Path(raw)
    return Path.home() / ".miss-holi-voyage" / "voyage-mcp.json"


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def load() -> dict[str, Any]:
    path = store_path()
    if not path.exists():
        return deepcopy(EMPTY)
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "data" in data and "v" in data:
        data = data["data"]
    snap = deepcopy(EMPTY)
    snap.update(data)
    return snap


def save(snap: dict[str, Any]) -> Path:
    path = store_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    envelope = {"v": 1, "data": snap, "updatedAt": _now()}
    path.write_text(json.dumps(envelope, ensure_ascii=False, indent=2), encoding="utf-8")
    return path


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def create_household(name: str, notes: str = "") -> dict[str, Any]:
    snap = load()
    hh = {
        "id": new_id("hh"),
        "name": name.strip(),
        "notes": notes,
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    snap["households"].append(hh)
    save(snap)
    return hh


def upsert_member(
    household_id: str,
    *,
    member_id: str | None = None,
    display_name: str,
    birth_date: str | None = None,
    age_band: str | None = None,
) -> dict[str, Any]:
    snap = load()
    if not any(h["id"] == household_id for h in snap["households"]):
        raise ValueError(f"foyer inconnu: {household_id}")

    band = age_band or "adult"
    if birth_date:
        band = age_band_from_birth(birth_date)

    if member_id:
        for i, m in enumerate(snap["members"]):
            if m["id"] == member_id:
                row = {
                    **m,
                    "displayName": display_name,
                    "birthDate": birth_date,
                    "ageBand": band,
                }
                snap["members"][i] = row
                save(snap)
                return row
        raise ValueError(f"membre inconnu: {member_id}")

    row = {
        "id": new_id("mem"),
        "householdId": household_id,
        "displayName": display_name,
        "birthDate": birth_date,
        "ageBand": band,
        "mobilityNotes": "",
        "foodNotes": "",
        "sleepNotes": "",
        "interests": [],
        "position": len(
            [m for m in snap["members"] if m["householdId"] == household_id]
        ),
    }
    snap["members"].append(row)
    save(snap)
    return row


def create_trip(household_id: str, title: str) -> dict[str, Any]:
    snap = load()
    if not any(h["id"] == household_id for h in snap["households"]):
        raise ValueError(f"foyer inconnu: {household_id}")
    trip = {
        "id": new_id("trip"),
        "householdId": household_id,
        "title": title.strip(),
        "destinationCountry": "",
        "destinationRegion": "",
        "destinationNotes": "",
        "dateWindowStart": None,
        "dateWindowEnd": None,
        "budgetCeiling": None,
        "budgetCurrency": "EUR",
        "style": "undecided",
        "styleNotes": "",
        "isCurrent": True,
        "createdAt": _now(),
        "updatedAt": _now(),
    }
    snap["trips"].append(trip)
    save(snap)
    return trip


def update_trip(trip_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    snap = load()
    for i, t in enumerate(snap["trips"]):
        if t["id"] == trip_id:
            row = {**t, **patch, "updatedAt": _now()}
            snap["trips"][i] = row
            save(snap)
            return row
    raise ValueError(f"voyage inconnu: {trip_id}")
