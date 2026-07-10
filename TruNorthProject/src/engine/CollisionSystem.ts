/** AABB overlap checks for triggers, NPCs, and collectibles (spec §5.1). */

export interface AABB {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

/** The avatar's collision box is its feet region: narrow and low, anchored at feet-center. */
export function avatarBox(feetX: number, feetY: number, spriteW = 128): AABB {
  const w = spriteW * 0.5;
  const h = spriteW * 0.35;
  return { x: feetX - w / 2, y: feetY - h, w, h };
}

export function boundsToBox(bounds: [number, number, number, number]): AABB {
  return { x: bounds[0], y: bounds[1], w: bounds[2], h: bounds[3] };
}

/** Collectibles use a generous circular-ish pickup box around their position. */
export function collectibleBox(pos: [number, number], size = 64, pad = 24): AABB {
  return { x: pos[0] - size / 2 - pad, y: pos[1] - size - pad, w: size + pad * 2, h: size + pad * 2 };
}
