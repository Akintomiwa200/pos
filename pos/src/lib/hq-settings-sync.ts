import { apiUrl } from "./api-base";
import {
  applyHqOrg,
  applyHqSettingsPatch,
  loadCachedHqOrg,
  type HqOrgSnapshot,
} from "./hq-org";
import { SETTINGS_EVENT, loadStoreSettings } from "./store-settings";
import { ingestHqOrg, loadDeviceTill, TILLS_EVENT } from "./tills";

const DAY_MS = 24 * 60 * 60 * 1000;

function tillLocation() {
  const till = loadDeviceTill();
  return { branchId: till.branchId, storeId: till.storeId };
}

function applyLiveOrg(org: HqOrgSnapshot) {
  ingestHqOrg(org);
}

export async function pullHqOrgSnapshot() {
  const response = await fetch(apiUrl("/api/console/setup"));
  if (!response.ok) throw new Error(`HQ setup failed (${response.status})`);
  const org = (await response.json()) as HqOrgSnapshot;
  applyLiveOrg(org);
  return org;
}

export function startHqOrgSync() {
  let stopped = false;
  let source: EventSource | null = null;
  let poll = 0;
  let reconnect = 0;

  function applyCachedToTill() {
    const cached = loadCachedHqOrg();
    if (cached) applyHqOrg(cached, tillLocation());
  }

  async function refresh() {
    if (stopped) return;
    try {
      await pullHqOrgSnapshot();
    } catch {
      applyCachedToTill();
    } finally {
      lastPull = Date.now();
    }
  }

  function connectStream() {
    if (stopped) return;
    source?.close();
    try {
      source = new EventSource(apiUrl("/api/console/setup/settings/stream"));
      source.onmessage = (message) => {
        try {
          const parsed = JSON.parse(message.data) as {
            type?: string;
            settings?: HqOrgSnapshot["settings"];
            org?: HqOrgSnapshot;
          };
          if (parsed?.org) {
            applyLiveOrg(parsed.org);
            return;
          }
          if (parsed?.type === "settings" && parsed.settings) {
            applyHqSettingsPatch(parsed.settings, tillLocation());
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      source.onerror = () => {
        source?.close();
        source = null;
        if (stopped) return;
        window.clearTimeout(reconnect);
        reconnect = window.setTimeout(connectStream, 2000);
      };
    } catch {
      source = null;
      if (!stopped) {
        reconnect = window.setTimeout(connectStream, 4000);
      }
    }
  }

  let lastPull = 0;
  let mode = loadStoreSettings().syncMode;

  function configure() {
    if (stopped) return;
    const next = loadStoreSettings().syncMode;
    const changed = next !== mode;
    mode = next;
    window.clearInterval(poll);
    window.clearTimeout(reconnect);
    source?.close();
    source = null;
    if (mode === "realtime") {
      poll = window.setInterval(() => void refresh(), 8_000);
      connectStream();
    } else {
      // Daily mode still pulls once at startup and at most once a day after
      // that; visibility changes only trigger a pull when the day is stale.
      poll = window.setInterval(() => void refresh(), DAY_MS);
    }
    if (changed) void refresh();
  }

  void refresh().finally(() => {
    lastPull = Date.now();
    if (!stopped) configure();
  });

  const onTill = () => applyCachedToTill();
  const onSettings = () => configure();
  const onVisible = () => {
    if (document.visibilityState !== "visible") return;
    if (mode === "realtime" || Date.now() - lastPull >= DAY_MS) void refresh();
  };
  window.addEventListener(TILLS_EVENT, onTill);
  window.addEventListener(SETTINGS_EVENT, onSettings);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    window.clearInterval(poll);
    window.clearTimeout(reconnect);
    source?.close();
    window.removeEventListener(TILLS_EVENT, onTill);
    window.removeEventListener(SETTINGS_EVENT, onSettings);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
