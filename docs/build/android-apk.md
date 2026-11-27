# Android APK (and Play Store AAB)

Use this for a **cashier tablet** (POS) or a **handheld price checker**. Both
apps are Tauri 2 Android targets wrapping the same Vite UI as the EXE. Label
studio has no Android script and is not part of the Android job.

Minimum OS: **Android 7.0**. Prefer **aarch64** (almost all modern phones).

Complete [prerequisites.md](prerequisites.md) (Android Studio, NDK, JDK 17,
Rust Android targets) **before** these commands.

> No app currently commits `src-tauri/gen/android/`, so today's tag builds do
> **not** produce Android assets. Once you initialize and commit that Gradle
> project, the same tag build produces unsigned APK/AAB files. See
> [release-ci.md](release-ci.md#android-only-builds-when-the-project-is-committed).

## 0. One-time per app

From `pos/` and again from `price-check/`:

```powershell
pnpm install
pnpm exec tauri icon public\icon.svg       # only if src-tauri\icons is missing
pnpm exec tauri android init
```

`android init` creates `src-tauri/gen/android/` (Gradle project). Rebuilds reuse
it. **Commit that directory** if you want GitHub Actions to build it; the
workflow skips the Android job with a warning while it is absent.

Open the project in Android Studio when you need the emulator or a USB device:

```powershell
pnpm exec tauri android dev --open
```

## 1. API URL

Same rule as Windows: **no Vite proxy** inside an APK.

**POS till** — bake the origin into the release build:

```env
# pos/.env.production
VITE_API_URL=https://pos-api.example.com
```

Use `https` in production. HTTP to a LAN IP works on a store Wi‑Fi but Android
may block cleartext unless you allow it in the Android manifest (Tauri cleartext
is off by default on newer Android). For a LAN store, either:

- Put the API behind HTTPS (nginx + Let’s Encrypt / internal CA), or
- Keep price-check/till and API on the same trusted Wi‑Fi and enable cleartext
  in `src-tauri/gen/android` **only for internal builds**.

**Price check** — staff can paste `http://192.168.1.10:3001` in the in-app API
field after install. That is the usual store setup for a gun scanner.

## 2. Debug APK (USB install)

Phone: enable Developer options → USB debugging. Then:

```powershell
cd C:\Users\DELL\Desktop\POS\price-check
pnpm exec tauri android dev
```

Or POS:

```powershell
cd C:\Users\DELL\Desktop\POS\pos
pnpm exec tauri android dev
```

## 3. Release APK (sideload / internal store)

```powershell
cd C:\Users\DELL\Desktop\POS\pos
pnpm exec tauri android build --apk
```

```powershell
cd C:\Users\DELL\Desktop\POS\price-check
pnpm exec tauri android build --apk
```

**Find the APK**

```
src-tauri\gen\android\app\build\outputs\apk\universal\release\
  app-universal-release.apk
```

Install on a device:

```powershell
adb install -r src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk
```

### Smaller APKs (one CPU each)

```powershell
pnpm exec tauri android build --apk --split-per-abi
```

Most stores only need **aarch64**:

```powershell
pnpm exec tauri android build --apk --target aarch64
```

## 4. Play Store bundle (.aab)

Google Play wants an Android App Bundle, not a raw APK. This command builds both
formats in one pass if you want them together:

```powershell
pnpm exec tauri android build --apk --aab
```

**Find the AAB**

```
src-tauri\gen\android\app\build\outputs\bundle\universalRelease\
  app-universal-release.aab
```

Upload that file in Play Console. The first upload must be done in the browser
so Google can verify the signing key. See [signing.md](signing.md). CI does **not**
build or upload a Play-signed AAB: its AAB is unsigned and is for local testing
only.

## 4b. Build Android in CI

After committing `src-tauri/gen/android/`, push a new `v*` tag. You can also open
**Actions → Native installers → Run workflow** on a branch containing the
Android project; leave `release_tag` blank for CI artifacts only, or set it to an
existing tag (e.g. `v0.1.0`) to attach the assets to that Release.

The job installs JDK 17 and the Android SDK with actions, builds `--apk --aab`,
and renames the outputs to `pos-terminal.apk` / `pos-terminal.aab` and
`price-check.apk` / `price-check.aab`. They remain **unsigned sideload builds**.

## 5. Identifiers (already set)

| App | Application id (`tauri.conf.json`) |
| --- | --- |
| POS Terminal | `com.pos.terminal` |
| Price Check | `com.pos.pricecheck` |

Do not change these after you publish; Play treats a new id as a different app.

## 6. What the APK still needs at runtime

- Network permission (Tauri template includes it).
- Camera (price check barcode) — allow when Android prompts.
- A reachable API (health check: `GET /api/health`).
- For the till: HQ-issued till code on first launch.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `ANDROID_HOME` / `NDK_HOME` not set | Set them, close the terminal, open a new one |
| `sdkmanager` / NDK missing | Android Studio → SDK Manager → SDK Tools → NDK, Android SDK Command-line Tools |
| Gradle JDK mismatch | `JAVA_HOME` must be **17** |
| White screen / network error | Wrong `VITE_API_URL`, mixed content (HTTPS app + HTTP API), or firewall |
| `adb devices` empty | USB cable, OEM USB driver, accept the RSA prompt on the phone |
| CI Android job says project missing | Run `pnpm exec tauri android init`, commit `src-tauri/gen/android`, dispatch again |
| Build all ABIs is huge / slow | `--target aarch64` for phones |
