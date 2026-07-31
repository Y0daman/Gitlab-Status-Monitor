# macOS Signing and Notarization - Prerequisites and Plan

This document describes what is required to sign and notarize the macOS builds
of GitLab Status Monitor. It is **documentation only** - no signing is
implemented, and no Apple credentials are stored anywhere in this repository.

## Current state

- macOS builds are currently produced **unsigned** and pass the "missing
  Developer ID certificate" warning expected during packaging.
- `appId` is `se.jbitlabs.gitlab-status-monitor`.
- The app is packaged with ASAR enabled and uses a custom icon set.

## What will be required later

### 1. Developer ID Application certificate

- An Apple Developer account with a **Developer ID Application** certificate.
- After the certificate is installed in the machine's keychain, electron-builder
  discovers it automatically during `npm run build:mac` (it reads the signing
  identity from the keychain, so no credentials are committed to the repo).
- Recommended: configure `CSC_LINK` and `CSC_KEY_PASSWORD` only in CI secrets if
  building on a runner without the certificate in its keychain.

### 2. Hardened Runtime

- Enable via electron-builder `mac.hardenedRuntime: true`.
- Required for notarization. The app has no JIT/unsafe runtime needs, so no
  exceptions should be required beyond the standard ones.

### 3. Entitlements

- A minimal entitlements file (e.g. `build/entitlements.mac.plist`) with:
  - `com.apple.security.cs.allow-jit` is **not** needed (plain Node/Chromium app).
  - No network client entitlement is needed for outgoing HTTPS.
  - If file-access is required beyond the sandboxed app container, review
    `com.apple.security.files.user-selected.read-only` before enabling it.
- The app runs with `sandbox: true` in the renderer webPreferences; this is
  Electron's renderer sandbox, unrelated to the App Sandbox entitlements above.
  Enabling the macOS App Sandbox entitlement is optional and not required.

### 4. Notarization

- electron-builder uploads the build to Apple notary service when
  `notarize: true` is set (mac `notarize` option), using the credentials found
  in the keychain or provided via `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and
  `APPLE_TEAM_ID` environment variables.
- In CI these must be stored as GitHub Actions secrets, never committed.

### 5. Stapling

- After notarization, the ticket should be stapled to the DMG/PKG so offline
  installations pass Gatekeeper without a network check.
- electron-builder staples automatically when notarization succeeds.

## Suggested enablement plan (future task)

1. Obtain a Developer ID Application certificate and install it in the keychain.
2. Enable `hardenedRuntime: true` and add `build/entitlements.mac.plist`.
3. Set `notarize: true` with team ID; run `npm run build:mac` locally to verify.
4. Add signing/notarization secrets to the GitHub release workflow and enable
   them for tag builds only.
5. Verify with:
   - `spctl -a -vv "/Applications/GitLab Status Monitor.app"`
   - `codesign --verify --deep --strict --verbose=4 "/Applications/GitLab Status Monitor.app"`
   - `xcrun stapler validate "/Applications/GitLab Status Monitor.app"`

No Apple credentials, secrets, or certificate material belong in this
repository at any point.
