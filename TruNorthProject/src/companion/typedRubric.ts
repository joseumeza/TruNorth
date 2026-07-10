/**
 * Offline typed-input scoring heuristic used by DemoCompanionClient only.
 * Live mode scores typed input server-side against the scoped rubric (spec §11).
 * Mirrors the rubric shape: strong = names/accepts the feeling AND offers
 * support; partial = kind but distant; poor = dismissive or pressuring.
 */
import type { ScoreBand } from '../types';

const SUPPORT_PATTERNS: RegExp[] = [
  /\b(it'?s (okay|ok|alright) (to feel|to be))\b/i,
  /\b(together|with you|i'?ll (go|come|stay|help)|hold my hand)\b/i,
  /\b(first step|one step|one rung|try a little|start small)\b/i,
  /\b(i understand|i get it|that sounds (hard|scary))\b/i,
];

const FEELING_PATTERNS: RegExp[] = [
  /\b(scared|afraid|worried|worry|nervous|frightened|anxious|lonely|sad)\b/i,
];

const KINDNESS_PATTERNS: RegExp[] = [
  /\b(you can do it|believe in you|you'?re (brave|strong)|it will be (okay|ok|fine))\b/i,
  /\b(want to play|come play|join us)\b/i,
];

const DISMISSIVE_PATTERNS: RegExp[] = [
  /\b(just (climb|do it|go)|hurry( up)?|come on)\b/i,
  /\b(not (even )?scary|nothing to be scared|don'?t be (scared|a baby)|scaredy|baby|chicken)\b/i,
  /\b(whatever|who cares|boring|stop (whining|crying))\b/i,
];

export function scoreTypedInput(text: string): { band: ScoreBand; matchedCriterion: string } {
  const t = text.trim();
  if (DISMISSIVE_PATTERNS.some((re) => re.test(t))) {
    return { band: 'poor', matchedCriterion: 'dismisses_feeling' };
  }
  const namesFeeling = FEELING_PATTERNS.some((re) => re.test(t));
  const offersSupport = SUPPORT_PATTERNS.some((re) => re.test(t));
  if (namesFeeling && offersSupport) {
    return { band: 'strong', matchedCriterion: 'names_feeling_and_supports' };
  }
  if (offersSupport || namesFeeling || KINDNESS_PATTERNS.some((re) => re.test(t))) {
    return { band: 'partial', matchedCriterion: 'kind_but_general' };
  }
  return { band: 'partial', matchedCriterion: 'unclear_response' };
}
