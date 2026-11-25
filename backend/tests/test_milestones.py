"""T-043: curated milestones and successor links — storage, seeding, API, export, and
the upgrade of a database created before they existed."""

import json
import sqlite3
from pathlib import Path

import pytest
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.core.db import init_db
from app.models import Entity, Regulation, RegulationMilestone, RegulationSuccession
from app.schemas.models import EntityOut
from app.services.seeder import SeedError, seed_all, seed_entities
from app.services.static_export import export_static

SEED = Path(__file__).resolve().parents[2] / "data" / "seed" / "entities.json"
OLD_SCHEMA = Path(__file__).parent / "fixtures" / "schema_2026-11-25.sql"


def _seed_rows() -> list[dict]:
    return json.loads(SEED.read_text(encoding="utf-8"))


def _expected() -> dict[str, tuple[list[tuple[str, str, str]], str | None]]:
    """slug → (milestones in date order, superseded_by) as the seed file states them."""
    out = {}
    for row in _seed_rows():
        if row["type"] != "regulation":
            continue
        reg = row["regulation"]
        ms = sorted((m["date"], m["kind"], m["label"]) for m in reg.get("milestones", []))
        out[row["slug"]] = (ms, reg.get("superseded_by"))
    return out


def _as_tuples(regulation: dict) -> list[tuple[str, str, str]]:
    return [(m["date"], m["kind"], m["label"]) for m in regulation["milestones"]]


def test_api_returns_every_seeded_milestone_in_date_order(db, client):
    seed_entities(db)
    expected = _expected()
    assert any(ms for ms, _ in expected.values()), "seed file has milestones to check"
    rows = client.get("/api/regulations").json()
    assert {r["slug"] for r in rows} >= set(expected)
    for r in rows:
        if r["slug"] not in expected:
            continue
        ms, successor = expected[r["slug"]]
        assert _as_tuples(r["regulation"]) == ms, r["slug"]
        assert r["regulation"]["superseded_by"] == successor, r["slug"]
    detail = client.get("/api/entities/eu-ai-act").json()["regulation"]
    assert _as_tuples(detail) == expected["eu-ai-act"][0]


def test_static_export_carries_milestones(db, tmp_path):
    seed_entities(db)
    export_static(db, tmp_path)
    exported = {
        e["slug"]: e["regulation"]
        for e in json.loads((tmp_path / "entities.json").read_text(encoding="utf-8"))
        if e["regulation"]
    }
    for slug, (ms, successor) in _expected().items():
        assert _as_tuples(exported[slug]) == ms, slug
        assert exported[slug]["superseded_by"] == successor, slug


def test_reseeding_after_an_edit_replaces_milestones_and_links(db, tmp_path):
    rows = _seed_rows()
    eu = next(r for r in rows if r["slug"] == "eu-ai-act")["regulation"]
    eu["milestones"] = [eu["milestones"][-1], {**eu["milestones"][0], "label": "Edited label"}]
    co = next(r for r in rows if r["slug"] == "colorado-ai-act")["regulation"]
    co.pop("superseded_by")
    edited = tmp_path / "entities.json"
    edited.write_text(json.dumps(rows), encoding="utf-8")
    try:
        seed_entities(db, edited)
        out = EntityOut.model_validate(
            db.execute(select(Entity).where(Entity.slug == "eu-ai-act")).scalar_one()
        ).regulation
        assert out is not None
        assert [(m.date.isoformat(), m.label) for m in out.milestones] == [
            (eu["milestones"][1]["date"], "Edited label"),
            (eu["milestones"][0]["date"], eu["milestones"][0]["label"]),
        ]
        stored = db.execute(select(RegulationMilestone)).scalars().all()
        assert len(stored) == sum(len(ms) for ms, _ in _expected().values()) - 6
        assert db.execute(select(RegulationSuccession)).scalars().all() == []
    finally:
        seed_entities(db)  # restore the real records for the other tests
    co_reg = db.execute(
        select(Regulation).join(Entity).where(Entity.slug == "colorado-ai-act")
    ).scalar_one()
    assert co_reg.superseded_by == "colorado-sb-26-189"


@pytest.mark.parametrize(
    ("change", "message"),
    [
        (
            {"milestones": [{"date": "2027-01", "kind": "deadline", "label": "Month only"}]},
            "full date",
        ),
        ({"milestones": [{"date": "2027-01-01", "kind": "guess", "label": "x"}]}, "kind"),
        ({"milestones": [{"date": "2027-01-01", "kind": "deadline", "label": " "}]}, "label"),
        ({"superseded_by": "nist-ai-rmf"}, "not another regulation"),
    ],
)
def test_seeder_rejects_malformed_milestones_and_links(db, tmp_path, change, message):
    rows = _seed_rows()
    target = next(r for r in rows if r["slug"] == "texas-traiga")
    target["regulation"].update(change)
    path = tmp_path / "entities.json"
    path.write_text(json.dumps(rows), encoding="utf-8")
    with pytest.raises(SeedError, match=message):
        seed_entities(db, path)
    db.rollback()


def test_database_created_before_milestones_upgrades_on_seed(tmp_path):
    """The public database persists between runs (DEC-029): the publish workflow's
    `seed` must bring one created before T-043 up to date with no manual step."""
    path = tmp_path / "old.db"
    with sqlite3.connect(path) as conn:
        conn.executescript(OLD_SCHEMA.read_text(encoding="utf-8"))
        tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master")}
    assert "regulations" in tables and "regulation_milestones" not in tables

    engine = create_engine(f"sqlite:///{path.as_posix()}")
    init_db(engine)
    with Session(engine) as db:
        seed_all(db)
        regs = db.execute(select(Entity).join(Regulation)).unique().scalars().all()
        out = {e.slug: EntityOut.model_validate(e).regulation for e in regs}
        for slug, (ms, successor) in _expected().items():
            reg = out[slug]
            assert reg is not None
            assert [(m.date.isoformat(), m.kind, m.label) for m in reg.milestones] == ms
            assert reg.superseded_by == successor
    engine.dispose()
