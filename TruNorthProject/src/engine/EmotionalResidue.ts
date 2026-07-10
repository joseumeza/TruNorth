/**
 * EmotionalResidue — per-chapter, per-NPC emotional state derived from the
 * event log (spec §8.6). Affects NPC default expression and companion openers;
 * never blocks progress. A later strong interaction repairs shaken residue.
 */
import type { ChapterResidue, GameState, ResidueLevel, ScoreBand } from '../types';

export function residueForBand(band: ScoreBand): ResidueLevel {
  if (band === 'strong') return 'trusting';
  if (band === 'poor') return 'shaken';
  return 'neutral';
}

export function setResidue(state: GameState, chapterId: string, effects: Record<string, ResidueLevel> | undefined): void {
  if (!effects) return;
  const chapter: ChapterResidue = state.emotionalResidue[chapterId] ?? {};
  for (const [npcId, level] of Object.entries(effects)) {
    chapter[npcId] = level;
  }
  state.emotionalResidue[chapterId] = chapter;
}

export function getResidue(state: GameState, chapterId: string, npcId: string): ResidueLevel {
  return state.emotionalResidue[chapterId]?.[npcId] ?? 'neutral';
}

/** Residue nudges an NPC's default expression when the scene doesn't pin one. */
export function residueExpression(level: ResidueLevel): string | null {
  if (level === 'shaken') return 'worried';
  if (level === 'trusting') return 'relieved_grin';
  return null;
}
