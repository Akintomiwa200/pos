"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { toast } from "@/lib/toast";
import { listDirectory, type DirectoryRecord } from "@/lib/hq-directory";
import { naira } from "@/lib/hq-ops";
import {
  deleteCredit,
  deleteCreditRule,
  deleteCustomerGroup,
  deleteGiftBatch,
  deleteGiftCard,
  deleteLoyaltyCard,
  deleteLoyaltyMember,
  getLoyaltyProgram,
  listCreditRules,
  listCredits,
  listCustomerGroups,
  listGiftBatches,
  listGiftCards,
  listLoyaltyCards,
  listLoyaltyMembers,
  saveCredit,
  saveCreditRule,
  saveCustomerGroup,
  saveGiftBatch,
  saveGiftCard,
  saveLoyaltyCard,
  saveLoyaltyMember,
  saveLoyaltyProgram,
  type CustomerCredit,
  type CustomerCreditRule,
  type CustomerGroup,
  type GiftCard,
  type GiftCardBatch,
  type LoyaltyCard,
  type LoyaltyMember,
  type LoyaltyProgram,
} from "@/lib/hq-customers";
import { DIRECTORY_CONFIGS, DirectoryManager } from "../DirectoryManager";
import { ManagerSkeleton } from "../../Skeleton";
import { SlideOver } from "../../SlideOver";
import {
  DataTable,
  Field,
  PrimaryButton,
  SetupHeader,
  SetupStat,
  ToggleField,
  fieldClass,
  secondaryButtonClass,
} from "../SetupChrome";

const KICKER = "Workspace · Customers";

function minorFromInput(value: string) {
  const n = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}

function inputFromMinor(minor: number) {
  return (minor / 100).toFixed(2);
}

function useCustomers() {
  const [customers, setCustomers] = useState<DirectoryRecord[]>([]);
  useEffect(() => {
    listDirectory("customers")
      .then(setCustomers)
      .catch(() => setCustomers([]));
  }, []);
  return customers;
}

export function CustomerListManager() {
  const config = {
    ...DIRECTORY_CONFIGS.customer,
    kicker: KICKER,
    title: "All Customers",
    copy: "People and businesses you sell to — names, contacts, and credit notes on file.",
  };
  return <DirectoryManager config={config} />;
}

