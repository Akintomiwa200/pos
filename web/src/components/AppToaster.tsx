"use client";

import { Toaster } from "sonner";
import { useTheme } from "./ThemeProvider";

export function AppToaster() {
  const { resolved } = useTheme();

  return (
    <Toaster
      position="top-right"
      richColors
      closeButton
      expand
      visibleToasts={4}
      duration={4500}
      theme={resolved}
      toastOptions={{
        classNames: {
          toast: "font-sans shadow-pos-md border border-pos-border",
          title: "text-sm font-semibold",
          description: "text-xs text-pos-ink-muted",
          actionButton: "bg-pos-primary text-white",
          cancelButton: "bg-pos-surface-muted text-pos-ink",
        },
      }}
    />
  );
}
