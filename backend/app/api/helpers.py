"""Shared query/serialization helpers for routers."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Item
from app.schemas.models import EntityBrief, ItemOut


def item_to_out(db: Session, item: Item, cluster_sizes: dict[int, int] | None = None) -> ItemOut:
    source = item.source
    entities = [
        EntityBrief.model_validate(link.entity)
        for link in item.entity_links
    ]
    cluster_size = 1
    if item.cluster_id is not None:
        if cluster_sizes and item.cluster_id in cluster_sizes:
            cluster_size = cluster_sizes[item.cluster_id]
        else:
            cluster_size = db.execute(
                select(func.count(Item.id)).where(Item.cluster_id == item.cluster_id)
            ).scalar_one()
    out = ItemOut.model_validate(item)
    out.source_name = source.name if source else ""
    out.source_tier = source.reliability_tier if source else 3
    out.entities = entities
    out.cluster_size = cluster_size
    return out


def category_like(column, category: str):
    from sqlalchemy import String, cast

    return cast(column, String).like(f'%"{category}"%')
