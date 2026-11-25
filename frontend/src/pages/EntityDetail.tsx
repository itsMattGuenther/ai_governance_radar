/** Record page: a law or standard as curated, with its credentials (when it was
 * checked, the official source) beside the title, its milestones under it, its
 * timeline, and any collected items that mention it. */

import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ExternalLink, Link2 } from "lucide-react";
import clsx from "clsx";

import { ItemDetailDrawer } from "../components/items/ItemDetailDrawer";
import { ItemRow } from "../components/items/ItemRow";
import { ConfidenceBadge, DemoBadge, EventChip, StatusPill } from "../components/ui/Badge";
import { Chip, DayCount } from "../components/ui/Chip";
import { Jurisdiction } from "../components/ui/Flag";
import { Panel } from "../components/ui/Panel";
import { DateCell } from "../components/ui/Row";
import { LawStage } from "../components/ui/StageTrack";
import { CardSkeleton, EmptyState, ErrorState } from "../components/ui/States";
import { useEntity, useItems, useRegulations } from "../lib/api";
import { absDate, daysUntil, titleCase, verificationAgeDays } from "../lib/format";
import { REVERIFY_DAYS, SOON_DAYS, shortName } from "../lib/records";
import { usePageTitle } from "../lib/usePageTitle";
import type { ItemOut, Milestone } from "../lib/types";

function CopyLink() {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setState("copied");
    } catch {
      setState("failed");
    }
    window.setTimeout(() => setState("idle"), 2500);
  };
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex items-center gap-1.5 rounded-ctl border border-bd-subtle px-2 py-1 text-xs text-tx-secondary hover:border-bd-strong hover:text-tx-primary"
      >
        {state === "copied" ? <Check aria-hidden className="h-3.5 w-3.5" /> : <Link2 aria-hidden className="h-3.5 w-3.5" />}
        {state === "copied" ? "Copied" : "Copy link"}
      </button>
      <span role="status" className="text-xs text-tx-muted">
        {state === "failed" && "Copy the address from your browser's address bar."}
      </span>
    </span>
  );
}

/** Milestones in date order with a marker for today: past dates muted, close ones
 * amber, later ones quiet. A row on phones, a strip from tablet width up. */
function MilestoneStrip({ milestones }: { milestones: Milestone[] }) {
  const [now] = useState(() => new Date());
  const today = now.toISOString().slice(0, 10);
  const cells: ({ type: "milestone"; m: Milestone; days: number } | { type: "today" })[] = [];
  let placed = false;
  for (const m of milestones) {
    if (!placed && m.date > today) {
      cells.push({ type: "today" });
      placed = true;
    }
    cells.push({ type: "milestone", m, days: daysUntil(m.date, now) });
  }
  if (!placed) cells.push({ type: "today" });

  return (
    <ol
      aria-label="Milestones"
      className="mt-4 grid gap-px overflow-hidden rounded-panel border border-bd-subtle bg-bd-subtle md:auto-cols-[minmax(132px,1fr)] md:grid-flow-col md:overflow-x-auto"
    >
      {cells.map((c) =>
        c.type === "today" ? (
          <li key="today" className="border-l-2 border-accent bg-bg-raised px-3 py-2 md:border-l-0 md:border-t-2">
            <span className="num block text-xs font-medium uppercase text-accent">Today</span>
            <span className="num block text-meta text-tx-secondary">{absDate(today)}</span>
          </li>
        ) : (
          <li
            key={c.m.date}
            className={clsx(
              "bg-bg-surface px-3 py-2 md:border-t-2",
              "border-l-2 md:border-l-0",
              c.days < 0 ? "border-bd-strong" : c.days <= SOON_DAYS ? "border-sev-watch" : "border-tx-muted",
            )}
          >
            <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span
                className={clsx(
                  "num whitespace-nowrap text-xs font-medium",
                  c.days < 0 ? "text-tx-muted" : "text-tx-primary",
                )}
              >
                {absDate(c.m.date)}
              </span>
              {c.days < 0 ? <span className="text-meta text-tx-muted">Past</span> : <DayCount date={c.m.date} now={now} />}
            </span>
            <span className={clsx("mt-1 block text-detail", c.days < 0 ? "text-tx-muted" : "text-tx-secondary")}>
              {c.m.label}
            </span>
          </li>
        ),
      )}
    </ol>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-bd-subtle py-1.5 last:border-b-0">
      <dt className="text-tx-muted">{label}</dt>
      <dd className="text-right text-tx-secondary">{value}</dd>
    </div>
  );
}

