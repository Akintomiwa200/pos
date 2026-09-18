import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { LoginHero } from "../login/LoginHero";
import { useHardwareHex } from "../../lib/device-hex";
import { isCompleteTillCode, normalizeTillCode } from "../../lib/till-code";
import { activateDeviceTill, loadDeviceTill } from "../../lib/tills";
import { useStoreSettings } from "../../lib/use-store-settings";

type Props = {
  expired?: boolean;
  message?: string;
};

export function ActivateTillModal({ expired, message }: Props) {
  const { hex, live } = useHardwareHex();
  const settings = useStoreSettings();
  const brand = settings.storeName.trim() || "this till";
  const lastCode = loadDeviceTill().code;
  const [code, setCode] = useState(lastCode);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    const normalized = normalizeTillCode(code);
    if (!isCompleteTillCode(normalized)) {
      toast.error("Enter the 16-character till code from HQ, grouped as XXXX-XXXX-XXXX-XXXX.");
      return;
    }
    if (!hex) {
      toast.error("This device’s hardware hex is not available yet.");
      return;
    }
    setBusy(true);
    try {
      await activateDeviceTill(normalized, hex);
      toast.success("Till activated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Activation failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-split">
      <LoginHero brand={brand} />
      <section className="login-pane">
        <form className="login-pane-card" onSubmit={(event) => void submit(event)}>
          <div className="login-mark" aria-hidden="true" />
          <h1>{expired ? "Renew this till" : "Activate this till"}</h1>
          <p>
            {expired
              ? "This till’s subscription lasted one year. Enter the till code to renew before anyone can sign in."
              : "Enter the till code from HQ to license this device. Sign-in opens after the code is accepted."}
          </p>
          {message ? <p className="login-banner">{message}</p> : null}
          <label>
            Till code
            <input
              className="till-code-input"
              name="till-code"
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXX-XXXX-XXXX-XXXX"
              value={code}
              onChange={(event) => setCode(normalizeTillCode(event.target.value))}
              autoFocus
            />
          </label>
          <p className="activate-till-hex">
            This device · {hex || "Reading hardware…"}
            {live ? "" : hex ? " (cached)" : ""}
          </p>
          <button className="continue login-start" type="submit" disabled={busy || !hex}>
            {busy ? "Activating…" : expired ? "Renew and continue" : "Activate"}
          </button>
        </form>
        <p className="login-legal">
          © {new Date().getFullYear()} {settings.companyLegalName.trim() || brand}
        </p>
      </section>
    </div>
  );
}
