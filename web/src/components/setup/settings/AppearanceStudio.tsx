"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import {
  ACCENT_OPTIONS,
  FONT_OPTIONS,
  type ThemePreference,
} from "@/lib/appearance";
import { toast } from "@/lib/toast";
import { useAppearance } from "@/components/ThemeProvider";
import { PrimaryButton, secondaryButtonClass } from "@/components/setup/SetupChrome";
import { SettingRow, SettingsCard, Switch } from "./settings-ui";

const THEME_OPTIONS: {
  id: ThemePreference;
  label: string;
  hint: string;
  icon: typeof Sun;
}[] = [
  { id: "light", label: "Light", hint: "Bright surfaces", icon: Sun },
  { id: "dark", label: "Dark", hint: "Dim HQ chrome", icon: Moon },
  { id: "system", label: "System", hint: "Match device", icon: Monitor },
];

export function AppearanceStudio() {
  const {
    preference,
    setPreference,
    appearance,
    setFont,
    setAccent,
    setDensity,
    setReduceMotion,
    resetAppearance,
    hqSynced,
  } = useAppearance();

  return (
    <div className="space-y-5">
      <SettingsCard
        title="Theme"
        copy="Light, dark, or follow the device. Applies instantly across HQ."
      >
        <div className="grid gap-3 p-5 sm:grid-cols-3 sm:px-6">
          {THEME_OPTIONS.map(({ id, label, hint, icon: Icon }) => {
            const on = preference === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setPreference(id)}
                className={`rounded-[18px] border px-4 py-4 text-left transition ${
                  on
                    ? "border-pos-primary bg-pos-primary/10 shadow-pos-sm"
                    : "border-transparent bg-pos-surface-muted hover:border-pos-border"
                }`}
              >
                <span
                  className={`grid size-10 place-items-center rounded-full ${
                    on ? "bg-pos-primary text-white" : "bg-pos-surface text-pos-ink-muted"
                  }`}
                >
                  <Icon size={18} strokeWidth={1.75} />
                </span>
                <p className="mt-3 text-[14px] font-semibold text-pos-ink">{label}</p>
                <p className="mt-0.5 text-[13px] text-pos-ink-muted">{hint}</p>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Font"
        copy="UI typeface for HQ. Changes apply instantly across menus, tables, and forms."
      >
        <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
          {FONT_OPTIONS.map((font) => {
            const on = appearance.font === font.id;
            return (
              <button
                key={font.id}
                type="button"
                onClick={() => setFont(font.id)}
                className={`rounded-[18px] border px-4 py-4 text-left transition ${
                  on
                    ? "border-pos-primary bg-pos-primary/10"
                    : "border-transparent bg-pos-surface-muted hover:border-pos-border"
                }`}
                style={{ fontFamily: `var(${font.cssVar}), sans-serif` }}
              >
                <p className="text-[15px] font-semibold text-pos-ink">{font.label}</p>
                <p className="mt-1 text-[13px] text-pos-ink-muted">{font.sample}</p>
                <p className="mt-3 text-[18px] tracking-tight text-pos-ink">Ag 123</p>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard
        title="Accent colour"
        copy="Five accents for buttons, active nav, toggles, and focus rings — updates live."
      >
        <div className="grid grid-cols-2 gap-2.5 px-5 py-5 sm:grid-cols-5 sm:px-6">
          {ACCENT_OPTIONS.map((accent) => {
            const on = appearance.accent === accent.id;
            return (
              <button
                key={accent.id}
                type="button"
                onClick={() => setAccent(accent.id)}
                className={`flex flex-col items-center gap-2 rounded-[16px] px-2 py-3 text-center transition ${
                  on
                    ? "bg-pos-primary/12 ring-2 ring-pos-primary"
                    : "bg-pos-surface-muted hover:bg-pos-surface-muted/80"
                }`}
              >
                <span
                  className={`size-8 rounded-full shadow-sm ring-2 ${
                    on ? "ring-white" : "ring-transparent"
                  }`}
                  style={{ backgroundColor: accent.color }}
                />
                <span
                  className={`text-[12px] font-semibold ${
                    on ? "text-pos-primary" : "text-pos-ink-muted"
                  }`}
                >
                  {accent.label}
                </span>
              </button>
            );
          })}
        </div>
      </SettingsCard>

      <SettingsCard title="Density & motion" copy="How spacious HQ feels, and how much it animates.">
        <div className="grid gap-3 border-b border-pos-border/50 p-5 sm:grid-cols-2 sm:px-6">
          {(
            [
              {
                id: "comfortable" as const,
                label: "Comfortable",
                hint: "Default spacing",
              },
              {
                id: "compact" as const,
                label: "Compact",
                hint: "Tighter chrome",
              },
            ] as const
          ).map((option) => {
            const on = appearance.density === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setDensity(option.id)}
                className={`rounded-[18px] border px-4 py-4 text-left transition ${
                  on
                    ? "border-pos-primary bg-pos-primary/10"
                    : "border-transparent bg-pos-surface-muted hover:border-pos-border"
                }`}
              >
                <p className="text-[14px] font-semibold text-pos-ink">{option.label}</p>
                <p className="mt-0.5 text-[13px] text-pos-ink-muted">{option.hint}</p>
              </button>
            );
          })}
        </div>
        <SettingRow
          title="Reduce motion"
          description="Limit transitions and animations across HQ."
          control={
            <Switch
              checked={appearance.reduceMotion}
              onChange={setReduceMotion}
            />
          }
        />
      </SettingsCard>

      <SettingsCard
        title="Live sample"
        copy="Appearance applies instantly and syncs to HQ settings over the live API."
      >
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-2 rounded-xl bg-pos-primary/12 px-3 py-2 text-[13px] font-semibold text-pos-primary">
              <Monitor size={14} />
              Appearance
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-pos-ink-muted">
              General
            </span>
            <span className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-pos-ink-muted">
              Security
            </span>
          </div>

          <div className="overflow-hidden rounded-[18px] ring-1 ring-pos-border/70">
            <div className="flex items-center justify-between gap-4 border-b border-pos-border/50 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-pos-ink">Accent on toggles</p>
                <p className="mt-0.5 text-[13px] text-pos-ink-muted">
                  Active switches and nav use your accent colour.
                </p>
              </div>
              <Switch checked onChange={() => undefined} />
            </div>
            <div className="flex items-center justify-between gap-4 px-4 py-3.5">
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-pos-ink">Secondary surfaces</p>
                <p className="mt-0.5 text-[13px] text-pos-ink-muted">
                  Muted backgrounds follow light or dark theme.
                </p>
              </div>
              <Switch checked={false} onChange={() => undefined} />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton
              type="button"
              onClick={() =>
                toast.success(
                  hqSynced
                    ? "Appearance is saved on HQ and this device."
                    : "Appearance saved on this device. Connect the API to sync HQ.",
                )
              }
            >
              Save changes
            </PrimaryButton>
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => {
                resetAppearance();
                toast.success("Appearance reset to defaults.");
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </SettingsCard>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-pos-ink-muted">
          Theme, font, accent, density, and motion sync to HQ in real time
          {hqSynced ? "." : " (API offline — local only for now)."}
        </p>
        <button type="button" className={secondaryButtonClass} onClick={resetAppearance}>
          Reset appearance
        </button>
      </div>
    </div>
  );
}
