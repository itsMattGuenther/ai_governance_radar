"""Subscribable feeds (DEC-033): a calendar of milestones ahead and an Atom feed of
record changes. Both read curated data only: milestones and the records' timelines.

`export-static` writes them next to the JSON snapshot; the local app serves the same
output from /api/feeds/.
"""

import re
from datetime import UTC, date, datetime
from urllib.parse import urlparse
from xml.etree import ElementTree as ET

from sqlalchemy import select
from sqlalchemy.orm import Session, joinedload

from app.models import Entity, EntityEvent, Regulation, RegulationMilestone

ATOM = "http://www.w3.org/2005/Atom"
CHANGES_CAP = 100
EVENT_LABELS = {
    "note": "Note",
    "status_change": "Status change",
    "amended": "Amended",
    "date_changed": "Date changed",
    "enforcement": "Enforcement",
    "document_updated": "Updated",
    "created": "Created",
}


def _short(name: str) -> str:
    """ "Colorado SB 26-189 (Automated Decision-Making Technology)" → "Colorado SB 26-189"."""
    return re.sub(r"\s*\([^)]*\)\s*$", "", name)


def _host(site_url: str) -> str:
    return urlparse(site_url).hostname or "ai-governance-radar"


def _day(d: date | datetime) -> str:
    return f"{d.day} {d:%b %Y}"


def milestones_ahead(db: Session, today: date) -> list[tuple[Entity, RegulationMilestone]]:
    """Milestones on or after `today`, soonest first: the dates still ahead."""
    rows = db.execute(
        select(Entity, RegulationMilestone)
        .join(Regulation, Regulation.entity_id == Entity.id)
        .join(RegulationMilestone, RegulationMilestone.entity_id == Regulation.entity_id)
        .where(Entity.is_demo.is_(False), RegulationMilestone.date >= today)
        .order_by(RegulationMilestone.date, Entity.name)
    ).all()
    return [(e, m) for e, m in rows]


def _ics_text(value: str) -> str:
    """RFC 5545 §3.3.11 TEXT escaping."""
    return value.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def _fold(line: str) -> str:
    """RFC 5545 §3.1: lines over 75 octets continue on the next line after a space,
    never splitting a UTF-8 character."""
    data = line.encode("utf-8")
    parts: list[bytes] = []
    limit = 75
    while len(data) > limit:
        cut = limit
        while cut > 0 and (data[cut] & 0xC0) == 0x80:  # inside a multi-byte character
            cut -= 1
        parts.append(data[:cut])
        data = data[cut:]
        limit = 74  # continuation lines start with a space
    parts.append(data)
    return "\r\n ".join(p.decode("utf-8") for p in parts)


def milestones_ics(db: Session, site_url: str = "", now: datetime | None = None) -> str:
    """An iCalendar file with one all-day event per milestone still ahead."""
    now = now or datetime.now(UTC)
    site = site_url.rstrip("/")
    host = _host(site)
    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//AI Governance Radar//Milestones//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:AI Governance Radar: dates ahead",
        "X-WR-CALDESC:"
        + _ics_text(
            "Dates ahead for the AI laws this site tracks, from records checked against "
            "official sources. Not legal advice."
        ),
        "REFRESH-INTERVAL;VALUE=DURATION:PT6H",
    ]
    stamp = now.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
    for entity, m in milestones_ahead(db, now.astimezone(UTC).date()):
        reg = entity.regulation
        assert reg is not None
        record = f"{site}/entities/{entity.slug}" if site else None
        description = "\n".join(
            filter(
                None,
                [
                    f"{m.label}.",
                    "",
                    entity.name,
                    f"Record: {record}" if record else None,
                    f"Official source: {reg.official_source_url}",
                    f"Record checked {_day(reg.last_verified_at)}. Not legal advice: verify "
                    "against the official source.",
                ],
            )
        )
        end = date.fromordinal(m.date.toordinal() + 1)
        lines += [
            "BEGIN:VEVENT",
            f"UID:{entity.slug}-{m.date:%Y%m%d}-{m.kind}@{host}",
            f"DTSTAMP:{stamp}",
            f"DTSTART;VALUE=DATE:{m.date:%Y%m%d}",
            f"DTEND;VALUE=DATE:{end:%Y%m%d}",
            "SUMMARY:" + _ics_text(f"{_short(entity.name)}: {m.label}"),
            "DESCRIPTION:" + _ics_text(description),
            "TRANSP:TRANSPARENT",
        ]
        if record:
            lines.append(f"URL:{record}")
        lines.append("END:VEVENT")
    lines.append("END:VCALENDAR")
    return "".join(_fold(line) + "\r\n" for line in lines)


