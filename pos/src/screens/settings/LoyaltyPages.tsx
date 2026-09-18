import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowLeft,
  CreditCard,
  ListChecks,
  Plus,
  SlidersHorizontal,
  Trash2,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import {
  applyProgramToTill,
  deleteLoyaltyCard,
  deleteLoyaltyMember,
  getLoyaltyProgram,
  listLoyaltyCards,
  listLoyaltyMembers,
  saveLoyaltyCard,
  saveLoyaltyMember,
  saveLoyaltyProgram,
  type LoyaltyCard,
  type LoyaltyMember,
  type LoyaltyProgram,
} from "../../lib/loyalty";
import { formatMoney } from "../../lib/types";
import {
  LiveNote,
  NumField,
  SelectField,
  SetCard,
  SetRow,
  Toggle,
} from "./settings-ui";

type SubPage = "hub" | "program" | "rules" | "register" | "cards";

type HubSummary = {
  enabled: boolean;
  members: number;
  cards: number;
  earnPerNaira: number;
  redeemNaira: number;
};

export function LoyaltyHub({ onBack }: { onBack: () => void }) {
  const [page, setPage] = useState<SubPage>("hub");
  const [summary, setSummary] = useState<HubSummary | null>(null);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      getLoyaltyProgram(),
      listLoyaltyMembers(),
      listLoyaltyCards(),
    ])
      .then(([program, members, cards]) => {
        if (cancelled) return;
        applyProgramToTill(program);
        setSummary({
          enabled: program.enabled,
          members: members.length,
          cards: cards.length,
          earnPerNaira: program.earnPerNaira,
          redeemNaira: program.redeemValueMinor / 100,
        });
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load the loyalty programme.",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  if (page === "program") {
    return <LoyaltyProgramPage onBack={() => setPage("hub")} />;
  }
  if (page === "rules") {
    return <LoyaltyRulesPage onBack={() => setPage("hub")} />;
  }
  if (page === "register") {
    return <LoyaltyRegistrationPage onBack={() => setPage("hub")} />;
  }
  if (page === "cards") {
    return <LoyaltyCardsPage onBack={() => setPage("hub")} />;
  }

  return (
    <section className="settings-full">
      <header className="settings-head">
        <button className="back" onClick={onBack}>
          <ArrowLeft size={18} /> Settings
        </button>
        <h1>Loyalty</h1>
      </header>
      <div className="settings-body">
        <p className="set-lede">
          The loyalty programme is managed across HQ and this till. Changes made
          here — or in the admin sidebar under Customers → Loyalty — reflect in
          both places at the next checkout.
        </p>
        <LiveNote>
          {summary
            ? `${
                summary.enabled
                  ? `The programme is on — 1 point per ₦${summary.earnPerNaira}, redeem ₦${summary.redeemNaira} per point.`
                  : "The programme is off — members keep their balances but no points are earned."
              } ${summary.members} member${summary.members === 1 ? "" : "s"} · ${summary.cards} card${
                summary.cards === 1 ? "" : "s"
              } issued.`
            : "Loading the shared loyalty programme…"}
        </LiveNote>
        <div className="settings-grid">
          <button className="settings-tile" onClick={() => setPage("program")}>
            <SlidersHorizontal size={54} strokeWidth={1.7} />
            <span>Programme</span>
          </button>
          <button className="settings-tile" onClick={() => setPage("rules")}>
            <ListChecks size={54} strokeWidth={1.7} />
            <span>Rules</span>
          </button>
          <button className="settings-tile" onClick={() => setPage("register")}>
            <Users size={54} strokeWidth={1.7} />
            <span>Registration</span>
          </button>
          <button className="settings-tile" onClick={() => setPage("cards")}>
            <CreditCard size={54} strokeWidth={1.7} />
            <span>Cards</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function HubHead({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <header className="settings-head">
      <button className="back" onClick={onBack}>
        <ArrowLeft size={18} /> Loyalty
      </button>
      <h1>{title}</h1>
    </header>
  );
}

function useLoyaltyProgram() {
  const [program, setProgram] = useState<LoyaltyProgram | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLoyaltyProgram()
      .then((next) => {
        if (cancelled) return;
        applyProgramToTill(next);
        setProgram(next);
      })
      .catch((error) => {
        if (!cancelled) {
          toast.error(
            error instanceof Error
              ? error.message
              : "Could not load the loyalty programme.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { program, setProgram, ready, busy, setBusy };
}

function ProgramSaveBar({
  busy,
  saving,
  onSave,
}: {
  busy: boolean;
  saving: string;
  onSave: () => void;
}) {
  return (
    <div className="loyalty-actions">
      <button className="continue" disabled={busy} onClick={onSave}>
        {busy ? "Saving…" : saving}
      </button>
    </div>
  );
}

async function persistProgram(
  program: LoyaltyProgram,
  { saveLabel }: { saveLabel: string },
) {
  const next = await saveLoyaltyProgram(program);
  applyProgramToTill(next);
  toast.success(`${saveLabel} saved — this till is updated.`);
  return next;
}

export function LoyaltyProgramPage({ onBack }: { onBack: () => void }) {
  const { program, setProgram, ready, busy, setBusy } = useLoyaltyProgram();
  if (!ready) {
    return (
      <section className="settings-full">
        <HubHead title="Programme" onBack={onBack} />
        <div className="settings-body">
          <LiveNote>Loading the shared programme…</LiveNote>
        </div>
      </section>
    );
  }
  if (!program) {
    return (
      <section className="settings-full">
        <HubHead title="Programme" onBack={onBack} />
        <div className="settings-body">
          <LiveNote>Could not load the loyalty programme.</LiveNote>
        </div>
      </section>
    );
  }
  const patch = (partial: Partial<LoyaltyProgram>) =>
    setProgram({ ...program, ...partial });

  return (
    <section className="settings-full">
      <HubHead title="Programme" onBack={onBack} />
      <div className="settings-body">
        <p className="set-lede">
          Turn loyalty on, set earn and redeem rates, and choose how cashiers
          identify members at checkout. This is the same programme shown in the
          admin console.
        </p>
        <LiveNote>
          {program.enabled
            ? `On — 1 point per ₦${program.earnPerNaira}; each point redeems ${formatMoney(
                program.redeemValueMinor,
              )}.`
            : "Off — members keep balances, but no points are earned or redeemed."}{" "}
          {program.prompt === "card"
            ? "Cashiers enter a card number."
            : program.prompt === "phone"
              ? "Cashiers enter a phone number."
              : "Cashiers may enter a card or phone."}
        </LiveNote>
        <SetCard title="Programme">
          <SetRow label="Loyalty enabled" hint="Off: checkout skips the prompt and no points are earned">
            <Toggle
              on={program.enabled}
              onChange={(enabled) => patch({ enabled })}
            />
          </SetRow>
          <SetRow label="Naira spent per 1 point">
            <NumField
              value={program.earnPerNaira}
              step={10}
              min={1}
              onChange={(earnPerNaira) =>
                patch({ earnPerNaira: Math.max(1, Math.round(earnPerNaira)) })
              }
            />
          </SetRow>
          <SetRow label="Naira value of 1 redeemed point">
            <NumField
              value={program.redeemValueMinor / 100}
              step={0.25}
              min={0}
              onChange={(naira) =>
                patch({
                  redeemValueMinor: Math.max(0, Math.round(naira * 100)),
                })
              }
            />
          </SetRow>
          <SetRow label="Welcome bonus points" hint="Granted when a member registers">
            <NumField
              value={program.welcomeBonusPoints}
              step={5}
              min={0}
              onChange={(welcomeBonusPoints) =>
                patch({
                  welcomeBonusPoints: Math.max(0, Math.round(welcomeBonusPoints)),
                })
              }
            />
          </SetRow>
          <SetRow label="What should the cashier enter at payment?">
            <SelectField
              value={program.prompt}
              onChange={(prompt) =>
                patch({ prompt: prompt as LoyaltyProgram["prompt"] })
              }
              options={[
                { value: "either", label: "Card or phone" },
                { value: "card", label: "Card only" },
                { value: "phone", label: "Phone only" },
              ]}
            />
          </SetRow>
          <SetRow label="Allow continue without loyalty?">
            <Toggle
              on={program.allowSkip}
              onChange={(allowSkip) => patch({ allowSkip })}
            />
          </SetRow>
          <SetRow label="Auto-apply points when a card is entered?" hint="Off: points print on the receipt only">
            <Toggle
              on={program.autoApply}
              onChange={(autoApply) => patch({ autoApply })}
            />
          </SetRow>
        </SetCard>
        <ProgramSaveBar
          busy={busy}
          saving="Save programme"
          onSave={() => {
            setBusy(true);
            void persistProgram(program, { saveLabel: "Programme" })
              .then(setProgram)
              .catch((error) =>
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not save the programme.",
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
      </div>
    </section>
  );
}

export function LoyaltyRulesPage({ onBack }: { onBack: () => void }) {
  const { program, setProgram, ready, busy, setBusy } = useLoyaltyProgram();
  if (!ready) {
    return (
      <section className="settings-full">
        <HubHead title="Rules" onBack={onBack} />
        <div className="settings-body">
          <LiveNote>Loading the shared rules…</LiveNote>
        </div>
      </section>
    );
  }
  if (!program) {
    return (
      <section className="settings-full">
        <HubHead title="Rules" onBack={onBack} />
        <div className="settings-body">
          <LiveNote>Could not load the loyalty rules.</LiveNote>
        </div>
      </section>
    );
  }
  const patch = (partial: Partial<LoyaltyProgram>) =>
    setProgram({ ...program, ...partial });

  return (
    <section className="settings-full">
      <HubHead title="Rules" onBack={onBack} />
      <div className="settings-body">
        <p className="set-lede">
          Fine-tune earn, redeem, and identification rules without changing the
          programme status.
        </p>
        <SetCard title="Rules">
          <SetRow label="Minimum card / phone digits">
            <NumField
              value={program.minDigits}
              step={1}
              min={4}
              onChange={(minDigits) =>
                patch({ minDigits: Math.max(4, Math.round(minDigits)) })
              }
            />
          </SetRow>
          <SetRow label="Points earned per ₦100">
            <NumField
              value={Math.max(1, program.earnPerNaira)}
              step={10}
              min={1}
              onChange={(earnPerNaira) =>
                patch({ earnPerNaira: Math.max(1, Math.round(earnPerNaira)) })
              }
            />
          </SetRow>
          <SetRow label="Naira value of 1 redeemed point">
            <NumField
              value={program.redeemValueMinor / 100}
              step={0.25}
              min={0}
              onChange={(naira) =>
                patch({
                  redeemValueMinor: Math.max(0, Math.round(naira * 100)),
                })
              }
            />
          </SetRow>
          <SetRow label="Welcome bonus points">
            <NumField
              value={program.welcomeBonusPoints}
              step={5}
              min={0}
              onChange={(welcomeBonusPoints) =>
                patch({
                  welcomeBonusPoints: Math.max(0, Math.round(welcomeBonusPoints)),
                })
              }
            />
          </SetRow>
          <SetRow label="Require identification at checkout?">
            <Toggle
              on={!program.allowSkip}
              onChange={(require) => patch({ allowSkip: !require })}
            />
          </SetRow>
        </SetCard>
        <ProgramSaveBar
          busy={busy}
          saving="Save rules"
          onSave={() => {
            setBusy(true);
            void persistProgram(program, { saveLabel: "Rules" })
              .then(setProgram)
              .catch((error) =>
                toast.error(
                  error instanceof Error
                    ? error.message
                    : "Could not save the rules.",
                ),
              )
              .finally(() => setBusy(false));
          }}
        />
      </div>
    </section>
  );
}

export function LoyaltyRegistrationPage({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<LoyaltyMember[]>([]);
  const [draft, setDraft] = useState<Partial<LoyaltyMember> | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const members = await listLoyaltyMembers();
    setRows(members);
    setReady(true);
  }

  useEffect(() => {
    load().catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not load members.",
      );
      setReady(true);
    });
  }, []);

  async function save(form: FormEvent) {
    form.preventDefault();
    if (!draft?.name?.trim() || !draft.phone?.trim()) {
      toast.error("Name and phone are required.");
      return;
    }
    setBusy(true);
    try {
      await saveLoyaltyMember(draft);
      await load();
      setDraft(null);
      toast.success("Member saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the member.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(member: LoyaltyMember) {
    if (!window.confirm(`Remove ${member.name} from the loyalty programme?`))
      return;
    try {
      await deleteLoyaltyMember(member.id);
      await load();
      toast.success("Member removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the member.",
      );
    }
  }

  return (
    <section className="settings-full">
      <HubHead title="Registration" onBack={onBack} />
      <div className="settings-body">
        <p className="set-lede">
          Register shoppers for your loyalty programme and track their point
          balances. Members appear here and in the admin console.
        </p>
        <LiveNote>
          {ready ? `${rows.length} registered member${rows.length === 1 ? "" : "s"}.` : "Loading members…"}
        </LiveNote>
        <div className="loyalty-toolbar">
          <button
            className="continue"
            onClick={() =>
              setDraft({ name: "", phone: "", points: 0, active: true })
            }
          >
            <Plus size={16} /> Register member
          </button>
        </div>
        <SetCard title="Members">
          {rows.length === 0 ? (
            <SetRow label="No members yet">
              <span className="set-muted">
                Register a customer to start earning points
              </span>
            </SetRow>
          ) : (
            <table className="loyalty-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Phone</th>
                  <th>Card</th>
                  <th>Points</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="loyalty-row"
                        onClick={() => setDraft(row)}
                      >
                        {row.name}
                      </button>
                    </td>
                    <td>{row.phone}</td>
                    <td className="set-muted">{row.cardNumber || "—"}</td>
                    <td>{row.points}</td>
                    <td>
                      <span className={row.active ? "loyalty-on" : "set-muted"}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="loyalty-remove"
                        aria-label={`Remove ${row.name}`}
                        onClick={() => void remove(row)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SetCard>
      </div>
      {draft ? (
        <CrudModal
          title={draft.id ? "Edit member" : "Register member"}
          busy={busy}
          onClose={() => setDraft(null)}
          onDelete={draft.id ? () => void remove(draft as LoyaltyMember) : undefined}
          onSubmit={save}
          children={
            <>
              <CrudField label="Phone">
                <input
                  value={draft.phone ?? ""}
                  onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
                  autoComplete="off"
                  autoFocus
                />
              </CrudField>
              <CrudField label="Name">
                <input
                  value={draft.name ?? ""}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                />
              </CrudField>
              <CrudField label="Email (optional)">
                <input
                  value={draft.email ?? ""}
                  onChange={(event) => setDraft({ ...draft, email: event.target.value })}
                  type="email"
                />
              </CrudField>
              <CrudField label="Card number (optional)">
                <input
                  value={draft.cardNumber ?? ""}
                  onChange={(event) => setDraft({ ...draft, cardNumber: event.target.value })}
                />
              </CrudField>
              <CrudField label="Points">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={draft.points ?? 0}
                  onChange={(event) =>
                    setDraft({ ...draft, points: Math.max(0, Math.round(Number(event.target.value) || 0)) })
                  }
                />
              </CrudField>
              <CrudToggle
                label="Active"
                on={draft.active ?? true}
                onChange={(active) => setDraft({ ...draft, active })}
              />
            </>
          }
        />
      ) : null}
    </section>
  );
}

export function LoyaltyCardsPage({ onBack }: { onBack: () => void }) {
  const [rows, setRows] = useState<LoyaltyCard[]>([]);
  const [members, setMembers] = useState<LoyaltyMember[]>([]);
  const [draft, setDraft] = useState<Partial<LoyaltyCard> | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  async function load() {
    const [cards, registered] = await Promise.all([
      listLoyaltyCards(),
      listLoyaltyMembers(),
    ]);
    setRows(cards);
    setMembers(registered);
    setReady(true);
  }

  useEffect(() => {
    load().catch((error) => {
      toast.error(
        error instanceof Error ? error.message : "Could not load loyalty cards.",
      );
      setReady(true);
    });
  }, []);

  async function save(form: FormEvent) {
    form.preventDefault();
    const member = members.find((row) => row.id === draft?.memberId);
    if (!member) {
      toast.error("Select a member.");
      return;
    }
    if (!draft?.cardNumber?.trim()) {
      toast.error("Enter a card number.");
      return;
    }
    setBusy(true);
    try {
      await saveLoyaltyCard({
        ...draft,
        memberId: member.id,
        memberName: member.name,
      });
      await load();
      setDraft(null);
      toast.success("Card saved.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not save the card.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function remove(card: LoyaltyCard) {
    if (!window.confirm(`Remove card ${card.cardNumber}?`)) return;
    try {
      await deleteLoyaltyCard(card.id);
      await load();
      toast.success("Card removed.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not remove the card.",
      );
    }
  }

  return (
    <section className="settings-full">
      <HubHead title="Cards" onBack={onBack} />
      <div className="settings-body">
        <p className="set-lede">
          Issue physical or virtual loyalty cards and link them to registered
          members. Cards are recognised at the till by their number.
        </p>
        <LiveNote>
          {ready
            ? `${rows.length} card${rows.length === 1 ? "" : "s"} issued to ${
                members.length
              } member${members.length === 1 ? "" : "s"}.`
            : "Loading cards…"}
        </LiveNote>
        <div className="loyalty-toolbar">
          <button
            className="continue"
            onClick={() =>
              setDraft({ cardNumber: "", tier: "Standard", active: true })
            }
          >
            <Plus size={16} /> Assign card
          </button>
        </div>
        <SetCard title="Cards">
          {rows.length === 0 ? (
            <SetRow label="No cards yet">
              <span className="set-muted">
                Assign a card to a registered member
              </span>
            </SetRow>
          ) : (
            <table className="loyalty-table">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Card number</th>
                  <th>Tier</th>
                  <th>Issued</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <button
                        className="loyalty-row"
                        onClick={() => setDraft(row)}
                      >
                        {row.memberName}
                      </button>
                    </td>
                    <td>{row.cardNumber}</td>
                    <td>{row.tier}</td>
                    <td className="set-muted">
                      {new Date(row.issuedAt).toLocaleDateString("en-NG")}
                    </td>
                    <td>
                      <span className={row.active ? "loyalty-on" : "set-muted"}>
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td>
                      <button
                        className="loyalty-remove"
                        aria-label={`Remove card ${row.cardNumber}`}
                        onClick={() => void remove(row)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </SetCard>
      </div>
      {draft ? (
        <CrudModal
          title={draft.id ? "Edit card" : "Assign card"}
          busy={busy}
          onClose={() => setDraft(null)}
          onDelete={draft.id ? () => void remove(draft as LoyaltyCard) : undefined}
          onSubmit={save}
          children={
            <>
              <CrudField label="Member">
                <select
                  className="loyalty-crud-select"
                  value={draft.memberId ?? ""}
                  onChange={(event) => {
                    const member = members.find(
                      (row) => row.id === event.target.value,
                    );
                    setDraft({
                      ...draft,
                      memberId: event.target.value,
                      memberName: member?.name,
                      cardNumber:
                        draft.cardNumber || member?.cardNumber || "",
                    });
                  }}
                >
                  <option value="">Select member…</option>
                  {members.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </CrudField>
              <CrudField label="Card number">
                <input
                  value={draft.cardNumber ?? ""}
                  onChange={(event) =>
                    setDraft({ ...draft, cardNumber: event.target.value })
                  }
                  autoComplete="off"
                  autoFocus
                />
              </CrudField>
              <CrudField label="Tier">
                <input
                  value={draft.tier ?? "Standard"}
                  onChange={(event) => setDraft({ ...draft, tier: event.target.value })}
                />
              </CrudField>
              <CrudToggle
                label="Active"
                on={draft.active ?? true}
                onChange={(active) => setDraft({ ...draft, active })}
              />
            </>
          }
        />
      ) : null}
    </section>
  );
}

function CrudField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="loyalty-field">
      {label}
      {hint ? <small className="set-muted"> {hint}</small> : null}
      {children}
    </label>
  );
}

function CrudToggle({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="loyalty-toggle-row">
      <span>{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function CrudModal({
  title,
  busy,
  onClose,
  onDelete,
  onSubmit,
  children,
}: {
  title: string;
  busy: boolean;
  onClose: () => void;
  onDelete?: () => void;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return (
    <div className="dialog-scrim" onClick={onClose}>
      <form
        className="shift-modal loyalty-crud"
        onClick={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <div className="shift-modal-icon">
          <CreditCard size={24} strokeWidth={1.8} />
        </div>
        <p className="shift-modal-kicker">Loyalty</p>
        <h3>{title}</h3>
        <div className="loyalty-crud-fields">{children}</div>
        <div className="shift-modal-actions">
          <button className="continue" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
          {onDelete ? (
            <button
              className="loyalty-remove-btn"
              type="button"
              disabled={busy}
              onClick={onDelete}
            >
              <Trash2 size={15} /> Delete
            </button>
          ) : (
            <button
              className="shift-modal-out"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}