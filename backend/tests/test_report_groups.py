"""T-042: entities decoded at ingestion and in stored rows; reports of one incident
grouped by the number their source files them under. Offline (safe_fetch mocked)."""

import re
from datetime import UTC, datetime, timedelta

import nh3
from sqlalchemy import select

from app.ingestion import pipeline
from app.ingestion.parsers import content_hash, parse_feed, sanitize_text
from app.ingestion.safe_fetch import FetchResult
from app.models import AppState, Entity, EntityEvent, Item, ItemCluster, ItemEntity, Source
from app.services.item_query import EVENT_TIME, is_cluster_primary
from app.services.repairs import REPAIRS_KEY, apply_repairs

PATTERN = r"https://incidentdatabase\.ai/cite/(\d+)"


def _source(db, name="Incident Reports", tier=2, pattern=PATTERN):
    src = Source(
        name=name,
        url="https://incidents.example.org/",
        feed_url="https://incidents.example.org/rss.xml",
        source_type="rss",
        reliability_tier=tier,
        config={"report_group_pattern": pattern} if pattern else None,
    )
    db.add(src)
    db.commit()
    return src


def _fetch(content: bytes):
    def fake(url, **kwargs):
        return FetchResult(url=url, final_url=url, status_code=200, content=content)

    return fake


def _rss(*entries: tuple[str, str, str, str]) -> bytes:
    """entries: (title, description, link, pubDate)."""
    body = "".join(
        f"<item><title><![CDATA[{t}]]></title><description><![CDATA[{d}]]></description>"
        f"<link>{link}</link><pubDate>{when}</pubDate></item>"
        for t, d, link, when in entries
    )
    head = '<?xml version="1.0"?><rss version="2.0"><channel><title>F</title>'
    return f"{head}{body}</channel></rss>".encode()


# --------------------------------------------------------------- (a) entities


def test_titles_and_excerpts_are_decoded(feed_bytes):
    items = parse_feed(feed_bytes("incident_reports.xml"), "x")
    secrets = next(i for i in items if "Coding agent" in i.title)
    assert secrets.title == "Coding agent leaks secrets to GitHub & Docker Hub"
    assert "keys & tokens" in (secrets.excerpt or "")
    assert "&amp;" not in secrets.title + (secrets.excerpt or "")


def test_decoding_never_turns_encoded_markup_into_text():
    clean = sanitize_text("Fix &lt;script&gt;alert(1)&lt;/script&gt; now &amp; later")
    assert "<" not in clean and "alert" not in clean
    assert clean == "Fix now & later"
    assert sanitize_text("Q&amp;A: caf&eacute;&nbsp;rules") == "Q&A: café rules"
    assert sanitize_text("profit < cost") == "profit < cost"


def _old_sanitize(raw: str) -> str:
    """What the sanitiser stored before T-042: nh3's escaped output."""
    return re.sub(r"\s+", " ", nh3.clean(raw, tags=set())).strip()


def _old_excerpt(raw: str) -> str:
    text = _old_sanitize(raw)
    return text[:499].rsplit(" ", 1)[0] + "…" if len(text) > 500 else text


