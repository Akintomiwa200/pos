"use client";

import { use } from "react";
import { SuperPlatformPage } from "@/components/super/SuperPlatformPage";

export default function AdminCatchAllPage({
  params,
}: {
  params: Promise<{ slug: string[] }>;
}) {
  const { slug } = use(params);
  return <SuperPlatformPage path={`/admin/${slug.join("/")}`} />;
}
