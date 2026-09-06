type TouchOptions = {
  enabled: () => boolean;
  move: (side: number, forward: number) => void;
  attack: (held: boolean) => void;
};

export class TouchControls {
  private pointer?: number;
  private center = { x: 0, y: 0 };
  private knob: HTMLElement;
  constructor(private joystick: HTMLElement, private attackButton: HTMLElement, private options: TouchOptions) {
    this.knob = joystick.querySelector<HTMLElement>('.joystick-knob') ?? joystick;
    joystick.addEventListener('pointerdown', event => {
      if (!options.enabled()) return;
      this.pointer = event.pointerId; this.center = { x: event.clientX, y: event.clientY }; joystick.setPointerCapture(event.pointerId); this.update(event.clientX, event.clientY); event.preventDefault();
    });
    joystick.addEventListener('pointermove', event => { if (event.pointerId === this.pointer) this.update(event.clientX, event.clientY); });
    joystick.addEventListener('pointerup', event => { if (event.pointerId === this.pointer) this.reset(); });
    joystick.addEventListener('pointercancel', () => this.reset());
    attackButton.addEventListener('pointerdown', event => { if (!options.enabled()) return; attackButton.setPointerCapture(event.pointerId); options.attack(true); event.preventDefault(); });
    attackButton.addEventListener('pointerup', () => options.attack(false));
    attackButton.addEventListener('pointercancel', () => options.attack(false));
  }
  private update(x: number, y: number) {
    const dx = x - this.center.x, dy = y - this.center.y, distance = Math.max(1, Math.hypot(dx, dy)), radius = 52, scale = Math.min(1, radius / distance);
    this.knob.style.transform = `translate(${dx * scale}px, ${dy * scale}px)`;
    this.options.move(dx * scale / radius, -dy * scale / radius);
  }
  reset() { this.pointer = undefined; this.knob.style.transform = ''; this.options.move(0, 0); this.options.attack(false); }
}

type GestureOptions = {
  enabled: () => boolean;
  rotate: (x: number, y: number) => void;
  zoom: (factor: number) => void;
  tap: (x: number, y: number, touch: boolean) => void;
};

export class WorldGestures {
  private pointer?: number;
  private last = { x: 0, y: 0 };
  private moved = false;
  constructor(private canvas: HTMLCanvasElement, private options: GestureOptions) {
    canvas.addEventListener('pointerdown', event => { if (!options.enabled()) return; this.pointer = event.pointerId; this.last = { x: event.clientX, y: event.clientY }; this.moved = false; canvas.setPointerCapture(event.pointerId); });
    canvas.addEventListener('pointermove', event => { if (event.pointerId !== this.pointer) return; const dx = event.clientX - this.last.x, dy = event.clientY - this.last.y; if (Math.hypot(dx, dy) > 2) this.moved = true; if (event.pointerType === 'mouse' && event.buttons !== 2) return; options.rotate(dx, dy); this.last = { x: event.clientX, y: event.clientY }; });
    canvas.addEventListener('pointerup', event => { if (event.pointerId !== this.pointer) return; if (!this.moved) options.tap(event.offsetX, event.offsetY, event.pointerType === 'touch'); this.pointer = undefined; });
    canvas.addEventListener('pointercancel', () => this.reset());
    canvas.addEventListener('wheel', event => { if (options.enabled()) { options.zoom(event.deltaY > 0 ? 1.08 : .92); event.preventDefault(); } }, { passive: false });
  }
  reset() { this.pointer = undefined; }
}
