"use client";

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string; disabled?: boolean };

function readOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child)) {
      return [];
    }
    if (child.type !== "option") return [];
    const value = String(child.props.value ?? "");
    const raw = child.props.children;
    const label = typeof raw === "string" || typeof raw === "number" ? String(raw) : value;
    return [{ value, label, disabled: Boolean(child.props.disabled) }];
  });
}

const triggerClass = {
  auth: "flex w-full min-w-0 items-center rounded-[10px] border-0 bg-pos-surface-muted px-4 py-3.5 pr-10 text-left text-[14px] leading-[21px] text-pos-ink outline-none ring-1 ring-transparent transition hover:bg-pos-surface focus:bg-pos-surface focus:ring-pos-primary/30",
  setup:
    "flex w-full min-w-0 items-center rounded-2xl border-0 bg-pos-surface-muted px-3.5 py-2.5 pr-10 text-left text-sm leading-[21px] text-pos-ink outline-none ring-1 ring-transparent transition hover:bg-pos-surface focus:bg-pos-surface focus:ring-pos-primary/30",
} as const;

export function MenuSelect({
  tone = "setup",
  label,
  className,
  children,
  value,
  defaultValue,
  onChange,
  disabled,
  name,
  required,
  id,
  "aria-invalid": ariaInvalid,
}: {
  tone?: "auth" | "setup";
  label?: string;
} & SelectHTMLAttributes<HTMLSelectElement>) {
  const options = useMemo(() => readOptions(children), [children]);
  const isControlled = value !== undefined;
  const [uncontrolled, setUncontrolled] = useState(String(defaultValue ?? options[0]?.value ?? ""));
  const selectedValue = String(isControlled ? value : uncontrolled);
  const selected = options.find((row) => row.value === selectedValue);
  const placeholder = !selectedValue;
  const listId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedValue);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const maxHeight = 240;
    const spaceBelow = window.innerHeight - rect.bottom - 8;
    const spaceAbove = rect.top - 8;
    const openUp = spaceBelow < 160 && spaceAbove > spaceBelow;
    const height = Math.min(maxHeight, openUp ? spaceAbove : spaceBelow);
    setMenuStyle({
      position: "fixed",
      left: rect.left,
      width: Math.max(rect.width, 160),
      maxHeight: Math.max(height, 120),
      zIndex: 80,
      ...(openUp ? { bottom: window.innerHeight - rect.top + 4 } : { top: rect.bottom + 4 }),
    });
  }, [open, options.length]);

  function revealOption(value: string) {
    const menu = menuRef.current;
    const el = menu?.querySelector(`[data-value="${CSS.escape(value)}"]`);
    if (!menu || !(el instanceof HTMLElement)) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < menu.scrollTop) menu.scrollTop = top;
    else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
  }

  useEffect(() => {
    if (!open) return;
    setActive(selectedValue);
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onPageMove = (event: Event) => {
      const target = event.target;
      if (target instanceof Node && menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    window.addEventListener("resize", onPageMove);
    window.addEventListener("scroll", onPageMove, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      window.removeEventListener("resize", onPageMove);
      window.removeEventListener("scroll", onPageMove, true);
    };
  }, [open, selectedValue]);

  useEffect(() => {
    if (!open) return;
    menuRef.current?.focus();
    revealOption(selectedValue);
  }, [open, selectedValue]);

  function commit(next: string) {
    if (!isControlled) setUncontrolled(next);
    onChange?.({
      target: { value: next, name: name ?? "" },
      currentTarget: { value: next, name: name ?? "" },
    } as Parameters<NonNullable<typeof onChange>>[0]);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function onTriggerKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  }

  function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
    const enabled = options.filter((row) => !row.disabled);
    const index = Math.max(
      0,
      enabled.findIndex((row) => row.value === active),
    );
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = enabled[Math.min(enabled.length - 1, index + 1)]?.value ?? active;
      setActive(next);
      requestAnimationFrame(() => revealOption(next));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next = enabled[Math.max(0, index - 1)]?.value ?? active;
      setActive(next);
      requestAnimationFrame(() => revealOption(next));
      return;
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      const row = enabled.find((item) => item.value === active) ?? enabled[index];
      if (row) commit(row.value);
    }
  }

  const menu =
    mounted && open
      ? createPortal(
          <div
            ref={menuRef}
            id={listId}
            role="listbox"
            tabIndex={-1}
            aria-label={label}
            style={menuStyle}
            onKeyDown={onMenuKey}
            onWheel={(event) => event.stopPropagation()}
            className="overscroll-contain overflow-y-auto rounded-[12px] border border-pos-border bg-pos-surface py-1 shadow-pos-md outline-none"
          >
            {options.map((row) => {
              const isSelected = row.value === selectedValue;
              const isActive = row.value === active;
              return (
                <button
                  key={`${row.value}-${row.label}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={row.disabled}
                  data-value={row.value}
                  className={`flex w-full px-3.5 py-2.5 text-left text-[14px] ${
                    isSelected || isActive
                      ? "bg-pos-primary/12 font-medium text-pos-primary"
                      : "text-pos-ink hover:bg-pos-surface-muted"
                  } disabled:opacity-40`}
                  onMouseEnter={() => setActive(row.value)}
                  onClick={() => commit(row.value)}
                >
                  <span className="min-w-0 truncate">{row.label}</span>
                </button>
              );
            })}
          </div>,
          document.body,
        )
      : null;

  return (
    <span className="relative block min-w-0 max-w-full">
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-label={label}
        aria-invalid={ariaInvalid}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        className={`${triggerClass[tone]} ${placeholder ? "text-pos-ink-faint" : ""} ${className ?? ""}`}
        onClick={() => !disabled && setOpen((current) => !current)}
        onKeyDown={onTriggerKey}
      >
        <span className="min-w-0 flex-1 truncate">{selected?.label || "Select"}</span>
      </button>
      <ChevronDown
        size={16}
        strokeWidth={1.8}
        className={`pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-pos-ink-faint transition ${
          open ? "rotate-180" : ""
        }`}
        aria-hidden
      />
      <input type="hidden" name={name} value={selectedValue} disabled={disabled} />
      {required ? (
        <input
          tabIndex={-1}
          aria-hidden
          required
          value={selectedValue}
          onChange={() => undefined}
          className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
        />
      ) : null}
      {menu}
    </span>
  );
}
