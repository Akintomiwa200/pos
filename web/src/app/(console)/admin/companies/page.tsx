import { Suspense } from "react";
import { SuperCompanies } from "@/components/super/SuperCompanies";

export default function AdminCompaniesPage() {
  return (
    <Suspense>
      <SuperCompanies />
    </Suspense>
  );
}
