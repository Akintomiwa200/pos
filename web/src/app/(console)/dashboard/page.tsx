const departments = [
  {
    title: "Admin",
    href: "/admin",
    blurb: "Tenants, locations, roles, and feature flags per vertical.",
  },
  {
    title: "Procurement",
    href: "/procurement",
    blurb: "Suppliers, purchase orders, receiving, auto-reorder.",
  },
  {
    title: "Audit",
    href: "/audit",
    blurb: "X/Z reports, voids, journal, cash variance.",
  },
  {
    title: "IT",
    href: "/it",
    blurb: "Paystack, Moniepoint, Chowdeck, Jumia, FIRS, and caller ID.",
  },
  {
    title: "Finance",
    href: "/finance",
    blurb: "Tax rules (VAT/GST), settlements, invoicing.",
  },
  {
    title: "HR",
    href: "/hr",
    blurb: "Staff, check-in / check-out, permissions.",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold">Headquarters</h1>
      <p className="mt-1 text-neutral-500">
        Cloud back office for Nigerian supermarket, hotel, and restaurant tenants.
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {departments.map((d) => (
          <a
            key={d.href}
            href={d.href}
            className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <h2 className="font-semibold">{d.title}</h2>
            <p className="mt-1 text-sm text-neutral-500">{d.blurb}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
