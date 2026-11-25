import { useEffect } from "react";

const SITE = "AI Governance Radar";
const HOME = `${SITE}: AI laws, standards and the dates that matter`;

/** Browser tab title: "EU AI Act · AI Governance Radar", or the site title for null. */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (title === undefined) return;
    document.title = title === null ? HOME : `${title} · ${SITE}`;
  }, [title]);
}
