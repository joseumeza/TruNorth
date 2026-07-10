/**
 * Parent gate (spec §13.1): child-resistant PIN or math challenge on a
 * distinct grown-up surface — cool/dark palette, no companion present.
 * 3 failures → 45 s cooldown. PIN is stored only as a SHA-256 hash.
 */
import type { Viewport } from '../render/Viewport';

export async function hashPin(pin: string): Promise<string> {
  const data = new TextEncoder().encode(`trunorth:${pin}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const MAX_FAILS = 3;
const COOLDOWN_S = 45;

export class ParentGate {
  constructor(
    private viewport: Viewport,
    private onShowTrust: () => Promise<void>,
  ) {}

  /** Resolves true when the grown-up passes the gate. */
  show(pinHash: string | undefined): Promise<boolean> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'overlay parent-surface parent-gate';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'Grown-ups only');

      const box = document.createElement('div');
      box.className = 'parent-box';
      const title = document.createElement('h2');
      title.textContent = '🔒 Grown-ups only';
      box.appendChild(title);

      const sub = document.createElement('p');
      sub.className = 'parent-sub';
      box.appendChild(sub);

      const form = document.createElement('form');
      const input = document.createElement('input');
      input.autocomplete = 'off';
      const submit = document.createElement('button');
      submit.type = 'submit';
      submit.textContent = 'Unlock';
      form.append(input, submit);
      box.appendChild(form);

      const message = document.createElement('p');
      message.className = 'parent-message';
      message.setAttribute('role', 'alert');
      box.appendChild(message);

      const trustBtn = document.createElement('button');
      trustBtn.className = 'link-button';
      trustBtn.textContent = 'How TruNorth keeps kids safe';
      trustBtn.addEventListener('click', () => void this.onShowTrust());
      box.appendChild(trustBtn);

      overlay.appendChild(box);
      this.viewport.layers.overlay.appendChild(overlay);

      // Math challenge when no PIN is configured (e.g. demo mode).
      let mathAnswer = 0;
      const newChallenge = () => {
        if (pinHash) {
          sub.textContent = 'Enter your 4-digit PIN to continue.';
          input.type = 'password';
          input.inputMode = 'numeric';
          input.maxLength = 4;
          input.setAttribute('aria-label', 'Parent PIN');
        } else {
          const a = 3 + Math.floor(Math.random() * 6);
          const b = 4 + Math.floor(Math.random() * 6);
          mathAnswer = a * b;
          sub.textContent = `Solve to continue: what is ${a} × ${b}?`;
          input.type = 'text';
          input.inputMode = 'numeric';
          input.maxLength = 3;
          input.setAttribute('aria-label', 'Math answer');
        }
        input.value = '';
        input.focus();
      };
      newChallenge();

      let fails = 0;
      let coolingDown = false;
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (coolingDown) return;
        const value = input.value.trim();
        const passed = pinHash ? (await hashPin(value)) === pinHash : Number(value) === mathAnswer;
        if (passed) {
          overlay.remove();
          resolve(true);
          return;
        }
        fails += 1;
        if (fails >= MAX_FAILS) {
          // Cooldown, then return to safe idle (spec §13.1 fail behavior).
          coolingDown = true;
          input.disabled = true;
          submit.disabled = true;
          let remaining = COOLDOWN_S;
          message.textContent = `Let's take a break — try again in ${remaining}s.`;
          const timer = setInterval(() => {
            remaining -= 1;
            message.textContent = `Let's take a break — try again in ${remaining}s.`;
            if (remaining <= 0) {
              clearInterval(timer);
              coolingDown = false;
              fails = 0;
              input.disabled = false;
              submit.disabled = false;
              message.textContent = '';
              newChallenge();
            }
          }, 1000);
        } else {
          message.textContent = 'Not quite — try again.';
          newChallenge();
        }
      });
    });
  }
}
