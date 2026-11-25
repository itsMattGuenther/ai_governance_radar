"""Item query expressions shared by the items API and dashboard aggregates."""

from sqlalchemy import func, select

from app.models import Item, ItemCluster, Source

# When an item happened: its publication date, or collection time when a feed omits
# one. Time windows ("last 7 days") filter on this rather than first_seen_at, so a
# backlog collected late — a first ingest, or catching up after downtime — is not
# counted as new activity.
EVENT_TIME = func.coalesce(Item.published_at, Item.first_seen_at)


def is_page_change():
    """Items emitted by page_watch sources: "this page changed — review it" signals
    with no content of their own (DEC-020). They stay in the feed, but rankings and
    high-impact counts exclude them — their score reflects the source, not the change.
    """
    return Item.source_id.in_(select(Source.id).where(Source.source_type == "page_watch"))


def is_cluster_primary():
    """Unclustered items plus each cluster's primary: one row per development, so the
    same story from several sources counts once."""
    return Item.cluster_id.is_(None) | Item.id.in_(select(ItemCluster.primary_item_id))
