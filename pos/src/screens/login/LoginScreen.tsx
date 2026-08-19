import { useState, type FormEvent } from "react";
import { loginWithPassword } from "../../lib/session";
import type { StaffUser } from "../../lib/staff";

type Props = {
  onLogin: (user: StaffUser, needsOpenShift: boolean) => void;
  banner?: string;
};

export function LoginScreen({ onLogin, banner }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await loginWithPassword(username, password);
      onLogin(result.user, result.needsOpenShift);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={(event) => void submit(event)}>
        <div className="login-mark">P</div>
        <h1>Sign in</h1>
        <p>Enter your username and password to open this till.</p>
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
        {error ? <p className="pin-error">{error}</p> : null}
        <button className="continue" type="submit" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
