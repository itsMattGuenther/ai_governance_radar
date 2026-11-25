/** Settings, local app only (§50): sources and collection, adding a source, import and export. */

import { useRef, useState } from "react";
import { Download, Play, Upload } from "lucide-react";

import { PageHeader } from "../components/layout/PageHeader";
import { DemoBadge, TierBadge } from "../components/ui/Badge";
import { Panel } from "../components/ui/Panel";
import { CardSkeleton, ErrorState } from "../components/ui/States";
import {
  exportConfig,
  useCreateSource,
  useImportConfig,
  useIngestNow,
  usePatchSource,
  useSources,
} from "../lib/api";
import { utcStamp } from "../lib/format";

function SourceHealth() {
  const sources = useSources();
  const patch = usePatchSource();
  const ingest = useIngestNow();
  const [ingesting, setIngesting] = useState<number | "all" | null>(null);

  const run = (sourceId?: number) => {
    setIngesting(sourceId ?? "all");
    ingest.mutate(sourceId, { onSettled: () => setIngesting(null) });
  };

  return (
    <Panel
      title="Sources"
      marker="feed"
      meta={sources.data ? `${sources.data.filter((s) => s.enabled && !s.last_error).length}/${sources.data.filter((s) => s.enabled).length} OK` : undefined}
      action={
        <button
          type="button"
          onClick={() => run()}
          disabled={ingesting !== null}
          className="inline-flex items-center gap-1.5 rounded-ctl border border-accent/50 px-2.5 py-1 text-xs text-accent hover:bg-accent/10 disabled:opacity-50"
        >
          <Play aria-hidden className="h-3 w-3" />
          {ingesting === "all" ? "Collecting…" : "Collect all now"}
        </button>
      }
    >
      {sources.isPending ? (
        <CardSkeleton rows={5} />
      ) : sources.isError ? (
        <ErrorState detail={String(sources.error)} onRetry={() => sources.refetch()} />
      ) : (
        <ul>
          {sources.data.map((s) => (
            <li key={s.id} className="border-b border-bd-subtle px-3.5 py-2.5 last:border-b-0">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className={s.last_error ? "text-detail font-medium text-sev-critical" : "text-detail font-medium text-sev-positive"}>
                  <span aria-hidden>{s.last_error ? "▲ " : "● "}</span>
                  {s.last_error ? "Failing" : "OK"}
                </span>
                <span className="text-row font-medium text-tx-primary">{s.name}</span>
                <TierBadge tier={s.reliability_tier} />
                <DemoBadge show={s.is_demo} />
                <span className="ml-auto flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => run(s.id)}
                    disabled={ingesting !== null || !s.enabled}
                    className="text-xs text-tx-secondary hover:text-accent disabled:opacity-40"
                  >
                    {ingesting === s.id ? "Running…" : "Run"}
                  </button>
                  <label className="flex cursor-pointer items-center gap-1.5 text-xs text-tx-secondary">
                    <input
                      type="checkbox"
                      checked={s.enabled}
                      onChange={(e) => patch.mutate({ id: s.id, enabled: e.target.checked })}
                      className="accent-accent"
                    />
                    Enabled
                  </label>
                </span>
              </div>
              <p className="mt-0.5 text-detail text-tx-muted">
                {s.source_type} · every {s.polling_interval_minutes / 60} h · last collected{" "}
                <span className="num">{s.last_success_at ? utcStamp(s.last_success_at) : "never"}</span>
                {s.attribution && ` · ${s.attribution}`}
              </p>
              {s.last_error && <p className="mt-1 text-detail text-sev-critical">{s.last_error}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AddSource() {
  const create = useCreateSource();
  const [form, setForm] = useState({ name: "", url: "", feed_url: "", source_type: "rss", reliability_tier: 3 });
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    create.mutate(
      { ...form, feed_url: form.feed_url || null },
      {
        onSuccess: () => {
          setMessage({ ok: true, text: `Source “${form.name}” added.` });
          setForm({ name: "", url: "", feed_url: "", source_type: "rss", reliability_tier: 3 });
        },
        onError: (err) => setMessage({ ok: false, text: String(err) }),
      },
    );
  };

  const input = "w-full rounded-ctl border border-bd-subtle bg-bg-base px-2.5 py-1.5 text-xs text-tx-primary placeholder:text-tx-muted focus:border-accent";

  return (
    <Panel title="Add a source" marker="feed">
      <div className="p-3.5">
      <form onSubmit={submit} className="grid gap-2.5 sm:grid-cols-2">
        <label className="text-xs text-tx-secondary">
          Name
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={`mt-1 ${input}`} placeholder="e.g. ENISA News" />
        </label>
        <label className="text-xs text-tx-secondary">
          Site URL
          <input required type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} className={`mt-1 ${input}`} placeholder="https://…" />
        </label>
        <label className="text-xs text-tx-secondary">
          Feed URL (RSS/Atom/JSON; blank for page-watch)
          <input type="url" value={form.feed_url} onChange={(e) => setForm({ ...form, feed_url: e.target.value })} className={`mt-1 ${input}`} placeholder="https://…/rss.xml" />
        </label>
        <div className="grid grid-cols-2 gap-2.5">
          <label className="text-xs text-tx-secondary">
            Type
            <select value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} className={`mt-1 ${input}`}>
              <option value="rss">RSS</option>
              <option value="atom">Atom</option>
              <option value="page_watch">Page watch</option>
            </select>
          </label>
          <label className="text-xs text-tx-secondary">
            Tier
            <select value={form.reliability_tier} onChange={(e) => setForm({ ...form, reliability_tier: Number(e.target.value) })} className={`mt-1 ${input}`}>
              {[1, 2, 3, 4].map((t) => <option key={t} value={t}>Tier {t}</option>)}
            </select>
          </label>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={create.isPending}
            className="rounded-ctl border border-accent/50 px-3 py-1.5 text-xs text-accent transition-colors hover:bg-accent/10 disabled:opacity-50"
          >
            {create.isPending ? "Validating…" : "Add source"}
          </button>
          <p className="mt-1.5 text-meta text-tx-muted">
            URLs are security-validated (public hosts only). Sources you add start at your chosen reliability tier.
          </p>
          {message && (
            <p role="status" className={`mt-1.5 text-xs ${message.ok ? "text-sev-positive" : "text-sev-critical"}`}>
              {message.text}
            </p>
          )}
        </div>
      </form>
    </div>
    </Panel>
  );
}

function ImportExport() {
  const importConfig = useImportConfig();
  const fileRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);

  const doExport = async () => {
    const data = await exportConfig();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "radar-config.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const doImport = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      importConfig.mutate(data, {
        onSuccess: (r) => setMessage(`Imported: ${r.watches_added} watches added, ${r.sources_updated} sources updated.`),
        onError: (err) => setMessage(`Import failed: ${err}`),
      });
    } catch {
      setMessage("Import failed: not valid JSON.");
    }
  };

  return (
    <Panel title="Import and export" marker="changes">
      <div className="p-3.5">
      <p className="text-xs text-tx-muted">
        Move your source configuration between instances, or export collected items —
        no lock-in.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          onClick={doExport}
          className="inline-flex items-center gap-1.5 rounded-ctl border border-bd-strong px-3 py-1.5 text-xs text-tx-secondary transition-colors hover:border-accent hover:text-tx-primary"
        >
          <Download aria-hidden className="h-3.5 w-3.5" /> Export JSON
        </button>
        <button
          onClick={() => fileRef.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-ctl border border-bd-strong px-3 py-1.5 text-xs text-tx-secondary transition-colors hover:border-accent hover:text-tx-primary"
        >
          <Upload aria-hidden className="h-3.5 w-3.5" /> Import JSON
        </button>
        <a
          href="/api/export/items.csv"
          className="inline-flex items-center gap-1.5 rounded-ctl border border-bd-strong px-3 py-1.5 text-xs text-tx-secondary transition-colors hover:border-accent hover:text-tx-primary"
        >
          <Download aria-hidden className="h-3.5 w-3.5" /> Items CSV
        </a>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])}
        />
      </div>
      {message && <p role="status" className="mt-2 text-xs text-tx-secondary">{message}</p>}
    </div>
    </Panel>
  );
}

export default function Settings() {
  return (
    <>
      <PageHeader title="Settings" detail="Sources, ingestion, and data portability." />
      <div className="grid gap-3">
        <SourceHealth />
        <div className="grid items-start gap-3 lg:grid-cols-2">
          <AddSource />
          <div className="grid gap-3">
            <ImportExport />
            <Panel title="AI enrichment" marker="standards">
              <div className="p-3.5">
              <p className="text-xs text-tx-muted">
                Optional AI features (summaries, semantic search, research workflows) arrive in a
                future release with a model-agnostic provider layer — local models included. The
                core product is fully functional without any LLM, by design.
              </p>
            </div>
            </Panel>
          </div>
        </div>
      </div>
    </>
  );
}
