import { apiUrl } from "./api-base";
import {
  applyHqOrg,
  applyHqSettingsPatch,
  loadCachedHqOrg,
  type HqOrgSnapshot,
} from "./hq-org";
import { ingestHqOrg, loadDeviceTill, TILLS_EVENT } from "./tills";

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

  void refresh().finally(() => {
    if (stopped) return;
    poll = window.setInterval(() => void refresh(), 8_000);
    connectStream();
  });

  const onTill = () => applyCachedToTill();
  const onVisible = () => {
    if (document.visibilityState === "visible") void refresh();
  };
  window.addEventListener(TILLS_EVENT, onTill);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    window.clearInterval(poll);
    window.clearTimeout(reconnect);
    source?.close();
    window.removeEventListener(TILLS_EVENT, onTill);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
