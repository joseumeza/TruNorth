# TruNorth — Product Context (`product.md`)

> **Living implementation ledger.** This file is the single high-level, always-current
> picture of **what actually exists in `TruNorthProject/` right now** — files, methods,
> and functionality. It is the practical counterpart to the design intent in
> [`TruNorthTechnicalSpecification.md`](./TruNorthTechnicalSpecification.md).

---

## Team roles & task board

Each teammate has one active to-do. Tasks come from the current gaps in Section 3
(⬜ / 🟨 items and pending work). Check a task off only when the matching Section 3
entry is updated in the same change.

### Ermoni — Backend (Supabase: character files + scripts/dialogs)

- [ ] Stand up the Supabase project (Postgres + Auth + Storage, per spec §12 EXT stack
  and ADR-003) and store the content in it:
  - **Character SVG files** → a Supabase **Storage** bucket (e.g. `character-assets/`),
    one file per character × expression variant; the asset manifest then points at the
    bucket's CDN URLs instead of `public/assets/`.
  - **Scripts & dialogs** → a Postgres table with JSONB lines (see example below),
    mirroring the existing `content/` JSON so the scene schemas keep validating.
  - Note: spec left "Supabase vs Neon" open in ADR-003 — starting this work decides it;
    update ADR-003 status when the project is created.

  Example dialog storage shape:

  ```sql
  create table dialogs (
    id             text primary key,        -- 'ch2:w2:dp_robin_ladder'
    chapter_id     text not null,           -- 'ch2'
    scene_id       text not null,           -- 'w2'
    speaker        text not null,           -- 'robin' | 'companion' | 'narration'
    lines          jsonb not null,          -- ["Line one…", "Line two…"] in order
    approval_state text not null default 'draft',
    updated_at     timestamptz default now()
  );
  ```

### Gabby — Backend (dialog content model, supporting Ermoni)

- [ ] Support the Supabase work by owning **how and what the characters say**: define
  the dialog/script data model (fields, speaker set, line ordering, `approval_state`
  workflow), decide which existing `content/` scene and decision-point text migrates
  into the `dialogs` table, and review Ermoni's rows for tone/consistency.

### Daniel — Frontend (UI gameplay: grid collision + input & movement)

- [ ] Own the full movement stack end to end: make all collision resolve through the
  16×9 tile grid (`TileMap`) instead of character-vs-character AABB checks, **and**
  ensure arrow keys and WASD reliably move the character (key mapping, held-key
  polling, freeze/release, smooth axis-separated motion).
- **Files owned:** `src/engine/TileMap.ts`, `src/engine/CollisionSystem.ts`,
  `src/input/InputController.ts`, `src/engine/MovementController.ts`.

### Jose — Frontend (deployment)

- [ ] Deploy the app so users can play and test it: stand up a hosted environment
  (the `api/` functions target the Vercel Node runtime), configure env vars from
  `.env.example`, verify `api/health` and the companion proxy work in production,
  and share the test URL (demo mode: `?demo=1`) with the team.

### Vandy — Product management (keeping the project on track)

- [ ] Get SME review of all chapter content — everything is still `approvalState: "draft"` (Section 3.12).

### Ranya — Product management (keeping the project on track)

- [ ] Fill in SME/counsel contacts in `docs/incident-response.md` and source SME rubrics for the empty `content/rubrics/`.

### Madhu — Product management (keeping the project on track)

- [ ] Track milestones and cross-team dependencies (e.g. frontend store wiring is blocked by the backend progress endpoints); keep this board and `product.md` in sync each PR.

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
| Overall implementation status | **✅ MVP playable end-to-end.** Two chapters (Ch.1 meadow + Ch.2 showcase golden path W1→W4) as **Pokémon-style 3/4 top-down single-screen rooms** (tile collision, 4-direction avatar, y-sorted depth), scene engine, five-layer companion safety pipeline, offline demo mode, local persistence, onboarding, parent gate + trust screen, tests (57 unit/integration + 19 red-team + e2e golden path) all green. Art is **placeholder SVG** (not the frozen style). EXT items (remote store, parent dashboard, voice, enterprise) not built. |
| Toolchain | Node 22 (`.nvmrc`), Vite 6, TypeScript 5, Vitest 3, Playwright, Ajv, tsx — see ADR-001 for the Vite 6-vs-8 deviation |
| Quick test | `cd TruNorthProject && npm install && npm run demo` → http://localhost:4173/?demo=1 |
| Last updated | 2026-07-09 |

