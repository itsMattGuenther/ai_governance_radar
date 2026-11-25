/** Standards and frameworks: one table of curated records, most recently updated first. */

import { Link, useSearchParams } from "react-router-dom";
import clsx from "clsx";

import { PageHeader } from "../components/layout/PageHeader";
import { DemoBadge, StatusPill } from "../components/ui/Badge";
import { CodeTile } from "../components/ui/CodeTile";
import { Panel } from "../components/ui/Panel";
import { Row } from "../components/ui/Row";
import { CardSkeleton, EmptyState, ErrorState } from "../components/ui/States";
import { useStandards } from "../lib/api";
import { absDate, titleCase } from "../lib/format";
import { shortName } from "../lib/records";
import type { EntityOut } from "../lib/types";

const TABS = ["All", "NIST", "ISO", "OWASP", "MITRE", "Other"];
const NAMED = TABS.slice(1, -1);

/** Publisher as a short code tile: "IMDA / AI Verify Foundation" → "IMDA". */
function publisherCode(publisher: string): string {
  return publisher.split(/[\s/]+/)[0].slice(0, 6).toUpperCase();
}

const updated = (e: EntityOut) => e.standard!.last_updated_at ?? e.standard!.published_at ?? "";

function UpdatedCell({ e }: { e: EntityOut }) {
  const s = e.standard!;
  if (s.last_updated_at) return <span className="num">{absDate(s.last_updated_at)}</span>;
  return (
    <span>
      <span className="num">{absDate(s.published_at)}</span>
      <span className="block text-meta text-tx-muted">published, not updated since</span>
    </span>
  );
}

export default function Standards() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("publisher") ?? "All";
  // Set when arriving from the map for a country governed by framework, not statute.
  const country = params.get("country") ?? "";
  const all = useStandards({ country: country || undefined });

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const rows = (all.data ?? [])
    .filter((e) => {
      const publisher = e.standard?.publisher ?? "";
      if (tab === "All") return true;
      if (tab === "Other") return !NAMED.includes(publisher);
      return publisher === tab;
    })
    .sort((a, b) => updated(b).localeCompare(updated(a)) || a.name.localeCompare(b.name));

  // Only the statuses that occur: no counter reads zero.
  const counts = Object.entries(
    (all.data ?? []).reduce<Record<string, number>>((acc, e) => {
      const s = e.standard?.status ?? "unknown";
      acc[s] = (acc[s] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        title="Standards"
        detail={
          all.data
            ? `${all.data.length} standards and frameworks${counts.length ? ": " : ""}${counts
                .map(([s, n]) => `${n} ${titleCase(s).toLowerCase()}`)
                .join(" · ")}. Curated records with their official sources.`
            : "Standards and national frameworks, curated with their official sources."
        }
        actions={
          country ? (
            <button
              type="button"
              onClick={() => setParam("country", "")}
              className="inline-flex items-center gap-1.5 rounded-ctl border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent"
            >
              Jurisdiction: {country}
              <span aria-hidden>×</span>
              <span className="sr-only">Clear jurisdiction filter</span>
            </button>
          ) : undefined
        }
      />

      <div role="tablist" aria-label="Publisher" className="mb-3 flex flex-wrap gap-1 border-b border-bd-subtle">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setParam("publisher", t === "All" ? "" : t)}
            className={clsx(
              "-mb-px border-b-2 px-3 py-1.5 text-sm",
              tab === t
                ? "border-accent font-semibold text-tx-primary"
                : "border-transparent text-tx-secondary hover:text-tx-primary",
            )}
          >
            {t}
          </button>
        ))}
      </div>

      {all.isPending ? (
        <div className="card">
          <CardSkeleton rows={6} />
        </div>
      ) : all.isError ? (
        <div className="card">
          <ErrorState detail={String(all.error)} onRetry={() => all.refetch()} />
        </div>
      ) : rows.length === 0 ? (
        <div className="card">
          <EmptyState title={`No ${tab === "All" ? "" : `${tab} `}standards tracked`} detail="Try another publisher." />
        </div>
      ) : (
        <Panel title="Standards and frameworks" marker="standards" meta={rows.length}>
          <table className="hidden w-full border-collapse text-left md:table">
            <thead>
              <tr className="border-b border-bd-subtle bg-bg-raised">
                {["Publisher", "Standard", "Version", "Status", "Last updated"].map((h) => (
                  <th key={h} scope="col" className="whitespace-nowrap px-3.5 py-2 text-xs font-semibold text-tx-secondary">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const s = e.standard!;
                return (
                  <tr key={e.slug} className="border-b border-bd-subtle align-top last:border-b-0 hover:bg-bg-raised">
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <CodeTile code={publisherCode(s.publisher)} title={s.publisher} className="min-w-[3.5rem]" />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <Link to={`/entities/${e.slug}`} className="text-row font-medium text-tx-primary hover:text-accent">
                        {e.name}
                      </Link>
                      <DemoBadge show={e.is_demo} />
                      <p className="mt-0.5 line-clamp-1 text-detail text-tx-secondary">{e.description}</p>
                    </td>
                    <td className="num whitespace-nowrap px-3.5 py-2.5 text-detail text-tx-secondary">
                      {s.version ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5">
                      <StatusPill status={s.status} kind="standard" />
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-detail text-tx-secondary">
                      <UpdatedCell e={e} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="md:hidden">
            {rows.map((e) => {
              const s = e.standard!;
              return (
                <Row
                  key={e.slug}
                  to={`/entities/${e.slug}`}
                  leadWidth="w-16"
                  lead={<CodeTile code={publisherCode(s.publisher)} title={s.publisher} className="w-full" />}
                  title={shortName(e.name)}
                  detail={[
                    s.version ? `Version ${s.version}` : null,
                    s.last_updated_at ? `updated ${absDate(s.last_updated_at)}` : `published ${absDate(s.published_at)}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  chip={<StatusPill status={s.status} kind="standard" />}
                  chipBelowOnPhone
                />
              );
            })}
          </div>
        </Panel>
      )}
    </>
  );
}
