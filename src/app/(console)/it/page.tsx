import { NIGERIA_INTEGRATIONS } from "@/lib/nigeria-integrations";

export default function ItPage() {
  return (
    <section>
      <h1 className="text-2xl font-semibold">IT · Nigeria integrations</h1>
      <p className="mt-1 max-w-2xl text-neutral-500">
        Connectors for a Nigerian POS: Naira payments, local delivery apps,
        Android terminals, marketplaces, FIRS VAT, and phone-order caller ID.
      </p>
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {NIGERIA_INTEGRATIONS.map((group) => (
          <article
            key={group.category}
            className="rounded-2xl bg-white p-5 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <h2 className="font-semibold">{group.label}</h2>
            <p className="mt-1 text-sm text-neutral-500">{group.blurb}</p>
            <ul className="mt-4 space-y-2 text-sm">
              {group.providers.map((provider) => (
                <li
                  key={provider.name}
                  className="flex items-start justify-between gap-3 border-t border-neutral-100 pt-2"
                >
                  <span className="font-medium">{provider.name}</span>
                  <span className="text-right text-neutral-500">
                    {provider.role}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}
