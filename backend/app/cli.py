"""`radar` CLI: serve | ingest | seed | status | rescore | reindex | export-static | backup."""

import argparse
import sys


def cmd_serve(args: argparse.Namespace) -> int:
    import uvicorn

    from app.core.config import settings

    uvicorn.run("app.main:app", host=args.host or settings.api_host,
                port=args.port or settings.api_port, reload=args.reload)
    return 0


def cmd_ingest(args: argparse.Namespace) -> int:
    from app.core.db import SessionLocal, init_db
    from app.ingestion.pipeline import ingest_all

    init_db()
    db = SessionLocal()
    try:
        runs = ingest_all(db, force=args.force, only_source_id=args.source)
        for run in runs:
            src = run.source.name if run.source else run.source_id
            print(f"[{run.status:7}] {src}: found={run.items_found} "
                  f"new={run.items_new} updated={run.items_updated}"
                  + (f" error={run.error_message}" if run.error_message else ""))
        if all(r.status == "success" for r in runs) or args.tolerate_source_errors:
            return 0
        return 1
    finally:
        db.close()


def cmd_seed(args: argparse.Namespace) -> int:
    from app.core.db import SessionLocal, init_db
    from app.services.seeder import seed_all

    init_db()
    db = SessionLocal()
    try:
        counts = seed_all(db)
        print(f"Seeded: {counts}")
        return 0
    finally:
        db.close()


def cmd_status(args: argparse.Namespace) -> int:
    from sqlalchemy import func, select

    from app.core.db import SessionLocal, init_db
    from app.models import Entity, Incident, Item, Source

    init_db()
    db = SessionLocal()
    try:
        items = db.execute(select(func.count(Item.id))).scalar_one()
        entities = db.execute(select(func.count(Entity.id))).scalar_one()
        incidents = db.execute(select(func.count(Incident.id))).scalar_one()
        print(f"items={items} entities={entities} incidents={incidents}")
        print(f"{'SOURCE':40} {'STATE':8} LAST SUCCESS / ERROR")
        for s in db.execute(select(Source).order_by(Source.name)).scalars():
            state = "ok" if s.last_error is None else "ERROR"
            if not s.enabled:
                state = "disabled"
            detail = s.last_error or (
                s.last_success_at.isoformat() if s.last_success_at else "never fetched"
            )
            print(f"{s.name[:40]:40} {state:8} {detail[:80]}")
        return 0
    finally:
        db.close()


def cmd_rescore(args: argparse.Namespace) -> int:
    """Recompute classification + impact/confidence for stored items using the
    current rules. Needed after scoring or classification changes; ingestion only
    scores at collection time."""
    from sqlalchemy import select, text
    from sqlalchemy.orm import joinedload

    from app.core.db import SessionLocal, init_db
    from app.models import Item
    from app.services import classify, scoring

    init_db()
    db = SessionLocal()
    try:
        items = list(db.execute(select(Item).options(joinedload(Item.source))).scalars().all())
        changed = 0
        pruned = 0

        if args.prune_irrelevant:
            from sqlalchemy import delete as sa_delete

            from app.models import ItemEntity

            for item in list(items):
                src = item.source
                if not src or not (src.config or {}).get("require_ai_relevance"):
                    continue
                if classify.is_ai_relevant(item.title, item.excerpt):
                    continue
                # Collected before the source gained its relevance filter.
                db.execute(sa_delete(ItemEntity).where(ItemEntity.item_id == item.id))
                db.execute(text("DELETE FROM items_fts WHERE rowid = :rid"), {"rid": item.id})
                db.delete(item)
                items.remove(item)
                pruned += 1
            db.commit()
        for item in items:
            src = item.source
            ai_relevant = classify.is_ai_relevant(item.title, item.excerpt)
            categories, jurisdiction = classify.classify(
                item.title, item.excerpt,
                src.category_default if src else None,
                src.jurisdiction_code if src else None,
            )
            result = scoring.score_item(
                categories=categories,
                reliability_tier=src.reliability_tier if src else 3,
                change_type=item.change_type,
                published_at=item.published_at,
                ai_relevant=ai_relevant,
            )
            if (item.impact_score != result.score or item.categories != categories
                    or item.jurisdiction_code != jurisdiction):
                changed += 1
            item.impact_score = result.score
            item.impact_factors = result.factors
            item.categories = categories
            item.jurisdiction_code = jurisdiction
        db.commit()
        print(f"Rescored {len(items)} items ({changed} changed"
              + (f", {pruned} pruned as not AI-relevant)" if args.prune_irrelevant else ")"))
        return 0
    finally:
        db.close()


