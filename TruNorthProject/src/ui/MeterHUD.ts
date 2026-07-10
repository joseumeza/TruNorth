/**
 * HUD (spec §6.3): skill meters top-right (animate only on change), brownie
 * points top-left, demo-mode pill, mute toggle. Meters use icon + fill —
 * never color alone (spec §20); numbers stay hidden for younger bands (§6.4).
 */
import type { GameState, SkillId } from '../types';
import { UI_TOKENS } from '../types';
import type { Viewport } from '../render/Viewport';

const SKILL_META: Record<SkillId, { icon: string; label: string }> = {
  empathy: { icon: '💗', label: 'Empathy' },
  calm: { icon: '🌊', label: 'Calm' },
  courage: { icon: '🦁', label: 'Courage' },
  self_worth: { icon: '🌟', label: 'Self-Worth' },
  adapting_to_change: { icon: '🦋', label: 'Adapting' },
  friendship_repair: { icon: '🤝', label: 'Friendship' },
  worry_brave: { icon: '⛅', label: 'Worry & Brave' },
};

export class MeterHUD {
  private meterEls = new Map<SkillId, { fillEl: HTMLElement; rootEl: HTMLElement; levelEl: HTMLElement }>();
  private pointsEl: HTMLElement | null = null;
  private root: HTMLElement | null = null;

  constructor(
    private viewport: Viewport,
    private onToggleMute: () => boolean,
  ) {}

  mount(state: GameState, visibleMeters: SkillId[]): void {
    const hud = this.viewport.layers.hud;
    hud.replaceChildren();
    this.meterEls.clear();

    this.root = document.createElement('div');
    this.root.className = 'hud';

    // Top-left cluster: brownie points + demo pill.
    const topLeft = document.createElement('div');
    topLeft.className = 'hud-top-left';
    this.pointsEl = document.createElement('div');
    this.pointsEl.className = 'hud-points';
    this.pointsEl.setAttribute('aria-label', 'Brownie points');
    topLeft.appendChild(this.pointsEl);
    if (state.flags.demoMode) {
      const pill = document.createElement('div');
      pill.className = 'demo-pill';
      pill.textContent = 'Demo Mode';
      topLeft.appendChild(pill);
    }
    this.root.appendChild(topLeft);

    // Top-right cluster: meters.
    const meters = document.createElement('div');
    meters.className = 'hud-meters';
    const showNumbers = UI_TOKENS[state.profile.ageBand].meterShowsNumbers;
    for (const skill of visibleMeters) {
      const meta = SKILL_META[skill];
      const row = document.createElement('div');
      row.className = 'meter';
      row.setAttribute('role', 'progressbar');
      row.setAttribute('aria-label', meta.label);
      row.setAttribute('aria-valuemin', '0');
      row.setAttribute('aria-valuemax', '1');
      const icon = document.createElement('span');
      icon.className = 'meter-icon';
      icon.textContent = meta.icon;
      row.appendChild(icon);
      const track = document.createElement('div');
      track.className = 'meter-track';
      const fill = document.createElement('div');
      fill.className = 'meter-fill';
      track.appendChild(fill);
      row.appendChild(track);
      const level = document.createElement('span');
      level.className = 'meter-level';
      if (!showNumbers) level.style.display = 'none';
      row.appendChild(level);
      meters.appendChild(row);
      this.meterEls.set(skill, { fillEl: fill, rootEl: row, levelEl: level });
    }
    this.root.appendChild(meters);

    // Utility corner: mute.
    const muteBtn = document.createElement('button');
    muteBtn.className = 'hud-mute';
    muteBtn.setAttribute('aria-label', 'Toggle sound');
    muteBtn.textContent = '🔊';
    muteBtn.addEventListener('click', () => {
      muteBtn.textContent = this.onToggleMute() ? '🔇' : '🔊';
    });
    this.root.appendChild(muteBtn);

    hud.appendChild(this.root);
    this.update(state);
  }

  update(state: GameState): void {
    if (this.pointsEl) this.pointsEl.textContent = `🍪 ${state.progress.browniePoints}`;
    for (const [skill, els] of this.meterEls) {
      const meter = state.meters[skill];
      els.fillEl.style.width = `${Math.round(meter.fill * 100)}%`;
      els.rootEl.setAttribute('aria-valuenow', meter.fill.toFixed(2));
      els.levelEl.textContent = meter.level > 0 ? `Lv ${meter.level}` : '';
    }
  }

  pulse(skill: SkillId): void {
    const els = this.meterEls.get(skill);
    if (!els) return;
    els.rootEl.classList.remove('meter-pulse');
    void els.rootEl.offsetWidth; // restart the CSS animation
    els.rootEl.classList.add('meter-pulse');
  }

  /** Stage-logical position of a meter — target for juice particles. */
  meterAnchor(skill: SkillId): { x: number; y: number } {
    const els = this.meterEls.get(skill);
    if (!els) return { x: 1700, y: 80 };
    return this.viewport.toStageCoords(els.rootEl.getBoundingClientRect());
  }
}
