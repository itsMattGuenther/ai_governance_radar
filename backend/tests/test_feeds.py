"""T-047: the milestone calendar and the record-change feed."""

import json
from datetime import UTC, date, datetime
from pathlib import Path

import feedparser

from app.services.feeds import _fold, changes_atom, milestones_ics
from app.services.seeder import seed_entities
from app.services.static_export import export_static

SEED = Path(__file__).resolve().parents[2] / "data" / "seed" / "entities.json"
NOW = datetime(2026, 11, 25, 15, 0, tzinfo=UTC)
SITE = "https://radar.example.org"


def _seeded_ahead(today: date) -> set[tuple[str, str]]:
    rows = json.loads(SEED.read_text(encoding="utf-8"))
    return {
        (r["slug"], m["date"].replace("-", ""))
        for r in rows
        if r["type"] == "regulation"
        for m in r["regulation"].get("milestones", [])
        if date.fromisoformat(m["date"]) >= today
    }


def _events(ics: str) -> list[dict[str, str]]:
    unfolded = ics.replace("\r\n ", "")
    events, current = [], None
    for line in unfolded.split("\r\n"):
        if line == "BEGIN:VEVENT":
            current = {}
        elif line == "END:VEVENT":
            events.append(current)
            current = None
        elif current is not None and ":" in line:
            key, value = line.split(":", 1)
            current[key.split(";")[0]] = value
    return events


def test_calendar_holds_exactly_the_milestones_ahead(db):
    seed_entities(db)
    for now in (NOW, datetime.now(UTC)):
        events = _events(milestones_ics(db, SITE, now=now))
        # UID is <slug>-<yyyymmdd>-<kind>@host; recover the slug.
        got = {(e["UID"].rsplit("-", 2)[0], e["DTSTART"]) for e in events}
        assert got == _seeded_ahead(now.date())
    events = _events(milestones_ics(db, SITE, now=NOW))
    assert len(events) == 9  # 2 Dec 2026 to 2 Aug 2030 on 25 Nov 2026
    eu = next(e for e in events if e["DTSTART"] == "20261202")
    assert eu["SUMMARY"].startswith("EU AI Act: New prohibitions")
    assert eu["DTEND"] == "20261203"
    assert eu["URL"] == f"{SITE}/entities/eu-ai-act"
    assert "Not legal advice" in eu["DESCRIPTION"]


def test_calendar_is_valid_icalendar_text(db):
    seed_entities(db)
    ics = milestones_ics(db, SITE, now=NOW)
    assert ics.startswith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")
    assert ics.endswith("END:VCALENDAR\r\n")
    assert "\n" not in ics.replace("\r\n", "")
    for line in ics.split("\r\n"):
        assert len(line.encode("utf-8")) <= 75, line
    # Commas and semicolons in text are escaped.
    assert "\\," in ics or "\\;" in ics


def test_folding_never_splits_a_character():
    line = "SUMMARY:" + "é" * 80
    folded = _fold(line)
    for part in folded.split("\r\n "):
        assert len(part.encode("utf-8")) <= 75
        part.encode("utf-8").decode("utf-8")
    assert folded.replace("\r\n ", "") == line


def test_change_feed_is_atom_newest_first(db):
    seed_entities(db)
    parsed = feedparser.parse(changes_atom(db, SITE, self_url=f"{SITE}/data/changes.xml"))
    assert not parsed.bozo, parsed.get("bozo_exception")
    assert parsed.feed.title == "AI Governance Radar: record changes"
    entries = parsed.entries
    assert entries
    stamps = [e.updated for e in entries]
    assert stamps == sorted(stamps, reverse=True)
    assert len({e.id for e in entries}) == len(entries)
    assert all(e.link.startswith(f"{SITE}/entities/") for e in entries)
    assert any(e.title.startswith("Colorado SB 26-189: Note") for e in entries)


def test_static_export_writes_both_feeds(db, tmp_path):
    seed_entities(db)
    export_static(db, tmp_path, site_url=SITE)
    ics = (tmp_path / "milestones.ics").read_bytes()
    assert ics.startswith(b"BEGIN:VCALENDAR\r\n")
    atom = feedparser.parse((tmp_path / "changes.xml").read_bytes())
    assert not atom.bozo
    assert any(link.href == f"{SITE}/data/changes.xml" for link in atom.feed.links)


def test_local_app_serves_the_feeds(client):
    ics = client.get("/api/feeds/milestones.ics")
    assert ics.status_code == 200 and ics.headers["content-type"].startswith("text/calendar")
    atom = client.get("/api/feeds/changes.xml")
    assert atom.status_code == 200
    assert atom.headers["content-type"].startswith("application/atom+xml")
    assert not feedparser.parse(atom.content).bozo


def test_feed_leaves_out_events_ingestion_generated(db):
    """ "Linked document changed" events carry an evidence item; they belong on the
    record's timeline, not in a feed of changes to checked records."""
    from app.models import Entity, EntityEvent, Item, Source

    seed_entities(db)
    entity = db.query(Entity).filter(Entity.slug == "nist-ai-rmf").one()
    src = Source(name="Feed Test Source", url="https://example.org/", source_type="rss")
    db.add(src)
    db.flush()
    item = Item(
        source_id=src.id,
        url="https://example.org/doc",
        canonical_url="https://example.org/doc",
        content_hash="feed-test",
        title="NIST AI RMF page",
        first_seen_at=NOW,
        last_seen_at=NOW,
        categories=["standard"],
        impact_score=40,
        confidence="high",
    )
    db.add(item)
    db.flush()
    db.add(
        EntityEvent(
            entity_id=entity.id,
            event_type="document_updated",
            occurred_at=NOW,
            summary="Linked document changed: NIST AI RMF page",
            evidence_item_id=item.id,
        )
    )
    db.commit()
    try:
        titles = [e.summary for e in feedparser.parse(changes_atom(db, SITE)).entries]
        assert not any(t.startswith("Linked document changed") for t in titles)
    finally:
        db.query(EntityEvent).filter(EntityEvent.evidence_item_id == item.id).delete()
        db.delete(item)
        db.delete(src)
        db.commit()
