/**
 * Decision surface (spec §6.2 game.decision): large choice cards and/or a
 * scoped typed field — never a free-form chat surface. Enforces pivotLockMs
 * (spec §5.5) and age-banded hit targets/fonts (spec §6.4). Fully keyboard
 * operable (spec §20).
 */
import type { AgeBand, ChoiceOption, DecisionPoint } from '../types';
import { UI_TOKENS } from '../types';
import type { Viewport } from '../render/Viewport';

export type ChoiceResult = { kind: 'choice'; option: ChoiceOption } | { kind: 'typed'; text: string };

const OPTION_ICONS: Record<string, string> = {
  icon_helping_hand: '🤝',
  icon_wave: '👋',
  icon_swing: '🛝',
  icon_watch: '👀',
  icon_hurry: '🏃',
};

const TYPED_MAX_CHARS = 200;

export class ChoicePanel {
  private el: HTMLElement | null = null;

  constructor(private viewport: Viewport) {}

  show(dp: DecisionPoint, ageBand: AgeBand): Promise<ChoiceResult> {
    this.hide();
    const tokens = UI_TOKENS[ageBand];
    return new Promise((resolve) => {
      const panel = document.createElement('div');
      panel.className = 'choice-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', dp.prompt);
      panel.style.setProperty('--dialogue-font', `${tokens.dialogueFontPx + 4}px`);
      panel.style.setProperty('--hit-target', `${tokens.hitTargetMinPx}px`);

      const prompt = document.createElement('h2');
      prompt.className = 'choice-prompt';
      prompt.textContent = dp.prompt;
      panel.appendChild(prompt);

      const finish = (result: ChoiceResult) => {
        this.hide();
        resolve(result);
      };

      const lockedControls: (HTMLButtonElement | HTMLInputElement)[] = [];

      if (dp.inputMode !== 'typed' && dp.options?.length) {
        const list = document.createElement('div');
        list.className = 'choice-cards';
        for (const option of dp.options) {
          const card = document.createElement('button');
          card.className = 'choice-card';
          card.style.minHeight = `${tokens.choiceCardHeight}px`;
          const icon = document.createElement('span');
          icon.className = 'choice-icon';
          icon.setAttribute('aria-hidden', 'true');
          icon.textContent = OPTION_ICONS[option.icon ?? ''] ?? '💬';
          card.appendChild(icon);
          const label = document.createElement('span');
          label.textContent = option.label;
          card.appendChild(label);
          card.addEventListener('click', () => finish({ kind: 'choice', option }));
          list.appendChild(card);
          lockedControls.push(card);
        }
        panel.appendChild(list);
      }

      if (dp.inputMode !== 'choice' && tokens.typedInputEnabled) {
        const form = document.createElement('form');
        form.className = 'typed-form';
        const input = document.createElement('input');
        input.type = 'text';
        input.maxLength = TYPED_MAX_CHARS;
        input.placeholder = 'Or type what you would say…';
        input.setAttribute('aria-label', 'Type what you would say');
        input.autocomplete = 'off';
        form.appendChild(input);
        const submit = document.createElement('button');
        submit.type = 'submit';
        submit.textContent = 'Say it';
        form.appendChild(submit);
        form.addEventListener('submit', (e) => {
          e.preventDefault();
          const text = input.value.trim();
          if (text) finish({ kind: 'typed', text });
        });
        panel.appendChild(form);
        lockedControls.push(input, submit);
      }

      // pivotLockMs: a settle beat at emotional pivots before input unlocks (spec §5.5).
      const lockMs = dp.pivotLockMs ?? 0;
      if (lockMs > 0) {
        panel.classList.add('choice-locked');
        for (const control of lockedControls) control.disabled = true;
        setTimeout(() => {
          panel.classList.remove('choice-locked');
          for (const control of lockedControls) control.disabled = false;
          (lockedControls[0] as HTMLElement | undefined)?.focus();
        }, lockMs);
      } else {
        setTimeout(() => (lockedControls[0] as HTMLElement | undefined)?.focus(), 0);
      }

      this.el = panel;
      this.viewport.layers.overlay.appendChild(panel);
    });
  }

  hide(): void {
    this.el?.remove();
    this.el = null;
  }
}
