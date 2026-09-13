"use client";

import { useState } from "react";
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

const BASE_URL = "https://api.pos-saas.com/v1";

function ApiDashboardPage() {
  const { live, ready } = useLivePos();
  const [endpoint, setEndpoint] = useState("/tills");
  const [output, setOutput] = useState<string>("// press Send to preview a response");

  const modules = [
    { name: "tills", method: "GET /tills", desc: "All till licences across companies" },
    { name: "stores", method: "GET /stores", desc: "Store directory for every company" },
    { name: "branches", method: "GET /branches", desc: "Branch records with addresses" },
    { name: "people", method: "GET /accounts", desc: "Directory accounts and roles" },
    { name: "groups", method: "GET /groups", desc: "Role groups and permissions" },
    { name: "commerce", method: "GET /commerce/gateways", desc: "Connected payment gateways" },
  ];

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
        <SetupStat label="Calls today" value="0" hint="All authenticated keys" tone="accent" />
        <SetupStat label="Endpoints" value={String(modules.length)} hint="Read modules" />
        <SetupStat label="Keys" value="0" hint="Active API keys" />
        <SetupStat label="Base URL" value="—" hint="v1 (stable)" />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-pos-ink">
            <Braces size={16} className="text-pos-primary" /> Quick test
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-pos-surface-muted px-3.5 py-2">
            <span className="text-[12px] font-bold text-pos-success">GET</span>
            <span className="shrink-0 text-[12px] text-pos-ink-faint">{BASE_URL}</span>
            <input
              className="min-w-0 flex-1 bg-transparent text-[13px] text-pos-ink outline-none"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>
          <button
            type="button"
            onClick={() =>
              setOutput(
                JSON.stringify(
                  { ok: true, message: "Demo response", endpoint, data: [] },
                  null,
                  2,
                ),
              )
            }
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-pos-primary px-5 py-2 text-[13px] font-semibold text-white shadow-pos-primary transition hover:opacity-90"
          >
            <PlayIcon /> Send
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

type ApiKey = {
  id: number;
  name: string;
  prefix: string;
  scopes: string[];
  lastUsed: string;
  key: string;
};

function ApiKeysPage() {
  const { live } = useLivePos();
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [label, setLabel] = useState("");

  function createKey() {
    const key = `pos_live_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 10)}`;
    const row: ApiKey = {
      id: keys.length + 1,
      name: label.trim() || `Key ${keys.length + 1}`,
      prefix: key.slice(0, 10) + "…",
      scopes: ["reads"],
      lastUsed: "Never",
      key,
    };
    setKeys([row, ...keys]);
    setLabel("");
    toast.success("API key created — copy it now, it is shown once.");
  }

  function revoke(id: number) {
    setKeys((rows) => rows.filter((r) => r.id !== id));
    toast.success("API key revoked.");
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="API keys"
        copy="Create and revoke keys for external integrations. Keys are shown once at creation."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Active" value={String(keys.length)} hint="Valid keys" tone="accent" />
        <SetupStat label="Revoked" value="0" hint="Inactive keys" />
        <SetupStat label="Scope" value="read" hint="Default privilege" />
        <SetupStat label="TTL" value="365 d" hint="Auto-expiry" />
      </div>
      <div className="mb-4 flex gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4">
        <input
          className={`${fieldClass} flex-1`}
          placeholder="Key label, e.g. staging sync"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && createKey()}
        />
        <PrimaryButton onClick={createKey}>
          <Plus size={15} /> Create key
        </PrimaryButton>
      </div>
      {keys.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <KeyRound size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No keys yet. Create one to connect an external service to the platform API.
        </div>
      ) : (
        <ul className="overflow-hidden rounded-[20px] border border-pos-border bg-pos-surface">
          {keys.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 border-b border-pos-border/60 px-5 py-4 last:border-0">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
                <KeyRound size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-pos-ink">{row.name}</p>
                <code className="block text-[12px] text-pos-ink-muted">{row.prefix}</code>
                <span className="mt-1 inline-block rounded-full bg-pos-success/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-pos-success">
                  read
                </span>
              </div>
              <span className="text-[12px] text-pos-ink-faint">Last used: {row.lastUsed}</span>
              <button
                type="button"
                onClick={() => copyText(row.key)}
                className="inline-flex items-center gap-1.5 rounded-full border border-pos-border px-3 py-1.5 text-[12px] font-semibold text-pos-ink transition hover:bg-pos-surface-muted"
              >
                <Copy size={13} /> Copy
              </button>
              <button
                type="button"
                onClick={() => revoke(row.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-pos-danger/20 px-3 py-1.5 text-[12px] font-semibold text-pos-danger transition hover:bg-pos-danger/10"
              >
                <Trash2 size={13} /> Revoke
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const WEBHOOK_EVENTS = ["till.created", "till.renewed", "sale.completed", "account.created"];

type WebhookRow = {
  id: number;
  url: string;
  events: string[];
  healthy: boolean;
};

function WebhooksPage() {
  const { live } = useLivePos();
  const [hooks, setHooks] = useState<WebhookRow[]>([]);
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState(WEBHOOK_EVENTS[0]);

  function addHook() {
    if (!url.trim()) return;
    const rows: WebhookRow[] = [
      ...hooks,
      { id: hooks.length + 1, url: url.trim(), events: [event], healthy: true },
    ];
    setHooks(rows);
    setUrl("");
    toast.success("Webhook registered.");
  }

  function toggleEvent(id: number, evt: string) {
    setHooks((rows) =>
      rows.map((r) => {
        if (r.id !== id) return r;
        const events = r.events.includes(evt) ? r.events.filter((e) => e !== evt) : [...r.events, evt];
        return { ...r, events };
      }),
    );
  }

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="Webhooks"
        copy="Deliver platform events to your endpoints over HTTP. Each webhook is retried up to 5 times on failure."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Active" value={String(hooks.length)} hint="Registered webhooks" tone="accent" />
        <SetupStat label="Events" value={String(WEBHOOK_EVENTS.length)} hint="Subscribable" />
        <SetupStat label="Delivered" value="0" hint="Successful" />
        <SetupStat label="Retries" value="0" hint="Failed then retried" />
      </div>
      <div className="mb-4 flex flex-col gap-2 rounded-[18px] border border-pos-border bg-pos-surface p-4 sm:flex-row">
        <input
          className={`${fieldClass} flex-1`}
          placeholder="https://example.com/hooks/pos"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addHook()}
        />
        <select className={`${fieldClass} sm:max-w-[220px]`} value={event} onChange={(e) => setEvent(e.target.value)}>
          {WEBHOOK_EVENTS.map((evt) => (
            <option key={evt} value={evt}>
              {evt}
            </option>
          ))}
        </select>
        <PrimaryButton onClick={addHook}>
          <Plus size={15} /> Register
        </PrimaryButton>
      </div>
      {hooks.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Webhook size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No webhook endpoints yet. Register one to receive real-time platform events.
        </div>
      ) : (
        <ul className="space-y-3">
          {hooks.map((row) => (
            <li key={row.id} className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-pos-primary/10 text-pos-primary">
                  <Radio size={17} />
                </span>
                <code className="min-w-0 flex-1 truncate text-[13px] text-pos-ink">{row.url}</code>
                <span className="shrink-0 text-[12px] text-pos-ink-faint">healthy · 0 retries</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((evt) => {
                  const active = row.events.includes(evt);
                  return (
                    <button
                      key={evt}
                      type="button"
                      onClick={() => toggleEvent(row.id, evt)}
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
          ))}
        </ul>
      )}
    </div>
  );
}

type OAuthApp = {
  id: number;
  name: string;
  owner: string;
  scopes: string[];
  status: "Connected" | "Pending" | "Revoked";
};

function ApplicationsPage() {
  const { live } = useLivePos();
  const [apps, setApps] = useState<OAuthApp[]>([
    { id: 1, name: "Analytics Sync", owner: "Partner API", scopes: ["tills:read", "sales:read"], status: "Connected" },
    { id: 2, name: "Accounting Bridge", owner: "Partner API", scopes: ["accounts:read"], status: "Pending" },
  ]);

  function toggle(id: number) {
    setApps((rows) =>
      rows.map((a) =>
        a.id === id
          ? { ...a, status: a.status === "Revoked" ? "Pending" : "Revoked" }
          : a,
      ),
    );
  }

  const toneOf = (status: OAuthApp["status"]) =>
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
        copy="Third-party applications and OAuth clients requesting access to platform data."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Connected" value={String(apps.filter((a) => a.status === "Connected").length)} hint="Active apps" tone="accent" />
        <SetupStat label="Pending" value={String(apps.filter((a) => a.status === "Pending").length)} hint="Awaiting approval" />
        <SetupStat label="Revoked" value={String(apps.filter((a) => a.status === "Revoked").length)} hint="Disconnected" />
        <SetupStat label="Permissions" value="3" hint="Distinct scopes" />
      </div>
      {apps.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Plug size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No applications yet. Approve incoming OAuth requests here.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {apps.map((app) => (
            <div key={app.id} className="rounded-[20px] border border-pos-border bg-pos-surface p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-11 shrink-0 place-items-center rounded-[14px] bg-pos-primary/10 text-pos-primary">
                  <Plug size={19} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-pos-ink">{app.name}</p>
                  <p className="text-[12px] text-pos-ink-muted">{app.owner}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${toneOf(app.status)}`}>
                  {app.status}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {app.scopes.map((scope) => (
                  <span key={scope} className="inline-flex items-center gap-1.5 rounded-full bg-pos-surface-muted px-2.5 py-1 font-mono text-[11px] text-pos-ink-muted">
                    <Lock size={10} /> {scope}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => toggle(app.id)}
                className={`mt-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold transition ${
                  app.status === "Revoked"
                    ? "bg-pos-primary text-white shadow-pos-primary hover:opacity-90"
                    : "border border-pos-danger/20 text-pos-danger hover:bg-pos-danger/10"
                }`}
              >
                {app.status === "Revoked" ? <ShieldCheck size={14} /> : <Trash2 size={14} />}
                {app.status === "Revoked" ? "Re-approve" : "Revoke access"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const SAMPLE_LOGS = [
  { id: 1, method: "GET", path: "/tills", status: 200, latency: "38 ms", ip: "10.0.0.4", at: "14:02:11" },
  { id: 2, method: "GET", path: "/stores", status: 200, latency: "52 ms", ip: "10.0.0.4", at: "14:01:03" },
  { id: 3, method: "POST", path: "/webhooks", status: 201, latency: "89 ms", ip: "10.0.0.9", at: "13:58:47" },
  { id: 4, method: "GET", path: "/accounts", status: 401, latency: "12 ms", ip: "172.16.2.1", at: "13:55:20" },
  { id: 5, method: "GET", path: "/groups", status: 200, latency: "31 ms", ip: "10.0.0.9", at: "13:50:02" },
];

function ApiLogsPage() {
  const { live } = useLivePos();
  const [filter, setFilter] = useState(0);

  const statusTone = (status: number) =>
    status >= 400 ? "text-pos-danger" : status >= 300 ? "text-pos-warning" : "text-pos-success";
  const rows = SAMPLE_LOGS.filter((row) => (filter ? row.status === filter : true));

  return (
    <div>
      <SetupHeader
        kicker="Producer · Developer"
        title="API logs"
        copy="Request log for all authenticated API calls. Filter by response status to debug integrations."
        action={<LiveBadge live={live} />}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <SetupStat label="Today" value={String(SAMPLE_LOGS.length)} hint="Total requests" tone="accent" />
        <SetupStat label="Errors" value={String(SAMPLE_LOGS.filter((r) => r.status >= 400).length)} hint="4xx / 5xx" tone="inverse" />
        <SetupStat label="Avg. latency" value="44 ms" hint="Response time" />
        <SetupStat label="Keys" value="0" hint="Distinct callers" />
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
      </div>
      {rows.length === 0 ? (
        <div className="rounded-[18px] border border-pos-border bg-pos-surface p-8 text-center text-sm text-pos-ink-muted">
          <Activity size={20} className="mx-auto mb-2 text-pos-ink-faint" />
          No requests match this filter.
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
                        {row.method}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-pos-ink">{row.path}</td>
                    <td className={`px-5 py-3.5 font-mono font-bold ${statusTone(row.status)}`}>{row.status}</td>
                    <td className="px-5 py-3.5 tabular-nums text-pos-ink-muted">{row.latency}</td>
                    <td className="px-5 py-3.5 font-mono text-pos-ink-muted">{row.ip}</td>
                    <td className="px-5 py-3.5 tabular-nums text-pos-ink-faint">{row.at}</td>
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