---

## 2. Folder structure (actual `TruNorthProject/` tree)

```
TruNorthProject/
├── api/                       # Serverless functions (Vercel Node runtime)
│   ├── _lib/                  # ✅ Shared companion pipeline (filters, prompt, validate, fallbacks, pipeline)
│   ├── auth/                  # ⬜ [EXT] parent auth (empty)
│   ├── companion/route.ts     # ✅ POST /api/companion proxy
│   ├── health/route.ts        # ✅ Health check
│   └── progress/[childId].ts  # 🟨 [EXT] stub returning 501
├── assets-src/                # ✅ manifest.yaml, provenance-ledger.csv, art-style-guide.md (placeholder era)
├── content/
│   ├── chapters/ch1/          # ✅ chapter.json, c1s1/c1s2 scenes, decision-points.json
│   ├── chapters/ch2/          # ✅ chapter.json, w1–w4 scenes (golden path), decision-points.json
│   ├── demo/showcase.bundle.json      # ✅ Canned companion responses (all dp × band)
│   ├── fallbacks/companion-fallbacks.json  # ✅ Global + per-dp fallback lines
│   ├── rubrics/               # ⬜ [EXT] SME-supplied rubrics (empty)
│   └── schema/                # ✅ scene / decision-point / game-state / companion-response JSON Schemas
├── docs/
│   ├── adr/                   # ✅ ADR-001…006
│   ├── privacy/data-classification.md  # ✅
│   ├── demo-runbook.md        # ✅
│   └── incident-response.md   # ✅ (skeleton; SME/counsel contacts TBD)
├── public/assets/             # ✅ Placeholder SVGs (backgrounds/characters/fx/ui) + generated manifest.json
├── scripts/                   # ✅ validate-content, build-asset-manifest, red-team-suite, audit-bundle-size
├── src/
│   ├── main.ts                # ✅ Boot + rAF game loop
│   ├── styles.css             # ✅ Viewport, HUD, child/parent palettes, a11y
│   ├── audio/AudioManager.ts  # ✅ WebAudio-synthesized SFX + global mute
│   ├── companion/             # ✅ CompanionClient (live), DemoCompanionClient, typedRubric
│   ├── content/               # ✅ ContentLibrary (glob-imported content), fallbackLines
│   ├── engine/                # ✅ SceneEngine, SceneGraph, DecisionResolver, MovementController,
│   │                          #    CollisionSystem, TileMap, EmotionalResidue
│   ├── input/InputController.ts   # ✅ Keyboard + freeze/release + pause
│   ├── render/                # ✅ Viewport, SceneRenderer, BubbleManager, ParticleSystem, AvatarSprite
│   ├── safety/OutputSanitizer.ts  # ✅ Client-side output sanitization
│   ├── store/                 # ✅ LocalProgressStore, DemoProgressStore, GameStateFactory
│   ├── types/index.ts         # ✅ Shared contracts + UI tokens + code gates
│   └── ui/                    # ✅ MeterHUD, ChoicePanel, ParentGate, TrustScreen, OnboardingFlow, Overlays
├── tests/
│   ├── unit/                  # ✅ 6 suites (resolver, graph, bubbles, store, collision, residue, safety)
│   ├── integration/           # ✅ pipeline + companion clients
│   ├── e2e/golden-path.spec.ts# ✅ Offline demo golden path (Playwright)
│   └── red-team/              # ✅ cases.json (19) + Vitest wrapper
├── index.html · vite.config.ts · tsconfig.json · playwright.config.ts
├── package.json · .nvmrc (22) · .env.example · .gitignore
```

