/**
 * Loads all authored content (chapter configs, scenes, decision points) at
 * build time via Vite glob imports, so demo mode has zero network dependency.
 * Scenes and routing reference IDs only — never file paths (spec §2.2).
 */
import type { ChapterConfig, DecisionPoint, Scene } from '../types';

const chapterModules = import.meta.glob('../../content/chapters/*/chapter.json', { eager: true }) as Record<
  string,
  { default: ChapterConfig }
>;
const sceneModules = import.meta.glob('../../content/chapters/*/*.scene.json', { eager: true }) as Record<
  string,
  { default: Scene }
>;
const dpModules = import.meta.glob('../../content/chapters/*/decision-points.json', { eager: true }) as Record<
  string,
  { default: Record<string, DecisionPoint> }
>;

export class ContentLibrary {
  readonly chapters = new Map<string, ChapterConfig>();
  readonly scenes = new Map<string, Scene>();
  readonly decisionPoints = new Map<string, DecisionPoint>();

  constructor() {
    for (const mod of Object.values(chapterModules)) {
      this.chapters.set(mod.default.chapterId, mod.default);
    }
    for (const mod of Object.values(sceneModules)) {
      this.scenes.set(mod.default.id, mod.default);
    }
    for (const mod of Object.values(dpModules)) {
      for (const dp of Object.values(mod.default)) {
        this.decisionPoints.set(dp.id, dp);
      }
    }
  }

  getChapter(id: string): ChapterConfig {
    const c = this.chapters.get(id);
    if (!c) throw new Error(`Unknown chapter: ${id}`);
    return c;
  }

  getScene(id: string): Scene {
    const s = this.scenes.get(id);
    if (!s) throw new Error(`Unknown scene: ${id}`);
    return s;
  }

  getDecisionPoint(id: string): DecisionPoint {
    const dp = this.decisionPoints.get(id);
    if (!dp) throw new Error(`Unknown decision point: ${id}`);
    return dp;
  }

  firstChapterId(): string {
    const ordered = [...this.chapters.keys()].sort();
    return ordered[0];
  }
}
