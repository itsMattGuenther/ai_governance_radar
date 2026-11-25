/** Home, the watch board (DEC-033, DESIGN_SYSTEM.md §6): the next legal dates, what
 * changed in the checked records, where every law stands, and what government sources
 * published this week. Upcoming dates come from curated milestones only. */

import { useMemo, useState } from "react";

import { ItemDetailDrawer } from "../components/items/ItemDetailDrawer";
import { ItemRow } from "../components/items/ItemRow";
import { EventChip } from "../components/ui/Badge";
import { DayCount } from "../components/ui/Chip";
import { CodeTile } from "../components/ui/CodeTile";
import { Jurisdiction } from "../components/ui/Flag";
import { Panel, PanelLink } from "../components/ui/Panel";
import { DateCell, Row } from "../components/ui/Row";
import { LawStage } from "../components/ui/StageTrack";
import { CardSkeleton, EmptyState, ErrorState } from "../components/ui/States";
import { Tile } from "../components/ui/Tile";
import { useDashboardSummary, useItems, useRegulations, useStandards } from "../lib/api";
import { absDate, parseTimestamp } from "../lib/format";
import {
  type DatedMilestone,
  SOON_DAYS,
  byStage,
  nextDates,
  nextMilestone,
  shortName,
  upcomingMilestones,
} from "../lib/records";
import { usePageTitle } from "../lib/usePageTitle";
import type { EntityEventOut, EntityOut, ItemOut } from "../lib/types";

const COLLECTED_DAYS = 7;
const CHANGES_DAYS = 30;
const DATES_SHOWN = 5;
const GOV_SHOWN = 8;

/** Code tile for a record: the jurisdiction for laws, a short publisher for standards. */
function recordCode(e: EntityOut): string {
  const publisher = e.standard?.publisher;
  if (publisher && publisher.length <= 6 && !publisher.includes(" ")) return publisher;
  return e.jurisdiction_code ?? "—";
}

const CATEGORY_NOUNS: Record<string, [string, string]> = {
  incident: ["incident report", "incident reports"],
  research: ["research item", "research items"],
  news: ["news item", "news items"],
  security: ["security item", "security items"],
  regulation: ["policy item", "policy items"],
  standard: ["standards item", "standards items"],
};

function counted(n: number, category: string): string {
  const [one, many] = CATEGORY_NOUNS[category] ?? [`${category} item`, `${category} items`];
  return `${n} ${n === 1 ? one : many}`;
}

function DateTile({ label, group, loading }: { label: string; group?: DatedMilestone[]; loading: boolean }) {
  if (!group) {
    return <Tile label={label} value="—" detail={loading ? undefined : "No date recorded"} loading={loading} />;
  }
  const { days, date } = group[0];
  const laws = [...new Map(group.map((m) => [m.entity.slug, m.entity])).values()];
  return (
    <Tile
      label={label}
      value={days === 0 ? "Today" : days}
      unit={days === 0 ? undefined : days === 1 ? "day" : "days"}
      detail={`${laws.map((e) => shortName(e.name)).join(" · ")} · ${absDate(date)}`}
      hot={days <= SOON_DAYS}
      to={laws.length === 1 ? `/entities/${laws[0].slug}` : "/regulatory"}
    />
  );
}

