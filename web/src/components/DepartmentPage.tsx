export function DepartmentPage({
  title,
  kicker,
}: {
  title: string;
  kicker: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-pos-primary">
        {kicker}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight text-pos-ink">{title}</h1>
      <p className="mt-2 max-w-xl text-pos-ink-muted">
        This department page is ready. Send the dropdown items next and they will
        be added under this menu.
      </p>
    </div>
  );
}
