# GitHub Releases (yes) and Packages (no)

## Releases — use these

**GitHub Releases** is where this product is published: compiled UI/API folders
and, after a successful tag build, the native Windows installers.

Create a release by tagging `main` (example: `v0.1.0`):

```powershell
cd C:\Users\DELL\Desktop\POS
git checkout main
git pull
git tag -a v0.1.0 -m "POS 0.1.0"
git push origin v0.1.0
```

Two workflows run for that tag:

1. [`release.yml`](../../.github/workflows/release.yml) builds `backend`, `web`,
   `pos`, `price-check`, creates the Release, and attaches
   `pos-ui-web.zip`, `price-check-ui-web.zip`, `pos-api-dist.zip`.
2. [`native-installers.yml`](../../.github/workflows/native-installers.yml)
   builds Windows NSIS + MSI installers for `pos`, `price-check`, and
   `label-studio`, then attaches them to the same Release as:
   `pos-terminal-setup.exe`, `pos-terminal.msi`, `price-check-setup.exe`,
   `price-check.msi`, `label-studio-setup.exe`, `label-studio.msi`.

They share a concurrency group so they cannot race to create/update the Release.
If one workflow fails, its assets are missing — do not claim the installer is
available until both jobs are green. See [release-ci.md](release-ci.md) for the
full asset table and the manual Android path (`pos-terminal.apk`, etc.).

Then open <https://github.com/Akintomiwa200/pos/releases/latest>. The download
page links to that URL plus `/download/<asset>`; a missing asset returns GitHub's
404 page.

To replace an asset after a manual local build (see [windows-exe.md](windows-exe.md)):

```powershell
gh release upload v0.1.0 "pos\src-tauri\target\release\bundle\nsis\POS Terminal_0.1.0_x64-setup.exe" --clobber
```

Use the predictable names from [release-ci.md](release-ci.md) if you want the
download-page links to start resolving:

```powershell
gh release upload v0.1.0 "path\to\pos-terminal-setup.exe" --clobber
```

The CI installers are **unsigned**; local files signed with your own certificate
can overwrite them with `--clobber`. Android APK/AAB appear only once an Android
project is committed; they are then built by the tag workflow (or by manual
dispatch); see [android-apk.md](android-apk.md).

## Packages — do not publish

**GitHub Packages** is for libraries (npm, Docker, Maven) that other projects
`install`. This repo is a **store product** (till, HQ, API), not a package
other apps should depend on.

Do **not** run `npm publish` or enable npm on GitHub Packages for `pos`,
`web`, `backend`, or `price-check`. Those `package.json` files are `"private":
true` on purpose.

If you later ship the API as a **container**, that image can go to GitHub
Container Registry (`ghcr.io`). That is optional and not required to use
Releases.
