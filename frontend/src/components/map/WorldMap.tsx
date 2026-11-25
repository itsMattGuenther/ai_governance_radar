/** Coverage map for the Laws page (DESIGN_SYSTEM.md §9): flat land, flat markers, no
 * glow. Colour means how many records this site tracks for a country, never "good" or
 * "bad", and the metric is named beside it. Every country with records is also in the
 * list next to the map, which is the text alternative and the keyboard route. */

import { useMemo, useState } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
// 110m keeps the page light; it has no polygon for micro-states such as Singapore,
// which get their marker from FIXED below. This module is loaded only on the Laws page.
import world from "world-atlas/countries-110m.json";

import { T } from "../../lib/tokens";
import type { MapRow } from "../../lib/types";

const W = 640;
const H = 270;
const LAND = "#222C35";
const ANTARCTICA = "010";

/** Where to put a marker when the country has no polygon to take a centroid from. */
const FIXED: Record<string, [number, number]> = {
  EU: [4.35, 50.85], // Brussels
  SG: [103.82, 1.35],
};

/** Fill by number of tracked records: 1, 2–3, 4 or more. */
const SHADES: [number, string, string][] = [
  [4, `${T.accent}D9`, "4 or more"],
  [2, `${T.accent}8C`, "2–3"],
  [1, `${T.accent}4D`, "1"],
];

function shade(n: number): string {
  if (n <= 0) return LAND;
  return SHADES.find(([min]) => n >= min)![1];
}

function describe(row: MapRow): string {
  const parts = [
    row.binding ? `${row.binding} law${row.binding === 1 ? "" : "s"}` : null,
    row.guidance ? `${row.guidance} standard${row.guidance === 1 ? "" : "s"} or framework${row.guidance === 1 ? "" : "s"}` : null,
  ].filter(Boolean);
  return parts.join(", ") || "no records";
}

export function CoverageMap({ rows, onSelect }: { rows: MapRow[]; onSelect: (row: MapRow) => void }) {
  const [hover, setHover] = useState<{ row: MapRow; x: number; y: number } | null>(null);

  const { features, path, project, centroids } = useMemo(() => {
    const topo = world as unknown as Parameters<typeof feature>[0];
    const countries = (topo as unknown as { objects: { countries: Parameters<typeof feature>[1] } }).objects.countries;
    const fc = feature(topo, countries) as unknown as FeatureCollection<Geometry, { name: string }>;
    const land = fc.features.filter((f) => String(f.id).padStart(3, "0") !== ANTARCTICA);
    const projection = geoNaturalEarth1().fitSize([W, H], { ...fc, features: land });
    const p = geoPath(projection);
    const cents = new Map<string, [number, number]>();
    land.forEach((f) => {
      const c = p.centroid(f);
      if (Number.isFinite(c[0])) cents.set(String(f.id ?? "").padStart(3, "0"), c as [number, number]);
    });
    return { features: land, path: p, project: projection, centroids: cents };
  }, []);

  const byIso = useMemo(() => {
    const m = new Map<string, MapRow>();
    rows.forEach((r) => r.iso_numeric && m.set(r.iso_numeric.padStart(3, "0"), r));
    return m;
  }, [rows]);

  // Markers for countries with records of their own; EU member states are shaded for
  // the EU's records but marked once, at the EU.
  const own = rows.filter((r) => r.instruments > 0 && r.via.length === 0);
  const point = (r: MapRow): [number, number] | null => {
    if (FIXED[r.code]) return project(FIXED[r.code]) as [number, number];
    return r.iso_numeric ? (centroids.get(r.iso_numeric.padStart(3, "0")) ?? null) : null;
  };
  const listed = [...own].sort((a, b) => b.instruments - a.instruments || a.name.localeCompare(b.name));

  return (
    <div className="grid gap-x-6 gap-y-3 md:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label="World map of the records this site tracks, by country. The same counts are listed beside it."
          className="block h-auto w-full"
          onMouseLeave={() => setHover(null)}
        >
          {features.map((f) => {
            const iso = String(f.id ?? "").padStart(3, "0");
            const row = byIso.get(iso);
            return (
              <path
                key={iso + (f.properties?.name ?? "")}
                d={path(f) ?? undefined}
                fill={shade(row?.instruments ?? 0)}
                stroke={T.bgSurface}
                strokeWidth={0.4}
                aria-hidden
              />
            );
          })}
          {own.map((r) => {
            const c = point(r);
            if (!c) return null;
            return (
              <circle
                key={r.code}
                cx={c[0]}
                cy={c[1]}
                r={r.instruments >= 4 ? 5 : 3.5}
                fill={T.accent}
                stroke={T.bgSurface}
                strokeWidth={1}
                className="cursor-pointer"
                aria-hidden
                onClick={() => onSelect(r)}
                onMouseEnter={() => setHover({ row: r, x: c[0], y: c[1] })}
              />
            );
          })}
        </svg>
        {hover && (
          <div
            role="tooltip"
            className="pointer-events-none absolute z-10 whitespace-nowrap rounded-ctl border border-bd-strong bg-bg-raised px-2 py-1 text-xs"
            style={{ left: `${(hover.x / W) * 100}%`, top: `${(hover.y / H) * 100}%`, transform: "translate(-50%, -125%)" }}
          >
            <span className="font-medium text-tx-primary">{hover.row.name}</span>
            <span className="text-tx-secondary"> · {describe(hover.row)}</span>
          </div>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-xs text-tx-secondary">
          <span className="font-medium text-tx-primary">Tracked records by country.</span> Shading counts
          the laws, standards and frameworks on this site, not how much a country regulates. EU member
          states are shaded for EU law.
        </p>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-meta text-tx-muted" aria-hidden>
          {[...SHADES].reverse().map(([, color, label]) => (
            <span key={label} className="inline-flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded-[2px]" style={{ background: color }} />
              {label}
            </span>
          ))}
        </p>
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Tracked records by country">
          {listed.map((r) => (
            <li key={r.code}>
              <button
                type="button"
                onClick={() => onSelect(r)}
                onFocus={() => {
                  const c = point(r);
                  if (c) setHover({ row: r, x: c[0], y: c[1] });
                }}
                onBlur={() => setHover(null)}
                title={describe(r)}
                className="rounded-ctl border border-bd-subtle px-2 py-0.5 text-xs text-tx-secondary hover:border-bd-strong hover:text-tx-primary"
              >
                {r.name} <span className="num text-tx-muted">{r.instruments}</span>
                <span className="sr-only">: {describe(r)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
