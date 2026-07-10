# TruNorth art style guide (placeholder edition)

**Status: NOT frozen.** All current assets are hand-authored placeholder SVGs so the
runtime, manifest pipeline, and content references can be built and tested end-to-end.
The production "clean cartoon" AI-generated style (spec §7.1) has not been generated or
locked yet; when it is, every asset must be replaced 1:1 (same `assetRef`, same logical
dimensions/anchors) and recorded in `provenance-ledger.csv`, then the manifest version bumped.

## Perspective: 3/4 top-down rooms (Pokémon-style)

- Every scene is one fixed screen-sized room seen from a slightly angled overhead view:
  the floor reads flat, while walls, props, and characters show their **front faces**.
- Backgrounds align to the 16×9 grid of 120 px collision tiles authored in each scene's
  `tileMap` ('#' blocked / '.' walkable). Blocked art (hedges, trunks, boulders) must sit
  on blocked tiles; door/path gaps must sit on walkable edge tiles.
- Wall/prop 3/4 cue: a darker "front face" strip along the south edge of the shape.
- The player avatar has three runtime poses — front (`down`), back (`up`), and profile
  (`side`, CSS-mirrored for left). NPCs remain single front-facing frames for now.

## Placeholder conventions

- Flat shapes, soft rounded corners, no gradients on characters (backgrounds may use 2-stop gradients).
- Palette: grass `#6cbf4e`, sky `#aee3ff`, wood `#c98d4b`/`#7a5230`, fox `#f28c38`,
  worry gray `#8f9bb0`, spark gold `#ffd66b`, text ink `#3d3d3d`.
- Characters face forward (toward the camera in the 3/4 view); feet-center anchor
  `(0.5, 1.0)`; head-top bubble anchor `(0.5, 0.0)`. Depth is y-sorted by feet position.
- Expression states are rendered at runtime via CSS (dim/desaturate for `worried_sad`,
  glow drop-shadow for `excited_glow`) until real per-expression frames exist.
- Base logical sizes per spec §7.3: avatar 128×128, companion 160×160, NPC 144×144.

## Freeze process (when real art lands)

1. Generate per the frozen style prompt set; record prompt + date + license in the ledger.
2. SME + art lead sign-off, then bump `version` in `assets-src/manifest.yaml`.
3. No regeneration after freeze without a version bump (ADR-005).
