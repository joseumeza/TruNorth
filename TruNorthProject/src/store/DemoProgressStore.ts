/**
 * DemoProgressStore — ephemeral in-memory persistence for the showcase
 * (spec §12.2). No localStorage writes, no analytics, no network; a page
 * reload fully resets the demo.
 */
import type { GameEvent, GameState, ProgressStore } from '../types';

export class DemoProgressStore implements ProgressStore {
  private state: GameState | null = null;

  async load(): Promise<GameState | null> {
    return this.state;
  }

  async save(state: GameState): Promise<void> {
    if (state.eventLog.length > 200) state.eventLog = state.eventLog.slice(-200);
    this.state = state;
  }

  async clear(): Promise<void> {
    this.state = null;
  }

  async appendEvent(event: GameEvent): Promise<void> {
    this.state?.eventLog.push(event);
  }
}
