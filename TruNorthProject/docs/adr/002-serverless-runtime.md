# ADR-002: Vercel Functions (Node runtime) for the companion proxy

**Status:** Accepted · **Owner:** Build + DevOps

Per spec §3.1, standalone Vercel Edge Functions are deprecated; we target the
Vercel Functions Node runtime with plain `(req, res)` handlers in `api/`. The
pipeline logic lives in `api/_lib/pipeline.ts` and is host-agnostic (also served
by a Vite dev middleware locally), so moving to Netlify Functions is a thin
adapter, not a rewrite.
