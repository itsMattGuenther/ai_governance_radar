/** About: what the site is and who built it, what it tracks, how records are checked,
 * how the scores work, the feeds, and every source with its health. On phones this is
 * where the definitions behind the hover tooltips live. */

import { CalendarDays, ExternalLink, Rss } from "lucide-react";

import { PageHeader } from "../components/layout/PageHeader";
import { TierBadge } from "../components/ui/Badge";
import { Panel } from "../components/ui/Panel";
import { CardSkeleton, ErrorState } from "../components/ui/States";
import { useIncidents, useRegulations, useSources, useStandards } from "../lib/api";
import {
  CONFIDENCE_DEFS,
  CONFIDENCE_EXPLAINER,
  FACT_STATUS_DEFS,
  IMPACT_BANDS,
  IMPACT_EXPLAINER,
  SEVERITY_DEFS,
  TIER_DEFS,
} from "../lib/definitions";
import { STATIC_MODE } from "../lib/env";
import { absDate, utcStamp } from "../lib/format";
import { REVERIFY_DAYS, SOON_DAYS, recordsChecked } from "../lib/records";

export const REPO_URL = "https://github.com/itsMattGuenther/ai_governance_radar";
const CORRECTIONS_URL = `${REPO_URL}/blob/main/docs/reviews/2026-11-25-records-verification.md`;
const FEEDS = STATIC_MODE
  ? { calendar: "/data/milestones.ics", changes: "/data/changes.xml" }
  : { calendar: "/api/feeds/milestones.ics", changes: "/api/feeds/changes.xml" };

const STAGES: [string, string][] = [
  ["Introduced", "A bill is before a legislature."],
  ["Passed", "The legislature has passed it."],
  ["Signed", "Signed or enacted, but not yet in force."],
  ["In force", "Its obligations apply, in full or in phases."],
  ["Enforced", "A regulator is actively enforcing it."],
];

const link = "text-accent hover:underline";

function Text({ children }: { children: React.ReactNode }) {
  return <div className="space-y-2 px-3.5 py-3 text-base text-tx-secondary">{children}</div>;
}

function Defs({ items }: { items: [string, string][] }) {
  return (
    <dl className="space-y-1.5 px-3.5 py-3 text-detail">
      {items.map(([term, def]) => (
        <div key={term}>
          <dt className="inline font-semibold text-tx-primary">{term}: </dt>
          <dd className="inline text-tx-secondary">{def}</dd>
        </div>
      ))}
    </dl>
  );
}

const strip = (def: string) => def.replace(/^[^—]+— /, "");

/** A source's state as a word: OK, Failing, or Not collected yet. */
function SourceState({ error, collected }: { error: string | null; collected: boolean }) {
  if (error)
    return (
      <span className="font-medium text-sev-critical">
        <span aria-hidden>▲ </span>Failing
      </span>
    );
  if (!collected) return <span className="text-tx-muted">Not collected yet</span>;
  return (
    <span className="font-medium text-sev-positive">
      <span aria-hidden>● </span>OK
    </span>
  );
}

