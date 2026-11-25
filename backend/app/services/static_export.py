"""Static snapshot export for the public read-only site (DEC-029).

Writes the data the SPA reads as plain JSON files, so the site can be served from
any static host with no API server. Shapes match the live API responses (same
Pydantic schemas); the frontend's static data layer applies filters, sorting, and
search client-side. Demo data is never exported.
"""

import json
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app import __version__
from app.api.dashboard import map_data
from app.api.entities import REGULATION_PARTS
from app.api.helpers import item_to_out
from app.core.jurisdictions import JURISDICTIONS
from app.models import Entity, Incident, Item, ItemCluster, ItemEntity, Source
from app.schemas.models import EntityOut, IncidentOut, JurisdictionOut, SourceOut
from app.services.item_query import EVENT_TIME
from app.services.summary import dashboard_summary

# Most recent items exported. Keeps items.json around a few MB (well under 1 MB
# gzipped) as history accumulates; older items stay in the database.
ITEM_CAP = 3000


def _dump(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")),
                    encoding="utf-8")


def _items(db: Session) -> tuple[list[dict], int]:
    total = db.query(Item).filter(Item.is_demo.is_(False)).count()
    rows = db.execute(
        select(Item)
        .where(Item.is_demo.is_(False))
        .options(joinedload(Item.source),
                 joinedload(Item.entity_links).joinedload(ItemEntity.entity))
        .order_by(EVENT_TIME.desc(), Item.id.desc())
        .limit(ITEM_CAP)
    ).unique().scalars().all()

    primaries = set(db.execute(select(ItemCluster.primary_item_id)).scalars().all())
    sizes: dict[int, int] = {}
    for r in rows:
        if r.cluster_id is not None:
            sizes[r.cluster_id] = sizes.get(r.cluster_id, 0) + 1

    out = []
    for r in rows:
        record = item_to_out(db, r, sizes).model_dump(mode="json")
        # Extra fields the client-side filters need (not part of ItemOut).
        record["source_id"] = r.source_id
        record["is_page_change"] = r.source is not None and r.source.source_type == "page_watch"
        record["is_cluster_primary"] = r.cluster_id is None or r.id in primaries
        out.append(record)
    return out, total


def export_static(db: Session, out_dir: Path) -> dict:
    """Write the snapshot into out_dir; returns meta.json's contents."""
    out_dir.mkdir(parents=True, exist_ok=True)

    items, items_total = _items(db)
    _dump(out_dir / "items.json", items)

    entities = db.execute(
        select(Entity).where(Entity.is_demo.is_(False)).options(
            *REGULATION_PARTS, joinedload(Entity.standard), joinedload(Entity.events))
        .order_by(Entity.name)
    ).unique().scalars().all()
    _dump(out_dir / "entities.json",
          [EntityOut.model_validate(e).model_dump(mode="json") for e in entities])

    incidents = db.execute(
        select(Incident).where(Incident.is_demo.is_(False))
    ).scalars().all()
    _dump(out_dir / "incidents.json",
          [IncidentOut.model_validate(i).model_dump(mode="json") for i in incidents])

    sources = db.execute(
        select(Source).where(Source.is_demo.is_(False)).order_by(Source.name)
    ).scalars().all()
    _dump(out_dir / "sources.json",
          [SourceOut.model_validate(s).model_dump(mode="json") for s in sources])

    _dump(out_dir / "jurisdictions.json", [
        JurisdictionOut(code=j.code, name=j.name, kind=j.kind, parent_code=j.parent_code,
                        iso_numeric=j.iso_numeric).model_dump(mode="json")
        for j in JURISDICTIONS
    ])
    _dump(out_dir / "summary.json", dashboard_summary(db))
    _dump(out_dir / "map.json", map_data(db))

    meta = {
        "generated_at": datetime.now(UTC).isoformat(),
        "version": __version__,
        "items_exported": len(items),
        "items_total": items_total,
    }
    _dump(out_dir / "meta.json", meta)
    return meta
