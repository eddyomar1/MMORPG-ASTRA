export type Quality = 'auto' | 'low' | 'medium' | 'high' | 'battery';
export type Binding = 'forward' | 'left' | 'back' | 'right' | 'run' | 'attack' | 'nova' | 'heal' | 'potion' | 'interact' | 'inventory' | 'journal' | 'map' | 'target' | 'center';

export type Preferences = {
  controls: 'auto' | 'touch' | 'desktop';
  scale: number;
  controlSize: number;
  sensitivity: number;
  quality: Quality;
  leftHanded: boolean;
  tapToMove: boolean;
  toggleRun: boolean;
  compact: boolean;
  assist: boolean;
  reducedMotion: boolean;
  bindings: Record<Binding, string>;
};

const defaultBindings: Record<Binding, string> = {
  forward: 'KeyW', left: 'KeyA', back: 'KeyS', right: 'KeyD', run: 'ShiftLeft',
  attack: 'Space', nova: 'KeyQ', heal: 'KeyF', potion: 'KeyR', interact: 'KeyE',
  inventory: 'KeyI', journal: 'KeyJ', map: 'KeyM', target: 'Tab', center: 'KeyC',
};

export const bindingLabels: Record<Binding, string> = {
  forward: 'Avanzar', left: 'Mover a la izquierda', back: 'Retroceder', right: 'Mover a la derecha',
  run: 'Correr', attack: 'Ataque', nova: 'Onda astral', heal: 'Luz vital', potion: 'Poción',
  interact: 'Interactuar', inventory: 'Inventario', journal: 'Diario', map: 'Mapa', target: 'Cambiar objetivo', center: 'Centrar cámara',
};

export function defaults(): Preferences {
  return { controls: 'auto', scale: 1, controlSize: 1, sensitivity: 1, quality: 'auto', leftHanded: false, tapToMove: false, toggleRun: false, compact: false, assist: true, reducedMotion: false, bindings: { ...defaultBindings } };
}

export function parsePreferences(raw: string | null): Preferences {
  const result = defaults();
  if (!raw) return result;
  try {
    const value = JSON.parse(raw) as Partial<Preferences>;
    if (value.controls === 'auto' || value.controls === 'touch' || value.controls === 'desktop') result.controls = value.controls;
    if (typeof value.scale === 'number' && [1, 1.25, 1.5].includes(value.scale)) result.scale = value.scale;
    if (typeof value.controlSize === 'number' && [1, 1.15, 1.25].includes(value.controlSize)) result.controlSize = value.controlSize;
    if (typeof value.sensitivity === 'number' && [0.5, 1, 1.5, 2].includes(value.sensitivity)) result.sensitivity = value.sensitivity;
    if (value.quality && ['auto', 'low', 'medium', 'high', 'battery'].includes(value.quality)) result.quality = value.quality as Quality;
    for (const key of ['leftHanded', 'tapToMove', 'toggleRun', 'compact', 'assist', 'reducedMotion'] as const) if (typeof value[key] === 'boolean') result[key] = value[key];
    if (value.bindings && typeof value.bindings === 'object') for (const key of Object.keys(defaultBindings) as Binding[]) if (typeof value.bindings[key] === 'string' && value.bindings[key]) result.bindings[key] = value.bindings[key];
  } catch { return result; }
  return result;
}

export function keyLabel(code: string): string {
  const labels: Record<string, string> = { Space: 'Espacio', ShiftLeft: 'Mayús', ShiftRight: 'Mayús', Tab: 'Tab', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' };
  return labels[code] ?? code.replace(/^Key/, '').replace(/^Digit/, '');
}

export function bindingError(bindings: Record<Binding, string>, binding: Binding, code: string): string {
  if (['Escape', 'Enter'].includes(code)) return 'Esa tecla está reservada.';
  const conflict = (Object.keys(bindings) as Binding[]).find(key => key !== binding && bindings[key] === code);
  return conflict ? `Esa tecla ya está asignada a ${bindingLabels[conflict].toLowerCase()}.` : '';
}
