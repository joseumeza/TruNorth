/**
 * Layer 1 (input filter) and Layer 5 (output filter) of the five-layer safety
 * pipeline (spec §11.3). Server-side only; shared with the red-team suite.
 */

export type InputFilterResult =
  | { ok: true }
  | { ok: false; safetyFlag: 'input_length' | 'profanity' | 'pii' | 'jailbreak' | 'distress'; reason: string };

const INPUT_MAX_CHARS = 280;

const PROFANITY_PATTERNS: RegExp[] = [
  /\b(shit|fuck|bitch|asshole|bastard|dick|crap)\b/i,
  /\b(stupid idiot|shut up|i hate you|you suck)\b/i,
];

const PII_PATTERNS: RegExp[] = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // phone
  /\b[\w.+-]+@[\w-]+\.[\w.]+\b/, // email
  /\b(my (home )?address is|i live at|my house is at)\b/i,
  /\b(my last name is|my full name is)\b/i,
  /\b(my school is|i go to .{0,30}(school|elementary|middle school))\b/i,
  /(^|\s)@[a-z0-9_]{3,}/i, // social handle
  /\b(meet me|come to my house|where do you live)\b/i,
  /\b(snapchat|instagram|tiktok|discord|whatsapp)\b/i,
];

const JAILBREAK_PATTERNS: RegExp[] = [
  /\b(ignore|forget|disregard) (all |the |your |previous |prior )*(rules|instructions|prompt)\b/i,
  /\b(pretend|imagine|act as if) you (are|were) not\b/i,
  /\byou are (now|no longer)\b/i,
  /\b(system prompt|developer message|your instructions)\b/i,
  /\bact as\b/i,
  /\bjailbreak\b/i,
];

const DISTRESS_PATTERNS: RegExp[] = [
  /\b(hurt|kill) myself\b/i,
  /\bwant to (die|disappear|not exist)\b/i,
  /\bsuicide|self[- ]harm|cutting myself\b/i,
  /\b(hits|hurts) me at home\b/i,
  /\bnobody (loves|wants) me\b/i,
  /\bi hate my life\b/i,
];

export function inputFilter(childInput: string): InputFilterResult {
  const text = (childInput ?? '').trim();
  if (text.length > INPUT_MAX_CHARS) {
    return { ok: false, safetyFlag: 'input_length', reason: 'input exceeds length cap' };
  }
  // Distress is checked first: it must never be masked by another category.
  if (DISTRESS_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, safetyFlag: 'distress', reason: 'distress signal detected' };
  }
  if (PII_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, safetyFlag: 'pii', reason: 'possible personal information' };
  }
  if (JAILBREAK_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, safetyFlag: 'jailbreak', reason: 'instruction-override attempt' };
  }
  if (PROFANITY_PATTERNS.some((re) => re.test(text))) {
    return { ok: false, safetyFlag: 'profanity', reason: 'profanity or hostility' };
  }
  return { ok: true };
}

export type OutputFilterResult = { ok: true } | { ok: false; reason: string };

const OUTPUT_BANNED_PATTERNS: RegExp[] = [
  /\b(diagnos\w*|therap\w*|medicat\w*|disorder|prescri\w*|clinical|anxiety disorder|depression)\b/i,
  /\b(your (address|phone|school|last name)|where (do )?you live|how old are you)\b/i,
  /\b(meet (me|up)|in real life|don'?t tell (your|a) (parent|grown[- ]?up|mom|dad))\b/i,
  /\b(keep (this|it) (a )?secret|our secret)\b/i,
  /https?:\/\//i,
  /<[a-z][\s\S]*>/i, // no markup in child-facing lines
];

const OUTPUT_MAX_CHARS = 360;

export function outputFilter(companionLine: string): OutputFilterResult {
  const text = (companionLine ?? '').trim();
  if (!text) return { ok: false, reason: 'empty line' };
  if (text.length > OUTPUT_MAX_CHARS) return { ok: false, reason: 'line exceeds length cap' };
  const banned = OUTPUT_BANNED_PATTERNS.find((re) => re.test(text));
  if (banned) return { ok: false, reason: `banned pattern: ${banned}` };
  return { ok: true };
}

/** Server-side split of long companion lines; client sequences click-through (spec §5.5). */
export function splitCompanionLine(line: string, maxLen = 120): string[] {
  const text = line.trim();
  if (text.length <= maxLen) return [text];
  const parts: string[] = [];
  let rest = text;
  while (rest.length > maxLen) {
    let cut = -1;
    for (const re of [/[.!?…]\s/g, /,\s/g, /\s/g]) {
      let match: RegExpExecArray | null;
      while ((match = re.exec(rest.slice(0, maxLen + 1))) !== null) {
        cut = Math.max(cut, match.index + match[0].length - 1);
      }
      if (cut > 20) break; // prefer sentence, then clause, then word boundaries
    }
    if (cut <= 0) cut = maxLen;
    parts.push(rest.slice(0, cut + 1).trim());
    rest = rest.slice(cut + 1).trim();
  }
  if (rest) parts.push(rest);
  return parts;
}
