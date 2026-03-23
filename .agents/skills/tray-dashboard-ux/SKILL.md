---
name: tray-dashboard-ux
description: Use when changing tray behavior, aggregated/per-project traffic lights, and dashboard data presentation.
---

# Tray Dashboard UX

## Summary

Ensure tray behavior and dashboard data are consistent, understandable, and fast to scan.

## Expected Inputs / Files

- `src/main.js`
- `src/preload.js`
- `src/renderer/index.html`
- `src/renderer/styles.css`
- `src/renderer/app.js`

## Rules / Constraints

- Tray icon reflects aggregated light only.
- Expanded tray mode lists each project + branch with light and ongoing marker.
- Dashboard shows latest state and API errors without crashing the app.
- Add/remove/update project actions should reflect immediately.

## Workflow Checklist

1. Confirm aggregate + expanded tray states.
2. Confirm dashboard table rendering for empty, success, running, failed, and error states.
3. Validate IPC request/response paths.
4. Verify mobile/narrow window behavior is readable.
