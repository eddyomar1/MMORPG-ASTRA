import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { CharacterStore } from '../server/database.js';
import { GameWorld } from '../server/world.js';
import { EnemyState } from '../shared/schema.js';
import { BANNERS, BANNER_IDS, HOUSES, SHOP_RADIUS, houseFor, isSafeZone, type BannerId } from '../shared/banners.js';
import { CHARACTER_CLASSES, NPC, WORLD, canStand, migrateProfile, newProfile, type CharacterClass } from '../shared/content.js';

function setup(t: TestContext, kind: CharacterClass = 'knight') {
  const store = new CharacterStore(':memory:'); t.after(() => store.close());
  const events: { type: string; data: any }[] = [];
  const world = new GameWorld(store, event => events.push(event));
  world.state.enemies.clear();
  for (const [id, banner] of [['a', 'crimson'], ['b', 'sun'], ['c', 'crimson']] as const) world.add(id, id.repeat(64), id, '#ffffff', kind, banner);
  const a = world.state.players.get('a')!, b = world.state.players.get('b')!, ally = world.state.players.get('c')!;
  Object.assign(a, { x: 0, z: 0 }); Object.assign(b, { x: 0, z: -2 }); Object.assign(ally, { x: 1, z: -2 });
  return { world, store, a, b, ally, events, profile: world.profiles.get('a')! };
}
function advance(world: GameWorld, seconds: number) { for (let i = 0; i < Math.ceil(seconds / .05); i++) world.step(.05); }
const attack = (world: GameWorld, id: string, target: string, kind = 'attack') => world.action(id, { kind, target: { type: 'player', id: target }, damage: 999999, bannerId: 'sun' });

test('canonical banners ignore client colors and remain fixed after reconnect', t => {
  const { world, store, a, profile } = setup(t);
  assert.equal(a.color, BANNERS.crimson.color); assert.equal(a.bannerId, 'crimson');
  world.chooseBanner('a', 'sun'); assert.equal(profile.bannerId, 'crimson');
  world.remove('a'); world.add('a', 'a'.repeat(64), 'changed', '#000000', 'mage', 'forest');
  assert.equal(world.profiles.get('a')!.bannerId, 'crimson'); assert.equal(store.load('a'.repeat(64))!.color, BANNERS.crimson.color);
  assert.throws(() => world.add('bad', 'd'.repeat(64), 'bad', '', 'mage', 'fake' as BannerId), /inválido/);
});

test('version 2 migration preserves progress, blocks play until one banner choice, and persists it', t => {
  const { world, store } = setup(t); world.remove('a');
  const old = { ...newProfile('Antiguo', '#64b8ab', 'archer'), version: 2, level: 4, gold: 231, quest: 2, questAccepted: true, weapon: 'hunterBow', inventory: [{ kind: 'hunterBow', count: 1 }], pendingRewards: [{ kind: 'amulet', count: 1 }] };
  const original = structuredClone(old), migrated = migrateProfile(old);
  assert.deepEqual(old, original); assert.deepEqual(migrateProfile(migrated), migrated);
  assert.equal(migrated.version, 3); assert.equal(migrated.bannerChoicePending, true);
  store.save('a'.repeat(64), migrated); world.add('a', 'a'.repeat(64), 'a', '', 'mage', 'sun');
  const a = world.state.players.get('a')!, p = world.profiles.get('a')!; Object.assign(a, { x: 0, z: 0 });
  world.input('a', { x: 1, z: 0 }); world.action('a', { kind: 'heal' }); attack(world, 'b', 'a'); world.step(.05);
  assert.equal(a.x, 0); assert.equal(a.hp, a.maxHp); assert.deepEqual(p.cooldowns, {}); assert.equal(a.ready, false);
  world.chooseBanner('a', 'unknown'); assert.equal(p.bannerChoicePending, true);
  world.chooseBanner('a', 'ash'); world.chooseBanner('a', 'sun');
  assert.equal(p.bannerId, 'ash'); assert.equal(a.ready, true); assert.equal(p.classType, 'archer'); assert.equal(p.gold, 231);
  for (const key of ['inventory', 'pendingRewards', 'level', 'quest', 'questAccepted', 'weapon'] as const) assert.deepEqual(p[key], old[key]);
  world.remove('a'); world.add('a', 'a'.repeat(64), 'a', '', 'mage', 'sun');
  assert.equal(world.profiles.get('a')!.bannerChoicePending, false); assert.equal(world.state.players.get('a')!.bannerId, 'ash');
});

