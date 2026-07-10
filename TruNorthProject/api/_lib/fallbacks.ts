/**
 * Fallback library access (Layer 5 of the safety pipeline, spec §11.3).
 * Every decisionPointId × band path must resolve to an approved line.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export interface FallbackLibrary {
  global: Record<string, string>;
  decisionPoints: Record<string, Record<string, string>>;
}

let cached: FallbackLibrary | null = null;

export function loadFallbackLibrary(): FallbackLibrary {
  if (!cached) {
    const path = fileURLToPath(new URL('../../content/fallbacks/companion-fallbacks.json', import.meta.url));
    cached = JSON.parse(readFileSync(path, 'utf-8')) as FallbackLibrary;
  }
  return cached;
}

export function getFallbackLine(decisionPointId: string, key: string): string {
  const lib = loadFallbackLibrary();
  return (
    lib.decisionPoints[decisionPointId]?.[key] ??
    lib.global[key] ??
    lib.global.error
  );
}
