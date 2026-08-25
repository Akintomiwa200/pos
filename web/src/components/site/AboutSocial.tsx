const GALLERY = [
  "/about-social-1.png",
  "/about-social-2.png",
  "/about-social-3.png",
  "/about-social-4.png",
  "/about-social-5.png",
] as const;

const SOCIAL_HREF = "https://instagram.com";

export function AboutSocial() {
  return (
    <section className="about-social bg-pos-bg px-5 py-16 font-sans text-pos-ink sm:px-8 sm:py-20 lg:px-12 lg:py-24">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
          <p className="max-w-md text-[13px] font-normal italic leading-[1.7] text-pos-ink-muted sm:text-[14px] sm:leading-[1.75]">
            From the till floor to HQ — store ops, catalog moments, and rollout stories that show how teams actually run POS day to day.
          </p>
          <a
            href={SOCIAL_HREF}
            target="_blank"
            rel="noreferrer"
            className="inline-flex shrink-0 items-center gap-1.5 self-start border-b border-pos-ink pb-0.5 text-[12px] font-semibold uppercase tracking-[0.12em] text-pos-ink transition hover:text-pos-primary hover:border-pos-primary sm:text-[13px]"
          >
            See social
            <span aria-hidden className="text-[14px] leading-none">
              ↗
            </span>
          </a>
        </div>

        <div className="mt-10 grid grid-cols-2 gap-1.5 sm:mt-12 sm:grid-cols-5 sm:gap-2 lg:mt-14">
          {GALLERY.map((src, i) => (
            <div
              key={src}
              className={`overflow-hidden bg-pos-surface-muted aspect-[4/5] ${i === 4 ? "col-span-2 sm:col-span-1" : ""}`}
            >
              <img
                src={src}
                alt=""
                decoding="async"
                className="size-full object-cover object-center grayscale"
              />
            </div>
          ))}
        </div>

        <header className="mt-12 flex items-center gap-4 sm:mt-16 sm:gap-6 lg:mt-20">
          <h2 className="shrink-0 text-[clamp(1.75rem,5vw,3.25rem)] font-semibold tracking-[-0.02em] text-pos-ink">
            Our
          </h2>
          <div className="h-px min-w-0 flex-1 bg-pos-ink/55 dark:bg-pos-ink/70" aria-hidden />
          <h2 className="shrink-0 text-[clamp(1.75rem,5vw,3.25rem)] font-semibold tracking-[-0.02em] text-pos-ink">
            Social
          </h2>
        </header>
      </div>
    </section>
  );
}
