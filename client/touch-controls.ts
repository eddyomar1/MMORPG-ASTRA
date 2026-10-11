import { joystickVector } from './input';

export class TouchControls {
  private joystickId?: number; private attackId?: number;
  constructor(private joystick: HTMLElement, private attack: HTMLElement, private callbacks: {
    enabled: () => boolean; move: (side: number, forward: number) => void; attack: (held: boolean) => void;
  }) {
    joystick.addEventListener('pointerdown', e => {
      if (!callbacks.enabled() || this.joystickId !== undefined || e.button !== 0) return;
      e.preventDefault(); this.joystickId = e.pointerId; joystick.setPointerCapture(e.pointerId); this.move(e);
    });
    joystick.addEventListener('pointermove', e => { if (e.pointerId === this.joystickId) this.move(e); });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) joystick.addEventListener(event, e => {
      if ((e as PointerEvent).pointerId === this.joystickId) this.releaseJoystick();
    });
    attack.addEventListener('pointerdown', e => {
      if (!callbacks.enabled() || this.attackId !== undefined || e.button !== 0) return;
      e.preventDefault(); this.attackId = e.pointerId; attack.setPointerCapture(e.pointerId); callbacks.attack(true);
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) attack.addEventListener(event, e => {
      if ((e as PointerEvent).pointerId === this.attackId) this.releaseAttack();
    });
  }
  private move(e: PointerEvent) {
    const rect = this.joystick.getBoundingClientRect(), radius = rect.width * .36;
    const dx = e.clientX - rect.left - rect.width / 2, dy = e.clientY - rect.top - rect.height / 2;
    const length = Math.max(1, Math.hypot(dx, dy) / radius);
    this.joystick.style.setProperty('--stick-x', `${dx / length}px`);
    this.joystick.style.setProperty('--stick-y', `${dy / length}px`);
    const v = joystickVector(dx, dy, radius); this.callbacks.move(v.side, v.forward);
  }
  private releaseJoystick() {
    const id = this.joystickId; this.joystickId = undefined;
    if (id !== undefined && this.joystick.hasPointerCapture(id)) this.joystick.releasePointerCapture(id);
    this.joystick.style.setProperty('--stick-x', '0px'); this.joystick.style.setProperty('--stick-y', '0px'); this.callbacks.move(0, 0);
  }
  private releaseAttack() {
    const id = this.attackId; this.attackId = undefined;
    if (id !== undefined && this.attack.hasPointerCapture(id)) this.attack.releasePointerCapture(id);
    this.callbacks.attack(false);
  }
  reset() { this.releaseJoystick(); this.releaseAttack(); }
}

type Contact = { x: number; y: number; startX: number; startY: number; moved: boolean; button: number; type: string };
/** Canvas-only contacts: fingers captured by HUD controls never enter this map. */
export class WorldGestures {
  private contacts = new Map<number, Contact>();
  constructor(private canvas: HTMLCanvasElement, private callbacks: {
    enabled: () => boolean; rotate: (x: number, y: number) => void; zoom: (factor: number) => void;
    tap: (x: number, y: number, touch: boolean) => void;
  }) {
    canvas.addEventListener('contextmenu', e => e.preventDefault());
    canvas.addEventListener('pointerdown', e => {
      if (!callbacks.enabled() || ![0, 2].includes(e.button)) return;
      e.preventDefault(); canvas.focus({ preventScroll: true }); canvas.setPointerCapture(e.pointerId);
      this.contacts.set(e.pointerId, { x: e.clientX, y: e.clientY, startX: e.clientX, startY: e.clientY, moved: false, button: e.button, type: e.pointerType });
      if (this.contacts.size > 1) this.contacts.forEach(p => p.moved = true);
    });
    canvas.addEventListener('pointermove', e => {
      const p = this.contacts.get(e.pointerId); if (!p) return;
      const others = [...this.contacts.values()].filter(other => other !== p && other.type === 'touch');
      if (p.type === 'touch' && others.length) {
        const other = others[0], before = Math.hypot(p.x - other.x, p.y - other.y), after = Math.hypot(e.clientX - other.x, e.clientY - other.y);
        if (before > 10 && after > 10) callbacks.zoom(before / after);
      } else if (p.type === 'touch' || p.button === 2) {
        if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 8) p.moved = true;
        if (p.moved) callbacks.rotate(e.clientX - p.x, e.clientY - p.y);
      }
      if (Math.hypot(e.clientX - p.startX, e.clientY - p.startY) > 8) p.moved = true;
      p.x = e.clientX; p.y = e.clientY;
    });
    canvas.addEventListener('pointerup', e => {
      const p = this.contacts.get(e.pointerId); this.contacts.delete(e.pointerId);
      if (p && callbacks.enabled() && !p.moved && p.button === 0 && Math.hypot(e.clientX - p.startX, e.clientY - p.startY) <= 8) {
        const rect = canvas.getBoundingClientRect(); callbacks.tap(e.clientX - rect.left, e.clientY - rect.top, p.type === 'touch');
      }
    });
    for (const event of ['pointercancel', 'lostpointercapture']) canvas.addEventListener(event, e => this.contacts.delete((e as PointerEvent).pointerId));
    canvas.addEventListener('wheel', e => { if (callbacks.enabled()) { e.preventDefault(); callbacks.zoom(Math.exp(Math.max(-100, Math.min(100, e.deltaY)) * .002)); } }, { passive: false });
  }
  reset() {
    const ids = [...this.contacts.keys()]; this.contacts.clear();
    ids.forEach(id => { if (this.canvas.hasPointerCapture(id)) this.canvas.releasePointerCapture(id); });
  }
}
