import { PageHero } from "../../../../components/site/PageHero";

export default function VerticalPage({
  kicker,
  title,
  copy,
  points,
}: {
  kicker: string;
  title: string;
  copy: string;
  points: string[];
}) {
  return (
    <>
      <PageHero kicker={kicker} title={title} copy={copy} />
      <ul className="mx-auto max-w-6xl space-y-3 px-4 py-12 sm:px-6">
        {points.map((point) => (
          <li
            key={point}
            className="rounded-2xl bg-white px-5 py-4 text-sm text-neutral-600 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            {point}
          </li>
        ))}
      </ul>
    </>
  );
}
