import { useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { apiUrl } from "../../lib/api-base";
import { listStaff, manageStaffPin } from "../../lib/session";
import { loadDeviceTill } from "../../lib/tills";
import type { StaffUser } from "../../lib/staff";
import {
  LiveNote,
  NumField,
  SetCard,
  SetRow,
  Toggle,
  useSettings,
} from "./settings-ui";

type Props = {
  staff: StaffUser;
  onLockTerminal: () => void;
};

function hqConsoleUrl() {
  const configured = (import.meta.env.VITE_API_URL ?? "").trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(configured)) return "";
  try {
    const url = new URL(configured);
    url.pathname = url.pathname.replace(/\/api\/?$/i, "").replace(/\/$/, "");
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return "";
  }
}

function displayRole(row: Pick<StaffUser, "role" | "roleName">) {
  return row.roleName || row.role || "cashier";
}

function pinAuthority(role: string) {
  if (role === "admin") {
    return "Admin / Super Admin PIN opens Settings and authorises all supervisor actions.";
  }
  if (role === "supervisor") {
    return "Supervisor PIN authorises overrides, refunds and reports.";
  }
  return "Cashier PIN signs in and sells only.";
}

function CredentialField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <label className="set-num" style={{ display: "inline-flex", alignItems: "center" }}>
      <span className="set-muted" style={{ width: 110, textAlign: "left" }}>
        {label}
      </span>
      <input
        type="password"
        inputMode="numeric"
        autoComplete="off"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{ width: 140, border: 0, outline: "none", font: "inherit" }}
      />
    </label>
  );
}

