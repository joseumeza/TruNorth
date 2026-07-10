/**
 * Onboarding (spec §6.2): parent setup (age band + optional PIN + trust
 * summary), then the child flow — companion archetype + naming (no PII
 * encouragement), avatar picker (5×5, no text required), baseline strength.
 */
import type { AgeBand, AvatarConfig, HairStyle, SkinTone } from '../types';
import type { Viewport } from '../render/Viewport';
import type { NewGameProfile } from '../store/GameStateFactory';
import { hashPin } from './ParentGate';
import type { TrustScreen } from './TrustScreen';

const NAME_SUGGESTIONS = ['Pip', 'Spark', 'Buddy', 'Luna', 'Ash'];
const NAME_PATTERN = /^[A-Za-z][A-Za-z' -]{0,19}$/;
const NAME_BLOCKLIST = /\b(damn|hell|stupid|butt|poop)\b/i;

const SKIN_TONES: SkinTone[] = ['tone_1', 'tone_2', 'tone_3', 'tone_4', 'tone_5'];
const SKIN_HEX: Record<SkinTone, string> = {
  tone_1: '#f6d7b8', tone_2: '#e0ac7e', tone_3: '#c68955', tone_4: '#9c6b3f', tone_5: '#6f4a2b',
};
const HAIR_STYLES: [HairStyle, string][] = [
  ['hair_curly', 'Curly'], ['hair_straight', 'Straight'], ['hair_braids', 'Braids'], ['hair_short', 'Short'], ['hair_puffs', 'Puffs'],
];
const STRENGTHS: [string, string, string][] = [
  ['empathy', '💗', 'I notice how friends feel'],
  ['calm', '🌊', 'I can take big deep breaths'],
  ['courage', '🦁', 'I try new things'],
  ['worry_brave', '⛅', 'I keep going when I am worried'],
];

export class OnboardingFlow {
  constructor(
    private viewport: Viewport,
    private trustScreen: TrustScreen,
    private firstChapterId: string,
  ) {}

  async run(): Promise<NewGameProfile> {
    const parent = await this.parentStep();
    const companion = await this.companionStep();
    const avatar = await this.avatarStep();
    const baselineStrength = await this.strengthStep();
    return {
      ageBand: parent.ageBand,
      pinHash: parent.pinHash,
      chapterId: this.firstChapterId,
      avatar,
      companionName: companion.name,
      companionArchetype: companion.archetype,
      baselineStrength,
      demoMode: false,
    };
  }

  private screen(className: string): { overlay: HTMLElement; box: HTMLElement } {
    const overlay = document.createElement('div');
    overlay.className = `overlay onboarding ${className}`;
    const box = document.createElement('div');
    box.className = 'onboarding-box';
    overlay.appendChild(box);
    this.viewport.layers.overlay.appendChild(overlay);
    return { overlay, box };
  }

  /** onboarding.parent — grown-up palette; age band + PIN + consent summary. */
  private parentStep(): Promise<{ ageBand: AgeBand; pinHash?: string }> {
    return new Promise((resolve) => {
      const { overlay, box } = this.screen('parent-surface');
      const title = document.createElement('h2');
      title.textContent = 'Grown-up setup';
      box.appendChild(title);

      const trust = document.createElement('p');
      trust.className = 'parent-sub';
      trust.textContent =
        'TruNorth is a guided story with a scoped AI companion: no open chat, no personal data collection, progress stays on this device.';
      box.appendChild(trust);
      const trustBtn = document.createElement('button');
      trustBtn.className = 'link-button';
      trustBtn.textContent = 'Read the full safety summary';
      trustBtn.addEventListener('click', () => void this.trustScreen.show());
      box.appendChild(trustBtn);

      const ageLabel = document.createElement('h3');
      ageLabel.textContent = "Your child's age";
      box.appendChild(ageLabel);
      const ageRow = document.createElement('div');
      ageRow.className = 'pick-row';
      let ageBand: AgeBand = '8-10';
      const ageButtons: HTMLButtonElement[] = [];
      for (const band of ['5-7', '8-10', '11-15'] as AgeBand[]) {
        const btn = document.createElement('button');
        btn.textContent = band;
        btn.classList.toggle('selected', band === ageBand);
        btn.addEventListener('click', () => {
          ageBand = band;
          for (const b of ageButtons) b.classList.toggle('selected', b === btn);
        });
        ageButtons.push(btn);
        ageRow.appendChild(btn);
      }
      box.appendChild(ageRow);

      const pinLabel = document.createElement('h3');
      pinLabel.textContent = 'Set a 4-digit PIN (optional)';
      box.appendChild(pinLabel);
      const pinInput = document.createElement('input');
      pinInput.type = 'password';
      pinInput.inputMode = 'numeric';
      pinInput.maxLength = 4;
      pinInput.placeholder = '• • • •';
      pinInput.setAttribute('aria-label', 'Parent PIN');
      box.appendChild(pinInput);
      const pinHint = document.createElement('p');
      pinHint.className = 'parent-sub';
      pinHint.textContent = 'The PIN guards grown-up screens between chapters. Skip it to use a math challenge instead.';
      box.appendChild(pinHint);

      const next = document.createElement('button');
      next.className = 'primary-button';
      next.textContent = 'Start the adventure';
      next.addEventListener('click', async () => {
        const pin = pinInput.value.trim();
        if (pin && !/^\d{4}$/.test(pin)) {
          pinHint.textContent = 'PIN must be exactly 4 digits (or leave it empty).';
          return;
        }
        const pinHash = pin ? await hashPin(pin) : undefined;
        overlay.remove();
        resolve({ ageBand, pinHash });
      });
      box.appendChild(next);
    });
  }

  /** onboarding.companion — archetype picker + naming; no PII encouragement. */
  private companionStep(): Promise<{ archetype: string; name: string }> {
    return new Promise((resolve) => {
      const { overlay, box } = this.screen('child-surface');
      const title = document.createElement('h2');
      title.textContent = 'Choose your companion!';
      box.appendChild(title);

      let archetype = 'companion_fox';
      const row = document.createElement('div');
      row.className = 'pick-row';
      const cards: HTMLButtonElement[] = [];
      for (const [id, img, label] of [
        ['companion_fox', '/assets/characters/companion_fox.svg', 'Fox friend'],
        ['companion_sprite', '/assets/characters/companion_sprite.svg', 'Magic sprite'],
      ] as const) {
        const card = document.createElement('button');
        card.className = 'pick-card';
        const image = document.createElement('img');
        image.src = img;
        image.alt = label;
        card.appendChild(image);
        const caption = document.createElement('span');
        caption.textContent = label;
        card.appendChild(caption);
        card.classList.toggle('selected', id === archetype);
        card.addEventListener('click', () => {
          archetype = id;
          for (const c of cards) c.classList.toggle('selected', c === card);
        });
        cards.push(card);
        row.appendChild(card);
      }
      box.appendChild(row);

      const nameLabel = document.createElement('h3');
      nameLabel.textContent = 'Give your companion a fun made-up name';
      box.appendChild(nameLabel);
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.maxLength = 20;
      nameInput.placeholder = 'Pip';
      nameInput.setAttribute('aria-label', 'Companion name');
      box.appendChild(nameInput);
      const suggestRow = document.createElement('div');
      suggestRow.className = 'pick-row suggest-row';
      for (const suggestion of NAME_SUGGESTIONS) {
        const chip = document.createElement('button');
        chip.className = 'chip';
        chip.textContent = suggestion;
        chip.addEventListener('click', () => (nameInput.value = suggestion));
        suggestRow.appendChild(chip);
      }
      box.appendChild(suggestRow);
      const hint = document.createElement('p');
      hint.className = 'field-hint';
      box.appendChild(hint);

      const next = document.createElement('button');
      next.className = 'primary-button';
      next.textContent = 'Next';
      next.addEventListener('click', () => {
        const name = nameInput.value.trim() || 'Pip';
        // Validation (spec §8.3): max 20 chars, letters only, gentle blocklist.
        if (!NAME_PATTERN.test(name) || NAME_BLOCKLIST.test(name)) {
          hint.textContent = 'Try a short made-up name with letters only!';
          return;
        }
        overlay.remove();
        resolve({ archetype, name });
      });
      box.appendChild(next);
    });
  }

  /** onboarding.avatar — 5×5 grid, large hit targets, no text required. */
  private avatarStep(): Promise<AvatarConfig> {
    return new Promise((resolve) => {
      const { overlay, box } = this.screen('child-surface');
      const title = document.createElement('h2');
      title.textContent = 'Make your explorer!';
      box.appendChild(title);

      let skinTone: SkinTone = 'tone_2';
      let hair: HairStyle = 'hair_short';

      const toneRow = document.createElement('div');
      toneRow.className = 'pick-row';
      const toneButtons: HTMLButtonElement[] = [];
      for (const tone of SKIN_TONES) {
        const btn = document.createElement('button');
        btn.className = 'tone-swatch';
        btn.style.background = SKIN_HEX[tone];
        btn.setAttribute('aria-label', `Skin tone ${tone.slice(-1)}`);
        btn.classList.toggle('selected', tone === skinTone);
        btn.addEventListener('click', () => {
          skinTone = tone;
          for (const b of toneButtons) b.classList.toggle('selected', b === btn);
        });
        toneButtons.push(btn);
        toneRow.appendChild(btn);
      }
      box.appendChild(toneRow);

      const hairRow = document.createElement('div');
      hairRow.className = 'pick-row';
      const hairButtons: HTMLButtonElement[] = [];
      for (const [style, label] of HAIR_STYLES) {
        const btn = document.createElement('button');
        btn.textContent = label;
        btn.classList.toggle('selected', style === hair);
        btn.addEventListener('click', () => {
          hair = style;
          for (const b of hairButtons) b.classList.toggle('selected', b === btn);
        });
        hairButtons.push(btn);
        hairRow.appendChild(btn);
      }
      box.appendChild(hairRow);

      const next = document.createElement('button');
      next.className = 'primary-button';
      next.textContent = 'Next';
      next.addEventListener('click', () => {
        overlay.remove();
        resolve({ skinTone, hair });
      });
      box.appendChild(next);
    });
  }

  /** onboarding.strength — picture choices → baselineStrength seed. */
  private strengthStep(): Promise<string> {
    return new Promise((resolve) => {
      const { overlay, box } = this.screen('child-surface');
      const title = document.createElement('h2');
      title.textContent = 'What are you already great at?';
      box.appendChild(title);
      const row = document.createElement('div');
      row.className = 'pick-row strength-row';
      for (const [skill, icon, label] of STRENGTHS) {
        const card = document.createElement('button');
        card.className = 'pick-card';
        const iconEl = document.createElement('span');
        iconEl.className = 'strength-icon';
        iconEl.textContent = icon;
        card.appendChild(iconEl);
        const caption = document.createElement('span');
        caption.textContent = label;
        card.appendChild(caption);
        card.addEventListener('click', () => {
          overlay.remove();
          resolve(skill);
        });
        row.appendChild(card);
      }
      box.appendChild(row);
    });
  }
}
