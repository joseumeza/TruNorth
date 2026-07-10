# Incident response (MVP skeleton)

**Scope:** AI safety failures (unsafe companion line reaching a child), privacy
incidents, demo-day outages. Required before live AI testing with children (spec §16.1, R01).

## Severity
- **S1** unsafe/clinical/PII-soliciting content displayed to a child → immediate
- **S2** safety layer bypassed but caught downstream (filters/fallback) → 24h review
- **S3** availability (proxy down; fallback lines served) → routine

## S1 immediate actions
1. Flip the deployment to demo mode (canned content) or take the deploy down.
2. Capture the `fallbackReason`/`safetyFlag` telemetry class — never raw child text.
3. Reproduce via the red-team suite; add a fixture that catches the case.
4. Owner + safety SME review before re-enabling live mode.

## Contacts
Owner: Madhusudhan Chillara (Dallas AI Team 15). Safety SME + counsel: TBD — must
be filled in before any live child-facing testing.
