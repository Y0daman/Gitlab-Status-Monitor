# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-08-01

### Changed
- Upgrade Electron 31 (EOL, Chromium 126) to Electron 43.2.0.
- Upgrade electron-builder 24 to 26.15.3.
- Enable ASAR packaging; the app contains no native modules so no unpacking is required.
- Replace the default Electron icon with a custom traffic-light icon set in `build/`.
- Set bundle identifier to `se.jbitlabs.gitlab-status-monitor`.

### Security
- 16 npm audit findings (1 critical, 14 high, 1 low) reduced to 0.
- Enable renderer sandbox and add a Content-Security-Policy for the dashboard.
- Deny all web permission requests.
- Stop sending the GitLab API token to the renderer process.

### Build
- Route npm build scripts through `scripts/build-staged.sh` to work around
  electron-builder 26 failing on ExFAT/external volumes that create `._*`
  AppleDouble sidecar files.

### Docs
- Add `docs/macos-signing.md` describing Developer ID signing, notarization,
  and stapling prerequisites (implementation intentionally deferred).

## [0.1.0] - 2026-03-23

### Added
- Initial Electron-based tray app architecture for macOS/Windows/Linux.
- Aggregated traffic light status in tray icon.
- Expandable tray menu with per-project/per-branch statuses.
- Dashboard UI for configuration and live pipeline status table.
- GitLab polling for latest branch pipeline via GitLab API.
- Config persistence in user data directory.
- Token support from saved app config and environment variables.
- Build and packaging scripts with Electron Builder for DMG, NSIS, AppImage, and DEB.
- Unit tests for status logic and config normalization.
- Project planning docs: `MILESTONES.md`, `TODO.md`, and `CHANGELOG.md`.
