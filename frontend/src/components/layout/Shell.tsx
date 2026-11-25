/** App shell (DESIGN_SYSTEM.md §6): notice banner, top bar with tabs and search
 * (`/` focuses it), status strip, and a bottom tab bar on phones. No side rail. */

import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, BookOpenCheck, Landmark, LayoutGrid, Newspaper, Search, X } from "lucide-react";
import clsx from "clsx";

import { useRegulations, useSnapshotMeta, useSources } from "../../lib/api";
import { STATIC_MODE } from "../../lib/env";
import { absDate, parseTimestamp, utcStamp } from "../../lib/format";
import { recordsChecked } from "../../lib/records";
import { RadarLogo } from "../ui/RadarLogo";

const TABS = [
  { to: "/", label: "Watch", end: true },
  { to: "/regulatory", label: "Laws" },
  { to: "/standards", label: "Standards" },
  { to: "/incidents", label: "Incidents" },
  { to: "/items", label: "All sources" },
  { to: "/about", label: "About" },
  ...(STATIC_MODE ? [] : [{ to: "/settings", label: "Settings" }]),
];

const PHONE_TABS = [
  { to: "/", label: "Watch", icon: LayoutGrid, end: true },
  { to: "/regulatory", label: "Laws", icon: Landmark },
  { to: "/standards", label: "Standards", icon: BookOpenCheck },
  { to: "/incidents", label: "Incidents", icon: AlertTriangle },
  { to: "/items", label: "All", icon: Newspaper },
];

/** The public site is rebuilt by .github/workflows/publish.yml every 6 hours. */
const PUBLIC_REFRESH_HOURS = 6;

/** Where the source list with health lives. */
const SOURCES_PATH = STATIC_MODE ? "/about#sources" : "/settings";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "");

const WIDTH = "mx-auto w-full max-w-[1360px] px-3 sm:px-4 lg:px-5";

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

function SearchBox({
  inputRef,
  onDone,
  className,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  onDone?: () => void;
  className?: string;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  return (
    <form
      role="search"
      className={clsx("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        if (!q.trim()) return;
        navigate(`/search?q=${encodeURIComponent(q.trim())}`);
        inputRef.current?.blur();
        onDone?.();
      }}
    >
      <Search aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-tx-muted" />
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.currentTarget.blur();
            onDone?.();
          }
        }}
        placeholder="Search"
        aria-label="Search laws, standards, incidents and sources"
        aria-keyshortcuts="/"
        className="w-full rounded-ctl border border-bd-subtle bg-bg-base py-1.5 pl-8 pr-8 text-sm text-tx-primary placeholder:text-tx-muted focus:border-accent"
      />
      <kbd
        aria-hidden
        className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-code border border-bd-subtle px-1.5 font-mono text-meta leading-4 text-tx-muted md:block"
      >
        /
      </kbd>
    </form>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label="AI Governance Radar, home">
      <RadarLogo size={20} />
      <span className="text-[14px] font-semibold tracking-tight text-tx-primary">AI Governance</span>
      <span className="font-mono text-code font-medium tracking-[0.3em] text-accent">RADAR</span>
    </Link>
  );
}

function StatusStrip() {
  const meta = useSnapshotMeta();
  const sources = useSources();
  const laws = useRegulations();

  const enabled = sources.data?.filter((s) => s.enabled) ?? [];
  // OK: collected at least once and not failing now.
  const ok = enabled.filter((s) => s.last_success_at && !s.last_error).length;
  const allOk = ok === enabled.length;
  // Local app: the newest successful collection. Public site: when it was built.
  const dataTime = STATIC_MODE
    ? meta.data?.generated_at
    : enabled
        .map((s) => s.last_success_at)
        .filter((t): t is string => !!t)
        .sort((a, b) => parseTimestamp(b).getTime() - parseTimestamp(a).getTime())[0];
  const hours = enabled.map((s) => s.polling_interval_minutes / 60);
  const refresh = STATIC_MODE
    ? `Refreshes every ${PUBLIC_REFRESH_HOURS} h`
    : hours.length
      ? `Sources poll every ${Math.min(...hours)}–${Math.max(...hours)} h`
      : null;
  const checked = laws.data ? recordsChecked(laws.data) : null;

  return (
    <div className="border-b border-bd-subtle">
      <p className={clsx(WIDTH, "flex flex-wrap gap-x-5 gap-y-0.5 py-1.5 font-mono text-meta uppercase text-tx-muted")}>
        <span>
          Data as of <b className="font-medium text-tx-secondary">{dataTime ? utcStamp(dataTime) : "—"}</b>
        </span>
        {refresh && <span>{refresh}</span>}
        {sources.data && (
          <Link to={SOURCES_PATH} className="hover:text-tx-secondary">
            Sources{" "}
            <b className={clsx("font-medium", allOk ? "text-sev-positive" : "text-sev-high")}>
              <span aria-hidden>{allOk ? "●" : "▲"}</span> {ok}/{enabled.length} OK
            </b>
          </Link>
        )}
        {checked && (
          <>
            <span>
              Records checked <b className="font-medium text-tx-secondary">{absDate(checked.checked)}</b>
            </span>
            <span>
              Next check due <b className="font-medium text-tx-secondary">{absDate(checked.due)}</b>
            </span>
          </>
        )}
      </p>
    </div>
  );
}

