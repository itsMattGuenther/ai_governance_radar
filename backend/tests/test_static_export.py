"""Static snapshot export (DEC-029): API-shaped JSON, never any demo data."""

import json
import sqlite3
import subprocess
import sys

from app.services.seeder import seed_all
from app.services.static_export import export_static


def _load(path, name):
    return json.loads((path / name).read_text(encoding="utf-8"))


def test_export_writes_api_shaped_files_without_demo(db, client, tmp_path):
    from datetime import UTC, datetime

    from app.models import Item, Source

    seed_all(db)  # tests run with DEMO_DATA=true, so demo items exist to be excluded
    demo = client.get("/api/items", params={"include_demo": True, "limit": 100}).json()
    assert any(i["is_demo"] for i in demo["items"])
    src = Source(name="Export Test Feed", url="https://example.org/", source_type="rss")
    db.add(src)
    db.flush()
    now = datetime.now(UTC)
    real = Item(source_id=src.id, url="https://example.org/x", canonical_url="https://example.org/x",
                content_hash="export-test", title="Export test item", published_at=now,
                first_seen_at=now, last_seen_at=now, categories=["news"], impact_score=40,
                confidence="medium")
    db.add(real)
    db.commit()
    try:
        meta = export_static(db, tmp_path)
    finally:
        db.delete(real)
        db.delete(src)
        db.commit()

    for name in ("items.json", "entities.json", "incidents.json", "sources.json",
                 "jurisdictions.json", "summary.json", "map.json", "meta.json"):
        assert (tmp_path / name).is_file(), name
    assert _load(tmp_path, "meta.json") == meta

    items = _load(tmp_path, "items.json")
    assert "Export test item" in {i["title"] for i in items}
    assert not any(i["is_demo"] for i in items)
    api_keys = set(client.get("/api/items", params={"limit": 1}).json()["items"][0])
    for item in items:
        assert api_keys <= set(item)
        assert {"source_id", "is_page_change", "is_cluster_primary"} <= set(item)

    for name in ("entities.json", "incidents.json", "sources.json"):
        assert not any(row["is_demo"] for row in _load(tmp_path, name)), name
    regs = [e for e in _load(tmp_path, "entities.json") if e["regulation"]]
    assert regs and all(r["regulation"]["last_verified_at"] for r in regs)


def test_backup_writes_standalone_copy_and_never_overwrites(database, tmp_path):
    target = tmp_path / "copy.db"
    cmd = [sys.executable, "-m", "app.cli", "backup", str(target)]
    assert subprocess.run(cmd, capture_output=True).returncode == 0
    with sqlite3.connect(target) as conn:
        assert conn.execute("SELECT count(*) FROM sources").fetchone()[0] >= 0
    assert subprocess.run(cmd, capture_output=True).returncode == 1
