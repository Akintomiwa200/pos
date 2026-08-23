import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Public marketing + auth chrome: sticky navbar, page content, footer. */
export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-pos-bg text-pos-ink">
      <SiteHeader />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
