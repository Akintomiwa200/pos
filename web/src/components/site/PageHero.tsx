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
        <p className="text-[13px] font-medium text-[#6d4aff]">{kicker}</p>
        <h1 className="mt-2 max-w-3xl text-[1.75rem] font-medium leading-snug tracking-tight text-[#1c1c1e] sm:text-[2rem]">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-[15px] leading-7 text-neutral-600">{copy}</p>
      </div>
    </div>
  );
}
