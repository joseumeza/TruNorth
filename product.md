# TruNorth — Product Context (`product.md`)

> **Living implementation ledger.** This file is the single high-level, always-current
> picture of **what actually exists in `TruNorthProject/` right now** — files, methods,
> and functionality. It is the practical counterpart to the design intent in
> [`TruNorthTechnicalSpecification.md`](./TruNorthTechnicalSpecification.md).

---

## 0. How to use and maintain this file (read before editing)

These rules exist so `product.md` stays trustworthy and consistent across every pull request.

1. **This file describes reality, not intent.** The technical specification says what the
   product *should* be; `product.md` records what has *actually been built*. It is an
   **echo of the spec, filtered down to implemented code only.** If it isn't in the repo
   and working, it does not get a "done" description here.

2. **Update it on every pull request.** Any PR that adds, removes, or changes a file,
   method, or behavior in `TruNorthProject/` must update the matching section here in the
   same PR. Treat an out-of-date `product.md` as a broken build.

3. **It grows as the project grows.** Start minimal. As real code lands, replace
   `⬜ Not implemented` placeholders with concise descriptions of the file, its exported
   methods/functions, and what they do. Never delete a section just because it's empty —
   an empty section is a truthful signal that nothing is built there yet.

4. **Keep entries short and factual.** For each implemented file, capture: its path,
   its purpose in one line, and its key exports (functions/classes/methods) with a
   one-line description each. No design rationale, no future plans — those live in the
   spec and in ADRs (`TruNorthProject/docs/adr/`).

5. **Offload detail to context files when an entry gets long.** When a file's description,
   its method list, or a subsystem's explanation becomes too large or complex to sit
   inline here (rule of thumb: more than ~15 lines, or needs diagrams/tables/deep
   walkthroughs), move that detail into a dedicated file under
   [`TruNorthContextFiles/`](./TruNorthContextFiles/) and **link to it** from the inline
   entry. Keep only a one-line summary + the link in `product.md`.
   - Naming: `TruNorthContextFiles/<area>-<subject>.md`
     (e.g. `engine-scene-lifecycle.md`, `safety-output-sanitizer.md`, `api-companion.md`).
   - The context file should state which source file(s) it documents at the top.

6. **Mirror the real folder structure.** Section 2 must always reflect the actual
   directory tree of `TruNorthProject/`. When folders are added/removed, update it.

7. **Status legend** (use these consistently):
   - `⬜ Not implemented` — folder/file exists but is empty scaffolding, or doesn't exist yet.
   - `🟨 Partial` — some functionality exists; note what's missing.
   - `✅ Implemented` — built and working; describe methods/functionality.

8. **Spec drift note.** The build-ready spec lives in
   `TruNorthTechnicalSpecification.md` (v3.0). An older draft referred to as
   *"TruNorth Master Spec"* is its upstream source. When this file and the spec disagree
   about what exists, **this file wins for "what is built"; the spec wins for "what is intended."**

---

## 1. Snapshot

| Field | Value |
|---|---|
| Product | TruNorth — choice-driven social-emotional learning (SEL) narrative for ages 5–15 |
| Project root | `TruNorthProject/` |
| Spec source of truth | `TruNorthTechnicalSpecification.md` (v3.0, build-ready) |
| Overall implementation status | **⬜ Scaffolding only** — full folder tree exists; all source, content, schema, and doc files are currently empty (0 bytes). No functionality implemented yet. |
| Last updated | 2026-07-01 |

---

## 2. Folder structure (actual `TruNorthProject/` tree)

