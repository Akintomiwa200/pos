"use client";

import { use } from "react";
import { CompanySection } from "@/components/super/CompanySection";

export default function CompanySectionPage({
  params,
}: {
  params: Promise<{ companyId: string; section?: string[] }>;
}) {
  const { companyId, section = [] } = use(params);
  return <CompanySection companyId={companyId} section={section[0] ?? ""} />;
}
