/**
 * Figma About hero orb — offset split sphere (crisp SVG).
 * Top half shifted right, bottom half shifted left.
 */
function AboutHeroOrb({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      fill="none"
    >
      <defs>
        <linearGradient id="about-orb-top" x1="30%" y1="15%" x2="75%" y2="90%">
          <stop offset="0%" stopColor="#b8a6ff" />
          <stop offset="45%" stopColor="#8b74ff" />
          <stop offset="100%" stopColor="#6d4aff" />
        </linearGradient>
        <linearGradient id="about-orb-bot" x1="25%" y1="10%" x2="80%" y2="95%">
          <stop offset="0%" stopColor="#8b74ff" />
          <stop offset="50%" stopColor="#6d4aff" />
          <stop offset="100%" stopColor="#4c2fd9" />
        </linearGradient>
        <clipPath id="about-orb-top-clip">
          <rect x="0" y="0" width="200" height="100" />
        </clipPath>
        <clipPath id="about-orb-bot-clip">
          <rect x="0" y="100" width="200" height="100" />
        </clipPath>
        <filter id="about-orb-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b" />
          <feOffset dy="1" result="o" />
          <feFlood floodColor="#2a1a6e" floodOpacity="0.22" />
          <feComposite in2="o" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#about-orb-soft)">
        {/* Bottom first, then top — top never covered by lower half */}
        <g clipPath="url(#about-orb-bot-clip)">
          <circle cx="92" cy="100" r="78" fill="url(#about-orb-bot)" />
        </g>
        <g clipPath="url(#about-orb-top-clip)">
          <circle cx="108" cy="100" r="78" fill="url(#about-orb-top)" />
        </g>
      </g>
    </svg>
  );
}

const COPY =
  "POS is the back office for stores that already run a till — supermarket shelves, restaurant tables, hotel rooms, and dark kitchens. Catalog, tax, and sales live in one API so the till, HQ console, and price check read the same numbers. Each till is one device with a clear one-year subscription from activation. We build for operators who need sales on the floor and control in the browser.";

export function AboutHero() {
  return (
    <section className="about-hero relative -mt-[4.5rem] overflow-hidden pt-[4.5rem]">
      <div aria-hidden className="marketing-hero-bg absolute inset-0">
        <div className="hero-matrix about-hero-matrix absolute inset-0" />
      </div>

      <div className="relative mx-auto flex h-[50vh] min-h-[18rem] w-full max-w-[1100px] items-center px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="grid w-full items-start gap-6 sm:gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 xl:gap-16">
          <h1 className="about-hero-title text-[clamp(2.25rem,5vw,4rem)] font-bold leading-[1.02] tracking-[-0.03em] text-white">
            About Us
          </h1>
          <p className="about-hero-copy max-w-[34rem] text-[15px] leading-[1.7] text-white/80 sm:text-[16px] sm:leading-[1.75] lg:pt-2">
            {COPY}
          </p>
        </div>
      </div>

      <div className="about-hero-visual relative w-full pt-[min(28vw,11rem)] sm:pt-[min(22vw,12.5rem)] lg:pt-[13.5rem]">
        <div className="relative aspect-[4.7/1] w-full overflow-hidden rounded-t-[28px] sm:rounded-t-[40px] lg:rounded-t-[56px]">
          <picture>
            <source srcSet="/about-hero-landscape.webp?v=hq" type="image/webp" />
            <img
              src="/about-hero-landscape.png?v=hq"
              alt="Mountain peaks rising through morning mist"
              width={1536}
              height={653}
              decoding="async"
              fetchPriority="high"
              className="absolute inset-0 block size-full select-none object-cover object-center"
            />
          </picture>
        </div>

        <AboutHeroOrb className="pointer-events-none absolute left-1/2 top-[min(28vw,11rem)] z-10 w-[min(56vw,22rem)] -translate-x-1/2 -translate-y-1/2 sm:top-[min(22vw,12.5rem)] sm:w-[min(44vw,25rem)] lg:top-[13.5rem] lg:w-[27rem]" />
      </div>
    </section>
  );
}
