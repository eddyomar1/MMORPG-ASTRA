import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { CharacterStore } from '../server/database.js';
import { GameWorld } from '../server/world.js';
import { ElaraWalk, villagePath } from '../server/elara.js';
import { NpcState, LootState } from '../shared/schema.js';
import { BANNERS, HOUSES, houseFor, isSafeZone } from '../shared/banners.js';
import { ITEMS, canStand, itemForClass, newProfile, type ItemKind } from '../shared/content.js';

const token = 'a'.repeat(64);
function advance(world: GameWorld, seconds: number) { for (let i = 0; i < Math.ceil(seconds / .05); i++) world.step(.05); }

test('classes keep independent progress across changes, reconnects, devices and SQLite restart', () => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-progress-')), path = join(dir, 'save.sqlite');
  let store = new CharacterStore(path);
  try {
    // Existing version 3 character is preserved without copying its progress into new classes.
    const old = newProfile('Historia', '', 'mage', 'ash'); Object.assign(old, { level: 4, xp: 53, gold: 211, quest: 2, questAccepted: true });
    old.inventory.push({ kind: 'astralStaff', count: 1 }); old.weapon = 'astralStaff'; store.save(token, old);
    let world = new GameWorld(store); world.add('a', token, 'ignored', '', 'knight');
    let p = world.state.players.get('a')!; Object.assign(p, houseFor('ash').shop);
    world.switchClass('a', 'archer'); let archer = world.profiles.get('a')!;
    assert.equal(archer.level, 1); assert.equal(archer.gold, 0); assert.equal(archer.quest, 0); assert.equal(archer.weapon, 'starter'); assert.equal(p.maxHp, 115);
    assert.equal(archer.bannerId, 'ash'); assert.equal(p.color, BANNERS.ash.color);
    archer.level = 2; archer.xp = 17; archer.gold = 29; archer.inventory.push({ kind: 'hunterBow', count: 1 });
    world.switchClass('a', 'knight'); assert.equal(world.profiles.get('a')!.level, 1);
    world.switchClass('a', 'mage'); const mage = world.profiles.get('a')!;
    assert.equal(mage.level, 4); assert.equal(p.level, 4); assert.equal(mage.xp, 53); assert.equal(mage.gold, 211); assert.equal(mage.weapon, 'astralStaff'); assert.equal(mage.quest, 2);
    assert.ok(!mage.inventory.some(i => i.kind === 'hunterBow'));
    world.add('b', 'b'.repeat(64), 'Otra cuenta', '', 'mage'); assert.equal(world.profiles.get('b')!.level, 1);
    world.saveAll(); store.close(); store = new CharacterStore(path); world = new GameWorld(store);
    world.add('a', token, 'ignored', '', 'knight'); p = world.state.players.get('a')!; assert.equal(p.classType, 'mage'); assert.equal(p.level, 4);
    Object.assign(p, houseFor('ash').shop); world.switchClass('a', 'archer'); archer = world.profiles.get('a')!;
    assert.equal(archer.level, 2); assert.equal(archer.xp, 17); assert.equal(archer.gold, 29); assert.ok(archer.inventory.some(i => i.kind === 'hunterBow'));
  } finally { store.close(); rmSync(dir, { recursive: true, force: true }); }
});

test('class changes require the own house and clear outgoing class combat state', t => {
  const store = new CharacterStore(':memory:'); t.after(() => store.close()); const world = new GameWorld(store);
  world.add('a', token, 'Clases', '', 'mage'); const p = world.state.players.get('a')!;
  for (const position of [{x:0,z:0}, houseFor('sun').shop]) { Object.assign(p, position); world.switchClass('a', 'archer'); assert.equal(p.classType, 'mage'); }
  Object.assign(p, houseFor('crimson').shop); world.switchClass('a', 'fake'); assert.equal(p.classType, 'mage');
  p.hp = 0; world.switchClass('a', 'archer'); assert.equal(p.classType, 'mage'); p.hp = p.maxHp;
  world.action('a', { kind: 'heal' }); assert.ok(p.barrier > 0); world.switchClass('a', 'archer'); assert.equal(p.classType, 'archer'); assert.equal(p.barrier, 0);
});

