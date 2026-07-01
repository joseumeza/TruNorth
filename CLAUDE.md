# TruNorth — Claude Code project instructions

These instructions apply to every Claude Code session in this repository.

## Golden rule: keep `product.md` in sync

[`product.md`](./product.md) is the living, always-current record of **what is actually
implemented** in `TruNorthProject/`. It is an echo of
[`TruNorthTechnicalSpecification.md`](./TruNorthTechnicalSpecification.md), filtered down
to real, working code.

**Whenever you add, remove, rename, or change the behavior of a file, method, function, or
subsystem under `TruNorthProject/`, you MUST update `product.md` in the same change set.**

Do this as part of the task — not as an afterthought and not in a separate PR. A code
change without a matching `product.md` update is incomplete.

### What to update

1. **Section 2 (Folder structure)** — if you added/removed/renamed a directory or top-level file.
2. **Section 3 (Implemented components)** — for the subsystem you touched:
   - Change the status marker: `⬜ Not implemented` → `🟨 Partial` → `✅ Implemented`.
   - List the file's key exports (classes/functions/methods), each with a one-line description of what it does.
   - Keep it factual and short — *what exists*, not *why* or *what's planned* (that lives in the spec / ADRs).
3. **Section 4 (Context files index)** — if you offloaded detail (see next rule).

### When to offload to `TruNorthContextFiles/`

If a file's or subsystem's description would exceed **~15 lines**, or needs tables,
diagrams, or a deep walkthrough, do **not** bloat `product.md`. Instead:

- Create `TruNorthContextFiles/<area>-<subject>.md` (e.g. `engine-scene-lifecycle.md`).
- At the top of that file, state which source file(s) it documents.
- In `product.md`, leave only a **one-line summary + a link** to the context file, and add
  a row to the Section 4 index table.

### Status legend (use consistently)

- `⬜ Not implemented` — scaffolding only / does not exist yet.
- `🟨 Partial` — some functionality exists; note what's missing.
- `✅ Implemented` — built and working; describe methods/functionality.

### Source-of-truth precedence

- For **"what is built"** → `product.md` wins.
- For **"what is intended"** → `TruNorthTechnicalSpecification.md` (v3.0) wins.
- The spec is derived from an upstream *"TruNorth Master Spec"* draft; the technical
  specification is the build-ready authority. If they conflict on child safety, privacy,
  or data collection, escalate — do not silently pick one.

## Before you finish a task

Run this self-check and state the result to the user:

- [ ] Did I change any file under `TruNorthProject/`? If yes → did I update `product.md`?
- [ ] Is Section 2's folder tree still accurate?
- [ ] Did any entry grow past ~15 lines and need an offload to `TruNorthContextFiles/`?

If a change genuinely does **not** affect implemented behavior (e.g. a typo in a comment),
say so explicitly rather than skipping the check silently.
