# Windows EXE and MSI

Ship **Point of sale**, **Price check**, and **Label studio** as installers that
staff double-click. All three use **Tauri 2** (`src-tauri/`) around a Vite React
UI.

Build **on Windows**. Output is a setup `.exe` (NSIS, recommended) and an `.msi`.
Pushed `v*` tags do this automatically in CI; see [release-ci.md](release-ci.md).
CI output is **unsigned** unless you sign it separately.

## 0. One-time: enable the native shell

The `src-tauri` folders are the packaging home. From `pos`, `price-check`, or
`label-studio`, install once:

```powershell
cd C:\Users\DELL\Desktop\POS\pos   # or price-check / label-studio
pnpm install
```

`Cargo.toml` and `src-tauri/src` already declare a Tauri 2 app. The first build
downloads Rust crates and may create `src-tauri/Cargo.lock`
— **commit that lockfile**.

Generate icons before the first bundle if `src-tauri/icons/icon.ico` is missing:

```powershell
# from the app folder; use a square PNG/SVG with transparency
pnpm exec tauri icon public/icon.svg
```

`price-check` ships `public/icon.svg` but no committed `src-tauri/icons/`, so
this step is required there (CI generates them automatically).

If Android is in scope later, also run (once per app):

```powershell
pnpm tauri android init
```

See [android-apk.md](android-apk.md).

## 1. Point the till at the API

In development, Vite proxies `/api` to `http://127.0.0.1:3001`. A packaged EXE
**does not**. Set the API origin **before** you build.

Create `pos/.env.production` (do not commit secrets):

```env
VITE_API_URL=http://192.168.1.10:3001
```

Use the real LAN or public origin of the Nest API **including protocol and
port, without a trailing slash**. Paths still start with `/api/...`.

Price check: users can type the API URL in the app (stored in the browser). You
may still bake a default:

```env
# price-check/.env.production (optional default)
VITE_API_URL=http://192.168.1.10:3001
```

The API must already be installed and reachable. See [services.md](services.md).

## 2. Build Point of sale (till)

```powershell
cd C:\Users\DELL\Desktop\POS\pos
pnpm install
pnpm exec tauri build --bundles nsis,msi
```

That runs `pnpm build` (TypeScript + Vite), then compiles the Rust shell, then
writes the NSIS installer and the MSI.

**Find the installer**

```
pos\src-tauri\target\release\bundle\nsis\
  POS Terminal_0.1.0_x64-setup.exe
```

Raw unsigned binary (no Start Menu shortcut):

```
pos\src-tauri\target\release\pos-desktop.exe
```

MSI path:

```
pos\src-tauri\target\release\bundle\msi\
```

WiX Toolset **v3** must be on `PATH` to build MSI (CI installs
`wixtoolset` 3.14.1 via Chocolatey). If `light.exe` fails locally, enable the
Windows **VBScript** optional feature.

## 3. Build Price check

```powershell
cd C:\Users\DELL\Desktop\POS\price-check
pnpm install
if (-not (Test-Path src-tauri\icons\icon.ico)) { pnpm exec tauri icon public\icon.svg }
pnpm exec tauri build --bundles nsis,msi
```

**Find the installer**

```
price-check\src-tauri\target\release\bundle\nsis\
  Price Check_0.1.0_x64-setup.exe
```

Raw binary: `price-check\src-tauri\target\release\price-check-desktop.exe`.

## 3b. Build Label studio

```powershell
cd C:\Users\DELL\Desktop\POS\label-studio
pnpm install
pnpm exec tauri build --bundles nsis,msi
```

Installer: `label-studio\src-tauri\target\release\bundle\nsis\Label Studio_0.1.0_x64-setup.exe`.

## 4. Other Windows CPU types

Default is 64-bit Intel/AMD. For 32-bit or ARM:

```powershell
rustup target add i686-pc-windows-msvc
pnpm exec tauri build --target i686-pc-windows-msvc --bundles nsis,msi

rustup target add aarch64-pc-windows-msvc
pnpm exec tauri build --target aarch64-pc-windows-msvc --bundles nsis,msi
```

Cross-target output lands under `src-tauri/target/<triple>/release/bundle/`.

## 5. Dev loop (native window, not a browser)

API first, then:

```powershell
cd backend
pnpm dev
```

```powershell
cd pos
pnpm tauri dev
```

Price check: `cd price-check` then `pnpm tauri dev` (UI on port 1430).

## 6. What to give the store

| File | Give to |
| --- | --- |
| `*-setup.exe` | Cashiers / IT (installs WebView2 if needed, Start Menu shortcut) |
| `.msi` | Domain / Intune / Group Policy |
| API URL + till **code** from HQ Setup → Others → Till | First launch of the till |

Release CI renames the files to `pos-terminal-setup.exe`, `pos-terminal.msi`,
`price-check-setup.exe`, `price-check.msi`, `label-studio-setup.exe`, and
`label-studio.msi` before attaching them to the tag Release. Those are the names
the `/download` page links to. They are **unsigned**; sign locally with
[signtool](signing.md) for broad deployment.

The till still requires **Activate this till** on first use (16-character code)
and again when the one-year subscription ends.

## 7. Troubleshooting

| Symptom | Fix |
| --- | --- |
| `failed to bundle project: icons` | Run `pnpm exec tauri icon …` and confirm `src-tauri/icons/` exists |
| Linker / `link.exe` missing | Install VS Build Tools **C++** workload |
| Till opens but catalog/login empty | `VITE_API_URL` wrong or API not listening; test `http://HOST:3001/api/health` in a browser on that PC |
| `pnpm tauri` not found | `pnpm add -D @tauri-apps/cli@2` in that app folder |
| Antivirus flags the unsigned EXE | Expected until you Authenticode-sign; see [signing.md](signing.md) |
| MSI `light.exe` / VBScript errors | Settings → Apps → Optional features → enable VBScript, or ship NSIS only |

Clean rebuild:

```powershell
# from pos/ or price-check/
Remove-Item -Recurse -Force src-tauri\target, dist -ErrorAction SilentlyContinue
pnpm exec tauri build --bundles nsis,msi
```
