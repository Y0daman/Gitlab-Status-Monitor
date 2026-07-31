# macOS Signing and Notarization

This document describes how macOS builds of GitLab Status Monitor are signed and
notarized. The build configuration and CI workflow are implemented and "ready to
go"; actual signing/notarization activates as soon as Apple credentials are
provided. **No Apple credentials or certificate material are stored anywhere in
this repository.**

## Current state

- Signing configuration is implemented in `package.json`:
  - `mac.hardenedRuntime: true` (hardened runtime, required for notarization)
  - `mac.entitlements` / `mac.entitlementsInherit` ->
    `build/entitlements.mac.plist`
  - `mac.notarize: true` (auto-runs only after a successful signed build)
- The GitHub release workflow (`.github/workflows/release.yml`) imports signing
  certificates and notarization credentials from secrets. When the secrets are
  absent, the build degrades gracefully to an **unsigned** build (notarization
  is skipped with a warning).
- Without a valid identity in the keychain or `CSC_LINK`, local builds remain
  unsigned and emit the expected "missing Developer ID certificate" warning.
- `appId` is `se.jbitlabs.gitlab-status-monitor`.
- The app is packaged with ASAR enabled and uses a custom icon set.

## Required certificates and credentials

### 1. Developer ID Application certificate (signs the .app)

- An Apple Developer account with a **Developer ID Application** certificate.
- Locally: install the certificate in the keychain and electron-builder
  discovers it automatically during `npm run build:mac`.
- In CI: store the certificate as a base64-encoded `.p12` in the
  `CSC_LINK` secret, and its password in `CSC_KEY_PASSWORD`.

### 2. Developer ID Installer certificate (signs the .pkg)

- Optional but recommended if you distribute the `.pkg`.
- In CI: store as base64-encoded `.p12` in the `CSC_INSTALLER_LINK` secret with
  its password in `CSC_INSTALLER_KEY_PASSWORD`.
- Without it the `.pkg` is unsigned, and its notarization will be rejected by
  Apple. If you only have the Application certificate, build the DMG only.

### 3. Notarization credentials

- One of the following sets, stored as GitHub Actions secrets:
  - `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`
  - or an App Store Connect API key: `APPLE_API_KEY`,
    `APPLE_API_KEY_ID`, `APPLE_API_ISSUER`

### 4. Entitlements (`build/entitlements.mac.plist`)

```xml
<key>com.apple.security.cs.allow-jit</key>
<true/>
<key>com.apple.security.cs.allow-unsigned-executable-memory</key>
<true/>
<key>com.apple.security.cs.disable-library-validation</key>
<true/>
```

These are the standard electron-builder hardened runtime entitlements. They are
required for the V8 JIT and to prevent library-validation launch failures under
hardened runtime.

The renderer `sandbox: true` in `webPreferences` is Electron's renderer sandbox
and is unrelated to the macOS App Sandbox entitlement, which is **not** enabled.

## CI secrets summary

Add these secrets to the GitHub repository (Settings -> Secrets and variables ->
Actions):

| Secret | Purpose | Required |
| ------ | ------- | -------- |
| `CSC_LINK` | Base64 `.p12` of the Developer ID Application cert | for signed .app |
| `CSC_KEY_PASSWORD` | Password for `CSC_LINK` | for signed .app |
| `CSC_INSTALLER_LINK` | Base64 `.p12` of the Developer ID Installer cert | for signed .pkg |
| `CSC_INSTALLER_KEY_PASSWORD` | Password for `CSC_INSTALLER_LINK` | for signed .pkg |
| `APPLE_ID` | Apple ID used for notarization | for notarization |
| `APPLE_APP_SPECIFIC_PASSWORD` | App-specific password for `APPLE_ID` | for notarization |
| `APPLE_TEAM_ID` | Team ID of the Apple Developer account | for notarization |

## Verification

After a signed+notarized build:

- `spctl -a -vv "/Applications/GitLab Status Monitor.app"`
- `codesign --verify --deep --strict --verbose=4 "/Applications/GitLab Status Monitor.app"`
- `xcrun stapler validate "/Applications/GitLab Status Monitor.app"`

No Apple credentials, secrets, or certificate material belong in this
repository at any point.
