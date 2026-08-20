import Link from "next/link";
import { PageHero } from "../../../components/site/PageHero";

const apps = [
  {
    name: "Till",
    href: "/download",
    copy: "Windows EXE or Android APK. One till per device. First launch asks for the HQ till code. After that, staff only sign in until the one-year subscription ends.",
  },
  {
    name: "HQ console",
    href: "/login",
    copy: "This website after you log in: reports, purchases, items, users, billing, and till issue. Menus follow the departments on your group.",
  },
  {
    name: "Price check",
    href: "/download",
    copy: "Handheld lookup. Point the camera or scanner at a barcode and see the live price from the API.",
  },
  {
    name: "API",
    href: "/support",
    copy: "NestJS on port 3001. Catalog, staff, sales, hardware hex, and till activate/heartbeat. Run it as a Windows service next to HQ.",
  },
];

export default function ProductPage() {
  return (
    <>
      <PageHero
        kicker="Product"
        title="Four apps, one store."
        copy="The till sells. HQ runs the business. Price check is for the floor. The API keeps them in sync."
      />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2">
        {apps.map((app) => (
          <Link
            key={app.name}
            href={app.href}
            className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <h2 className="text-lg font-semibold">{app.name}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">{app.copy}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
