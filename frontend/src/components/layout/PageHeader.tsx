import { usePageTitle } from "../../lib/usePageTitle";

/** Page title (20px) with an optional detail line and actions on the right. Also sets
 * the browser tab title. */
export function PageHeader({
  title,
  detail,
  actions,
}: {
  title: string;
  detail?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  usePageTitle(title);
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-tx-primary">{title}</h1>
        {detail && <p className="mt-0.5 text-detail text-tx-secondary">{detail}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
