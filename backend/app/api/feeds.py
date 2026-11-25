"""Feeds for the local app: the same calendar and Atom feed export-static publishes."""

from fastapi import APIRouter, Depends, Request
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.db import get_db
from app.services.feeds import changes_atom, milestones_ics

router = APIRouter(prefix="/feeds", tags=["feeds"])


def _site(request: Request) -> str:
    return settings.site_url or str(request.base_url).rstrip("/")


@router.get("/milestones.ics")
def milestones_calendar(request: Request, db: Session = Depends(get_db)) -> Response:
    return Response(milestones_ics(db, _site(request)), media_type="text/calendar; charset=utf-8")


@router.get("/changes.xml")
def record_changes(request: Request, db: Session = Depends(get_db)) -> Response:
    body = changes_atom(db, _site(request), self_url=str(request.url))
    return Response(body, media_type="application/atom+xml; charset=utf-8")
