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
      theme={resolved}
      toastOptions={{
        className: "font-sans",
      }}
    />
  );
}
