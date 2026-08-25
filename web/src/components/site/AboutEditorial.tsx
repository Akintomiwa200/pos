const BLOCKS = [
  {
    title: "Built for the counter",
    copy: "POS is woven into every stage of the store day — catalog, tax, and till sales stay aligned so operators are never reconciling two versions of the truth.",
  },
  {
    title: "Licensed where it counts",
    copy: "Issue till codes from HQ, keep devices accountable, and grow storefronts without sharing a PC or losing control of who can sell.",
  },
] as const;

function EditorialImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden bg-pos-surface-muted ${className ?? ""}`}>
      <img src={src} alt={alt} decoding="async" className="size-full object-cover object-center" />
    </div>
  );
}

export function AboutEditorial() {
  return (
    <section className="about-editorial bg-pos-bg px-5 py-16 font-sans text-pos-ink sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-6xl">
        {/* Split title with hairline rule */}
        <header className="flex items-center gap-4 sm:gap-6">
          <h2 className="shrink-0 text-[clamp(1.35rem,3.2vw,2.15rem)] font-semibold tracking-[-0.02em] text-pos-ink">
            Built
          </h2>
          <div className="relative h-px min-w-0 flex-1 bg-pos-ink/55 dark:bg-pos-ink/70" aria-hidden>
            <span className="absolute left-1/2 top-1/2 size-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-pos-ink" />
          </div>
          <h2 className="shrink-0 text-[clamp(1.35rem,3.2vw,2.15rem)] font-semibold tracking-[-0.02em] text-pos-ink">
            To last
          </h2>
        </header>

        <div className="mt-12 grid grid-cols-1 gap-10 md:mt-16 md:grid-cols-12 md:gap-x-10 md:gap-y-12 lg:mt-20 lg:gap-x-14 lg:gap-y-16">
          {/* Left column: copy then tall organic-edge photo */}
          <div className="flex flex-col gap-10 md:col-span-5 md:gap-12 lg:gap-14">
            <div className="max-w-sm md:mt-[min(18vw,7.5rem)]">
              <h3 className="text-[13px] font-semibold tracking-tight text-pos-ink sm:text-[14px]">
                {BLOCKS[0].title}
              </h3>
              <p className="mt-4 text-[13px] font-normal italic leading-[1.7] text-pos-ink-muted sm:text-[14px] sm:leading-[1.75]">
                {BLOCKS[0].copy}
              </p>
            </div>

            <EditorialImg
              src="/about-editorial-2.png"
              alt=""
              className="aspect-[2/3] w-full max-w-md md:max-w-none"
            />
          </div>

          {/* Right column: hero photo, copy, twin thumbs */}
          <div className="flex flex-col gap-10 md:col-span-7 md:gap-12 lg:gap-14">
            <EditorialImg
              src="/about-editorial-1.png"
              alt=""
              className="aspect-[5/4] w-full md:aspect-[4/3]"
            />

            <div className="max-w-md md:ml-auto md:mr-0 lg:max-w-sm">
              <h3 className="text-[13px] font-semibold tracking-tight text-pos-ink sm:text-[14px]">
                {BLOCKS[1].title}
              </h3>
              <p className="mt-4 text-[13px] font-normal italic leading-[1.7] text-pos-ink-muted sm:text-[14px] sm:leading-[1.75]">
                {BLOCKS[1].copy}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:ml-auto md:w-[min(100%,28rem)]">
              <EditorialImg src="/about-editorial-3.png" alt="" className="aspect-square" />
              <EditorialImg src="/about-editorial-4.png" alt="" className="aspect-square" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
