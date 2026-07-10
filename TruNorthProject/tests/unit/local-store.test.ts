import { describe, expect, it } from 'vitest';
import { EVENT_LOG_CAP, LocalProgressStore, SAVE_KEY } from '../../src/store/LocalProgressStore';
import { createInitialState } from '../../src/store/GameStateFactory';

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    dump: map,
  };
}

function freshState() {
  return createInitialState(
    {
      ageBand: '5-7',
      chapterId: 'ch1',
      avatar: { skinTone: 'tone_1', hair: 'hair_curly' },
      companionName: 'Luna',
      companionArchetype: 'companion_sprite',
      baselineStrength: 'empathy',
      demoMode: false,
    },
    'c1s1',
  );
}

describe('LocalProgressStore', () => {
  it('round-trips a save under trunorth_save_v1', async () => {
    const storage = memoryStorage();
    const store = new LocalProgressStore(storage);
    const state = freshState();
    await store.save(state);
    expect(storage.dump.has(SAVE_KEY)).toBe(true);
    const loaded = await store.load();
    expect(loaded?.profile.companionName).toBe('Luna');
    expect(loaded?.progress.currentSceneId).toBe('c1s1');
  });

  it('returns null for corrupt or missing saves', async () => {
    const storage = memoryStorage();
    const store = new LocalProgressStore(storage);
    expect(await store.load()).toBeNull();
    storage.setItem(SAVE_KEY, '{not json');
    expect(await store.load()).toBeNull();
  });

  it('appendEvent persists immediately and prunes to the retention cap', async () => {
    const storage = memoryStorage();
    const store = new LocalProgressStore(storage);
    const state = freshState();
    await store.save(state);
    for (let i = 0; i < EVENT_LOG_CAP + 25; i++) {
      await store.appendEvent({ ts: i, type: 'scene_enter', sceneId: 'c1s1' });
    }
    const loaded = await store.load();
    expect(loaded?.eventLog.length).toBe(EVENT_LOG_CAP);
    expect(loaded?.eventLog.at(-1)?.ts).toBe(EVENT_LOG_CAP + 24);
  });

  it('clear removes the save', async () => {
    const storage = memoryStorage();
    const store = new LocalProgressStore(storage);
    await store.save(freshState());
    await store.clear();
    expect(await store.load()).toBeNull();
  });
});
