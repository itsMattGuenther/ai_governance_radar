/** Primitive render tests: every state carries a word (never colour alone), stage
 * tracks are labelled, day counts follow the 60-day rule. */

import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { ItemRow } from "../components/items/ItemRow";
import {
  ConfidenceBadge,
  DemoBadge,
  EventChip,
  FactStatusBadge,
  SeverityBadge,
  StatusPill,
  TierBadge,
} from "../components/ui/Badge";
import { Chip, DayCount } from "../components/ui/Chip";
import { CodeTile, sourceCode } from "../components/ui/CodeTile";
import { Flag, Jurisdiction } from "../components/ui/Flag";
import { Panel } from "../components/ui/Panel";
import { DateCell, Row } from "../components/ui/Row";
import { LawStage } from "../components/ui/StageTrack";
import { EmptyState, ErrorState } from "../components/ui/States";
import { Tile } from "../components/ui/Tile";
import type { ItemOut } from "../lib/types";

const NOW = new Date("2026-11-25T15:00:00Z");

describe("Chip and DayCount", () => {
  it("chips carry their word and tone", () => {
    render(<Chip tone="watch">Signed</Chip>);
    expect(screen.getByText("Signed")).toHaveClass("text-sev-watch");
  });
  it("day count is amber within 60 days", () => {
    render(<DayCount date="2026-12-02" now={NOW} />);
    expect(screen.getByText("7 days")).toHaveClass("text-sev-watch");
  });
  it("day count is quiet beyond 60 days", () => {
    render(<DayCount date="2027-08-02" now={NOW} />);
    expect(screen.getByText("250 days")).toHaveClass("text-tx-secondary");
  });
  it("day count is absent for past dates and says Today on the day", () => {
    const { container } = render(<DayCount date="2026-11-24" now={NOW} />);
    expect(container).toBeEmptyDOMElement();
    render(<DayCount date="2026-11-25" now={NOW} />);
    expect(screen.getByText("Today")).toBeInTheDocument();
  });
});

