"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { api } from "@/lib/hq-api";
import { naira, prettyDay } from "@/lib/hq-ops";
import { ManagerSkeleton } from "../Skeleton";
import { EmptyRow, PageHeader, StatCard, TableShell } from "../console/Chrome";

type StaffMember = {
  id: string;
  name: string;
  username: string;
  email: string;
  role: "cashier" | "supervisor" | "admin";
  privileges: string[];
  avatar: string;
};

type Shift = {
  id?: string;
  openedAt?: string;
  closedAt?: string | null;
  salesCount?: number;
  salesMinor?: number;
};

const ROLE_TONE: Record<string, string> = {
  cashier: "bg-pos-primary-soft text-pos-primary",
  supervisor: "bg-pos-warning-soft text-pos-warning",
  admin: "bg-pos-danger-soft text-pos-danger",
};

export function HrDashboard() {
  const [staff, setStaff] = useState<StaffMember[] | null>(null);
  const [shifts, setShifts] = useState<Record<string, Shift>>({});

  useEffect(() => {
    api<StaffMember[]>("/api/staff")
      .then(async (roster) => {
        setStaff(roster);
        const entries = await Promise.all(
          roster.map(async (member) => {
            try {
              const shift = await api<Shift>(
                `/api/staff/shift?staffId=${encodeURIComponent(member.id)}`,
              );
              return [member.id, shift] as const;
            } catch {
              return [member.id, {}] as const;
            }
          }),
        );
        setShifts(Object.fromEntries(entries));
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : "Could not load staff");
        setStaff([]);
      });
  }, []);

  if (!staff) return <ManagerSkeleton variant="table" />;

  const onShift = staff.filter(
    (member) => shifts[member.id]?.openedAt && !shifts[member.id]?.closedAt,
  ).length;

  return (
    <div>
      <PageHeader
        kicker="HR"
        title="Team & Shifts"
        copy="Terminal staff, their PIN privileges and who is currently on shift."
      />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <StatCard label="Staff on roster" value={String(staff.length)} />
        <StatCard label="On shift now" value={String(onShift)} />
        <StatCard
          label="Supervisors / admins"
          value={String(staff.filter((m) => m.role !== "cashier").length)}
        />
      </div>
      <TableShell columns={["Staff", "Role", "Privileges", "Shift status", "Today's sales"]} minWidth={720}>
        {staff.length === 0 ? (
          <EmptyRow colSpan={5} message="No staff found." />
        ) : (
          staff.map((member) => {
            const shift = shifts[member.id];
            const open = Boolean(shift?.openedAt && !shift?.closedAt);
            return (
              <tr key={member.id} className="border-b border-pos-border/60">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={member.avatar}
                      alt=""
                      className="h-9 w-9 rounded-full object-cover"
                    />
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-xs text-pos-ink-muted">@{member.username}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${ROLE_TONE[member.role] ?? "bg-pos-surface-muted"}`}
                  >
                    {member.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {member.privileges.map((privilege) => (
                      <span
                        key={privilege}
                        className="rounded-md border border-pos-border px-2 py-0.5 text-xs capitalize"
                      >
                        {privilege}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {open ? (
                    <span className="text-pos-success">Open · since{" "}
                      {new Date(shift?.openedAt ?? "").toLocaleTimeString("en-NG", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  ) : shift?.closedAt ? (
                    <span className="text-pos-ink-muted">
                      Closed {prettyDay(shift.closedAt.slice(0, 10))}
                    </span>
                  ) : (
                    <span className="text-pos-ink-faint">Off shift</span>
                  )}
                </td>
                <td className="px-4 py-3 font-semibold">{naira(shift?.salesMinor ?? 0)}</td>
              </tr>
            );
          })
        )}
      </TableShell>
    </div>
  );
}
