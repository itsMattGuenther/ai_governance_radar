"""Shape checks on the curated seed file itself (no database).

Milestones are legal dates, so they are curated like every other structured field
(hard rule 1, DEC-014): this guards their shape, not their truth.
"""

import json
from datetime import date
from pathlib import Path

SEED = Path(__file__).resolve().parents[2] / "data" / "seed" / "entities.json"
MILESTONE_KINDS = {"takes_effect", "obligations_apply", "deadline", "expires"}


def _regulations() -> list[dict]:
    rows = json.loads(SEED.read_text(encoding="utf-8"))
    return [r for r in rows if r["type"] == "regulation"]


def test_milestones_are_well_formed():
    for row in _regulations():
        milestones = row["regulation"].get("milestones", [])
        dates = [m["date"] for m in milestones]
        assert dates == sorted(dates), f"{row['slug']}: milestones out of order"
        assert len(set(dates)) == len(dates), f"{row['slug']}: duplicate milestone date"
        for m in milestones:
            assert set(m) == {"date", "kind", "label"}, f"{row['slug']}: {m}"
            date.fromisoformat(m["date"])  # full dates only; month-only facts stay in text
            assert m["kind"] in MILESTONE_KINDS, f"{row['slug']}: {m['kind']}"
            assert m["label"].strip() and not m["label"].endswith("."), f"{row['slug']}: {m}"


def test_future_key_dates_have_a_milestone():
    """Anything that lists upcoming dates reads milestones only, so a future effective
    date or compliance deadline must appear there too."""
    today = date.today().isoformat()
    for row in _regulations():
        reg = row["regulation"]
        dates = {m["date"] for m in reg.get("milestones", [])}
        for field in ("effective_at", "compliance_deadline"):
            when = reg.get(field)
            if when and when[:10] > today:
                assert when[:10] in dates, f"{row['slug']}: {field} {when} has no milestone"


def test_superseded_by_points_at_a_regulation():
    slugs = {r["slug"] for r in _regulations()}
    for row in _regulations():
        successor = row["regulation"].get("superseded_by")
        if successor is not None:
            assert successor in slugs and successor != row["slug"], row["slug"]
