"use client";

export function PageHero({
  kicker,
  title,
  copy,
}: {
  kicker: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="border-b border-pos-border/80 bg-pos-surface">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-[13px] font-medium text-pos-primary">{kicker}</p>
        <h1 className="mt-2 max-w-3xl text-[1.75rem] font-medium leading-snug tracking-tight text-pos-ink sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-pos-ink-muted">{copy}</p>
      </div>
    </div>
  );
}
