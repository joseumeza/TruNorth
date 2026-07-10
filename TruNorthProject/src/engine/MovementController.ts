/**
 * Tier B avatar movement: WASD/arrow keys, position clamped to the walkable
 * band of the 1920×1080 logical canvas (spec §5.1). Position is the avatar's
 * feet-center in logical px.
 */

export interface MovementKeys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const SPEED_PX_PER_S = 420;
const WALK_BOUNDS = { minX: 60, maxX: 1860, minY: 620, maxY: 1020 };

export class MovementController {
  x = 300;
  y = 840;
  facing: 'left' | 'right' = 'right';
  moving = false;

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /** Advance position by one frame; delta in seconds. */
  update(delta: number, keys: MovementKeys): void {
    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;
    this.moving = dx !== 0 || dy !== 0;
    if (!this.moving) return;
    if (dx !== 0) this.facing = dx < 0 ? 'left' : 'right';
    const len = Math.hypot(dx, dy);
    this.x += (dx / len) * SPEED_PX_PER_S * delta;
    this.y += (dy / len) * SPEED_PX_PER_S * delta;
    this.x = Math.min(WALK_BOUNDS.maxX, Math.max(WALK_BOUNDS.minX, this.x));
    this.y = Math.min(WALK_BOUNDS.maxY, Math.max(WALK_BOUNDS.minY, this.y));
  }
}
