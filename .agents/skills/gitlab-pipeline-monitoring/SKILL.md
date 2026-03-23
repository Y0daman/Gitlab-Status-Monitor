---
name: gitlab-pipeline-monitoring
description: Use when implementing, debugging, or validating GitLab API polling and pipeline status mapping.
---

# GitLab Pipeline Monitoring

## Summary

Monitor latest pipeline per configured project branch and map state to traffic lights.

## Expected Inputs / Files

- `src/lib/gitlab.js`
- `src/lib/status.js`
- `src/main.js`
- `README.md`

## Rules / Constraints

- Use API base from config (`gitlab.apiBaseUrl`).
- Token resolution order: config token, `TOKEN`, `GITLAB_TOKEN`.
- Treat running/pending/created/preparing/waiting as ongoing.
- Aggregation priority: red > yellow > green > gray.

## Workflow Checklist

1. Validate project/branch config normalization.
2. Fetch latest pipeline per branch.
3. Map pipeline status to light color.
4. Build aggregated status and per-branch view.
5. Expose dashboard details and tray menu entries.
6. Add/update unit tests.

## Pitfalls

- Missing token can still work for public projects; show clear dashboard state.
- Project path IDs must be URL encoded.
- Keep polling interval bounded to avoid API abuse.
