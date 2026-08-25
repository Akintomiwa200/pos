"use client";

import { use, useMemo } from "react";
import { AccountProfile } from "@/components/setup/accounts/AccountProfile";

export default function AccountProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const accountId = useMemo(() => decodeURIComponent(id), [id]);
  return <AccountProfile accountId={accountId} />;
}
