# How to build and ship this POS

This folder is the packaging manual for every app in the repo. Use it when you
need a **Windows installer (.exe / .msi)**, an **Android APK**, or a **Windows
service** for HQ and the API.

## What you are building

| Product | Folder | What customers install | Typical device |
| --- | --- | --- | --- |
| Point of sale (till) | [`pos/`](../../pos/) | Windows **setup.exe** (NSIS) or **.msi**; optional **APK** for a tablet | Cashier PC or Android tablet |
| Price check | [`price-check/`](../../price-check/) | Windows **setup.exe**; **APK** for a handheld | Gun scanner / phone / small PC |
| API (backend) | [`backend/`](../../backend/) | Node process or **Windows Service** (not an APK) | Back-office server or the till PC |
| HQ console | [`web/`](../../web/) | Node process or **Windows Service** (browser app) | Manager PC / browser |

The till and price-check **do not contain the database**. They talk to the API
over HTTP. A packaged `.exe` or `.apk` must be pointed at that API (LAN IP or
public URL) at build time or, for price check, in the in-app API field.

## Read in this order

1. [Prerequisites](prerequisites.md) — Node, Rust, Visual Studio, Android SDK
2. [Windows EXE / MSI](windows-exe.md) — POS Terminal and Price Check
3. [Android APK](android-apk.md) — tablets and handhelds
4. [API and HQ services](services.md) — keep `/api` running
5. [Signing and release](signing.md) — store / enterprise install
6. [GitHub Releases](github-releases.md) — tags, assets; Packages are not used

Example config files live in [`examples/`](examples/).

## One-line map of output files

After a successful Windows build (from each app folder):

```
src-tauri/target/release/bundle/nsis/*-setup.exe
src-tauri/target/release/bundle/msi/*.msi
src-tauri/target/release/*.exe          ← raw binary, no installer
```

After a successful Android build:

```
src-tauri/gen/android/app/build/outputs/apk/universal/release/*.apk
src-tauri/gen/android/app/build/outputs/bundle/universalRelease/*.aab
```

## Development vs packaged

| Mode | Till / price check | API |
| --- | --- | --- |
| `pnpm dev` | Vite proxies `/api` to `http://127.0.0.1:3001` | `cd backend && pnpm dev` |
| `.exe` / `.apk` | No Vite proxy. Set `VITE_API_URL` (till) or the on-screen API box (price check) | Must already be running and reachable |

Do not ship `node_modules`, `backend/data/`, or `.env` files inside the
installers. Those stay on the machine that hosts the API.
