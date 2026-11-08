import type { SfxId } from '../story/events';

// Placeholder sound effects synthesised with Web Audio, so the build needs no
// audio assets yet. Real recordings replace these in S7 (doc 7.4).

export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  /** Call from a user gesture; browsers keep audio suspended until then. */
  unlock(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate;
      this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  play(id: SfxId): void {
    switch (id) {
      case 'buzz':
        this.tone('square', 170, 0, 0.18, 0.12);
        this.tone('square', 170, 0.28, 0.18, 0.12);
        break;
      case 'beep':
        this.tone('sine', 1250, 0, 0.07, 0.25);
        break;
      case 'error':
        this.tone('square', 140, 0, 0.35, 0.15);
        break;
      case 'unlock':
        this.tone('sine', 1250, 0, 0.08, 0.25);
        this.tone('sine', 1650, 0.1, 0.12, 0.25);
        this.hiss(0.25, 0.12, 400, 0.4);
        break;
      case 'pickup':
        this.hiss(0, 0.05, 2500, 0.3);
        this.tone('sine', 640, 0, 0.08, 0.15);
        break;
      case 'strike':
        this.hiss(0, 0.3, 3200, 0.5);
        break;
      case 'release':
        [523, 659, 784, 1046].forEach((f, i) => this.tone('sine', f, i * 0.12, 0.5, 0.2));
        break;
      case 'place':
        this.tone('sine', 110, 0, 0.18, 0.5);
        this.hiss(0, 0.06, 600, 0.3);
        break;
      case 'paper':
        this.hiss(0, 0.08, 4000, 0.25);
        this.hiss(0.12, 0.08, 3500, 0.2);
        break;
    }
  }

  /** Mantel clock chime; agitation 0..1 detunes it and adds a clashing tone. */
  chime(volume: number, agitation: number): void {
    if (volume <= 0.01) return;
    const wobble = 1 + (Math.random() - 0.5) * 0.06 * agitation;
    this.tone('sine', 880 * wobble, 0, 1.2, 0.22 * volume);
    this.tone('sine', 1318 * wobble, 0, 0.9, 0.1 * volume);
    if (agitation > 0) this.tone('triangle', 932 * wobble, 0.05, 0.6, 0.12 * volume * agitation);
  }

  /** A bus pulling away: low rumble fading out. */
  engine(seconds: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(48, t);
    osc.frequency.linearRampToValueAtTime(75, t + seconds * 0.6);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 260;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.35, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + seconds);
  }

  private tone(type: OscillatorType, freq: number, delay: number, length: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(gain).connect(this.master);
    osc.start(t);
    osc.stop(t + length);
  }

  private hiss(delay: number, length: number, freq: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(level, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + length);
  }
}
