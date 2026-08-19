# Build prerequisites

Install these **on the machine that compiles** the installers. Cashiers and
price-check users do not need them.

## All builds

| Tool | Version | Why |
| --- | --- | --- |
| Node.js | **22** (see [`.nvmrc`](../../.nvmrc)) | Vite, Next.js, NestJS |
| pnpm | 9 or 10 | Package manager used in this repo |
| Git | any recent | Clone and tags |

Confirm:

```powershell
node -v    # v22.x
pnpm -v
```

From each app folder (`pos`, `price-check`, `backend`, `web`):

```powershell
pnpm install
```

## Windows EXE / MSI (till and price check)

Builds **must run on Windows**. MSI cannot be produced on macOS/Linux.

| Tool | Why |
| --- | --- |
| [Rust](https://rustup.rs/) (stable) | Tauri native shell |
| [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) with **Desktop development with C++** | MSVC linker |
| WebView2 | Bundled by the installer if missing; present on Windows 10/11 |
| Tauri CLI | `@tauri-apps/cli` in each app (`pnpm tauri`) |

```powershell
rustup --version
rustc --version
cargo --version
```

First time only, add the Windows GNU/MSVC target you will ship (almost always 64-bit):

```powershell
rustup target add x86_64-pc-windows-msvc
```

Optional (32-bit PCs or ARM laptops):

```powershell
rustup target add i686-pc-windows-msvc
rustup target add aarch64-pc-windows-msvc
```

### App icons (required before the first EXE)

Tauri refuses to bundle without icons. From `pos/` or `price-check/`, after
`pnpm add -D @tauri-apps/cli@2`:

```powershell
# POS — use any square PNG/SVG at least 1024px if you have a brand mark
pnpm exec tauri icon path\to\icon.png

# Price check can reuse its existing mark
pnpm exec tauri icon public/icon.svg
```

This writes `src-tauri/icons/`. Commit those generated PNGs/ICO files.

## Android APK

| Tool | Why |
| --- | --- |
| [Android Studio](https://developer.android.com/studio) Ladybug or newer | SDK, emulator, APK signing UI |
| Android SDK **33+** and **NDK 26+** | Native Tauri layer |
| JDK **17** | Gradle |
| Rust Android targets | Cross-compile the shell |

Set environment variables (User or System), then **open a new terminal**:

```powershell
# Typical Android Studio paths — adjust if yours differ
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:NDK_HOME = "$env:ANDROID_HOME\ndk\27.0.12077973"
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
```

Add to `PATH`:

- `%ANDROID_HOME%\platform-tools`
- `%ANDROID_HOME%\cmdline-tools\latest\bin` (if installed)

Rust targets (arm phones + emulator):

```powershell
rustup target add aarch64-linux-android
rustup target add armv7-linux-androideabi
rustup target add i686-linux-android
rustup target add x86_64-linux-android
```

Minimum Android version for Tauri 2 is **7.0 (API 24)**.

## API and HQ as Windows services

| Tool | Why |
| --- | --- |
| Node 22 on the **server** | Runs `backend` and `web` |
| [WinSW](https://github.com/winsw/winsw/releases) **or** [NSSM](https://nssm.cc) | Register `node` as a Windows Service |

You do not need Rust or Android Studio for the API/HQ services.

## Disk and network

- First Rust/Android compile can use **several GB** (toolchains + `target/`).
- Keep `node_modules` and `src-tauri/target` out of git (already in `.gitignore`).
- The till must reach the API host (firewall: TCP **3001** by default, plus **3000** if HQ is used from other PCs).
