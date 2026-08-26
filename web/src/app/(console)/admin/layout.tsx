"use client";

import { ADMIN_ORG_LINKS, OrgLinksProvider } from "@/lib/org-links";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <OrgLinksProvider value={ADMIN_ORG_LINKS}>{children}</OrgLinksProvider>;
}