export function CustomerGroupsManager() {
  const [rows, setRows] = useState<CustomerGroup[]>([]);
  const [draft, setDraft] = useState<Partial<CustomerGroup>>({ name: "", note: "", active: true });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listCustomerGroups());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load customer groups.");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Customer Groups"
        copy="Segment customers for pricing, credit terms, or reporting — e.g. trade, walk-in, VIP."
        action={
          <PrimaryButton onClick={() => { setDraft({ name: "", note: "", active: true }); setOpen(true); }}>
            <span className="inline-flex items-center gap-2"><Plus size={16} />New group</span>
          </PrimaryButton>
        }
      />
      <DataTable columns={["Name", "Note", "Status"]}>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="cursor-pointer hover:bg-pos-surface-muted"
            onClick={() => { setDraft(row); setOpen(true); }}
          >
            <td className="px-4 py-3 font-medium">{row.name}</td>
            <td className="px-4 py-3 text-pos-ink-muted">{row.note || "—"}</td>
            <td className="px-4 py-3">{row.active ? "Active" : "Inactive"}</td>
          </tr>
        ))}
      </DataTable>
      <CrudSlideOver
        open={open}
        busy={busy}
        title={draft.id ? "Edit group" : "New group"}
        onClose={() => setOpen(false)}
        onDelete={draft.id ? async () => {
          await deleteCustomerGroup(draft.id!);
          await load();
          setOpen(false);
          toast.success("Group deleted.");
        } : undefined}
        onSave={async () => {
          if (!draft.name?.trim()) { toast.error("Enter a group name."); return; }
          setBusy(true);
          try {
            await saveCustomerGroup(draft);
            await load();
            setOpen(false);
            toast.success("Group saved.");
          } catch (err) {
            toast.error(err, "Could not save group.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Name">
          <input className={fieldClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Note">
          <textarea rows={2} className={fieldClass} value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </Field>
        <ToggleField label="Active" checked={draft.active ?? true} onChange={(active) => setDraft({ ...draft, active })} />
      </CrudSlideOver>
    </div>
  );
}

export function CustomerCreditsManager() {
  const customers = useCustomers();
  const [rows, setRows] = useState<CustomerCredit[]>([]);
  const [draft, setDraft] = useState<Partial<CustomerCredit>>({ active: true, terms: "Net 30" });
  const [limitInput, setLimitInput] = useState("0.00");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listCredits());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load credits.");
      setReady(true);
    });
  }, []);

  const totalExposure = useMemo(
    () => rows.reduce((sum, row) => sum + row.balanceMinor, 0),
    [rows],
  );

  if (!ready) return <ManagerSkeleton variant="table" />;

  function openNew() {
    setDraft({ active: true, terms: "Net 30", customerId: "", customerName: "", balanceMinor: 0 });
    setLimitInput("0.00");
    setOpen(true);
  }

  function openEdit(row: CustomerCredit) {
    setDraft(row);
    setLimitInput(inputFromMinor(row.limitMinor));
    setOpen(true);
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Customer Credits"
        copy="Credit limits and outstanding balances for trade accounts."
        action={<PrimaryButton onClick={openNew}><span className="inline-flex items-center gap-2"><Plus size={16} />Assign credit</span></PrimaryButton>}
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <SetupStat label="Accounts" value={String(rows.length)} hint={`${rows.filter((r) => r.active).length} active`} />
        <SetupStat label="Outstanding" value={naira(totalExposure)} tone="accent" />
        <SetupStat label="Total limit" value={naira(rows.reduce((s, r) => s + r.limitMinor, 0))} />
      </div>
      <DataTable columns={["Customer", "Limit", "Balance", "Terms", "Status"]}>
        {rows.map((row) => (
          <tr key={row.id} className="cursor-pointer hover:bg-pos-surface-muted" onClick={() => openEdit(row)}>
            <td className="px-4 py-3 font-medium">{row.customerName}</td>
            <td className="px-4 py-3 tabular-nums">{naira(row.limitMinor)}</td>
            <td className="px-4 py-3 tabular-nums">{naira(row.balanceMinor)}</td>
            <td className="px-4 py-3 text-pos-ink-muted">{row.terms}</td>
            <td className="px-4 py-3">{row.active ? "Active" : "Inactive"}</td>
          </tr>
        ))}
      </DataTable>
      <CrudSlideOver
        open={open}
        busy={busy}
        title={draft.id ? "Edit credit" : "Assign credit"}
        onClose={() => setOpen(false)}
        onDelete={draft.id ? async () => {
          await deleteCredit(draft.id!);
          await load();
          setOpen(false);
          toast.success("Credit removed.");
        } : undefined}
        onSave={async () => {
          const customer = customers.find((c) => c.id === draft.customerId);
          if (!customer && !draft.customerName?.trim()) {
            toast.error("Select a customer.");
            return;
          }
          setBusy(true);
          try {
            await saveCredit({
              ...draft,
              customerId: draft.customerId || customer?.id || "",
              customerName: customer?.name || draft.customerName || "",
              limitMinor: minorFromInput(limitInput),
            });
            await load();
            setOpen(false);
            toast.success("Credit saved.");
          } catch (err) {
            toast.error(err, "Could not save credit.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Customer">
          <select
            className={fieldClass}
            value={draft.customerId ?? ""}
            onChange={(e) => {
              const customer = customers.find((c) => c.id === e.target.value);
              setDraft({ ...draft, customerId: e.target.value, customerName: customer?.name });
            }}
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Credit limit (₦)">
          <input className={fieldClass} value={limitInput} onChange={(e) => setLimitInput(e.target.value)} />
        </Field>
        <Field label="Terms">
          <input className={fieldClass} value={draft.terms ?? ""} onChange={(e) => setDraft({ ...draft, terms: e.target.value })} />
        </Field>
        <ToggleField label="Active" checked={draft.active ?? true} onChange={(active) => setDraft({ ...draft, active })} />
      </CrudSlideOver>
    </div>
  );
}

export function CustomerCreditRulesManager() {
  const [rows, setRows] = useState<CustomerCreditRule[]>([]);
  const [draft, setDraft] = useState<Partial<CustomerCreditRule>>({ active: true, requireApproval: false });
  const [balanceInput, setBalanceInput] = useState("0.00");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listCreditRules());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load credit rules.");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Credit Rules"
        copy="Default terms applied when opening new trade accounts — days, limits, and approval gates."
        action={
          <PrimaryButton onClick={() => {
            setDraft({ name: "", maxDays: 30, requireApproval: false, note: "", active: true });
            setBalanceInput("0.00");
            setOpen(true);
          }}>
            <span className="inline-flex items-center gap-2"><Plus size={16} />New rule</span>
          </PrimaryButton>
        }
      />
      <DataTable columns={["Rule", "Max days", "Max balance", "Approval", "Status"]}>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="cursor-pointer hover:bg-pos-surface-muted"
            onClick={() => {
              setDraft(row);
              setBalanceInput(inputFromMinor(row.maxBalanceMinor));
              setOpen(true);
            }}
          >
            <td className="px-4 py-3 font-medium">{row.name}</td>
            <td className="px-4 py-3 tabular-nums">{row.maxDays}</td>
            <td className="px-4 py-3 tabular-nums">{naira(row.maxBalanceMinor)}</td>
            <td className="px-4 py-3">{row.requireApproval ? "Required" : "Auto"}</td>
            <td className="px-4 py-3">{row.active ? "Active" : "Inactive"}</td>
          </tr>
        ))}
      </DataTable>
      <CrudSlideOver
        open={open}
        busy={busy}
        title={draft.id ? "Edit rule" : "New rule"}
        onClose={() => setOpen(false)}
        onDelete={draft.id ? async () => {
          await deleteCreditRule(draft.id!);
          await load();
          setOpen(false);
          toast.success("Rule deleted.");
        } : undefined}
        onSave={async () => {
          if (!draft.name?.trim()) { toast.error("Enter a rule name."); return; }
          setBusy(true);
          try {
            await saveCreditRule({
              ...draft,
              maxBalanceMinor: minorFromInput(balanceInput),
            });
            await load();
            setOpen(false);
            toast.success("Rule saved.");
          } catch (err) {
            toast.error(err, "Could not save rule.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Name">
          <input className={fieldClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Max days">
          <input type="number" className={fieldClass} value={draft.maxDays ?? 30} onChange={(e) => setDraft({ ...draft, maxDays: Number(e.target.value) })} />
        </Field>
        <Field label="Max balance (₦)">
          <input className={fieldClass} value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} />
        </Field>
        <Field label="Note">
          <textarea rows={2} className={fieldClass} value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </Field>
        <ToggleField label="Require approval" checked={draft.requireApproval ?? false} onChange={(v) => setDraft({ ...draft, requireApproval: v })} />
        <ToggleField label="Active" checked={draft.active ?? true} onChange={(active) => setDraft({ ...draft, active })} />
      </CrudSlideOver>
    </div>
  );
}

export function LoyaltyProgramManager() {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getLoyaltyProgram()
      .then(setProgram)
      .catch((err) => {
        toast.error(err, "Could not load loyalty programme.");
      })
      .finally(() => setReady(true));
  }, []);

  if (!ready || !program) return <ManagerSkeleton variant="table" />;

  async function save(current: LoyaltyProgram) {
    setBusy(true);
    try {
      const next = await saveLoyaltyProgram(current);
      setProgram(next);
      toast.success("Programme saved.");
    } catch (err) {
      toast.error(err, "Could not save programme.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Loyalty Programme"
        copy="Turn loyalty on, set earn and redeem rates, and choose how cashiers identify members at checkout."
        action={<PrimaryButton disabled={busy} onClick={() => save(program)}>Save programme</PrimaryButton>}
      />
      <section className="max-w-xl space-y-1 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <ToggleField label="Loyalty enabled" checked={program.enabled} onChange={(enabled) => setProgram({ ...program, enabled })} />
        <Field label="Earn points per ₦ spent">
          <input type="number" className={fieldClass} value={program.earnPerNaira} onChange={(e) => setProgram({ ...program, earnPerNaira: Number(e.target.value) })} />
        </Field>
        <Field label="Redeem value per point (kobo)">
          <input type="number" className={fieldClass} value={program.redeemValueMinor} onChange={(e) => setProgram({ ...program, redeemValueMinor: Number(e.target.value) })} />
        </Field>
        <Field label="Welcome bonus points">
          <input type="number" className={fieldClass} value={program.welcomeBonusPoints} onChange={(e) => setProgram({ ...program, welcomeBonusPoints: Number(e.target.value) })} />
        </Field>
        <Field label="Checkout prompt">
          <select className={fieldClass} value={program.prompt} onChange={(e) => setProgram({ ...program, prompt: e.target.value as LoyaltyProgram["prompt"] })}>
            <option value="phone">Phone</option>
            <option value="card">Card</option>
            <option value="either">Phone or card</option>
          </select>
        </Field>
        <ToggleField label="Allow skip at till" checked={program.allowSkip} onChange={(v) => setProgram({ ...program, allowSkip: v })} />
        <ToggleField label="Auto-apply points" checked={program.autoApply} onChange={(v) => setProgram({ ...program, autoApply: v })} />
      </section>
    </div>
  );
}

export function LoyaltyRulesManager() {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getLoyaltyProgram()
      .then(setProgram)
      .catch((err) => toast.error(err, "Could not load loyalty rules."))
      .finally(() => setReady(true));
  }, []);

  if (!ready || !program) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Loyalty Rules"
        copy="Fine-tune earn, redeem, and identification rules without changing programme status."
        action={
          <PrimaryButton
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const next = await saveLoyaltyProgram(program);
                setProgram(next);
                toast.success("Rules saved.");
              } catch (err) {
                toast.error(err, "Could not save rules.");
              } finally {
                setBusy(false);
              }
            }}
          >
            Save rules
          </PrimaryButton>
        }
      />
      <section className="max-w-xl space-y-1 rounded-[24px] bg-pos-surface p-5 shadow-pos-md">
        <Field label="Minimum card / phone digits">
          <input type="number" className={fieldClass} value={program.minDigits} onChange={(e) => setProgram({ ...program, minDigits: Number(e.target.value) })} />
        </Field>
        <Field label="Points earned per ₦100">
          <input type="number" className={fieldClass} value={program.earnPerNaira} onChange={(e) => setProgram({ ...program, earnPerNaira: Number(e.target.value) })} />
        </Field>
        <Field label="Redeem value (kobo per point)">
          <input type="number" className={fieldClass} value={program.redeemValueMinor} onChange={(e) => setProgram({ ...program, redeemValueMinor: Number(e.target.value) })} />
        </Field>
        <Field label="Welcome bonus">
          <input type="number" className={fieldClass} value={program.welcomeBonusPoints} onChange={(e) => setProgram({ ...program, welcomeBonusPoints: Number(e.target.value) })} />
        </Field>
        <ToggleField label="Require identification" checked={!program.allowSkip} onChange={(v) => setProgram({ ...program, allowSkip: !v })} />
      </section>
    </div>
  );
}