export default function Dashboard() {
  usePageTitle(null);
  const laws = useRegulations();
  const standards = useStandards();
  const summary = useDashboardSummary(COLLECTED_DAYS);
  const since = summary.data?.since;
  const gov = useItems(
    { since, tier: "1", include_page_changes: false, collapse_clusters: true, sort: "newest", limit: GOV_SHOWN },
    !!since,
  );
  const [openItem, setOpenItem] = useState<ItemOut | null>(null);
  const [now] = useState(() => new Date());

  const lawRows = useMemo(() => laws.data?.filter((e) => e.regulation) ?? [], [laws.data]);
  const upcoming = useMemo(() => upcomingMilestones(lawRows, now), [lawRows, now]);
  const [first, second] = nextDates(upcoming);

  const changes = useMemo(() => {
    const cutoff = now.getTime() - CHANGES_DAYS * 86_400_000;
    const records = [...lawRows, ...(standards.data ?? [])];
    return records
      .flatMap((entity) => entity.events.map((event) => ({ entity, event })))
      .filter(({ event }) => parseTimestamp(event.occurred_at).getTime() >= cutoff)
      .sort((a, b) => b.event.occurred_at.localeCompare(a.event.occurred_at) || b.event.id - a.event.id);
  }, [lawRows, standards.data, now]);
  const changedLaws = new Set(changes.filter((c) => c.entity.regulation).map((c) => c.entity.slug)).size;
  const changedStandards = new Set(changes.filter((c) => !c.entity.regulation).map((c) => c.entity.slug)).size;

  const recordsLoading = laws.isPending || standards.isPending;
  const recordsError = laws.isError ? laws : standards.isError ? standards : null;
  // The tile counts every tier, so it opens the All tab with the same window.
  const allSources = since ? `/items?${new URLSearchParams({ since, tier: "all" })}` : "/items?tier=all";
  const others = summary.data
    ? [
        ...Object.entries(summary.data.others).map(([c, n]) => counted(n, c)),
        ...(summary.data.page_changes
          ? [`${summary.data.page_changes} page-change alert${summary.data.page_changes === 1 ? "" : "s"}`]
          : []),
      ]
    : [];

  return (
    <>
      <h1 className="sr-only">Watch board: legal dates ahead and what changed in the records</h1>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_1.4fr_1fr_1fr_1fr]">
        <DateTile label="Next date" group={first} loading={laws.isPending} />
        <DateTile label="Then" group={second} loading={laws.isPending} />
        <Tile
          label={`Record changes, ${CHANGES_DAYS} days`}
          value={changes.length}
          detail={`${changedLaws} law${changedLaws === 1 ? "" : "s"} · ${changedStandards} standard${changedStandards === 1 ? "" : "s"}`}
          loading={recordsLoading}
        />
        <Tile
          label="Records tracked"
          value={lawRows.length + (standards.data?.length ?? 0)}
          detail={`${lawRows.length} laws · ${standards.data?.length ?? 0} standards`}
          loading={recordsLoading}
        />
        <Tile
          label={`Collected, ${COLLECTED_DAYS} days`}
          value={summary.data?.collected ?? "—"}
          detail={summary.data ? `${summary.data.government} from government sources` : undefined}
          to={allSources}
          loading={summary.isPending}
          className="col-span-2 md:col-span-1"
        />
      </div>

      <div className="mt-3 grid items-start gap-3 lg:grid-cols-2">
        <Panel
          title="Dates ahead"
          marker="dates"
          meta={upcoming.length ? `next ${Math.min(DATES_SHOWN, upcoming.length)} of ${upcoming.length}` : undefined}
          footer={
            upcoming.length > DATES_SHOWN ? (
              <PanelLink to="/regulatory">Every law and its next date →</PanelLink>
            ) : undefined
          }
        >
          {laws.isPending ? (
            <CardSkeleton rows={4} />
          ) : laws.isError ? (
            <ErrorState detail={String(laws.error)} onRetry={() => laws.refetch()} />
          ) : upcoming.length === 0 ? (
            <EmptyState title="No dates ahead" detail="No law in the records has a milestone after today." />
          ) : (
            upcoming.slice(0, DATES_SHOWN).map((m) => (
              <Row
                key={`${m.entity.slug}-${m.date}`}
                to={`/entities/${m.entity.slug}`}
                soon={m.days <= SOON_DAYS}
                lead={<DateCell date={m.date} alwaysYear />}
                title={shortName(m.entity.name)}
                detail={m.label}
                chip={<DayCount date={m.date} now={now} />}
              />
            ))
          )}
        </Panel>

        <Panel title="Record changes" marker="changes" meta={`last ${CHANGES_DAYS} days`}>
          {recordsLoading ? (
            <CardSkeleton rows={4} />
          ) : recordsError ? (
            <ErrorState detail={String(recordsError.error)} onRetry={() => recordsError.refetch()} />
          ) : changes.length === 0 ? (
            <EmptyState
              title={`No record changes in the last ${CHANGES_DAYS} days`}
              detail="Each law and standard keeps its full timeline on its page."
            />
          ) : (
            changes.map(({ entity, event }: { entity: EntityOut; event: EntityEventOut }) => (
              <Row
                key={`${entity.slug}-${event.id}`}
                to={`/entities/${entity.slug}`}
                leadWidth=""
                lead={
                  <span className="flex items-start gap-3">
                    <span className="w-12">
                      <DateCell date={event.occurred_at} />
                    </span>
                    <CodeTile code={recordCode(entity)} className="hidden w-16 sm:inline-block" />
                  </span>
                }
                title={shortName(entity.name)}
                detail={event.summary}
                chip={<EventChip type={event.event_type} />}
              />
            ))
          )}
        </Panel>

        <Panel title="Laws by stage" marker="laws" meta={lawRows.length || undefined}>
          {laws.isPending ? (
            <CardSkeleton rows={6} />
          ) : laws.isError ? (
            <ErrorState detail={String(laws.error)} onRetry={() => laws.refetch()} />
          ) : lawRows.length === 0 ? (
            <EmptyState title="No laws tracked" />
          ) : (
            byStage(lawRows).map((e) => {
              const reg = e.regulation!;
              const next = nextMilestone(e, now);
              const successor = reg.superseded_by && lawRows.find((l) => l.slug === reg.superseded_by);
              const detail = successor
                ? `Replaced by ${shortName(successor.name)}`
                : next
                  ? `Next date ${absDate(next.date)} · ${next.days === 0 ? "today" : `${next.days} day${next.days === 1 ? "" : "s"}`}`
                  : reg.status_label;
              return (
                <Row
                  key={e.slug}
                  to={`/entities/${e.slug}`}
                  soon={!!next && next.days <= SOON_DAYS}
                  leadWidth="w-[4.75rem]"
                  lead={<Jurisdiction code={e.jurisdiction_code} />}
                  title={e.name}
                  detail={detail}
                  chip={<LawStage regulation={reg} track />}
                  chipBelowOnPhone
                />
              );
            })
          )}
        </Panel>

        <Panel
          title="From government sources"
          marker="feed"
          meta={`last ${COLLECTED_DAYS} days`}
          footer={
            summary.data && (
              <>
                {summary.data.government > GOV_SHOWN && `Showing ${GOV_SHOWN} of ${summary.data.government}. `}
                {others.length > 0 && `Also collected: ${others.join(" · ")}. `}
                <PanelLink to={allSources}>Open All sources →</PanelLink>
              </>
            )
          }
        >
          {summary.isPending || (gov.isPending && !!since) ? (
            <CardSkeleton rows={3} />
          ) : summary.isError ? (
            <ErrorState detail={String(summary.error)} onRetry={() => summary.refetch()} />
          ) : gov.isError ? (
            <ErrorState detail={String(gov.error)} onRetry={() => gov.refetch()} />
          ) : !gov.data || gov.data.items.length === 0 ? (
            <EmptyState
              title={`Nothing from government sources in the last ${COLLECTED_DAYS} days`}
              detail="Governments, regulators and standards bodies (tier 1 sources)."
            />
          ) : (
            gov.data.items.map((item) => (
              <ItemRow key={item.id} item={item} onOpen={setOpenItem} showDetail={false} />
            ))
          )}
        </Panel>
      </div>

      <ItemDetailDrawer item={openItem} onClose={() => setOpenItem(null)} />
    </>
  );
}
