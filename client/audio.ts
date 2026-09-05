export class GameAudio {
  private context?: AudioContext; enabled = false;
  private ambient?: OscillatorNode; private ambientGain?: GainNode;
  toggle() {
    this.enabled = !this.enabled;
    if (this.enabled) {
      this.context ??= new AudioContext(); void this.context.resume();
      this.ambient = this.context.createOscillator(); this.ambientGain = this.context.createGain();
      this.ambient.frequency.value = 130.81; this.ambientGain.gain.value = 0.012;
      this.ambient.connect(this.ambientGain).connect(this.context.destination); this.ambient.start();
    } else { this.ambient?.stop(); this.ambient?.disconnect(); this.ambientGain?.disconnect(); }
    return this.enabled;
  }
  play(kind: string) {
    if (!this.enabled || !this.context) return;
    const oscillator = this.context.createOscillator(), gain = this.context.createGain(), now = this.context.currentTime;
    oscillator.type = kind === 'hit' ? 'triangle' : 'sine';
    oscillator.frequency.setValueAtTime(kind === 'hit' ? 170 : kind === 'heal' ? 660 : 440, now);
    oscillator.frequency.exponentialRampToValueAtTime(kind === 'hit' ? 55 : 880, now + 0.15);
    gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
    oscillator.connect(gain).connect(this.context.destination); oscillator.start(); oscillator.stop(now + 0.3);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
