/**
 * DOM scene renderer (spec §5, §7). Backgrounds, characters, FX, and
 * collectibles are absolutely positioned <img> elements inside the scaled
 * stage. Scenes reference assets by manifest ID only. Expression states are
 * applied as CSS classes on the sprite (placeholder-art strategy — see
 * assets-src/art-style-guide.md).
 */
import type { AssetManifest, Facing, ManifestEntry, Scene, SceneCharacter } from '../types';
import type { Viewport } from './Viewport';
import { avatarSvg, type AvatarPose } from './AvatarSprite';
import type { AvatarConfig } from '../types';

const EXPRESSION_CLASSES = ['expr-neutral', 'expr-worried', 'expr-worried_sad', 'expr-shaky_nod', 'expr-relieved_grin', 'expr-excited_glow'];

const FX_VARIANT_SCALE: Record<string, number> = { big: 1, medium: 0.7, small: 0.45, gone: 0 };

export class SceneRenderer {
  private characterEls = new Map<string, HTMLElement>();
  private fxEls = new Map<string, HTMLElement>();
  private collectibleEls = new Map<string, HTMLElement>();
  private avatarEl: HTMLElement | null = null;
  private avatarConfig: AvatarConfig | null = null;
  private avatarPose: AvatarPose = 'down';

  constructor(
    private viewport: Viewport,
    private manifest: AssetManifest,
  ) {}

  entry(assetRef: string): ManifestEntry {
    const entry =
      this.manifest.characters[assetRef] ??
      this.manifest.backgrounds[assetRef] ??
      this.manifest.fx[assetRef] ??
      this.manifest.ui[assetRef] ??
      this.manifest.collectibles[assetRef];
    if (!entry) throw new Error(`assetRef not in manifest: ${assetRef}`);
    return entry;
  }

  renderScene(scene: Scene, opts: { collected: Set<string>; residueExpr: Map<string, string> }): void {
    const { bg, fx, characters } = this.viewport.layers;
    bg.replaceChildren();
    fx.replaceChildren();
    characters.replaceChildren();
    // The avatar shares the characters layer (y-sorted depth), so re-adopt it.
    if (this.avatarEl) characters.appendChild(this.avatarEl);
    this.characterEls.clear();
    this.fxEls.clear();
    this.collectibleEls.clear();

    const bgImg = document.createElement('img');
    bgImg.className = 'scene-bg';
    bgImg.alt = '';
    bgImg.draggable = false;
    bgImg.src = `/assets/${this.entry(scene.background).file}`;
    bg.appendChild(bgImg);

    for (const item of scene.fx ?? []) {
      const el = this.spriteEl(item.assetRef, item.position, 'fx-sprite');
      el.dataset.fxId = item.id;
      this.setFxVariantEl(el, item.variant ?? 'big');
      fx.appendChild(el);
      this.fxEls.set(item.id, el);
    }

    for (const character of scene.characters) {
      const el = this.spriteEl(character.assetRef, character.position, 'character-sprite');
      el.dataset.charId = character.id;
      const expr = character.expression ?? opts.residueExpr.get(character.id) ?? 'neutral';
      this.applyExpression(el, expr);
      characters.appendChild(el);
      this.characterEls.set(character.id, el);
    }

    for (const collectible of scene.collectibles) {
      if (opts.collected.has(collectible.id)) continue;
      const el = this.spriteEl(collectible.assetRef, collectible.position, 'collectible-sprite');
      el.dataset.collectibleId = collectible.id;
      fx.appendChild(el);
      this.collectibleEls.set(collectible.id, el);
    }
  }

