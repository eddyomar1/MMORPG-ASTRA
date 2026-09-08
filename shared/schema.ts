import { schema, t, type SchemaType } from '@colyseus/schema';

export const PlayerState = schema({
  name: t.string().default(''), color: t.string().default(''), classType: t.string().default('knight'),
  bannerId: t.string().default('crimson'), ready: t.boolean().default(false), life: t.uint32().default(0),
  weapon: t.string().default('starter'), armor: t.string().default(''), accessory: t.string().default(''),
  guardUntil: t.float32().default(0), barrierUntil: t.float32().default(0), barrier: t.float32().default(0),
  x: t.float32().default(0), z: t.float32().default(17), yaw: t.float32().default(Math.PI),
  hp: t.float32().default(120), maxHp: t.uint16().default(120), level: t.uint8().default(1),
  moving: t.boolean().default(false), attackUntil: t.float32().default(0),
  deadUntil: t.float32().default(0), connected: t.boolean().default(true),
}, 'PlayerState');
export type PlayerState = SchemaType<typeof PlayerState>;

export const EnemyState = schema({
  kind: t.string().default('slime'), x: t.float32().default(0), z: t.float32().default(0), yaw: t.float32().default(0),
  hp: t.float32().default(65), maxHp: t.uint16().default(65), attackUntil: t.float32().default(0),
  respawnAt: t.float32().default(0), alert: t.boolean().default(false),
}, 'EnemyState');
export type EnemyState = SchemaType<typeof EnemyState>;

export const LootState = schema({
  kind: t.string().default('crystal'), x: t.float32().default(0), z: t.float32().default(0), expires: t.float32().default(0),
}, 'LootState');
export type LootState = SchemaType<typeof LootState>;

export const ProjectileState = schema({
  owner: t.string().default(''), target: t.string().default(''), kind: t.string().default('arrow'),
  targetType: t.string().default('enemy'),
  x: t.float32().default(0), z: t.float32().default(0), startX: t.float32().default(0), startZ: t.float32().default(0),
  launched: t.float32().default(0), impactAt: t.float32().default(0),
}, 'ProjectileState');

export const NpcState = schema({ x: t.float32().default(-4), z: t.float32().default(13), yaw: t.float32().default(0), moving: t.boolean().default(false), pauseUntil: t.float32().default(0) }, 'NpcState');
export const WorldState = schema({
  elara: NpcState,
  players: t.map(PlayerState), enemies: t.map(EnemyState), loot: t.map(LootState), projectiles: t.map(ProjectileState), time: t.float32().default(0),
}, 'WorldState');
export type WorldState = SchemaType<typeof WorldState>;
