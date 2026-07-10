# Data classification & handling (MVP)

Mirror of spec §16.2, as implemented:

| Data class | Where it lives | Notes |
|---|---|---|
| Profile (age band, avatar, companion name) | localStorage `trunorth_save_v1` (demo: memory only) | Never leaves the device |
| Progress (scene, meters, points) | Same local save | — |
| Decision metadata (dpId, band, deltas, safetyFlag) | Local event log, capped at 200 events | No raw text |
| Raw child typed input | In-memory only, for one scoped request | Never persisted or logged (ADR-006) |
| Companion output | Displayed via textContent; not stored | — |
| Monitoring | None wired in MVP | Sentry (scrubbed) is an EXT decision |

Deletion: pause menu → "Erase progress and start over", or clear browser storage.
