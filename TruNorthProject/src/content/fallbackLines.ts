/**
 * Client-side copy of the approved fallback library — used when the network or
 * proxy is unreachable, and for authored resume/error/distress lines. The same
 * JSON file backs the server pipeline, so lines stay in sync.
 */
import fallbackData from '../../content/fallbacks/companion-fallbacks.json';

interface FallbackLibrary {
  global: Record<string, string>;
  decisionPoints: Record<string, Record<string, string>>;
}

const lib = fallbackData as unknown as FallbackLibrary;

export function fallbackLine(decisionPointId: string, key: string): string {
  return lib.decisionPoints[decisionPointId]?.[key] ?? lib.global[key] ?? lib.global.error;
}

export function globalLine(key: 'timeout' | 'safety_redirect' | 'distress' | 'model_unavailable' | 'resume' | 'error'): string {
  return lib.global[key];
}
