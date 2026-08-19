# GitHub Releases (yes) and Packages (no)

## Releases — use these

**GitHub Releases** is where this product is published: source zips, compiled
UI/API folders, and later the till **setup.exe** and price-check **APK**.

Create a release by tagging `main` (example: `v0.1.0`):

```powershell
cd C:\Users\DELL\Desktop\POS
git checkout main
git pull
git tag -a v0.1.0 -m "POS 0.1.0"
git push origin v0.1.0
```

The [Release workflow](../../.github/workflows/release.yml) runs on `v*` tags
and:

1. Builds `backend`, `web`, `pos`, and `price-check`
2. Opens a GitHub Release for that tag
3. Uploads `pos-ui-web.zip`, `price-check-ui-web.zip`, and `pos-api-dist.zip`

Then open **https://github.com/Akintomiwa200/pos/releases**.

To attach a Windows installer after you build it locally (see
[windows-exe.md](windows-exe.md)):

```powershell
gh release upload v0.1.0 "pos\src-tauri\target\release\bundle\nsis\POS Terminal_0.1.0_x64-setup.exe"
gh release upload v0.1.0 "price-check\src-tauri\target\release\bundle\nsis\Price Check_0.1.0_x64-setup.exe"
```

Same idea for `*.apk` from [android-apk.md](android-apk.md).

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
