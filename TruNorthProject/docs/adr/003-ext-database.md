# ADR-003: EXT remote persistence — deferred

**Status:** Deferred · **Owner:** Owner + Build

`RemoteProgressStore` (spec §12.3) is not implemented. `api/progress/[childId].ts`
returns 501. Before any implementation: pick Supabase vs Neon+Clerk, require
parent-only auth, Postgres RLS (parent reads only own child profiles), and
counsel sign-off on retention (ADR-006). MVP remains local-first (COPPA posture §16.3).