export function SecuritySettings({ staff, onLockTerminal }: Props) {
  const [settings, patch] = useSettings();
  const [roster, setRoster] = useState<StaffUser[]>([]);
  const [currentPassword, setCurrentPassword] = useState("");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [busy, setBusy] = useState(false);
  const hqUrl = hqConsoleUrl();
  const till = loadDeviceTill();

  async function load() {
    setRoster(await listStaff());
  }

  useEffect(() => {
    void load().catch((error) =>
      toast.error(error instanceof Error ? error.message : "Could not load the staff roster."),
    );
  }, []);

  const currentUser = roster.find((row) => row.id === staff.id) ?? staff;

  async function savePin(pin: string | null) {
    if (!currentUser) {
      toast.error("The signed-in user was not found.");
      return;
    }
    if (!currentPassword.trim() && !currentPin.trim()) {
      toast.error("Enter the current password or the current supervisor PIN.");
      return;
    }
    if (pin !== null) {
      if (!/^\d{4,10}$/.test(pin)) {
        toast.error("The new PIN must be 4 to 10 digits.");
        return;
      }
      if (pin !== confirmPin) {
        toast.error("The new PIN and confirmation do not match.");
        return;
      }
    }
    setBusy(true);
    try {
      const result = await manageStaffPin({
        staffId: currentUser.id,
        pin,
        currentPassword,
        currentPin,
      });
      toast.success(
        result.hasPin ? `PIN set for ${result.name}.` : `PIN cleared for ${result.name}.`,
      );
      setCurrentPassword("");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the PIN.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="set-lede">
        PINs are stored on HQ as a hash. This terminal never displays a PIN; it only
        reports whether one is set. Only staff explicitly set up on this till can sign
        in; Super Admin is never shown. Supervisor and admin authority comes from the
        live HQ role; displayed session privileges refresh on the next sign-in.
      </p>
      <LiveNote>
        Signed in as <strong>{staff.name}</strong> ({staff.role}).{" "}
        {settings.requireOpenShift
          ? "An open shift is required before selling."
          : "Selling is allowed without an open shift."}{" "}
        {settings.idleLockMinutes > 0
          ? `The terminal locks after ${settings.idleLockMinutes} minutes idle.`
          : "Idle auto-lock is off."}
      </LiveNote>

      <SetCard title="Current session">
        <SetRow label="Staff member">{staff.name}</SetRow>
        <SetRow label="Role">{staff.role}</SetRow>
        <SetRow label="Privileges">{staff.privileges.join(", ") || "none"}</SetRow>
        <SetRow label="Active till">
          {till.name || settings.activeTillId || "This device"}
        </SetRow>
        <SetRow label="API base URL" hint="Where this terminal sends staff and sales requests">
          <span className="set-muted">{apiUrl("/").replace(/\/$/, "") || "same origin"}</span>
        </SetRow>
      </SetCard>

      <SetCard title="Till PIN setup · current user">
        <>
          <SetRow label="Staff member" hint="Signed in on this terminal">
            <div
              className="set-live"
              style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}
            >
              <div style={{ minWidth: 220, flex: 1 }}>
                <strong>{currentUser.name}</strong>
                <span className="set-muted">
                  {" · "}
                  {displayRole(currentUser)} ·{" "}
                  {currentUser.source === "account" ? "HQ account" : "Company staff"}
                  {currentUser.email ? ` · ${currentUser.email}` : ""}
                </span>
                <p className="set-muted" style={{ marginTop: 4 }}>
                  {pinAuthority(currentUser.role)}
                </p>
              </div>
              <span className={currentUser.hasPin ? "loyalty-on" : "set-muted"}>
                {currentUser.hasPin ? "PIN set" : "No PIN"}
              </span>
            </div>
          </SetRow>
          <SetRow
              label="Prove it's you"
              hint="A current password OR a current supervisor PIN is required"
            >
              <span style={{ display: "inline-flex", gap: 10, flexWrap: "wrap" }}>
                <CredentialField
                  label="Password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                />
                <CredentialField
                  label="Current PIN"
                  value={currentPin}
                  onChange={setCurrentPin}
                />
              </span>
            </SetRow>
            <SetRow label="New PIN" hint="4–10 digits">
              <CredentialField label="New PIN" value={newPin} onChange={setNewPin} />
            </SetRow>
            <SetRow label="Confirm new PIN">
              <CredentialField
                label="Confirm"
                value={confirmPin}
                onChange={setConfirmPin}
              />
            </SetRow>
            <SetRow label="Save this PIN">
              <button
                type="button"
                className="set-text-btn"
                disabled={busy}
                onClick={() => void savePin(newPin.trim())}
              >
                <ShieldCheck size={16} /> Set PIN
              </button>
            </SetRow>
            <SetRow label="Remove this staff member's PIN">
              <button
                type="button"
                className="set-text-btn set-danger"
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Clear the PIN for ${currentUser.name}?`)) {
                    void savePin(null);
                  }
                }}
              >
                Clear PIN
              </button>
            </SetRow>
        </>
      </SetCard>

      <SetCard title="Session policy">
        <SetRow
          label="Lock after this many idle minutes"
          hint="0 keeps the terminal signed in until someone logs out"
        >
          <NumField
            value={settings.idleLockMinutes}
            step={1}
            min={0}
            onChange={(idleLockMinutes) =>
              patch({ idleLockMinutes: Math.max(0, Math.round(idleLockMinutes)) })
            }
          />
        </SetRow>
        <SetRow
          label="Require an open shift before selling"
          hint="Enforced at sign-in and whenever this terminal is locked"
        >
          <Toggle
            on={settings.requireOpenShift}
            onChange={(requireOpenShift) => patch({ requireOpenShift })}
          />
        </SetRow>
        <SetRow
          label="Require a supervisor PIN for sensitive actions"
          hint="Enforced for discounts, refunds, price overrides, settings, and shift/day reports"
        >
          <Toggle
            on={settings.requireManagerPin}
            onChange={(requireManagerPin) => patch({ requireManagerPin })}
          />
        </SetRow>
      </SetCard>

      <SetCard title="Switch user">
        <SetRow
          label="Lock terminal / switch user"
          hint={
            settings.requireOpenShift
              ? "The next cashier must open or resume a shift before selling."
              : "Returns to the login screen; the current shift stays open."
          }
        >
          <button
            type="button"
            className="set-text-btn"
            onClick={() => {
              if (
                window.confirm(
                  "Lock this terminal and return to login? Any unsaved order on screen will be cleared.",
                )
              ) {
                onLockTerminal();
              }
            }}
          >
            <Lock size={16} /> Lock terminal
          </button>
        </SetRow>
      </SetCard>

      <SetCard title="HQ security settings">
        <SetRow
          label="Staff, roles, and password policies"
          hint="Managed in the web workspace, not on this terminal"
        >
          {hqUrl ? (
            <a className="set-text-btn" href={hqUrl} target="_blank" rel="noreferrer">
              Open HQ
            </a>
          ) : (
            <span className="set-muted">No HQ URL configured on this terminal</span>
          )}
        </SetRow>
        <SetRow label="Where to change it" hint="If no link is shown, open your HQ address in a browser">
          <span className="set-muted">HQ → Staff / Users → Security</span>
        </SetRow>
      </SetCard>
    </>
  );
}
