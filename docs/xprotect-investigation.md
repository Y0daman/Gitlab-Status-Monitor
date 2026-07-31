# XProtect Investigation

Status of the XProtect investigation after the Electron 43 modernization.

## What was done

1. Upgraded Electron from 31 (EOL, Chromium 126) to 43.2.0 (current stable,
   Chromium 150).
2. Built a completely fresh release (0.1.22, arm64).
3. Installed the build into `/Applications/GitLab Status Monitor.app`.
4. Launched the app and checked unified logs for XProtect, malware, and
   Gatekeeper events.

## Findings

- The app launches and runs normally after the upgrade.
- No XProtect, malware, or Gatekeeper events were recorded in the unified log
  during launch.
- The only rejected checks were Gatekeeper policy (`spctl -a -vv`) and
  `codesign --verify --deep --strict`, which is **expected** because the build
  is unsigned (ad-hoc linker signature only). Signing is intentionally deferred
  to a future task; see `docs/macos-signing.md`.

## Conclusion

The most likely XProtect trigger - the outdated Electron 31 runtime (Chromium
126, end-of-life since 2025) - has been removed. No runtime component in the
Electron 43 build was flagged.

A definitive end-to-end confirmation that no XProtect detection remains
requires a signed and notarized build, because an unsigned app cannot pass
Gatekeeper checks regardless of XProtect state. This is the recommended next
step once a Developer ID certificate is available.
