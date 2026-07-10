import { describe, expect, it } from 'vitest';
import { getResidue, residueExpression, residueForBand, setResidue } from '../../src/engine/EmotionalResidue';
import { createInitialState } from '../../src/store/GameStateFactory';

function freshState() {
  return createInitialState(
    {
      ageBand: '8-10',
      chapterId: 'ch2',
      avatar: { skinTone: 'tone_3', hair: 'hair_braids' },
      companionName: 'Ash',
      companionArchetype: 'companion_fox',
      baselineStrength: 'courage',
      demoMode: true,
    },
    'w1',
  );
}

describe('emotional residue (spec §8.6)', () => {
  it('maps bands to residue levels', () => {
    expect(residueForBand('strong')).toBe('trusting');
    expect(residueForBand('partial')).toBe('neutral');
    expect(residueForBand('poor')).toBe('shaken');
  });

  it('defaults to neutral and stores per chapter per NPC', () => {
    const state = freshState();
    expect(getResidue(state, 'ch2', 'robin')).toBe('neutral');
    setResidue(state, 'ch2', { robin: 'shaken' });
    expect(getResidue(state, 'ch2', 'robin')).toBe('shaken');
    expect(getResidue(state, 'ch1', 'robin')).toBe('neutral');
  });

  it('a later strong choice repairs shaken residue', () => {
    const state = freshState();
    setResidue(state, 'ch2', { robin: 'shaken' });
    setResidue(state, 'ch2', { robin: 'trusting' });
    expect(getResidue(state, 'ch2', 'robin')).toBe('trusting');
  });

  it('nudges default expressions without blocking progress', () => {
    expect(residueExpression('shaken')).toBe('worried');
    expect(residueExpression('trusting')).toBe('relieved_grin');
    expect(residueExpression('neutral')).toBeNull();
  });
});
