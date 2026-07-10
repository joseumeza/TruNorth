/**
 * The five-layer companion safety pipeline (spec §11.3):
 *   1. input filter → 2. scoped prompt → 3. model call → 4. schema validation → 5. output filter/fallback
 * Shared by the Vercel function (api/companion/route.ts), the Vite dev
 * middleware, integration tests, and the red-team suite.
 *
 * `deps.callModel` is injectable so tests can simulate timeouts and malformed output.
 */
import { inputFilter, outputFilter, splitCompanionLine } from './filters';
import { buildSystemPrompt } from './prompt';
import { parseAndValidateModelOutput, type ValidatedResponse } from './validate';
import { getFallbackLine } from './fallbacks';

export interface PipelineEnv {
  ANTHROPIC_API_KEY?: string;
  COMPANION_MODEL?: string;
  CONFIDENCE_FLOOR?: string;
}

export interface PipelineDeps {
  callModel?: (system: string, user: string, model: string, apiKey: string) => Promise<string>;
}

interface CompanionRequestBody {
  decisionPointId: string;
  sceneId: string;
  chapterId: string;
  ageBand: string;
  inputMode: 'choice' | 'typed';
  childInput: string;
  knownBand?: 'strong' | 'partial' | 'poor';
  companionContext: { situation: string; npcEmotion: string; ageBand: string };
  strengthsSnapshot: string[];
  companion: { name: string; archetype: string };
  selSkills?: string[];
}

export interface PipelineResult {
  scoreBand: 'strong' | 'partial' | 'poor';
  skill: string;
  matchedCriterion: string;
  confidence: number;
  companionLine: string;
  companionLines: string[];
  redirect: boolean;
  safetyFlag: string;
  fallbackReason?: string;
}

const TIMEOUT_MS = 8000;
const DEFAULT_MODEL = 'claude-haiku-4-5';

function fallbackResult(
  body: CompanionRequestBody,
  band: 'strong' | 'partial' | 'poor',
  lineKey: string,
  safetyFlag: string,
  fallbackReason: string,
): PipelineResult {
  const line = getFallbackLine(body.decisionPointId, lineKey);
  return {
    scoreBand: band,
    skill: body.selSkills?.[0] ?? 'worry_brave',
    matchedCriterion: 'fallback',
    confidence: 1,
    companionLine: line,
    companionLines: splitCompanionLine(line),
    redirect: safetyFlag !== 'none',
    safetyFlag,
    fallbackReason,
  };
}

async function callAnthropic(system: string, user: string, model: string, apiKey: string): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model,
        max_tokens: 300,
        system,
        messages: [{ role: 'user', content: user }],
      }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`anthropic_http_${res.status}`);
    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = data.content?.find((c) => c.type === 'text')?.text;
    if (!text) throw new Error('anthropic_empty_response');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

export async function runCompanionPipeline(
  rawBody: unknown,
  env: PipelineEnv,
  deps: PipelineDeps = {},
): Promise<PipelineResult> {
  const body = rawBody as CompanionRequestBody;
  if (!body || typeof body.decisionPointId !== 'string' || typeof body.childInput !== 'string') {
    // Malformed request: safe generic fallback, never a raw error.
    return fallbackResult(
      { decisionPointId: '__unknown__', childInput: '' } as CompanionRequestBody,
      'partial',
      'error',
      'none',
      'bad_request',
    );
  }

  const knownBand = body.inputMode === 'choice' ? body.knownBand : undefined;
  const bandOrPartial = knownBand ?? 'partial';

  // ── Layer 1: input filter ──────────────────────────────────────────────────
  const inputCheck = inputFilter(body.childInput);
  if (!inputCheck.ok) {
    const lineKey = inputCheck.safetyFlag === 'distress' ? 'distress' : 'safety_redirect';
    return fallbackResult(body, 'partial', lineKey, inputCheck.safetyFlag, `input_filter:${inputCheck.reason}`);
  }

  // ── Layer 3 prerequisites: model + key ────────────────────────────────────
  const apiKey = env.ANTHROPIC_API_KEY;
  const model = env.COMPANION_MODEL || DEFAULT_MODEL;
  if (!apiKey) {
    return fallbackResult(body, bandOrPartial, knownBand ?? 'model_unavailable', 'none', 'model_unavailable');
  }

  // ── Layer 2: scoped prompt ─────────────────────────────────────────────────
  const system = buildSystemPrompt({
    decisionPointId: body.decisionPointId,
    ageBand: body.ageBand,
    inputMode: body.inputMode,
    knownBand,
    companion: body.companion ?? { name: 'Pip', archetype: 'companion_fox' },
    companionContext: body.companionContext ?? { situation: '', npcEmotion: '', ageBand: body.ageBand },
    skills: body.selSkills ?? ['worry_brave'],
  });
  const userMsg = `Child ${body.inputMode === 'choice' ? 'chose' : 'typed'}: "${body.childInput}"`;

  // ── Layer 3: model call (1 silent retry, 8 s hard timeout) ────────────────
  const callModel = deps.callModel ?? callAnthropic;
  let raw: string | null = null;
  for (let attempt = 0; attempt < 2 && raw === null; attempt++) {
    try {
      raw = await callModel(system, userMsg, model, apiKey);
    } catch {
      raw = null;
    }
  }
  if (raw === null) {
    return fallbackResult(body, bandOrPartial, knownBand ?? 'timeout', 'none', 'timeout');
  }

  // ── Layer 4: strict JSON parse + enum validation ───────────────────────────
  const validated: ValidatedResponse | null = parseAndValidateModelOutput(raw);
  if (!validated) {
    return fallbackResult(body, bandOrPartial, knownBand ?? 'timeout', 'none', 'malformed_model_output');
  }

  // Authored choice band is authoritative; the model only supplies flavor.
  if (knownBand) validated.scoreBand = knownBand;

  // Confidence routing (spec §11.4).
  const floor = Number(env.CONFIDENCE_FLOOR ?? '0.55');
  if (!knownBand && validated.confidence < floor) {
    return fallbackResult(body, 'partial', 'partial', 'none', 'low_confidence');
  }

  // ── Layer 5: output filter ─────────────────────────────────────────────────
  const outCheck = outputFilter(validated.companionLine);
  if (!outCheck.ok) {
    return fallbackResult(body, validated.scoreBand, validated.scoreBand, 'none', `output_filter:${outCheck.reason}`);
  }

  return {
    ...validated,
    companionLines: splitCompanionLine(validated.companionLine),
  };
}
