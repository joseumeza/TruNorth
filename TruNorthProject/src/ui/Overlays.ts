/**
 * Small full-screen surfaces: celebration (spec §6.2 game.celebration), pause
 * (calm freeze frame), repair gesture prompts (spec §9.6), the distress
 * support surface (spec §11.1), and the in-character resume beat.
 */
import type { RepairActionId, SkillId } from '../types';
import type { Viewport } from '../render/Viewport';

const SKILL_LABELS: Record<SkillId, string> = {
  empathy: 'Empathy 💗',
  calm: 'Calm 🌊',
  courage: 'Courage 🦁',
  self_worth: 'Self-Worth 🌟',
  adapting_to_change: 'Adapting 🦋',
  friendship_repair: 'Friendship 🤝',
  worry_brave: 'Worry & Brave ⛅',
};

const REPAIR_META: Record<Exclude<RepairActionId, 'walk-back'>, { icon: string; label: string; instruction: string }> = {
  'offer-hand': { icon: '🤝', label: 'Offer a hand', instruction: 'Reach out and offer a hand.' },
  'sit-with': { icon: '🧎', label: 'Sit with them', instruction: 'Sit with your friend for a moment.' },
  'tap-kind-action': { icon: '💛', label: 'Do a kind thing', instruction: 'Do one small kind thing.' },
};

export class Overlays {
  constructor(private viewport: Viewport) {}

  private overlayEl(className: string): HTMLElement {
    const el = document.createElement('div');
    el.className = `overlay ${className}`;
    this.viewport.layers.overlay.appendChild(el);
    return el;
  }

  /** Chapter-end celebration: high-saturation payoff + optional recap. */
  celebration(chapterTitle: string, grownSkills: SkillId[], sparks: number): Promise<void> {
    return new Promise((resolve) => {
      const overlay = this.overlayEl('celebration');
      const box = document.createElement('div');
      box.className = 'celebration-box';
      const img = document.createElement('img');
      img.src = '/assets/ui/celebration_worry_brave.svg';
      img.alt = '';
      img.className = 'celebration-burst';
      box.appendChild(img);
      const title = document.createElement('h2');
      title.textContent = `You did it! ${chapterTitle}`;
      box.appendChild(title);
      if (grownSkills.length > 0) {
        const recap = document.createElement('p');
        recap.textContent = `You grew: ${grownSkills.map((s) => SKILL_LABELS[s]).join(' · ')}`;
        box.appendChild(recap);
      }
      if (sparks > 0) {
        const sparkLine = document.createElement('p');
        sparkLine.textContent = `✨ Kindness sparks found: ${sparks}`;
        box.appendChild(sparkLine);
      }
      const btn = document.createElement('button');
      btn.className = 'primary-button';
      btn.textContent = 'Keep going';
      btn.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
      box.appendChild(btn);
      overlay.appendChild(box);
      btn.focus();
    });
  }

  /** Calm pause freeze frame; resolves with whether to clear the save. */
  pause(onClearSave: (() => Promise<void>) | null): Promise<void> {
    return new Promise((resolve) => {
      const overlay = this.overlayEl('pause');
      const box = document.createElement('div');
      box.className = 'pause-box';
      const title = document.createElement('h2');
      title.textContent = 'Taking a breather';
      box.appendChild(title);
      const resume = document.createElement('button');
      resume.className = 'primary-button';
      resume.textContent = 'Back to the story';
      resume.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
      box.appendChild(resume);
      if (onClearSave) {
        const clear = document.createElement('button');
        clear.className = 'link-button';
        clear.textContent = 'Erase progress and start over';
        clear.addEventListener('click', async () => {
          await onClearSave();
          location.reload();
        });
        box.appendChild(clear);
      }
      overlay.appendChild(box);
      resume.focus();
    });
  }

  /** Gesture repair (offer-hand / sit-with / tap-kind-action, spec §9.6). */
  repairGesture(action: Exclude<RepairActionId, 'walk-back'>): Promise<void> {
    return new Promise((resolve) => {
      const meta = REPAIR_META[action];
      const overlay = this.overlayEl('repair');
      const box = document.createElement('div');
      box.className = 'repair-box';
      const instruction = document.createElement('p');
      instruction.textContent = meta.instruction;
      box.appendChild(instruction);
      const btn = document.createElement('button');
      btn.className = 'repair-button';
      btn.textContent = `${meta.icon} ${meta.label}`;
      btn.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
      box.appendChild(btn);
      overlay.appendChild(box);
      btn.focus();
    });
  }

  /** Non-blocking instruction banner (walk-back repair). Returns a remover. */
  banner(text: string): () => void {
    const el = document.createElement('div');
    el.className = 'instruction-banner';
    el.setAttribute('role', 'status');
    el.textContent = text;
    this.viewport.layers.overlay.appendChild(el);
    return () => el.remove();
  }

  /** Distress support surface — gentle, authored, points to a trusted grown-up. */
  distressSupport(): Promise<void> {
    return new Promise((resolve) => {
      const overlay = this.overlayEl('distress');
      const box = document.createElement('div');
      box.className = 'distress-box';
      const title = document.createElement('h2');
      title.textContent = 'That sounds like a big feeling 💛';
      box.appendChild(title);
      const p1 = document.createElement('p');
      p1.textContent = 'Some feelings are too big to carry alone — and that is never your fault.';
      const p2 = document.createElement('p');
      p2.textContent = 'The bravest thing you can do is tell a grown-up you trust: a parent, a teacher, or someone who takes care of you.';
      box.append(p1, p2);
      const btn = document.createElement('button');
      btn.className = 'primary-button';
      btn.textContent = 'Okay';
      btn.addEventListener('click', () => {
        overlay.remove();
        resolve();
      });
      box.appendChild(btn);
      overlay.appendChild(box);
      btn.focus();
    });
  }
}
