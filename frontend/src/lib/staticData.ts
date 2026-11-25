/** Static public build (DEC-029): answers the app's queries from the JSON snapshot
 * that `radar export-static` publishes next to the SPA under `data/`. Filters,
 * sorting, and search mirror the backend endpoints, so pages behave the same as in
 * the local app. The snapshot never contains demo data. */

import type { ItemFilters } from "./api";
import { ApiError } from "./errors";
import { parseTimestamp } from "./format";
import type {
  DashboardSummary,
  EntityBrief,
  EntityOut,
  IncidentOut,
  ItemOut,
  JurisdictionOut,
  MapRow,
  PageOut,
  SearchOut,
  SourceOut,
} from "./types";

/** ItemOut plus the fields the client-side filters need (added by the exporter). */
type SnapshotItem = ItemOut & {
  source_id: number;
  is_page_change: boolean;
  is_cluster_primary: boolean;
};

export interface SnapshotMeta {
  generated_at: string;
  version: string;
  items_exported: number;
  items_total: number;
}

const files = new Map<string, Promise<unknown>>();

function load<T>(name: string): Promise<T> {
  let file = files.get(name);
  if (!file) {
    file = fetch(`${import.meta.env.BASE_URL}data/${name}.json`).then((res) => {
      if (!res.ok) throw new ApiError(res.status, `Could not load ${name}.json (${res.status})`);
      return res.json();
    });
    file.catch(() => files.delete(name)); // a retry fetches again
    files.set(name, file);
  }
  return file as Promise<T>;
}

/* ---------------- items ---------------- */

type ItemIndex = {
  rows: SnapshotItem[];
  byId: Map<number, SnapshotItem>;
  /** Publication time (collection time when undated), ms — the backend's EVENT_TIME. */
  eventAt: Map<number, number>;
  seenAt: Map<number, number>;
};

let itemIndex: Promise<ItemIndex> | null = null;

function loadItems(): Promise<ItemIndex> {
  itemIndex ??= load<SnapshotItem[]>("items").then((rows) => ({
    rows,
    byId: new Map(rows.map((i) => [i.id, i])),
    eventAt: new Map(rows.map((i) => [i.id, parseTimestamp(i.published_at ?? i.first_seen_at).getTime()])),
    seenAt: new Map(rows.map((i) => [i.id, parseTimestamp(i.first_seen_at).getTime()])),
  }));
  itemIndex.catch(() => (itemIndex = null));
  return itemIndex;
}

export async function items(f: ItemFilters): Promise<PageOut> {
  const { rows, eventAt, seenAt } = await loadItems();
  const at = (i: SnapshotItem) => eventAt.get(i.id) ?? 0;
  const seen = (i: SnapshotItem) => seenAt.get(i.id) ?? 0;
  const since = f.since ? parseTimestamp(f.since).getTime() : null;

  const matches = rows.filter(
    (i) =>
      (!f.category || i.categories.includes(f.category)) &&
      (!f.jurisdiction || i.jurisdiction_code === f.jurisdiction) &&
      (f.min_impact === undefined || i.impact_score >= f.min_impact) &&
      (!f.confidence || i.confidence === f.confidence) &&
      (f.source_id === undefined || i.source_id === f.source_id) &&
      (f.entity_id === undefined || i.entities.some((e) => e.id === f.entity_id)) &&
      (since === null || at(i) >= since) &&
      (f.include_demo !== false || !i.is_demo) &&
      (f.include_page_changes !== false || !i.is_page_change) &&
      (!f.collapse_clusters || i.is_cluster_primary),
  );
  const order = {
    newest: (a: SnapshotItem, b: SnapshotItem) => at(b) - at(a) || b.id - a.id,
    impact: (a: SnapshotItem, b: SnapshotItem) => b.impact_score - a.impact_score || b.id - a.id,
    first_seen: (a: SnapshotItem, b: SnapshotItem) => seen(b) - seen(a) || b.id - a.id,
  }[f.sort ?? "newest"];
  matches.sort(order);

  const offset = f.offset ?? 0;
  const limit = f.limit ?? 25;
  return { items: matches.slice(offset, offset + limit), total: matches.length, offset, limit };
}

export async function item(id: number): Promise<ItemOut> {
  const found = (await loadItems()).byId.get(id);
  if (!found) throw new ApiError(404, "Item not found");
  return found;
}

