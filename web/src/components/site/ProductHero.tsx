const COPY =
  "POS is the storefront package for businesses that already run a till — supermarkets, restaurant counters, hotel desks, and dark kitchens. The till sells, HQ runs the catalog and the reports, price check keeps the floor aligned, and the API binds every client to the same live numbers.";

/**
 * Product hero orb — till key / crescent silhouette (crisp SVG).
 * Brand offset split sphere with a clean NE crescent bite.
 */
function ProductHeroOrb({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      aria-hidden
      fill="none"
    >
      <defs>
        <linearGradient id="product-orb-top" x1="30%" y1="15%" x2="75%" y2="90%">
          <stop offset="0%" stopColor="#a7f3d0" />
          <stop offset="45%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="product-orb-bot" x1="25%" y1="10%" x2="80%" y2="95%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <clipPath id="product-orb-top-clip">
          <rect x="0" y="0" width="200" height="100" />
        </clipPath>
        <clipPath id="product-orb-bot-clip">
          <rect x="0" y="100" width="200" height="100" />
        </clipPath>
        <mask id="product-orb-crescent" x="0" y="0" width="200" height="200" maskUnits="userSpaceOnUse">
          <rect width="200" height="200" fill="white" />
          <circle cx="156" cy="62" r="34" fill="black" />
        </mask>
        <filter id="product-orb-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="1.2" result="b" />
          <feOffset dy="1" result="o" />
          <feFlood floodColor="#022c22" floodOpacity="0.22" />
          <feComposite in2="o" operator="in" />
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#product-orb-soft)">
        <g clipPath="url(#product-orb-bot-clip)">
          <circle cx="92" cy="100" r="78" fill="url(#product-orb-bot)" mask="url(#product-orb-crescent)" />
        </g>
        <g clipPath="url(#product-orb-top-clip)">
          <circle cx="108" cy="100" r="78" fill="url(#product-orb-top)" mask="url(#product-orb-crescent)" />
        </g>
      </g>
    </svg>
  );
}

export function ProductHero() {
  return (
    <section className="product-hero relative -mt-[4.5rem] overflow-hidden pt-[4.5rem]">
      <div aria-hidden className="marketing-hero-bg absolute inset-0">
        <div className="hero-matrix product-hero-matrix absolute inset-0" />
      </div>

      <div className="relative mx-auto flex h-[50vh] min-h-[18rem] w-full max-w-[1100px] items-center px-5 pt-6 sm:px-8 sm:pt-8">
        <div className="grid w-full items-center gap-6 sm:gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-14 xl:gap-16">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-white ring-1 ring-white/25">
              Product
            </p>
            <h1 className="product-hero-title mt-6 text-[clamp(2rem,4.8vw,3.75rem)] font-bold leading-[1.02] tracking-[-0.03em] text-white">
              Four apps.
              <br />
              One catalog. One store.
            </h1>
          </div>
          <p className="product-hero-copy max-w-[34rem] text-[15px] leading-[1.7] text-white/80 sm:text-[16px] sm:leading-[1.75] lg:pt-2">
            {COPY}
          </p>
        </div>
      </div>

      <div className="relative w-full pt-[min(28vw,11rem)] sm:pt-[min(22vw,12.5rem)] lg:pt-[13.5rem]">
        <ProductHeroOrb className="pointer-events-none absolute left-1/2 top-0 z-10 w-[min(44vw,18rem)] -translate-x-1/2 -translate-y-1/2 sm:w-[min(38vw,22rem)] lg:w-[24rem]" />
        <div className="relative aspect-[4.7/1] w-full overflow-hidden rounded-t-[28px] sm:rounded-t-[40px] lg:rounded-t-[56px]">
          <div aria-hidden className="product-hero-stack-bg absolute inset-0" />
          <div aria-hidden className="hero-matrix absolute inset-0 opacity-30" />
          <div className="absolute inset-0 grid place-items-center">
            <div className="relative aspect-square w-[min(40vw,20rem)]">
              <ProductHeroOrb className="absolute inset-0 size-full" />
              <div className="absolute inset-0 grid place-items-center text-center">
                <p className="max-w-[12ch] text-[clamp(0.95rem,2.4vw,1.3rem)] font-normal leading-[1.4] tracking-[-0.01em] text-white drop-shadow-[0_1px_10px_rgb(0_0_0_/_0.45)]">
                  A till you can read from the back office
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