/** Keep the canonical link and og:url on the page being viewed (public build only). */
function useCanonical() {
  const { pathname } = useLocation();
  useEffect(() => {
    if (!SITE_URL) return;
    const url = `${SITE_URL}${pathname}`;
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
    document.querySelector('meta[property="og:url"]')?.setAttribute("content", url);
  }, [pathname]);
}

export function Shell() {
  const searchRef = useRef<HTMLInputElement>(null);
  const phoneSearchRef = useRef<HTMLInputElement>(null);
  const [phoneSearch, setPhoneSearch] = useState(false);
  const { pathname, hash } = useLocation();
  useCanonical();

  // New page: back to the top, or to the section a #hash names. (No value may leak out
  // of the effect: scrollTo returns a Promise in some browsers, which React would take
  // for a cleanup function and call.)
  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return;
    }
    const frame = requestAnimationFrame(() => document.getElementById(hash.slice(1))?.scrollIntoView());
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  // "/" focuses search from anywhere except a text field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || isTyping(e.target)) return;
      e.preventDefault();
      if (window.matchMedia?.("(min-width: 768px)").matches ?? true) searchRef.current?.focus();
      else setPhoneSearch(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (phoneSearch) phoneSearchRef.current?.focus();
  }, [phoneSearch]);

  return (
    <div className="flex min-h-screen flex-col bg-bg-base">
      <a
        href="#main"
        className="sr-only z-50 rounded-ctl bg-bg-raised px-3 py-2 text-sm text-tx-primary focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <p className="bg-notice px-3 py-1 text-center font-mono text-code uppercase leading-snug tracking-[0.1em] text-sev-watch">
        Open-source data · Not legal advice · Verify against the linked official source
      </p>

      <header className="sticky top-0 z-30 border-b border-bd-subtle bg-bg-surface">
        <div className={clsx(WIDTH, "flex h-12 items-center gap-5")}>
          {phoneSearch ? (
            <div className="flex flex-1 items-center gap-2 md:hidden">
              <SearchBox inputRef={phoneSearchRef} onDone={() => setPhoneSearch(false)} className="flex-1" />
              <button
                type="button"
                onClick={() => setPhoneSearch(false)}
                aria-label="Close search"
                className="rounded-ctl p-1.5 text-tx-secondary hover:text-tx-primary"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <Brand />
          )}
          <nav aria-label="Primary" className="hidden min-w-0 md:block">
            <ul className="flex gap-1">
              {TABS.map(({ to, label, end }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      clsx(
                        "block whitespace-nowrap rounded-ctl px-2.5 py-1 text-sm",
                        isActive
                          ? "bg-accent/[.14] font-semibold text-tx-primary"
                          : "font-medium text-tx-secondary hover:text-tx-primary",
                      )
                    }
                  >
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
          <SearchBox inputRef={searchRef} className="ml-auto hidden w-56 md:block lg:w-64" />
          {!phoneSearch && (
            <div className="ml-auto flex items-center gap-1 md:hidden">
              <button
                type="button"
                onClick={() => setPhoneSearch(true)}
                aria-label="Search"
                className="rounded-ctl p-2 text-tx-secondary hover:text-tx-primary"
              >
                <Search aria-hidden className="h-4 w-4" />
              </button>
              <NavLink
                to="/about"
                className={({ isActive }) =>
                  clsx("rounded-ctl px-2 py-1 text-sm font-medium", isActive ? "text-tx-primary" : "text-tx-secondary")
                }
              >
                About
              </NavLink>
              {!STATIC_MODE && (
                <NavLink to="/settings" className="rounded-ctl px-2 py-1 text-sm font-medium text-tx-secondary">
                  Settings
                </NavLink>
              )}
            </div>
          )}
        </div>
      </header>

      <StatusStrip />

      <main id="main" className={clsx(WIDTH, "flex-1 pb-24 pt-4 md:pb-10")}>
        <Outlet />
      </main>

      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-bd-subtle bg-bg-surface pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <ul className="flex">
          {PHONE_TABS.map(({ to, label, icon: Icon, end }) => (
            <li key={to} className="flex-1">
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  clsx(
                    "flex flex-col items-center gap-0.5 py-2 text-meta",
                    isActive ? "font-semibold text-accent" : "text-tx-secondary",
                  )
                }
              >
                <Icon aria-hidden className="h-4 w-4" />
                {label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
