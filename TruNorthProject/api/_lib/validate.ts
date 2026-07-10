/**
 * Layer 4: strict parse + enum validation of the model's JSON output (spec §11.3).
 * Malformed or out-of-contract output must fall back — never reach the child.
 */

const BANDS = ['strong', 'partial', 'poor'] as const;
const SKILLS = ['empathy', 'calm', 'courage', 'self_worth', 'adapting_to_change', 'friendship_repair', 'worry_brave'] as const;
const FLAGS = ['none', 'pii', 'profanity', 'jailbreak', 'distress', 'off_topic', 'unsafe_advice', 'input_length'] as const;

export interface ValidatedResponse {
  scoreBand: (typeof BANDS)[number];
  skill: (typeof SKILLS)[number];
  matchedCriterion: string;
  confidence: number;
  companionLine: string;
  redirect: boolean;
  safetyFlag: (typeof FLAGS)[number];
}

export function parseAndValidateModelOutput(raw: string): ValidatedResponse | null {
  let data: unknown;
  try {
    // Tolerate accidental markdown fencing, nothing else.
    const stripped = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    data = JSON.parse(stripped);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const r = data as Record<string, unknown>;
  if (!BANDS.includes(r.scoreBand as never)) return null;
  if (!SKILLS.includes(r.skill as never)) return null;
  if (typeof r.matchedCriterion !== 'string') return null;
  if (typeof r.confidence !== 'number' || r.confidence < 0 || r.confidence > 1) return null;
  if (typeof r.companionLine !== 'string' || r.companionLine.length === 0 || r.companionLine.length > 360) return null;
  if (typeof r.redirect !== 'boolean') return null;
  if (!FLAGS.includes(r.safetyFlag as never)) return null;
  return r as unknown as ValidatedResponse;
}
