/** Laws: every curated law, soonest date first, with where it stands, its next
 * milestone, its latest change and when it was checked. A map of coverage above,
 * a timeline view of every recorded change beside. */

import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import clsx from "clsx";

import { PageHeader } from "../components/layout/PageHeader";
import { CoverageMap } from "../components/map/WorldMap";
import { DemoBadge, EventChip } from "../components/ui/Badge";
import { CodeTile } from "../components/ui/CodeTile";
import { Jurisdiction } from "../components/ui/Flag";
import { Panel } from "../components/ui/Panel";
import { DateCell, Row } from "../components/ui/Row";
import { LawStage } from "../components/ui/StageTrack";
import { CardSkeleton, EmptyState, ErrorState } from "../components/ui/States";
import { useJurisdictions, useMapData, useRegulations } from "../lib/api";
import { absDate, titleCase } from "../lib/format";
import { type DatedMilestone, SOON_DAYS, latestChange, nextMilestone, shortName } from "../lib/records";
import { lawStage } from "../lib/stages";
import type { EntityOut, MapRow } from "../lib/types";

const STATUSES = ["proposed", "introduced", "passed", "signed", "effective", "enforcement", "amended"];

interface LawRow {
  entity: EntityOut;
  next: DatedMilestone | null;
  changed: string | null;
  /** Superseded laws shown under this one. */
  replaces: EntityOut[];
}

/** Soonest next date first, then the most recent change; superseded laws nest under
 * their successor when it is listed. */
function orderLaws(laws: EntityOut[], now: Date): LawRow[] {
  const slugs = new Set(laws.map((e) => e.slug));
  const nested = (e: EntityOut) => !!e.regulation?.superseded_by && slugs.has(e.regulation.superseded_by);
  return laws
    .filter((e) => !nested(e))
    .map((entity) => ({
      entity,
      next: nextMilestone(entity, now),
      changed: latestChange(entity),
      replaces: laws.filter((o) => o.regulation?.superseded_by === entity.slug),
    }))
    .sort(
      (a, b) =>
        (a.next?.date ?? "9999").localeCompare(b.next?.date ?? "9999") ||
        (b.changed ?? "").localeCompare(a.changed ?? "") ||
        a.entity.name.localeCompare(b.entity.name),
    );
}

/** Next date and its day count: amber within 60 days. Stacked in the table cell,
 * inline in a phone row. */
function NextDate({ next, inline = false }: { next: DatedMilestone | null; inline?: boolean }) {
  if (!next) return <span className="text-tx-muted">None recorded</span>;
  const soon = next.days <= SOON_DAYS;
  const count = next.days === 0 ? "today" : `${next.days} day${next.days === 1 ? "" : "s"}`;
  return (
    <span title={next.label}>
      <span className="num whitespace-nowrap text-tx-primary">{absDate(next.date)}</span>
      {inline && " · "}
      <span
        className={clsx(
          "num whitespace-nowrap",
          !inline && "block",
          soon ? "font-medium text-sev-watch" : "text-tx-muted",
        )}
      >
        {count}
      </span>
    </span>
  );
}

/** Confidence only when it is below high; otherwise the date the record was checked. */
function Checked({ entity }: { entity: EntityOut }) {
  const r = entity.regulation!;
  if (r.confidence === "high") return <span className="num text-tx-secondary">{absDate(r.last_verified_at)}</span>;
  const why = r.confidence_notes.length
    ? `Lowered from ${r.curated_confidence}: ${r.confidence_notes.join(" ")}`
    : `Curated confidence: ${r.confidence}`;
  return (
    <span title={why}>
      <span className="font-medium text-sev-high">
        <span aria-hidden>▲ </span>
        {titleCase(r.confidence)} confidence
      </span>
      <span className="num block text-meta text-tx-muted">checked {absDate(r.last_verified_at)}</span>
    </span>
  );
}

