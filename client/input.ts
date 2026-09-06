import type { Preferences } from './preferences';

type InputState = { x: number; z: number; run: boolean; attack: boolean };

export class GameInput {
  keys = new Set<string>();
  touch = { side: 0, forward: 0 };
  running = false;
  attacking = false;

  reset() { this.keys.clear(); this.touch = { side: 0, forward: 0 }; this.running = false; this.attacking = false; }

  sample(cameraAlpha: number, preferences: Preferences): InputState {
    const bindings = preferences.bindings;
    const side = (this.keys.has(bindings.left) ? 1 : 0) - (this.keys.has(bindings.right) ? 1 : 0) - this.touch.side;
    const forward = (this.keys.has(bindings.forward) ? 1 : 0) - (this.keys.has(bindings.back) ? 1 : 0) + this.touch.forward;
    const length = Math.hypot(side, forward);
    if (!length) return { x: 0, z: 0, run: this.running || this.keys.has(bindings.run), attack: this.attacking };
    const normalizedSide = side / Math.max(1, length), normalizedForward = forward / Math.max(1, length);
    const sin = Math.sin(cameraAlpha), cos = Math.cos(cameraAlpha);
    return { x: normalizedSide * sin - normalizedForward * cos, z: -normalizedSide * cos - normalizedForward * sin, run: this.running || this.keys.has(bindings.run), attack: this.attacking };
  }
}
