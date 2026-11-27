"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Braces,
  Check,
  Copy,
  Globe,
  KeyRound,
  Plug,
  RefreshCw,
  ShieldCheck,
  Key,
  Lock,
  Plus,
  Radio,
  Trash2,
  Webhook,
  Wifi,
  WifiOff,
} from "lucide-react";
import { toast } from "@/lib/toast";
import { useLivePos } from "@/lib/live-pos";
import { api } from "@/lib/hq-api";
import { asBool, asNum, asStr } from "@/lib/hq-policies";
import { usePolicyCollection } from "@/lib/use-policy-collection";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  PrimaryButton,
  SetupHeader,
  SetupStat,
  fieldClass,
} from "@/components/setup/SetupChrome";

function LiveBadge({ live }: { live: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border border-pos-border px-3 py-2.5 text-[12px] font-medium ${
        live ? "bg-pos-success/10 text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
      }`}
    >
      {live ? <Wifi size={13} /> : <WifiOff size={13} />}
      {live ? "Live" : "Offline"}
    </span>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard.");
  } catch {
    toast.error("Could not copy.");
  }
}

function apiBaseUrl() {
  return typeof window === "undefined" ? "/api" : `${window.location.origin}/api`;
}

function ApiDashboardPage() {
  const { live, ready } = useLivePos();
  const keys = usePolicyCollection("apiKeys");
  const logs = usePolicyCollection("apiLogs");
  const [endpoint, setEndpoint] = useState("/console/setup");
  const [output, setOutput] = useState<string>("// press Send to call the API");
  const [busy, setBusy] = useState(false);

  const modules = [
    { name: "setup", method: "GET /console/setup", desc: "HQ setup snapshot" },
    { name: "catalogue", method: "GET /catalog/items", desc: "Live catalogue items" },
    { name: "staff", method: "GET /staff", desc: "Staff and roles" },
    { name: "sales", method: "GET /sales", desc: "Recorded sales" },
    { name: "orders", method: "GET /orders", desc: "Purchase and sales documents" },
    { name: "policies", method: "GET /policies", desc: "Persisted console collections" },
  ];

  async function send() {
    const path = endpoint.trim().startsWith("/") ? endpoint.trim() : `/${endpoint.trim()}`;
    const started = performance.now();
    setBusy(true);
    try {
      const data = await api<unknown>(path);
      const latency = Math.max(1, Math.round(performance.now() - started));
      setOutput(JSON.stringify(data, null, 2).slice(0, 20_000));
      await logs.save({
        id: `LOG-${Date.now()}`,
        method: "GET",
        path,
        status: 200,
        latency: `${latency} ms`,
        ip: "console",
        at: new Date().toISOString(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Request failed";
      setOutput(message);
      await logs.save({
        id: `LOG-${Date.now()}`,
        method: "GET",
        path,
        status: 0,
        latency: `${Math.max(1, Math.round(performance.now() - started))} ms`,
        ip: "console",
        at: new Date().toISOString(),
      });
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="API console"
        copy="REST API for the platform — read till, company, and directory data, or wire webhooks to events."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SetupStat label="Calls today" value={String(logs.rows.filter((row) => asStr(row.at).slice(0, 10) === new Date().toISOString().slice(0, 10)).length)} hint="Console requests" tone="accent" />
        <SetupStat label="Endpoints" value={String(modules.length)} hint="Read modules" />
        <SetupStat label="Keys" value={String(keys.rows.filter((row) => !asBool(row.revoked)).length)} hint="Active keys" />
        <SetupStat label="Base URL" value="/api" hint="Local backend" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Braces size={16} className="text-pos-primary" /> Quick test
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-pos-surface-muted px-3.5 py-2">
            <span className="text-[12px] font-bold text-pos-success">GET</span>
            <span className="shrink-0 text-[12px] text-pos-ink-faint">{apiBaseUrl()}</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-[13px] text-pos-ink outline-none"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void send()}
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-pos-primary px-5 py-2 text-[13px] font-semibold text-white shadow-pos-primary transition hover:opacity-90 disabled:opacity-60"
          >
            <PlayIcon /> {busy ? "Calling…" : "Send"}
          </button>
          <pre className="mt-3 max-h-56 overflow-auto rounded-2xl bg-pos-ink p-4 text-[12px] leading-relaxed text-pos-surface">
            {output}
          </pre>
        </div>
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Globe size={16} className="text-pos-primary" /> Modules
          </div>
          <ul className="space-y-2">
            {modules.map((mod) => (
              <li key={mod.name} className="flex items-center gap-3 rounded-2xl border border-pos-border/70 px-4 py-3">
                <span className="rounded-lg bg-pos-primary/10 px-2 py-1 font-mono text-[11px] font-bold text-pos-primary">
                  {mod.method.split(" ")[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <code className="block text-[13px] font-medium text-pos-ink">{mod.method}</code>
                  <p className="truncate text-[11px] text-pos-ink-muted">{mod.desc}</p>
                </div>
                <Key size={13} className="shrink-0 text-pos-ink-faint" />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex items-center gap-3 rounded-[20px] border border-pos-border bg-pos-surface p-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
          <KeyRound size={18} />
        </span>
        <div>
          <p className="text-sm font-medium text-pos-ink">Authentication</p>
          <p className="text-[12px] text-pos-ink-muted">
            Set <code className="rounded bg-pos-surface-muted px-1.5 py-0.5 text-[11px] text-pos-primary">Authorization: Bearer &lt;key&gt;</code> on every request. Generate keys on the API keys page.
          </p>
        </div>
      </div>
    </div>
  );
}

function PlayIcon() {
  return <RefreshCw size={13} />;
}

function ApiKeysPage() {
  const { live } = useLivePos();
  const { rows, loading, save } = usePolicyCollection("apiKeys");
  const [label, setLabel] = useState("");

  async function createKey() {
    const id = `KEY-${Date.now().toString(36).toUpperCase()}`;
    const secret = `pos_live_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 10)}`;
    await save({
      id,
      name: label.trim() || `Key ${rows.length + 1}`,
      prefix: `${secret.slice(0, 10)}…`,
      secret,
      scopes: ["reads"],
      revoked: false,
      lastUsed: "Never",
      createdAt: new Date().toISOString(),
    });
    setLabel("");
    toast.success("Integration key saved to the console. Copy the secret before sharing it.");
  }

  async function revoke(id: string) {
    await save({ id, revoked: true, revokedAt: new Date().toISOString() });
    toast.success("Key marked as revoked.");
  }

  const active = rows.filter((row) => !asBool(row.revoked));

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="Integration keys"
        copy="Store credentials and labels for external integrations. These records are saved to the console; the local backend does not yet enforce them as bearer tokens."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Active" value={String(active.length)} hint="Available keys" tone="accent" />
        <SetupStat label="Revoked" value={String(rows.length - active.length)} hint="Disabled keys" />
        <SetupStat label="Scope" value="read" hint="Default label" />
        <SetupStat label="Stored" value={String(rows.length)} hint="Console records" />
      </div>
      <div className="mb-4 flex gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4">
        <input
          className={`${fieldClass} flex-1`}
          placeholder="Key label, e.g. staging sync"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void createKey()}
        />
        <PrimaryButton onClick={() => void createKey()} disabled={loading}>
          <Plus size={15} /> Create key
        </PrimaryButton>
      </div>
      {rows.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <KeyRound size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No keys saved yet. Create one to keep an integration credential with this console.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 border-b border-pos-border/60 px-5 py-4 last:border-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
                <KeyRound size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-pos-ink">{asStr(row.name)}</p>
                <code className="block text-[12px] text-pos-ink-muted">{asStr(row.prefix)}</code>
                <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${asBool(row.revoked) ? "bg-pos-surface-muted text-pos-ink-faint" : "bg-pos-success/10 text-pos-success"}`}>
                  {asBool(row.revoked) ? "revoked" : "read"}
                </span>
              </div>
              <span className="text-[12px] text-pos-ink-faint">Last used: {asStr(row.lastUsed) || "Never"}</span>
              <button
                type="button"
                onClick={() => void copyText(asStr(row.secret))}
                className="inline-flex items-center gap-1.5 rounded-full border border-pos-border px-3 py-1.5 text-[12px] font-semibold text-pos-ink transition hover:bg-pos-surface-muted"
              >
                <Copy size={13} /> Copy
              </button>
              {!asBool(row.revoked) && (
                <button
                  type="button"
                  onClick={() => void revoke(row.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-pos-danger/20 px-3 py-1.5 text-[12px] font-semibold text-pos-danger transition hover:bg-pos-danger/10"
                >
                  <Trash2 size={13} /> Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const WEBHOOK_EVENTS = ["till.created", "till.renewed", "sale.completed", "account.created"];

function WebhooksPage() {
  const { live } = useLivePos();
  const { rows: hooks, save, remove } = usePolicyCollection("webhooks");
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState(WEBHOOK_EVENTS[0]);

  async function addHook() {
    const value = url.trim();
    if (!value) return;
    try {
      new URL(value);
    } catch {
      toast.error("Enter a full URL, including https://.");
      return;
    }
    await save({
      id: `HOOK-${Date.now().toString(36).toUpperCase()}`,
      url: value,
      events: [event],
      active: true,
      deliveries: 0,
      retries: 0,
      createdAt: new Date().toISOString(),
    });
    setUrl("");
    toast.success("Webhook endpoint saved.");
  }

  async function toggleEvent(id: string, evt: string) {
    const row = hooks.find((item) => item.id === id);
    if (!row) return;
    const current = Array.isArray(row.events) ? row.events.map(String) : [];
    const events = current.includes(evt) ? current.filter((item) => item !== evt) : [...current, evt];
    await save({ ...row, events });
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="Webhooks"
        copy="Record event subscriptions for integration endpoints. The console stores the subscriptions; delivery workers are not enabled in this local deployment."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Endpoints" value={String(hooks.length)} hint="Saved subscriptions" tone="accent" />
        <SetupStat label="Events" value={String(WEBHOOK_EVENTS.length)} hint="Subscribable" />
        <SetupStat label="Delivered" value={String(hooks.reduce((sum, row) => sum + asNum(row.deliveries), 0))} hint="Recorded deliveries" />
        <SetupStat label="Retries" value={String(hooks.reduce((sum, row) => sum + asNum(row.retries), 0))} hint="Recorded retries" />
      </div>
      <div className="mb-4 flex flex-col gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4 sm:flex-row">
        <input
          className={`${fieldClass} flex-1`}
          placeholder="https://example.com/hooks/pos"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void addHook()}
        />
        <select className={`${fieldClass} sm:max-w-[220px]`} value={event} onChange={(e) => setEvent(e.target.value)}>
          {WEBHOOK_EVENTS.map((evt) => (
            <option key={evt} value={evt}>
              {evt}
            </option>
          ))}
        </select>
        <PrimaryButton onClick={() => void addHook()}>
          <Plus size={15} /> Register
        </PrimaryButton>
      </div>
      {hooks.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Webhook size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No endpoints saved yet. Register one to keep its event subscriptions here.
        </div>
      ) : (
        <ul className="space-y-3">
          {hooks.map((row) => {
            const events = Array.isArray(row.events) ? row.events.map(String) : [];
            return (
              <li key={row.id} className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
                    <Radio size={17} />
                  </span>
                  <code className="min-w-0 flex-1 truncate text-[13px] text-pos-ink">{asStr(row.url)}</code>
                  <button
                    type="button"
                    aria-label="Delete webhook"
                    className="shrink-0 text-pos-ink-faint hover:text-pos-danger"
                    onClick={() => void remove(row.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {WEBHOOK_EVENTS.map((evt) => {
                    const active = events.includes(evt);
                    return (
                      <button
                        key={evt}
                        type="button"
                        onClick={() => void toggleEvent(row.id, evt)}
                        className={`rounded-full px-3 py-1.5 font-mono text-[11px] font-semibold transition ${
                          active
                            ? "bg-pos-primary text-white shadow-pos-primary"
                            : "bg-pos-surface-muted text-pos-ink-faint hover:text-pos-ink"
                        }`}
                      >
                        {evt}
                      </button>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const STARTER_APPS = [
  { id: "APP-analytics", name: "Analytics Sync", owner: "Partner API", scopes: ["tills:read", "sales:read"], status: "Connected" },
  { id: "APP-accounting", name: "Accounting Bridge", owner: "Partner API", scopes: ["accounts:read"], status: "Pending" },
];

function ApplicationsPage() {
  const { live } = useLivePos();
  const { rows: apps, save, loading } = usePolicyCollection("apps");
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!loading && apps.length === 0 && !seeded) {
      setSeeded(true);
      void Promise.all(STARTER_APPS.map((app) => save(app)));
    }
  }, [apps.length, loading, seeded, save]);

  async function toggle(id: string, status: string) {
    const next = status === "Revoked" ? "Pending" : "Revoked";
    await save({ id, status: next, updatedAt: new Date().toISOString() });
  }

  const toneOf = (status: string) =>
    status === "Connected"
      ? "bg-pos-success/10 text-pos-success"
      : status === "Pending"
        ? "bg-pos-warning/10 text-pos-warning"
        : "bg-pos-surface-muted text-pos-ink-faint";

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="Applications"
        copy="Third-party applications and OAuth clients requesting access to platform data. Approval state is saved to the console."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Connected" value={String(apps.filter((app) => asStr(app.status) === "Connected").length)} hint="Active apps" tone="accent" />
        <SetupStat label="Pending" value={String(apps.filter((app) => asStr(app.status) === "Pending").length)} hint="Awaiting approval" />
        <SetupStat label="Revoked" value={String(apps.filter((app) => asStr(app.status) === "Revoked").length)} hint="Disconnected" />
        <SetupStat label="Permissions" value={String(new Set(apps.flatMap((app) => Array.isArray(app.scopes) ? app.scopes.map(String) : [])).size)} hint="Distinct scopes" />
      </div>
      {apps.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Plug size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No applications yet. Approve incoming OAuth requests here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {apps.map((app) => {
            const status = asStr(app.status);
            const scopes = Array.isArray(app.scopes) ? app.scopes.map(String) : [];
            return (
              <div key={app.id} className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-pos-primary/10 text-pos-primary">
                    <Plug size={19} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-pos-ink">{asStr(app.name)}</p>
                    <p className="text-[12px] text-pos-ink-muted">{asStr(app.owner)}</p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneOf(status)}`}>
                    {status}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {scopes.map((scope) => (
                    <span key={scope} className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-2.5 py-1 font-mono text-[11px] text-pos-ink-muted">
                      <Lock size={10} /> {scope}
                    </span>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => void toggle(app.id, status)}
                  className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                    status === "Revoked"
                      ? "bg-pos-primary text-white shadow-pos-primary hover:opacity-90"
                      : "border border-pos-danger/20 text-pos-danger hover:bg-pos-danger/10"
                  }`}
                >
                  {status === "Revoked" ? <ShieldCheck size={14} /> : <Trash2 size={14} />}
                  {status === "Revoked" ? "Re-approve" : "Revoke access"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ApiLogsPage() {
  const { live } = useLivePos();
  const { rows: logs, remove } = usePolicyCollection("apiLogs");
  const [filter, setFilter] = useState(0);

  const statusTone = (status: number) =>
    status >= 400 ? "text-pos-danger" : status >= 300 ? "text-pos-warning" : "text-pos-success";
  const rows = logs.filter((row) => (filter ? asNum(row.status) === filter : true));
  const avg = rows.length ? rows.reduce((sum, row) => sum + asNum(String(row.latency).replace(/[^\d.]/g, "")), 0) / rows.length : 0;

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="API logs"
        copy="Requests made from this console's API tester. Successful and failed calls are both recorded here."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Requests" value={String(logs.length)} hint="Console calls" tone="accent" />
        <SetupStat label="Errors" value={String(logs.filter((row) => asNum(row.status) >= 400).length)} hint="Failed calls" tone="inverse" />
        <SetupStat label="Avg. latency" value={`${Math.round(avg)} ms`} hint="Measured locally" />
        <SetupStat label="Paths" value={String(new Set(logs.map((row) => asStr(row.path))).size)} hint="Distinct endpoints" />
      </div>
      <div className="mb-4 flex flex-wrap gap-2">
        {[0, 200, 201, 401].map((code) => (
          <button
            key={code}
            type="button"
            onClick={() => setFilter(code)}
            className={`rounded-full px-4 py-2 text-[12px] font-semibold transition ${
              filter === code
                ? "bg-pos-primary text-white shadow-pos-primary"
                : "bg-pos-surface text-pos-ink-muted hover:text-pos-ink"
            }`}
          >
            {code === 0 ? "All" : code}
          </button>
        ))}
        {logs.length > 0 && (
          <button type="button" className="ml-auto text-[12px] font-semibold text-pos-danger hover:underline" onClick={() => void Promise.all(logs.map((row) => remove(row.id)))}>
            Clear log
          </button>
        )}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Activity size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          {logs.length === 0 ? "No requests yet. Use the API console to make a call." : "No requests match this filter."}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-pos-border/60 text-[11px] uppercase tracking-wider text-pos-ink-faint">
                  <th className="px-5 py-3 font-medium">Method</th>
                  <th className="px-5 py-3 font-medium">Path</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Latency</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                  <th className="px-5 py-3 font-medium">At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-pos-border/45">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="px-5 py-3.5">
                      <span className="rounded-lg bg-pos-surface-muted px-2 py-1 font-mono text-[11px] font-bold">
                        {asStr(row.method)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-pos-ink">{asStr(row.path)}</td>
                    <td className={`px-5 py-3.5 font-mono font-bold ${statusTone(asNum(row.status))}`}>{asNum(row.status) || "—"}</td>
                    <td className="px-5 py-3.5 tabular-nums text-pos-ink-muted">{asStr(row.latency)}</td>
                    <td className="px-5 py-3.5 font-mono text-pos-ink-muted">{asStr(row.ip)}</td>
                    <td className="px-5 py-3.5 tabular-nums text-pos-ink-faint">{asStr(row.at).slice(11, 19) || asStr(row.at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export function DeveloperSection({ path }: { path: string }) {
  if (path === "/admin/developer/keys") return <ApiKeysPage />;
  if (path === "/admin/developer/webhooks") return <WebhooksPage />;
  if (path === "/admin/developer/apps") return <ApplicationsPage />;
  if (path === "/admin/developer/logs") return <ApiLogsPage />;
  return <ApiDashboardPage />;
}