/** Incidents: the curated write-ups first (the original analysis), then reports from
 * incident databases, one row per incident with its reports a click away. */

import { useId, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronDown, ExternalLink } from "lucide-react";
import clsx from "clsx";

import { ItemDetailDrawer } from "../components/items/ItemDetailDrawer";
import { itemDate } from "../components/items/ItemRow";
import { PageHeader } from "../components/layout/PageHeader";
import { DemoBadge, SeverityBadge } from "../components/ui/Badge";
import { InfoTip } from "../components/ui/InfoTip";
import { Panel, PanelLink } from "../components/ui/Panel";
import { DateCell, Row } from "../components/ui/Row";
import { CardSkeleton, EmptyState, ErrorState } from "../components/ui/States";
import { useClusterMembers, useIncidents, useItems } from "../lib/api";
import { CONFIDENCE_EXPLAINER, FACT_STATUS_DEFS, SEVERITY_DEFS } from "../lib/definitions";
import { STATIC_MODE } from "../lib/env";
import { absDate, categoryLabel, titleCase } from "../lib/format";
import type { IncidentOut, ItemOut } from "../lib/types";

const SEVERITIES = ["critical", "high", "medium", "low"];
const CATEGORIES = [
  "prompt_injection", "data_leakage", "bias_discrimination", "deepfake_abuse",
  "hallucination_harm", "excessive_agency", "agent_failure", "model_theft",
  "data_poisoning", "ai_cyberattack", "privacy", "other",
];
const REPORTS_SHOWN = 10;

function RatingsHelp() {
  return (
    <InfoTip
      align="right"
      content={
        <span className="space-y-1.5">
          <span className="block font-medium text-tx-primary">How severity is assigned</span>
          {SEVERITIES.map((s) => (
            <span key={s} className="block">
              <span className="font-semibold capitalize text-tx-primary">{s}:</span>{" "}
              {SEVERITY_DEFS[s].replace(/^[A-Z][a-z]+ — /, "")}
            </span>
          ))}
          <span className="block pt-1 text-tx-muted">{CONFIDENCE_EXPLAINER}</span>
        </span>
      }
    >
      <span className="cursor-help text-xs text-tx-secondary underline decoration-dotted underline-offset-2 hover:text-tx-primary">
        What do these ratings mean?
      </span>
    </InfoTip>
  );
}

/** Fact status as a word: quiet unless it warns (alleged, disputed). */
function FactStatus({ status }: { status: string }) {
  const warns = status === "alleged" || status === "disputed";
  return (
    <span title={FACT_STATUS_DEFS[status]} className={clsx(warns ? "font-medium text-sev-high" : "text-tx-secondary")}>
      {warns && <span aria-hidden>▲ </span>}
      {titleCase(status)}
    </span>
  );
}

/** "When it happened", or when it was reported if that is all the record has. */
function incidentDate(inc: IncidentOut): { date: string; reported: boolean } {
  return inc.occurred_at ? { date: inc.occurred_at, reported: false } : { date: inc.reported_at, reported: true };
}

