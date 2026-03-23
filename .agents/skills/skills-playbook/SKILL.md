---
name: skills-playbook
description: Use when creating or refining project skills and deciding scope/ownership.
---

# Skills Playbook

Arguments:
- $ARGUMENTS: Optional focus area (scope, template, maintenance, naming).

## Purpose

Capture stable, reusable project knowledge so repeated work stays consistent.

## Add a Skill When

- A workflow repeats across features or bug fixes.
- Key rules are easy to forget (status mapping, API behavior, packaging caveats).
- The task spans multiple files and benefits from a checklist.

## Avoid Adding a Skill When

- The change is one-off or exploratory.
- Requirements are still volatile.
- The new skill duplicates existing scope.

## Skill Template

- YAML header: `name`, `description`
- Sections:
  - Summary
  - Expected Inputs / Files
  - Rules / Constraints
  - Workflow Checklist
  - Pitfalls
  - Output / Validation

## Registry Rules

- Register each skill in `.agents/skills/registry.json`.
- Keep registry `name` and YAML `name` exactly aligned.
- Use short, hyphenated names.
