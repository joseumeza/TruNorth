import { describe, expect, it } from 'vitest';
import { aabbOverlap, avatarBox, boundsToBox, collectibleBox } from '../../src/engine/CollisionSystem';
import { MovementController } from '../../src/engine/MovementController';

describe('AABB collision', () => {
  it('detects overlap and separation', () => {
    const a = { x: 0, y: 0, w: 100, h: 100 };
    expect(aabbOverlap(a, { x: 50, y: 50, w: 100, h: 100 })).toBe(true);
    expect(aabbOverlap(a, { x: 101, y: 0, w: 50, h: 50 })).toBe(false);
    expect(aabbOverlap(a, { x: 0, y: 100, w: 50, h: 50 })).toBe(false);
  });

  it('avatar feet box enters the Robin trigger zone at the authored spot', () => {
    const trigger = boundsToBox([860, 660, 220, 260]);
    expect(aabbOverlap(avatarBox(960, 800), trigger)).toBe(true);
    expect(aabbOverlap(avatarBox(300, 840), trigger)).toBe(false);
  });

  it('collectible pickup box is padded around the sprite', () => {
    const box = collectibleBox([1050, 900]);
    expect(aabbOverlap(avatarBox(1050, 905), box)).toBe(true);
  });
});

describe('MovementController', () => {
  it('moves with keys, normalizes diagonals, and clamps to walk bounds', () => {
    const movement = new MovementController();
    movement.setPosition(300, 840);
    movement.update(1, { up: false, down: false, left: false, right: true });
    expect(movement.x).toBeCloseTo(720); // 420 px/s
    expect(movement.facing).toBe('right');
    movement.setPosition(300, 1020); // away from the top clamp so the diagonal is unclipped
    movement.update(1, { up: true, down: false, left: false, right: true });
    expect(Math.hypot(movement.x - 300, movement.y - 1020)).toBeCloseTo(420, 0);
    movement.setPosition(1855, 840);
    movement.update(1, { up: false, down: false, left: false, right: true });
    expect(movement.x).toBe(1860); // clamped
  });

  it('reports idle when no keys are held', () => {
    const movement = new MovementController();
    movement.update(0.016, { up: false, down: false, left: false, right: false });
    expect(movement.moving).toBe(false);
  });
});
