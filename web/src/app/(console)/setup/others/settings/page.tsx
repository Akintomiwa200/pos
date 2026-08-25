"use client";

import { Suspense } from "react";
import { SettingsManager } from "@/components/setup/SettingsManager";
import { ManagerSkeleton } from "@/components/Skeleton";

export default function SettingsPage() {
  return (
    <Suspense fallback={<ManagerSkeleton variant="list" />}>
      <SettingsManager />
    </Suspense>
  );
}
