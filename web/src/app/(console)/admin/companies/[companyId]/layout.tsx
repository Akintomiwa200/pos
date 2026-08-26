"use client";

import { use } from "react";
import { CompanyWorkspace } from "@/components/super/CompanyWorkspace";

export default function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  return <CompanyWorkspace companyId={companyId}>{children}</CompanyWorkspace>;
}