describe("LawStage", () => {
  it("labels the track for screen readers and fills it to the stage", () => {
    render(<LawStage regulation={{ status: "signed", superseded_by: null }} />);
    expect(screen.getByRole("img", { name: "Stage 3 of 5: signed" })).toBeInTheDocument();
    expect(screen.getByText("Signed")).toBeInTheDocument();
  });
  it("calls effective 'In force' and enforcement 'Enforced'", () => {
    render(<LawStage regulation={{ status: "effective", superseded_by: null }} />);
    render(<LawStage regulation={{ status: "enforcement", superseded_by: null }} />);
    expect(screen.getByRole("img", { name: "Stage 4 of 5: in force" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Stage 5 of 5: enforced" })).toBeInTheDocument();
  });
  it("shows a superseded law as superseded, whatever its status", () => {
    render(<LawStage regulation={{ status: "amended", superseded_by: "colorado-sb-26-189" }} />);
    expect(screen.getByRole("img", { name: "Superseded" })).toBeInTheDocument();
    expect(screen.getByText("✕ Superseded")).toBeInTheDocument();
  });
  it("never infers a stage for other statuses", () => {
    render(<LawStage regulation={{ status: "amended", superseded_by: null }} />);
    expect(screen.getByRole("img", { name: /amended; not one of the five stages/i })).toBeInTheDocument();
  });
});

describe("semantic chips", () => {
  it("severity, fact status, confidence and tier read as words", () => {
    render(
      <>
        <SeverityBadge severity="medium" />
        <FactStatusBadge status="alleged" />
        <ConfidenceBadge confidence="medium" notes={["Last checked 120 days ago."]} />
        <TierBadge tier={1} />
        <StatusPill status="public_comment" kind="standard" />
        <EventChip type="document_updated" />
      </>,
    );
    expect(screen.getByText("Medium")).toHaveClass("text-sev-watch");
    expect(screen.getByText("Alleged")).toHaveClass("text-sev-high");
    expect(screen.getByText("Confidence lowered: medium")).toBeInTheDocument();
    expect(screen.getByTitle(/primary authoritative/)).toHaveTextContent("Tier 1");
    expect(screen.getByText("Public comment")).toBeInTheDocument();
    expect(screen.getByText("Updated")).toHaveClass("text-sev-emerging");
  });
  it("confirmed facts and high confidence stay quiet", () => {
    render(<><FactStatusBadge status="confirmed" /><ConfidenceBadge confidence="high" /></>);
    expect(screen.getByText("Confirmed")).toHaveClass("text-tx-secondary");
    expect(screen.getByText("High confidence")).toHaveClass("text-tx-secondary");
  });
  it("demo data is marked explicitly; absent fact status renders nothing", () => {
    render(<DemoBadge show />);
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();
    const { container } = render(<FactStatusBadge status={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("panels, tiles, rows, codes", () => {
  it("Panel has a heading, a count and its body", () => {
    render(<Panel title="Dates ahead" marker="dates" meta="next 5">body</Panel>);
    expect(screen.getByRole("heading", { name: "Dates ahead" })).toBeInTheDocument();
    expect(screen.getByText("next 5")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });
  it("Tile shows value, unit and detail, and links when given a target", () => {
    render(
      <MemoryRouter>
        <Tile label="Next date" value={7} unit="days" detail="EU AI Act · 2 Dec 2026" hot to="/regulatory" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link")).toHaveAttribute("href", "/regulatory");
    expect(screen.getByText("7")).toHaveClass("text-sev-watch");
    expect(screen.getByText("days")).toBeInTheDocument();
  });
  it("DateCell shows the year only when it is not this year", () => {
    const year = new Date().getUTCFullYear();
    render(<><DateCell date={`${year}-12-02`} /><DateCell date={`${year + 1}-01-01`} /></>);
    expect(screen.getByText("02 DEC")).not.toHaveTextContent(String(year));
    expect(screen.getByText(String(year + 1))).toBeInTheDocument();
  });
  it("Row renders title, detail and one chip, and a soon tint", () => {
    const { container } = render(
      <Row title="Colorado SB 26-189" detail="Takes effect" chip={<Chip>37 days</Chip>} soon />,
    );
    expect(screen.getByText("Takes effect")).toBeInTheDocument();
    expect(container.firstChild).toHaveClass("bg-sev-watch/[.06]");
  });
  it("code tiles and source codes", () => {
    render(<CodeTile code={sourceCode("GOV.UK — AI announcements")} />);
    expect(screen.getByText("GOV.UK")).toBeInTheDocument();
    expect(sourceCode("Federal Register — Artificial Intelligence")).toBe("FED REG");
  });
  it("flags are square and decorative; the code carries the meaning", async () => {
    const { container } = render(<Jurisdiction code="EU" />);
    expect(screen.getByText("EU")).toBeInTheDocument();
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("alt", "");
    render(<Flag code="US-CO" />);
    await waitFor(() => expect(document.querySelector("svg")).not.toBeNull());
    const { container: none } = render(<Flag code="GLOBAL" />);
    expect(none).toBeEmptyDOMElement();
  });
});

describe("states", () => {
  it("EmptyState shows title, detail and action", () => {
    render(<EmptyState title="Nothing here" detail="Adjust filters" action={<button>Clear</button>} />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();
  });
  it("ErrorState is an alert with retry", () => {
    const retry = vi.fn();
    render(<ErrorState detail="HTTP 500" onRetry={retry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    screen.getByRole("button", { name: /retry/i }).click();
    expect(retry).toHaveBeenCalled();
  });
});

const item: ItemOut = {
  id: 1,
  url: "https://example.org/a",
  title: "New AI guidance to cut paperwork",
  excerpt: "Guidance released.",
  published_at: "2026-11-20T09:00:00",
  first_seen_at: "2026-11-20T10:00:00",
  last_seen_at: "2026-11-20T10:00:00",
  categories: ["regulation"],
  jurisdiction_code: "GB",
  change_type: "new",
  impact_score: 63,
  impact_factors: [{ factor: "Category: regulation", points: 30 }],
  confidence: "high",
  fact_status: null,
  cluster_id: 4,
  is_demo: false,
  source_name: "GOV.UK — AI announcements",
  source_tier: 1,
  entities: [],
  cluster_size: 3,
};

describe("ItemRow", () => {
  it("shows date, source code, title, detail and the report count — no score ring", () => {
    const onOpen = vi.fn();
    render(<MemoryRouter><ItemRow item={item} onOpen={onOpen} /></MemoryRouter>);
    expect(screen.getByText("20 NOV")).toBeInTheDocument();
    expect(screen.getByText("GOV.UK")).toBeInTheDocument();
    expect(screen.getByText("GOV.UK — AI announcements · GB · Regulation")).toBeInTheDocument();
    expect(screen.getByText("3 reports")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /impact/i })).toBeNull();
    screen.getByRole("button").click();
    expect(onOpen).toHaveBeenCalledWith(item);
  });
  it("marks demo items and keeps one chip", () => {
    render(<MemoryRouter><ItemRow item={{ ...item, is_demo: true }} onOpen={() => {}} /></MemoryRouter>);
    expect(screen.getByText("DEMO DATA")).toBeInTheDocument();
    expect(screen.queryByText("3 reports")).toBeNull();
  });
});
