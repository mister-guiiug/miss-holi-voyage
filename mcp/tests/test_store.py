import os
from pathlib import Path

from miss_holi_voyage_mcp import store


def test_roundtrip(tmp_path: Path, monkeypatch) -> None:
    path = tmp_path / "voyage.json"
    monkeypatch.setenv("VOYAGE_MCP_STORE", str(path))
    hh = store.create_household("Famille Test")
    mem = store.upsert_member(
        hh["id"], display_name="Lou", birth_date="2015-05-01"
    )
    assert mem["ageBand"] == "child" or mem["ageBand"] == "teen"
    trip = store.create_trip(hh["id"], "Été")
    updated = store.update_trip(trip["id"], {"destinationCountry": "Grèce"})
    assert updated["destinationCountry"] == "Grèce"
    snap = store.load()
    assert len(snap["members"]) == 1
    assert os.environ["VOYAGE_MCP_STORE"] == str(path)
