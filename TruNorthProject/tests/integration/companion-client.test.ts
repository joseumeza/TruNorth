import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanionClient } from '../../src/companion/CompanionClient';
import { DemoCompanionClient } from '../../src/companion/DemoCompanionClient';
import { scoreTypedInput } from '../../src/companion/typedRubric';
import type { CompanionRequest, SkillId } from '../../src/types';

const request: CompanionRequest & { selSkills: SkillId[] } = {
  decisionPointId: 'dp_robin_ladder',
  sceneId: 'w2',
  chapterId: 'ch2',
  ageBand: '8-10',
  inputMode: 'choice',
  childInput: "It's okay to feel scared. Want to try just the first step together?",
  knownBand: 'strong',
  companionContext: { situation: 's', npcEmotion: 'anxiety', ageBand: '8-10' },
  strengthsSnapshot: [],
  companion: { name: 'Pip', archetype: 'companion_fox' },
  selSkills: ['worry_brave'],
};

afterEach(() => vi.unstubAllGlobals());

describe('CompanionClient (live)', () => {
  it('returns the proxy payload when healthy', async () => {
    vi.stubGlobal('fetch', async () =>
      new Response(
        JSON.stringify({
          scoreBand: 'strong',
          skill: 'worry_brave',
          matchedCriterion: 'x',
          confidence: 0.9,
          companionLine: 'Robin heard you.',
          companionLines: ['Robin heard you.'],
          redirect: false,
          safetyFlag: 'none',
        }),
      ),
    );
    const result = await new CompanionClient().request(request);
    expect(result.companionLine).toBe('Robin heard you.');
  });

  it('falls back in-character when the network fails — never a raw error', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new Error('network down');
    });
    const result = await new CompanionClient().request(request);
    expect(result.scoreBand).toBe('strong'); // authored band preserved
    expect(result.fallbackReason).toBe('client_unreachable');
    expect(result.companionLine.length).toBeGreaterThan(0);
  });
});

describe('DemoCompanionClient (offline showcase)', () => {
  const demo = new DemoCompanionClient();

  it('serves canned lines from the bundle with zero network', async () => {
    const result = await demo.request(request);
    expect(result.companionLine).toContain('scared part out loud');
    expect(result.scoreBand).toBe('strong');
  });

  it('scores typed input with the local rubric', async () => {
    const typed = await demo.request({
      ...request,
      inputMode: 'typed',
      knownBand: undefined,
      childInput: "it's okay to feel scared, I'll go with you",
    });
    expect(typed.scoreBand).toBe('strong');
    const dismissive = await demo.request({
      ...request,
      inputMode: 'typed',
      knownBand: undefined,
      childInput: "just climb, don't be a baby",
    });
    expect(dismissive.scoreBand).toBe('poor');
  });

  it('applies the distress protocol even offline', async () => {
    const result = await demo.request({
      ...request,
      inputMode: 'typed',
      knownBand: undefined,
      childInput: 'i want to disappear forever',
    });
    expect(result.safetyFlag).toBe('distress');
    expect(result.companionLine).toContain('grown-up');
  });
});

describe('typed rubric heuristic', () => {
  it('partial for kind-but-generic and unclear input', () => {
    expect(scoreTypedInput('you can do it robin!').band).toBe('partial');
    expect(scoreTypedInput('bananas are yellow').band).toBe('partial');
  });
});