export function LoyaltyRegistrationManager() {
  const customers = useCustomers();
  const [rows, setRows] = useState<LoyaltyMember[]>([]);
  const [draft, setDraft] = useState<Partial<LoyaltyMember>>({ active: true, points: 0 });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listLoyaltyMembers());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load members.");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Loyalty Registration"
        copy="Register shoppers for your loyalty programme and track their point balances."
        action={
          <PrimaryButton onClick={() => { setDraft({ name: "", phone: "", points: 0, active: true }); setOpen(true); }}>
            <span className="inline-flex items-center gap-2"><Plus size={16} />Register member</span>
          </PrimaryButton>
        }
      />
      <DataTable columns={["Member", "Phone", "Card", "Points", "Status"]}>
        {rows.map((row) => (
          <tr key={row.id} className="cursor-pointer hover:bg-pos-surface-muted" onClick={() => { setDraft(row); setOpen(true); }}>
            <td className="px-4 py-3 font-medium">{row.name}</td>
            <td className="px-4 py-3">{row.phone}</td>
            <td className="px-4 py-3 text-pos-ink-muted">{row.cardNumber || "—"}</td>
            <td className="px-4 py-3 tabular-nums">{row.points}</td>
            <td className="px-4 py-3">{row.active ? "Active" : "Inactive"}</td>
          </tr>
        ))}
      </DataTable>
      <CrudSlideOver
        open={open}
        busy={busy}
        title={draft.id ? "Edit member" : "Register member"}
        onClose={() => setOpen(false)}
        onDelete={draft.id ? async () => {
          await deleteLoyaltyMember(draft.id!);
          await load();
          setOpen(false);
          toast.success("Member removed.");
        } : undefined}
        onSave={async () => {
          if (!draft.name?.trim() || !draft.phone?.trim()) {
            toast.error("Name and phone are required.");
            return;
          }
          setBusy(true);
          try {
            await saveLoyaltyMember(draft);
            await load();
            setOpen(false);
            toast.success("Member saved.");
          } catch (err) {
            toast.error(err, "Could not save member.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Link to customer (optional)">
          <select
            className={fieldClass}
            value={draft.customerId ?? ""}
            onChange={(e) => {
              const customer = customers.find((c) => c.id === e.target.value);
              setDraft({
                ...draft,
                customerId: e.target.value || undefined,
                name: customer?.name || draft.name,
                phone: customer?.phone || draft.phone,
                email: customer?.email || draft.email,
              });
            }}
          >
            <option value="">Walk-in / new</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Name">
          <input className={fieldClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Phone">
          <input className={fieldClass} value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className={fieldClass} value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        </Field>
        <Field label="Card number (optional)">
          <input className={fieldClass} value={draft.cardNumber ?? ""} onChange={(e) => setDraft({ ...draft, cardNumber: e.target.value })} />
        </Field>
        <Field label="Points">
          <input type="number" className={fieldClass} value={draft.points ?? 0} onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })} />
        </Field>
        <ToggleField label="Active" checked={draft.active ?? true} onChange={(active) => setDraft({ ...draft, active })} />
      </CrudSlideOver>
    </div>
  );
}

