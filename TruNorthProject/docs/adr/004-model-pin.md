# ADR-004: Companion model pin + lifecycle

**Status:** Accepted · **Owner:** Safety + Build

`COMPANION_MODEL` env var defaults to `claude-haiku-4-5`; production must pin a
dated model ID after QA lock (spec §11.6). No model name appears in client or
content files. Changing the model requires: red-team suite green, golden-path
E2E, reading-level spot check, latency/cost review. The model-unavailable path
returns approved fallback lines without breaking scene progression.
