import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CharacterStore } from '../server/database.js';
import { GameWorld } from '../server/world.js';
import { LootState } from '../shared/schema.js';
import { COLORS, ENEMIES, NPC, WORLD, canStand, type EnemyKind } from '../shared/content.js';

const token = 'a'.repeat(64);
function setup(t: TestContext) {
  const db = new CharacterStore(':memory:'); t.after(() => db.close());
  const events: { type: string; data: unknown; to?: string }[] = [];
  const world = new GameWorld(db, event => events.push(event)); world.add('alice', token, 'Alice', COLORS[0]);
  return { world, db, events, player: world.state.players.get('alice')!, profile: world.profiles.get('alice')! };
}
function advance(world: GameWorld, seconds: number) { for (let i = 0; i < Math.ceil(seconds / 0.05); i++) world.step(0.05); }

test('server normalizes input, rejects invalid movement, and stops stale input', t => {
  const { world, player } = setup(t); const start = player.x;
  world.input('alice', { x: 10000, z: 0, run: false }); world.step(0.1);
  assert.ok(Math.abs(player.x - start - WORLD.speed * 0.1) < 0.001);
  world.input('alice', { x: NaN, z: Infinity, run: true });
  advance(world, 1); const stopped = player.x; advance(world, 2); assert.equal(player.x, stopped);
  world.go('alice', { x: Infinity, z: -100000 }); advance(world, 1); assert.equal(player.x, stopped);
  assert.ok(canStand(player.x, player.z));
  world.go('alice', { x: player.x + 2, z: player.z }); world.step(0.1);
  assert.ok(player.x > stopped); world.stop('alice'); const paused = player.x; advance(world, 1); assert.equal(player.x, paused);
});
test('world bounds and house collisions cannot be crossed by running', t => {
  const { world, player } = setup(t); player.x = WORLD.maxX - 0.6;
  for (let i = 0; i < 30; i++) { world.input('alice', { x: 1, z: 0, run: true }); world.step(0.05); }
  assert.ok(player.x <= WORLD.maxX - 0.45);
  player.x = -6; player.z = 18;
  for (let i = 0; i < 40; i++) { world.input('alice', { x: -1, z: 0, run: true }); world.step(0.05); }
  assert.ok(player.x > -8.1); assert.ok(canStand(player.x, player.z));
});
test('attack distance and cooldown are authoritative, client damage is ignored', t => {
  const { world, player } = setup(t), e = world.state.enemies.get('e0')!;
  world.action('alice', { kind: 'attack', target: 'e0', damage: 9999 }); assert.equal(e.hp, 65);
  player.x = e.x; player.z = e.z + 2;
  world.action('alice', { kind: 'attack', target: 'e0', damage: 9999 }); assert.equal(e.hp, 42);
  for (let i = 0; i < 100; i++) world.action('alice', { kind: 'attack', target: 'e0' });
  assert.equal(e.hp, 42);
});
test('competing loot pickup grants the item to exactly one player', t => {
  const { world, player, profile } = setup(t); world.add('bob', 'b'.repeat(64), 'Bob', COLORS[1]);
  player.x = 0; player.z = -1; const bob = world.state.players.get('bob')!; bob.x = 0; bob.z = -1;
  const loot = new LootState(); loot.x = 0; loot.z = -1; loot.kind = 'crystal'; loot.expires = 100; world.state.loot.set('shared', loot);
  world.interact('alice'); world.interact('bob');
  assert.equal(world.state.loot.size, 0); assert.equal(profile.inventory.find(i => i.kind === 'crystal')?.count, 1);
  assert.equal(world.profiles.get('bob')!.inventory.find(i => i.kind === 'crystal'), undefined);
});
test('potions, healing and shops validate health, stock, payment and distance', t => {
  const { world, player, profile } = setup(t);
  world.action('alice', { kind: 'potion' }); assert.equal(profile.inventory[0].count, 5);
  player.hp = 10; world.action('alice', { kind: 'potion' }); assert.equal(player.hp, 75); assert.equal(profile.inventory[0].count, 4);
  world.action('alice', { kind: 'potion' }); assert.equal(player.hp, 75);
  world.equip('alice', 'astral'); assert.equal(profile.weapon, 'starter');
  profile.gold = 15; player.x = 0; player.z = -20; world.interact('alice', 'buy'); assert.equal(profile.gold, 15);
  player.x = NPC.x; player.z = NPC.z; world.interact('alice', 'buy'); assert.equal(profile.gold, 0); assert.equal(profile.inventory[0].count, 5);
  world.interact('alice', 'buy'); assert.equal(profile.inventory[0].count, 5);
});
test('cooperative contributors receive rewards and uninvolved players do not', t => {
  const { world, player, profile } = setup(t); world.add('bob', 'b'.repeat(64), 'Bob', COLORS[1]); world.add('cara', 'c'.repeat(64), 'Cara', COLORS[2]);
  const e = world.state.enemies.get('e0')!, bob = world.state.players.get('bob')!;
  player.x = e.x; player.z = e.z + 1; bob.x = e.x + 1; bob.z = e.z;
  world.action('alice', { kind: 'attack', target: 'e0' }); world.action('bob', { kind: 'attack', target: 'e0' });
  advance(world, 0.7); world.action('alice', { kind: 'attack', target: 'e0' });
  assert.equal(e.hp, 0); assert.equal(profile.xp, 25); assert.equal(world.profiles.get('bob')!.xp, 25); assert.equal(world.profiles.get('cara')!.xp, 0);
  assert.equal(world.state.loot.size, 1);
});
test('enemy death, despawn timer and player resurrection complete correctly', t => {
  const { world, player } = setup(t);
  const enemy = world.state.enemies.get('e0')!; enemy.hp = 0; enemy.respawnAt = 0.2;
  advance(world, 0.3); assert.equal(enemy.hp, enemy.maxHp);
  player.hp = 0; player.deadUntil = world.state.time + 5; player.x = 8; player.z = -20;
  advance(world, 5.1); assert.equal(player.hp, player.maxHp); assert.equal(player.x, WORLD.spawnX); assert.equal(player.z, WORLD.spawnZ);
});
test('all three quest chapters can be completed, awarded once and reach level 5', t => {
  const { world, player, profile } = setup(t);
  const talk = () => { player.x = NPC.x; player.z = NPC.z; world.interact('alice'); };
  const kill = (kind: EnemyKind) => {
    const [id, enemy] = [...world.state.enemies.entries()].find(([, e]) => e.kind === kind)!;
    enemy.hp = ENEMIES[kind].hp; enemy.x = 0; enemy.z = -5; player.x = 0; player.z = -3;
    for (let i = 0; enemy.hp > 0 && i < 100; i++) {
      player.hp = player.maxHp; player.x = enemy.x; player.z = enemy.z + 2;
      world.action('alice', { kind: 'attack', target: id }); advance(world, 0.7);
    }
    assert.equal(enemy.hp, 0);
  };
  talk(); assert.equal(profile.questAccepted, true);
  kill('slime'); kill('slime'); kill('slime'); talk(); assert.equal(profile.quest, 1);
  talk(); kill('boar'); kill('boar'); kill('wisp'); kill('wisp'); talk(); assert.equal(profile.quest, 2);
  talk(); kill('warden'); talk(); assert.equal(profile.quest, 3);
  assert.equal(profile.level, 5); assert.ok(profile.inventory.some(i => i.kind === 'astral'));
  const gold = profile.gold; talk(); assert.equal(profile.gold, gold);
  world.equip('alice', 'astral'); assert.equal(profile.weapon, 'astral');
});
test('SQLite restart preserves progress and private token prevents name impersonation', () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-save-')); const path = join(dir, 'game.sqlite');
  try {
    let store = new CharacterStore(path); let world = new GameWorld(store); world.add('a', token, 'Alice', COLORS[0]);
    const p = world.profiles.get('a')!; p.level = 3; p.gold = 75; p.quest = 1; p.inventory.push({ kind: 'iron', count: 1 }); p.weapon = 'iron'; world.saveAll(); store.close();
    store = new CharacterStore(path); world = new GameWorld(store); world.add('a2', token, 'Changed name', COLORS[2]);
    assert.equal(world.profiles.get('a2')!.name, 'Alice'); assert.equal(world.profiles.get('a2')!.level, 3); assert.equal(world.profiles.get('a2')!.gold, 75); assert.equal(world.profiles.get('a2')!.weapon, 'iron');
    assert.throws(() => world.add('duplicate', token, 'Alice', COLORS[0]), /ya está/);
    world.add('impostor', 'f'.repeat(64), 'Alice', COLORS[0]); assert.equal(world.profiles.get('impostor')!.level, 1); store.close();
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
