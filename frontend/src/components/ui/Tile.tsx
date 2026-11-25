/** Tile (DESIGN_SYSTEM.md §5): label, large mono numeral with its unit, detail line.
 * `hot` (amber tint) only when the tile shows a date within 60 days. */

import clsx from "clsx";
import { Link } from "react-router-dom";

export function Tile({
  label,
  value,
  unit,
  detail,
  hot = false,
  to,
  loading = false,
  className,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  detail?: React.ReactNode;
  hot?: boolean;
  to?: string;
  loading?: boolean;
  className?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-medium text-tx-secondary">{label}</p>
      {loading ? (
        <span aria-hidden className="mt-1.5 block h-8 w-16 animate-pulse rounded-ctl bg-bg-raised" />
      ) : (
        <p className={clsx("num mt-0.5 text-tile font-medium", hot ? "text-sev-watch" : "text-tx-primary")}>
          {value}
          {unit && <span className="ml-1.5 font-sans text-sm font-normal text-tx-secondary">{unit}</span>}
        </p>
      )}
      {detail && <p className="mt-0.5 text-detail text-tx-secondary">{detail}</p>}
    </>
  );
  const cls = clsx(
    "block min-w-0 rounded-panel border px-3.5 py-3",
    hot
      ? "border-[color-mix(in_srgb,theme(colors.sev.watch)_40%,theme(colors.bd.subtle))] bg-[color-mix(in_srgb,theme(colors.sev.watch)_9%,theme(colors.bg.surface))]"
      : "border-bd-subtle bg-bg-surface",
    to && (hot ? "hover:border-sev-watch/70" : "hover:border-bd-strong"),
    className,
  );
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
