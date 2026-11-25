"""One-time repairs to rows stored by older versions (DEC-034).

The public site keeps its database between runs (DEC-029), so a fix to how items are
stored must also reach the rows already there. Each repair runs once per database and
is recorded under `repairs_applied` in app_state. `seed_all` runs them after the source
registry is re-read, so a repair can rely on the current source configuration.
"""

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ingestion.parsers import content_hash, sanitize_text
from app.ingestion.pipeline import REFRESH_TEXT
from app.models import AppState, EntityEvent, Item
from app.services.dedupe import group_stored_reports
from app.services.search import index_item

REPAIRS_KEY = "repairs_applied"


def decode_stored_text(db: Session) -> int:
    """Decode HTML entities ("&amp;") that the old sanitiser left in stored titles,
    excerpts and generated event summaries. Returns the number of items changed."""
    changed = 0
    for item in db.execute(select(Item)).scalars():
        title = sanitize_text(item.title)[:500]
        excerpt = sanitize_text(item.excerpt) if item.excerpt else item.excerpt
        if (title, excerpt) == (item.title, item.excerpt):
            continue
        # Feed items hash their own title and excerpt; page-change alerts hash the page,
        # which this repair does not touch.
        hashes_text = item.content_hash == content_hash(item.title, item.excerpt)
        excerpt_changed = excerpt != item.excerpt
        item.title, item.excerpt = title, excerpt
        if hashes_text:
            item.content_hash = content_hash(title, excerpt)
            if excerpt_changed and excerpt and excerpt.endswith("…"):
                # The feed's excerpt is now cut 500 characters into the decoded text,
                # which may not end where this one does.
                item.raw_metadata = {**(item.raw_metadata or {}), REFRESH_TEXT: True}
        names = " ".join(link.entity.name for link in item.entity_links)
        index_item(db, item, names)
        changed += 1
    for event in db.execute(
        select(EntityEvent).where(EntityEvent.evidence_item_id.is_not(None))
    ).scalars():
        event.summary = sanitize_text(event.summary)
    return changed


REPAIRS = {
    "decode-html-entities": decode_stored_text,
    "group-reports-by-source-key": group_stored_reports,
}


def apply_repairs(db: Session) -> dict[str, int]:
    """Run every repair this database has not had yet; returns {name: rows changed}."""
    state = db.get(AppState, REPAIRS_KEY)
    done = list(state.value) if state is not None and isinstance(state.value, list) else []
    results: dict[str, int] = {}
    for name, repair in REPAIRS.items():
        if name in done:
            continue
        results[name] = repair(db)
        done.append(name)
    if results:
        if state is None:
            db.add(AppState(key=REPAIRS_KEY, value=done))
        else:
            state.value = done
        db.commit()
    return results
