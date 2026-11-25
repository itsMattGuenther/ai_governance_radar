/** Panel and panel header (DESIGN_SYSTEM.md §5): a flat surface with a shaded header
 * band, a square marker in the panel's subject colour, and a mono count on the right. */

import clsx from "clsx";
import { Link } from "react-router-dom";

/** Panel marker colours: what each panel is about (DESIGN_SYSTEM.md §5). */
export const MARKERS = {
  dates: "bg-sev-watch",
  changes: "bg-accent",
  laws: "bg-sev-emerging",
  standards: "bg-sev-info",
  incidents: "bg-sev-high",
  feed: "bg-sev-positive",
} as const;

export type Marker = keyof typeof MARKERS;

export function Panel({
  title,
  marker,
  meta,
  action,
  footer,
  children,
  className,
  headingLevel = 2,
}: {
  title: string;
  marker: Marker;
  /** Mono count or window on the right, e.g. "next 5", "last 30 days". */
  meta?: React.ReactNode;
  /** A link or control after the meta. */
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <section className={clsx("card flex min-w-0 flex-col", className)}>
      <header className="flex items-center gap-2.5 border-b border-bd-subtle bg-bg-raised px-3.5 py-2">
        <span aria-hidden className={clsx("h-2 w-2 shrink-0 rounded-[2px]", MARKERS[marker])} />
        <Heading className="text-sm font-semibold text-tx-primary">{title}</Heading>
        {(meta !== undefined || action) && (
          <span className="ml-auto flex items-center gap-3">
            {meta !== undefined && <span className="num text-meta text-tx-muted">{meta}</span>}
            {action}
          </span>
        )}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
      {footer && (
        <footer className="border-t border-bd-subtle px-3.5 py-2 text-detail text-tx-muted">{footer}</footer>
      )}
    </section>
  );
}

/** "Open all →" style link for a panel header or footer. */
export function PanelLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="text-xs text-accent hover:underline">
      {children}
    </Link>
  );
}
