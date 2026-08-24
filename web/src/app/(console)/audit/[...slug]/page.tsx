import { DepartmentPage } from "@/components/DepartmentPage";
import { AuditPages, type AuditVariant } from "@/components/audit/AuditPages";

const VARIANTS: Record<string, AuditVariant> = {
  "x-report": "x-report",
  "z-report": "z-report",
  tenders: "tenders",
  tickets: "tickets",
  cashiers: "cashiers",
  drawer: "drawer",
  exceptions: "exceptions",
};

export default async function AuditSlugPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug = [] } = await params;
  const key = slug.join("/");
  const variant = VARIANTS[key];
  if (!variant) {
    return (
      <DepartmentPage
        kicker="Account · Audit"
        title={slug.length ? slug.join(" / ") : "Audit"}
      />
    );
  }
  return <AuditPages variant={variant} />;
}
