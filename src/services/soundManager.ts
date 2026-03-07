/**
 * Chess Sound Manager
 * Generates synthetic chess sounds using Web Audio API — no external files needed.
 */

type SoundType = "move" | "capture" | "check" | "castle" | "promote" | "gameStart" | "gameEnd" | "illegal";

class SoundManager {
  private ctx: AudioContext | null = null;
  private enabled = true;

  private getCtx(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  isEnabled() {
    return this.enabled;
  }

  play(type: SoundType) {
    if (!this.enabled) return;

    try {
      const ctx = this.getCtx();
      switch (type) {
        case "move":
          this.playTone(ctx, 600, 0.06, "sine", 0.3);
          break;
        case "capture":
          this.playNoise(ctx, 0.08, 0.4);
          this.playTone(ctx, 300, 0.1, "sawtooth", 0.2);
          break;
        case "check":
          this.playTone(ctx, 880, 0.05, "square", 0.25);
          setTimeout(() => this.playTone(ctx, 1100, 0.05, "square", 0.2), 60);
          break;
        case "castle":
          this.playTone(ctx, 500, 0.05, "sine", 0.25);
          setTimeout(() => this.playTone(ctx, 650, 0.05, "sine", 0.25), 80);
          break;
        case "promote":
          this.playTone(ctx, 523, 0.08, "sine", 0.3);
          setTimeout(() => this.playTone(ctx, 659, 0.08, "sine", 0.3), 100);
          setTimeout(() => this.playTone(ctx, 784, 0.1, "sine", 0.3), 200);
          break;
        case "gameStart":
          this.playTone(ctx, 440, 0.1, "sine", 0.2);
          setTimeout(() => this.playTone(ctx, 660, 0.15, "sine", 0.25), 150);
          break;
        case "gameEnd":
          this.playTone(ctx, 660, 0.15, "sine", 0.3);
          setTimeout(() => this.playTone(ctx, 440, 0.2, "sine", 0.25), 200);
          break;
        case "illegal":
          this.playTone(ctx, 200, 0.1, "sawtooth", 0.15);
          break;
      }
    } catch {
      // Audio not available
    }
  }

  private playTone(ctx: AudioContext, freq: number, duration: number, type: OscillatorType, volume: number) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  private playNoise(ctx: AudioContext, duration: number, volume: number) {
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * volume;
    }
    const source = ctx.createBufferSource();
    const gain = ctx.createGain();
    source.buffer = buffer;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  }
}

export const soundManager = new SoundManager();
