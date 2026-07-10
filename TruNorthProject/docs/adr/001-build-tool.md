# ADR-001: Vite 6.x instead of the spec's Vite 8.x pin

**Status:** Accepted (provisional) · **Owner:** Build lead

The spec (§3.1) prefers Vite 8.x on Node 24.x. The current dev/demo machine runs
Node 22.1.0, which is below Vite 7+'s engine floor (^20.19 / >=22.12). We pin
**Vite 6.x + Vitest 3** which fully support Node 22.1 and the same feature set we
use (glob imports, static export, dev middleware). Revisit when the demo machine
moves to Node 24 LTS; upgrading is a version bump, no API changes expected.