export function LoyaltyCardsManager() {
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [rows, setRows] = useState<LoyaltyCard[]>([]);
  const [draft, setDraft] = useState<Partial<LoyaltyCard>>({ active: true, tier: "Standard" });
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [cards, loyaltyMembers] = await Promise.all([listLoyaltyCards(), listLoyaltyMembers()]);
    setRows(cards);
    setMembers(loyaltyMembers);
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load loyalty cards.");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Assign Loyalty Cards"
        copy="Issue physical or virtual loyalty cards and link them to registered members."
        action={
          <PrimaryButton onClick={() => { setDraft({ cardNumber: "", tier: "Standard", active: true }); setOpen(true); }}>
            <span className="inline-flex items-center gap-2"><Plus size={16} />Assign card</span>
          </PrimaryButton>
        }
      />
      <DataTable columns={["Member", "Card number", "Tier", "Issued", "Status"]}>
        {rows.map((row) => (
          <tr key={row.id} className="cursor-pointer hover:bg-pos-surface-muted" onClick={() => { setDraft(row); setOpen(true); }}>
            <td className="px-4 py-3 font-medium">{row.memberName}</td>
            <td className="px-4 py-3 font-mono text-[13px]">{row.cardNumber}</td>
            <td className="px-4 py-3">{row.tier}</td>
            <td className="px-4 py-3 text-pos-ink-muted">{new Date(row.issuedAt).toLocaleDateString("en-NG")}</td>
            <td className="px-4 py-3">{row.active ? "Active" : "Inactive"}</td>
          </tr>
        ))}
      </DataTable>
      <CrudSlideOver
        open={open}
        busy={busy}
        title={draft.id ? "Edit card" : "Assign card"}
        onClose={() => setOpen(false)}
        onDelete={draft.id ? async () => {
          await deleteLoyaltyCard(draft.id!);
          await load();
          setOpen(false);
          toast.success("Card removed.");
        } : undefined}
        onSave={async () => {
          const member = members.find((m) => m.id === draft.memberId);
          if (!member) { toast.error("Select a member."); return; }
          if (!draft.cardNumber?.trim()) { toast.error("Enter a card number."); return; }
          setBusy(true);
          try {
            await saveLoyaltyCard({
              ...draft,
              memberId: member.id,
              memberName: member.name,
            });
            await load();
            setOpen(false);
            toast.success("Card saved.");
          } catch (err) {
            toast.error(err, "Could not save card.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Member">
          <select
            className={fieldClass}
            value={draft.memberId ?? ""}
            onChange={(e) => {
              const member = members.find((m) => m.id === e.target.value);
              setDraft({
                ...draft,
                memberId: e.target.value,
                memberName: member?.name,
                cardNumber: draft.cardNumber || member?.cardNumber || "",
              });
            }}
          >
            <option value="">Select member…</option>
            {members.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Card number">
          <input className={fieldClass} value={draft.cardNumber ?? ""} onChange={(e) => setDraft({ ...draft, cardNumber: e.target.value })} />
        </Field>
        <Field label="Tier">
          <input className={fieldClass} value={draft.tier ?? "Standard"} onChange={(e) => setDraft({ ...draft, tier: e.target.value })} />
        </Field>
        <ToggleField label="Active" checked={draft.active ?? true} onChange={(active) => setDraft({ ...draft, active })} />
      </CrudSlideOver>
    </div>
  );
}

export function GiftCardsManager() {
  const [rows, setRows] = useState<GiftCard[]>([]);
  const [draft, setDraft] = useState<Partial<GiftCard>>({ active: true });
  const [balanceInput, setBalanceInput] = useState("0.00");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listGiftCards());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load gift cards.");
      setReady(true);
    });
  }, []);

  const outstanding = useMemo(() => rows.reduce((s, r) => s + r.balanceMinor, 0), [rows]);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Gift Cards"
        copy="Track issued gift cards, balances, and expiry for redemption at checkout."
        action={
          <PrimaryButton onClick={() => {
            setDraft({ code: "", active: true });
            setBalanceInput("0.00");
            setOpen(true);
          }}>
            <span className="inline-flex items-center gap-2"><Plus size={16} />Issue card</span>
          </PrimaryButton>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <SetupStat label="Cards" value={String(rows.length)} hint={`${rows.filter((r) => r.active).length} active`} />
        <SetupStat label="Outstanding balance" value={naira(outstanding)} tone="accent" />
      </div>
      <DataTable columns={["Code", "Balance", "Initial", "Holder", "Status"]}>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="cursor-pointer hover:bg-pos-surface-muted"
            onClick={() => {
              setDraft(row);
              setBalanceInput(inputFromMinor(row.balanceMinor));
              setOpen(true);
            }}
          >
            <td className="px-4 py-3 font-mono text-[13px]">{row.code}</td>
            <td className="px-4 py-3 tabular-nums">{naira(row.balanceMinor)}</td>
            <td className="px-4 py-3 tabular-nums">{naira(row.initialMinor)}</td>
            <td className="px-4 py-3 text-pos-ink-muted">{row.customerName || "—"}</td>
            <td className="px-4 py-3">{row.active ? "Active" : "Inactive"}</td>
          </tr>
        ))}
      </DataTable>
      <CrudSlideOver
        open={open}
        busy={busy}
        title={draft.id ? "Edit gift card" : "Issue gift card"}
        onClose={() => setOpen(false)}
        onDelete={draft.id ? async () => {
          await deleteGiftCard(draft.id!);
          await load();
          setOpen(false);
          toast.success("Gift card removed.");
        } : undefined}
        onSave={async () => {
          if (!draft.code?.trim()) { toast.error("Enter a card code."); return; }
          const balanceMinor = minorFromInput(balanceInput);
          setBusy(true);
          try {
            await saveGiftCard({
              ...draft,
              balanceMinor,
              initialMinor: draft.initialMinor ?? balanceMinor,
            });
            await load();
            setOpen(false);
            toast.success("Gift card saved.");
          } catch (err) {
            toast.error(err, "Could not save gift card.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Code">
          <input className={fieldClass} value={draft.code ?? ""} onChange={(e) => setDraft({ ...draft, code: e.target.value })} />
        </Field>
        <Field label="Balance (₦)">
          <input className={fieldClass} value={balanceInput} onChange={(e) => setBalanceInput(e.target.value)} />
        </Field>
        <Field label="Holder name (optional)">
          <input className={fieldClass} value={draft.customerName ?? ""} onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} />
        </Field>
        <Field label="Expires (optional)">
          <input type="date" className={fieldClass} value={draft.expiresAt?.slice(0, 10) ?? ""} onChange={(e) => setDraft({ ...draft, expiresAt: e.target.value || undefined })} />
        </Field>
        <ToggleField label="Active" checked={draft.active ?? true} onChange={(active) => setDraft({ ...draft, active })} />
      </CrudSlideOver>
    </div>
  );
}

export function GiftBatchesManager() {
  const [rows, setRows] = useState<GiftCardBatch[]>([]);
  const [draft, setDraft] = useState<Partial<GiftCardBatch>>({ count: 1 });
  const [amountInput, setAmountInput] = useState("0.00");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    setRows(await listGiftBatches());
    setReady(true);
  }

  useEffect(() => {
    load().catch((err) => {
      toast.error(err, "Could not load gift batches.");
      setReady(true);
    });
  }, []);

  if (!ready) return <ManagerSkeleton variant="table" />;

  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Gift Card Batches"
        copy="Pre-generate batches of gift cards for campaigns — holiday promos, corporate gifts, etc."
        action={
          <PrimaryButton onClick={() => {
            setDraft({ name: "", count: 10, note: "" });
            setAmountInput("5000.00");
            setOpen(true);
          }}>
            <span className="inline-flex items-center gap-2"><Plus size={16} />New batch</span>
          </PrimaryButton>
        }
      />
      <DataTable columns={["Batch", "Count", "Face value", "Created", "Note"]}>
        {rows.map((row) => (
          <tr
            key={row.id}
            className="cursor-pointer hover:bg-pos-surface-muted"
            onClick={() => {
              setDraft(row);
              setAmountInput(inputFromMinor(row.amountMinor));
              setOpen(true);
            }}
          >
            <td className="px-4 py-3 font-medium">{row.name}</td>
            <td className="px-4 py-3 tabular-nums">{row.count}</td>
            <td className="px-4 py-3 tabular-nums">{naira(row.amountMinor)}</td>
            <td className="px-4 py-3 text-pos-ink-muted">{new Date(row.createdAt).toLocaleDateString("en-NG")}</td>
            <td className="px-4 py-3 text-pos-ink-muted">{row.note || "—"}</td>
          </tr>
        ))}
      </DataTable>
      <CrudSlideOver
        open={open}
        busy={busy}
        title={draft.id ? "Edit batch" : "New batch"}
        onClose={() => setOpen(false)}
        onDelete={draft.id ? async () => {
          await deleteGiftBatch(draft.id!);
          await load();
          setOpen(false);
          toast.success("Batch removed.");
        } : undefined}
        onSave={async () => {
          if (!draft.name?.trim()) { toast.error("Enter a batch name."); return; }
          setBusy(true);
          try {
            await saveGiftBatch({
              ...draft,
              amountMinor: minorFromInput(amountInput),
            });
            await load();
            setOpen(false);
            toast.success("Batch saved.");
          } catch (err) {
            toast.error(err, "Could not save batch.");
          } finally {
            setBusy(false);
          }
        }}
      >
        <Field label="Batch name">
          <input className={fieldClass} value={draft.name ?? ""} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        </Field>
        <Field label="Number of cards">
          <input type="number" className={fieldClass} value={draft.count ?? 1} onChange={(e) => setDraft({ ...draft, count: Number(e.target.value) })} />
        </Field>
        <Field label="Face value each (₦)">
          <input className={fieldClass} value={amountInput} onChange={(e) => setAmountInput(e.target.value)} />
        </Field>
        <Field label="Note">
          <textarea rows={2} className={fieldClass} value={draft.note ?? ""} onChange={(e) => setDraft({ ...draft, note: e.target.value })} />
        </Field>
      </CrudSlideOver>
    </div>
  );
}

