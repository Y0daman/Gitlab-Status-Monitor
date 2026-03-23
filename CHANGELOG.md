# Changelog

All notable changes to this project will be documented in this file.

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