function SideText({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <div className="border-t border-bd-subtle px-3.5 py-3">
      <h3 className="text-xs font-semibold text-tx-secondary">{label}</h3>
      <p className="mt-1 text-detail text-tx-secondary">{text}</p>
    </div>
  );
}

export default function EntityDetail() {
  const { slug } = useParams();
  const entity = useEntity(slug);
  const laws = useRegulations();
  const items = useItems({ entity_id: entity.data?.id, limit: 10, sort: "first_seen" }, !!entity.data);
  const [openItem, setOpenItem] = useState<ItemOut | null>(null);
  usePageTitle(entity.data ? entity.data.name : undefined);

  if (entity.isPending)
    return (
      <div className="card">
        <CardSkeleton rows={6} />
      </div>
    );
  if (entity.isError)
    return (
      <div className="card">
        <ErrorState title="Record not found" detail={String(entity.error)} onRetry={() => entity.refetch()} />
      </div>
    );

  const e = entity.data;
  const reg = e.regulation;
  const std = e.standard;
  const source = reg?.official_source_url ?? std?.official_source_url ?? e.official_url;
  const age = reg ? verificationAgeDays(reg.last_verified_at) : null;
  const successor = reg?.superseded_by ? laws.data?.find((l) => l.slug === reg.superseded_by) : undefined;
  const replaces = laws.data?.filter((l) => l.regulation?.superseded_by === e.slug) ?? [];
  const related = items.data?.items ?? [];

  return (
    <>
      <Link
        to={reg ? "/regulatory" : "/standards"}
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-tx-secondary hover:text-tx-primary"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> {reg ? "Laws" : "Standards"}
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0 max-w-3xl">
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-tx-secondary">
            <Jurisdiction code={e.jurisdiction_code} />
            <span>{std ? std.publisher : titleCase(e.entity_type)}</span>
          </p>
          <h1 className="mt-1.5 text-xl font-semibold text-tx-primary">{e.name}</h1>
          {e.description && <p className="mt-1 text-base text-tx-secondary">{e.description}</p>}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {reg && <LawStage regulation={reg} />}
            {std && <StatusPill status={std.status} kind="standard" />}
            <DemoBadge show={e.is_demo} />
            {e.needs_review && (
              <Chip tone="high" title="A linked source changed; this record is due a check.">
                Needs review
              </Chip>
            )}
          </div>
          {successor && (
            <p className="mt-2 text-detail text-tx-secondary">
              Replaced by{" "}
              <Link to={`/entities/${successor.slug}`} className="text-accent hover:underline">
                {successor.name}
              </Link>
              .
            </p>
          )}
          {replaces.map((old) => (
            <p key={old.slug} className="mt-2 text-detail text-tx-secondary">
              Replaces{" "}
              <Link to={`/entities/${old.slug}`} className="text-accent hover:underline">
                {old.name}
              </Link>
              .
            </p>
          ))}
        </div>

        <div className="flex flex-col gap-2 text-xs sm:items-end">
          {reg && (
            <p className={clsx("num", age !== null && age > REVERIFY_DAYS ? "text-sev-high" : "text-tx-secondary")}>
              Checked {absDate(reg.last_verified_at)}
              {age !== null && age > REVERIFY_DAYS && " · may be out of date"}
            </p>
          )}
          {reg && reg.confidence !== "high" && (
            <ConfidenceBadge confidence={reg.confidence} notes={reg.confidence_notes} />
          )}
          <span className="flex flex-wrap items-center gap-3">
            {source && (
              <a
                href={source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                Official source <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            )}
            <CopyLink />
          </span>
        </div>
      </div>

      {reg && reg.milestones.length > 0 && <MilestoneStrip milestones={reg.milestones} />}

      <div className="mt-4 grid items-start gap-3 lg:grid-cols-3">
        <div className="grid gap-3 lg:col-span-2">
          <Panel title="Timeline: what changed" marker="changes" meta={e.events.length || undefined}>
            {e.events.length === 0 ? (
              <EmptyState title="No recorded changes yet" />
            ) : (
              <ol>
                {e.events.map((ev) => (
                  <li key={ev.id} className="flex gap-3 border-b border-bd-subtle px-3.5 py-2.5 last:border-b-0">
                    <span className="w-12 shrink-0 pt-px">
                      <DateCell date={ev.occurred_at} alwaysYear />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-detail text-tx-secondary">{ev.summary}</span>
                      {ev.previous_value && ev.new_value && (
                        <span className="num mt-0.5 block text-meta text-tx-muted">
                          {ev.previous_value} → {ev.new_value}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0">
                      <EventChip type={ev.event_type} />
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </Panel>

          {related.length > 0 && (
            <Panel title="Collected items that mention it" marker="feed" meta={related.length}>
              {related.map((item) => (
                <ItemRow key={item.id} item={item} onOpen={setOpenItem} />
              ))}
            </Panel>
          )}
        </div>

        <aside className="grid gap-3">
          {reg && (
            <Panel title="The record" marker="laws" headingLevel={2}>
              <dl className="px-3.5 py-2 text-detail">
                <Field label="Government level" value={titleCase(reg.government_level)} />
                <Field label="Status" value={reg.status_label ?? titleCase(reg.status)} />
                <Field label="Introduced" value={absDate(reg.introduced_at)} />
                <Field label="Passed" value={absDate(reg.passed_at)} />
                <Field label="Signed" value={absDate(reg.signed_at)} />
                <Field label="Effective" value={absDate(reg.effective_at)} />
                <Field label="Compliance deadline" value={absDate(reg.compliance_deadline)} />
                <Field label="Last amended" value={absDate(reg.last_amended_at)} />
                <Field label="Enforcement" value={reg.enforcement_authority ?? "—"} />
              </dl>
              <SideText label="Penalties" text={reg.penalties} />
              <SideText label="Covered entities" text={reg.covered_entities} />
              <SideText label="Notes" text={reg.applicability_notes} />
              {reg.confidence_notes.length > 0 && (
                <div className="border-t border-bd-subtle px-3.5 py-3 text-detail text-sev-high">
                  {reg.confidence_notes.map((note) => (
                    <p key={note}>
                      Confidence lowered from {reg.curated_confidence}: {note}
                    </p>
                  ))}
                </div>
              )}
            </Panel>
          )}

          {std && (
            <Panel title="The record" marker="standards">
              <dl className="px-3.5 py-2 text-detail">
                <Field label="Publisher" value={std.publisher} />
                <Field label="Version" value={std.version ?? "—"} />
                <Field label="Status" value={titleCase(std.status)} />
                <Field label="Published" value={absDate(std.published_at)} />
                <Field label="Last updated" value={absDate(std.last_updated_at)} />
              </dl>
              {std.related_framework_slugs.length > 0 && (
                <div className="border-t border-bd-subtle px-3.5 py-3">
                  <h3 className="text-xs font-semibold text-tx-secondary">Related frameworks</h3>
                  <ul className="mt-1 space-y-0.5">
                    {std.related_framework_slugs.map((s) => (
                      <li key={s}>
                        <Link to={`/entities/${s}`} className="text-detail text-accent hover:underline">
                          {shortName(s.replace(/-/g, " ").toUpperCase())}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          )}
        </aside>
      </div>

      <ItemDetailDrawer item={openItem} onClose={() => setOpenItem(null)} />
    </>
  );
}
