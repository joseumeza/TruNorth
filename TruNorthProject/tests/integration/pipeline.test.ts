import { describe, expect, it } from 'vitest';
import { runCompanionPipeline } from '../../api/_lib/pipeline';

const baseRequest = {
  decisionPointId: 'dp_robin_ladder',
  sceneId: 'w2',
  chapterId: 'ch2',
  ageBand: '8-10',
  inputMode: 'typed' as const,
  childInput: "it's okay to feel scared, let's try the first step together",
  companionContext: { situation: 'Robin frozen at ladder', npcEmotion: 'anxiety', ageBand: '8-10' },
  strengthsSnapshot: [],
  companion: { name: 'Pip', archetype: 'companion_fox' },
  selSkills: ['worry_brave'],
};

const env = { ANTHROPIC_API_KEY: 'test-key', COMPANION_MODEL: 'mock', CONFIDENCE_FLOOR: '0.55' };

const modelJson = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    scoreBand: 'strong',
    skill: 'worry_brave',
    matchedCriterion: 'names_feeling_and_supports',
    confidence: 0.91,
    companionLine: 'You said the scared part out loud — that helps it feel smaller.',
    redirect: false,
    safetyFlag: 'none',
    ...overrides,
  });

describe('companion pipeline (spec §11)', () => {
  it('returns a validated model response on the happy path', async () => {
    const result = await runCompanionPipeline(baseRequest, env, { callModel: async () => modelJson() });
    expect(result.scoreBand).toBe('strong');
    expect(result.fallbackReason).toBeUndefined();
    expect(result.companionLines.length).toBeGreaterThan(0);
  });

  it('routes low confidence to the partial fallback (spec §11.4)', async () => {
    const result = await runCompanionPipeline(baseRequest, env, {
      callModel: async () => modelJson({ confidence: 0.3 }),
    });
    expect(result.scoreBand).toBe('partial');
    expect(result.fallbackReason).toBe('low_confidence');
  });

  it('keeps the authored band authoritative for choice input', async () => {
    const result = await runCompanionPipeline(
      { ...baseRequest, inputMode: 'choice', knownBand: 'poor', childInput: "Come on, just climb! It's not scary." },
      env,
      { callModel: async () => modelJson({ scoreBand: 'strong' }) },
    );
    expect(result.scoreBand).toBe('poor');
  });

  it('retries once, then falls back on persistent model failure', async () => {
    let calls = 0;
    const result = await runCompanionPipeline(baseRequest, env, {
      callModel: async () => {
        calls += 1;
        throw new Error('timeout');
      },
    });
    expect(calls).toBe(2);
    expect(result.fallbackReason).toBe('timeout');
    expect(result.companionLine.length).toBeGreaterThan(0);
  });

  it('recovers from a transient failure on the silent retry', async () => {
    let calls = 0;
    const result = await runCompanionPipeline(baseRequest, env, {
      callModel: async () => {
        calls += 1;
        if (calls === 1) throw new Error('flaky');
        return modelJson();
      },
    });
    expect(result.fallbackReason).toBeUndefined();
  });

  it('falls back safely without an API key (model_unavailable path, spec §11.6)', async () => {
    const result = await runCompanionPipeline(baseRequest, {});
    expect(result.fallbackReason).toBe('model_unavailable');
    expect(result.companionLine.length).toBeGreaterThan(0);
  });

  it('filters unsafe model output and substitutes the approved band line', async () => {
    const result = await runCompanionPipeline(baseRequest, env, {
      callModel: async () => modelJson({ companionLine: 'You should see a therapist about that.' }),
    });
    expect(result.fallbackReason).toContain('output_filter');
    expect(result.companionLine).not.toContain('therapist');
  });

  it('never forwards distress input to the model and answers with the protocol line', async () => {
    let called = false;
    const result = await runCompanionPipeline(
      { ...baseRequest, childInput: 'i want to hurt myself' },
      env,
      {
        callModel: async () => {
          called = true;
          return modelJson();
        },
      },
    );
    expect(called).toBe(false);
    expect(result.safetyFlag).toBe('distress');
    expect(result.companionLine).toContain('grown-up');
  });
});
