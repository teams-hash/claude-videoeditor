---
name: qc
description: Quality-check a rendered video before delivery (measured QC, contact sheets, judgement checklist, scored report with timestamped fixes). Runs in the qc-reviewer agent.
argument-hint: "<rendered video path> [platform]"
disable-model-invocation: true
context: fork
agent: qc-reviewer
background: false
---

QC this render for delivery: $ARGUMENTS

The first argument is the video path (quote it if it has spaces); an optional second argument is the platform
(reels, tiktok, shorts, youtube, linkedin, x). Find its project if it has one, run the measured checks, look at the
sheets, score the checklist and return the report in your format.
