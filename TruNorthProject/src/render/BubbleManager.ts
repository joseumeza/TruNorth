/**
 * Overhead dialogue bubbles (spec §5.5): DOM elements anchored to sprite head
 * anchors, progressive char-by-char reveal with tap-to-complete, click-through
 * sequencing for lines split at 120 chars, and an in-character thinking cue.
 */
import type { Viewport } from './Viewport';

const CHAR_INTERVAL_MS = 22;

export function splitBubbleText(line: string, maxLen = 120): string[] {
  const text = line.trim();
  if (text.length <= maxLen) return [text];
  const words = text.split(/\s+/);
  const parts: string[] = [];
  let current = '';
  for (const word of words) {
    if (current && (current + ' ' + word).length > maxLen) {
      parts.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) parts.push(current);
  return parts;
}

export class BubbleManager {
  private active: HTMLElement | null = null;
  private thinking: HTMLElement | null = null;

  constructor(private viewport: Viewport) {}

  /** One active bubble at a time (spec §5.5 speaker sequencing). */
  async showBubble(anchor: { x: number; y: number }, lines: string[], opts: { speaker?: string } = {}): Promise<void> {
    this.clear();
    const pages = lines.flatMap((l) => splitBubbleText(l));
    for (const page of pages) {
      await this.showPage(anchor, page, opts.speaker);
    }
    this.clear();
  }

  private showPage(anchor: { x: number; y: number }, text: string, speaker?: string): Promise<void> {
    return new Promise((resolve) => {
      this.clear();
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.setAttribute('role', 'status');
      if (speaker) bubble.dataset.speaker = speaker;

      const textEl = document.createElement('p');
      textEl.className = 'bubble-text';
      bubble.appendChild(textEl);
      const hint = document.createElement('span');
      hint.className = 'bubble-hint';
      hint.textContent = '▸';
      bubble.appendChild(hint);

      this.position(bubble, anchor);
      this.viewport.layers.bubbles.appendChild(bubble);
      this.active = bubble;

      // Progressive reveal state machine: revealing → complete → advance (spec §5.5).
      let shown = 0;
      let done = false;
      const timer = setInterval(() => {
        shown += 1;
        textEl.textContent = text.slice(0, shown);
        if (shown >= text.length) {
          clearInterval(timer);
          done = true;
          bubble.classList.add('bubble-done');
        }
      }, CHAR_INTERVAL_MS);

      const onTap = () => {
        if (!done) {
          // Tap-to-complete: finish the reveal first.
          clearInterval(timer);
          textEl.textContent = text;
          done = true;
          bubble.classList.add('bubble-done');
        } else {
          bubble.removeEventListener('click', onTap);
          window.removeEventListener('keydown', onKey);
          resolve();
        }
      };
      const onKey = (e: KeyboardEvent) => {
        if (e.code === 'Enter' || e.code === 'Space') onTap();
      };
      bubble.addEventListener('click', onTap);
      window.addEventListener('keydown', onKey);
    });
  }

  private position(bubble: HTMLElement, anchor: { x: number; y: number }): void {
    const width = 460;
    const x = Math.min(1920 - width - 20, Math.max(20, anchor.x - width / 2));
    // Flip below the head when too close to the top edge (spec §5.5).
    const flip = anchor.y < 180;
    bubble.style.left = `${x}px`;
    bubble.style.width = `${width}px`;
    if (flip) {
      bubble.style.top = `${anchor.y + 190}px`;
      bubble.classList.add('bubble-below');
    } else {
      bubble.style.bottom = `${1080 - anchor.y}px`;
    }
  }

  /** In-character thinking cue — not a spinner (spec §5.4). Shown after 300 ms. */
  showThinking(anchor: { x: number; y: number }, companionName: string): () => void {
    let cancelled = false;
    const timer = setTimeout(() => {
      if (cancelled) return;
      const el = document.createElement('div');
      el.className = 'bubble bubble-thinking';
      el.setAttribute('role', 'status');
      const p = document.createElement('p');
      p.className = 'bubble-text';
      p.textContent = `${companionName} is thinking`;
      const dots = document.createElement('span');
      dots.className = 'thinking-dots';
      dots.textContent = '...';
      p.appendChild(dots);
      el.appendChild(p);
      this.position(el, anchor);
      this.viewport.layers.bubbles.appendChild(el);
      this.thinking = el;
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      this.thinking?.remove();
      this.thinking = null;
    };
  }

  /** Narration rendered as a storybook bar; click/Enter to continue. */
  async showNarration(text: string): Promise<void> {
    this.clear();
    return new Promise((resolve) => {
      const bar = document.createElement('div');
      bar.className = 'narration-bar';
      bar.setAttribute('role', 'status');
      const p = document.createElement('p');
      p.textContent = text;
      bar.appendChild(p);
      const btn = document.createElement('button');
      btn.className = 'narration-continue';
      btn.textContent = 'Continue ▸';
      bar.appendChild(btn);
      this.viewport.layers.bubbles.appendChild(bar);
      this.active = bar;
      const finish = () => {
        bar.remove();
        this.active = null;
        resolve();
      };
      btn.addEventListener('click', finish, { once: true });
      btn.focus();
    });
  }

  clear(): void {
    this.active?.remove();
    this.active = null;
    this.thinking?.remove();
    this.thinking = null;
  }
}