test('equipment drops adapt to the collecting class and shops reject foreign equipment', t => {
  for (const classType of ['knight', 'mage', 'archer'] as const) {
    const store = new CharacterStore(':memory:'); t.after(() => store.close()); const world = new GameWorld(store);
    world.add('a', token, 'Botín', '', classType); const p = world.state.players.get('a')!, profile = world.profiles.get('a')!;
    for (const key of Object.keys(ITEMS) as ItemKind[]) {
      const mapped = itemForClass(key, classType); assert.ok(!ITEMS[mapped].classType || ITEMS[mapped].classType === classType);
      if (ITEMS[key].category !== 'weapon' && ITEMS[key].category !== 'armor') continue;
      Object.assign(p, {x:0,z:-1}); const loot = new LootState(); Object.assign(loot, {x:0,z:-1,kind:key,expires:99}); world.state.loot.set('drop',loot);
      world.interact('a'); assert.ok(profile.inventory.some(i=>i.kind===mapped)); assert.equal(world.state.loot.size,0);
    }
    assert.ok(profile.inventory.every(i=>!ITEMS[i.kind].classType || ITEMS[i.kind].classType===classType));
    Object.assign(p, houseFor('crimson').shop); profile.gold = 10000;
    for (const key of Object.keys(ITEMS) as ItemKind[]) if (ITEMS[key].classType && ITEMS[key].classType!==classType) world.interact('a',{op:'buy',kind:key});
    assert.equal(profile.gold,10000);
  }
});

test('Elara walks slowly along safe accessible routes through every house', () => {
  const npc = new NpcState(), walk = new ElaraWalk(npc), visited = new Set<string>();
  for (const h of HOUSES) assert.ok(villagePath(npc,h.shop).length);
  for (let i=0;i<40000 && visited.size<5;i++) {
    const before={x:npc.x,z:npc.z}; walk.step(.05,i*.05,()=>true);
    assert.ok(Math.hypot(npc.x-before.x,npc.z-before.z)<=.85*.05+.00001);
    assert.ok(canStand(npc.x,npc.z)); assert.ok(isSafeZone(npc));
    for(const h of HOUSES) if(Math.hypot(npc.x-h.shop.x,npc.z-h.shop.z)<.1) visited.add(h.id);
  }
  assert.equal(visited.size,5);
});

test('Elara waits for all conversations and resumes 3–10 seconds after the last one ends', () => {
  const npc = new NpcState(), walk = new ElaraWalk(npc); walk.step(.1,0,()=>true); walk.step(.1,.1,()=>true);
  walk.begin('a',1); walk.begin('b',1); const before={x:npc.x,z:npc.z};
  for(let time=1;time<20;time+=.1) { walk.keep('a',time); walk.keep('b',time); walk.step(.1,time,()=>true); }
  assert.deepEqual({x:npc.x,z:npc.z},before); assert.equal(npc.moving,false);
  walk.end('a',20); walk.keep('b',20); walk.step(.1,20,()=>true); assert.equal(npc.pauseUntil,0);
  walk.end('b',21); assert.ok(npc.pauseUntil>=24 && npc.pauseUntil<=31);
  const until=npc.pauseUntil; walk.step(.05,until-.1,()=>true); assert.deepEqual({x:npc.x,z:npc.z},before);
  walk.step(.05,until+.1,()=>true); assert.equal(npc.moving,true);
  walk.begin('a',40); walk.step(.05,43,()=>true); assert.ok(npc.pauseUntil>=46 && npc.pauseUntil<=53);
});

test('Elara interactions validate current position and release on disconnect or walking away', t => {
  const store = new CharacterStore(':memory:'); t.after(()=>store.close()); const world=new GameWorld(store);
  world.add('a',token,'Hablar',''); const p=world.state.players.get('a')!; p.x=30;p.z=0;
  world.interact('a',{op:'talk'}); assert.equal(world.profiles.get('a')!.questAccepted,false);
  p.x=world.state.elara.x;p.z=world.state.elara.z; world.interact('a',{op:'talk'}); assert.equal(world.profiles.get('a')!.questAccepted,true);
  assert.equal(world.state.elara.moving,false); world.invalidateCombat('a');
  assert.ok(world.state.elara.pauseUntil>=3 && world.state.elara.pauseUntil<=10);
  advance(world,11); assert.equal(world.state.elara.moving,true);
});
