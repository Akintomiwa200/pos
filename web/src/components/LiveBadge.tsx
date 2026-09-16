export function LiveBadge({ live = true }: { live?: boolean }) {
  return (
    <span
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${
        live ? "bg-pos-success-soft text-pos-success" : "bg-pos-surface-muted text-pos-ink-faint"
      }`}
      title={live ? "Live updates are connected" : "Live updates unavailable"}
    >
      <span className="relative flex h-2 w-2">
        <span
          className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
            live ? "animate-ping bg-pos-success" : "bg-pos-ink-faint"
          }`}
        ></span>
        <span className={`relative inline-flex h-2 w-2 rounded-full ${live ? "bg-pos-success" : "bg-pos-ink-faint"}`} />
      </span>
      {live ? "Live" : "Offline"}
    </span>
  );
}