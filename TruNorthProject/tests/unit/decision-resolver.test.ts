import { describe, expect, it } from 'vitest';
import {
  applyMeterDeltas,
  appendDecisionEvent,
  companionLevelForStrongCount,
  resolveConsequence,
} from '../../src/engine/DecisionResolver';
import { createInitialState } from '../../src/store/GameStateFactory';
import type { DecisionPoint } from '../../src/types';

const dp: DecisionPoint = {
  id: 'dp_test',
  prompt: 'What do you do?',
  inputMode: 'choice',
  themeSensitivity: 'standard',
  selSkills: ['worry_brave'],
  companionContext: { situation: 's', npcEmotion: 'e', ageBand: '8-10' },
  consequences: [
    { band: 'strong', sceneId: 'w3a', meterDeltas: { worry_brave: 1.0, empathy: 0.25 } },
    { band: 'partial', sceneId: 'w3b', meterDeltas: { worry_brave: 0.4 } },
    { band: 'poor', sceneId: 'w2', repairAction: 'walk-back' },
  ],
  emotionalArc: {
    childStateEntering: 'x',
    childStateExiting: { strong: 'a', partial: 'b', poor: 'c' },
    companionStance: { strong: 'a', partial: 'b', poor: 'c' },
    recoveryCadence: 'r',
  },
  version: '1.0.0',
  owner: 't',
  approvalState: 'draft',
  lastSmeReviewDate: '2026-07-07',
};

function freshState() {
  return createInitialState(
    {
      ageBand: '8-10',
      chapterId: 'ch2',
      avatar: { skinTone: 'tone_2', hair: 'hair_short' },
      companionName: 'Pip',
      companionArchetype: 'companion_fox',
      baselineStrength: 'calm',
      demoMode: true,
    },
    'w1',
  );
}

describe('resolveConsequence', () => {
  it('picks the matching band', () => {
    expect(resolveConsequence(dp, 'strong').sceneId).toBe('w3a');
    expect(resolveConsequence(dp, 'poor').repairAction).toBe('walk-back');
  });

  it('degrades to partial when a band is missing', () => {
    const sparse = { ...dp, consequences: dp.consequences.filter((c) => c.band !== 'strong') };
    expect(resolveConsequence(sparse, 'strong').band).toBe('partial');
  });
});

describe('applyMeterDeltas', () => {
  it('fills meters and wraps into levels at 1.0', () => {
    const state = freshState();
    const changes = applyMeterDeltas(state, { worry_brave: 1.0, empathy: 0.25 });
    expect(state.meters.worry_brave).toEqual({ fill: 0, level: 1 });
    expect(state.meters.empathy).toEqual({ fill: 0.25, level: 0 });
    expect(changes.find((c) => c.skill === 'worry_brave')?.leveledUp).toBe(true);
  });

  it('never drops below zero', () => {
    const state = freshState();
    applyMeterDeltas(state, { empathy: -0.5 });
    expect(state.meters.empathy.fill).toBe(0);
    expect(state.meters.empathy.level).toBe(0);
  });

  it('seeds baseline strength from onboarding', () => {
    const state = freshState();
    expect(state.meters.calm.fill).toBe(0.25);
  });
});

describe('companion leveling', () => {
  it('levels at 2 and 4 strong decisions', () => {
    expect(companionLevelForStrongCount(0)).toBe(1);
    expect(companionLevelForStrongCount(2)).toBe(2);
    expect(companionLevelForStrongCount(4)).toBe(3);
  });

  it('appendDecisionEvent records the event and updates companion level', () => {
    const state = freshState();
    appendDecisionEvent(state, 'w2', dp, 'strong', { worry_brave: 1 });
    appendDecisionEvent(state, 'w2', dp, 'strong', { worry_brave: 1 });
    expect(state.eventLog.filter((e) => e.type === 'decision_resolved')).toHaveLength(2);
    expect(state.companion.level).toBe(2);
  });
});
