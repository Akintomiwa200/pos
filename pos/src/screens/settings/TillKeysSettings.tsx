import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SETTINGS_EVENT } from "../../lib/store-settings";
import { useHardwareHex } from "../../lib/device-hex";
import { isCompleteTillCode, normalizeTillCode, tillProductLabel } from "../../lib/till-code";
import {
  TILLS_EVENT,
  activateDeviceTill,
  loadBranches,
  loadDeviceTill,
  saveDeviceTill,
  tillLabel,
  type TillRecord,
  type TillType,
} from "../../lib/tills";
import {
  LiveNote,
  SelectField,
  SetCard,
  SetRow,
  TextField,
  Toggle,
} from "./settings-ui";

export function TillKeysSettings() {
  const { hex, live } = useHardwareHex();
  const [branches, setBranches] = useState(loadBranches);
  const [till, setTill] = useState<TillRecord>(loadDeviceTill);
  const [codeDraft, setCodeDraft] = useState(() => loadDeviceTill().code);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const refresh = () => {
      setBranches(loadBranches());
      const next = loadDeviceTill();
      setTill(next);
      setCodeDraft(next.code);
    };
    window.addEventListener(TILLS_EVENT, refresh);
    window.addEventListener(SETTINGS_EVENT, refresh);
    return () => {
      window.removeEventListener(TILLS_EVENT, refresh);
      window.removeEventListener(SETTINGS_EVENT, refresh);
    };
  }, []);

  function patch(partial: Partial<TillRecord>) {
    setTill((current) => {
      const next = { ...current, ...partial };
      saveDeviceTill(next);
      return next;
    });
  }

  async function activate() {
    const code = normalizeTillCode(codeDraft);
    if (!isCompleteTillCode(code)) {
      toast.error("Enter the 16-character code from HQ, grouped as XXXX-XXXX-XXXX-XXXX.");
      return;
    }
    if (!hex) {
      toast.error("This device’s hardware hex is not available yet.");
      return;
    }
    setBusy(true);
    try {
      const next = await activateDeviceTill(code, hex);
      setTill(next);
      setCodeDraft(next.code);
      toast.success(`This device is now ${next.name}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  const branchName =
    branches.find((row) => row.id === till.branchId)?.name ?? "No branch";

  return (
    <>
      <p className="set-lede">
        One till per device. The till name (for example TILL-VI-01) is assigned
        in HQ. The till code is a 16-character provider key from Setup → Others →
        Till. Without that code this register cannot sell.
      </p>
      <LiveNote>
        {till.paired ? (
          <>
            This device is <strong>{tillLabel(till)}</strong> · {branchName} ·{" "}
            {tillProductLabel(till.product)} · licensed
            {till.subscriptionExpiresAt
              ? ` until ${new Date(till.subscriptionExpiresAt).toLocaleDateString("en-NG", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`
              : ""}
            .
          </>
        ) : (
          <>
            This device is <strong>not licensed</strong>. Issue a till in the HQ
            dashboard, then enter the code below. Activating here signs the
            previous device out.
          </>
        )}
      </LiveNote>
      <SetCard title="Till identity">
        <SetRow
          label="Till name"
          hint="Assigned in HQ. Appears after the code is accepted."
        >
          <span className="set-muted" style={{ fontFamily: "ui-monospace, monospace" }}>
            {till.name || "Waiting for activation"}
          </span>
        </SetRow>
        <SetRow
          label="Software product"
          hint="Set when this till is issued in HQ. It chooses supermarket, hotel, restaurant, or dark kitchen UI."
        >
          <span className="set-muted">{tillProductLabel(till.product)}</span>
        </SetRow>
        <SetRow
          label="Till code"
          hint="16 characters from the software provider, separated by dashes"
        >
          <TextField
            value={codeDraft}
            onChange={(value) => setCodeDraft(normalizeTillCode(value))}
            width={220}
            placeholder="XXXX-XXXX-XXXX-XXXX"
          />
        </SetRow>
        <SetRow label={till.paired ? "Re-activate this device" : "Activate this device"}>
          <button
            type="button"
            className="set-text-btn"
            onClick={() => void activate()}
            disabled={busy}
          >
            {busy ? "Checking…" : till.paired ? "Activate again" : "Activate"}
          </button>
        </SetRow>
      </SetCard>
      <SetCard title="This device">
        <SetRow
          label="Hardware hex"
          hint="Live UUID of this machine. Not typed. Bound to the till code in HQ."
        >
          <span
            className="set-muted"
            style={{ fontFamily: "ui-monospace, monospace", wordBreak: "break-all" }}
          >
            {hex || (live ? "Reading…" : "Hardware hex unavailable")}
          </span>
        </SetRow>
        <SetRow label="Till type">
          <SelectField
            value={till.type}
            onChange={(type) => patch({ type: type as TillType })}
            options={[
              { value: "counter", label: "Counter" },
              { value: "kiosk", label: "Kiosk" },
              { value: "mobile", label: "Mobile" },
            ]}
          />
        </SetRow>
        <SetRow label="Which branch is this till in?">
          <SelectField
            value={till.branchId || branches[0]?.id || ""}
            onChange={(branchId) => patch({ branchId })}
            options={branches.map((row) => ({ value: row.id, label: row.name }))}
          />
        </SetRow>
        <SetRow label="Notes">
          <TextField
            value={till.notes}
            onChange={(notes) => patch({ notes })}
            width={260}
          />
        </SetRow>
        <SetRow
          label="Is this till open for sales?"
          hint="Off after activation: this device stays signed in but cannot take a ticket"
        >
          <Toggle on={till.active} onChange={(active) => patch({ active })} />
        </SetRow>
      </SetCard>
    </>
  );
}