for (const kind of ['knight', 'mage', 'archer'] as const) test(`${kind}: basic and special attacks hit rivals once, never allies or self`, t => {
  for (const action of ['attack', 'nova']) {
    const { world, a, b, ally, profile, events } = setup(t, kind);
    attack(world, 'a', 'c'); attack(world, 'a', 'a');
    world.action('a', { kind: 'attack', target: 'b' });
    world.action('a', { kind: 'attack', target: { type: 'invalid', id: 'b' } });
    assert.equal(world.state.projectiles.size, 0); assert.equal(b.hp, b.maxHp); assert.equal(profile.cooldowns.attack, undefined);
    attack(world, 'a', 'b', action);
    if (kind !== 'knight') { assert.equal(b.hp, b.maxHp); assert.equal([...world.state.projectiles.values()][0].targetType, 'player'); }
    advance(world, .6);
    assert.equal(b.hp, b.maxHp - CHARACTER_CLASSES[kind].abilities[action as 'attack' | 'nova'].damage);
    assert.equal(ally.hp, ally.maxHp); assert.equal(a.hp, a.maxHp);
    assert.equal(events.filter(e => e.type === 'hit' && e.data.id === 'b').length, 1);
    assert.equal(profile.xp, 0); assert.equal(profile.gold, 0); assert.equal(world.state.loot.size, 0);
  }
});

test('PvP uses equipment, guard and barrier, and does not reward kills or damage a new life', t => {
  const { world, b, profile } = setup(t);
  const targetProfile = world.profiles.get('b')!; targetProfile.inventory.push({ kind: 'plate', count: 1 });
  world.equip('b', 'plate'); world.action('b', { kind: 'heal' });
  attack(world, 'a', 'b'); assert.equal(b.hp, b.maxHp - Math.ceil((23 - 5) * .4));
  b.guardUntil = 0; b.barrier = 30; b.barrierUntil = 99; profile.cooldowns.attack = 0;
  const hp = b.hp; attack(world, 'a', 'b'); assert.equal(b.hp, hp); assert.equal(b.barrier, 12);
  b.barrier = 0; b.hp = 1; profile.cooldowns.attack = 0;
  const before = structuredClone({ gold: profile.gold, xp: profile.xp, kills: profile.kills, inventory: profile.inventory });
  attack(world, 'a', 'b'); assert.equal(b.hp, 0); assert.equal(b.life, 1);
  assert.deepEqual({ gold: profile.gold, xp: profile.xp, kills: profile.kills, inventory: profile.inventory }, before);
  advance(world, 5.1); assert.equal(b.hp, b.maxHp); assert.equal(b.z, WORLD.spawnZ); assert.equal(world.state.loot.size, 0);
});

for (const kind of ['knight', 'mage', 'archer'] as const) test(`${kind}: the exact village boundary rejects offense without cooldown and allows defense`, t => {
  const { world, a, b, profile } = setup(t, kind);
  a.z = 5; b.z = 4;
  for (const action of ['attack', 'nova']) attack(world, 'a', 'b', action);
  assert.equal(b.hp, b.maxHp); assert.equal(world.state.projectiles.size, 0); assert.deepEqual(profile.cooldowns, {});
  a.hp = 10; world.action('a', { kind: 'potion' }); assert.equal(a.hp, 75);
  world.action('a', { kind: 'heal' }); assert.ok(profile.cooldowns.heal > 0);
  a.z = 4; b.z = 5; attack(world, 'a', 'b'); assert.equal(b.hp, b.maxHp); assert.equal(profile.cooldowns.attack, undefined);
});

test('projectiles cancel when either player crosses into the village, even if they leave again before impact', t => {
  for (const who of ['a', 'b']) {
    const { world, a, b } = setup(t, 'archer');
    Object.assign(a, { x: -2, z: 4.9 }); Object.assign(b, { x: 2, z: 4.9 });
    attack(world, 'a', 'b'); assert.equal(world.state.projectiles.size, 1);
    world.input(who, { x: 0, z: 1 }); world.step(.05); assert.equal(world.state.projectiles.size, 0);
    world.input(who, { x: 0, z: -1 }); world.step(.05); world.stop(who); advance(world, .5);
    assert.equal(a.hp, a.maxHp); assert.equal(b.hp, b.maxHp);
  }
});