def cmd_reindex(args: argparse.Namespace) -> int:
    from app.core.db import SessionLocal, init_db
    from app.services.search import reindex_all

    init_db()
    db = SessionLocal()
    try:
        count = reindex_all(db)
        db.commit()
        print(f"Reindexed {count} items")
        return 0
    finally:
        db.close()


def cmd_export_static(args: argparse.Namespace) -> int:
    from pathlib import Path

    from app.core.db import SessionLocal, init_db
    from app.services.static_export import export_static

    init_db()
    db = SessionLocal()
    try:
        meta = export_static(db, Path(args.out), site_url=args.site_url)
        print(f"Exported {meta['items_exported']} of {meta['items_total']} items "
              f"to {args.out}")
        return 0
    finally:
        db.close()


def cmd_backup(args: argparse.Namespace) -> int:
    """Write a consistent single-file copy of the live database. Copying radar.db by
    hand can miss recent writes still sitting in the WAL file; VACUUM INTO can't."""
    from pathlib import Path

    from sqlalchemy import text

    from app.core.db import engine, init_db

    target = Path(args.path).resolve()
    if target.exists():
        print(f"Refusing to overwrite existing file: {target}", file=sys.stderr)
        return 1
    target.parent.mkdir(parents=True, exist_ok=True)
    init_db()
    with engine.connect() as conn:
        conn.execute(text("VACUUM INTO :path"), {"path": str(target)})
    print(f"Backed up database to {target}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="radar", description="AI Governance Radar")
    sub = parser.add_subparsers(dest="command", required=True)

    p_serve = sub.add_parser("serve", help="Run the API + UI server")
    p_serve.add_argument("--host", default=None)
    p_serve.add_argument("--port", type=int, default=None)
    p_serve.add_argument("--reload", action="store_true")
    p_serve.set_defaults(func=cmd_serve)

    p_ingest = sub.add_parser("ingest", help="Run ingestion for due (or all) sources")
    p_ingest.add_argument("--source", type=int, default=None, help="Only this source id")
    p_ingest.add_argument("--force", action="store_true", help="Ignore polling intervals")
    p_ingest.add_argument(
        "--tolerate-source-errors", action="store_true",
        help="Exit 0 even if individual sources fail (failures are still recorded in "
             "source health); unexpected errors still exit non-zero")
    p_ingest.set_defaults(func=cmd_ingest)

    p_seed = sub.add_parser("seed", help="Load source registry + curated seed data")
    p_seed.set_defaults(func=cmd_seed)

    p_status = sub.add_parser("status", help="Show source health and record counts")
    p_status.set_defaults(func=cmd_status)

    p_rescore = sub.add_parser(
        "rescore", help="Recompute classification + scores for stored items")
    p_rescore.add_argument(
        "--prune-irrelevant", action="store_true",
        help="Also delete stored items that fail their source's AI-relevance filter "
             "(for items collected before the filter was enabled)")
    p_rescore.set_defaults(func=cmd_rescore)

    p_reindex = sub.add_parser("reindex", help="Rebuild the search index")
    p_reindex.set_defaults(func=cmd_reindex)

    p_export = sub.add_parser(
        "export-static", help="Write a read-only JSON snapshot for the static public site")
    p_export.add_argument("--out", required=True, help="Output directory")
    p_export.add_argument(
        "--site-url", default=None,
        help="Public address for absolute links in the calendar and change feeds "
             "(default: SITE_URL)")
    p_export.set_defaults(func=cmd_export_static)

    p_backup = sub.add_parser("backup", help="Write a consistent copy of the database")
    p_backup.add_argument("path", help="Destination file (must not exist)")
    p_backup.set_defaults(func=cmd_backup)

    args = parser.parse_args()
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
