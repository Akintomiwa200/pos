const partners = [
  { src: "/partners/supermarket.svg", label: "Supermarket" },
  { src: "/partners/food.svg", label: "Food store" },
  { src: "/partners/hotel.svg", label: "Hotel" },
  { src: "/partners/restaurant.svg", label: "Restaurant" },
  { src: "/partners/kitchen.svg", label: "Dark kitchen" },
  { src: "/partners/scan.svg", label: "Price check" },
];

function PartnerMark({ src, label }: { src: string; label: string }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-3 px-8">
      <img src={src} alt="" width={32} height={32} className="h-8 w-8" />
      <span className="text-base font-medium tracking-tight text-neutral-600">{label}</span>
    </span>
  );
}

export function PartnerMarquee() {
  const half = [...partners, ...partners];
  const loop = [...half, ...half];

  return (
    <section className="px-4 py-10 sm:px-6">
      <p className="text-center text-sm leading-6 text-neutral-400">
        Trusted by supermarket, food store, and hotel operators
      </p>
      <div className="partner-mask mx-auto mt-6 max-w-3xl overflow-hidden">
        <div className="partner-marquee">
          {loop.map(({ src, label }, index) => (
            <PartnerMark key={`${label}-${index}`} src={src} label={label} />
          ))}
        </div>
      </div>
    </section>
  );
}
