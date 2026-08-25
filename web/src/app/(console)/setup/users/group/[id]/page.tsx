"use client";

import { use, useMemo } from "react";
import { GroupProfile } from "@/components/setup/groups/GroupProfile";

export default function GroupDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const groupId = useMemo(() => decodeURIComponent(id), [id]);
  return <GroupProfile groupId={groupId} />;
}
