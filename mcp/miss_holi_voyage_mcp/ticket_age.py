"""Classes billet — miroir de src/entities/ticket-age.ts."""

from __future__ import annotations

from datetime import date


def age_in_years(birth: date, on: date) -> int | None:
    if on < birth:
        return None
    years = on.year - birth.year
    if (on.month, on.day) < (birth.month, birth.day):
        years -= 1
    return years


def parse_iso(value: str | None) -> date | None:
    if not value:
        return None
    try:
        y, m, d = value.strip()[:10].split("-")
        return date(int(y), int(m), int(d))
    except (ValueError, TypeError):
        return None


def flight_ticket_class(
    birth_iso: str | None,
    on_iso: str | None = None,
    fallback_band: str = "adult",
) -> str:
    birth = parse_iso(birth_iso)
    on = parse_iso(on_iso) or date.today()
    if birth:
        age = age_in_years(birth, on)
        if age is None:
            return "adult"
        if age < 2:
            return "infant"
        if age < 12:
            return "child"
        return "adult"
    if fallback_band == "infant":
        return "infant"
    if fallback_band == "child":
        return "child"
    return "adult"


def excursion_ticket_class(
    birth_iso: str | None,
    on_iso: str | None = None,
    fallback_band: str = "adult",
) -> str:
    birth = parse_iso(birth_iso)
    on = parse_iso(on_iso) or date.today()
    if birth:
        age = age_in_years(birth, on)
        if age is None:
            return "adult"
        if age < 3:
            return "infant"
        if age < 18:
            return "child"
        return "adult"
    if fallback_band == "infant":
        return "infant"
    if fallback_band in ("child", "teen"):
        return "child"
    return "adult"


def age_band_from_birth(birth_iso: str, on_iso: str | None = None) -> str:
    birth = parse_iso(birth_iso)
    on = parse_iso(on_iso) or date.today()
    if not birth:
        return "adult"
    age = age_in_years(birth, on)
    if age is None:
        return "adult"
    if age < 2:
        return "infant"
    if age < 12:
        return "child"
    if age < 18:
        return "teen"
    if age >= 65:
        return "senior"
    return "adult"