export async function clusterMembers(id: number): Promise<ItemOut[]> {
  const { rows, byId, seenAt } = await loadItems();
  const found = byId.get(id);
  if (!found) throw new ApiError(404, "Item not found");
  if (found.cluster_id === null) return [found];
  return rows
    .filter((i) => i.cluster_id === found.cluster_id)
    .sort((a, b) => a.source_tier - b.source_tier || (seenAt.get(a.id) ?? 0) - (seenAt.get(b.id) ?? 0));
}

/* ---------------- curated records ---------------- */

const inCountry = (code: string | null, country: string) =>
  code === country || (code?.startsWith(`${country}-`) ?? false);

export async function regulations(
  f: { country?: string; status?: string; jurisdiction?: string },
): Promise<EntityOut[]> {
  const all = await load<EntityOut[]>("entities");
  return all.filter(
    (e) =>
      e.regulation &&
      (!f.jurisdiction || e.jurisdiction_code === f.jurisdiction) &&
      (!f.country || inCountry(e.jurisdiction_code, f.country)) &&
      (!f.status || e.regulation.status === f.status),
  );
}

export async function standards(
  f: { publisher?: string; status?: string; country?: string },
): Promise<EntityOut[]> {
  const all = await load<EntityOut[]>("entities");
  return all.filter(
    (e) =>
      e.standard &&
      (!f.publisher || e.standard.publisher === f.publisher) &&
      (!f.status || e.standard.status === f.status) &&
      (!f.country || inCountry(e.jurisdiction_code, f.country)),
  );
}

export async function entity(slug: string): Promise<EntityOut> {
  const found = (await load<EntityOut[]>("entities")).find((e) => e.slug === slug);
  if (!found) throw new ApiError(404, "Entity not found");
  return found;
}

const SEVERITY_ORDER: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

export async function incidents(
  f: { severity?: string; category?: string; sort?: "newest" | "severity" },
): Promise<IncidentOut[]> {
  const reported = (i: IncidentOut) => parseTimestamp(i.reported_at).getTime();
  const rows = (await load<IncidentOut[]>("incidents")).filter(
    (i) => (!f.severity || i.severity === f.severity) && (!f.category || i.category === f.category),
  );
  return rows.sort((a, b) =>
    f.sort === "severity"
      ? (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9) || reported(b) - reported(a)
      : reported(b) - reported(a),
  );
}

export async function incident(id: string): Promise<IncidentOut> {
  const found = (await load<IncidentOut[]>("incidents")).find((i) => i.id === Number(id));
  if (!found) throw new ApiError(404, "Incident not found");
  return found;
}

/* ---------------- search ---------------- */

const words = (text: string) => text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

/** Mirrors /api/search: every query term must prefix-match a word in the item's
 * title, excerpt, or linked entity names (the FTS5 query the backend builds);
 * entities and incidents match the whole query as a substring. */
export async function search(q: string): Promise<SearchOut> {
  const [{ rows, eventAt }, allEntities, allIncidents] = await Promise.all([
    loadItems(),
    load<EntityOut[]>("entities"),
    load<IncidentOut[]>("incidents"),
  ]);
  const terms = words(q).slice(0, 8);
  const needle = q.trim().toLowerCase();

  const hits = terms.length
    ? rows.flatMap((i) => {
        const title = words(i.title);
        const body = [...title, ...words(i.excerpt ?? ""), ...i.entities.flatMap((e) => words(e.name))];
        if (!terms.every((t) => body.some((w) => w.startsWith(t)))) return [];
        const inTitle = terms.filter((t) => title.some((w) => w.startsWith(t))).length;
        return [{ i, inTitle }];
      })
    : [];
  hits.sort((a, b) => b.inTitle - a.inTitle || (eventAt.get(b.i.id) ?? 0) - (eventAt.get(a.i.id) ?? 0));

  const entities: EntityBrief[] = allEntities
    .filter((e) => e.name.toLowerCase().includes(needle) || e.slug.toLowerCase().includes(needle))
    .slice(0, 25)
    .map(({ id, slug, name, entity_type, jurisdiction_code, current_status }) => ({
      id, slug, name, entity_type, jurisdiction_code, current_status,
    }));
  const incidentHits = allIncidents
    .filter((i) => i.title.toLowerCase().includes(needle) || i.what_happened.toLowerCase().includes(needle))
    .slice(0, 25);

  return { query: q, items: hits.slice(0, 50).map((h) => h.i), entities, incidents: incidentHits };
}

/* ---------------- dashboard + reference data ---------------- */

export const summary = () => load<DashboardSummary>("summary");
export const map = () => load<MapRow[]>("map");
export const sources = () => load<SourceOut[]>("sources");
export const jurisdictions = () => load<JurisdictionOut[]>("jurisdictions");
export const meta = () => load<SnapshotMeta>("meta");
