# Signing and release

Unsigned Windows EXEs and debug Android APKs are fine for **internal testing**.
Stores, domain-joined PCs, and Google Play need **signed** artifacts.

**Release CI does not sign anything.** No certificate or keystore secret is used
by the workflows, so every EXE/MSI attached to a tag is unsigned and every
APK/AAB from the manual Android job is an unsigned sideload build. Nothing is
notarised (no macOS artifacts are produced). See [release-ci.md](release-ci.md).

## Windows (Authenticode)

Without a signature, SmartScreen shows “Windows protected your PC”.

1. Obtain an **Authenticode** certificate (OV or EV) as a `.pfx`.
2. After `pnpm exec tauri build --bundles nsis,msi`, sign the NSIS setup (and the
   inner `.exe` if your CA requires it):

```powershell
signtool sign /fd SHA256 /tr http://timestamp.digicert.com /td SHA256 /f store.pfx /p <pfx-password> `
  ".\src-tauri\target\release\bundle\nsis\POS Terminal_0.1.0_x64-setup.exe"
```

`signtool` ships with the Windows SDK. Tauri can also sign during bundle if you
set certificate env vars; see [Tauri Windows installer](https://v2.tauri.app/distribute/windows-installer/).

Keep the `.pfx` **off git**. Use CI secrets.

## Android (keystore)

Create a keystore **once** and back it up. Losing it means you cannot update the
Play listing.

```powershell
keytool -genkey -v -keystore pos-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias pos
```

For Gradle, Tauri reads `src-tauri/gen/android/keystore.properties` (filename
may be `key.properties` depending on template):

```properties
storeFile=C:\\secure\\pos-release.jks
storePassword=********
keyAlias=pos
keyPassword=********
```

Do not commit the JKS or passwords. Play Console needs the **same** key for
every AAB you upload.

Debug APKs from `tauri android dev` use a debug key and are not for Play.

## Version numbers

Keep these in lockstep when you cut a release:

- `pos/package.json` / `price-check/package.json` `"version"`
- `src-tauri/tauri.conf.json` `"version"`
- `src-tauri/Cargo.toml` `version`
- Android `versionCode` (integer, must **increase** every Play upload)

Then tag git: `v0.1.1`.

## What to attach to a GitHub Release

- `pos-terminal-setup.exe` / `pos-terminal.msi` (signed)
- `price-check-setup.exe` / `price-check.msi` (signed)
- `label-studio-setup.exe` / `label-studio.msi` (signed, if shipped)
- `pos-terminal.apk` (internal) / `pos-terminal.aab` (Play, signed with your key)
- `price-check.apk` / `price-check.aab` (same rule)
- Notes: API version, required `VITE_API_URL` / LAN IP, till activation reminder

CI already uploads unsigned assets with those names. Use `gh release upload ...
--clobber` to replace them with signed files; the `/download` links will then
point at the signed versions.

Do not attach `backend/data`, `.env`, or till **session** tokens.
