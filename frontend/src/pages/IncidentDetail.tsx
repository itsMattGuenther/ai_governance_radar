/** Incident detail (§24) — security-intelligence-report layout. */

import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";

import { ConfidenceBadge, DemoBadge, FactStatusBadge, SeverityBadge } from "../components/ui/Badge";
import { Panel } from "../components/ui/Panel";
import { CardSkeleton, ErrorState } from "../components/ui/States";
import { useIncident } from "../lib/api";
import { absDate, titleCase } from "../lib/format";
import { usePageTitle } from "../lib/usePageTitle";

function Block({ label, text }: { label: string; text: string | null }) {
  if (!text) return null;
  return (
    <section className="border-b border-bd-subtle px-3.5 py-3 last:border-b-0">
      <h2 className="text-xs font-semibold text-tx-secondary">{label}</h2>
      <p className="mt-1 text-base text-tx-secondary">{text}</p>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-bd-subtle py-1.5 last:border-b-0">
      <dt className="text-tx-muted">{label}</dt>
      <dd className="text-right text-tx-secondary">{value}</dd>
    </div>
  );
}

export default function IncidentDetail() {
  const { id } = useParams();
  const incident = useIncident(id);
  usePageTitle(incident.data ? incident.data.title : undefined);

  if (incident.isPending) return <div className="card"><CardSkeleton rows={6} /></div>;
  if (incident.isError)
    return (
      <div className="card">
        <ErrorState
          title="Incident not found"
          detail={String(incident.error)}
          onRetry={() => incident.refetch()}
        />
      </div>
    );

  const inc = incident.data;
  return (
    <>
      <Link to="/incidents" className="mb-3 inline-flex items-center gap-1.5 text-xs text-tx-secondary hover:text-tx-primary">
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" /> Incidents
      </Link>

      <h1 className="max-w-3xl text-xl font-semibold text-tx-primary">{inc.title}</h1>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={inc.severity} />
        <FactStatusBadge status={inc.fact_status} />
        <ConfidenceBadge confidence={inc.confidence} />
        <DemoBadge show={inc.is_demo} />
      </div>

      <div className="mt-4 grid items-start gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Write-up" marker="incidents">
            <Block label="What happened" text={inc.what_happened} />
            <Block label="Root cause" text={inc.root_cause} />
            <Block label="Governance relevance" text={inc.governance_relevance} />
            <Block label="Security relevance" text={inc.security_relevance} />
            <Block label="Mitigation and lessons" text={inc.mitigation} />
          </Panel>
        </div>

        <aside className="grid gap-3">
          <Panel title="Details" marker="incidents">
            <dl className="px-3.5 py-2 text-detail">
              <Field label="Occurred" value={absDate(inc.occurred_at)} />
              <Field label="Reported" value={absDate(inc.reported_at)} />
              <Field label="Category" value={titleCase(inc.category)} />
              <Field label="System or vendor" value={inc.system_vendor ?? "—"} />
              <Field label="System type" value={inc.system_type ?? "—"} />
              <Field label="Geography" value={inc.geography ?? "—"} />
              <Field label="Affected domain" value={inc.affected_domain ?? "—"} />
            </dl>
          </Panel>

          <Panel title="Sources" marker="feed" meta={inc.source_links.length}>
            {inc.source_links.length === 0 ? (
              <p className="px-3.5 py-3 text-detail text-tx-muted">No sources recorded.</p>
            ) : (
              <ul className="px-3.5 py-2">
                {inc.source_links.map((s) => (
                  <li key={s.url} className="py-1">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-start gap-1.5 text-detail text-accent hover:underline"
                    >
                      <ExternalLink aria-hidden className="mt-0.5 h-3 w-3 shrink-0" />
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {inc.related_framework_slugs.length > 0 && (
            <Panel title="Related frameworks" marker="standards">
              <ul className="px-3.5 py-2">
                {inc.related_framework_slugs.map((slug) => (
                  <li key={slug} className="py-0.5">
                    <Link to={`/entities/${slug}`} className="text-detail text-accent hover:underline">
                      {slug.replace(/-/g, " ").toUpperCase()}
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </aside>
      </div>
    </>
  );
}
