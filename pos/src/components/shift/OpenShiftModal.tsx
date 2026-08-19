import { Clock3 } from "lucide-react";

type Props = {
  name: string;
  role: string;
  avatar: string;
  storeName: string;
  tillName: string;
  onOpen: () => void;
  onSignOut: () => void;
  busy?: boolean;
};

export function OpenShiftModal({
  name,
  role,
  avatar,
  storeName,
  tillName,
  onOpen,
  onSignOut,
  busy,
}: Props) {
  const when = new Date().toLocaleString("en-NG", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="dialog-scrim">
      <div className="shift-modal">
        <div className="shift-modal-icon">
          <Clock3 size={28} strokeWidth={1.8} />
        </div>
        <p className="shift-modal-kicker">Welcome back</p>
        <img className="shift-modal-avatar" src={avatar} alt="" />
        <h3>{name}</h3>
        <p className="shift-modal-role">
          {role} · {storeName}
        </p>
        <p className="shift-modal-copy">
          {tillName}. This till stays locked until you open your shift. Sales,
          refunds, and drawers start from {when}.
        </p>
        <div className="shift-modal-actions">
          <button className="continue" disabled={busy} onClick={onOpen}>
            {busy ? "Opening shift…" : "Open shift"}
          </button>
          <button
            className="shift-modal-out"
            type="button"
            onClick={onSignOut}
            disabled={busy}
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
