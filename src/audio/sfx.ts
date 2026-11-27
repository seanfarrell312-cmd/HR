import type { SfxId } from '../story/events';

// Placeholder sound effects synthesised with Web Audio, so the build needs no
// audio assets yet. Real recordings replace these in S7 (doc 7.4).

/** Day 1's music box melody (Hz): a little falling phrase. */
const MUSIC_BOX_TUNE = [1568, 1319, 1175, 1319, 1047, 1175, 988, 1047];

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
      case 'wind-down':
        // One last chime that sags in pitch and dies, then the clock's works stop.
        this.glide('sine', 880, 560, 0, 1.3, 0.22);
        this.glide('sine', 1318, 840, 0, 1.0, 0.08);
        this.tone('square', 90, 1.35, 0.06, 0.12);
        break;
      case 'sparkle':
        for (let i = 0; i < 9; i++) this.tone('sine', 1900 + Math.random() * 1500, i * 0.11, 0.35, 0.05);
        break;
      case 'rattle':
        // Wooden clatter that slows and quietens as it settles.
        for (let i = 0; i < 16; i++) {
          const t = 1.5 * (1 - Math.sqrt(1 - i / 16));
          const k = 1 - i / 16;
          this.hiss(t, 0.03, 1800 + Math.random() * 1500, 0.45 * k);
          this.tone('square', 180 + Math.random() * 90, t, 0.03, 0.07 * k);
        }
        break;
      case 'box-wind-down':
        // The music box's tune winds down: slower, lower, then stops.
        MUSIC_BOX_TUNE.forEach((f, i) => {
          const t = i * 0.22 + i * i * 0.035;
          this.tone('sine', f * (1 - i * 0.04), t, 0.45, 0.16 * (1 - i / 9));
        });
        this.tone('square', 90, 2.4, 0.05, 0.1);
        break;
      case 'giggle':
        // "Hee-hee-hee": quick falling chirps, each sliding down like a titter.
        for (let i = 0; i < 6; i++) {
          const f = 1250 - i * 55 + Math.random() * 40;
          this.glide('triangle', f, f * 0.78, i * 0.12, 0.09, 0.13);
          this.glide('sine', f * 2, f * 1.6, i * 0.12, 0.07, 0.04);
        }
        break;
      case 'raspberry': {
        // A wet, buzzy "pfffbbt": a low sawtooth wobbling fast, over breathy noise.
        const ctx = this.ctx;
        const master = this.master;
        if (!ctx || !master) break;
        const t0 = ctx.currentTime;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, t0);
        osc.frequency.linearRampToValueAtTime(95, t0 + 0.85);
        const wobble = ctx.createOscillator();
        wobble.frequency.value = 32;
        const depth = ctx.createGain();
        depth.gain.value = 45;
        wobble.connect(depth).connect(osc.frequency);
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.value = 900;
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.0001, t0);
        gain.gain.exponentialRampToValueAtTime(0.32, t0 + 0.04);
        gain.gain.setValueAtTime(0.32, t0 + 0.6);
        gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.9);
        osc.connect(lowpass).connect(gain).connect(master);
        osc.start(t0);
        wobble.start(t0);
        osc.stop(t0 + 0.95);
        wobble.stop(t0 + 0.95);
        this.hiss(0, 0.85, 700, 0.25);
        // A little giggle as it floats off.
        for (let i = 0; i < 4; i++) {
          const f = 1150 - i * 60;
          this.glide('triangle', f, f * 0.78, 1.1 + i * 0.12, 0.09, 0.1);
        }
        break;
      }
      case 'clink':
        // China rattling on its saucer.
        for (let i = 0; i < 3; i++) {
          this.tone('sine', 2600 + Math.random() * 900, i * 0.07, 0.12, 0.08);
          this.hiss(i * 0.07, 0.02, 5000, 0.12);
        }
        break;
      case 'cup-wind-down':
        // The rattling slows, then one last clink as the cup sits down.
        for (let i = 0; i < 7; i++) {
          const t = i * 0.12 + i * i * 0.03;
          this.tone('sine', 2900 - i * 120, t, 0.1, 0.09 * (1 - i / 8));
          this.hiss(t, 0.02, 5000, 0.1 * (1 - i / 8));
        }
        this.tone('sine', 2200, 1.4, 0.4, 0.1);
        break;
      case 'clown-laugh':
        // "Ha-ha-ha-ha-haaa": bouncy, falling honks with a breathy edge.
        for (let i = 0; i < 8; i++) {
          const f = 620 - i * 28 + (i % 2) * 40;
          const long = i === 7 ? 0.32 : 0.11;
          this.glide('sawtooth', f, f * 0.82, i * 0.15, long, 0.07);
          this.glide('triangle', f * 2, f * 1.6, i * 0.15, long, 0.05);
          this.hiss(i * 0.15, 0.05, 2200, 0.05);
        }
        break;
      case 'clown-wind-down':
        // The laughing slows and sinks, then stops.
        for (let i = 0; i < 6; i++) {
          const t = i * 0.18 + i * i * 0.035;
          const f = 560 - i * 55;
          this.glide('triangle', f, f * 0.75, t, 0.14, 0.09 * (1 - i / 7));
        }
        break;
      case 'fill':
        // Water pouring into a pail: hiss rising in pitch as it fills.
        for (let i = 0; i < 6; i++) this.hiss(i * 0.18, 0.22, 900 + i * 260, 0.16);
        this.tone('sine', 300, 0.1, 1.1, 0.03);
        break;
      case 'dip':
        // The rod dunked in the pail: a short slosh and a low plop.
        this.hiss(0, 0.25, 1100, 0.14);
        this.hiss(0.08, 0.18, 2400, 0.08);
        this.glide('sine', 420, 180, 0, 0.18, 0.06);
        break;
      case 'sprinkle':
        // Three flicks of the rod: a splash of droplets each.
        for (let i = 0; i < 3; i++) {
          this.hiss(i * 0.3, 0.12, 4200, 0.2);
          for (let j = 0; j < 3; j++) this.tone('sine', 1800 + Math.random() * 1600, i * 0.3 + 0.03 + j * 0.03, 0.05, 0.05);
        }
        break;
      case 'bell-rattle':
        // The hand bell shaken hard (D2-10): fast, ragged rings that die away.
        for (let i = 0; i < 18; i++) {
          const t = 2.2 * (1 - Math.sqrt(1 - i / 18));
          this.ring(t, 0.9 * (1 - i / 20));
          this.hiss(t, 0.03, 3600, 0.12 * (1 - i / 18));
        }
        break;
      case 'bell-wind-down':
        // One last ring, left to hum away.
        this.ring(0, 0.8, 1.6);
        break;
      case 'exorcise':
        // The two-handed blessing (D2-11): a flick of the rod, then the
        // cross swung through the air, four times.
        for (let i = 0; i < 4; i++) {
          const t = i * 0.7;
          this.hiss(t + 0.1, 0.12, 4200, 0.22);
          for (let j = 0; j < 3; j++) this.tone('sine', 1800 + Math.random() * 1600, t + 0.13 + j * 0.03, 0.05, 0.05);
          this.hiss(t + 0.42, 0.16, 700, 0.18);
          this.glide('sine', 220, 120, t + 0.42, 0.16, 0.04);
        }
        break;
      case 'angry-squeak':
        // Cross little squeaks, up then sharply down (D2-10, D2-11).
        for (let i = 0; i < 3; i++) {
          const f = 900 + Math.random() * 160;
          this.glide('square', f, f * 1.5, i * 0.17, 0.06, 0.045);
          this.glide('square', f * 1.5, f * 0.8, i * 0.17 + 0.06, 0.07, 0.045);
        }
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

  /** The possessed music box's tune: bright, slightly out of tune and uneven. */
  tune(volume: number): void {
    if (volume <= 0.01) return;
    let t = 0;
    for (const f of MUSIC_BOX_TUNE) {
      const wobble = 1 + (Math.random() - 0.5) * 0.07;
      this.tone('sine', f * wobble, t, 0.5, 0.16 * volume);
      this.tone('sine', f * 2 * wobble, t, 0.2, 0.04 * volume);
      t += 0.2 + Math.random() * 0.09;
    }
  }

  /** The possessed teacup rattling on its saucer, at volume 0..1 (by distance). */
  clink(volume: number): void {
    if (volume <= 0.01) return;
    for (let i = 0; i < 4; i++) {
      const t = i * (0.05 + Math.random() * 0.03);
      this.tone('sine', 2500 + Math.random() * 1100, t, 0.1, 0.14 * volume);
      this.hiss(t, 0.02, 5200, 0.18 * volume);
    }
  }

  /** The possessed hand bell's ring, at volume 0..1 (by distance). */
  bell(volume: number): void {
    if (volume <= 0.01) return;
    this.ring(0, volume);
    this.ring(0.14, volume * 0.6);
  }

  /** The angry ghost's squeak as it's chased, at volume 0..1 (by distance). */
  squeak(volume: number): void {
    if (volume <= 0.01) return;
    const f = 950 + Math.random() * 150;
    this.glide('square', f, f * 1.45, 0, 0.06, 0.05 * volume);
    this.glide('square', f * 1.45, f * 0.85, 0.06, 0.07, 0.05 * volume);
  }

  /** One strike of a small brass bell: a few inharmonic partials decaying. */
  private ring(delay: number, level: number, length = 0.5): void {
    for (const [ratio, amp] of [[1, 1], [2.4, 0.5], [3.9, 0.3], [5.4, 0.15]] as const) {
      this.tone('sine', 1180 * ratio * (0.99 + Math.random() * 0.02), delay, length / ratio ** 0.3, 0.07 * amp * level);
    }
  }

  /** The possessed clown doll's titter, at volume 0..1 (by distance). */
  giggle(volume: number): void {
    if (volume <= 0.01) return;
    for (let i = 0; i < 5; i++) {
      const f = 1150 - i * 50 + Math.random() * 40;
      this.glide('triangle', f, f * 0.78, i * 0.12, 0.09, 0.12 * volume);
      this.glide('sine', f * 2, f * 1.6, i * 0.12, 0.07, 0.04 * volume);
    }
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

  private glide(type: OscillatorType, from: number, to: number, delay: number, length: number, level: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const t = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, t);
    osc.frequency.exponentialRampToValueAtTime(to, t + length);
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
