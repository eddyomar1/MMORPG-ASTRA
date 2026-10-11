export const defaultBindings = {
  forward: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', run: 'ShiftLeft',
  attack: 'Space', nova: 'KeyQ', heal: 'KeyF', potion: 'KeyR', interact: 'KeyE',
  target: 'Tab', inventory: 'KeyI', journal: 'KeyJ', map: 'KeyM', center: 'KeyC',
};
export type Binding = keyof typeof defaultBindings;
export type Quality = 'auto' | 'low' | 'medium' | 'high' | 'battery';
export type Preferences = {
  controls: 'auto' | 'touch' | 'desktop'; quality: Quality; scale: number; controlSize: number;
  sensitivity: number; leftHanded: boolean; tapToMove: boolean; toggleRun: boolean;
  reducedMotion: boolean; compact: boolean; assist: boolean; bindings: typeof defaultBindings;
};
export const bindingLabels: Record<Binding, string> = {
  forward: 'Avanzar', back: 'Retroceder', left: 'Izquierda', right: 'Derecha', run: 'Correr',
  attack: 'Ataque', nova: 'Habilidad ofensiva', heal: 'Habilidad defensiva', potion: 'Consumible', interact: 'Interactuar',
  target: 'Cambiar objetivo', inventory: 'Inventario', journal: 'Misiones', map: 'Mapa', center: 'Centrar cámara',
};
export function defaults(): Preferences {
  return { controls: 'auto', quality: 'auto', scale: 1, controlSize: 1, sensitivity: 1, leftHanded: false,
    tapToMove: false, toggleRun: false, reducedMotion: false, compact: false, assist: false, bindings: { ...defaultBindings } };
}
export function bindingError(bindings: typeof defaultBindings, action: Binding, code: string) {
  if (!/^(Key[A-Z]|Digit[2-9]|Space|Tab|ShiftLeft|ShiftRight)$/.test(code)) return 'Usa una letra, 2–9, Espacio, Tab o Shift. Enter, Escape, 1 y flechas están reservados.';
  const duplicate = (Object.keys(bindings) as Binding[]).find(key => key !== action && bindings[key] === code);
  return duplicate ? `Esa tecla ya se usa para ${bindingLabels[duplicate].toLowerCase()}.` : '';
}
export function parsePreferences(raw: string | null): Preferences {
  const p = defaults();
  try {
    const value = JSON.parse(raw || '{}');
    if (!value || typeof value !== 'object') return p;
    if (['auto', 'touch', 'desktop'].includes(value.controls)) p.controls = value.controls;
    if (['auto', 'low', 'medium', 'high', 'battery'].includes(value.quality)) p.quality = value.quality;
    for (const key of ['leftHanded', 'tapToMove', 'toggleRun', 'reducedMotion', 'compact', 'assist'] as const) if (typeof value[key] === 'boolean') p[key] = value[key];
    for (const [key, min, max] of [['scale', 1, 1.5], ['controlSize', 1, 1.25], ['sensitivity', .5, 2]] as const) {
      if (typeof value[key] === 'number' && Number.isFinite(value[key])) p[key] = Math.min(max, Math.max(min, value[key]));
    }
    if (value.bindings && typeof value.bindings === 'object') {
      const candidate = { ...defaultBindings };
      for (const key of Object.keys(candidate) as Binding[]) if (typeof value.bindings[key] === 'string') candidate[key] = value.bindings[key];
      if ((Object.keys(candidate) as Binding[]).every(key => !bindingError(candidate, key, candidate[key]))) p.bindings = candidate;
    }
  } catch { /* Invalid or older preferences fall back independently of character access. */ }
  return p;
}
export function keyLabel(code: string) { return code.replace('Key', '').replace('Digit', '').replace('ShiftLeft', 'Shift').replace('ShiftRight', 'Shift der.').replace('Space', 'Espacio'); }
