/** Feed row: date, source code tile, title over a quiet detail line, at most one chip.
 * Impact and confidence live in the drawer and the All Sources columns, not here. */

import { categoryLabel } from "../../lib/format";
import type { ItemOut } from "../../lib/types";
import { DemoBadge } from "../ui/Badge";
import { Chip } from "../ui/Chip";
import { CodeTile, sourceCode } from "../ui/CodeTile";
import { DateCell, Row } from "../ui/Row";

export function itemDate(item: ItemOut): string {
  return item.published_at ?? item.first_seen_at;
}

export function reportCount(item: ItemOut): string | null {
  return item.cluster_size > 1 ? `${item.cluster_size} reports` : null;
}

export function ItemRow({
  item,
  onOpen,
  showSource = true,
}: {
  item: ItemOut;
  onOpen: (item: ItemOut) => void;
  showSource?: boolean;
}) {
  const reports = reportCount(item);
  const detail = [
    item.source_name,
    item.jurisdiction_code,
    item.categories[0] ? categoryLabel(item.categories[0]) : null,
    item.is_demo ? reports : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Row
      onClick={() => onOpen(item)}
      leadWidth=""
      lead={
        <span className="flex items-start gap-3">
          <span className="w-12">
            <DateCell date={itemDate(item)} />
          </span>
          {showSource && (
            <CodeTile code={sourceCode(item.source_name)} title={item.source_name} className="hidden w-16 sm:inline-block" />
          )}
        </span>
      }
      title={<span className="line-clamp-2">{item.title}</span>}
      detail={detail}
      chip={
        item.is_demo ? (
          <DemoBadge show />
        ) : reports ? (
          <Chip title={`${reports} of this event, shown as one row`}>{reports}</Chip>
        ) : undefined
      }
    />
  );
}
