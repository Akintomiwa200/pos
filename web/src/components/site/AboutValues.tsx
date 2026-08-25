import type { ReactNode } from "react";

const VALUES: { label: string; color: string; icon: ReactNode }[] = [
  {
    label: "Built for\noperators",
    color: "#cceb54",
    icon: (
      <svg viewBox="0 0 48 48" className="size-[38%]" fill="none" aria-hidden>
        <path
          d="M10 38V18.5L24 10l14 8.5V38"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <path
          d="M18 38V26h12v12"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <path
          d="M14 22h4M30 22h4M22 18h4"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    label: "Secure\ntills",
    color: "#d7c7fa",
    icon: (
      <svg viewBox="0 0 48 48" className="size-[38%]" fill="none" aria-hidden>
        <path
          d="M24 9.2 12.8 14v9.4c0 7.8 4.8 13.6 11.2 15.8 6.4-2.2 11.2-8 11.2-15.8V14L24 9.2Z"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <path
          d="m19.5 24.2 2.9 2.9 6.3-6.9"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "One source\nof truth",
    color: "#f7cb71",
    icon: (
      <svg viewBox="0 0 48 48" className="size-[38%]" fill="none" aria-hidden>
        <path
          d="M10 18 24 11l14 7-14 7-14-7Z"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinejoin="round"
        />
        <path
          d="m10 25 14 7 14-7"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="m10 32 14 7 14-7"
          stroke="currentColor"
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    label: "Live\nimpact",
    color: "#9ed5f2",
    icon: (
      <svg viewBox="0 0 48 48" className="size-[38%]" fill="none" aria-hidden>
        <path
          d="M12.5 15 17 28.5M21.5 13v16M28.5 13v16M35.5 13v16"
          stroke="currentColor"
          strokeWidth="1.55"
          strokeLinecap="round"
        />
        <circle cx="12.5" cy="15" r="3.15" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="21.5" cy="29" r="3.15" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="28.5" cy="29" r="3.15" stroke="currentColor" strokeWidth="1.55" />
        <circle cx="35.5" cy="29" r="3.15" stroke="currentColor" strokeWidth="1.55" />
        <path d="M16 33.5h23" stroke="currentColor" strokeWidth="1.55" strokeLinecap="round" />
      </svg>
    ),
  },
];

/**
 * Clean Figma Values disc: perfect circle with smooth NE / SW bites
 * (brand offset silhouette, vector-sharp).
 */
function ValueDisc({
  color,
  children,
  id,
}: {
  color: string;
  children: ReactNode;
  id: string;
}) {
  const maskId = `value-disc-mask-${id}`;
  return (
    <div className="relative aspect-square w-[7.75rem] sm:w-[8.75rem] lg:w-[9.5rem]">
      <svg
        viewBox="0 0 120 120"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="120"
            height="120"
          >
            <rect width="120" height="120" fill="black" />
            <circle cx="60" cy="60" r="50" fill="white" />
            <circle cx="102" cy="26" r="28" fill="black" />
            <circle cx="18" cy="94" r="28" fill="black" />
          </mask>
        </defs>
        <circle cx="60" cy="60" r="50" fill={color} mask={`url(#${maskId})`} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-pos-ink">{children}</div>
    </div>
  );
}

export function AboutValues() {
  return (
    <section className="about-values bg-pos-bg px-5 py-16 sm:px-8 sm:py-20 lg:py-[6.5rem]">
      <div className="mx-auto max-w-[980px]">
        <h2 className="text-center text-[clamp(2rem,3.8vw,2.75rem)] font-semibold tracking-[-0.02em] text-pos-ink">
          Values
        </h2>

        <ul className="mt-14 grid grid-cols-2 gap-x-8 gap-y-12 sm:mt-[4.5rem] lg:mt-20 lg:grid-cols-4 lg:gap-x-6 xl:gap-x-10">
          {VALUES.map((item, index) => (
            <li key={item.label} className="flex flex-col items-center text-center">
              <ValueDisc color={item.color} id={String(index)}>
                {item.icon}
              </ValueDisc>
              <p className="mt-4 max-w-[9.5rem] whitespace-pre-line text-[14px] font-normal leading-[1.35] tracking-[-0.01em] text-pos-ink sm:mt-5 sm:text-[15px]">
                {item.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