function Sources() {
  const sources = useSources();
  if (sources.isPending) return <CardSkeleton rows={6} />;
  if (sources.isError) return <ErrorState detail={String(sources.error)} onRetry={() => sources.refetch()} />;
  const shown = sources.data.filter((s) => s.enabled);
  return (
    <>
      <table className="hidden w-full border-collapse text-left md:table">
        <thead>
          <tr className="border-b border-bd-subtle bg-bg-raised">
            {["Source", "Tier", "Kind", "Last collected", "State"].map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-3.5 py-2 text-xs font-semibold text-tx-secondary">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {shown.map((s) => (
            <tr key={s.id} className="border-b border-bd-subtle align-top last:border-b-0">
              <td className="px-3.5 py-2.5">
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-row font-medium text-tx-primary hover:text-accent">
                  {s.name}
                </a>
                {s.attribution && <p className="mt-0.5 text-meta text-tx-muted">{s.attribution}</p>}
              </td>
              <td className="whitespace-nowrap px-3.5 py-2.5">
                <TierBadge tier={s.reliability_tier} />
              </td>
              <td className="whitespace-nowrap px-3.5 py-2.5 text-detail text-tx-secondary">
                {s.source_type === "page_watch" ? "Page watch" : s.source_type === "json_api" ? "JSON API" : s.source_type.toUpperCase()}
                <span className="block text-meta text-tx-muted">every {s.polling_interval_minutes / 60} h</span>
              </td>
              <td className="num whitespace-nowrap px-3.5 py-2.5 text-detail text-tx-secondary">
                {s.last_success_at ? utcStamp(s.last_success_at) : "Never"}
              </td>
              <td className="px-3.5 py-2.5 text-detail">
                <SourceState error={s.last_error} collected={!!s.last_success_at} />
                {s.last_error && <span className="block text-tx-muted">{s.last_error}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="md:hidden">
        {shown.map((s) => (
          <li key={s.id} className="border-b border-bd-subtle px-3.5 py-2.5 last:border-b-0">
            <a href={s.url} target="_blank" rel="noopener noreferrer" className="text-row font-medium text-tx-primary">
              {s.name}
            </a>
            <p className="mt-0.5 text-detail text-tx-secondary">
              <SourceState error={s.last_error} collected={!!s.last_success_at} />
              {" · "}Tier {s.reliability_tier} · last collected{" "}
              <span className="num">{s.last_success_at ? utcStamp(s.last_success_at) : "never"}</span>
            </p>
            {s.last_error && <p className="mt-0.5 text-meta text-tx-muted">{s.last_error}</p>}
          </li>
        ))}
      </ul>
    </>
  );
}

export default function About() {
  const laws = useRegulations();
  const standards = useStandards();
  const incidents = useIncidents();
  const sources = useSources();
  const checked = laws.data ? recordsChecked(laws.data) : null;
  const enabledSources = sources.data?.filter((s) => s.enabled).length;

  return (
    <>
      <PageHeader title="About" detail="What this site is, how it works, and who built it." />
      <div className="grid items-start gap-3 lg:grid-cols-2">
        <Panel title="What this is" marker="changes">
          <Text>
            <p>
              AI Governance Radar tracks AI laws, standards and incidents. Its core is a small set of
              curated records checked against official sources: where each law stands, the dates
              that apply next, and what changed. A feed collected automatically from public sources
              sits beside them, kept apart and labelled as such.
            </p>
            <p>
              Built by{" "}
              <a href="https://mattguenther.com" className={link}>
                Matt Guenther
              </a>
              . The code is open source under the MIT licence:{" "}
              <a href={REPO_URL} className={link}>
                {REPO_URL.replace("https://", "")}
              </a>
              . The site itself runs no AI: every record comes from a curated file.
            </p>
          </Text>
        </Panel>

        <Panel title="Not legal advice" marker="dates">
          <Text>
            <p>
              This is an information tool, not legal advice. Records can be out of date or wrong.
              Verify every fact against the official source linked on its record before relying on
              it, and take advice from a lawyer for your situation.
            </p>
          </Text>
        </Panel>

        <Panel title="What is tracked" marker="laws">
          <Text>
            <p>
              <span className="num text-tx-primary">{laws.data?.length ?? "—"}</span> laws and{" "}
              <span className="num text-tx-primary">{standards.data?.length ?? "—"}</span> standards and
              frameworks, each with its official source, and{" "}
              <span className="num text-tx-primary">{incidents.data?.length ?? "—"}</span> curated
              incident write-ups with the sources they cite. Laws carry their stage, key dates and
              dated milestones; every record keeps a timeline of what changed.
            </p>
            <p>
              Alongside, <span className="num text-tx-primary">{enabledSources ?? "—"}</span> public
              sources are collected {STATIC_MODE ? "every 6 hours" : "on their own schedules"}:
              government and standards bodies, research and incident databases, and the press.
              Collection never writes a record: when a document linked to a record changes, the
              record is flagged for review instead.
            </p>
          </Text>
        </Panel>

        <Panel title="How records are checked" marker="changes">
          <Text>
            <p>
              Records are checked against primary sources: the statute, the official journal, the
              regulator, the court docket or the standards body. Dates, stages, milestones and
              penalties change only from that check; nothing is parsed out of news or notes.
            </p>
            <p>
              The last full check was carried out by AI research agents working from those sources.
              Each proposed change came with its source, the owner approved the changes, and a few
              headline findings were re-read at the source. No person read every source; the
              method is set out in the corrections log.
            </p>
            <p>
              {checked ? (
                <>
                  The laws were last checked on <span className="num text-tx-primary">{absDate(checked.checked)}</span>.
                  The next check is due by <span className="num text-tx-primary">{absDate(checked.due)}</span>.
                </>
              ) : (
                "Each law shows when it was last checked."
              )}{" "}
              A record is due a fresh check every {REVERIFY_DAYS} days. Its confidence drops a level
              when its check is older than that, or when one of its key dates passes after the check,
              because the law may have moved on.
            </p>
            <p>
              Corrections are logged in the open. The check of 25 Nov 2026 found nine records with
              errors that would mislead;{" "}
              <a href={CORRECTIONS_URL} className={link}>
                read the corrections log
              </a>
              .
            </p>
          </Text>
        </Panel>

        <Panel title="Reading the board" marker="dates">
          <Defs
            items={[
              ...STAGES,
              ["Superseded", "Replaced by a later law, which the record links to."],
              ["Day counts", `Days until a milestone. Amber within ${SOON_DAYS} days.`],
              ["Milestones", "Dated phases and deadlines from the checked record. Only these feed Dates ahead and the calendar."],
            ]}
          />
        </Panel>

        <Panel title="Subscribe" marker="feed">
          <Text>
            <p>Follow the records without visiting the site:</p>
            <ul className="space-y-1.5">
              <li>
                <a href={FEEDS.calendar} className={`${link} inline-flex items-center gap-1.5`}>
                  <CalendarDays aria-hidden className="h-4 w-4" /> Calendar of dates ahead (.ics)
                </a>
                <span className="block text-detail text-tx-muted">
                  Every milestone still ahead, as all-day events. Subscribe by address in your calendar app.
                </span>
              </li>
              <li>
                <a href={FEEDS.changes} className={`${link} inline-flex items-center gap-1.5`}>
                  <Rss aria-hidden className="h-4 w-4" /> Feed of record changes (Atom)
                </a>
                <span className="block text-detail text-tx-muted">
                  Each change recorded on a law or standard, newest first.
                </span>
              </li>
            </ul>
          </Text>
        </Panel>

        <Panel title="Impact and confidence" marker="feed">
          <Text>
            <p>{IMPACT_EXPLAINER}</p>
          </Text>
          <Defs items={IMPACT_BANDS.map((b) => [`${b.label} (${b.min}+)`, b.meaning] as [string, string])} />
          <Text>
            <p>{CONFIDENCE_EXPLAINER}</p>
          </Text>
          <Defs items={Object.entries(CONFIDENCE_DEFS).map(([k, v]) => [`${k[0].toUpperCase()}${k.slice(1)}`, strip(v)])} />
        </Panel>

        <Panel title="Source tiers, severity and fact status" marker="incidents">
          <Defs items={Object.entries(TIER_DEFS).map(([k, v]) => [`Tier ${k}`, strip(v)])} />
          <div className="border-t border-bd-subtle" />
          <Defs items={Object.entries(SEVERITY_DEFS).map(([k, v]) => [`${k[0].toUpperCase()}${k.slice(1)}`, strip(v)])} />
          <div className="border-t border-bd-subtle" />
          <Defs items={Object.values(FACT_STATUS_DEFS).map((v) => [v.split(" — ")[0], strip(v)])} />
        </Panel>

        <div id="sources" className="scroll-mt-24 lg:col-span-2">
          <Panel
            title="Sources"
            marker="feed"
            meta={
              sources.data
                ? `${sources.data.filter((s) => s.enabled && s.last_success_at && !s.last_error).length}/${enabledSources} OK`
                : undefined
            }
            action={
              <a href={`${REPO_URL}/blob/main/SOURCE_CATALOG.md`} className="inline-flex items-center gap-1 text-xs text-accent hover:underline">
                Source catalog <ExternalLink aria-hidden className="h-3 w-3" />
              </a>
            }
          >
            <Sources />
          </Panel>
        </div>
      </div>
    </>
  );
}