> Update this tree whenever directories or top-level files change.

---

## 3. Implemented components

> Inline entries stay short; deep walkthroughs live in `TruNorthContextFiles/` (Section 4).

### 3.1 Application entry (`src/main.ts`)
✅ Implemented. Detects demo mode (`?demo` / `VITE_DEMO_MODE`), fetches the asset
manifest, wires stores/clients (demo → in-memory + canned; live → localStorage + proxy),
restores a save or runs onboarding (demo auto-profiles into ch2), starts `SceneEngine`
and the rAF loop. Boot walkthrough: [engine-runtime.md](./TruNorthContextFiles/engine-runtime.md).

### 3.2 Scene engine (`src/engine/`)
✅ Implemented — full lifecycle per spec §5.3; **scenes are Pokémon-style 3/4 top-down
single-screen rooms** (no scrolling); deep-dive in
[engine-runtime.md](./TruNorthContextFiles/engine-runtime.md).
- `SceneEngine` — orchestrator: scene load/transition (builds the room `TileMap` per scene),
  Tier A click zones / Tier B collision, decision → companion → consequence flow,
  repairs (walk-back + 3 gestures), fx mapping, meter juice, W4 3-tap climb (back pose,
  eased rise), chapter completion → celebration → parent gate → next chapter,
  distress overlay, pause, resume line, immediate auto-save.
- `SceneGraph` — `nextSceneId()` from consequences; `reachableFrom()` BFS (used by tests/CI).
- `DecisionResolver` — `resolveConsequence()`, `applyMeterDeltas()` (fill wraps to levels),
  `appendDecisionEvent()`, companion leveling at 2/4 strong choices.
- `TileMap` — 16×9 grid of 120 px collision tiles parsed from `scene.tileMap`
  (`'#'`/`'.'` rows): `isBlocked`, `blockedAt`, `boxBlocked`, `openRoom()` fallback.
- `MovementController` — smooth WASD/arrows at 420 px/s over the room's tile map;
  axis-separated collision (slides along walls); 4-direction `facing` (`up/down/left/right`).
- `CollisionSystem` — AABB helpers: `aabbOverlap`, `avatarBox` (feet region), `collectibleBox`.
- `EmotionalResidue` — per-chapter per-NPC `trusting/neutral/shaken`; nudges NPC default
  expressions; never blocks progress.

### 3.3 Rendering (`src/render/`)
✅ Implemented — details in [engine-runtime.md](./TruNorthContextFiles/engine-runtime.md).
- `Viewport` — 16:9 letterboxed 1920×1080 stage, uniform scale, 6 z-ordered layers
  (avatar shares the `characters` layer so world depth y-sorts).
- `SceneRenderer` — manifest-driven `<img>` sprites (feet-center anchors, per-sprite
  `z-index` from feet y for 3/4 depth), expression CSS states, worry-cloud variants,
  runtime-composed avatar (5×5 skin/hair inline SVG) with front/back/profile poses
  swapped by facing (`setAvatarPosition`) + `setAvatarClimbing` easing toggle.
- `BubbleManager` — anchored bubbles, char-by-char reveal + tap-to-complete, 120-char
  split sequencing, in-character thinking cue (300 ms), narration bar. Exports `splitBubbleText`.
- `ParticleSystem` — ≤12 rAF Bézier particles to the meter; disabled by reduced-motion.

### 3.4 Input (`src/input/InputController.ts`)
✅ Implemented. Key mapping (WASD/arrows) polled by the loop; ignores form fields;
`freeze()`/`release()` for §5.4 input freeze; Escape → pause callback.

### 3.5 UI & parent surfaces (`src/ui/`)
✅ Implemented.
- `MeterHUD` — meters (icon + animated fill, ARIA progressbar, numbers only for 11–15),
  brownie counter, demo pill, mute toggle, `meterAnchor()` for particles.
