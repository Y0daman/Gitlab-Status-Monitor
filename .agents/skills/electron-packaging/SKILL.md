---
name: electron-packaging
description: Use when working on cross-platform builds, installers, signing prerequisites, and release artifacts.
---

# Electron Packaging

## Summary

Build and package installers for macOS, Windows, and Linux using Electron Builder.

## Expected Inputs / Files

- `package.json`
- `scripts/build-all.sh`
- `scripts/build-all.ps1`
- `README.md`

## Rules / Constraints

- Keep build targets explicit per platform.
- Do not require code signing for local development builds.
- Run tests before packaging in helper scripts.

## Workflow Checklist

1. Validate package metadata and builder targets.
2. Run `npm test`.
3. Run `npm run build:<platform>` or `npm run build`.
4. Verify output artifacts in dist/release folders.
