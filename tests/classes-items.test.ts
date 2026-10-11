import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { CharacterStore } from '../server/database.js';
import { houseFor } from '../shared/banners.js';
import { GameWorld } from '../server/world.js';
import { CHARACTER_CLASSES, CLASS_WEAPONS, COLORS, INVENTORY_CAPACITY, ITEMS, NPC, WORLD, canStand, equipmentStats, migrateProfile, newProfile, type CharacterClass, type ItemKind } from '../shared/content.js';

const token = 'd'.repeat(64);
function setup(t: TestContext, kind: CharacterClass = 'knight') {
  const store = new CharacterStore(':memory:'); t.after(() => store.close());
  const events: { type: string; data: any }[] = [];
  const world = new GameWorld(store, e => events.push(e)); world.add('a', token, 'Clase', COLORS[0], kind);
  const p = world.state.players.get('a')!, profile = world.profiles.get('a')!;
  world.state.enemies.forEach((e, id) => { if (id !== 'e0') world.state.enemies.delete(id); });
  const enemy = world.state.enemies.get('e0')!; enemy.x = 0; enemy.z = -8;
  p.x = 0; p.z = 0;
  return { store, world, p, profile, enemy, events };
}
function advance(world: GameWorld, seconds: number) { for (let i = 0; i < Math.ceil(seconds / .05); i++) world.step(.05); }

test('ranged classes resolve delayed authoritative hits exactly once and use different health', t => {
  for (const kind of ['mage', 'archer'] as const) {
    const { world, p, enemy, events } = setup(t, kind);
    assert.equal(p.maxHp, CHARACTER_CLASSES[kind].health);
    world.action('a', { kind: 'attack', target: 'e0', damage: 99999 });
    assert.equal(enemy.hp, 65); assert.equal(world.state.projectiles.size, 1);
    world.action('a', { kind: 'attack', target: 'e0' }); assert.equal(world.state.projectiles.size, 1);
    advance(world, .6); assert.equal(world.state.projectiles.size, 0);
    assert.equal(enemy.hp, 65 - CHARACTER_CLASSES[kind].abilities.attack.damage);
    advance(world, .5); assert.equal(events.filter(e => e.type === 'hit' && !e.data.player).length, 1);
  }
});

test('shots cancel when target leaves range, dies or moves behind a pillar; invalid targets never auto-hit', t => {
  for (const reason of ['range', 'dead', 'obstacle']) {
    const { world, p, enemy } = setup(t, 'archer');
    world.action('a', { kind: 'attack', target: 'missing' }); assert.equal(world.state.projectiles.size, 0);
    if (reason === 'obstacle') { p.x = -5; p.z = -28; enemy.x = -5; enemy.z = -24; }
    world.action('a', { kind: 'attack', target: 'e0' }); assert.equal(world.state.projectiles.size, 1);
    if (reason === 'range') enemy.z = -30;
    if (reason === 'dead') { enemy.hp = 0; enemy.respawnAt = 999; }
    if (reason === 'obstacle') { enemy.x = -11; enemy.z = -28; }
    advance(world, .6); assert.equal(world.state.projectiles.size, 0); assert.equal(enemy.hp, reason === 'dead' ? 0 : 65);
  }
});

test('mage explosion damages nearby enemies at impact and knight cannot attack from ranged distance', t => {
  const { world, enemy } = setup(t, 'mage');
  const second = new (enemy.constructor as any)(); Object.assign(second, { kind: 'slime', x: 1, z: -8, hp: 65, maxHp: 65 }); world.state.enemies.set('e1', second);
  world.action('a', { kind: 'nova', target: 'e0' }); advance(world, .6);
  assert.equal(enemy.hp, 25); assert.equal(second.hp, 25);
  const knight = setup(t); knight.world.action('a', { kind: 'attack', target: 'e0' }); assert.equal(knight.enemy.hp, 65);
});

