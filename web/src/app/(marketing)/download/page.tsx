import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "../../../components/site/PageHero";

export const metadata: Metadata = {
  title: "Build & release guide",
  description:
    "Build and release instructions for the till and price check apps. Native installers are not published yet.",
};

const downloads = [
  {
    title: "Till (Windows)",
    copy: "Build POS Terminal_0.1.0_x64-setup.exe with Tauri from the pos/ folder. Attach it to a GitHub Release when you have icons and a signed installer.",
    href: "https://github.com/Akintomiwa200/pos/blob/main/docs/build/windows-exe.md",
    cta: "Windows EXE guide",
  },
  {
    title: "Till or price check (Android)",
    copy: "pnpm tauri android build --apk after android init. Sideload the universal APK or ship an AAB to Play.",
    href: "https://github.com/Akintomiwa200/pos/blob/main/docs/build/android-apk.md",
    cta: "Android APK guide",
  },
  {
    title: "Price check (Windows)",
    copy: "Same Tauri flow from price-check/. Staff paste the API URL in the app.",
    href: "https://github.com/Akintomiwa200/pos/blob/main/docs/build/windows-exe.md",
    cta: "Windows EXE guide",
  },
  {
    title: "Release tag",
    copy: "The v0.1.0 tag tracks the compiled web UI and API dist zips. These are not native installers.",
    href: "https://github.com/Akintomiwa200/pos/releases/tag/v0.1.0",
    cta: "Open v0.1.0 tag",
  },
];

export default function DownloadPage() {
  return (
    <>
      <PageHero
        kicker="Build & release"
        title="Build & release guide"
        copy="Native setup.exe and APK installers are not published yet. This page keeps the build commands and release notes for producing them from source."
      />
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <p className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3 text-sm text-neutral-600">
          No installer downloads are available here. Use the guides below to build the apps
          yourself; the tagged release only carries web UI and API dist files.
        </p>
      </div>
      <div className="mx-auto grid max-w-6xl gap-4 px-4 py-12 sm:px-6 md:grid-cols-2">
        {downloads.map((item) => (
          <div
            key={item.title}
            className="flex flex-col rounded-2xl bg-white p-6 shadow-[0_8px_30px_rgba(28,28,30,0.06)]"
          >
            <h2 className="font-semibold">{item.title}</h2>
            <p className="mt-2 flex-1 text-sm text-neutral-500">{item.copy}</p>
            <Link href={item.href} className="mt-5 text-sm font-semibold text-[#ec4899]">
              {item.cta}
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}