function LawTable({ rows }: { rows: LawRow[] }) {
  return (
    <table className="w-full border-collapse text-left">
      <thead>
        <tr className="border-b border-bd-subtle bg-bg-raised">
          {["Jurisdiction", "Law", "Stage", "Next date", "Last change", "Checked"].map((h) => (
            <th key={h} scope="col" className="whitespace-nowrap px-3.5 py-2 text-xs font-semibold text-tx-secondary">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.flatMap(({ entity: e, next, changed, replaces }) => [
          <tr
            key={e.slug}
            className={clsx(
              "border-b border-bd-subtle align-top last:border-b-0 hover:bg-bg-raised",
              next && next.days <= SOON_DAYS && "bg-sev-watch/[.06]",
            )}
          >
            <td className="whitespace-nowrap px-3.5 py-2.5">
              <Jurisdiction code={e.jurisdiction_code} />
            </td>
            <td className="px-3.5 py-2.5">
              <Link to={`/entities/${e.slug}`} className="text-row font-medium text-tx-primary hover:text-accent">
                {e.name}
              </Link>
              <DemoBadge show={e.is_demo} />
              <p className="mt-0.5 text-detail text-tx-secondary">
                {next ? next.label : (e.regulation!.status_label ?? titleCase(e.regulation!.government_level))}
              </p>
            </td>
            <td className="whitespace-nowrap px-3.5 py-2.5">
              <LawStage regulation={e.regulation!} />
            </td>
            <td className="px-3.5 py-2.5 text-detail">
              <NextDate next={next} />
            </td>
            <td className="num whitespace-nowrap px-3.5 py-2.5 text-detail text-tx-secondary">{absDate(changed)}</td>
            <td className="whitespace-nowrap px-3.5 py-2.5 text-detail">
              <Checked entity={e} />
            </td>
          </tr>,
          ...replaces.map((old) => (
            <tr key={old.slug} className="border-b border-bd-subtle align-top last:border-b-0 hover:bg-bg-raised">
              <td className="px-3.5 py-2" />
              <td className="px-3.5 py-2" colSpan={1}>
                <span className="flex gap-2">
                  <span aria-hidden className="text-tx-muted">↳</span>
                  <span>
                    <Link to={`/entities/${old.slug}`} className="text-row font-medium text-tx-secondary hover:text-accent">
                      {old.name}
                    </Link>
                    <span className="block text-detail text-tx-muted">Replaced by {shortName(e.name)}</span>
                  </span>
                </span>
              </td>
              <td className="whitespace-nowrap px-3.5 py-2">
                <LawStage regulation={old.regulation!} />
              </td>
              <td className="px-3.5 py-2 text-detail text-tx-muted">—</td>
              <td className="num whitespace-nowrap px-3.5 py-2 text-detail text-tx-secondary">
                {absDate(latestChange(old))}
              </td>
              <td className="whitespace-nowrap px-3.5 py-2 text-detail">
                <Checked entity={old} />
              </td>
            </tr>
          )),
        ])}
      </tbody>
    </table>
  );
}

function LawList({ rows }: { rows: LawRow[] }) {
  return (
    <div>
      {rows.flatMap(({ entity: e, next, replaces }) => [
        <Row
          key={e.slug}
          to={`/entities/${e.slug}`}
          soon={!!next && next.days <= SOON_DAYS}
          leadWidth="w-[4.75rem]"
          lead={<Jurisdiction code={e.jurisdiction_code} />}
          title={e.name}
          detail={
            next ? (
              <>
                Next date <NextDate next={next} inline />
              </>
            ) : (
              "No date ahead recorded"
            )
          }
          chip={<LawStage regulation={e.regulation!} />}
          chipBelowOnPhone
        />,
        ...replaces.map((old) => (
          <Row
            key={old.slug}
            to={`/entities/${old.slug}`}
            leadWidth="w-[4.75rem]"
            lead={<span aria-hidden className="block pl-2 text-tx-muted">↳</span>}
            title={old.name}
            detail={`Replaced by ${shortName(e.name)}`}
            chip={<LawStage regulation={old.regulation!} />}
            chipBelowOnPhone
          />
        )),
      ])}
    </div>
  );
}

export default function Regulations() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const view = params.get("view") === "timeline" ? "timeline" : "table";
  const country = params.get("country") ?? "";
  const status = params.get("status") ?? "";
  const regs = useRegulations({ country: country || undefined, status: status || undefined });
  const jurisdictions = useJurisdictions();
  const map = useMapData();
  const [now] = useState(() => new Date());

  const countries = useMemo(() => {
    const set = new Set<string>();
    jurisdictions.data?.forEach((j) => {
      if (j.kind === "country" || j.kind === "supranational") set.add(j.code);
    });
    return [...set].sort();
  }, [jurisdictions.data]);

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const rows = useMemo(() => orderLaws(regs.data ?? [], now), [regs.data, now]);
  const timeline = useMemo(
    () =>
      (regs.data ?? [])
        .flatMap((e) => e.events.map((ev) => ({ entity: e, event: ev })))
        .sort((a, b) => b.event.occurred_at.localeCompare(a.event.occurred_at)),
    [regs.data],
  );

  /** A country with laws filters this table; one with only frameworks opens Standards. */
  const selectCountry = (row: MapRow) => {
    if (row.binding > 0) setFilter("country", row.link_code);
    else navigate(`/standards?country=${row.link_code}`);
  };

  const filtered = !!country || !!status;

  return (
    <>
      <PageHeader
        title="Laws"
        detail="Curated records checked against official sources, soonest date first. Never written by ingestion."
        actions={
          <div className="flex rounded-ctl border border-bd-subtle" role="group" aria-label="View">
            {(["table", "timeline"] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={view === v}
                onClick={() => setFilter("view", v === "table" ? "" : v)}
                className={clsx(
                  "px-3 py-1 text-sm capitalize",
                  view === v ? "bg-bg-raised font-semibold text-tx-primary" : "text-tx-secondary hover:text-tx-primary",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        }
      />

      <Panel title="Coverage" marker="laws" meta="tracked records by country" className="mb-3">
        <div className="px-3.5 py-3">
          {map.isPending ? (
            <CardSkeleton rows={2} />
          ) : map.isError ? (
            <ErrorState detail={String(map.error)} onRetry={() => map.refetch()} />
          ) : (
            <CoverageMap rows={map.data} onSelect={selectCountry} />
          )}
        </div>
      </Panel>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Jurisdiction
          <select value={country} onChange={(e) => setFilter("country", e.target.value)} className="control">
            <option value="">All</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {jurisdictions.data?.find((j) => j.code === c)?.name ?? c}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Stage
          <select value={status} onChange={(e) => setFilter("status", e.target.value)} className="control">
            <option value="">All</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {lawStage({ status: s, superseded_by: null }).label}
              </option>
            ))}
          </select>
        </label>
        {filtered && (
          <button
            type="button"
            onClick={() => setParams(view === "timeline" ? { view } : {}, { replace: true })}
            className="text-xs text-accent hover:underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {regs.isPending ? (
        <div className="card">
          <CardSkeleton rows={6} />
        </div>
      ) : regs.isError ? (
        <div className="card">
          <ErrorState detail={String(regs.error)} onRetry={() => regs.refetch()} />
        </div>
      ) : regs.data.length === 0 ? (
        <div className="card">
          <EmptyState
            title="No laws match these filters"
            detail="No tracked law has this jurisdiction and stage."
            action={
              <button onClick={() => setParams({}, { replace: true })} className="text-xs text-accent hover:underline">
                Clear filters
              </button>
            }
          />
        </div>
      ) : view === "table" ? (
        <Panel title="Laws" marker="laws" meta={`${regs.data.length}`}>
          <div className="hidden md:block">
            <LawTable rows={rows} />
          </div>
          <div className="md:hidden">
            <LawList rows={rows} />
          </div>
        </Panel>
      ) : (
        <Panel title="Every recorded change" marker="changes" meta={`${timeline.length}`}>
          {timeline.length === 0 ? (
            <EmptyState title="No recorded changes" />
          ) : (
            timeline.map(({ entity, event }) => (
              <Row
                key={`${entity.slug}-${event.id}`}
                to={`/entities/${entity.slug}`}
                leadWidth=""
                lead={
                  <span className="flex items-start gap-3">
                    <span className="w-12">
                      <DateCell date={event.occurred_at} alwaysYear />
                    </span>
                    <CodeTile code={entity.jurisdiction_code ?? "—"} className="hidden w-16 sm:inline-block" />
                  </span>
                }
                title={shortName(entity.name)}
                detail={event.summary}
                chip={<EventChip type={event.event_type} />}
                chipBelowOnPhone
              />
            ))
          )}
        </Panel>
      )}
    </>
  );
}
