"""Home's collection counts (DEC-030, DEC-033). Deterministic counts over stored data.

Every count is of distinct developments (reports of one event collapsed) published in
the window, and equals the All Sources list it links to: same window, same filters.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import Item, Source
from app.services.item_query import EVENT_TIME, is_cluster_primary, is_page_change

DEFAULT_WINDOW_DAYS = 7


def dashboard_summary(db: Session, window_days: int | None = None) -> dict:
    """`collected`: everything in the window. `government`: from tier 1 sources
    (governments, regulators, standards bodies), page-change alerts aside. `others`:
    the rest by primary category, and `page_changes` the alerts. The three add up to
    `collected`. `demo`: how many of them are seeded demo items (never on the public site),
    so the count can say so."""
    since = datetime.now(UTC) - timedelta(days=window_days or DEFAULT_WINDOW_DAYS)
    window = (EVENT_TIME >= since, is_cluster_primary())
    collected = db.execute(select(func.count(Item.id)).where(*window)).scalar_one()
    page_changes = db.execute(
        select(func.count(Item.id)).where(*window, is_page_change())
    ).scalar_one()
    first_category = func.coalesce(func.json_extract(Item.categories, "$[0]"), "news")
    rows = db.execute(
        select(Source.reliability_tier, first_category, func.count(Item.id))
        .join(Source, Item.source_id == Source.id)
        .where(*window, ~is_page_change())
        .group_by(Source.reliability_tier, first_category)
    ).all()
    demo = db.execute(
        select(func.count(Item.id)).where(*window, Item.is_demo.is_(True))
    ).scalar_one()
    government = sum(n for tier, _, n in rows if tier == 1)
    others: dict[str, int] = {}
    for tier, category, n in rows:
        if tier != 1:
            others[category] = others.get(category, 0) + n
    return {
        "since": since.isoformat(),
        "collected": collected,
        "government": government,
        "page_changes": page_changes,
        "others": dict(sorted(others.items(), key=lambda kv: -kv[1])),
        "demo": demo,
    }
