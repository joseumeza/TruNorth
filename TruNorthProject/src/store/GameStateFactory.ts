/** Creates the single canonical GameState object (spec §10.1). */
import { ALL_SKILLS, type AgeBand, type AvatarConfig, type GameState, type SkillId } from '../types';

export interface NewGameProfile {
  ageBand: AgeBand;
  chapterId: string;
  avatar: AvatarConfig;
  companionName: string;
  companionArchetype: string;
  baselineStrength: string;
  childDisplayName?: string;
  pinHash?: string;
  demoMode: boolean;
}

export function createInitialState(p: NewGameProfile, entrySceneId: string): GameState {
  const meters = {} as Record<SkillId, { fill: number; level: number }>;
  for (const skill of ALL_SKILLS) meters[skill] = { fill: 0, level: 0 };
  // Baseline strength seeds a head start on one meter (spec §21 onboarding seed).
  if ((ALL_SKILLS as string[]).includes(p.baselineStrength)) {
    meters[p.baselineStrength as SkillId] = { fill: 0.25, level: 0 };
  }
  return {
    version: 1,
    profile: {
      childDisplayName: p.childDisplayName,
      ageBand: p.ageBand,
      chapterId: p.chapterId,
      avatar: p.avatar,
      companionName: p.companionName,
      companionArchetype: p.companionArchetype,
      baselineStrength: p.baselineStrength,
    },
    progress: {
      currentSceneId: entrySceneId,
      chaptersUnlocked: [p.chapterId],
      chaptersCompleted: [],
      browniePoints: 0,
      kindnessSparksFound: {},
    },
    meters,
    companion: { level: 1, appearanceRef: p.companionArchetype },
    emotionalResidue: {},
    parentGate: { lastPassedChapter: null, ...(p.pinHash ? { pinHash: p.pinHash } : {}) },
    flags: { demoMode: p.demoMode, lastSafetyFlag: null, onboardingComplete: true },
    eventLog: [],
  };
}
