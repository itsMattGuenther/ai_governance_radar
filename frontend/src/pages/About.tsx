/** About: what the site is, who built it, and the not-legal-advice notice. */

import { PageHeader } from "../components/layout/PageHeader";
import { Panel } from "../components/ui/Panel";

export const REPO_URL = "https://github.com/itsMattGuenther/ai_governance_radar";

export default function About() {
  return (
    <>
      <PageHeader title="About" detail="What this site is, how it works, and who built it." />
      <div className="grid max-w-3xl gap-3">
        <Panel title="What this is" marker="changes">
          <div className="space-y-2 px-3.5 py-3 text-base text-tx-secondary">
            <p>
              AI Governance Radar tracks AI laws, standards and incidents. Its core is a small set of
              records checked by hand against official sources: where each law stands, the dates
              that apply next, and what changed. A feed of items collected automatically from public
              sources sits beside them.
            </p>
            <p>
              Built by{" "}
              <a href="https://mattguenther.com" className="text-accent hover:underline">
                Matt Guenther
              </a>
              . The code is open source:{" "}
              <a href={REPO_URL} className="text-accent hover:underline">
                {REPO_URL.replace("https://", "")}
              </a>
              .
            </p>
          </div>
        </Panel>
        <Panel title="Not legal advice" marker="dates">
          <p className="px-3.5 py-3 text-base text-tx-secondary">
            This is an information tool, not legal advice. Records can be out of date or wrong:
            verify every fact against the official source linked on its record before relying on it.
          </p>
        </Panel>
      </div>
    </>
  );
}
