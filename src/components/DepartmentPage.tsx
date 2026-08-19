export function DepartmentPage({
  title,
  kicker,
}: {
  title: string;
  kicker: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">
        {kicker}
      </p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 max-w-xl text-neutral-500">
        This department page is ready. Send the dropdown items next and they will
        be added under this menu.
      </p>
    </div>
  );
}
