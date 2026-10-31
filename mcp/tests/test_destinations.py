from miss_holi_voyage_mcp.destinations import propose


def test_propose_family_june() -> None:
    items = propose(month=6, family_friendly=True, limit=5)
    assert items
    assert all("famille" in d["tags"] for d in items if d["id"] != "ou-partir-hub")


def test_propose_empty_falls_back_to_hub() -> None:
    items = propose(month=1, tags=["inexistant"], limit=3)
    assert items[0]["id"] == "ou-partir-hub"
