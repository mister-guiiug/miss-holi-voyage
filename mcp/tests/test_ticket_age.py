from miss_holi_voyage_mcp.ticket_age import (
    age_band_from_birth,
    excursion_ticket_class,
    flight_ticket_class,
)


def test_flight_and_excursion_classes() -> None:
    assert flight_ticket_class("2025-01-01", "2026-06-01") == "infant"
    assert flight_ticket_class("2018-01-01", "2026-06-01") == "child"
    assert excursion_ticket_class("2010-01-01", "2026-06-01") == "child"
    assert excursion_ticket_class("2008-01-01", "2026-06-01") == "adult"


def test_age_band() -> None:
    assert age_band_from_birth("2010-01-01", "2026-06-01") == "teen"