def test_repair_decodes_stored_rows_and_reingest_reports_no_change(clean_db, monkeypatch):
    db = clean_db
    src = _source(db, pattern=None)
    entity = Entity(slug="docker-hub", name="Docker Hub", entity_type="organization")
    db.add(entity)
    long_body = (
        ("word " * 95) + "keys & tokens & more & more & more text at the cut " + ("tail " * 20)
    )
    rows = [
        ("Secrets on GitHub & Docker Hub", "Short & sweet.", "https://a.example.com/1"),
        ("Plain title", long_body, "https://a.example.com/2"),
    ]
    now = datetime.now(UTC)
    for title, body, url in rows:
        old_title, old_excerpt = _old_sanitize(title), _old_excerpt(body)
        item = Item(
            source_id=src.id,
            url=url,
            canonical_url=url,
            title=old_title,
            excerpt=old_excerpt,
            content_hash=content_hash(old_title, old_excerpt),
            published_at=now,
            first_seen_at=now,
            last_seen_at=now,
            categories=["incident"],
            change_type="new",
            impact_score=40,
            confidence="medium",
        )
        db.add(item)
        db.flush()
        db.add(ItemEntity(item_id=item.id, entity_id=entity.id))
    db.commit()
    assert "&amp;" in db.execute(select(Item.title).where(Item.url.endswith("/1"))).scalar_one()

    assert apply_repairs(db)["decode-html-entities"] == 2
    titles = db.execute(select(Item.title)).scalars().all()
    assert "Secrets on GitHub & Docker Hub" in titles
    assert not any("&amp;" in (i.excerpt or "") for i in db.execute(select(Item)).scalars())

    feed = _rss(*[(t, b, u, "Mon, 23 Nov 2026 00:00:00 GMT") for t, b, u in rows])
    monkeypatch.setattr(pipeline, "safe_fetch", _fetch(feed))
    run = pipeline.ingest_source(db, src)
    assert run.items_new == 0 and run.items_updated == 0
    assert db.execute(select(EntityEvent)).scalars().all() == []
    db.refresh(entity)
    assert entity.needs_review is False
    for item in db.execute(select(Item)).scalars():
        assert item.change_type == "new"
        assert "refresh_text" not in (item.raw_metadata or {})

    # A genuine change after the refresh is still reported.
    changed = _rss((rows[0][0], "Now with new facts.", rows[0][2], "Mon, 23 Nov 2026 00:00:00 GMT"))
    monkeypatch.setattr(pipeline, "safe_fetch", _fetch(changed))
    assert pipeline.ingest_source(db, src).items_updated == 1


def test_repairs_run_once_per_database(clean_db):
    db = clean_db
    first = apply_repairs(db)
    assert set(first) == {"decode-html-entities", "group-reports-by-source-key"}
    assert apply_repairs(db) == {}
    assert set(db.get(AppState, REPAIRS_KEY).value) == set(first)


# ------------------------------------------------------------ (c) report groups


def _cluster_rows(db):
    return db.execute(select(Item).where(is_cluster_primary())).scalars().all()


def test_reports_of_one_incident_share_a_row(clean_db, feed_bytes, monkeypatch):
    db = clean_db
    src = _source(db)
    monkeypatch.setattr(pipeline, "safe_fetch", _fetch(feed_bytes("incident_reports.xml")))
    assert pipeline.ingest_source(db, src).items_new == 4

    items = db.execute(select(Item)).scalars().all()
    groups = {i.raw_metadata["report_group"] for i in items}
    assert groups == {"9001", "9002"}
    outage = [i for i in items if i.raw_metadata["report_group"] == "9001"]
    assert len({i.cluster_id for i in outage}) == 1 and outage[0].cluster_id is not None
    secrets = next(i for i in items if i.raw_metadata["report_group"] == "9002")
    assert secrets.cluster_id is None
    assert len(_cluster_rows(db)) == 2  # one row per incident

    # The row shows the newest report, so fresh coverage surfaces in recent windows.
    cluster = db.get(ItemCluster, outage[0].cluster_id)
    assert (
        db.get(Item, cluster.primary_item_id).title
        == "Outage at the agency's network has been resolved"
    )


