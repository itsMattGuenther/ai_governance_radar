"""Dashboard summary aggregation. Deterministic counts over stored data."""

from datetime import UTC, datetime, timedelta

from sqlalchemy import String, cast, func, select
from sqlalchemy.orm import Session

from app.models import Incident, Item, Source
from app.services.item_query import EVENT_TIME, is_cluster_primary, is_page_change
from app.services.scoring import HIGH_IMPACT_THRESHOLD

DEFAULT_WINDOW_DAYS = 7


def _since(window_days: int | None) -> datetime:
    return datetime.now(UTC) - timedelta(days=window_days or DEFAULT_WINDOW_DAYS)


def _cat_count(db: Session, since: datetime, category: str) -> int:
    return db.execute(
        select(func.count(Item.id)).where(
            EVENT_TIME > since,
            is_cluster_primary(),
            cast(Item.categories, String).like(f'%"{category}"%'),
        )
    ).scalar_one()


def dashboard_summary(db: Session, window_days: int | None = None) -> dict:
    """Windowed counts of distinct developments (duplicates collapsed). Each matches
    the items list the dashboard links it to — same window, same filters — so a KPI
    never disagrees with its drill-down."""
    since = _since(window_days)
    high_impact = db.execute(
        select(func.count(Item.id)).where(
            EVENT_TIME > since,
            Item.impact_score >= HIGH_IMPACT_THRESHOLD,
            ~is_page_change(),
            is_cluster_primary(),
        )
    ).scalar_one()
    total = db.execute(
        select(func.count(Item.id)).where(EVENT_TIME > since, is_cluster_primary())
    ).scalar_one()

    # Incident signal = newly reported incident records + freshly collected
    # incident reports from monitored sources (e.g. the AI Incident Database).
    incidents = db.execute(
        select(func.count(Incident.id)).where(Incident.reported_at > since)
    ).scalar_one() + _cat_count(db, since, "incident")

    # Source health: the numbers above are only trustworthy if collection is
    # working, so the dashboard surfaces it alongside them.
    enabled_sources = db.execute(
        select(Source).where(Source.enabled.is_(True))
    ).scalars().all()

    return {
        "since": since.isoformat(),
        "high_impact": high_impact,
        "total_changes": total,
        "new_incidents": incidents,
        "sources_ok": sum(1 for s in enabled_sources if s.last_error is None),
        "sources_total": len(enabled_sources),
    }
