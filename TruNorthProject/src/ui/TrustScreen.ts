/**
 * Parent trust screen (spec §13.3): plain-language companion boundaries and
 * data controls. Static authored content; grown-up palette.
 */
import type { Viewport } from '../render/Viewport';

const TRUST_POINTS: [string, string][] = [
  ['A fixed character, not open chat', 'The companion only responds to the story moment your child is in. There is no free-form chat, ever.'],
  ['No personal information', 'The companion never asks for names, school, location, or contact details, and typed input is screened before anything is scored.'],
  ['No secrets from you', 'The companion never suggests meeting anyone or keeping secrets from caregivers. Big feelings are always pointed back to a trusted grown-up.'],
  ['Keys stay on the server', 'The AI service is called from our server only. No API keys or AI access exist in the browser.'],
  ['Data stays on this device', 'Progress is saved locally in this browser. Clearing it from the pause menu (or your browser settings) deletes everything. Nothing is uploaded.'],
  ['If your child seems upset', 'When typed words suggest distress, the companion responds with a calm, approved message that encourages talking to a trusted grown-up — it never plays therapist.'],
];

export class TrustScreen {
  constructor(private viewport: Viewport) {}

  show(): Promise<void> {
    return new Promise((resolve) => {
      const overlay = document.createElement('div');
      overlay.className = 'overlay parent-surface trust-screen';
      overlay.setAttribute('role', 'dialog');
      overlay.setAttribute('aria-label', 'How TruNorth keeps kids safe');

      const box = document.createElement('div');
      box.className = 'parent-box trust-box';
      const title = document.createElement('h2');
      title.textContent = 'How TruNorth keeps kids safe';
      box.appendChild(title);

      for (const [heading, body] of TRUST_POINTS) {
        const h = document.createElement('h3');
        h.textContent = heading;
        const p = document.createElement('p');
        p.textContent = body;
        box.append(h, p);
      }

      const close = document.createElement('button');
      close.textContent = 'Close';
      close.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
      box.appendChild(close);
      overlay.appendChild(box);
      this.viewport.layers.overlay.appendChild(overlay);
      close.focus();
    });
  }
}
