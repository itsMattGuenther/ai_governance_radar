/** Page passes: Laws order and nesting, All Sources tabs, Standards counters. */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Items from "../pages/Items";
import Regulations from "../pages/Regulations";
import Standards from "../pages/Standards";
import type { EntityOut } from "../lib/types";
import { makeLaw } from "./fixtures";

const day = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

const LAWS = [
  makeLaw("texas-traiga", "Texas Responsible AI Governance Act", { code: "US-TX",
    events: [{ occurred_at: "2026-01-01T00:00:00" }] }),
  makeLaw("utah-ai-policy-act", "Utah AI Policy Act", { code: "US-UT",
    milestones: [{ date: day(218), kind: "expires", label: "Repealed unless extended" }] }),
  makeLaw("colorado-ai-act", "Colorado AI Act (SB 24-205)", { status: "amended", superseded_by: "colorado-sb-26-189" }),
  makeLaw("eu-ai-act", "EU AI Act", { code: "EU",
    milestones: [{ date: day(7), kind: "obligations_apply", label: "New prohibitions apply" }] }),
  makeLaw("colorado-sb-26-189", "Colorado SB 26-189", { status: "signed",
    milestones: [{ date: day(37), kind: "takes_effect", label: "Takes effect" }] }),
  makeLaw("illinois-hb-3773", "Illinois HB 3773", { code: "US-IL",
    events: [{ occurred_at: "2026-06-26T00:00:00" }] }),
];

const standard = (slug: string, status: string): EntityOut => ({
  ...makeLaw(slug, slug.toUpperCase()), entity_type: "standard", regulation: null,
  standard: { publisher: "NIST", version: "1.0", status, published_at: "2023-01-26T00:00:00",
    last_updated_at: null, change_magnitude: "major", related_framework_slugs: [],
    official_source_url: "https://example.gov" },
});

const calls: string[] = [];

function stubApi() {
  calls.length = 0;
  vi.stubGlobal("fetch", vi.fn(async (url: string) => {
    calls.push(url);
    const path = url.replace(/\?.*$/, "");
    const body =
      path === "/api/regulations" ? LAWS
      : path === "/api/standards" ? [standard("nist-ai-rmf", "final"), standard("owasp", "updated")]
      : path === "/api/items" ? { items: [], total: 0, offset: 0, limit: 25 }
      : [];
    return new Response(JSON.stringify(body), { status: 200 });
  }));
}

function renderPage(page: React.ReactNode, path = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{page}</MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Laws", () => {
  it("sorts by next date, then latest change, and nests a superseded law under its successor", async () => {
    stubApi();
    renderPage(<Regulations />);
    const table = (await screen.findAllByRole("table"))[0];
    const names = within(table).getAllByRole("link").map((a) => a.textContent);
    expect(names).toEqual([
      "EU AI Act", "Colorado SB 26-189", "Colorado AI Act (SB 24-205)", "Utah AI Policy Act",
      "Illinois HB 3773", "Texas Responsible AI Governance Act",
    ]);
    expect(within(table).getByText("Replaced by Colorado SB 26-189")).toBeInTheDocument();
  });

  it("phone rows give every law its stage and its next date", async () => {
    stubApi();
    renderPage(<Regulations />);
    await screen.findAllByRole("table");
    const list = document.querySelector(".md\\:hidden")!;
    const rows = within(list as HTMLElement).getAllByRole("link");
    expect(rows).toHaveLength(LAWS.length);
    for (const row of rows) {
      expect(within(row).getAllByRole("img", { name: /Stage \d of 5|Superseded|not one of the five/ }).length).toBeGreaterThan(0);
    }
    expect(within(list as HTMLElement).getByText("7 days")).toBeInTheDocument();
    expect(within(list as HTMLElement).getAllByText("No date ahead recorded")).toHaveLength(2);
  });
});

describe("All sources", () => {
  it("opens on government and standards bodies (tier 1)", async () => {
    stubApi();
    renderPage(<Items />, "/items");
    expect(screen.getByRole("tab", { name: "Government and standards bodies" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(calls.some((u) => u.startsWith("/api/items") && u.includes("tier=1"))).toBe(true));
  });

  it("the All tab drops the tier filter, so Home's count equals the list", async () => {
    stubApi();
    renderPage(<Items />, "/items?tier=all");
    await waitFor(() => expect(calls.some((u) => u.startsWith("/api/items"))).toBe(true));
    expect(calls.filter((u) => u.startsWith("/api/items")).every((u) => !u.includes("tier="))).toBe(true);
  });
});

describe("Standards", () => {
  it("counts only statuses that occur and drops change magnitude", async () => {
    stubApi();
    renderPage(<Standards />, "/standards");
    expect(await screen.findByText(/2 standards and frameworks: 1 final · 1 updated/)).toBeInTheDocument();
    expect(screen.queryByText(/draft|withdrawn|public comment/i)).toBeNull();
    expect(screen.queryByText(/magnitude/i)).toBeNull();
  });
});
