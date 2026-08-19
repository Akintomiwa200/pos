"use client";

import { TillManager } from "@/components/TillManager";

export default function SetupTillPage() {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
        Setup · Others
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Till</h1>
      <p className="mt-2 mb-6 max-w-3xl text-neutral-500">
        Each physical register is one till, and a till can be online on only one
        device at a time. The first time a device is used, staff must enter the
        till code before they can sign in. After that, sign-in is enough until
        the one-year subscription ends — then the code is required again to
        renew. TILL-DEMO-01 is issued for first-install tests.
      </p>
      <TillManager />
    </div>
  );
}
