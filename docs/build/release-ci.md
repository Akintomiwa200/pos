# Native release CI

Pushing a `v*` tag builds the native installers and attaches them to the GitHub
Release for that tag. No repository secrets are required: the workflows use the
built-in `GITHUB_TOKEN`.

## Workflows involved

| Workflow | Trigger | What it does |
| --- | --- | --- |
| [`.github/workflows/release.yml`](../../.github/workflows/release.yml) | push of `v*` | Builds API/UI dist and creates the Release with `pos-ui-web.zip`, `price-check-ui-web.zip`, `pos-api-dist.zip` |
| [`.github/workflows/native-installers.yml`](../../.github/workflows/native-installers.yml) | push of `v*`, manual dispatch | Builds NSIS + MSI for `pos`, `price-check`, `label-studio`; builds Android APK + AAB only for apps with a committed Android project; attaches the files to the same Release |

Both workflows share the concurrency group `release-<ref>`, so one finishes
before the other updates the Release. The native workflow uses
`softprops/action-gh-release` with `overwrite_files: true`; re-running a tag
replaces same-named assets instead of creating a second Release.

## Cut a release

From a clean checkout of the commit you want to ship:

```powershell
cd C:\Users\DELL\Desktop\POS
git checkout main
git pull
git tag -a v0.1.0 -m "POS 0.1.0"
git push origin v0.1.0
```

Watch **Actions → Native installers** and **Actions → Release**. After both are
green, open <https://github.com/Akintomiwa200/pos/releases/latest>. The
`/download` page links to
`https://github.com/Akintomiwa200/pos/releases/latest/download/<asset>`; those
links return 404 until the corresponding asset has actually been uploaded.

Do not edit a published Release and expect CI to re-attach files. Push a new tag
(or re-run the workflow on the tag if you want to overwrite same-named assets).

## Predictable asset names

| App | Windows NSIS setup | Windows MSI |
| --- | --- | --- |
| Point of sale (`pos`) | `pos-terminal-setup.exe` | `pos-terminal.msi` |
| Price check (`price-check`) | `price-check-setup.exe` | `price-check.msi` |
| Label studio (`label-studio`) | `label-studio-setup.exe` | `label-studio.msi` |

| App | Android APK (manual) | Android AAB (manual) |
| --- | --- | --- |
| Point of sale (`pos`) | `pos-terminal.apk` | `pos-terminal.aab` |
| Price check (`price-check`) | `price-check.apk` | `price-check.aab` |

`price-check` has no committed `src-tauri/icons/` folder yet. During CI the
workflow generates it from `price-check/public/icon.svg` with
`pnpm exec tauri icon public/icon.svg` before building. Commit generated icons
locally if you want the source tree to be complete; see
[windows-exe.md](windows-exe.md).

## Android only builds when the project is committed

No app currently commits `src-tauri/gen/android/`, so today's tag builds skip
Android. Once the Gradle project exists, the same `v*` tag build produces and
attaches APK/AAB automatically. To set that up:

1. Complete the Android setup in [prerequisites.md](prerequisites.md).
2. For each app you want to ship, run `pnpm exec tauri android init` and commit
   the generated `src-tauri/gen/android/` directory.
3. Push a new `v*` tag (or run **Actions → Native installers → Run workflow** on
   that branch). Leave the manual `release_tag` input blank to get CI artifacts
   only, or enter an existing tag such as `v0.1.0` to attach `*.apk` / `*.aab`
   to that Release as well.

The job detects a missing Android project and skips its build steps with a
warning; it does not pretend an APK was produced. The SDK is installed by
`android-actions/setup-android@v3` and JDK 17 by `actions/setup-java@v4`.

## What the CI artifacts are NOT

- **Not Authenticode-signed.** Windows SmartScreen may warn. Sign locally with
  a certificate before wide deployment; see [signing.md](signing.md).
- **Not notarised.** There are no macOS artifacts in this workflow.
- **Not Play Store signed.** APK/AAB files are unsigned/sideload builds. Play
  Console requires your own upload key and an AAB built with that keystore.
- **Not guaranteed to reach the API.** Set `VITE_API_URL` before building, or
  use the price-check in-app API field. See [windows-exe.md](windows-exe.md)
  and [android-apk.md](android-apk.md).

## Where files land locally

See [README.md](README.md#one-line-map-of-output-files) for raw bundle paths.
CI copies them into a flat `release-assets/` folder, renames them to the names
above, uploads them as `native-<app>-windows` / `native-<app>-android` artifacts,
and then attaches them to the Release.
