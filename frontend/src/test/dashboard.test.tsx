/** Home: dates come from milestones only, and every panel has an error state. */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import Dashboard from "../pages/Dashboard";
import { makeLaw } from "./fixtures";

const soon = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
const later = new Date(Date.now() + 37 * 86_400_000).toISOString().slice(0, 10);

const LAWS = [
  makeLaw("eu-ai-act", "EU AI Act", {
    code: "EU", milestones: [{ date: soon, kind: "obligations_apply", label: "New prohibitions apply" }],
    events: [{ occurred_at: new Date().toISOString().slice(0, 19), summary: "Amended by a new regulation" }],
  }),
  makeLaw("colorado-sb-26-189", "Colorado SB 26-189 (Automated Decision-Making Technology)", {
    status: "signed", milestones: [{ date: later, kind: "takes_effect", label: "Takes effect" }],
  }),
  makeLaw("colorado-ai-act", "Colorado AI Act (SB 24-205)", {
    status: "amended", superseded_by: "colorado-sb-26-189",
    // A date in text but no milestone: it must not appear among the dates ahead.
  }),
];

function stubApi(fail = false) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (fail) return new Response(JSON.stringify({ detail: "boom" }), { status: 500 });
      const path = url.replace(/\?.*$/, "");
      const body =
        path === "/api/regulations" ? LAWS
        : path === "/api/standards" ? []
        : path === "/api/dashboard/summary"
          ? { since: new Date(Date.now() - 7 * 86_400_000).toISOString(), collected: 12, government: 0,
              page_changes: 1, others: { news: 11 } }
        : path === "/api/items" ? { items: [], total: 0, offset: 0, limit: 8 }
        : [];
      return new Response(JSON.stringify(body), { status: 200 });
    }),
  );
}

function renderHome() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <Dashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Watch board", () => {
  it("leads with the two nearest milestone dates and lists the laws by stage", async () => {
    stubApi();
    renderHome();
    await screen.findByText("New prohibitions apply");
    const nextTile = screen.getByText("Next date").closest("a")!;
    expect(within(nextTile).getByText("7")).toHaveClass("text-sev-watch");
    expect(within(nextTile).getByText(/EU AI Act/)).toBeInTheDocument();
    const thenTile = screen.getByText("Then").closest("a")!;
    expect(within(thenTile).getByText("37")).toBeInTheDocument();

    const dates = screen.getByRole("heading", { name: "Dates ahead" }).closest("section")!;
    expect(within(dates).getByText("New prohibitions apply")).toBeInTheDocument();
    expect(within(dates).queryByText(/Colorado AI Act/)).toBeNull();

    const laws = screen.getByRole("heading", { name: "Laws by stage" }).closest("section")!;
    const rows = within(laws).getAllByRole("link").map((a) => a.textContent);
    expect(rows[0]).toMatch(/Colorado SB 26-189/);
    expect(rows[rows.length - 1]).toMatch(/Replaced by Colorado SB 26-189/);

    const changes = screen.getByRole("heading", { name: "Record changes" }).closest("section")!;
    expect(within(changes).getByText("Amended by a new regulation")).toBeInTheDocument();

    const gov = screen.getByRole("heading", { name: "From government sources" }).closest("section")!;
    await waitFor(() => expect(within(gov).getByText(/Nothing from government sources/)).toBeInTheDocument());
    expect(within(gov).getByText(/11 news items · 1 page-change alert/)).toBeInTheDocument();
  });

  it("shows an error with a retry in every panel when the data can't load", async () => {
    stubApi(true);
    renderHome();
    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(4));
    expect(screen.getAllByRole("button", { name: /retry/i })).toHaveLength(4);
  });
});
