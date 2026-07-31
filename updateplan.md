# GitLab Status Monitor – Modernization Plan

## Goal

Modernize the Electron application and remove technical debt before addressing macOS code signing and notarization.

The project currently builds successfully, but:

- Electron is outdated.
- electron-builder is outdated.
- npm reports multiple vulnerabilities.
- `asar` is disabled.
- Default Electron icon is used.
- macOS signing is skipped because no Developer ID certificate is installed.
- The application has recently been flagged by macOS XProtect. We want to eliminate outdated runtime components before investigating whether the issue persists.

**Important:**  
Do **not** implement Apple code signing or notarization in this task.

---

# General Requirements

- Preserve all existing functionality.
- Keep commits small and logical.
- Explain every configuration change.
- Prefer modern Electron APIs.
- Avoid introducing unnecessary dependencies.
- Remove obsolete configuration whenever possible.
- Do not add secrets.
- Do not require Apple credentials.
- Do not implement notarization yet.

---

# Phase 1 – Full Project Audit

Review the entire project.

Produce a report containing:

- Electron version
- electron-builder version
- Required Node.js version
- Direct dependencies
- Transitive dependencies
- Known CVEs
- Deprecated packages
- Outdated packages
- Unused dependencies
- Unused scripts
- Obsolete Electron configuration
- Build warnings
- Security concerns

Do **not** modify anything during this phase.

---

# Phase 2 – Upgrade Runtime

Upgrade the project to current stable releases.

At minimum:

- Electron
- electron-builder

Update all direct dependencies where stable versions exist.

Run:

```bash
npm install
npm outdated
npm audit
```

Resolve all non-breaking issues.

Avoid introducing breaking API changes.

---

# Phase 3 – Modernize Build Configuration

Review the complete Electron Builder configuration.

Improve where appropriate.

## Enable ASAR

Replace:

```json
"asar": false
```

with:

```json
"asar": true
```

Only unpack files that truly require unpacking by using:

```json
asarUnpack
```

if necessary.

---

## Review Build Configuration

Review and improve:

- appId
- productName
- files
- extraResources
- output directories
- build targets
- mac configuration
- Windows configuration
- Linux configuration

Simplify configuration where possible.

---

## Bundle Identifier

Replace

```text
com.example.gitlab-status-monitor
```

with

```text
se.jimmyahs.gitlab-status-monitor
```

unless a better namespace already exists.

---

## Application Icons

Replace the default Electron icon.

If icons are missing:

- create placeholder assets
- document all required icon sizes
- configure Electron Builder to use them

---

# Phase 4 – Dependency Cleanup

Remove:

- deprecated packages
- obsolete APIs
- unnecessary polyfills
- unused dependencies
- unused code

Ensure functionality remains unchanged.

---

# Phase 5 – Security Improvements

Run:

```bash
npm audit
```

Fix everything possible without introducing breaking changes.

Document any remaining issues.

---

# Phase 6 – Electron Best Practices

Review the application's security model.

Inspect:

- preload
- BrowserWindow configuration
- IPC
- contextIsolation
- sandbox
- nodeIntegration
- enableRemoteModule
- permission handling

Adopt current Electron security recommendations.

Do not break application behaviour.

---

# Phase 7 – Project Cleanup

Review the repository.

Clean up:

- README
- build scripts
- package.json
- npm scripts
- folder structure
- comments
- obsolete files

Improve maintainability.

---

# Phase 8 – Prepare for macOS Signing

Do **not** implement signing.

Instead prepare the project so signing can later be enabled easily.

Document what will later be required:

- Developer ID Application certificate
- Hardened Runtime
- Entitlements
- Notarization
- Stapling

No secrets.

No Apple credentials.

No implementation.

---

# Phase 9 – Validation

Verify that:

- npm install succeeds
- npm test passes
- application starts correctly
- Electron build succeeds
- DMG builds
- PKG builds
- Windows build still works
- Linux build still works

The only expected warning should be the missing Apple Developer ID certificate.

---

# Phase 10 – XProtect Investigation

After all upgrades have been completed:

1. Build a completely fresh release.
2. Install the new build.
3. Verify:

```bash
spctl -a -vv "/Applications/GitLab Status Monitor.app"
```

```bash
codesign --verify --deep --strict --verbose=4 "/Applications/GitLab Status Monitor.app"
```

If macOS still reports malware or XProtect blocks the application:

- identify which binary or framework is triggering detection
- determine whether the detection comes from:
  - Electron runtime
  - Node module
  - bundled JavaScript
  - embedded framework
- document findings

Do not implement workarounds that bypass macOS security.

---

# Deliverables

Provide:

1. Executive summary
2. Dependency changes
3. Security improvements
4. Build improvements
5. Configuration improvements
6. Remaining technical debt
7. Remaining security concerns
8. Recommended next steps
9. Suggested plan for enabling Developer ID signing and notarization in a future task

---

# Success Criteria

The project should:

- build cleanly
- use current supported Electron tooling
- have minimal technical debt
- have significantly fewer vulnerabilities
- follow current Electron best practices
- be ready for Apple Developer signing and notarization
- be in a good position to determine whether the original XProtect detection was caused by outdated runtime components or by another issue