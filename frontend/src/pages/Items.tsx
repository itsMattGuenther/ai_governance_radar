/** All Sources: everything collected, by source tier, filterable. The firehose; the
 * curated knowledge lives on Laws, Standards and Incidents. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { X } from "lucide-react";
import clsx from "clsx";

import { ItemDetailDrawer } from "../components/items/ItemDetailDrawer";
import { itemDate, reportCount } from "../components/items/ItemRow";
import { PageHeader } from "../components/layout/PageHeader";
import { DemoBadge } from "../components/ui/Badge";
import { CodeTile, sourceCode } from "../components/ui/CodeTile";
import { InfoTip } from "../components/ui/InfoTip";
import { Panel } from "../components/ui/Panel";
import { DateCell, Row } from "../components/ui/Row";
import { CardSkeleton, EmptyState, ErrorState } from "../components/ui/States";
import { useItems, useSources } from "../lib/api";
import { CONFIDENCE_DEFS, CONFIDENCE_EXPLAINER, IMPACT_EXPLAINER, TIER_DEFS, impactBand } from "../lib/definitions";
import { STATIC_MODE } from "../lib/env";
import { absDate, categoryLabel, titleCase } from "../lib/format";
import type { ItemOut } from "../lib/types";

const CATEGORIES = ["regulation", "standard", "incident", "security", "research", "news"];
const PAGE = 25;

/** Tabs by source tier (TIER_DEFS). "All" lets a count elsewhere link to the full list. */
const TABS = [
  { key: "1", label: "Government and standards bodies", tiers: [1] },
  { key: "2", label: "Research and incident databases", tiers: [2] },
  { key: "3,4", label: "Press", tiers: [3, 4] },
  { key: "all", label: "All", tiers: [1, 2, 3, 4] },
];

function Impact({ item }: { item: ItemOut }) {
  const band = impactBand(item.impact_score);
  return (
    <span title={`${band.meaning} Open the item for the points behind the score.`}>
      <span className="num text-tx-primary">{item.impact_score}</span>{" "}
      <span className="text-tx-muted">{band.label}</span>
    </span>
  );
}

function Confidence({ level }: { level: string }) {
  return (
    <span title={CONFIDENCE_DEFS[level]} className={level === "low" ? "font-medium text-sev-high" : "text-tx-secondary"}>
      {level === "low" && <span aria-hidden>▲ </span>}
      {titleCase(level)}
    </span>
  );
}

