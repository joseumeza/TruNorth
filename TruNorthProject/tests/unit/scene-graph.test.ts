import { describe, expect, it } from 'vitest';
import { ContentLibrary } from '../../src/content/ContentLibrary';
import { SceneGraph } from '../../src/engine/SceneGraph';

const content = new ContentLibrary();
const graph = new SceneGraph(content);

describe('content library', () => {
  it('loads chapters, scenes, and decision points', () => {
    expect(content.chapters.has('ch1')).toBe(true);
    expect(content.chapters.has('ch2')).toBe(true);
    expect(content.getScene('w2').decisionPoints).toContain('dp_robin_ladder');
    expect(content.getDecisionPoint('dp_robin_ladder').emotionalArc.recoveryCadence).toBeTruthy();
  });
});

describe('scene graph routing', () => {
  it('routes the golden path W1 → W2 → W3a → W4', () => {
    const dp = content.getDecisionPoint('dp_robin_ladder');
    const strong = dp.consequences.find((c) => c.band === 'strong')!;
    expect(graph.nextSceneId('w2', strong)).toBe('w3a');
    const w1Exit = content.getScene('w1').triggers.find((t) => t.action === 'goToScene')!;
    expect(w1Exit.target).toBe('w2');
    const w3aExit = content.getScene('w3a').triggers.find((t) => t.action === 'goToScene')!;
    expect(w3aExit.target).toBe('w4');
    expect(content.getScene('w4').climb?.taps).toBe(3);
  });

  it('poor band stays in the scene with a repair action', () => {
    const dp = content.getDecisionPoint('dp_robin_ladder');
    const poor = dp.consequences.find((c) => c.band === 'poor')!;
    expect(graph.nextSceneId('w2', poor)).toBeNull();
    expect(poor.repairAction).toBe('walk-back');
  });

  it('every chapter scene is reachable from its entry', () => {
    for (const chapter of content.chapters.values()) {
      const reachable = graph.reachableFrom(chapter.entrySceneId);
      for (const scene of content.scenes.values()) {
        if (scene.chapterId === chapter.chapterId) {
          expect(reachable, `${scene.id} unreachable in ${chapter.chapterId}`).toContain(scene.id);
        }
      }
    }
  });
});
