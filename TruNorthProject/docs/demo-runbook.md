# Demo runbook (stage / showcase)

## Before the venue
1. `npm ci && npm run build`
2. Sanity: `npm run validate:content && npm run test:unit && npm run test:red-team`
3. Rehearse the golden path once: `npm run preview` → http://localhost:4173/?demo=1

## On stage (fully offline)
```bash
npm run preview          # serves dist/ on :4173, no network needed
# open http://localhost:4173/?demo=1
```
- The **Demo Mode** pill must be visible top-left. If it isn't, the URL is missing `?demo=1`.
- Demo mode: canned companion lines, in-memory save (reload = full reset), zero `/api` calls.

## Golden path (< 3 min)
W1 explore (arrow keys →) → W2 Robin → **Option A** (strong) → W3a → W4 climb ×3 → celebration.
Stage the adaptivity beat: pick **Option C** once in W2, show the walk-back repair, then recover with A.

## Fallback ladder (spec §15.5)
1. Live deploy → 2. Local demo mode → 3. Offline localhost build → 4. Recorded backup video (record during rehearsal).
