/**
 * DecisionResolver — maps a resolved score band to its consequence, applies
 * meter deltas, updates residue, and appends the event log entry (spec §5.1).
 * Pure functions over GameState so scoring is unit-testable.
 */
import type {
  Consequence,
  DecisionPoint,
  GameState,
  ScoreBand,
  SkillId,
} from '../types';

export function resolveConsequence(dp: DecisionPoint, band: ScoreBand): Consequence {
  const match = dp.consequences.find((c) => c.band === band);
  if (match) return match;
  // Bounded degradation: fall back to the partial consequence, then the first.
  return dp.consequences.find((c) => c.band === 'partial') ?? dp.consequences[0];
}

export interface MeterChange {
  skill: SkillId;
  delta: number;
  newFill: number;
  newLevel: number;
  leveledUp: boolean;
}

/** Applies meter deltas in place; fill wraps into levels at 1.0 (spec §10.3). */
export function applyMeterDeltas(
  state: GameState,
  deltas: Partial<Record<SkillId, number>> | undefined,
): MeterChange[] {
  if (!deltas) return [];
  const changes: MeterChange[] = [];
  for (const [skill, delta] of Object.entries(deltas) as [SkillId, number][]) {
    const meter = state.meters[skill];
    if (!meter || delta === 0) continue;
    const total = Math.max(0, meter.level + meter.fill + delta);
    const newLevel = Math.floor(total);
    const newFill = Number((total - newLevel).toFixed(4));
    const leveledUp = newLevel > meter.level;
    meter.level = newLevel;
    meter.fill = newFill;
    changes.push({ skill, delta, newFill, newLevel, leveledUp });
  }
  return changes;
}

/** Companion levels up as strong choices accumulate (spec §8.3 level 1–3). */
export function companionLevelForStrongCount(strongCount: number): 1 | 2 | 3 {
  if (strongCount >= 4) return 3;
  if (strongCount >= 2) return 2;
  return 1;
}

export function countStrongDecisions(state: GameState): number {
  return state.eventLog.filter((e) => e.type === 'decision_resolved' && e.band === 'strong').length;
}

/** Records the resolved decision; auto-save happens immediately after (spec §10.4). */
export function appendDecisionEvent(
  state: GameState,
  sceneId: string,
  dp: DecisionPoint,
  band: ScoreBand,
  deltas: Partial<Record<SkillId, number>> | undefined,
): void {
  state.eventLog.push({
    ts: Date.now(),
    type: 'decision_resolved',
    sceneId,
    decisionPointId: dp.id,
    band,
    skillDeltas: deltas,
  });
  const strongCount = countStrongDecisions(state);
  state.companion.level = companionLevelForStrongCount(strongCount);
}
