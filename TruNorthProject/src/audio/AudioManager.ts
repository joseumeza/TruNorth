/**
 * Audio & feedback (spec §14). All SFX are synthesized with WebAudio (no asset
 * downloads, demo-safe offline). Audio is never the sole feedback channel
 * (spec §20); global mute is always available and the poor-band cue stays soft.
 */

type SfxName = 'pickup' | 'harp' | 'thud' | 'bloop' | 'celebration';

export class AudioManager {
  private ctx: AudioContext | null = null;
  private _muted = false;

  get muted(): boolean {
    return this._muted;
  }

  setMuted(muted: boolean): void {
    this._muted = muted;
  }

  toggleMuted(): boolean {
    this._muted = !this._muted;
    return this._muted;
  }

  /** Lazily create the context on first user gesture (autoplay policy). */
  private context(): AudioContext | null {
    if (this._muted) return null;
    try {
      if (!this.ctx) this.ctx = new AudioContext();
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return this.ctx;
    } catch {
      return null;
    }
  }

  private tone(freq: number, startAt: number, duration: number, volume: number, type: OscillatorType = 'sine'): void {
    const ctx = this.context();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    const t0 = ctx.currentTime + startAt;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  play(name: SfxName): void {
    switch (name) {
      case 'pickup': // brownie/spark chime — medium
        this.tone(880, 0, 0.15, 0.18);
        this.tone(1320, 0.08, 0.2, 0.14);
        break;
      case 'harp': // strong choice — medium-high harp swell
        this.tone(523, 0, 0.4, 0.14);
        this.tone(659, 0.09, 0.4, 0.14);
        this.tone(784, 0.18, 0.5, 0.14);
        this.tone(1047, 0.27, 0.6, 0.12);
        break;
      case 'thud': // poor setback — low and soft, never punishing
        this.tone(140, 0, 0.25, 0.1, 'triangle');
        break;
      case 'bloop': // companion thinking — low
        this.tone(420, 0, 0.12, 0.06, 'sine');
        break;
      case 'celebration':
        this.tone(659, 0, 0.3, 0.16);
        this.tone(784, 0.12, 0.3, 0.16);
        this.tone(1047, 0.24, 0.45, 0.16);
        this.tone(1319, 0.38, 0.6, 0.14);
        break;
    }
  }
}