test('guard reduces damage, barriers absorb and expire, evade respects world collision', t => {
  const knight = setup(t); knight.enemy.z = -.5;
  knight.world.action('a', { kind: 'heal' }); knight.world.step(.05);
  assert.equal(knight.p.hp, 147); assert.ok(knight.p.guardUntil > 0);
  const mage = setup(t, 'mage'); mage.enemy.z = -.5;
  mage.world.action('a', { kind: 'heal' }); mage.world.step(.05);
  assert.equal(mage.p.hp, 100); assert.equal(mage.p.barrier, 38);
  mage.enemy.hp = 0; mage.enemy.respawnAt = 999; advance(mage.world, 5.1); assert.equal(mage.p.barrier, 0);
  const archer = setup(t, 'archer'); archer.p.x = WORLD.maxX - .7; archer.p.yaw = Math.PI / 2;
  archer.world.action('a', { kind: 'heal' }); assert.ok(canStand(archer.p.x, archer.p.z)); assert.ok(archer.p.x <= WORLD.maxX - .45);
  archer.p.x = -7.5; archer.p.z = 18; archer.p.yaw = -Math.PI / 2; archer.profile.cooldowns.heal = 0;
  archer.world.action('a', { kind: 'heal' }); assert.ok(canStand(archer.p.x, archer.p.z)); assert.ok(archer.p.x > -8.6);
});

test('equipment restrictions, health changes and shared potion cooldown prevent free healing', t => {
  const { world, p, profile } = setup(t, 'mage');
  profile.inventory.push({ kind: 'iron', count: 1 }, { kind: 'oakStaff', count: 1 }, { kind: 'amulet', count: 1 }, { kind: 'robe', count: 1 }, { kind: 'greaterPotion', count: 2 });
  world.equip('a', 'iron'); assert.equal(profile.weapon, 'starter');
  world.equip('a', 'oakStaff'); assert.equal(equipmentStats(profile).damage, 7); assert.equal(p.weapon, 'oakStaff');
  p.hp = 20; world.equip('a', 'amulet'); world.equip('a', 'robe'); assert.equal(p.maxHp, 140); assert.equal(p.hp, 20);
  world.equip('a', 'removeAccessory'); world.equip('a', 'amulet'); assert.equal(p.hp, 20);
  world.action('a', { kind: 'potion' }); assert.equal(p.hp, 85);
  world.equip('a', 'greaterPotion'); world.action('a', { kind: 'potion' }); assert.equal(p.hp, 85); assert.equal(profile.inventory.find(i => i.kind === 'greaterPotion')!.count, 2);
});

test('bandages heal over time, stop when attacking and require a break from combat', t => {
  const { world, p, profile, enemy } = setup(t);
  profile.inventory.push({ kind: 'bandage', count: 3 }); world.equip('a', 'bandage'); p.hp = 30;
  world.action('a', { kind: 'potion' }); advance(world, 1); assert.ok(p.hp >= 39.9 && p.hp <= 40.1);
  enemy.x = 0; enemy.z = -2; world.action('a', { kind: 'attack', target: 'e0' });
  enemy.hp = 0; enemy.respawnAt = 999; const hp = p.hp; advance(world, 1); assert.equal(p.hp, hp);
  profile.cooldowns.potion = 0; world.action('a', { kind: 'potion' }); assert.equal(profile.inventory.find(i => i.kind === 'bandage')!.count, 2);
});

test('full inventories never lose payment; freeing a material stack permits an atomic trade', t => {
  const { world, p, profile } = setup(t); Object.assign(p, houseFor(profile.bannerId).shop); profile.gold = 500;
  profile.inventory = Array.from({ length: INVENTORY_CAPACITY }, () => ({ kind: 'iron' as const, count: 1 }));
  world.interact('a', { op: 'buy', kind: 'potion' }); assert.equal(profile.gold, 500); assert.equal(profile.inventory.length, 24);
  profile.inventory[0] = { kind: 'fragment', count: 6 };
  world.interact('a', { op: 'trade', kind: 'astral' }); assert.equal(profile.gold, 500); assert.ok(profile.inventory.some(i => i.kind === 'astral')); assert.ok(!profile.inventory.some(i => i.kind === 'fragment'));
  world.interact('a', { op: 'trade', kind: 'astral' }); assert.equal(profile.inventory.filter(i => i.kind === 'astral').length, 1);
});