test('ranged attacks invalidate disconnect, removal, death, range and obstacle changes', t => {
  for (const reason of ['disconnect', 'remove', 'death', 'range', 'obstacle']) {
    const { world, a, b, profile } = setup(t, 'mage');
    if (reason === 'obstacle') { Object.assign(a, { x: -5, z: -28 }); Object.assign(b, { x: -5, z: -24 }); }
    attack(world, 'a', 'b'); assert.equal(world.state.projectiles.size, 1);
    if (reason === 'disconnect') { world.invalidateCombat('b'); b.connected = false; b.connected = true; }
    if (reason === 'remove') { world.remove('b'); world.add('b', 'b'.repeat(64), 'b', '', 'mage', 'sun'); Object.assign(world.state.players.get('b')!, { x: 0, z: -2 }); }
    if (reason === 'death') { b.hp = 0; world.invalidateCombat('b'); b.hp = b.maxHp; }
    if (reason === 'range') b.z = -30;
    if (reason === 'obstacle') Object.assign(b, { x: -11, z: -28 });
    advance(world, .6); assert.equal(world.state.players.get('b')!.hp, b.maxHp); assert.equal(world.state.projectiles.size, 0); assert.equal(profile.xp, 0);
  }
});

test('areas filter protected players and creatures individually; monsters cannot damage or patrol into the village', t => {
  for (const kind of ['knight', 'mage'] as const) {
    const { world, a, b, ally } = setup(t, kind);
    // Use production creature spawns so AI remains active throughout the test.
    const enemy = new EnemyState(); Object.assign(enemy, { kind: 'slime', hp: 65, maxHp: 65 }); world.state.enemies.set('e0', enemy);
    Object.assign(enemy, { x: 0, z: 3.5 }); Object.assign(a, { x: 0, z: 2 }); Object.assign(b, { x: 0, z: 4 }); Object.assign(ally, { x: 0, z: 4 });
    world.add('d', 'd'.repeat(64), 'protected', '', 'knight', 'forest'); const protectedPlayer = world.state.players.get('d')!; Object.assign(protectedPlayer, { x: 0, z: 5 });
    attack(world, 'a', 'b', 'nova'); advance(world, .4);
    assert.ok(b.hp < b.maxHp); assert.ok(enemy.hp < enemy.maxHp); assert.equal(protectedPlayer.hp, protectedPlayer.maxHp); assert.equal(ally.hp, ally.maxHp);
    Object.assign(enemy, { x: 0, z: 5 }); world.step(.05); assert.equal(isSafeZone(enemy), false); assert.equal(protectedPlayer.hp, protectedPlayer.maxHp);
    a.z = b.z = ally.z = 5; advance(world, 8); assert.equal(isSafeZone(enemy), false);
  }
});

test('each banner can buy and sell only at its own house and every access is safe and reachable', t => {
  for (const bannerId of BANNER_IDS) {
    const { world } = setup(t); world.remove('a'); world.add('a', 'f'.repeat(64), 'buyer', '', 'knight', bannerId);
    const player = world.state.players.get('a')!, p = world.profiles.get('a')!;
    p.gold = 500; p.inventory.push({ kind: 'iron', count: 1 });
    for (const house of HOUSES) {
      assert.ok(isSafeZone(house.shop)); assert.ok(canStand(house.shop.x, house.shop.z), house.id);
      if (house.bannerId === bannerId) continue;
      Object.assign(player, house.shop); const before = structuredClone(p);
      for (const op of ['buy', 'sell', 'trade', 'exchange']) world.interact('a', { op, kind: 'iron' });
      assert.deepEqual(p, before);
    }
    const own = houseFor(bannerId); Object.assign(player, own.shop);
    world.interact('a', { op: 'buy', kind: 'potion' }); assert.equal(p.gold, 485); assert.equal(p.inventory[0].count, 6);
    advance(world, .4); world.interact('a', { op: 'sell', kind: 'iron' }); assert.ok(p.gold > 485);
    advance(world, .4); player.x += SHOP_RADIUS + .1; const before = structuredClone(p);
    world.interact('a', { op: 'buy', kind: 'potion' }); world.interact('a', { op: 'sell', kind: 'iron' }); assert.deepEqual(p, before);
    Object.assign(player, { x: world.state.elara.x, z: world.state.elara.z }); world.interact('a'); assert.equal(p.questAccepted, true);
    world.interact('a', { op: 'buy', kind: 'potion' }); assert.equal(p.gold, before.gold);
  }
  // Flood-fill traversable village ground from the sanctuary to all five shops.
  const pending = [[0, 17]], seen = new Set<string>();
  while (pending.length) { const [x, z] = pending.pop()!, key = `${x},${z}`; if (seen.has(key) || !isSafeZone({ z }) || !canStand(x, z)) continue; seen.add(key); for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) pending.push([x + dx, z + dz]); }
  for (const house of HOUSES) assert.ok(seen.has(`${house.shop.x},${Math.round(house.shop.z)}`), `Access to ${house.id}`);
});
