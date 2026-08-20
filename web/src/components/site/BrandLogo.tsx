import Link from "next/link";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="none"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray="58 11"
        transform="rotate(-38 16 16)"
      />
    </svg>
  );
}

export function BrandLogo({
  href = "/",
  label = "POS",
  size = "md",
}: {
  href?: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const tile = size === "sm" ? "h-8 w-8 rounded-[10px]" : "h-9 w-9 rounded-xl";
  const mark = size === "sm" ? "h-[18px] w-[18px]" : "h-[22px] w-[22px]";

  return (
    <Link href={href} className="flex min-w-0 shrink-0 items-center gap-2.5">
      <span
        className={`grid place-items-center bg-[#6d4aff] text-white shadow-[0_6px_16px_rgba(109,74,255,0.28)] ${tile}`}
      >
        <BrandMark className={mark} />
      </span>
      <span className="text-[17px] font-medium tracking-tight">{label}</span>
    </Link>
  );
}
