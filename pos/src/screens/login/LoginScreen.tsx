import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ChevronDown, Delete } from "lucide-react";
import { toast } from "sonner";
import { LoginHero } from "../../components/login/LoginHero";
import { listStaff, loginWithPassword, loginWithPin } from "../../lib/session";
import type { StaffUser } from "../../lib/staff";
import { useStoreSettings } from "../../lib/use-store-settings";

type Props = {
  onLogin: (user: StaffUser, needsOpenShift: boolean) => void;
  banner?: string;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"] as const;

function roleCopy(role: StaffUser["role"]) {
  if (role === "admin") return "Manager";
  if (role === "supervisor") return "Supervisor";
  return "Cashier";
}

export function LoginScreen({ onLogin, banner }: Props) {
  const settings = useStoreSettings();
  const brand = settings.storeName.trim() || "this till";
  const [roster, setRoster] = useState<StaffUser[]>([]);
  const [staffId, setStaffId] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pin, setPin] = useState("");
  const [mode, setMode] = useState<"pin" | "password">("pin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void listStaff()
      .then((rows) => {
        if (cancelled) return;
        setRoster(rows);
        setStaffId((current) => current || rows[0]?.id || "");
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const selected = useMemo(
    () => roster.find((row) => row.id === staffId) ?? roster[0] ?? null,
    [roster, staffId],
  );

  useEffect(() => {
    if (mode !== "pin") return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        setPin((current) => current.slice(0, -1));
        return;
      }
      if (/^\d$/.test(event.key)) {
        setPin((current) => (current.length >= 4 ? current : current + event.key));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mode]);

  async function finish(user: StaffUser, needsOpenShift: boolean) {
    toast.success("Signed in.");
    onLogin(user, needsOpenShift);
  }

  async function submitPin() {
    if (busy || !selected || pin.length < 4) return;
    setBusy(true);
    try {
      const result = await loginWithPin(selected.id, pin);
      await finish(result.user, result.needsOpenShift);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in.");
      setPin("");
    } finally {
      setBusy(false);
    }
  }

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const result = await loginWithPassword(username, password);
      await finish(result.user, result.needsOpenShift);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  function press(key: (typeof KEYS)[number]) {
    if (!key || busy) return;
    if (key === "del") {
      setPin((current) => current.slice(0, -1));
      return;
    }
    setPin((current) => (current.length >= 4 ? current : current + key));
  }

  return (
    <div className="login-split">
      <LoginHero brand={brand} />
      <section className="login-pane">
        <div className="login-pane-card">
          <div className="login-mark" aria-hidden="true" />
          {mode === "pin" ? (
            <>
              <h1>Cashier Login</h1>
              <p>Handle transactions on this till with your staff PIN.</p>
              {banner ? <p className="login-banner">{banner}</p> : null}
              <div className={`cashier-picker ${pickerOpen ? "open" : ""}`}>
                <button
                  type="button"
                  className="cashier-picker-trigger"
                  onClick={() => setPickerOpen((open) => !open)}
                  disabled={!selected}
                >
                  {selected ? (
                    <>
                      <img src={selected.avatar} alt="" />
                      <span>
                        <strong>{selected.name}</strong>
                        <em>{roleCopy(selected.role)}</em>
                      </span>
                    </>
                  ) : (
                    <span>
                      <strong>No staff on roster</strong>
                      <em>Use password sign-in</em>
                    </span>
                  )}
                  <ChevronDown size={18} />
                </button>
                {pickerOpen ? (
                  <ul>
                    {roster.map((row) => (
                      <li key={row.id}>
                        <button
                          type="button"
                          className={row.id === selected?.id ? "on" : ""}
                          onClick={() => {
                            setStaffId(row.id);
                            setPickerOpen(false);
                            setPin("");
                          }}
                        >
                          <img src={row.avatar} alt="" />
                          <span>
                            <strong>{row.name}</strong>
                            <em>{roleCopy(row.role)}</em>
                          </span>
                          {row.id === selected?.id ? <i>✓</i> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="cashier-pin-dots" aria-hidden="true">
                {Array.from({ length: 4 }, (_, index) => (
                  <span key={index} className={pin.length > index ? "on" : ""} />
                ))}
              </div>
              <div className="cashier-pad">
                {KEYS.map((key, index) =>
                  key ? (
                    <button
                      key={key}
                      type="button"
                      className={key === "del" ? "muted" : ""}
                      onClick={() => press(key)}
                      disabled={busy}
                      aria-label={key === "del" ? "Delete" : key}
                    >
                      {key === "del" ? <Delete size={22} /> : key}
                    </button>
                  ) : (
                    <span key={`blank-${index}`} />
                  ),
                )}
              </div>
              <button
                className="continue login-start"
                type="button"
                disabled={busy || !selected || pin.length < 4}
                onClick={() => void submitPin()}
              >
                {busy ? "Starting…" : "Start Shift"}
              </button>
              <button
                className="login-switch"
                type="button"
                onClick={() => {
                  setMode("password");
                  setPickerOpen(false);
                }}
              >
                Sign in with password
              </button>
            </>
          ) : (
            <form onSubmit={(event) => void submitPassword(event)}>
              <h1>Sign in</h1>
              <p>Use a till username or HQ account to open this till.</p>
              {banner ? <p className="login-banner">{banner}</p> : null}
              <label>
                Username
                <input
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoFocus
                />
              </label>
              <label>
                Password
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </label>
              <button className="continue login-start" type="submit" disabled={busy}>
                {busy ? "Signing in…" : "Sign in"}
              </button>
              {roster.length > 0 ? (
                <button
                  className="login-switch"
                  type="button"
                  onClick={() => {
                    setMode("pin");
                    setPin("");
                  }}
                >
                  Back to cashier PIN
                </button>
              ) : null}
            </form>
          )}
        </div>
        <p className="login-legal">
          © {new Date().getFullYear()} {settings.companyLegalName.trim() || brand}
        </p>
      </section>
    </div>
  );
}
