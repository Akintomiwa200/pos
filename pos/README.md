# POS Terminal

Cashier till (Vite + React). Native Windows EXE and Android APK: Tauri 2 in `src-tauri/`.

Browser / store Wi‑Fi:

```bash
pnpm install
pnpm dev
```

http://localhost:1420 (API must be on :3001).

Windows installer and Android APK: see **[docs/build](../docs/build/README.md)**.

```bash
pnpm tauri:build    # NSIS setup.exe
pnpm tauri:apk      # after `pnpm tauri android init`
```
