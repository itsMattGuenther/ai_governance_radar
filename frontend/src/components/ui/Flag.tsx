/** Jurisdiction flag (DESIGN_SYSTEM.md §5): a real SVG flag about 18px wide with 2px
 * corners, beside the jurisdiction code. Flags ship with the site (never fetched from
 * elsewhere) and load on demand: a country flag is a small SVG file fetched only when
 * shown, and a US state flag is its own script chunk, so a page carries only the flags
 * it displays. Decorative: the code beside it carries the meaning. */

import { useEffect, useState } from "react";

const COUNTRY_FLAGS = import.meta.glob<string>(
  "/node_modules/flag-icons/flags/4x3/{us,gb,sg,jp,cn,kr,ca,au,in,ae,br,fr,de,it,es,nl,ie,eu,un}.svg",
  { query: "?url", import: "default", eager: true },
);

type StateFlagComponent = React.FC<React.SVGProps<SVGSVGElement>>;
const STATE_FLAGS = import.meta.glob<StateFlagComponent>(
  "/node_modules/us-state-flags/src/components/flags/Flag*.js",
  { import: "default" },
);
const loadedStates = new Map<string, StateFlagComponent>();

const COUNTRY_CODES: Record<string, string> = {
  US: "us", GB: "gb", SG: "sg", JP: "jp", CN: "cn", KR: "kr", CA: "ca", AU: "au",
  IN: "in", AE: "ae", BR: "br", FR: "fr", DE: "de", IT: "it", ES: "es", NL: "nl",
  IE: "ie", EU: "eu", "INTL-UN": "un",
};

const W = 18;
const H = 12;

function Frame({ children }: { children?: React.ReactNode }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 overflow-hidden rounded-[2px] bg-bd-subtle align-middle shadow-[0_0_0_1px_rgba(255,255,255,.12)]"
      style={{ width: W, height: H }}
    >
      {children}
    </span>
  );
}

function StateFlag({ abbr }: { abbr: string }) {
  const path = `/node_modules/us-state-flags/src/components/flags/Flag${abbr}.js`;
  const [Svg, setSvg] = useState<StateFlagComponent | null>(() => loadedStates.get(abbr) ?? null);
  useEffect(() => {
    if (Svg || !STATE_FLAGS[path]) return;
    let live = true;
    STATE_FLAGS[path]().then((component) => {
      loadedStates.set(abbr, component);
      if (live) setSvg(() => component);
    });
    return () => {
      live = false;
    };
  }, [Svg, abbr, path]);
  return (
    <Frame>
      {Svg && (
        <Svg
          width={W}
          height={H}
          preserveAspectRatio="xMidYMid slice"
          style={{ display: "block" }}
          aria-hidden
        />
      )}
    </Frame>
  );
}

/** Whether `code` has a flag to show. */
function hasFlag(code: string | null | undefined): boolean {
  if (!code) return false;
  if (code.startsWith("US-")) return true;
  return code in COUNTRY_CODES;
}

export function Flag({ code }: { code: string | null | undefined }) {
  if (!code || !hasFlag(code)) return null;
  if (code.startsWith("US-")) return <StateFlag abbr={code === "US-NYC" ? "NY" : code.slice(3)} />;
  const url = COUNTRY_FLAGS[`/node_modules/flag-icons/flags/4x3/${COUNTRY_CODES[code]}.svg`];
  return (
    <Frame>
      {url && <img src={url} alt="" width={W} height={H} className="block h-full w-full object-cover" />}
    </Frame>
  );
}

/** Flag plus the mono jurisdiction code, e.g. [flag] US-CO. */
export function Jurisdiction({ code, className }: { code: string | null | undefined; className?: string }) {
  if (!code) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap font-mono text-meta text-tx-secondary ${className ?? ""}`}>
      <Flag code={code} />
      {code}
    </span>
  );
}
