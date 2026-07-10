/**
 * Keyboard/mouse input (MVP input profile, spec §1.2). Movement keys are
 * polled by the game loop; freeze() unmaps everything during companion
 * fetches and overlays (spec §5.4).
 */
import type { MovementKeys } from '../engine/MovementController';

const KEY_MAP: Record<string, keyof MovementKeys> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  KeyW: 'up',
  KeyS: 'down',
  KeyA: 'left',
  KeyD: 'right',
};

export class InputController {
  readonly keys: MovementKeys = { up: false, down: false, left: false, right: false };
  private frozen = false;
  onPause: (() => void) | null = null;

  attach(target: Pick<Window, 'addEventListener'> = window): void {
    target.addEventListener('keydown', (e) => this.handleKey(e as KeyboardEvent, true));
    target.addEventListener('keyup', (e) => this.handleKey(e as KeyboardEvent, false));
  }

  private handleKey(e: KeyboardEvent, down: boolean): void {
    if (down && e.code === 'Escape') {
      this.onPause?.();
      return;
    }
    // Never steal keys from form fields (typed decision input).
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const key = KEY_MAP[e.code];
    if (!key) return;
    e.preventDefault();
    if (this.frozen && down) return;
    this.keys[key] = down && !this.frozen;
  }

  freeze(): void {
    this.frozen = true;
    this.keys.up = this.keys.down = this.keys.left = this.keys.right = false;
  }

  release(): void {
    this.frozen = false;
  }

  get isFrozen(): boolean {
    return this.frozen;
  }
}