test('all sixteen objects are available across their matching classes and equipment occupies individual slots', t => {
  const purchased = new Set<string>();
  for (const classType of ['knight', 'mage', 'archer'] as const) {
    const { world, p, profile } = setup(t, classType); Object.assign(p, houseFor(profile.bannerId).shop); profile.gold = 10000;
    for (const key of Object.keys(ITEMS) as ItemKind[]) {
      if (ITEMS[key].classType && ITEMS[key].classType !== classType) continue;
      world.interact('a', { op: 'buy', kind: key }); advance(world, .4); assert.ok(profile.inventory.some(i => i.kind === key), key); purchased.add(key);
    }
    const weapon = CLASS_WEAPONS[classType][0]; world.interact('a', { op: 'buy', kind: weapon }); assert.equal(profile.inventory.filter(i => i.kind === weapon).length, 2);
  }
  assert.equal(purchased.size, 16);
});

test('boss rewards are class-specific, persist when full and can only be claimed once', t => {
  const { world, p, profile, store, enemy } = setup(t, 'archer');
  profile.inventory = Array.from({ length: 24 }, () => ({ kind: 'iron' as const, count: 1 }));
  enemy.kind = 'warden'; enemy.hp = 1; enemy.x = 0; enemy.z = -2;
  world.action('a', { kind: 'attack', target: 'e0' }); advance(world, .3);
  assert.deepEqual(profile.pendingRewards, [{ kind: 'astralBow', count: 1 }]);
  assert.deepEqual(store.load(token)!.pendingRewards, profile.pendingRewards);
  profile.inventory.pop(); p.x = world.state.elara.x; p.z = world.state.elara.z;
  world.interact('a', { op: 'claim' }); advance(world, .4); world.interact('a', { op: 'claim' });
  assert.equal(profile.pendingRewards.length, 0); assert.equal(profile.inventory.filter(i => i.kind === 'astralBow').length, 1);
});

test('legacy migration preserves progress, overflows safely and class choice and exchanges cannot repeat', t => {
  for (const oldClass of ['traveler', 'guardian', 'mage']) {
    const old = { ...newProfile('Antiguo', COLORS[0]), classType: oldClass, level: 4, gold: 91, weapon: 'astral', inventory: [{ kind: 'astral', count: 26 }] } as Record<string, any>;
    delete old.version;
    const original = structuredClone(old);
    const migrated = migrateProfile(old);
    assert.deepEqual(old, original); assert.deepEqual(migrateProfile(old), migrated);
    assert.equal(migrated.gold, 91); assert.equal(migrated.level, 4); assert.equal(migrated.inventory.length, 24); assert.equal(migrated.pendingRewards[0].count, 2);
    assert.deepEqual(migrateProfile(migrated), migrated); assert.equal(migrated.classChoicePending, true);
    const { store, world } = setup(t); world.remove('a'); store.save(token, migrated); world.add('a', token, 'Cambio', COLORS[1], 'knight');
    const p = world.state.players.get('a')!, profile = world.profiles.get('a')!;
    const x = p.x; world.input('a', { x: 1, z: 0 }); world.step(.1); assert.equal(p.x, x);
    world.chooseClass('a', 'archer'); world.chooseClass('a', 'mage'); assert.equal(profile.classType, 'archer'); assert.equal(profile.weapon, 'starter');
    world.chooseBanner('a', 'sun'); Object.assign(p, houseFor('sun').shop); world.interact('a', { op: 'exchange', kind: 'astral' });
    assert.equal(profile.inventory[0].kind, CLASS_WEAPONS.archer[1]); assert.equal(profile.legacyWeapons.astral, 25);
    world.remove('a'); world.add('a', token, 'Nuevo nombre', COLORS[0], 'mage'); assert.equal(world.profiles.get('a')!.classType, 'archer'); assert.equal(world.profiles.get('a')!.name, 'Antiguo');
  }
  assert.throws(() => migrateProfile({ version: 999 }), /Versión/);
});
