/**
 * SceneGraph — resolves routing between scenes from consequence bands and
 * triggers; branching stays bounded to authored targets (spec §5.1, §9.1).
 */
import type { ContentLibrary } from '../content/ContentLibrary';
import type { Consequence, Scene } from '../types';

export class SceneGraph {
  constructor(private content: ContentLibrary) {}

  getScene(id: string): Scene {
    return this.content.getScene(id);
  }

  /** Routing target for a consequence; returns null when staying in place. */
  nextSceneId(currentSceneId: string, consequence: Consequence): string | null {
    return consequence.sceneId === currentSceneId ? null : consequence.sceneId;
  }

  /** All scene ids reachable from a chapter entry (used by validation + tests). */
  reachableFrom(entrySceneId: string): Set<string> {
    const seen = new Set<string>();
    const queue = [entrySceneId];
    while (queue.length > 0) {
      const id = queue.shift()!;
      if (seen.has(id)) continue;
      seen.add(id);
      const scene = this.content.scenes.get(id);
      if (!scene) continue;
      for (const trigger of scene.triggers) {
        if (trigger.action === 'goToScene' && !seen.has(trigger.target)) queue.push(trigger.target);
        if (trigger.action === 'startDecision') {
          const dp = this.content.decisionPoints.get(trigger.target);
          if (dp) {
            for (const c of dp.consequences) {
              if (!seen.has(c.sceneId)) queue.push(c.sceneId);
            }
          }
        }
      }
    }
    return seen;
  }
}
