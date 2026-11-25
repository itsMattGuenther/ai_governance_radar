/** Row (DESIGN_SYSTEM.md §5): optional mono date column, a bright title over a quieter
 * detail line, then at most one chip. Rows within 60 days of their date get a faint
 * amber tint. */

import clsx from "clsx";
import { Link } from "react-router-dom";

import { dateColumn } from "../../lib/format";

/** Mono date cell: "02 DEC" with the year beneath when it isn't this year. */
export function DateCell({ date, alwaysYear = false }: { date: string; alwaysYear?: boolean }) {
  const { day, year } = dateColumn(date);
  const shownYear = year ?? (alwaysYear ? String(new Date(date).getUTCFullYear()) : null);
  return (
    <span className="num block whitespace-nowrap text-xs font-medium leading-tight text-tx-primary">
      {day}
      {shownYear && <span className="block text-meta font-normal text-tx-muted">{shownYear}</span>}
    </span>
  );
}

export function Row({
  lead,
  title,
  detail,
  chip,
  soon = false,
  to,
  onClick,
  leadWidth = "w-14",
  className,
}: {
  /** Leading column: a DateCell, code tile or flag. */
  lead?: React.ReactNode;
  title: React.ReactNode;
  detail?: React.ReactNode;
  chip?: React.ReactNode;
  soon?: boolean;
  to?: string;
  onClick?: () => void;
  leadWidth?: string;
  className?: string;
}) {
  const body = (
    <>
      {lead !== undefined && <span className={clsx("shrink-0 pt-px", leadWidth)}>{lead}</span>}
      <span className="min-w-0 flex-1">
        <span className="block text-row font-medium text-tx-primary">{title}</span>
        {detail && <span className="mt-0.5 block text-detail text-tx-secondary">{detail}</span>}
      </span>
      {chip && <span className="shrink-0 self-center">{chip}</span>}
    </>
  );
  const cls = clsx(
    "flex w-full items-start gap-3 border-b border-bd-subtle px-3.5 py-2.5 text-left last:border-b-0",
    soon && "bg-sev-watch/[.06]",
    (to || onClick) && "hover:bg-bg-raised",
    className,
  );
  if (to) {
    return (
      <Link to={to} className={cls}>
        {body}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls}>
        {body}
      </button>
    );
  }
  return <div className={cls}>{body}</div>;
}
