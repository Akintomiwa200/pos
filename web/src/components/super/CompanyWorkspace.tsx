"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { adminOrgLinksForCompany, OrgLinksProvider } from "@/lib/org-links";
import { COMPANY_SECTIONS, companyPath, LEGACY_COMPANY_ROUTES } from "@/lib/company-workspace";
import { useLivePos } from "@/lib/live-pos";
import { ManagerSkeleton } from "@/components/Skeleton";

export function CompanyWorkspace({
  companyId,
  children,
}: {
  companyId: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { company, ready } = useLivePos();

  const legacy = LEGACY_COMPANY_ROUTES[companyId];
  useEffect(() => {
    if (legacy) {
      router.replace(companyPath("current", legacy));
    }
  }, [legacy, router]);

  useEffect(() => {
    if (!ready || !company || legacy) return;
    if (companyId === "current" && company.id && pathname.startsWith("/admin/companies/current")) {
      router.replace(pathname.replace("/admin/companies/current", `/admin/companies/${company.id}`));
    }
  }, [ready, company, companyId, pathname, router, legacy]);

  if (legacy) return <ManagerSkeleton variant="list" />;
  if (!ready) return <ManagerSkeleton variant="list" />;
  if (!company) {
    return (
      <p className="text-sm text-pos-ink-muted">
        No company registered.{" "}
        <Link href="/admin/companies/register" className="font-medium text-pos-primary hover:underline">
          Register a company
        </Link>
        .
      </p>
    );
  }

  if (companyId !== "current" && companyId !== company.id) {
    return (
      <p className="text-sm text-pos-ink-muted">
        Company not found.{" "}
        <Link href={companyPath(company.id)} className="font-medium text-pos-primary hover:underline">
          Open {company.name}
        </Link>
        .
      </p>
    );
  }

  const id = companyId === "current" ? company.id : companyId;
  const active = pathname.replace(`/admin/companies/${companyId}`, "").replace(/^\//, "");

  return (
    <OrgLinksProvider value={adminOrgLinksForCompany(id)}>
      <div className="mb-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-pos-ink-faint">
          Companies
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[clamp(1.4rem,3vw,2rem)] font-medium tracking-tight text-pos-ink-faint">
              {company.name}
            </h1>
            <p className="mt-1 text-sm text-pos-ink-muted">
              {company.email || "No email"} · {company.state || company.country}
            </p>
          </div>
          <Link
            href="/admin/companies"
            className="text-[13px] font-medium text-pos-primary hover:underline"
          >
            All companies
          </Link>
        </div>
      </div>
      <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto pb-1">
        {COMPANY_SECTIONS.map((section) => {
          const href = companyPath(id, section.id);
          const current = active === section.id;
          return (
            <Link
              key={section.id || "overview"}
              href={href}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium ${
                current
                  ? "bg-pos-primary text-white"
                  : "text-pos-ink-muted hover:bg-pos-surface-muted hover:text-pos-ink"
              }`}
            >
              {section.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </OrgLinksProvider>
  );
}
