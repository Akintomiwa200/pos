import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "../../../components/site/PageHero";

const releaseBase =
  "https://github.com/Akintomiwa200/pos/releases/latest/download";
const docsBase = "https://github.com/Akintomiwa200/pos/blob/main/docs/build";

export const metadata: Metadata = {
  title: "Build & release guide",
  description:
    "Build and release instructions plus GitHub Release asset links for the till, price check, and label studio apps. Assets only exist after CI succeeds.",
};

const windowsInstallers = [
  {
    title: "Till — Windows setup",
    app: "POS Terminal",
    asset: "pos-terminal-setup.exe",
    kind: "Unsigned NSIS installer",
    cta: "EXE link",
  },
  {
    title: "Till — Windows installer",
    app: "POS Terminal",
    asset: "pos-terminal.msi",
    kind: "Unsigned MSI package",
    cta: "MSI link",
  },
  {
    title: "Price check — Windows setup",
    app: "Price Check",
    asset: "price-check-setup.exe",
    kind: "Unsigned NSIS installer",
    cta: "EXE link",
  },
  {
    title: "Price check — Windows installer",
    app: "Price Check",
    asset: "price-check.msi",
    kind: "Unsigned MSI package",
    cta: "MSI link",
  },
  {
    title: "Label studio — Windows setup",
    app: "Label Studio",
    asset: "label-studio-setup.exe",
    kind: "Unsigned NSIS installer",
    cta: "EXE link",
  },
  {
    title: "Label studio — Windows installer",
    app: "Label Studio",
    asset: "label-studio.msi",
    kind: "Unsigned MSI package",
    cta: "MSI link",
  },
];

const androidInstallers = [
  {
    title: "Till — Android APK",
    app: "POS Terminal",
    asset: "pos-terminal.apk",
    cta: "APK link",
  },
  {
    title: "Till — Android bundle",
    app: "POS Terminal",
    asset: "pos-terminal.aab",
    cta: "AAB link",
  },
  {
    title: "Price check — Android APK",
    app: "Price Check",
    asset: "price-check.apk",
    cta: "APK link",
  },
  {
    title: "Price check — Android bundle",
    app: "Price Check",
    asset: "price-check.aab",
    cta: "AAB link",
  },
];

const guides = [
  {
    title: "Windows build guide",
    copy: "Exact local pnpm/Tauri commands for EXE and MSI, where files land, and what is unsigned.",
    href: `${docsBase}/windows-exe.md`,
    cta: "Read windows-exe.md",
  },
  {
    title: "Android build guide",
    copy: "Android init, SDK/JDK setup, APK/AAB commands, and why Android is a manual CI job.",
    href: `${docsBase}/android-apk.md`,
    cta: "Read android-apk.md",
  },
  {
    title: "Release CI guide",
    copy: "How a v* tag triggers the workflows, the predictable asset names, and the current limits.",
    href: `${docsBase}/release-ci.md`,
    cta: "Read release-ci.md",
  },
  {
    title: "Release history",
    copy: "The tagged releases that own these assets. Check the workflow run before trusting a link.",
    href: "https://github.com/Akintomiwa200/pos/releases",
    cta: "Open releases",
  },
];

function InstallerCard({
  item,
}: {
  item: { title: string; app: string; asset: string; cta: string; kind?: string };
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]">
      <h2 className="font-semibold">{item.title}</h2>
      <p className="mt-2 flex-1 text-sm text-neutral-500">
        {item.kind ? `${item.kind} for ${item.app}. ` : `Manual build for ${item.app}. `}
        Release asset: <code className="text-xs">{item.asset}</code>.
      </p>
      <Link
        href={`${releaseBase}/${item.asset}`}
        prefetch={false}
        className="mt-5 text-sm font-semibold text-[#ec4899]"
      >
        {item.cta}
      </Link>
    </div>
  );
}

export default function DownloadPage() {
  return (
    <>
      <PageHero
        kicker="Build & release"
        title="Build & release guide"
        copy="Windows EXE and MSI installers are built and attached by CI when a v* tag succeeds. Android APK/AAB builds are manual until an Android project is committed."
      />

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          These links point at the latest GitHub Release and only work after a
          tagged release has finished building successfully. A missing asset
          returns GitHub&apos;s 404 page — no availability is claimed here. All
          CI installers are unsigned; nothing is notarised.
        </p>
      </div>

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <h2 className="text-xl font-semibold">Windows installer asset links</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Attached automatically by the Native installers workflow on a
          successful <code>v*</code> tag.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {windowsInstallers.map((item) => (
            <InstallerCard key={item.asset} item={item} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6">
        <h2 className="text-xl font-semibold">Android asset links (manual builds)</h2>
        <p className="mt-2 text-sm text-neutral-500">
          Tag CI skips Android until <code>src-tauri/gen/android</code> is
          committed. Run the Native installers workflow manually with a
          <code> release_tag</code> to attach these files. They are unsigned
          sideload builds, not Play Store releases.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {androidInstallers.map((item) => (
            <InstallerCard key={item.asset} item={item} />
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2">
        {guides.map((item) => (
          <div
            key={item.title}
            className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 flex-1 text-sm text-neutral-500">{item.copy}</p>
            <Link
              href={item.href}
              prefetch={false}
              className="mt-5 text-sm font-semibold text-[#ec4899]"
            >
              {item.cta}
            </Link>
          </div>
        ))}
      </section>
    </>
  );
}
