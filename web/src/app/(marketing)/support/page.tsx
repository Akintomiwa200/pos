import Link from "next/link";
import { PageHero } from "../../../components/site/PageHero";

const topics = [
  {
    title: "First install",
    copy: "Issue TILL-DEMO-01 or another till in HQ, then type the code on the till before anyone can sign in.",
    href: "/product",
  },
  {
    title: "Build EXE / APK",
    copy: "Packaging steps for Windows setup.exe, Android APK, and Windows services live in the repo docs.",
    href: "https://github.com/Akintomiwa200/pos/blob/main/docs/build/README.md",
  },
  {
    title: "Releases",
    copy: "Source and UI zips are on GitHub Releases. Native installers upload after you build them.",
    href: "https://github.com/Akintomiwa200/pos/releases",
  },
  {
    title: "HQ login",
    copy: "Use the account created in Setup → Users. Menus follow that account’s group.",
    href: "/login",
  },
];

export default function SupportPage() {
  return (
    <>
      <PageHero
        kicker="Support"
        title="Install, licence, then sell."
        copy="Most issues are an unreachable API, an expired till year, or a till taken over by another PC."
      />
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2">
        {topics.map((topic) => (
          <Link
            key={topic.title}
            href={topic.href}
            className="rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <h2 className="font-semibold">{topic.title}</h2>
            <p className="mt-2 text-sm text-neutral-500">{topic.copy}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
