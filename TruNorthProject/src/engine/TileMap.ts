/**
 * Tile-based room collision (spec §5.1, top-down rooms). Each scene is one
 * fixed 16×9 room of 120 px tiles over the 1920×1080 logical stage. The tile
 * map is collision-only — visuals live in the scene's background art, which
 * must match the authored rows ('#' = blocked, '.' = walkable).
 */
import type { AABB } from './CollisionSystem';

export const TILE_SIZE = 120;
export const TILE_COLS = 16;
export const TILE_ROWS = 9;

export class TileMap {
  private readonly blocked: boolean[][];

  constructor(rows: string[]) {
    if (rows.length !== TILE_ROWS || rows.some((r) => r.length !== TILE_COLS)) {
      throw new Error(`tileMap must be ${TILE_ROWS} rows of ${TILE_COLS} chars`);
    }
    this.blocked = rows.map((row) => [...row].map((ch) => ch === '#'));
  }

  /** Anything outside the room counts as blocked. */
  isBlocked(col: number, row: number): boolean {
    if (col < 0 || col >= TILE_COLS || row < 0 || row >= TILE_ROWS) return true;
    return this.blocked[row][col];
  }

  blockedAt(x: number, y: number): boolean {
    return this.isBlocked(Math.floor(x / TILE_SIZE), Math.floor(y / TILE_SIZE));
  }

  /** True if the box overlaps any blocked tile (used for wall collision). */
  boxBlocked(box: AABB): boolean {
    const c0 = Math.floor(box.x / TILE_SIZE);
    const c1 = Math.floor((box.x + box.w - 1) / TILE_SIZE);
    const r0 = Math.floor(box.y / TILE_SIZE);
    const r1 = Math.floor((box.y + box.h - 1) / TILE_SIZE);
    for (let row = r0; row <= r1; row += 1) {
      for (let col = c0; col <= c1; col += 1) {
        if (this.isBlocked(col, row)) return true;
      }
    }
    return false;
  }

  /** Fallback for scenes without an authored tileMap: walls on the border, open floor. */
  static openRoom(): TileMap {
    const wall = '#'.repeat(TILE_COLS);
    const mid = `#${'.'.repeat(TILE_COLS - 2)}#`;
    return new TileMap([wall, ...Array.from({ length: TILE_ROWS - 2 }, () => mid), wall]);
  }
}
