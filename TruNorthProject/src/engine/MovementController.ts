/**
 * Tier B avatar movement: WASD/arrow keys, smooth movement over the scene's
 * tile collision map (spec §5.1, top-down rooms). Position is the avatar's
 * feet-center in logical px. Axis-separated collision lets the avatar slide
 * along walls; facing covers all four directions for the 3/4 top-down view.
 */
import type { Facing } from '../types';
import { avatarBox } from './CollisionSystem';
import { TileMap } from './TileMap';

export interface MovementKeys {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

const SPEED_PX_PER_S = 420;

export class MovementController {
  x = 300;
  y = 840;
  facing: Facing = 'down';
  moving = false;

  private tiles: TileMap = TileMap.openRoom();

  setTileMap(tiles: TileMap): void {
    this.tiles = tiles;
  }

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
    else this.facing = dy < 0 ? 'up' : 'down';
    const len = Math.hypot(dx, dy);
    const stepX = (dx / len) * SPEED_PX_PER_S * delta;
    const stepY = (dy / len) * SPEED_PX_PER_S * delta;
    // Per-axis moves so a blocked axis doesn't cancel the other (wall sliding).
    if (stepX !== 0 && !this.tiles.boxBlocked(avatarBox(this.x + stepX, this.y))) this.x += stepX;
    if (stepY !== 0 && !this.tiles.boxBlocked(avatarBox(this.x, this.y + stepY))) this.y += stepY;
  }
}
