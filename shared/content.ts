export const WORLD = { minX: -36, maxX: 36, minZ: -43, maxZ: 32, spawnX: 0, spawnZ: 17, speed: 5, runSpeed: 7.5, maxPlayers: 8 };
export const NPC = { x: -4, z: 13, name: 'Elara', title: 'Guardiana del valle' };
export const COLORS = ['#64b8ab', '#cf8d60', '#9595d4', '#c7b873'];
export type EnemyKind = 'slime' | 'boar' | 'wisp' | 'warden';
export type CharacterClass = 'traveler' | 'guardian' | 'mage';
export type ItemKind = 'potion' | 'crystal' | 'iron' | 'astral';
export const CHARACTER_CLASSES: Record<CharacterClass, { name: string; label: string; description: string; color: string; accent: string }> = {
  traveler: { name: 'Viajero', label: 'Estilo · Viajero', description: 'Vestimenta jade para explorar el valle. Apariencia cosmética.', color: '#64b8ab', accent: '#d7f3dd' },
  guardian: { name: 'Guardián', label: 'Estilo · Guardián', description: 'Vestimenta ámbar de los protectores del valle. Apariencia cosmética.', color: '#cf8d60', accent: '#f5d4a6' },
  mage: { name: 'Mago', label: 'Estilo · Mago', description: 'Vestimenta amatista de los estudiosos del umbral. Apariencia cosmética.', color: '#9595d4', accent: '#d7ddff' },
};
export const ITEMS: Record<ItemKind, { name: string; description: string; icon: string; color: string }> = {
  potion: { name: 'Poción de vida', description: 'Recupera 65 de vida. También puedes usar R.', icon: '✚', color: '#dc8d82' },
  crystal: { name: 'Cristal del valle', description: 'Intercambia 3 cristales por una poción con Elara.', icon: '◇', color: '#79d4c3' },
  iron: { name: 'Espada de hierro', description: 'Una hoja robusta. +7 de daño al equiparla.', icon: '⚔', color: '#c0cad1' },
  astral: { name: 'Filo astral', description: 'El legado del guardián. +16 de daño al equiparlo.', icon: '✧', color: '#d6b570' },
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
export const maxHealth = (level: number) => 120 + (level - 1) * 25;
export interface ItemStack { kind: ItemKind; count: number }
export interface Profile {
  name: string; color: string; classType: CharacterClass; level: number; xp: number; gold: number;
  inventory: ItemStack[]; weapon: 'starter' | 'iron' | 'astral';
  quest: number; questAccepted: boolean; kills: Record<EnemyKind, number>;
  cooldowns: Record<string, number>;
}
export const emptyKills = (): Record<EnemyKind, number> => ({ slime: 0, boar: 0, wisp: 0, warden: 0 });
export const newProfile = (name: string, color: string, classType: CharacterClass = 'traveler'): Profile => ({ name, color, classType, level: 1, xp: 0, gold: 0, inventory: [{ kind: 'potion', count: 5 }], weapon: 'starter', quest: 0, questAccepted: false, kills: emptyKills(), cooldowns: {} });
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
