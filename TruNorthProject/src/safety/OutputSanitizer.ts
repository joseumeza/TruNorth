/**
 * Client-side output sanitization — defense in depth behind the server output
 * filter (spec §11.3 layer 5, §16.1 XSS row). All child-facing text is rendered
 * with textContent (never innerHTML); this module additionally strips control
 * characters, enforces length, and swaps banned content for a safe line.
 */
import { globalLine } from '../content/fallbackLines';

const MAX_LINE_CHARS = 360;

const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

const BANNED_PATTERNS: RegExp[] = [
  /<[a-z][\s\S]*>/i, // markup of any kind
  /https?:\/\//i,
  /\b(diagnos\w*|therap\w*|medicat\w*|prescri\w*)\b/i,
  /\b(your (address|phone|school|last name))\b/i,
  /\b(meet (me|up)|keep (this|it) (a )?secret|don'?t tell)\b/i,
];

export class OutputSanitizer {
  /** Returns a safe display string; substitutes an approved line if unsafe. */
  sanitize(line: string): string {
    let text = (line ?? '').replace(CONTROL_CHARS, '').trim();
    if (!text) return globalLine('error');
    if (text.length > MAX_LINE_CHARS) text = `${text.slice(0, MAX_LINE_CHARS - 1)}…`;
    if (BANNED_PATTERNS.some((re) => re.test(text))) return globalLine('safety_redirect');
    return text;
  }

  sanitizeAll(lines: string[]): string[] {
    const out = lines.map((l) => this.sanitize(l)).filter(Boolean);
    return out.length > 0 ? out : [globalLine('error')];
  }
}