export default function Items() {
  const [params, setParams] = useSearchParams();
  const [openItem, setOpenItem] = useState<ItemOut | null>(null);

  const tab = TABS.find((t) => t.key === params.get("tier")) ?? TABS[0];
  const category = params.get("category") ?? "";
  const minImpact = params.get("min_impact") ?? "";
  const confidence = params.get("confidence") ?? "";
  const sourceId = params.get("source_id") ?? "";
  const jurisdiction = params.get("jurisdiction") ?? "";
  const sort = (params.get("sort") ?? "newest") as "newest" | "impact" | "first_seen";
  const includeDemo = params.get("include_demo") !== "false";
  const includePageChanges = params.get("include_page_changes") !== "false";
  const since = params.get("since") ?? "";
  const offset = Number(params.get("offset") ?? 0);

  const sources = useSources();
  const query = useItems({
    tier: tab.key === "all" ? undefined : tab.key,
    category: category || undefined,
    min_impact: minImpact ? Number(minImpact) : undefined,
    confidence: confidence || undefined,
    source_id: sourceId ? Number(sourceId) : undefined,
    jurisdiction: jurisdiction || undefined,
    include_demo: includeDemo,
    include_page_changes: includePageChanges,
    since: since || undefined,
    collapse_clusters: true,
    sort,
    offset,
    limit: PAGE,
  });

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("offset");
    if (key === "tier") next.delete("source_id"); // sources differ by tier
    setParams(next, { replace: true });
  };

  const page = (dir: 1 | -1) => {
    const next = new URLSearchParams(params);
    const newOffset = Math.max(0, offset + dir * PAGE);
    if (newOffset) next.set("offset", String(newOffset));
    else next.delete("offset");
    setParams(next, { replace: true });
  };

  const tabSources = sources.data?.filter((s) => tab.tiers.includes(s.reliability_tier) && (s.enabled || !STATIC_MODE));
  const detail = (item: ItemOut) =>
    [item.jurisdiction_code, item.categories[0] ? categoryLabel(item.categories[0]) : null, reportCount(item)]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <PageHeader
        title="All sources"
        detail="Everything collected from every monitored source, by source tier. Reports of one event share a row."
        actions={
          <InfoTip
            align="right"
            content={
              <span className="space-y-1.5">
                <span className="block">{IMPACT_EXPLAINER}</span>
                <span className="block">{CONFIDENCE_EXPLAINER}</span>
              </span>
            }
          >
            <span className="cursor-help text-xs text-tx-secondary underline decoration-dotted underline-offset-2 hover:text-tx-primary">
              How impact and confidence work
            </span>
          </InfoTip>
        }
      />

      <div role="tablist" aria-label="Source tier" className="mb-3 flex flex-wrap gap-1 border-b border-bd-subtle">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab.key === t.key}
            title={t.tiers.length < 4 ? t.tiers.map((n) => TIER_DEFS[n]).join("\n") : undefined}
            onClick={() => setFilter("tier", t.key === "1" ? "" : t.key)}
            className={clsx(
              "-mb-px border-b-2 px-3 py-1.5 text-sm",
              tab.key === t.key
                ? "border-accent font-semibold text-tx-primary"
                : "border-transparent text-tx-secondary hover:text-tx-primary",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Sort
          <select value={sort} onChange={(e) => setFilter("sort", e.target.value)} className="control">
            <option value="newest">Newest first</option>
            <option value="impact">Highest impact</option>
            <option value="first_seen">Recently collected</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Category
          <select value={category} onChange={(e) => setFilter("category", e.target.value)} className="control">
            <option value="">All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Impact
          <select value={minImpact} onChange={(e) => setFilter("min_impact", e.target.value)} className="control">
            <option value="">Any</option>
            <option value="70">High (70+)</option>
            <option value="50">Elevated (50+)</option>
            <option value="30">Watch (30+)</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Confidence
          <select value={confidence} onChange={(e) => setFilter("confidence", e.target.value)} className="control">
            <option value="">Any</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-tx-secondary">
          Source
          <select value={sourceId} onChange={(e) => setFilter("source_id", e.target.value)} className="control max-w-[14rem]">
            <option value="">All</option>
            {tabSources?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        {!STATIC_MODE && (
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-tx-secondary">
            <input
              type="checkbox"
              checked={includeDemo}
              onChange={(e) => setFilter("include_demo", e.target.checked ? "" : "false")}
              className="accent-accent"
            />
            Demo data
          </label>
        )}
        <label className="flex cursor-pointer items-center gap-1.5 text-xs text-tx-secondary">
          <input
            type="checkbox"
            checked={includePageChanges}
            onChange={(e) => setFilter("include_page_changes", e.target.checked ? "" : "false")}
            className="accent-accent"
          />
          Page-change alerts
        </label>
        {since && (
          <button
            type="button"
            onClick={() => setFilter("since", "")}
            aria-label={`Remove date filter: published since ${absDate(since)}`}
            className="inline-flex items-center gap-1 rounded-ctl border border-accent/40 bg-accent/10 px-2 py-1 text-xs text-accent hover:bg-accent/20"
          >
            Since {absDate(since)}
            <X aria-hidden className="h-3 w-3" />
          </button>
        )}
      </div>

      <Panel title={tab.label} marker="feed" meta={query.data ? `${query.data.total}` : undefined}>
        {query.isPending ? (
          <CardSkeleton rows={6} />
        ) : query.isError ? (
          <ErrorState detail={String(query.error)} onRetry={() => query.refetch()} />
        ) : query.data.items.length === 0 ? (
          <EmptyState
            title="No items match these filters"
            detail={STATIC_MODE ? "Try another tab or clear the filters." : "Try another tab, clear the filters, or run ingestion from Settings."}
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
                  {["Date", "Source", "Item", "Impact", "Confidence"].map((h) => (
                    <th key={h} scope="col" className="whitespace-nowrap px-3.5 py-2 text-xs font-semibold text-tx-secondary">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((item) => (
                  <tr key={item.id} className="border-b border-bd-subtle align-top last:border-b-0 hover:bg-bg-raised">
                    <td className="w-16 px-3.5 py-2.5">
                      <DateCell date={itemDate(item)} />
                    </td>
                    <td className="w-20 px-3.5 py-2.5">
                      <CodeTile code={sourceCode(item.source_name)} title={item.source_name} className="w-16" />
                    </td>
                    <td className="px-3.5 py-2.5">
                      <button
                        type="button"
                        onClick={() => setOpenItem(item)}
                        className="text-left text-row font-medium text-tx-primary hover:text-accent"
                      >
                        {item.title}
                      </button>
                      <p className="mt-0.5 text-detail text-tx-secondary">
                        {item.source_name}
                        {detail(item) && ` · ${detail(item)}`}
                      </p>
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-detail">
                      <Impact item={item} />
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-2.5 text-detail">
                      <Confidence level={item.confidence} />
                      {item.is_demo && (
                        <span className="mt-1 block">
                          <DemoBadge show />
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="md:hidden">
              {query.data.items.map((item) => (
                <Row
                  key={item.id}
                  onClick={() => setOpenItem(item)}
                  lead={<DateCell date={itemDate(item)} />}
                  leadWidth="w-12"
                  title={item.title}
                  detail={
                    <>
                      {item.source_name}
                      {detail(item) && ` · ${detail(item)}`}
                      <span className="mt-0.5 block">
                        Impact <Impact item={item} /> · <Confidence level={item.confidence} /> confidence
                      </span>
                    </>
                  }
                  chip={item.is_demo ? <DemoBadge show /> : undefined}
                />
              ))}
            </div>
            <div className="flex items-center justify-between border-t border-bd-subtle px-3.5 py-2 text-xs text-tx-secondary">
              <span className="num">
                {offset + 1}–{Math.min(offset + PAGE, query.data.total)} of {query.data.total}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => page(-1)}
                  disabled={offset === 0}
                  className="rounded-ctl border border-bd-strong px-2.5 py-1 enabled:hover:text-tx-primary disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => page(1)}
                  disabled={offset + PAGE >= query.data.total}
                  className="rounded-ctl border border-bd-strong px-2.5 py-1 enabled:hover:text-tx-primary disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </Panel>

      <ItemDetailDrawer item={openItem} onClose={() => setOpenItem(null)} />
    </>
  );
}
