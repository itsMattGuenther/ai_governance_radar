"""Deduplication + conservative event clustering (§62, DEC-020 review posture).

Exact dedupe: (source_id, canonical_url) unique constraint + content_hash comparison.
Clustering puts reports of one event on one row, in two ways:
- Reports from one source that the source itself files under the same event, e.g. the
  AI Incident Database's incident number (`report_group` in raw_metadata, read with the
  source's `report_group_pattern`). This takes precedence.
- Cross-source: near-exact normalized-title match within a 72h window — deliberately
  conservative to avoid false merges (T-027).
"""

import re
from datetime import UTC, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.ingestion.parsers import report_group
from app.models import Item, ItemCluster, Source

CLUSTER_WINDOW = timedelta(hours=72)

_STOP = {"the", "a", "an", "of", "for", "to", "in", "on", "and", "or", "its", "is", "as"}


def normalize_title(title: str) -> str:
    words = re.sub(r"[^a-z0-9 ]", " ", title.lower()).split()
    return " ".join(w for w in words if w not in _STOP)


def titles_match(a: str, b: str) -> bool:
    """Near-exact: identical normalized titles, or one contains the other with >=5 words."""
    na, nb = normalize_title(a), normalize_title(b)
    if not na or not nb:
        return False
    if na == nb:
        return True
    shorter, longer = (na, nb) if len(na) <= len(nb) else (nb, na)
    return len(shorter.split()) >= 5 and shorter in longer


def _group_of(item: Item) -> str | None:
    return (item.raw_metadata or {}).get("report_group")


def _same_group(db: Session, item: Item) -> Item | None:
    """Another report from the same source filed under the same event."""
    key = _group_of(item)
    if key is None:
        return None
    return db.execute(
        select(Item)
        .where(
            Item.id != item.id,
            Item.source_id == item.source_id,
            func.json_extract(Item.raw_metadata, "$.report_group") == key,
        )
        .order_by(Item.cluster_id.is_(None), Item.id)  # prefer one already clustered
        .limit(1)
    ).scalar_one_or_none()


def assign_cluster(db: Session, item: Item) -> None:
    """Cluster a newly ingested item with other reports of the same event."""
    match = _same_group(db, item)
    if match is None:
        ref_time = item.published_at or item.first_seen_at
        lo, hi = ref_time - CLUSTER_WINDOW, ref_time + CLUSTER_WINDOW
        candidates = db.execute(
            select(Item)
            .where(Item.id != item.id, Item.source_id != item.source_id)
            .where((Item.published_at.between(lo, hi)) | (Item.first_seen_at.between(lo, hi)))
        ).scalars().all()
        match = next((c for c in candidates if titles_match(item.title, c.title)), None)
    if match is None:
        return

    if match.cluster_id is not None:
        cluster = db.get(ItemCluster, match.cluster_id)
        assert cluster is not None  # FK guarantees existence
    else:
        cluster = ItemCluster(title=match.title, primary_item_id=match.id)
        db.add(cluster)
        db.flush()
        match.cluster_id = cluster.id
    item.cluster_id = cluster.id
    db.flush()
    _update_primary(db, cluster)


def _update_primary(db: Session, cluster: ItemCluster) -> None:
    """The row a cluster shows (§62): the report from the most reliable source, then the
    newest, so an event that gets fresh coverage shows up in recent windows again.
    An emptied cluster is removed."""
    members = db.execute(
        select(Item, Source.reliability_tier)
        .join(Source, Item.source_id == Source.id)
        .where(Item.cluster_id == cluster.id)
    ).all()
    if not members:
        db.delete(cluster)
        return

    def rank(row: tuple[Item, int]) -> tuple:
        item, tier = row
        when = item.published_at or item.first_seen_at
        if when is not None and when.tzinfo is None:  # SQLite returns naive UTC
            when = when.replace(tzinfo=UTC)
        return (tier, -when.timestamp() if when else 0, -item.id)

    best = min(members, key=rank)[0]
    cluster.primary_item_id = best.id
    cluster.title = best.title


def group_stored_reports(db: Session) -> int:
    """Give stored items their source's report group and cluster them (a one-time
    repair for items collected before grouping existed). Only items whose stored
    excerpt still carries the source's key are grouped; nothing is guessed. Returns
    the number of items newly grouped."""
    grouped = 0
    for source in db.execute(select(Source)).scalars():
        pattern = (source.config or {}).get("report_group_pattern")
        if not pattern:
            continue
        groups: dict[str, list[Item]] = {}
        for item in db.execute(
            select(Item).where(Item.source_id == source.id).order_by(Item.id)
        ).scalars():
            key = _group_of(item) or report_group(item.excerpt, pattern)
            if key is None:
                continue
            if _group_of(item) is None:
                item.raw_metadata = {**(item.raw_metadata or {}), "report_group": key}
            groups.setdefault(key, []).append(item)
        for members in groups.values():
            if len(members) < 2:
                continue
            existing = next((m.cluster_id for m in members if m.cluster_id is not None), None)
            if existing is not None:
                target = db.get(ItemCluster, existing)
                assert target is not None
            else:
                target = ItemCluster(title=members[0].title, primary_item_id=members[0].id)
                db.add(target)
                db.flush()
            left: set[int] = set()
            for m in members:
                if m.cluster_id != target.id:
                    if m.cluster_id is not None:
                        left.add(m.cluster_id)
                    m.cluster_id = target.id
                    grouped += 1
            db.flush()
            _update_primary(db, target)
            for cluster_id in left:
                old = db.get(ItemCluster, cluster_id)
                if old is not None:
                    _update_primary(db, old)
    db.flush()
    return grouped
