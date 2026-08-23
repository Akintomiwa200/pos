import type { ReactNode } from "react";

/** Dedicated auth screens — no marketing navbar/footer (matches Figma). */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return children;
}
