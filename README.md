# GitLab Status Monitor

GitLab Status Monitor is a lightweight tray/status-menu desktop app for macOS, Windows, and Linux.

It monitors one or multiple GitLab projects and branches, then displays a traffic-light status:
- `green` for successful pipelines
- `yellow` for running/pending pipelines
- `red` for failed/canceled pipelines
- `gray` when status is unknown/no pipeline

## Core behavior

- Runs in tray/status menu with an aggregated traffic light.
- Optional expanded tray mode shows one entry per configured project branch.
- Dashboard window shows:
  - project name and project ID for configured entries
  - all configured branches
  - latest pipeline state per branch
  - ongoing pipelines marker
  - API errors (if any)
- Supports add/update/remove for monitored projects.
- Supports branch selection from dropdown menus loaded directly from GitLab.
- Supports monitoring the same project on multiple branches at the same time.
- Supports a saved token and environment fallback (`TOKEN` or `GITLAB_TOKEN`) and displays token source state.

## Tech stack

- **Electron + Node.js** for cross-platform tray and desktop packaging.
- **Electron Builder** for installers:
  - macOS: DMG
  - Windows: NSIS
  - Linux: AppImage + DEB

## Requirements

- Node.js 20+ (Node 22 recommended)
- npm 10+

## Run locally

```bash
npm install
npm run start
```

## Configuration

The app persists config in Electron `userData` as `config.json`.

Defaults:
- API base URL: `https://gitlab.com/api/v4`
- Poll interval: `60` seconds (minimum `15`)

Project id format:
- Numeric GitLab project ID, or
- Path format `group/project` (URL-encoded by the app)

Token resolution order:
1. Saved token in app config
2. `TOKEN` environment variable
3. `GITLAB_TOKEN` environment variable

## Testing

```bash
npm test
```

## Build and package

All targets:
```bash
npm run build
```

Per platform:
```bash
npm run build:mac
npm run build:win
npm run build:linux
```

Helper scripts:
- `scripts/build-all.sh`
- `scripts/build-all.ps1`

Note: helper scripts build installers for the current host OS. To produce all platform installers, run in CI with one runner per OS (macOS, Windows, Linux).

## Automated Releases

- GitHub Actions workflow: `.github/workflows/release.yml`
- On every push to `main`, it:
  - runs tests
  - builds platform installers on Linux/Windows/macOS
  - creates a prerelease with build artifacts
- The workflow uses `secrets.GITHUB_TOKEN` automatically.

## Troubleshooting

- If packaging fails with ASAR/offset errors on macOS external volumes, remove AppleDouble files and retry:
  - `find . -name '._*' -type f -delete`
- If git reports `non-monotonic index ... ._pack...idx`, remove sidecar files under `.git` and run `git fsck`.

## Project docs

- `MILESTONES.md` - milestone plan
- `TODO.md` - actionable task list
- `CHANGELOG.md` - release history

## Agents and skills structure

This repository includes an OpenCode-oriented structure similar to `ehorizon-provider`:

- `.agents/skills/registry.json`
- `.agents/skills/*/SKILL.md`
- `.opencode/package.json`
- `.opencode/.gitignore`
- `.opencode/agents/devflow.md`
- `.opencode/agents/review.md`
- `.opencode/agents/subagents/dev-flow/*.md`

These files are templates to standardize how automation agents and reusable skills are organized.
