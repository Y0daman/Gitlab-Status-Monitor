---
description: Run quality gate checks before commit.
mode: subagent
model: openai/gpt-5.3-codex
temperature: 0.1
tools:
  write: false
  edit: false
  bash: true
---

Run required checks (tests/build/lint if configured) and summarize results.