- `ChoicePanel` — choice cards + scoped typed field (age-gated), `pivotLockMs` lock,
  age-banded hit targets/fonts, keyboard operable.
- `ParentGate` — PIN (SHA-256 via `hashPin`) or math challenge; 3 fails → 45 s cooldown;
  grown-up palette; trust-screen link.
- `TrustScreen` — static plain-language safety/data summary (spec §13.3).
- `OnboardingFlow` — parent step (age band, optional PIN, consent summary) → companion
  picker + validated naming → 5×5 avatar → baseline strength seed.
- `Overlays` — celebration (recap + sparks), pause (resume/erase), repair gestures,
  walk-back banner, distress support surface.
- Not built: watch/co-play mode (spec §13.2) — ⬜.

### 3.6 AI companion client (`src/companion/`)
✅ Implemented — see [safety-companion-pipeline.md](./TruNorthContextFiles/safety-companion-pipeline.md).
- `CompanionClient` — POST `/api/companion`, 8 s timeout, in-character client fallback.
- `DemoCompanionClient` — zero-network bundle lookup `{scene}:{dp}:{band}`; local typed
  rubric; distress protocol enforced offline.
- `typedRubric.scoreTypedInput` — demo-mode heuristic (strong/partial/poor).

### 3.7 Safety — output sanitizer (`src/safety/OutputSanitizer.ts`)
✅ Implemented. `sanitize()`/`sanitizeAll()`: control-char strip, 360-char cap, banned
patterns (markup, links, clinical, PII-solicitation, secrecy) → approved substitute line.
All child-facing text renders via `textContent`.

### 3.8 Progress store (`src/store/`)
✅ Implemented (MVP scope).
- `LocalProgressStore` — `trunorth_save_v1` in localStorage; immediate saves; event log
  pruned to 200; corrupt-save tolerance; injectable storage for tests.
- `DemoProgressStore` — in-memory, reload = reset.
- `GameStateFactory.createInitialState()` — canonical GameState with all 7 meters +
  baseline-strength seed.
- `RemoteProgressStore` — ⬜ [EXT], not built (ADR-003).

### 3.9 Audio (`src/audio/AudioManager.ts`)
✅ Implemented. WebAudio-synthesized SFX (no files): pickup chime, harp swell (strong),
soft thud (poor), thinking bloop, celebration; lazy context; global mute; never the
sole feedback channel.

### 3.10 Shared types (`src/types/index.ts`)
✅ Implemented. All contracts from spec §9–§12 (GameState, Scene incl. `tileMap` rows,
DecisionPoint, Consequence, EmotionalArc, CompanionRequest/Response, ProgressStore,
manifest, telemetry) + `Facing` (4-direction avatar facing), `UI_TOKENS` (age-banded),
`canUsePlayfulExternalization()` gate, `expressionForBand()` state machine.

### 3.11 Serverless API (`api/`)
✅ Implemented (live path) — deep-dive in
[safety-companion-pipeline.md](./TruNorthContextFiles/safety-companion-pipeline.md).
- `_lib/pipeline.ts` — `runCompanionPipeline()`: the five-layer safety stack (input filter →
  scoped prompt → Claude call w/ 8 s timeout + 1 retry → strict validation + 0.55
  confidence floor → output filter), authored-band authority for choices, fallback
  library on every failure path; injectable model for tests.
- `_lib/filters.ts` — `inputFilter`, `outputFilter`, `splitCompanionLine`.
- `_lib/prompt.ts` — versioned scoped system prompt builder.
- `_lib/validate.ts` — strict JSON/enum validation of model output.
- `_lib/fallbacks.ts` — fallback-library loader (`getFallbackLine`).
- `companion/route.ts` — Vercel handler; never surfaces raw errors.
- `health/route.ts` — liveness probe. `progress/[childId].ts` — 🟨 [EXT] 501 stub.
- The same pipeline is served in dev by a Vite middleware (`vite.config.ts`).

