# API and HQ as Windows services

The till EXE/APK and price-check EXE/APK are clients. They need the **Nest API**
running (`backend`, default port **3001**, routes under `/api`). Managers use
the **HQ console** (`web`, port **3000**).

Neither is an APK. On a store server or the till PC they run as **Node
processes**, registered as **Windows Services** so they survive reboot and
logoff.

## Architecture

```
[POS Terminal.exe]  --HTTP-->  [pos-api service :3001]
[Price Check.exe]   --HTTP-->  [pos-api service :3001]
[Browser / HQ]      --HTTP-->  [pos-hq  service :3000] --(same machine or proxy)--> API
```

Open TCP **3001** (and **3000** if HQ is used from other PCs) on the Windows
firewall for the LAN.

## 1. Build the API

```powershell
cd C:\Users\DELL\Desktop\POS\backend
pnpm install
pnpm build
```

Output: `backend\dist\main.js`.

Smoke test (foreground):

```powershell
$env:PORT = "3001"
$env:CORS_ORIGINS = "http://localhost:3000,https://tauri.localhost"
node dist\main.js
```

Browser: `http://localhost:3001/api/health` should respond.

Runtime data (tills, sales JSON) is written under `backend\data\` — **do not**
put that folder in git. Back it up with the rest of the store.

Production env file `backend\.env` (never commit):

```env
PORT=3001
CORS_ORIGINS=http://192.168.1.10:3000,http://localhost:3000
```

Add every origin the till/HQ/price-check actually use (LAN IPs, HTTPS hostnames).
Packaged Tauri windows may send an origin such as `https://tauri.localhost` —
include it if CORS rejects the EXE.

## 2. Build HQ

```powershell
cd C:\Users\DELL\Desktop\POS\web
pnpm install
pnpm build
```

Foreground:

```powershell
cd C:\Users\DELL\Desktop\POS\web
$env:PORT = "3000"
pnpm start
```

HQ is a Next.js server, not a static folder. Keep Node running. Reverse-proxy
with IIS or nginx if you need port 80/443.

## 3. Windows Service with WinSW (recommended)

1. Download **WinSW x64** from the [WinSW releases](https://github.com/winsw/winsw/releases).
2. Copy `WinSW-x64.exe` next to a config XML.
3. Example files in this repo:
   - [examples/pos-api.winsw.xml](examples/pos-api.winsw.xml)
   - [examples/pos-hq.winsw.xml](examples/pos-hq.winsw.xml)

Rename the exe to match the xml stem, e.g. `pos-api.exe` + `pos-api.xml`.

From an **Administrator** PowerShell:

```powershell
cd C:\Services\pos-api
.\pos-api.exe install
.\pos-api.exe start
Get-Service pos-api
```

Logs: `C:\Services\pos-api\logs\` (as configured in the XML).

Update a release:

```powershell
.\pos-api.exe stop
# copy new dist/, node_modules production install
.\pos-api.exe start
```

Uninstall:

```powershell
.\pos-api.exe stop
.\pos-api.exe uninstall
```

### NSSM alternative

```powershell
nssm install pos-api "C:\Program Files\nodejs\node.exe" "C:\POS\backend\dist\main.js"
nssm set pos-api AppDirectory "C:\POS\backend"
nssm set pos-api AppEnvironmentExtra PORT=3001
nssm start pos-api
```

Same idea for HQ with `pnpm.cmd start` or `node node_modules\next\dist\bin\next start`.

## 4. Install Node on the server

- Install **Node 22** (LTS matching `.nvmrc`).
- Copy **only** what you need (not the whole monorepo `node_modules` from a
  developer PC if architectures differ):

```powershell
cd C:\POS\backend
pnpm install --prod
pnpm build   # still needs devDependencies once; or build on CI and copy dist/
```

Practical store layout:

```
C:\POS\
  backend\     dist\, node_modules\, .env, data\
  web\         .next\, node_modules\, package.json
  installers\  POS-Terminal-setup.exe, Price-Check-setup.exe, *.apk
```

## 5. Production checklist

- [ ] `GET http://<server>:3001/api/health` from a till PC
- [ ] HQ login works from a browser
- [ ] CORS includes the till EXE origin and HQ URL
- [ ] `data\` is on a disk that is backed up
- [ ] Services set to **Automatic** start
- [ ] Windows Firewall rules for 3000/3001
- [ ] Till codes issued in HQ **Setup → Others → Till**
- [ ] First-run till activation tested on a clean PC

## 6. Linux / Docker (optional)

The same API is a Node HTTP server. A typical systemd unit:

```ini
[Service]
WorkingDirectory=/opt/pos/backend
ExecStart=/usr/bin/node dist/main.js
Environment=PORT=3001
Restart=always
```

There is no first-party Docker image in this repo yet; add one when you
standardise cloud hosting.
