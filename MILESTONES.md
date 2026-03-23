# Milestones

## M1 - Foundation (Done)
- Initialize Electron project skeleton and dependencies.
- Implement config persistence in `userData/config.json`.
- Add GitLab API polling for project branch pipelines.
- Add tray icon with aggregated traffic-light status.

## M2 - Usable MVP (Done)
- Add dashboard window with configuration forms.
- Support add/remove projects and branch selection.
- Show per-project/branch pipeline status and ongoing marker.
- Support token from app config and env vars (`TOKEN`, `GITLAB_TOKEN`).

## M3 - Quality and Packaging (In Progress)
- Add unit tests for status mapping and config behavior.
- Add cross-platform packaging scripts and Electron Builder targets.
- Add installable outputs for macOS/Windows/Linux.

## M4 - Hardening (Planned)
- Add startup-at-login option.
- Improve retry/backoff and API error visibility.
- Add optional notifications on status changes.
- Add optional self-managed GitLab TLS/custom CA guidance.