def test_new_report_on_an_old_incident_appears_in_recent_window(clean_db, monkeypatch):
    db = clean_db
    src = _source(db)
    old = datetime.now(UTC) - timedelta(days=21)
    fmt = "%a, %d %b %Y %H:%M:%S GMT"
    first = [
        (
            "First report",
            "A ... (https://incidentdatabase.ai/cite/77#1)",
            "https://x.example.com/1",
            old.strftime(fmt),
        ),
        (
            "Second report",
            "B ... (https://incidentdatabase.ai/cite/77#2)",
            "https://x.example.com/2",
            (old + timedelta(days=1)).strftime(fmt),
        ),
    ]
    monkeypatch.setattr(pipeline, "safe_fetch", _fetch(_rss(*first)))
    pipeline.ingest_source(db, src)
    week_ago = datetime.now(UTC) - timedelta(days=7)
    recent = select(Item).where(EVENT_TIME > week_ago, is_cluster_primary())
    assert db.execute(recent).scalars().all() == []

    fresh = (
        *first,
        (
            "Third report",
            "C ... (https://incidentdatabase.ai/cite/77#3)",
            "https://x.example.com/3",
            datetime.now(UTC).strftime(fmt),
        ),
    )
    monkeypatch.setattr(pipeline, "safe_fetch", _fetch(_rss(*fresh)))
    pipeline.ingest_source(db, src)
    shown = db.execute(recent).scalars().all()
    assert [i.title for i in shown] == ["Third report"]
    members = db.execute(select(Item).where(Item.cluster_id == shown[0].cluster_id)).scalars()
    assert len(members.all()) == 3


def test_report_group_takes_precedence_over_title_match(clean_db, monkeypatch):
    db = clean_db
    official = _source(db, name="Official", tier=1, pattern=None)
    reports = _source(db, name="Reports", tier=2)
    when = "Mon, 23 Nov 2026 10:00:00 GMT"
    title = "Agency confirms network outage caused by a faulty software patch"
    monkeypatch.setattr(
        pipeline,
        "safe_fetch",
        _fetch(_rss((title, "Statement.", "https://agency.example.gov/statement", when))),
    )
    pipeline.ingest_source(db, official)
    monkeypatch.setattr(
        pipeline,
        "safe_fetch",
        _fetch(
            _rss(
                (
                    "Outage report one",
                    "A ... (https://incidentdatabase.ai/cite/5#1)",
                    "https://r.example.com/1",
                    when,
                ),
                (
                    title,
                    "B ... (https://incidentdatabase.ai/cite/5#2)",
                    "https://r.example.com/2",
                    when,
                ),
            )
        ),
    )
    pipeline.ingest_source(db, reports)

    rows = {i.url: i for i in db.execute(select(Item)).scalars()}
    one, two = rows["https://r.example.com/1"], rows["https://r.example.com/2"]
    # The second report joins its incident's row rather than the title-matched item.
    assert one.cluster_id is not None and two.cluster_id == one.cluster_id
    assert rows["https://agency.example.gov/statement"].cluster_id is None


def test_stored_reports_are_grouped_from_their_excerpt(clean_db):
    db = clean_db
    src = _source(db)
    now = datetime.now(UTC)
    for n, excerpt in enumerate(
        [
            "One ... (https://incidentdatabase.ai/cite/1836#8360)",
            "Two ... (https://incidentdatabase.ai/cite/1836#8361)",
            "Three ... (https://incidentdatabase.ai/cite/1836#8362)",
            "Cut before the link …",
            "Other ... (https://incidentdatabase.ai/cite/1846#8384)",
        ]
    ):
        url = f"https://s.example.com/{n}"
        db.add(
            Item(
                source_id=src.id,
                url=url,
                canonical_url=url,
                title=f"Report {n}",
                excerpt=excerpt,
                content_hash=f"h{n}",
                published_at=now - timedelta(hours=n),
                first_seen_at=now,
                last_seen_at=now,
                categories=["incident"],
                impact_score=40,
                confidence="medium",
            )
        )
    db.commit()

    assert apply_repairs(db)["group-reports-by-source-key"] == 3
    items = {i.title: i for i in db.execute(select(Item)).scalars()}
    assert len({items[f"Report {n}"].cluster_id for n in range(3)}) == 1
    assert items["Report 3"].cluster_id is None and "report_group" not in (
        items["Report 3"].raw_metadata or {}
    )
    assert (
        items["Report 4"].cluster_id is None
        and items["Report 4"].raw_metadata["report_group"] == "1846"
    )
    assert len(_cluster_rows(db)) == 3
