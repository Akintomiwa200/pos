"use client";

import { useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import {
  AtSign,
  Briefcase,
  Building2,
  Camera,
  Mail,
  Pencil,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";
import { toast } from "@/lib/toast";
import {
  removeProfileAvatar,
  updateMyProfile,
  uploadProfileAvatar,
} from "@/lib/hq-api";
import { useLiveDirectory } from "@/lib/live-directory";
import { sessionScope } from "@/lib/access";
import { useAuth } from "@/components/AuthProvider";
import { ManagerSkeleton } from "@/components/Skeleton";
import {
  Field,
  PrimaryButton,
  SetupHeader,
  fieldClass,
  secondaryButtonClass,
} from "@/components/setup/SetupChrome";
import { PersonAvatar, ProfileBanner, groupTone, statusTone } from "./account-ui";

const MAX_AVATAR_BYTES = 1024 * 1024;
const AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

export function MyProfile() {
  const { session, setSession } = useAuth();
  const { accounts, groups, ready } = useLiveDirectory();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: "", username: "" });
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const live = accounts.find((row) => row.id === session?.id) ?? null;
  const account = live ?? (session
    ? {
        id: session.id,
        name: session.name,
        email: session.email,
        username: session.username,
        groupId: session.groupId,
        active: true,
        avatarUrl: session.avatarUrl ?? null,
      }
    : null);
  const group = account ? groups.find((row) => row.id === account.groupId) : undefined;
  const groupName = group?.name ?? session?.groupName ?? account?.groupId ?? "";
  const avatarUrl = account?.avatarUrl ?? session?.avatarUrl ?? null;
  const isAdmin =
    sessionScope(session) === "tenant" &&
    (session?.groupId === "g-admin" || session?.privileges.includes("*"));
  const companyHref =
    sessionScope(session) === "producer"
      ? "/admin/companies/current/profile"
      : "/setup/others/company";

  if (!session || !account) return <ManagerSkeleton variant="list" />;
  if (!ready && !live) return <ManagerSkeleton variant="list" />;

  function openEdit() {
    if (!account) return;
    setDraft({ name: account.name, username: account.username });
    setEditing(true);
  }

  async function onSave(event: FormEvent) {
    event.preventDefault();
    if (!session?.token || !account) return;
    const name = draft.name.trim();
    const username = draft.username.trim().toLowerCase();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
      toast.error("Username must be 3–32 characters: letters, numbers, dots, underscores, or hyphens");
      return;
    }
    setBusy(true);
    try {
      const saved = await updateMyProfile(session.token, { name, username });
      setSession({
        ...session,
        name: saved.name,
        username: saved.username,
        avatarUrl: saved.avatarUrl ?? session.avatarUrl ?? null,
      });
      setEditing(false);
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(err, "Could not save profile");
    } finally {
      setBusy(false);
    }
  }

  async function onPickAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !session?.token) return;
    if (!AVATAR_TYPES.has(file.type)) {
      toast.error("Use JPG, PNG, WebP, or GIF for profile pictures.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Profile pictures must be 1 MB or smaller.");
      return;
    }
    setAvatarBusy(true);
    try {
      const saved = await uploadProfileAvatar(session.token, file);
      setSession({ ...session, avatarUrl: saved.avatarUrl ?? null });
      toast.success("Profile picture updated.");
    } catch (err) {
      toast.error(err, "Could not upload profile picture");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function onRemoveAvatar() {
    if (!session?.token) return;
    setAvatarBusy(true);
    try {
      await removeProfileAvatar(session.token);
      setSession({ ...session, avatarUrl: null });
      toast.success("Profile picture removed.");
    } catch (err) {
      toast.error(err, "Could not remove profile picture");
    } finally {
      setAvatarBusy(false);
    }
  }

  const departments =
    !group || group.departments.includes("*") ? ["All departments"] : group.departments;
  const privilegeCount =
    !group || group.privileges.includes("*")
      ? "Full access"
      : `${group.privileges.length} privileges`;

  return (
    <div>
      <SetupHeader
        kicker="My account"
        title="My profile"
        copy="Your identity across HQ and the till. Changes apply live wherever your name appears."
        action={
          editing ? undefined : (
            <PrimaryButton onClick={openEdit}>
              <Pencil size={15} />
              Edit profile
            </PrimaryButton>
          )
        }
      />

      <section className="overflow-hidden rounded-[28px] bg-pos-surface shadow-pos-md">
        <ProfileBanner>
          <div className="h-36 sm:h-44" />
        </ProfileBanner>

        <div className="relative px-5 pb-6 pt-0 sm:px-8">
          <div className="-mt-12 flex flex-col gap-4 sm:-mt-14 sm:flex-row sm:items-end sm:justify-between">
            <div className="relative w-fit">
              <PersonAvatar name={account.name} id={account.id} size={96} src={avatarUrl} />
              <button
                type="button"
                className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-full bg-pos-primary text-white shadow-pos-sm ring-2 ring-white hover:opacity-90 disabled:opacity-60"
                onClick={() => fileRef.current?.click()}
                disabled={avatarBusy}
                aria-label="Upload profile picture"
                title="Upload profile picture"
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(event) => void onPickAvatar(event)}
              />
            </div>
            <div className="flex flex-wrap gap-2 sm:pb-1">
              {avatarUrl ? (
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => void onRemoveAvatar()}
                  disabled={avatarBusy}
                >
                  <Trash2 size={15} />
                  {avatarBusy ? "Working…" : "Remove picture"}
                </button>
              ) : null}
              <a href={`mailto:${account.email}`} className={secondaryButtonClass}>
                <Mail size={15} />
                Email
              </a>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[clamp(1.5rem,3vw,2rem)] font-semibold tracking-tight text-pos-ink">
                {account.name}
              </h1>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-medium ${statusTone(account.active)}`}
              >
                {account.active ? "Active" : "Disabled"}
              </span>
            </div>
            <p className="mt-1 text-[14px] text-pos-ink-muted">
              {groupName} · @{account.username}
            </p>
          </div>

          {editing ? (
            <form
              className="mt-6 max-w-xl space-y-1 rounded-[22px] bg-pos-surface-muted/50 p-4"
              onSubmit={(event) => void onSave(event)}
            >
              <Field label="Full name">
                <input
                  className={fieldClass}
                  value={draft.name}
                  onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  required
                />
              </Field>
              <Field label="Username">
                <input
                  className={fieldClass}
                  value={draft.username}
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                  required
                />
              </Field>
              <p className="pt-1 text-[12px] text-pos-ink-faint">
                Email and role are managed by your administrator. Use the camera button on
                your picture to upload a new photo (JPG, PNG, WebP, or GIF, up to 1 MB).
              </p>
              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  onClick={() => setEditing(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <PrimaryButton type="submit" disabled={busy}>
                  {busy ? "Saving…" : "Save profile"}
                </PrimaryButton>
              </div>
            </form>
          ) : (
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                  Profile
                </h2>
                <dl className="divide-y divide-pos-border/60 rounded-[22px] bg-pos-surface-muted/50">
                  <DetailRow icon={<UserRound size={16} />} label="Full name" value={account.name} />
                  <DetailRow icon={<AtSign size={16} />} label="Username" value={`@${account.username}`} />
                  <DetailRow
                    icon={<Mail size={16} />}
                    label="Email"
                    value={
                      <a href={`mailto:${account.email}`} className="text-pos-primary hover:underline">
                        {account.email}
                      </a>
                    }
                  />
                  <DetailRow
                    icon={<Shield size={16} />}
                    label="Status"
                    value={account.active ? "Active" : "Disabled"}
                  />
                </dl>
              </div>

              <div className="space-y-4">
                <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-pos-ink-faint">
                  Access
                </h2>
                <div className="rounded-[22px] bg-pos-surface-muted/50 p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid size-9 place-items-center rounded-full bg-pos-surface text-pos-ink-muted shadow-pos-sm">
                      <Briefcase size={16} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[12px] text-pos-ink-faint">Role</p>
                      <p className="mt-0.5 font-semibold text-pos-ink">{groupName}</p>
                      <span
                        className={`mt-2 inline-flex rounded-lg px-2.5 py-1 text-[12px] font-medium ${groupTone(groupName)}`}
                      >
                        {privilegeCount}
                      </span>
                    </div>
                  </div>
                  <div className="mt-5">
                    <p className="text-[12px] text-pos-ink-faint">Departments</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {departments.map((dept) => (
                        <span
                          key={dept}
                          className="rounded-lg border border-pos-border bg-pos-surface px-2.5 py-1 text-[12px] text-pos-ink-muted"
                        >
                          {dept}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="mt-5 text-[13px] leading-relaxed text-pos-ink-muted">
                    Your role controls what you can open in HQ and authorise on the till.
                    Ask an administrator to change it.
                  </p>
                </div>

                {isAdmin || sessionScope(session) === "producer" ? (
                  <div className="rounded-[22px] bg-pos-surface-muted/50 p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-pos-surface text-pos-ink-muted shadow-pos-sm">
                        <Building2 size={16} />
                      </span>
                      <div className="min-w-0">
                        <p className="text-[12px] text-pos-ink-faint">Organization</p>
                        <p className="mt-0.5 font-semibold text-pos-ink">Company details</p>
                        <p className="mt-1 text-[13px] leading-relaxed text-pos-ink-muted">
                          Update the company image, trading name, legal identity,
                          contacts, and address used on receipts and filings.
                        </p>
                        <Link
                          href={companyHref}
                          className="mt-3 inline-flex text-[13px] font-medium text-pos-primary hover:underline"
                        >
                          Edit company details
                        </Link>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-pos-surface text-pos-ink-muted shadow-pos-sm">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <dt className="text-[12px] text-pos-ink-faint">{label}</dt>
        <dd className="mt-0.5 truncate text-[14px] font-medium text-pos-ink">{value}</dd>
      </div>
    </div>
  );
}