```
TruNorthProject/
├── api/                       # Serverless functions (Claude proxy, health, progress)
│   ├── auth/                  # (empty)
│   ├── companion/route.ts     # ⬜ AI companion proxy endpoint
│   ├── health/route.ts        # ⬜ Health-check endpoint
│   └── progress/[childId].ts  # ⬜ [EXT] Remote progress endpoint
├── assets-src/                # Source art & provenance (pre-build)
│   ├── art-style-guide.md     # ⬜
│   ├── manifest.yaml          # ⬜ Source asset manifest
│   └── provenance-ledger.csv  # ⬜ Asset provenance/licensing ledger
├── content/                   # Game content, schemas, rubrics
│   ├── chapters/ch1/          # ⬜ Chapter 1 scene data
│   ├── chapters/ch2/          # ⬜ Chapter 2 scene data
│   ├── demo/showcase.bundle.json      # ⬜ Offline demo bundle
│   ├── fallbacks/companion-fallbacks.json  # ⬜ Companion fallback lines
│   ├── rubrics/               # ⬜ [EXT] SME-supplied scoring rubrics
│   └── schema/                # ⬜ JSON schemas (scene, game-state, decision-point, companion-response)
├── docs/                      # Runbooks, ADRs, privacy docs
│   ├── adr/                   # ⬜ Architecture Decision Records
│   ├── privacy/               # ⬜ Privacy documentation
│   ├── demo-runbook.md        # ⬜
│   └── incident-response.md   # ⬜
├── public/                    # Built static assets served to browser
│   └── assets/                # audio/ backgrounds/ characters/ fx/ ui/ + manifest.json  (⬜)
├── scripts/                   # Build/validation/audit tooling
│   ├── audit-bundle-size.ts   # ⬜
│   ├── build-asset-manifest.ts# ⬜
│   ├── red-team-suite.ts      # ⬜
│   └── validate-content.ts    # ⬜
├── src/                       # Application source
│   ├── main.ts                # ⬜ App entry point
│   ├── audio/AudioManager.ts  # ⬜ Audio & feedback
│   ├── companion/             # ⬜ Companion client (input freeze, thinking cue)
│   ├── engine/                # ⬜ Scene engine, graph, resolver, movement, collision, residue
│   ├── input/                 # ⬜ Keyboard/mouse input
│   ├── render/                # ⬜ DOM/Canvas rendering
│   ├── safety/OutputSanitizer.ts  # ⬜ Output safety sanitization
│   ├── store/                 # ⬜ ProgressStore (local MVP / remote EXT)
│   ├── types/                 # ⬜ Shared TypeScript types
│   └── ui/                    # ⬜ HUD, overlays, parent gate
└── tests/                     # unit/ integration/ e2e/ red-team/  (⬜)
```

> Update this tree whenever directories or top-level files change.

---

## 3. Implemented components

> As real code lands, document it here. Each subsystem gets a subsection. Keep inline
> entries short; link out to `TruNorthContextFiles/` when detail grows (see rule 5).
> **Nothing below is implemented yet** — all entries are placeholders reflecting the
> current empty scaffolding.

### 3.1 Application entry (`src/main.ts`)
⬜ Not implemented.

### 3.2 Scene engine (`src/engine/`)
⬜ Not implemented. *(Planned modules: `SceneEngine`, `SceneGraph`, `DecisionResolver`,
`MovementController`, `CollisionSystem`, `EmotionalResidue` — see spec §5.)*

### 3.3 Rendering (`src/render/`)
⬜ Not implemented.

### 3.4 Input (`src/input/`)
⬜ Not implemented.

### 3.5 UI & parent surfaces (`src/ui/`)
⬜ Not implemented.

### 3.6 AI companion client (`src/companion/`)
⬜ Not implemented.

### 3.7 Safety — output sanitizer (`src/safety/OutputSanitizer.ts`)
⬜ Not implemented.

### 3.8 Progress store (`src/store/`)
⬜ Not implemented.

### 3.9 Audio (`src/audio/AudioManager.ts`)
⬜ Not implemented.

### 3.10 Shared types (`src/types/`)
⬜ Not implemented.

### 3.11 Serverless API (`api/`)
⬜ Not implemented. *(Endpoints: `companion/route.ts`, `health/route.ts`,
`progress/[childId].ts` [EXT].)*

### 3.12 Content & schemas (`content/`)
⬜ Not implemented. *(Schemas, chapter scenes, demo bundle, fallbacks.)*

### 3.13 Assets (`assets-src/`, `public/assets/`)
⬜ Not implemented.

### 3.14 Build & tooling scripts (`scripts/`)
⬜ Not implemented. *(`validate-content`, `build-asset-manifest`, `red-team-suite`,
`audit-bundle-size`.)*

### 3.15 Tests (`tests/`)
⬜ Not implemented. *(unit / integration / e2e / red-team.)*

---

## 4. Context files index (`TruNorthContextFiles/`)

Detailed, offloaded documentation lives here and is linked from the sections above.
None yet — this table grows as subsystems become complex enough to warrant their own file.

| Context file | Documents | Summary |
|---|---|---|
| _(none yet)_ | — | — |
