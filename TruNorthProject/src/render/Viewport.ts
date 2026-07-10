/**
 * 16:9 letterboxed viewport (spec §6.1). All game coordinates are logical
 * 1920×1080; the stage is uniformly scaled with transform: scale() — never
 * stretched. Letterbox bars come from the dark .game-root background.
 */

export const LOGICAL_W = 1920;
export const LOGICAL_H = 1080;

export interface StageLayers {
  bg: HTMLElement;
  fx: HTMLElement;
  characters: HTMLElement;
  bubbles: HTMLElement;
  hud: HTMLElement;
  overlay: HTMLElement;
}

export class Viewport {
  readonly root: HTMLElement;
  readonly stage: HTMLElement;
  readonly layers: StageLayers;
  scale = 1;

  constructor(mount: HTMLElement) {
    this.root = document.createElement('div');
    this.root.className = 'game-root';
    const frame = document.createElement('div');
    frame.className = 'game-viewport';
    this.stage = document.createElement('div');
    this.stage.className = 'game-stage';
    frame.appendChild(this.stage);
    this.root.appendChild(frame);
    mount.appendChild(this.root);

    // Z-order: background → floor FX → world (characters + avatar, y-sorted) →
    // bubbles → HUD → overlays (spec §6.1). Avatar and NPCs share the
    // characters layer so depth follows feet-y in the top-down view.
    const layerNames = ['bg', 'fx', 'characters', 'bubbles', 'hud', 'overlay'] as const;
    const layers = {} as Record<(typeof layerNames)[number], HTMLElement>;
    for (const name of layerNames) {
      const el = document.createElement('div');
      el.className = `layer layer-${name}`;
      this.stage.appendChild(el);
      layers[name] = el;
    }
    this.layers = layers;

    this.fit();
    window.addEventListener('resize', () => this.fit());
  }

  private fit(): void {
    this.scale = Math.min(window.innerWidth / LOGICAL_W, window.innerHeight / LOGICAL_H);
    this.stage.style.transform = `scale(${this.scale})`;
  }

  /** Convert a DOMRect (screen px) into stage-logical coordinates. */
  toStageCoords(rect: DOMRect): { x: number; y: number } {
    const stageRect = this.stage.getBoundingClientRect();
    return {
      x: (rect.left + rect.width / 2 - stageRect.left) / this.scale,
      y: (rect.top + rect.height / 2 - stageRect.top) / this.scale,
    };
  }
}
