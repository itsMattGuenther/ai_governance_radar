"""Seeding: re-seeding an existing database mirrors the curated files exactly."""

import json
from datetime import datetime

from sqlalchemy import select

from app.models import Entity, EntityEvent, Incident, Item, Source
from app.services.seeder import seed_entities, seed_incidents


def _entity(events):
    return [{
        "slug": "test-act", "name": "Test Act", "type": "regulation", "jurisdiction": "US-CO",
        "regulation": {"official_source_url": "https://example.gov/act",
                       "last_verified_at": "2026-11-25", "status": "signed",
                       "signed_at": "2024-05-17", "passed_at": "2024-05-08"},
        "events": events,
    }]


def _write(tmp_path, name, data):
    path = tmp_path / name
    path.write_text(json.dumps(data), encoding="utf-8")
    return path


def _events(db):
    return db.execute(select(EntityEvent).order_by(EntityEvent.occurred_at)).scalars().all()


def test_corrected_event_replaces_the_old_one(clean_db, tmp_path):
    db = clean_db
    seed_entities(db, _write(tmp_path, "a.json", _entity([
        {"type": "created", "occurred_at": "2024-04-04", "summary": "Introduced."},
        {"type": "status_change", "occurred_at": "2024-05-17", "summary": "Signed; first law."},
    ])))
    seed_entities(db, _write(tmp_path, "b.json", _entity([
        {"type": "created", "occurred_at": "2024-04-10", "summary": "Introduced."},
        {"type": "status_change", "occurred_at": "2024-05-17", "summary": "Signed."},
    ])))
    events = _events(db)
    assert [(e.occurred_at.date().isoformat(), e.summary) for e in events] == [
        ("2024-04-10", "Introduced."), ("2024-05-17", "Signed.")]


def test_reseeding_keeps_events_ingestion_linked_to_evidence(clean_db, tmp_path):
    db = clean_db
    path = _write(tmp_path, "a.json", _entity([
        {"type": "created", "occurred_at": "2024-04-10", "summary": "Introduced."}]))
    seed_entities(db, path)
    entity = db.execute(select(Entity)).scalar_one()
    source = Source(name="S", url="https://example.gov", source_type="rss", reliability_tier=1)
    db.add(source)
    db.flush()
    item = Item(source_id=source.id, url="https://example.gov/x", canonical_url="https://example.gov/x",
                content_hash="h", title="Page changed")
    db.add(item)
    db.flush()
    db.add(EntityEvent(entity_id=entity.id, event_type="document_updated",
                       occurred_at=datetime(2026, 11, 1), summary="Linked document changed",
                       evidence_item_id=item.id))
    db.commit()
    seed_entities(db, path)
    assert sorted(e.summary for e in _events(db)) == ["Introduced.", "Linked document changed"]


def test_cleared_regulation_dates_are_cleared(clean_db, tmp_path):
    db = clean_db
    seed_entities(db, _write(tmp_path, "a.json", _entity([])))
    data = _entity([])
    del data[0]["regulation"]["signed_at"]  # e.g. a law enacted without a signature
    seed_entities(db, _write(tmp_path, "b.json", data))
    reg = db.execute(select(Entity)).scalar_one().regulation
    assert reg.signed_at is None and reg.passed_at is not None


def test_renamed_incident_replaces_the_old_one(clean_db, tmp_path):
    db = clean_db
    row = {"title": "Vendor settles suit over discriminatory software",
           "what_happened": "x", "fact_status": "confirmed",
           "source_links": [{"title": "s", "url": "https://example.gov"}]}
    seed_incidents(db, _write(tmp_path, "a.json", [row]))
    row = {**row, "title": "Vendor settles suit over allegedly discriminatory software"}
    seed_incidents(db, _write(tmp_path, "b.json", [row]))
    assert db.execute(select(Incident.title)).scalars().all() == [row["title"]]
