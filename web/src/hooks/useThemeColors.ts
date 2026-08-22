"use client";

import { useEffect, useState } from "react";
import { useTheme } from "../components/ThemeProvider";

export type ThemeColors = {
  primary: string;
  primarySoft: string;
  ink: string;
  inkFaint: string;
  inkMuted: string;
  surface: string;
  surfaceMuted: string;
  border: string;
  success: string;
  chartBar: string;
  chartBarAccent: string;
  chartGrid: string;
  chartLine: string;
  chartLineSoft: string;
  chartSlice2: string;
  chartSlice3: string;
  chartSlice4: string;
  avatar: string[];
};

function readVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function readThemeColors(): ThemeColors {
  return {
    primary: readVar("--pos-primary"),
    primarySoft: readVar("--pos-primary-soft"),
    ink: readVar("--pos-ink"),
    inkFaint: readVar("--pos-ink-faint"),
    inkMuted: readVar("--pos-ink-muted"),
    surface: readVar("--pos-surface"),
    surfaceMuted: readVar("--pos-surface-muted"),
    border: readVar("--pos-border"),
    success: readVar("--pos-success"),
    chartBar: readVar("--pos-chart-bar"),
    chartBarAccent: readVar("--pos-chart-bar-accent"),
    chartGrid: readVar("--pos-chart-grid"),
    chartLine: readVar("--pos-chart-line"),
    chartLineSoft: readVar("--pos-chart-line-soft"),
    chartSlice2: readVar("--pos-chart-slice-2"),
    chartSlice3: readVar("--pos-chart-slice-3"),
    chartSlice4: readVar("--pos-chart-slice-4"),
    avatar: [
      readVar("--pos-avatar-1"),
      readVar("--pos-avatar-2"),
      readVar("--pos-avatar-3"),
      readVar("--pos-avatar-4"),
      readVar("--pos-avatar-5"),
    ],
  };
}

export function useThemeColors() {
  const { resolved } = useTheme();
  const [colors, setColors] = useState<ThemeColors>(() =>
    typeof window === "undefined"
      ? {
          primary: "#6d4aff",
          primarySoft: "#f4f0ff",
          ink: "#1c1c1e",
          inkFaint: "#9ca3af",
          inkMuted: "#6b7280",
          surface: "#ffffff",
          surfaceMuted: "#f6f5f8",
          border: "#e8e8ed",
          success: "#16a34a",
          chartBar: "#e8e8ed",
          chartBarAccent: "#d8d8df",
          chartGrid: "#f0f0f3",
          chartLine: "#b8b8c2",
          chartLineSoft: "#d4cce8",
          chartSlice2: "#c4c4cc",
          chartSlice3: "#dcdce2",
          chartSlice4: "#ececf0",
          avatar: ["#64748b", "#475569", "#6d4aff", "#94a3b8", "#78716c"],
        }
      : readThemeColors(),
  );

  useEffect(() => {
    setColors(readThemeColors());
  }, [resolved]);

  return colors;
}