function ReportRow({ item, onOpen }: { item: ItemOut; onOpen: (item: ItemOut) => void }) {
  const [open, setOpen] = useState(false);
  const members = useClusterMembers(open ? item.id : null);
  const listId = useId();
  return (
    <li className="border-b border-bd-subtle last:border-b-0">
      <div className="flex items-start gap-3 px-3.5 py-2.5">
        <span className="w-12 shrink-0 pt-px">
          <DateCell date={itemDate(item)} />
        </span>
        <span className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpen(item)}
            className="block text-left text-row font-medium text-tx-primary hover:text-accent"
          >
            {item.title}
          </button>
          <span className="mt-0.5 block text-detail text-tx-secondary">
            {[item.source_name, item.categories[0] ? categoryLabel(item.categories[0]) : null].filter(Boolean).join(" · ")}
          </span>
        </span>
        {item.is_demo ? (
          <DemoBadge show />
        ) : (
          item.cluster_size > 1 && (
            <button
              type="button"
              aria-expanded={open}
              aria-controls={listId}
              onClick={() => setOpen(!open)}
              className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-ctl border border-bd-subtle px-[7px] py-1 text-meta font-medium leading-none text-tx-secondary hover:border-bd-strong hover:text-tx-primary"
            >
              {item.cluster_size} reports
              <ChevronDown aria-hidden className={clsx("h-3 w-3 transition-transform", open && "rotate-180")} />
            </button>
          )
        )}
      </div>
      {open && (
        <div id={listId} className="border-t border-bd-subtle bg-bg-base/40 py-1 pl-[4.75rem] pr-3.5">
          {members.isPending ? (
            <CardSkeleton rows={2} />
          ) : members.isError ? (
            <ErrorState detail={String(members.error)} onRetry={() => members.refetch()} />
          ) : (
            <ul>
              {[...(members.data ?? [])]
                .sort((a, b) => itemDate(b).localeCompare(itemDate(a)))
                .map((m) => (
                  <li key={m.id} className="flex gap-3 py-1.5 text-detail">
                    <span className="num w-24 shrink-0 whitespace-nowrap text-tx-muted">{absDate(itemDate(m))}</span>
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 text-tx-secondary hover:text-accent"
                    >
                      {m.title} <ExternalLink aria-hidden className="inline h-3 w-3" />
                    </a>
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}

export default function Incidents() {
  const [params, setParams] = useSearchParams();
  const [openItem, setOpenItem] = useState<ItemOut | null>(null);

  const severity = params.get("severity") ?? "";
  const category = params.get("category") ?? "";
  const sort = (params.get("sort") ?? "newest") as "newest" | "severity";

  const incidents = useIncidents({ severity: severity || undefined, category: category || undefined, sort });
  // "Newest first" follows the date each row shows (when it happened, else reported).
  const curated =
    sort === "newest" && incidents.data
      ? [...incidents.data].sort((a, b) => incidentDate(b).date.localeCompare(incidentDate(a).date))
      : incidents.data;
  const reports = useItems({ category: "incident", sort: "newest", limit: REPORTS_SHOWN, collapse_clusters: true });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader
        title="Incidents"
        detail="Curated write-ups with cited sources, then reports collected from incident databases. Fact status is always labelled."
        actions={<RatingsHelp />}
      />

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Sort
          <select value={sort} onChange={(e) => setFilter("sort", e.target.value)} className="control">
            <option value="newest">Newest first</option>
            <option value="severity">Most severe first</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Severity
          <select value={severity} onChange={(e) => setFilter("severity", e.target.value)} className="control">
            <option value="">All</option>
            {SEVERITIES.map((s) => (
              <option key={s} value={s}>
                {titleCase(s)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Category
          <select value={category} onChange={(e) => setFilter("category", e.target.value)} className="control">
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {titleCase(c)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <Panel title="Curated write-ups" marker="incidents" meta={incidents.data?.length} className="mb-3">
        {incidents.isPending ? (
          <CardSkeleton rows={5} />
        ) : incidents.isError ? (
          <ErrorState detail={String(incidents.error)} onRetry={() => incidents.refetch()} />
        ) : incidents.data.length === 0 ? (
          <EmptyState
            title="No incidents match these filters"
            action={
              <button onClick={() => setParams({}, { replace: true })} className="text-xs text-accent hover:underline">
                Clear filters
              </button>
            }
          />
        ) : (
          <>
            <table className="hidden w-full border-collapse text-left md:table">
              <thead>
                <tr className="border-b border-bd-subtle bg-bg-raised">
                  {["Date", "Incident", "Severity", "Fact status"].map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap px-3.5 py-2 text-xs font-semibold text-tx-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {curated!.map((inc) => {
                  const when = incidentDate(inc);
                  return (
                    <tr key={inc.id} className="border-b border-bd-subtle align-top last:border-b-0 hover:bg-bg-raised">
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-detail">
                        <span className="num text-tx-primary">{absDate(when.date)}</span>
                        {when.reported && <span className="block text-meta text-tx-muted">reported</span>}
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Link to={`/incidents/${inc.id}`} className="text-row font-medium text-tx-primary hover:text-accent">
                          {inc.title}
                        </Link>
                        <DemoBadge show={inc.is_demo} />
                        <p className="mt-0.5 line-clamp-2 text-detail text-tx-secondary">{inc.what_happened}</p>
                        <p className="mt-0.5 text-meta text-tx-muted">
                          {[titleCase(inc.category), inc.system_vendor, inc.geography].filter(Boolean).join(" · ")}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <SeverityBadge severity={inc.severity} />
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-detail">
                        <FactStatus status={inc.fact_status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="md:hidden">
              {curated!.map((inc) => {
                const when = incidentDate(inc);
                return (
                  <Row
                    key={inc.id}
                    to={`/incidents/${inc.id}`}
                    lead={<DateCell date={when.date} alwaysYear />}
                    leadWidth="w-12"
                    title={inc.title}
                    detail={
                      <>
                        {titleCase(inc.category)} · <FactStatus status={inc.fact_status} />
                        {when.reported && " · date reported"}
                      </>
                    }
                    chip={<SeverityBadge severity={inc.severity} />}
                    chipBelowOnPhone
                  />
                );
              })}
            </div>
          </>
        )}
      </Panel>

      <Panel
        title="Reports from incident databases"
        marker="feed"
        meta={reports.data ? `${reports.data.items.length} of ${reports.data.total}` : undefined}
        action={<PanelLink to="/items?tier=2&category=incident">All reports →</PanelLink>}
      >
        {reports.isPending ? (
          <CardSkeleton rows={3} />
        ) : reports.isError ? (
          <ErrorState detail={String(reports.error)} onRetry={() => reports.refetch()} />
        ) : reports.data.items.length === 0 ? (
          <EmptyState
            title="No incident reports collected yet"
            detail={STATIC_MODE ? "Nothing collected recently." : "Enable the AI Incident Database source in Settings, then run ingestion."}
          />
        ) : (
          <ul>
            {reports.data.items.map((item) => (
              <ReportRow key={item.id} item={item} onOpen={setOpenItem} />
            ))}
          </ul>
        )}
      </Panel>

      <ItemDetailDrawer item={openItem} onClose={() => setOpenItem(null)} />
    </>
  );
}
