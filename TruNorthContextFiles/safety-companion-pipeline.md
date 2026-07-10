# Companion safety pipeline deep-dive

**Documents:** `TruNorthProject/api/_lib/*`, `api/companion/route.ts`, `src/companion/*`, `src/safety/OutputSanitizer.ts`, `content/fallbacks/companion-fallbacks.json`

## Server pipeline (`api/_lib/pipeline.ts` — spec §11.3)

`runCompanionPipeline(body, env, deps?)` — shared verbatim by the Vercel function, the Vite dev middleware, integration tests, and the red-team suite. `deps.callModel` is injectable so tests can simulate timeouts and malformed output.

| Layer | Module | Behavior |
|---|---|---|
| 1. Input filter | `filters.ts inputFilter` | 280-char cap; **distress checked first** (never masked by other categories); PII (phone/email/address/school/social handles/meetup); jailbreak (ignore-rules / pretend / system-prompt / act-as); profanity. Failure → authored fallback, model never called. |
| 2. Scoped prompt | `prompt.ts buildSystemPrompt` | Versioned (`PROMPT_VERSION`); persona + absolute safety rules + scene context + rubric subset + strict JSON output contract. For choice input the prompt pins the authored band; the model only writes flavor. |
| 3. Model call | `pipeline.ts callAnthropic` | `COMPANION_MODEL` env (default `claude-haiku-4-5`; production pins a dated ID per ADR-004); 8 s AbortController timeout; 1 silent retry; missing API key → `model_unavailable` fallback (progression never breaks). |
| 4. Validation | `validate.ts` | Strict JSON parse (tolerates markdown fences only) + enum/range checks on every field. Malformed → band-appropriate fallback. Confidence < `CONFIDENCE_FLOOR` (0.55) on typed input → partial fallback (spec §11.4). |
| 5. Output filter | `filters.ts outputFilter` | Blocks clinical terms, PII solicitation, meetups/secrecy, links, markup, empty/overlong lines → authored band line instead. `splitCompanionLine` breaks >120-char lines for bubble sequencing. |

Every fallback response carries `fallbackReason` (logged client-side as a non-PII `fallback_used` event). Raw child text is never logged anywhere.

## Fallback library (`content/fallbacks/companion-fallbacks.json`)

`global` keys: `timeout`, `safety_redirect`, `distress`, `model_unavailable`, `resume`, `error`; plus per-decision-point `strong/partial/poor/timeout`. `scripts/validate-content.ts` fails CI if any dp × band path is missing. The same JSON backs the client (`src/content/fallbackLines.ts`) so offline lines match server lines.

## Client side

- `CompanionClient` (live): POST `/api/companion`, 8 s timeout; any failure → in-character fallback with the authored band preserved — never a raw error (spec §6.2 system.error).
- `DemoCompanionClient` (offline): bundle lookup `{sceneId}:{decisionPointId}:{band}`; typed input scored by `typedRubric.scoreTypedInput` (strong = names feeling + offers support; poor = dismissive); distress protocol enforced even offline.
- `OutputSanitizer` (defense in depth): strips control chars, re-checks banned patterns, caps at 360 chars; all child-facing text renders via `textContent` (XSS row, spec §16.1).
- Distress handling in `SceneEngine`: companion speaks the protocol line → gentle support overlay pointing to a trusted grown-up → decision re-opens; `safety_flag` event logged (category only).

## Red-team coverage (spec §17.2)

`tests/red-team/cases.json` (19 cases) runs through the **real pipeline** twice: `npm run test:red-team` (reporting harness, CI gate) and `tests/red-team/red-team.test.ts` (Vitest). Categories: jailbreak, PII/contact, profanity, distress, over-length, malformed JSON, timeout, unsafe/clinical model output. Every case additionally asserts no dead air and no unsafe markers in the final line.
