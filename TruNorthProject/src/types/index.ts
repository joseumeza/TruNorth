/**
 * Shared type contracts for the TruNorth runtime.
 * Mirrors the technical specification: §2.3 (chapter config), §9 (content model),
 * §10 (game state), §11 (companion API), §12 (persistence).
 */

// ── Core enums ────────────────────────────────────────────────────────────────

export type SkillId =
  | 'empathy'
  | 'calm'
  | 'courage'
  | 'self_worth'
  | 'adapting_to_change'
  | 'friendship_repair'
  | 'worry_brave';
// ask_for_help is cross-cutting and has no meter (spec §10.2).

export const ALL_SKILLS: SkillId[] = [
  'empathy',
  'calm',
  'courage',
  'self_worth',
  'adapting_to_change',
  'friendship_repair',
  'worry_brave',
];

export type ScoreBand = 'strong' | 'partial' | 'poor';
export type AgeBand = '5-7' | '8-10' | '11-15';
export type ThemeSensitivity = 'standard' | 'sensitive';
export type ResidueLevel = 'trusting' | 'neutral' | 'shaken';
export type RepairActionId = 'walk-back' | 'offer-hand' | 'sit-with' | 'tap-kind-action';
export type MovementTier = 'A' | 'B';
export type ExpressionState = 'neutral' | 'worried_sad' | 'excited_glow';

export type SafetyFlag =
  | 'none'
  | 'pii'
  | 'profanity'
  | 'jailbreak'
  | 'distress'
  | 'off_topic'
  | 'unsafe_advice'
  | 'input_length';

// ── Avatar ────────────────────────────────────────────────────────────────────

export type SkinTone = 'tone_1' | 'tone_2' | 'tone_3' | 'tone_4' | 'tone_5';
export type HairStyle = 'hair_curly' | 'hair_straight' | 'hair_braids' | 'hair_short' | 'hair_puffs';

export interface AvatarConfig {
  skinTone: SkinTone;
  hair: HairStyle;
}

// ── Chapter / scene content model (spec §2.3, §9.2) ──────────────────────────

export interface ChapterConfig {
  chapterId: string;
  title: string;
  ageBand: AgeBand;
  movementTier: MovementTier;
  inputProfile: 'keyboard_mouse' | 'touch_ext';
  entrySceneId: string;
  nextChapterId: string | null;
  visibleMeters: SkillId[];
  safetyOverrides?: { disablePlayfulExternalization?: boolean };
}

export interface ContentGovernance {
  version: string;
  owner: string;
  approvalState: 'draft' | 'sme_review' | 'approved';
  lastSmeReviewDate: string;
}

export interface SceneCharacter {
  assetRef: string;
  id: string;
  position: [number, number];
  expression?: string;
}

export interface SceneFx {
  assetRef: string;
  id: string;
  position: [number, number];
  variant?: string;
}

export interface SceneTrigger {
  id: string;
  bounds: [number, number, number, number]; // x, y, w, h in logical px
  action: 'startDecision' | 'goToScene' | 'completeChapter';
  target: string;
}

export interface SceneCollectible {
  id: string;
  assetRef: string;
  position: [number, number];
  kind: string;
  gate?: string;
}

/** W4-style participatory interaction: N taps to complete (spec §22 Phase 2). */
export interface SceneClimb {
  taps: number;
  prompt: string;
  tapLabel: string;
}

export interface Scene extends ContentGovernance {
  id: string;
  chapterId: string;
  order: number;
  movementTier: MovementTier;
  background: string; // assetRef, never a file path (spec §2.2)
  narration?: string;
  avatarStart?: [number, number];
  characters: SceneCharacter[];
  triggers: SceneTrigger[];
  collectibles: SceneCollectible[];
  fx?: SceneFx[];
  decisionPoints: string[];
  climb?: SceneClimb;
}

// ── Decision points (spec §9.3) ───────────────────────────────────────────────

export interface ChoiceOption {
  id: string;
  label: string;
  icon?: string;
  selScore: ScoreBand;
  consequenceRef?: string;
}

export interface Consequence {
  band: ScoreBand;
  sceneId: string; // routing target; may be the same scene
  fx?: string[];
  meterDeltas?: Partial<Record<SkillId, number>>;
  repairAction?: RepairActionId | null;
  residue?: Record<string, ResidueLevel>; // npcId → residue effect
}

export interface EmotionalArc {
  childStateEntering: string;
  childStateExiting: Record<ScoreBand, string>;
  companionStance: Record<ScoreBand, string>;
  recoveryCadence: string;
}

export interface CompanionPromptContext {
  situation: string;
  npcEmotion: string;
  ageBand: AgeBand;
}

export interface DecisionPoint extends ContentGovernance {
  id: string;
  prompt: string;
  inputMode: 'choice' | 'typed' | 'both';
  themeSensitivity: ThemeSensitivity;
  selSkills: SkillId[];
  pivotLockMs?: number;
  options?: ChoiceOption[];
  typedRubricRef?: string;
  companionContext: CompanionPromptContext;
  consequences: Consequence[];
  emotionalArc: EmotionalArc;
}

