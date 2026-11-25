/** Shell: the notice shows at every width, tabs replace the rail, "/" focuses search. */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Shell } from "../components/layout/Shell";

function renderShell(path = "/") {
  vi.stubGlobal("fetch", vi.fn(() => new Promise(() => {}))); // queries stay loading
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<p>home page</p>} />
            <Route path="about" element={<p id="sources">about page</p>} />
            <Route path="sources" element={<Navigate to="/about#sources" replace />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => vi.unstubAllGlobals());

describe("Shell", () => {
  it("shows the notice banner and the six tabs", () => {
    renderShell();
    expect(screen.getByText(/Not legal advice/)).toBeInTheDocument();
    for (const tab of ["Watch", "Laws", "Standards", "Incidents", "All sources"]) {
      expect(screen.getAllByRole("link", { name: tab }).length).toBeGreaterThan(0);
    }
    expect(screen.getAllByRole("link", { name: "About" }).length).toBeGreaterThan(0);
  });

  it("survives navigation when scrollTo returns a Promise (as newer Chromium does)", async () => {
    const scroll = vi.spyOn(window, "scrollTo").mockImplementation((() => Promise.resolve()) as never);
    renderShell("/sources");
    expect(await screen.findByText("about page")).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("link", { name: "Watch" })[0]);
    expect(await screen.findByText("home page")).toBeInTheDocument();
    scroll.mockRestore();
  });

  it("focuses search on '/' but not while typing in a field", () => {
    renderShell();
    const [search] = screen.getAllByRole("searchbox");
    fireEvent.keyDown(document.body, { key: "/" });
    expect(search).toHaveFocus();
    search.blur();
    const other = document.createElement("input");
    document.body.appendChild(other);
    other.focus();
    fireEvent.keyDown(other, { key: "/" });
    expect(other).toHaveFocus();
    other.remove();
  });
});