export function CustomerImportManager() {
  return (
    <div>
      <SetupHeader
        kicker={KICKER}
        title="Import Customers"
        copy="Bulk-load customer names, phones, and addresses from a spreadsheet."
      />
      <section className="max-w-xl rounded-[24px] bg-pos-surface p-6 shadow-pos-md">
        <p className="text-sm leading-relaxed text-pos-ink-muted">
          Use the organisation import tool to upload a CSV of customers. Map columns to name, phone,
          email, and address — then review before committing.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/setup/others/import" className={secondaryButtonClass}>
            <Upload size={16} />
            Open import wizard
          </Link>
          <Link href="/setup/customers/list" className={secondaryButtonClass}>
            Back to customer list
          </Link>
        </div>
      </section>
    </div>
  );
}

function CrudSlideOver({
  open,
  title,
  busy,
  onClose,
  onSave,
  onDelete,
  children,
}: {
  open: boolean;
  title: string;
  busy: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onDelete?: () => Promise<void>;
  children: React.ReactNode;
}) {
  return (
    <SlideOver
      open={open}
      title={title}
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          {onDelete ? (
            <button
              type="button"
              className="rounded-xl border border-pos-border px-4 py-2.5 text-sm text-pos-ink hover:bg-pos-surface-muted"
              onClick={() => onDelete().catch((err) => toast.error(err, "Could not delete."))}
            >
              Delete
            </button>
          ) : null}
          <PrimaryButton className="flex-1" disabled={busy} onClick={() => onSave()}>
            Save
          </PrimaryButton>
        </div>
      }
    >
      {children}
    </SlideOver>
  );
}