// ── Game state (spec §10.1) ───────────────────────────────────────────────────

export interface GameEvent {
  ts: number;
  type:
    | 'scene_enter'
    | 'decision_resolved'
    | 'repair_completed'
    | 'collectible_found'
    | 'chapter_complete'
    | 'fallback_used'
    | 'safety_flag';
  sceneId?: string;
  decisionPointId?: string;
  band?: ScoreBand;
  npcId?: string;
  skillDeltas?: Partial<Record<SkillId, number>>;
  safetyFlag?: SafetyFlag;
}

export interface ChapterResidue {
  [npcId: string]: ResidueLevel;
}

export interface GameState {
  version: 1;
  profile: {
    childDisplayName?: string;
    ageBand: AgeBand;
    chapterId: string;
    avatar: AvatarConfig;
    companionName: string;
    companionArchetype: string;
    baselineStrength: string;
  };
  progress: {
    currentSceneId: string;
    chaptersUnlocked: string[];
    chaptersCompleted: string[];
    browniePoints: number;
    kindnessSparksFound: Record<string, string[]>;
  };
  meters: Record<SkillId, { fill: number; level: number }>;
  companion: { level: 1 | 2 | 3; appearanceRef: string };
  emotionalResidue: Record<string, ChapterResidue>;
  parentGate: { lastPassedChapter: string | null; pinHash?: string };
  flags: {
    demoMode: boolean;
    lastSafetyFlag: SafetyFlag | null;
    onboardingComplete: boolean;
  };
  eventLog: GameEvent[];
}

// ── Companion API contract (spec §11.2) ───────────────────────────────────────

export interface CompanionRequest {
  decisionPointId: string;
  sceneId: string;
  chapterId: string;
  ageBand: AgeBand;
  inputMode: 'choice' | 'typed';
  childInput: string;
  /** For choice input the band is authored on the option and is authoritative. */
  knownBand?: ScoreBand;
  companionContext: CompanionPromptContext;
  strengthsSnapshot: string[];
  companion: { name: string; archetype: string };
}

export interface CompanionResponse {
  scoreBand: ScoreBand;
  skill: SkillId;
  matchedCriterion: string;
  confidence: number;
  companionLine: string;
  redirect: boolean;
  safetyFlag: SafetyFlag;
  fallbackReason?: string;
}

// ── Persistence (spec §12.1) ──────────────────────────────────────────────────

export interface ProgressStore {
  load(): Promise<GameState | null>;
  save(state: GameState): Promise<void>;
  clear(): Promise<void>;
  appendEvent(event: GameEvent): Promise<void>;
}

// ── Asset manifest (spec §7.4) ────────────────────────────────────────────────

export interface ManifestEntry {
  file: string;
  width: number;
  height: number;
  anchor?: [number, number];
  bubbleAnchor?: [number, number];
  expressions?: Record<string, { frame: number; glow?: boolean }>;
  variants?: string[];
  levels?: Record<string, string>;
}

export interface AssetManifest {
  version: string;
  characters: Record<string, ManifestEntry>;
  backgrounds: Record<string, ManifestEntry>;
  fx: Record<string, ManifestEntry>;
  ui: Record<string, ManifestEntry>;
  collectibles: Record<string, ManifestEntry>;
}

// ── Non-PII telemetry (spec Appendix D.3) ─────────────────────────────────────

export interface TelemetryEvent {
  release: string;
  sessionMode: 'demo' | 'live' | 'local';
  eventName: 'scene_enter' | 'decision_resolved' | 'fallback_used' | 'asset_load_failed';
  sceneId?: string;
  decisionPointId?: string;
  scoreBand?: ScoreBand;
  safetyFlagCategory?: string;
  latencyBucketMs?: '0-500' | '501-1500' | '1501-3000' | '3001-8000' | 'timeout';
}

// ── Age-banded UI tokens (spec §6.4) ─────────────────────────────────────────

export const UI_TOKENS: Record<AgeBand, {
  hitTargetMinPx: number;
  dialogueFontPx: number;
  choiceCardHeight: number;
  meterShowsNumbers: boolean;
  typedInputEnabled: boolean;
}> = {
  '5-7': { hitTargetMinPx: 64, dialogueFontPx: 22, choiceCardHeight: 120, meterShowsNumbers: false, typedInputEnabled: false },
  '8-10': { hitTargetMinPx: 48, dialogueFontPx: 18, choiceCardHeight: 100, meterShowsNumbers: false, typedInputEnabled: true },
  '11-15': { hitTargetMinPx: 48, dialogueFontPx: 16, choiceCardHeight: 90, meterShowsNumbers: true, typedInputEnabled: true },
};

/** Playful externalization is hard-disabled for sensitive themes (spec §16.4). */
export function canUsePlayfulExternalization(dp: DecisionPoint): boolean {
  return dp.themeSensitivity === 'standard';
}

/** Expression selection from score band (spec §8.4). */
export function expressionForBand(band: ScoreBand, sensitivity: ThemeSensitivity): ExpressionState {
  if (band === 'strong') return 'excited_glow';
  if (band === 'poor' && sensitivity === 'standard') return 'worried_sad';
  return 'neutral';
}
