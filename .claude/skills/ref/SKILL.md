---
name: ref
description: Analyse a reference video into a studio breakdown (cached measured scan, contact sheets, breakdown.md with build instructions). Runs in the reference-analyst agent.
argument-hint: "<reference video path> [short slug]"
disable-model-invocation: true
context: fork
agent: reference-analyst
background: false
---

Analyse this reference video for the studio: $ARGUMENTS

The first argument is the video path (quote it if it has spaces); an optional second argument is the short slug for
`LIBRARY/references/<slug>/`. Follow your process: cached scan first, numbers before pictures, breakdown from the
template, register it, then return your short summary.
