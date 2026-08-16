/**
 * Web Audio API Procedural Sound Synthesizer for UniFAP Sorteios
 * Zero external mp3 dependencies, 100% reliable in any environment.
 */

type SoundEvent = 'DRAW_START' | 'DRAW_TICK' | 'DRAW_SLOWDOWN' | 'DRAW_RESULT' | 'WINNER';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.8;

  constructor() {
    // AudioContext will be initialized on first user gesture to comply with browser autoplay policies
  }

  private initContext() {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  public play(event: SoundEvent) {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx) return;

    try {
      switch (event) {
        case 'DRAW_START':
          this.playDrawStart(ctx);
          break;
        case 'DRAW_TICK':
          this.playTick(ctx);
          break;
        case 'DRAW_SLOWDOWN':
          this.playSlowdownTick(ctx);
          break;
        case 'DRAW_RESULT':
          this.playResultStrike(ctx);
          break;
        case 'WINNER':
          this.playWinnerFanfare(ctx);
          break;
      }
    } catch {
      // Audio playback failed gracefully
    }
  }

  private playTick(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.04);

    gain.gain.setValueAtTime(this.volume * 0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.04);
  }

  private playSlowdownTick(ctx: AudioContext) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(620, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(this.volume * 0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
  }

  private playDrawStart(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(220, now);
    osc.frequency.exponentialRampToValueAtTime(587.33, now + 0.6); // D5 tension rise

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(this.volume * 0.4, now + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.7);
  }

  private playResultStrike(ctx: AudioContext) {
    const now = ctx.currentTime;
    
    // Low punch
    const oscLow = ctx.createOscillator();
    const gainLow = ctx.createGain();
    oscLow.type = 'triangle';
    oscLow.frequency.setValueAtTime(130.81, now); // C3
    oscLow.frequency.exponentialRampToValueAtTime(65.41, now + 0.4);
    gainLow.gain.setValueAtTime(this.volume * 0.6, now);
    gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    oscLow.connect(gainLow);
    gainLow.connect(ctx.destination);
    oscLow.start(now);
    oscLow.stop(now + 0.5);

    // High shimmer
    const oscHigh = ctx.createOscillator();
    const gainHigh = ctx.createGain();
    oscHigh.type = 'sine';
    oscHigh.frequency.setValueAtTime(1046.5, now); // C6
    gainHigh.gain.setValueAtTime(this.volume * 0.4, now);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
    oscHigh.connect(gainHigh);
    gainHigh.connect(ctx.destination);
    oscHigh.start(now);
    oscHigh.stop(now + 0.6);
  }

  private playWinnerFanfare(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0.00, dur: 0.15 }, // C5
      { freq: 659.25, time: 0.15, dur: 0.15 }, // E5
      { freq: 783.99, time: 0.30, dur: 0.18 }, // G5
      { freq: 1046.50, time: 0.48, dur: 0.70 }, // C6 (grand finish)
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(this.volume * 0.45, now + time + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  }
}

export const soundEngine = new SoundEngine();
