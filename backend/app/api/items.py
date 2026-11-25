"""Items API (T-010): list/filter/sort/paginate + detail."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, joinedload

from app.api.helpers import category_like, item_to_out
from app.core.db import get_db
from app.models import Item, ItemEntity, Source
from app.schemas.models import ItemOut, PageOut
from app.services.item_query import EVENT_TIME, is_cluster_primary, is_page_change

router = APIRouter(prefix="/items", tags=["items"])

SORTS = {
    # Timeliness first: fall back to collection time when a feed omits a date.
    "newest": EVENT_TIME.desc(),
    "impact": Item.impact_score.desc(),
    "first_seen": Item.first_seen_at.desc(),
}


def _base_query(
    category: str | None = None,
    jurisdiction: str | None = None,
    min_impact: int | None = None,
    confidence: str | None = None,
    source_id: int | None = None,
    entity_id: int | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    include_demo: bool = True,
    include_page_changes: bool = True,
    tiers: list[int] | None = None,
):
    q = select(Item)
    if category:
        q = q.where(category_like(Item.categories, category))
    if jurisdiction:
        q = q.where(Item.jurisdiction_code == jurisdiction)
    if min_impact is not None:
        q = q.where(Item.impact_score >= min_impact)
    if confidence:
        q = q.where(Item.confidence == confidence)
    if source_id is not None:
        q = q.where(Item.source_id == source_id)
    if entity_id is not None:
        q = q.join(ItemEntity, ItemEntity.item_id == Item.id).where(
            ItemEntity.entity_id == entity_id
        )
    if since:
        q = q.where(EVENT_TIME >= since)
    if until:
        q = q.where(EVENT_TIME <= until)
    if not include_demo:
        q = q.where(Item.is_demo.is_(False))
    if not include_page_changes:
        q = q.where(~is_page_change())
    if tiers:
        q = q.where(Item.source_id.in_(select(Source.id).where(Source.reliability_tier.in_(tiers))))
    return q


@router.get("", response_model=PageOut)
def list_items(
    category: str | None = None,
    jurisdiction: str | None = None,
    min_impact: int | None = Query(default=None, ge=0, le=100),
    confidence: str | None = Query(default=None, pattern="^(high|medium|low)$"),
    source_id: int | None = None,
    entity_id: int | None = None,
    since: datetime | None = None,
    until: datetime | None = None,
    include_demo: bool = True,
    include_page_changes: bool = True,
    tier: str | None = Query(
        default=None, pattern=r"^[1-4](,[1-4])*$", description="Source tiers, e.g. 3,4"
    ),
    collapse_clusters: bool = False,
    sort: str = Query(default="newest", pattern="^(impact|newest|first_seen)$"),
    offset: int = Query(default=0, ge=0),
    limit: int = Query(default=25, ge=1, le=100),
    db: Session = Depends(get_db),
) -> PageOut:
    tiers = [int(t) for t in tier.split(",")] if tier else None
    q = _base_query(category, jurisdiction, min_impact, confidence, source_id,
                    entity_id, since, until, include_demo, include_page_changes, tiers)
    if collapse_clusters:
        q = q.where(is_cluster_primary())

    total = db.execute(select(func.count()).select_from(q.subquery())).scalar_one()
    rows: list[Item] = list(db.execute(
        q.options(joinedload(Item.source),
                  joinedload(Item.entity_links).joinedload(ItemEntity.entity))
        .order_by(SORTS[sort], Item.id.desc())
        .offset(offset).limit(limit)
    ).unique().scalars().all())

    # Pre-compute cluster sizes in one query
    cluster_ids = [r.cluster_id for r in rows if r.cluster_id is not None]
    sizes: dict[int, int] = {}
    if cluster_ids:
        for cid, count in db.execute(
            select(Item.cluster_id, func.count(Item.id))
            .where(Item.cluster_id.in_(cluster_ids)).group_by(Item.cluster_id)
        ).all():
            if cid is not None:
                sizes[cid] = count

    return PageOut(
        items=[item_to_out(db, r, sizes) for r in rows],
        total=total, offset=offset, limit=limit,
    )


@router.get("/{item_id}", response_model=ItemOut)
def get_item(item_id: int, db: Session = Depends(get_db)) -> ItemOut:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    return item_to_out(db, item)


@router.get("/{item_id}/cluster", response_model=list[ItemOut])
def get_cluster_members(item_id: int, db: Session = Depends(get_db)) -> list[ItemOut]:
    item = db.get(Item, item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")
    if item.cluster_id is None:
        return [item_to_out(db, item)]
    rows = db.execute(
        select(Item).join(Source).where(Item.cluster_id == item.cluster_id)
        .order_by(Source.reliability_tier, Item.first_seen_at)
    ).scalars().all()
    return [item_to_out(db, r) for r in rows]
