export const WORLD = { minX: -36, maxX: 36, minZ: -43, maxZ: 32, spawnX: 0, spawnZ: 17, speed: 5, runSpeed: 7.5, maxPlayers: 8 };
export const NPC = { x: -4, z: 13, name: 'Elara', title: 'Guardiana del valle' };
export const COLORS = ['#64b8ab', '#cf8d60', '#9595d4', '#c7b873'];
export type EnemyKind = 'slime' | 'boar' | 'wisp' | 'warden';
export type CharacterClass = 'knight' | 'mage' | 'archer';
export type ActionKind = 'attack' | 'nova' | 'heal' | 'potion';
export interface Ability { name: string; description: string; icon: string; cooldown: number; damage: number }
export interface ClassDefinition { name: string; label: string; description: string; color: string; accent: string; role: string; difficulty: string; health: number; range: number; starter: string; abilities: Record<Exclude<ActionKind, 'potion'>, Ability> }
export const CHARACTER_CLASSES: Record<CharacterClass, ClassDefinition> = {
  knight: { name: 'Caballero', label: 'Clase · Caballero', description: 'Protege a tus compañeros con acero y valor. Resistencia alta y combate cercano.', color: '#cfab67', accent: '#f5d4a6', role: 'Defensa · Cuerpo a cuerpo', difficulty: 'Fácil', health: 150, range: 3.5, starter: 'Espada de aprendiz', abilities: {
    attack: { name: 'Espadazo', description: 'Golpea a un enemigo cercano.', icon: 'sword', cooldown: .65, damage: 23 },
    nova: { name: 'Barrido', description: 'Golpea a todos los enemigos a 5 unidades.', icon: 'nova', cooldown: 6, damage: 37 },
    heal: { name: 'Guardia', description: 'Reduce un 60 % el daño recibido durante 4 segundos.', icon: 'shield', cooldown: 12, damage: 0 },
  } },
  mage: { name: 'Mago', label: 'Clase · Mago', description: 'Domina la energía del umbral. Daño en área y una barrera protectora.', color: '#a495df', accent: '#e2d5ff', role: 'Magia · Daño en área', difficulty: 'Media', health: 100, range: 9, starter: 'Bastón de aprendiz', abilities: {
    attack: { name: 'Pulso arcano', description: 'Un proyectil mágico dirigido a 9 unidades.', icon: 'star', cooldown: .85, damage: 27 },
    nova: { name: 'Explosión', description: 'Explota sobre el objetivo y alcanza enemigos a 3 unidades de él.', icon: 'nova', cooldown: 7, damage: 40 },
    heal: { name: 'Barrera', description: 'Absorbe 45 de daño, +5 por nivel adicional, durante 5 segundos.', icon: 'shield', cooldown: 12, damage: 0 },
  } },
  archer: { name: 'Arquero', label: 'Clase · Arquero', description: 'Encuentra tu distancia y dispara con precisión. Evade el peligro con agilidad.', color: '#75bea0', accent: '#cbefd3', role: 'Precisión · Movilidad', difficulty: 'Media', health: 115, range: 11, starter: 'Arco de aprendiz', abilities: {
    attack: { name: 'Flecha', description: 'Dispara una flecha dirigida a 11 unidades.', icon: 'bow', cooldown: .75, damage: 24 },
    nova: { name: 'Disparo certero', description: 'Un disparo de gran potencia al objetivo.', icon: 'bow', cooldown: 6, damage: 60 },
    heal: { name: 'Evasión', description: 'Avanza 3 unidades sin atravesar obstáculos. No da invulnerabilidad.', icon: 'arrow', cooldown: 8, damage: 0 },
  } },
};
export type ItemKind = 'potion' | 'crystal' | 'iron' | 'astral' | 'oakStaff' | 'astralStaff' | 'hunterBow' | 'astralBow' | 'plate' | 'robe' | 'leather' | 'amulet' | 'powerRing' | 'greaterPotion' | 'bandage' | 'fragment';
export type EquipmentSlot = 'weapon' | 'armor' | 'accessory';
export type ItemCategory = EquipmentSlot | 'consumable' | 'material';
export interface ItemDefinition { name: string; description: string; icon: string; color: string; category: ItemCategory; rarity: 'Común' | 'Inusual' | 'Raro'; stack: number; price: number; classType?: CharacterClass; damage?: number; health?: number; defense?: number; heal?: number; fragments?: number }
export const ITEMS: Record<ItemKind, ItemDefinition> = {
  potion: { name: 'Poción de vida', description: 'Recupera 65 de vida. Comparte recarga con las otras pociones.', icon: '✚', color: '#dc8d82', category: 'consumable', rarity: 'Común', stack: 99, price: 15, heal: 65 },
  crystal: { name: 'Cristal del valle', description: 'Intercambia 3 cristales por una poción con Elara.', icon: '◇', color: '#79d4c3', category: 'material', rarity: 'Común', stack: 99, price: 8 },
  iron: { name: 'Espada de hierro', description: 'Una hoja robusta. +7 de daño.', icon: '⚔', color: '#c0cad1', category: 'weapon', rarity: 'Inusual', stack: 1, price: 50, classType: 'knight', damage: 7 },
  astral: { name: 'Filo astral', description: 'El legado del guardián. +16 de daño.', icon: '✧', color: '#d6b570', category: 'weapon', rarity: 'Raro', stack: 1, price: 180, fragments: 6, classType: 'knight', damage: 16 },
  oakStaff: { name: 'Bastón de roble', description: 'Canaliza la energía del bosque. +7 de daño.', icon: '⚚', color: '#b7a0e0', category: 'weapon', rarity: 'Inusual', stack: 1, price: 50, classType: 'mage', damage: 7 },
  astralStaff: { name: 'Bastón del umbral', description: 'Un núcleo de energía antigua. +16 de daño.', icon: '✧', color: '#d6b570', category: 'weapon', rarity: 'Raro', stack: 1, price: 180, fragments: 6, classType: 'mage', damage: 16 },
  hunterBow: { name: 'Arco de cazador', description: 'Madera flexible y cuerda resistente. +7 de daño.', icon: '➶', color: '#91c5a3', category: 'weapon', rarity: 'Inusual', stack: 1, price: 50, classType: 'archer', damage: 7 },
  astralBow: { name: 'Arco del umbral', description: 'Cada flecha transporta luz ancestral. +16 de daño.', icon: '➶', color: '#d6b570', category: 'weapon', rarity: 'Raro', stack: 1, price: 180, fragments: 6, classType: 'archer', damage: 16 },
  plate: { name: 'Coraza de hierro', description: 'Reduce el daño recibido en 5 puntos.', icon: '⬡', color: '#c0cad1', category: 'armor', rarity: 'Inusual', stack: 1, price: 65, classType: 'knight', defense: 5 },
  robe: { name: 'Túnica rúnica', description: '+15 de vida y 2 puntos de protección.', icon: '♜', color: '#b7a0e0', category: 'armor', rarity: 'Inusual', stack: 1, price: 65, classType: 'mage', health: 15, defense: 2 },
  leather: { name: 'Armadura de cuero', description: '+10 de vida y 3 puntos de protección.', icon: '⬡', color: '#91c5a3', category: 'armor', rarity: 'Inusual', stack: 1, price: 65, classType: 'archer', health: 10, defense: 3 },
  amulet: { name: 'Amuleto de vitalidad', description: '+25 de vida máxima. Equiparlo no cura.', icon: '♧', color: '#91c5a3', category: 'accessory', rarity: 'Inusual', stack: 1, price: 55, health: 25 },
  powerRing: { name: 'Anillo de poder', description: '+4 de daño. Ocupa la misma ranura que el amuleto.', icon: '◉', color: '#d6b570', category: 'accessory', rarity: 'Inusual', stack: 1, price: 55, damage: 4 },
  greaterPotion: { name: 'Poción de vida mayor', description: 'Recupera 110 de vida. Comparte recarga con la poción de vida.', icon: '✚', color: '#eaa0a8', category: 'consumable', rarity: 'Inusual', stack: 99, price: 30, heal: 110 },
  bandage: { name: 'Vendaje', description: 'Recupera 50 de vida en 5 segundos. Requiere 5 segundos fuera de combate y se interrumpe al combatir.', icon: '▤', color: '#ded8bd', category: 'consumable', rarity: 'Común', stack: 99, price: 10, heal: 50 },
  fragment: { name: 'Fragmento del umbral', description: 'Intercambia 6 fragmentos por un arma avanzada con Elara.', icon: '◆', color: '#c8aff0', category: 'material', rarity: 'Raro', stack: 99, price: 35 },
};
export const INVENTORY_CAPACITY = 24;
export const CLASS_WEAPONS: Record<CharacterClass, [ItemKind, ItemKind]> = { knight: ['iron', 'astral'], mage: ['oakStaff', 'astralStaff'], archer: ['hunterBow', 'astralBow'] };
export const LOOT_TABLES: Record<EnemyKind, { kind: ItemKind; weight: number }[]> = {
  slime: [{ kind: 'crystal', weight: 60 }, { kind: 'potion', weight: 25 }, { kind: 'bandage', weight: 15 }],
  boar: [{ kind: 'iron', weight: 15 }, { kind: 'oakStaff', weight: 15 }, { kind: 'hunterBow', weight: 15 }, { kind: 'plate', weight: 10 }, { kind: 'robe', weight: 10 }, { kind: 'leather', weight: 10 }, { kind: 'crystal', weight: 25 }],
  wisp: [{ kind: 'fragment', weight: 50 }, { kind: 'amulet', weight: 15 }, { kind: 'powerRing', weight: 15 }, { kind: 'greaterPotion', weight: 20 }],
  warden: [{ kind: 'fragment', weight: 100 }],
};
export const ENEMIES: Record<EnemyKind, { name: string; hp: number; damage: number; speed: number; xp: number; gold: number; radius: number; color: string }> = {
  slime: { name: 'Brote silvestre', hp: 65, damage: 7, speed: 2.2, xp: 25, gold: 7, radius: 0.7, color: '#8dc679' },
  boar: { name: 'Jabalí de musgo', hp: 120, damage: 12, speed: 3.2, xp: 45, gold: 12, radius: 0.9, color: '#a88666' },
  wisp: { name: 'Eco errante', hp: 90, damage: 15, speed: 2.7, xp: 50, gold: 14, radius: 0.6, color: '#87ccdd' },
  warden: { name: 'Guardián del umbral', hp: 950, damage: 21, speed: 2, xp: 230, gold: 100, radius: 1.6, color: '#77988c' },
};
export const QUESTS = [
  { title: 'Un bosque inquieto', text: 'Los brotes han perdido su calma. Derrota a 3 brotes silvestres al norte de la aldea.', targets: { slime: 3 }, xp: 65, gold: 25 },
  { title: 'Ecos entre los árboles', text: 'Despeja el sendero a las ruinas: derrota a 2 jabalíes y 2 ecos errantes.', targets: { boar: 2, wisp: 2 }, xp: 130, gold: 45 },
  { title: 'La luz del umbral', text: 'Reúne a tus compañeros y derrota al Guardián del umbral en las ruinas del norte.', targets: { warden: 1 }, xp: 250, gold: 100 },
] as const;
export const xpForLevel = (level: number) => level * 90;
export const maxHealth = (level: number, classType: CharacterClass = 'knight') => CHARACTER_CLASSES[classType].health + (level - 1) * 25;
export interface ItemStack { kind: ItemKind; count: number }
export interface Profile {
  name: string; color: string; classType: CharacterClass; level: number; xp: number; gold: number;
  version: number; classChoicePending: boolean; legacyExchange: boolean; legacyWeapons: Partial<Record<'iron' | 'astral', number>>;
  inventory: ItemStack[]; weapon: 'starter' | ItemKind; armor: ItemKind | ''; accessory: ItemKind | ''; consumable: ItemKind; pendingRewards: ItemStack[];
  quest: number; questAccepted: boolean; kills: Record<EnemyKind, number>;
  cooldowns: Record<string, number>;
}
export const emptyKills = (): Record<EnemyKind, number> => ({ slime: 0, boar: 0, wisp: 0, warden: 0 });
export const newProfile = (name: string, color: string, classType: CharacterClass = 'knight'): Profile => ({ version: 2, classChoicePending: false, legacyExchange: false, legacyWeapons: {}, name, color, classType, level: 1, xp: 0, gold: 0, inventory: [{ kind: 'potion', count: 5 }], weapon: 'starter', armor: '', accessory: '', consumable: 'potion', pendingRewards: [], quest: 0, questAccepted: false, kills: emptyKills(), cooldowns: {} });
export function equipmentStats(p: Profile) {
  const result = { damage: 0, health: maxHealth(p.level, p.classType), defense: 0 };
  for (const slot of ['weapon', 'armor', 'accessory'] as const) {
    const key = p[slot]; if (!key || key === 'starter') continue;
    const item = ITEMS[key];
    if (item.category !== slot || item.classType && item.classType !== p.classType || !p.inventory.some(i => i.kind === key && i.count > 0)) continue;
    result.damage += item.damage ?? 0; result.health += item.health ?? 0; result.defense += item.defense ?? 0;
  }
  return result;
}
/** Normalize old cosmetic characters without choosing their permanent class for them. */
export function migrateProfile(raw: Record<string, any>): Profile {
  if (raw.version != null && raw.version !== 1 && raw.version !== 2) throw new Error('Versión de personaje no compatible. Actualiza el servidor sin sobrescribir el guardado.');
  if (raw.version === 2) return raw as Profile;
  const classType: CharacterClass = raw.classType === 'mage' ? 'mage' : 'knight';
  const p = { ...newProfile(raw.name, raw.color, classType), ...raw, version: 2, classType, classChoicePending: true, legacyExchange: true, cooldowns: {} } as Profile;
  p.inventory = []; p.pendingRewards = []; p.legacyWeapons = {};
  for (const stack of (raw.inventory ?? []) as ItemStack[]) {
    if (!Object.hasOwn(ITEMS, stack.kind) || !Number.isSafeInteger(stack.count) || stack.count <= 0) throw new Error('Inventario antiguo no válido; se conserva el guardado original.');
    if (stack.kind === 'iron' || stack.kind === 'astral') p.legacyWeapons[stack.kind] = (p.legacyWeapons[stack.kind] ?? 0) + stack.count;
    let remaining = stack.count;
    while (remaining > 0 && p.inventory.length < INVENTORY_CAPACITY) { const count = Math.min(remaining, ITEMS[stack.kind].stack); p.inventory.push({ kind: stack.kind, count }); remaining -= count; }
    if (remaining) p.pendingRewards.push({ kind: stack.kind, count: remaining });
  }
  return p;
}
export const questReady = (p: Profile) => p.questAccepted && p.quest < QUESTS.length && Object.entries(QUESTS[p.quest].targets).every(([kind, n]) => p.kills[kind as EnemyKind] >= n);
export interface Obstacle { x: number; z: number; radius: number; kind: 'tree' | 'house' | 'rock' | 'pillar'; variant: number }
export function randomSeed(seed: number) { return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
const rand = randomSeed(7304);
export const OBSTACLES: Obstacle[] = [
  { x: -12, z: 18, radius: 3.5, kind: 'house', variant: 0 },
  { x: 12, z: 14, radius: 3.5, kind: 'house', variant: 1 },
  { x: -14, z: 7, radius: 3, kind: 'house', variant: 2 },
  { x: 12, z: 26, radius: 3.2, kind: 'house', variant: 0 },
  ...[-8, 8].flatMap(x => [-28, -36].map(z => ({ x, z, radius: 1, kind: 'pillar' as const, variant: 0 }))),
];
for (let i = 0; i < 135; i++) {
  const x = (rand() - 0.5) * 68, z = rand() * 68 - 41;
  if (Math.abs(x) < 6 || (z < -26 && Math.abs(x) < 12) || OBSTACLES.some(o => Math.hypot(o.x - x, o.z - z) < o.radius + 2.5)) continue;
  OBSTACLES.push({ x, z, radius: 0.65 + rand() * 0.3, kind: rand() > 0.15 ? 'tree' : 'rock', variant: Math.floor(rand() * 3) });
}
export function canStand(x: number, z: number, radius = 0.45): boolean {
  return x >= WORLD.minX + radius && x <= WORLD.maxX - radius && z >= WORLD.minZ + radius && z <= WORLD.maxZ - radius && !OBSTACLES.some(o => Math.hypot(x - o.x, z - o.z) < radius + o.radius);
}
export function moveWithCollisions(x: number, z: number, dx: number, dz: number, radius = 0.45) {
  if (canStand(x + dx, z + dz, radius)) return { x: x + dx, z: z + dz };
  if (canStand(x + dx, z, radius)) x += dx;
  if (canStand(x, z + dz, radius)) z += dz;
  return { x, z };
}
export function clearLine(a: { x: number; z: number }, b: { x: number; z: number }) {
  const dx = b.x - a.x, dz = b.z - a.z, steps = Math.ceil(Math.hypot(dx, dz) / 0.4);
  for (let i = 1; i < steps; i++) if (!canStand(a.x + dx * i / steps, a.z + dz * i / steps, 0.1)) return false;
  return true;
}
export const SPAWNS: { kind: EnemyKind; x: number; z: number }[] = [
  { kind: 'slime', x: -3, z: 0 }, { kind: 'slime', x: 4, z: -3 }, { kind: 'slime', x: -5, z: -6 }, { kind: 'slime', x: 6, z: 2 },
  { kind: 'boar', x: -4, z: -13 }, { kind: 'boar', x: 5, z: -15 }, { kind: 'boar', x: -9, z: -16 },
  { kind: 'wisp', x: -4, z: -23 }, { kind: 'wisp', x: 4, z: -24 }, { kind: 'wisp', x: 10, z: -22 },
  { kind: 'warden', x: 0, z: -34 },
];
