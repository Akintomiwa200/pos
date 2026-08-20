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
    <div className="border-b border-neutral-200/80 bg-white">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6d4aff]">{kicker}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-neutral-500">{copy}</p>
      </div>
    </div>
  );
}
