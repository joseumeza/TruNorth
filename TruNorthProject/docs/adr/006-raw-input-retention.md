# ADR-006: Raw child input retention

**Status:** Accepted · **Owner:** Owner + Counsel

Raw child typed input is never persisted: the client keeps it in memory for the
single scoped companion request; the server forwards it to the model only after
the input filter passes and never logs it; the event log stores only
decisionPointId, band, and skill deltas. Any change requires counsel + parent
consent + a retention policy (spec §16.2).
