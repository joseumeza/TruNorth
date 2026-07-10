# TruNorth

**Choice-driven social-emotional learning (SEL) narrative for children ages 5–15.**

TruNorth is a web-based, choice-driven narrative adventure — *not* a game-engine product.
It is a content-driven **scene-graph state machine** rendered in the browser with a custom
lightweight runtime, an **AI companion proxied server-side**, and a **frozen illustrated
asset pipeline**. Content files drive scene layout, decision points, scoring, companion
prompts, consequences, and repair actions.

> **Status:** MVP playable end-to-end — two chapters (incl. the showcase golden path
> W1→W4), scene engine, five-layer companion safety pipeline, offline demo mode, local
> saves, onboarding, parent gate. Art is placeholder SVG. See [`product.md`](./product.md)
> for exactly what is built right now.

---

## Quick start (test it in 2 minutes)

Requires **Node 22+** (`.nvmrc` provided).

```bash
cd TruNorthProject
npm install
npm run demo          # builds + serves the offline showcase
# open http://localhost:4173/?demo=1
```

**Demo mode** (`?demo=1`) is the fastest way to play: it skips onboarding, uses canned
companion lines (zero network), and shows a "Demo Mode" pill. A page reload fully resets it.

**The golden path (~2 min):** click *Continue* on the narration → walk right with
**arrow keys / WASD** to the next clearing → walk up to **Robin** at the ladder → pick
**"It's okay to feel scared…"** (Option A) → click through the companion's speech bubble →
walk right to the ladder → tap **Climb a rung ×3** → celebration 🎉. To see the recovery
mechanic, pick Option C instead: the worry cloud darkens and you *walk back* to Robin to
try again — no shame, no dead ends. Press **Escape** to pause.

Other modes and checks:

```bash
npm run dev            # full experience with onboarding + parent PIN gate (http://localhost:5173)
                       # add ANTHROPIC_API_KEY to .env.local for live companion scoring;
                       # without a key the app uses approved fallback lines automatically

npm run test:unit      # 70 unit + integration + red-team tests
npm run test:red-team  # 19 adversarial safety cases through the real pipeline
npm run validate:content  # schemas, routing, fallback + demo coverage
npm run test:e2e       # Playwright golden-path e2e (npx playwright install chromium first)
npm run build && npm run audit:bundle   # production build + 15 MB budget check
```

---

## Non-negotiable constraints

- **No game engine** (Phaser, Unity, Godot ruled out).
- **No API keys in the browser** — all Claude calls go through a serverless proxy.
- **No open-ended chat** — every typed interaction is scoped to an active `decisionPointId`
  and a bounded scoring rubric.
- **Demo mode runs fully offline** with a visible demo-mode indicator.
- **MVP platform:** desktop, laptop, Chromebook with physical keyboard/mouse.
- **Safety, privacy, and child-trust are release-blocking.**

---

## Documentation map

| Document | Role |
|---|---|
| [`product.md`](./product.md) | **Living record of what is actually implemented** — files, methods, functionality. Updated every PR. |
| [`TruNorthTechnicalSpecification.md`](./TruNorthTechnicalSpecification.md) | Build-ready technical spec (v3.0). The authority for **what is intended**. |
| [`TruNorthContextFiles/`](./TruNorthContextFiles/) | Offloaded deep-dives for complex files/subsystems, linked from `product.md`. |
| [`CLAUDE.md`](./CLAUDE.md) | Instructions for Claude Code sessions in this repo. |
| `TruNorthProject/docs/adr/` | Architecture Decision Records. |

**Source-of-truth precedence:** for *"what is built"* → `product.md` wins; for
*"what is intended"* → the technical specification wins. Any conflict touching child safety,
privacy, or data collection is escalated, not silently resolved.

---

## Repository layout

```
TruNorth/
├── product.md                       # Living implementation ledger (read first)
├── TruNorthTechnicalSpecification.md# Build-ready spec (v3.0)
├── TruNorthContextFiles/            # Offloaded deep-dive docs, linked from product.md
├── CLAUDE.md                        # Claude Code project instructions
├── TruNorthProject/                 # The application (see product.md §2 for the full tree)
│   ├── api/                         # Serverless functions (companion proxy, health, progress)
│   ├── content/                     # Scenes, JSON schemas, demo bundle, fallbacks, rubrics
│   ├── assets-src/ · public/assets/ # Source art + built static assets
│   ├── scripts/                     # Content validation, asset manifest, red-team, bundle audit
│   ├── src/                         # engine, render, input, ui, companion, safety, store, audio, types
│   ├── tests/                       # unit, integration, e2e, red-team
│   └── docs/                        # ADRs, privacy docs, runbooks
├── .github/                         # CI workflow, PR template + product.md-sync workflow
└── .githooks/                       # Shared pre-push reminder (opt-in)
```

---

## Keeping `product.md` in sync (required)

`product.md` must always reflect what is actually implemented. **Any change to a file,
method, or behavior under `TruNorthProject/` must update `product.md` in the same PR.**
Four layers help enforce this:

1. **`CLAUDE.md`** — Claude Code updates `product.md` as part of any code change.
2. **PR template** — a required checklist on every pull request.
3. **GitHub Action** (`.github/workflows/product-md-sync.yml`) — runs only on PRs that touch
   `TruNorthProject/`; comments if `product.md` wasn't updated. Non-blocking by default
   (set repo variable `PRODUCT_MD_ENFORCE=true` to make it required).
4. **Shared pre-push hook** — a local, early reminder.

Enable the local hook once per clone:

```bash
git config core.hooksPath .githooks
```

When a file's entry in `product.md` grows past ~15 lines or needs diagrams/tables, move the
detail into `TruNorthContextFiles/<area>-<subject>.md` and link to it. See `product.md`
Section 0 for the full maintenance rules.

---

## Team

Dallas AI · Summer 2026 Cohort — *DallasAITeam15*.
