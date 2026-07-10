/**
 * [MVP] LocalProgressStore — localStorage persistence (spec §12.2).
 * Key `trunorth_save_v1`; immediate save after every decision resolution;
 * event log pruned to the last 200 events (spec §12.4).
 */
import type { GameEvent, GameState, ProgressStore } from '../types';

export const SAVE_KEY = 'trunorth_save_v1';
export const EVENT_LOG_CAP = 200;

export class LocalProgressStore implements ProgressStore {
  private cached: GameState | null = null;

  constructor(private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) {}

  async load(): Promise<GameState | null> {
    const raw = this.storage.getItem(SAVE_KEY);
    if (!raw) return null;
    try {
      const state = JSON.parse(raw) as GameState;
      if (state.version !== 1) return null;
      this.cached = state;
      return state;
    } catch {
      return null;
    }
  }

  async save(state: GameState): Promise<void> {
    if (state.eventLog.length > EVENT_LOG_CAP) {
      state.eventLog = state.eventLog.slice(-EVENT_LOG_CAP);
    }
    this.cached = state;
    this.storage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  async clear(): Promise<void> {
    this.cached = null;
    this.storage.removeItem(SAVE_KEY);
  }

  async appendEvent(event: GameEvent): Promise<void> {
    const state = this.cached ?? (await this.load());
    if (!state) return;
    state.eventLog.push(event);
    await this.save(state);
  }
}
