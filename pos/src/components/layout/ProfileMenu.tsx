import { useEffect, useRef, useState } from "react";
import {
  Calendar,
  ChevronDown,
  Clock3,
  Lock,
  LogOut,
  Printer,
  Settings,
  User,
} from "lucide-react";
import type { StaffUser } from "../../lib/staff";

export type MenuAction =
  | "profile"
  | "settings"
  | "logout"
  | "print-shift"
  | "close-shift"
  | "print-day"
  | "close-day";

type Props = {
  user: StaffUser;
  onAction: (action: MenuAction) => void;
};

export function ProfileMenu({ user, onAction }: Props) {
  const [open, setOpen] = useState(false);
  const [shiftOpen, setShiftOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (!root.current?.contains(event.target as Node)) {
        setOpen(false);
        setShiftOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function pick(action: MenuAction) {
    setOpen(false);
    setShiftOpen(false);
    onAction(action);
  }

  return (
    <div className="profile-bar" ref={root}>
      <button
        className="profile-chip"
        onClick={() => {
          setOpen((value) => !value);
          setShiftOpen(false);
        }}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <img src={user.avatar} alt="" />
        <span className="profile-meta">
          <strong>{user.name}</strong>
          <small>{user.role}</small>
        </span>
        <ChevronDown size={16} className={open ? "chevron open" : "chevron"} />
      </button>
      {open && (
        <div className="profile-menu" role="menu">
          <button role="menuitem" onClick={() => pick("profile")}>
            <User size={16} /> Profile
          </button>
          <button
            type="button"
            className={shiftOpen ? "on" : ""}
            aria-expanded={shiftOpen}
            onClick={() => setShiftOpen((value) => !value)}
          >
            <Clock3 size={16} /> Shift
            <ChevronDown
              size={14}
              className={shiftOpen ? "chevron open" : "chevron"}
            />
          </button>
          {shiftOpen && (
            <div className="profile-submenu">
              <button role="menuitem" onClick={() => pick("print-shift")}>
                <Printer size={16} /> Print shift
              </button>
              <button role="menuitem" onClick={() => pick("close-shift")}>
                <Lock size={16} /> Close shift
              </button>
              <button role="menuitem" onClick={() => pick("print-day")}>
                <Calendar size={16} /> Print day
              </button>
              <button role="menuitem" onClick={() => pick("close-day")}>
                <Lock size={16} /> Close day
              </button>
            </div>
          )}
          <button role="menuitem" onClick={() => pick("settings")}>
            <Settings size={16} /> Settings
          </button>
          <button
            role="menuitem"
            className="logout"
            onClick={() => pick("logout")}
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
