# ADR-005: Asset generation & provenance policy

**Status:** Accepted (placeholder era) · **Owner:** Owner + Art lead

All current assets are hand-authored placeholder SVGs recorded in
`assets-src/provenance-ledger.csv`. When production art is generated: record
source prompt, date, license, editor, and approval per asset; freeze the style
guide; no regeneration after freeze without a manifest version bump.
