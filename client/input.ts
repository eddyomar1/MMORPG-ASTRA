import { type Preferences } from './preferences';

export function joystickVector(dx: number, dy: number, radius: number, deadZone = .14) {
  const length = Math.hypot(dx, dy), fraction = Math.min(1, length / Math.max(1, radius));
  if (fraction <= deadZone) return { side: 0, forward: 0 };
  const strength = (fraction - deadZone) / (1 - deadZone);
  return { side: dx / length * strength, forward: -dy / length * strength };
}
export function cameraVector(side: number, forward: number, alpha: number) {
  const length = Math.max(1, Math.hypot(side, forward));
  return { x: (-Math.cos(alpha) * forward - Math.sin(alpha) * side) / length,
    z: (-Math.sin(alpha) * forward + Math.cos(alpha) * side) / length };
}
export class GameInput {
  keys = new Set<string>(); touch = { side: 0, forward: 0 }; attacking = false; running = false;
  reset() { this.keys.clear(); this.touch = { side: 0, forward: 0 }; this.attacking = false; this.running = false; }
  sample(alpha: number, p: Preferences) {
    const b = p.bindings;
    const has = (code: string, alternate?: string) => this.keys.has(code) || !!alternate && this.keys.has(alternate);
    const side = Number(has(b.right, 'ArrowRight')) - Number(has(b.left, 'ArrowLeft'));
    const forward = Number(has(b.forward, 'ArrowUp')) - Number(has(b.back, 'ArrowDown'));
    // An active joystick owns movement; methods never add up to extra speed.
    const vector = this.touch.side || this.touch.forward ? this.touch : { side, forward };
    return { ...cameraVector(vector.side, vector.forward, alpha), run: this.running || !p.toggleRun && has(b.run),
      attack: this.attacking || has(b.attack, 'Digit1') };
  }
}
