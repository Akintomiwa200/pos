import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useHardwareHex } from "../../lib/device-hex";
import { isCompleteTillCode, normalizeTillCode } from "../../lib/till-code";
import { activateDeviceTill, loadDeviceTill } from "../../lib/tills";

type Props = {
  expired?: boolean;
  message?: string;
};

export function ActivateTillModal({ expired, message }: Props) {
  const { hex, live } = useHardwareHex();
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
    <div className="login-page">
      <form className="login-card" onSubmit={(event) => void submit(event)}>
        <div className="login-mark">P</div>
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
        <button className="continue" type="submit" disabled={busy || !hex}>
          {busy ? "Activating…" : expired ? "Renew and continue" : "Activate"}
        </button>
      </form>
    </div>
  );
}
