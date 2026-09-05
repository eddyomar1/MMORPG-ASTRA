import { schema, t, type SchemaType } from '@colyseus/schema';

export const PlayerState = schema({
  name: t.string().default(''), color: t.string().default(''),
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

export const WorldState = schema({
  players: t.map(PlayerState), enemies: t.map(EnemyState), loot: t.map(LootState), time: t.float32().default(0),
}, 'WorldState');
export type WorldState = SchemaType<typeof WorldState>;
