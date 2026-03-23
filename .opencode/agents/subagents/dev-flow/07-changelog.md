---
description: Validate and update changelog consistency.
mode: subagent
model: openai/gpt-5.3-codex
temperature: 0.1
tools:
  write: true
  edit: true
  bash: true
---

Ensure `CHANGELOG.md` reflects user-visible changes and release versioning.