### 3.12 Content & schemas (`content/`)
✅ Implemented.
- Schemas: `scene` (incl. `tileMap`: 9 rows × 16 chars of `#`/`.`), `decision-point`
  (requires complete 4-field `emotionalArc` + governance fields), `game-state`,
  `companion-response`.
- Every scene is a top-down room: `tileMap` collision rows matching the background art,
  full-room character/trigger/collectible placement, exits as `goToScene` triggers on
  door-gap tiles.
- Ch.1 "The Meadow" (ages 5–7, Tier A): c1s1 → `dp_leftout_swing` (3 options,
  sit-with repair) → c1s2 → chapter complete.
- Ch.2 "The Clearing — Worry & Brave" (8–10, Tier B): showcase golden path
  w1 → w2 (`dp_robin_ladder`, choice+typed, walk-back repair) → w3a/w3b → w4 3-tap climb.
- `fallbacks/companion-fallbacks.json` — global + every dp × band + timeout (CI-enforced).
- `demo/showcase.bundle.json` — canned responses for every dp × band (CI-enforced).
- All content `approvalState: "draft"` — **SME review pending**.

### 3.13 Assets (`assets-src/`, `public/assets/`)
🟨 Partial. Pipeline fully works (manifest.yaml → validated `manifest.json`; provenance
ledger rows for all 12 assets), but the art itself is **hand-authored placeholder SVG**,
not the frozen "clean cartoon" style (see `assets-src/art-style-guide.md`). Backgrounds
are drawn as **3/4 top-down rooms aligned to each scene's 16×9 tile grid** (hedge walls
with front faces, door gaps on walkable exit tiles). Audio is synthesized, no audio files.

### 3.14 Build & tooling scripts (`scripts/`)
✅ Implemented.
- `validate-content.ts` — schema validation, assetRef existence, tile-map layout checks
  (tileMap present, avatarStart walkable, Tier B triggers/collectibles on walkable floor),
  routing integrity + reachability BFS, fallback coverage, demo-bundle coverage/contract.
  Exits non-zero on error.
- `build-asset-manifest.ts` — YAML → `public/assets/manifest.json`; fails on missing files.
- `red-team-suite.ts` — 19 adversarial cases through the real pipeline with a mock model.
- `audit-bundle-size.ts` — dist walk vs 15 MB budget (currently ~0.09 MB).

### 3.15 Tests (`tests/`)
✅ Implemented — all green.
- Unit (7 suites / 43 tests): resolver + meters + leveling, graph routing + reachability,
  bubble splitting, local store (round-trip, corrupt, prune, clear), tile-map parsing +
  wall blocking + wall sliding + 4-dir facing + trigger/collectible AABB, residue,
  filters/validators/sanitizer/code gates.
- Integration: pipeline (confidence floor, band authority, retry, no-key, output filter,
  distress) + companion clients (live fallback, demo bundle/rubric/distress).
- Red-team: 19 cases (Vitest wrapper + standalone harness).
- E2E (Playwright): offline demo golden path W1→W4 incl. climb + celebration, asserting
  **zero `/api` requests**. Runs at the 1366×768 Chromebook profile.

---

## 4. Context files index (`TruNorthContextFiles/`)

| Context file | Documents | Summary |
|---|---|---|
| [engine-runtime.md](./TruNorthContextFiles/engine-runtime.md) | `src/engine/*`, `src/render/*`, `src/input/*`, `src/main.ts` | Boot sequence, scene lifecycle phase machine, decision/repair/chapter flows, renderer + bubble + particle internals |
| [safety-companion-pipeline.md](./TruNorthContextFiles/safety-companion-pipeline.md) | `api/_lib/*`, `api/companion/route.ts`, `src/companion/*`, `src/safety/*`, fallback library | Five-layer safety stack layer by layer, fallback coverage rules, demo client behavior, red-team coverage |
