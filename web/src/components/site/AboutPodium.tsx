export function AboutPodium() {
  return (
    <section className="about-podium relative isolate w-full overflow-hidden bg-pos-bg">
      <div className="relative min-h-[min(78vh,52rem)] w-full">
        <picture className="pointer-events-none absolute inset-0 z-0 block size-full">
          <source srcSet="/about-podium-scene.webp" type="image/webp" />
          <img
            src="/about-podium-scene.png"
            alt=""
            width={1536}
            height={1024}
            decoding="async"
            className="size-full object-cover object-center"
          />
        </picture>

        {/* Softened photo on edges only — center stays sharp */}
        <div
          aria-hidden
          className="about-podium-edge-blur pointer-events-none absolute inset-0 z-[1]"
        >
          <img
            src="/about-podium-scene.webp"
            alt=""
            width={1536}
            height={1024}
            decoding="async"
            className="size-full object-cover object-center"
          />
        </div>

        {/* Theme wash on edges: white in light, dark in dark */}
        <div aria-hidden className="about-podium-edge-wash pointer-events-none absolute inset-0 z-[2]" />

        <div className="relative z-10 flex min-h-[min(78vh,52rem)] flex-col items-center justify-center px-6 py-24 text-center sm:px-10 sm:py-28">
          <p className="max-w-2xl text-[clamp(1.05rem,2.4vw,1.35rem)] font-normal leading-[1.55] tracking-[-0.01em] text-white drop-shadow-[0_1px_12px_rgb(0_0_0_/_0.45)] sm:leading-[1.6]">
            Built to last on the counter and in the back office — one catalog, clear till licensing,
            and a stack that stays dependable as your stores grow.
          </p>
        </div>
      </div>
    </section>
  );
}