  private spriteEl(assetRef: string, position: [number, number], className: string): HTMLElement {
    const entry = this.entry(assetRef);
    const wrap = document.createElement('div');
    wrap.className = `sprite ${className}`;
    wrap.style.width = `${entry.width}px`;
    wrap.style.height = `${entry.height}px`;
    // Anchor: feet-center (0.5, 1.0) by default (spec §7.3).
    const [ax, ay] = entry.anchor ?? [0.5, 1.0];
    wrap.style.left = `${position[0] - entry.width * ax}px`;
    wrap.style.top = `${position[1] - entry.height * ay}px`;
    // Depth follows feet-y so sprites lower in the room draw in front (3/4 view).
    wrap.style.zIndex = String(Math.round(position[1]));
    const img = document.createElement('img');
    img.src = `/assets/${entry.file}`;
    img.alt = '';
    img.draggable = false;
    wrap.appendChild(img);
    return wrap;
  }

  applyExpression(el: HTMLElement, expression: string): void {
    el.classList.remove(...EXPRESSION_CLASSES);
    el.classList.add(`expr-${expression}`);
  }

  setExpression(charId: string, expression: string): void {
    const el = this.characterEls.get(charId);
    if (el) this.applyExpression(el, expression);
  }

  setFxVariant(fxId: string, variant: string): void {
    const el = this.fxEls.get(fxId);
    if (el) this.setFxVariantEl(el, variant);
  }

  private setFxVariantEl(el: HTMLElement, variant: string): void {
    const scale = FX_VARIANT_SCALE[variant] ?? 1;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = scale === 0 ? '0' : String(0.6 + scale * 0.4);
    el.classList.toggle('fx-dark', variant === 'big');
  }

  removeCollectible(id: string): void {
    this.collectibleEls.get(id)?.remove();
    this.collectibleEls.delete(id);
  }

  getCharacterEl(id: string): HTMLElement | null {
    return this.characterEls.get(id) ?? null;
  }

  /** Head-top anchor position for speech bubbles (spec §7.3). */
  bubbleAnchorFor(charId: string, scene: Scene): { x: number; y: number } {
    const character = scene.characters.find((c) => c.id === charId);
    if (!character) return { x: 960, y: 400 };
    const entry = this.entry(character.assetRef);
    return { x: character.position[0], y: character.position[1] - entry.height - 24 };
  }

  characterOf(scene: Scene, id: string): SceneCharacter | undefined {
    return scene.characters.find((c) => c.id === id);
  }

  // ── Avatar ──────────────────────────────────────────────────────────────────

  mountAvatar(config: AvatarConfig): void {
    this.avatarEl?.remove();
    const el = document.createElement('div');
    el.className = 'sprite avatar-sprite';
    el.innerHTML = avatarSvg(config, this.avatarPose); // trusted, code-generated SVG only
    this.avatarEl = el;
    this.avatarConfig = config;
    this.viewport.layers.characters.appendChild(el);
  }

  setAvatarPosition(x: number, y: number, facing: Facing, moving: boolean): void {
    if (!this.avatarEl) return;
    this.avatarEl.style.left = `${x - 64}px`;
    this.avatarEl.style.top = `${y - 128}px`;
    this.avatarEl.style.zIndex = String(Math.round(y));
    const pose: AvatarPose = facing === 'up' || facing === 'down' ? facing : 'side';
    if (pose !== this.avatarPose && this.avatarConfig) {
      this.avatarPose = pose;
      this.avatarEl.innerHTML = avatarSvg(this.avatarConfig, pose);
    }
    this.avatarEl.style.setProperty('--flip', facing === 'left' ? '-1' : '1');
    this.avatarEl.classList.toggle('walking', moving);
  }

  /** Smooth vertical easing during the W4 rung climb only. */
  setAvatarClimbing(active: boolean): void {
    this.avatarEl?.classList.toggle('climbing', active);
  }

  setAvatarVisible(visible: boolean): void {
    if (this.avatarEl) this.avatarEl.style.display = visible ? '' : 'none';
  }

  avatarAnchor(x: number, y: number): { x: number; y: number } {
    return { x, y: y - 128 - 24 };
  }
}