def _iso(d: datetime) -> str:
    d = d if d.tzinfo else d.replace(tzinfo=UTC)
    return d.astimezone(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")


def changes_atom(
    db: Session, site_url: str = "", self_url: str = "", now: datetime | None = None
) -> bytes:
    """An Atom feed of record changes (law and standard timelines), newest first."""
    site = site_url.rstrip("/")
    host = _host(site)
    rows = (
        db.execute(
            select(EntityEvent)
            .join(Entity, Entity.id == EntityEvent.entity_id)
            .where(
                Entity.is_demo.is_(False),
                Entity.entity_type.in_(("regulation", "standard", "framework")),
                # Curated changes only; "linked document changed" events from ingestion
                # stay on the record's own timeline.
                EntityEvent.evidence_item_id.is_(None),
            )
            .options(joinedload(EntityEvent.entity))
            .order_by(EntityEvent.occurred_at.desc(), EntityEvent.id.desc())
            .limit(CHANGES_CAP)
        )
        .scalars()
        .all()
    )

    def el(parent: ET.Element, tag: str, text: str | None = None, **attrs: str) -> ET.Element:
        node = ET.SubElement(parent, f"{{{ATOM}}}{tag}", attrs)
        if text is not None:
            node.text = text
        return node

    ET.register_namespace("", ATOM)
    feed = ET.Element(f"{{{ATOM}}}feed")
    el(feed, "title", "AI Governance Radar: record changes")
    el(
        feed,
        "subtitle",
        "Changes recorded on the AI laws and standards this site tracks, from records "
        "checked against official sources. Not legal advice.",
    )
    el(feed, "id", f"{site}/" if site else "urn:ai-governance-radar:record-changes")
    if self_url:
        el(feed, "link", rel="self", type="application/atom+xml", href=self_url)
    if site:
        el(feed, "link", rel="alternate", type="text/html", href=f"{site}/")
    newest = rows[0].occurred_at if rows else (now or datetime.now(UTC))
    el(feed, "updated", _iso(newest))
    author = el(feed, "author")
    el(author, "name", "AI Governance Radar")

    for ev in rows:
        entity = ev.entity
        label = EVENT_LABELS.get(ev.event_type, ev.event_type.replace("_", " ").capitalize())
        entry = el(feed, "entry")
        key = f"{entity.slug}/{ev.occurred_at:%Y-%m-%d}/{ev.event_type}"  # unique per seed
        el(entry, "id", f"tag:{host},2026:{key}")
        el(entry, "title", f"{_short(entity.name)}: {label}")
        el(entry, "updated", _iso(ev.occurred_at))
        if site:
            el(
                entry,
                "link",
                rel="alternate",
                type="text/html",
                href=f"{site}/entities/{entity.slug}",
            )
        el(entry, "category", term=ev.event_type, label=label)
        text = ev.summary
        if ev.previous_value and ev.new_value:
            text += f" ({ev.previous_value} → {ev.new_value})"
        el(entry, "summary", text, type="text")
    return ET.tostring(feed, encoding="utf-8", xml_declaration=True)
