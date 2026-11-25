import { useEffect } from "react";

const SITE = "AI Governance Radar";

/** Browser tab title for the current page: "EU AI Act · AI Governance Radar". */
export function usePageTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    document.title = `${title} · ${SITE}`;
  }, [title]);
}
