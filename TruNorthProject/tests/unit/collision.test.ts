import { describe, expect, it } from 'vitest';
import { aabbOverlap, avatarBox, boundsToBox, collectibleBox } from '../../src/engine/CollisionSystem';
import { MovementController } from '../../src/engine/MovementController';
import { TileMap } from '../../src/engine/TileMap';

describe('AABB collision', () => {
  it('detects overlap and separation', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    expect(aabbOverlap(a, { x: 50, y: 50, w: 100, h: 100 })).toBe(true);
    expect(aabbOverlap(a, { x: 101, y: 0, w: 50, h: 50 })).toBe(false);
    expect(aabbOverlap(a, { x: 0, y: 100, w: 50, h: 50 })).toBe(false);
  });

  it('avatar feet box enters the Robin trigger zone at the authored spot', () => {
    const trigger = boundsToBox([840, 330, 240, 300]);
    expect(aabbOverlap(avatarBox(960, 540), trigger)).toBe(true);
    expect(aabbOverlap(avatarBox(360, 540), trigger)).toBe(false);
  });

  it('collectible pickup box is padded around the sprite', () => {
    const box = collectibleBox([1020, 810]);
    expect(aabbOverlap(avatarBox(1020, 815), box)).toBe(true);
  });
});

describe('TileMap', () => {
  const room = new TileMap([
    '################',
    '#..............#',
    '#..............#',
    '#..............#',
    '#...............',
    '#..#...........#',
    '#..............#',
    '#..............#',
    '################',
  ]);

  it('rejects malformed maps', () => {
    expect(() => new TileMap(['####'])).toThrow();
  });

  it('reports blocked tiles, including outside the room', () => {
    expect(room.isBlocked(0, 0)).toBe(true);
    expect(room.isBlocked(3, 5)).toBe(true); // boulder
    expect(room.isBlocked(2, 2)).toBe(false);
    expect(room.isBlocked(-1, 4)).toBe(true);
    expect(room.isBlocked(16, 4)).toBe(true);
    expect(room.blockedAt(300, 300)).toBe(false);
    expect(room.blockedAt(60, 60)).toBe(true);
  });

  it('blocks a box that touches any blocked tile', () => {
    // Fully inside walkable floor.
    expect(room.boxBlocked({ x: 300, y: 300, w: 64, h: 45 })).toBe(false);
    // Poking into the west wall (col 0 ends at x=120).
    expect(room.boxBlocked({ x: 100, y: 300, w: 64, h: 45 })).toBe(true);
    // Overlapping the boulder at tile (3,5): x 360-480, y 600-720.
    expect(room.boxBlocked({ x: 350, y: 650, w: 64, h: 45 })).toBe(true);
  });

  it('openRoom() fallback walls the border and opens the floor', () => {
    const open = TileMap.openRoom();
    expect(open.isBlocked(0, 4)).toBe(true);
    expect(open.isBlocked(8, 4)).toBe(false);
  });
});

describe('MovementController', () => {
  const keys = (over: Partial<Record<'up' | 'down' | 'left' | 'right', boolean>>) => ({
    up: false,
    down: false,
    left: false,
    right: false,
    ...over,
  });

  it('moves with keys, normalizes diagonals, and faces all four directions', () => {
    const movement = new MovementController();
    movement.setPosition(300, 540);
    movement.update(1, keys({ right: true }));
    expect(movement.x).toBeCloseTo(720); // 420 px/s
    expect(movement.facing).toBe('right');
    movement.setPosition(960, 540);
    movement.update(0.1, keys({ up: true }));
    expect(movement.facing).toBe('up');
    expect(movement.y).toBeCloseTo(498);
    movement.update(0.1, keys({ down: true }));
    expect(movement.facing).toBe('down');
    movement.setPosition(960, 700);
    movement.update(1, keys({ up: true, right: true }));
    expect(Math.hypot(movement.x - 960, movement.y - 700)).toBeCloseTo(420, 0);
  });

  it('is stopped by blocked tiles instead of a global clamp', () => {
    const movement = new MovementController();
    movement.setTileMap(TileMap.openRoom());
    movement.setPosition(1700, 540);
    // Walk right for 2 s in frame-sized steps; the east wall starts at x=1800.
    for (let i = 0; i < 120; i += 1) movement.update(1 / 60, keys({ right: true }));
    // Feet box is 64 wide, so the center stops ~32px short of the wall.
    expect(movement.x).toBeLessThanOrEqual(1800 - 32);
    expect(movement.x).toBeGreaterThan(1700);
  });

  it('slides along a wall when moving diagonally into it', () => {
    const movement = new MovementController();
    movement.setTileMap(TileMap.openRoom());
    movement.setPosition(1760, 540);
    movement.update(0.5, keys({ right: true, down: true }));
    expect(movement.x).toBeLessThanOrEqual(1800 - 32); // x blocked at the east wall
    expect(movement.y).toBeGreaterThan(540); // …but y still advances
  });

  it('reports idle when no keys are held', () => {
    const movement = new MovementController();
    movement.update(0.016, keys({}));
    expect(movement.moving).toBe(false);
  });
});
