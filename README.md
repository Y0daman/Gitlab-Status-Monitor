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
- Supports monitoring `latest` pipeline (across all branches) per project.
- Includes per-project branch dropdown in the list to immediately switch monitored branch.
- Includes startup option to auto-launch with OS login in packaged apps (macOS/Windows).
- Includes branch visualization tools: hierarchical branch tree and commit graph with branch/merge paths.
- Repository visualizations are separated into tabs: `Branch Tree` and `Commit Graph`.
- Repository Views use one shared project selector and color-code branch families for faster branching overview.
- In Repository Views you can choose the branch context (defaults to `main` or `master` when available) for graph/history loading.
- Commit Graph includes `Copy SVG` and `Download SVG` to export the exact rendered graph for troubleshooting.
- Dashboard is split into app tabs: `Main` (status and branch switching), `Configuration`, and `Repository Views`.
- Monitored project management is in `Configuration`; `Main` focuses on live status and direct branch switching from the status table.
- Supports a saved token and environment fallback (`TOKEN` or `GITLAB_TOKEN`) and displays token source state.

## Tech stack

- **Electron + Node.js** for cross-platform tray and desktop packaging.
- **Electron Builder** for installers:
  - macOS: DMG + PKG
  - Windows: NSIS
  - Linux: AppImage + DEB

Installer behavior:
- macOS PKG installs to `/Applications`.
- Windows NSIS installs into the system applications/programs list.
- Linux DEB installs into desktop application menus.

## Requirements

- Node.js 20+ (Node 22 LTS recommended)
- npm 10+
- Electron 43 and electron-builder 26 are managed as devDependencies.

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

Build versioning:
- Each build command auto-increments patch version in `package.json` (for example `0.1.0` -> `0.1.1`).

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

Build output:
- Installers and unpacked apps are written to `dist/`.

### App icons

App icons live in `build/` (electron-builder's default build resources directory):

- `build/icon.png` - 1024x1024 master PNG (Linux; source for other formats)
- `build/icon.icns` - macOS icon set (16/32/64/128/256/512/1024)
- `build/icon.ico` - Windows icon set (16/24/32/48/64/128/256)

To regenerate all formats from a new master `build/icon.png`:

```bash
magick build/icon.png build/icon.ico -define icon:auto-resize=16,24,32,48,64,128,256
```

For the macOS `.icns`, build an iconset and run `iconutil -c icns`.

### ExFAT / external volume note

When the repository lives on a volume without native extended-attribute support
(ExFAT, FAT, SMB with xattr store disabled), macOS writes `._*` AppleDouble
sidecar files for any file that carries xattrs (e.g. `com.apple.provenance`).
electron-builder 26 treats a `._app.asar` sidecar as an ASAR archive while
computing the ASAR integrity hash and fails with a
`The value of "offset" is out of range` RangeError.

The npm `build*` scripts route through `scripts/build-staged.sh`, which stages
the electron-builder output on an APFS volume and copies the finished artifacts
into `dist/`, avoiding the sidecar files entirely. No manual workaround is
needed on such volumes.

## Automated Releases

- `.github/workflows/auto-tag.yml` tags the next patch version on every push to `main`.
- `.github/workflows/release.yml` triggers on tags and manual dispatch and:
  - runs tests
  - builds platform installers on Linux/Windows/macOS
  - creates a GitHub release with build artifacts
- The workflow uses `secrets.GITHUB_TOKEN` automatically.

## Troubleshooting

- ASAR/offset failures on macOS external volumes are handled automatically by
  `scripts/build-staged.sh` (see "ExFAT / external volume note" above). The old
  `find . -name '._*' -type f -delete` workaround is no longer sufficient for
  electron-builder 26.
- If git reports `non-monotonic index ... ._pack...idx`, remove sidecar files under `.git` and run `git fsck`.

## macOS signing and notarization

Signing is intentionally not implemented yet. See `docs/macos-signing.md` for
the documented prerequisites and the step-by-step plan to enable Developer ID
signing, notarization, and stapling in a future task.

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
