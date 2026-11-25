/** Search results (§28), grouped: tracked records, incidents, then collected items. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { ItemDetailDrawer } from "../components/items/ItemDetailDrawer";
import { ItemRow } from "../components/items/ItemRow";
import { PageHeader } from "../components/layout/PageHeader";
import { SeverityBadge, StatusPill } from "../components/ui/Badge";
import { Jurisdiction } from "../components/ui/Flag";
import { Panel } from "../components/ui/Panel";
import { DateCell, Row } from "../components/ui/Row";
import { CardSkeleton, EmptyState, ErrorState } from "../components/ui/States";
import { useSearch } from "../lib/api";
import { categoryLabel, titleCase } from "../lib/format";
import type { ItemOut } from "../lib/types";

const GROUP_ORDER = ["regulation", "standard", "incident", "security", "news", "event", "training", "research", "ranking"];

export default function SearchResults() {
  const [params] = useSearchParams();
  const q = params.get("q") ?? "";
  const search = useSearch(q);
  const [openItem, setOpenItem] = useState<ItemOut | null>(null);

  if (!q) {
    return (
      <>
        <PageHeader title="Search" />
        <div className="card">
          <EmptyState title="Type a search above" detail="Press / anywhere to jump to the search box." />
        </div>
      </>
    );
  }
  if (search.isPending)
    return (
      <div className="card">
        <CardSkeleton rows={6} />
      </div>
    );
  if (search.isError)
    return (
      <div className="card">
        <ErrorState detail={String(search.error)} onRetry={() => search.refetch()} />
      </div>
    );

  const { items, entities, incidents } = search.data;
  const grouped = GROUP_ORDER.map((g) => ({
    key: g,
    items: items.filter((i) => (i.categories[0] ?? "news") === g),
  })).filter((g) => g.items.length > 0);
  const total = items.length + entities.length + incidents.length;

  return (
    <>
      <PageHeader title={`Search: “${q}”`} detail={`${total} result${total === 1 ? "" : "s"}`} />

      {total === 0 ? (
        <div className="card">
          <EmptyState
            title="No results"
            detail="Try fewer or different words. Search covers titles, excerpts, records and incidents."
          />
        </div>
      ) : (
        <div className="grid gap-3">
          {entities.length > 0 && (
            <Panel title="Tracked records" marker="laws" meta={entities.length}>
              {entities.map((e) => (
                <Row
                  key={e.slug}
                  to={`/entities/${e.slug}`}
                  leadWidth="w-[4.75rem]"
                  lead={<Jurisdiction code={e.jurisdiction_code} />}
                  title={e.name}
                  detail={titleCase(e.entity_type)}
                  chip={
                    e.current_status ? (
                      <StatusPill status={e.current_status} kind={e.entity_type === "regulation" ? "regulation" : "standard"} />
                    ) : undefined
                  }
                />
              ))}
            </Panel>
          )}

          {incidents.length > 0 && (
            <Panel title="Incidents" marker="incidents" meta={incidents.length}>
              {incidents.map((inc) => (
                <Row
                  key={inc.id}
                  to={`/incidents/${inc.id}`}
                  lead={<DateCell date={inc.occurred_at ?? inc.reported_at} alwaysYear />}
                  leadWidth="w-12"
                  title={inc.title}
                  detail={titleCase(inc.category)}
                  chip={<SeverityBadge severity={inc.severity} />}
                />
              ))}
            </Panel>
          )}

          {grouped.map((g) => (
            <Panel key={g.key} title={`Collected: ${categoryLabel(g.key)}`} marker="feed" meta={g.items.length}>
              {g.items.map((item) => (
                <ItemRow key={item.id} item={item} onOpen={setOpenItem} />
              ))}
            </Panel>
          ))}
        </div>
      )}

      <ItemDetailDrawer item={openItem} onClose={() => setOpenItem(null)} />
    </>
  );
}
