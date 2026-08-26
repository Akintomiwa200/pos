import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import {
  SETTINGS_EVENT,
  loadStoreSettings,
  saveStoreSettings,
  type StoreSettings,
} from "../../lib/store-settings";

export function useSettings() {
  const [settings, setSettings] = useState<StoreSettings>(loadStoreSettings);

  useEffect(() => {
    const refresh = () => setSettings(loadStoreSettings());
    window.addEventListener(SETTINGS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SETTINGS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  function patch(partial: Partial<StoreSettings>) {
    setSettings((current) => {
      const next = { ...current, ...partial };
      saveStoreSettings(next);
      return next;
    });
  }

  return [settings, patch] as const;
}

export function SetCard({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <div className="set-card">
      {title ? <h3 className="set-card-title">{title}</h3> : null}
      {children}
    </div>
  );
}

export function LiveNote({ children }: { children: ReactNode }) {
  return <div className="set-live">{children}</div>;
}

export function SetRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="set-row">
      <span className="set-label">
        {label}
        {hint ? <small>{hint}</small> : null}
      </span>
      <div className="set-control">{children}</div>
    </div>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (next: boolean) => void }) {
  return (
    <button
      type="button"
      className={`set-toggle ${on ? "on" : ""}`}
      aria-pressed={on}
      onClick={() => onChange(!on)}
    />
  );
}

export function NumField({
  value,
  onChange,
  step = 0.1,
  min = 0,
}: {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <input
      className="set-num"
      type="number"
      min={min}
      step={step}
      defaultValue={value}
      key={String(value)}
      onBlur={(event) => {
        const next = Number(event.target.value);
        if (!Number.isFinite(next) || next === value) return;
        onChange(next);
      }}
    />
  );
}

export function TextField({
  value,
  onChange,
  width = 220,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  width?: number;
  placeholder?: string;
}) {
  return (
    <input
      className="set-num"
      style={{ width, textAlign: "left" }}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function AreaField({
  value,
  onChange,
  width = 280,
}: {
  value: string;
  onChange: (next: string) => void;
  width?: number;
}) {
  return (
    <textarea
      className="set-area"
      style={{ width }}
      value={value}
      rows={3}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export function SelectField({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  return (
    <label className="set-select-wrap">
      <select
        className="set-select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown size={16} />
    </label>
  );
}

export function TickGroup<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (next: T) => void;
  options: { id: T; label: string }[];
}) {
  return (
    <div className="set-ticks" role="radiogroup">
      {options.map((option) => {
        const on = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={on}
            className={`set-tick ${on ? "on" : ""}`}
            onClick={() => onChange(option.id)}
          >
            <span className="set-tick-box" aria-hidden="true">
              {on ? "✓" : ""}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
