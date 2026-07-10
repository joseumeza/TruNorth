/**
 * Meter-juice particles (spec §10.3): 8–12 particles animated along a
 * quadratic Bézier from the companion to the meter with requestAnimationFrame.
 * Burst cap ≤ 12; disabled entirely under prefers-reduced-motion (spec §20).
 */
import type { Viewport } from './Viewport';

const MAX_PARTICLES = 12;
const DURATION_MS = 750;

export class ParticleSystem {
  constructor(private viewport: Viewport) {}

  get reducedMotion(): boolean {
    return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  burst(from: { x: number; y: number }, to: { x: number; y: number }, count = 10): Promise<void> {
    if (this.reducedMotion) return Promise.resolve();
    const n = Math.min(count, MAX_PARTICLES);
    const layer = this.viewport.layers.fx;
    const particles: { el: HTMLElement; delay: number; cx: number; cy: number }[] = [];
    for (let i = 0; i < n; i++) {
      const el = document.createElement('div');
      el.className = 'particle';
      layer.appendChild(el);
      // Control point bows the path upward with per-particle spread.
      particles.push({
        el,
        delay: i * 40,
        cx: (from.x + to.x) / 2 + (Math.random() - 0.5) * 300,
        cy: Math.min(from.y, to.y) - 180 - Math.random() * 120,
      });
    }
    return new Promise((resolve) => {
      const start = performance.now();
      const tick = (now: number) => {
        let alive = false;
        for (const p of particles) {
          const t = (now - start - p.delay) / DURATION_MS;
          if (t < 0) {
            alive = true;
            continue;
          }
          if (t >= 1) {
            p.el.style.opacity = '0';
            continue;
          }
          alive = true;
          const u = 1 - t;
          const x = u * u * from.x + 2 * u * t * p.cx + t * t * to.x;
          const y = u * u * from.y + 2 * u * t * p.cy + t * t * to.y;
          p.el.style.transform = `translate(${x}px, ${y}px) scale(${1 - t * 0.5})`;
          p.el.style.opacity = String(1 - t * 0.3);
        }
        if (alive) {
          requestAnimationFrame(tick);
        } else {
          for (const p of particles) p.el.remove();
          resolve();
        }
      };
      requestAnimationFrame(tick);
    });
  }
}
