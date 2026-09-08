import { EnemyState, LootState, PlayerState, ProjectileState, WorldState, NpcState } from '../shared/schema.js';
import { ElaraWalk } from './elara.js';
import { itemForClass } from '../shared/content.js';
import { CHARACTER_CLASSES, CLASS_WEAPONS, COLORS, ENEMIES, INVENTORY_CAPACITY, ITEMS, LOOT_TABLES, NPC, QUESTS, SPAWNS, WORLD, canStand, clearLine, emptyKills, equipmentStats, moveWithCollisions, newProfile, questReady, xpForLevel, type ActionKind, type CharacterClass, type EnemyKind, type ItemKind, type Profile } from '../shared/content.js';
import type { CharacterStore } from './database.js';
import { BANNERS, HOUSES, SHOP_RADIUS, PVP_DAMAGE_MULTIPLIER, bannerFromColor, houseFor, isBanner, isSafeZone, parseTarget, sameTarget, type BannerId, type TargetRef } from '../shared/banners.js';

type Event = { type: string; data: unknown; to?: string };
type Input = { x: number; z: number; run: boolean; at: number };
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
export class GameWorld {
  state = new WorldState();
  profiles = new Map<string, Profile>();
  private tokens = new Map<string, string>();
  private inputs = new Map<string, Input>();
  private targets = new Map<string, { x: number; z: number }>();
  private contributors = new Map<string, Map<string, number>>();
  private enemyCooldowns = new Map<string, number>();
  private chatTimes = new Map<string, number>();
  private lootId = 0;
  private projectileId = 0;
  private shots = new Map<string, { damage: number; range: number; area: boolean; generation: number }>();
  private combatAt = new Map<string, number>();
  private bandages = new Map<string, number>();
  private saveTime = 0;
  private elara: ElaraWalk;
  constructor(private store: CharacterStore, private emit: (event: Event) => void = () => {}) {
    this.state.elara = new NpcState(); this.elara = new ElaraWalk(this.state.elara);
    SPAWNS.forEach((spawn, i) => {
      const e = new EnemyState(); Object.assign(e, spawn, { hp: ENEMIES[spawn.kind].hp, maxHp: ENEMIES[spawn.kind].hp });
      this.state.enemies.set(`e${i}`, e);
    });
  }
  add(id: string, token: string, name: string, color: string, classType: CharacterClass = 'knight', bannerId: BannerId = bannerFromColor(color)) {
    if ([...this.tokens.values()].includes(token)) throw new Error('Este personaje ya está conectado en otra pestaña.');
    const safeClass = Object.hasOwn(CHARACTER_CLASSES, classType) ? classType : 'knight';
    if (!isBanner(bannerId)) throw new Error('Estandarte inválido.');
    const p = this.store.load(token) ?? newProfile(name, color, safeClass, bannerId);
    if (!Object.hasOwn(CHARACTER_CLASSES, p.classType ?? '')) p.classType = safeClass;
    p.cooldowns = {}; this.profiles.set(id, p); this.tokens.set(id, token);
    const health = equipmentStats(p).health;
    const player = new PlayerState(); Object.assign(player, { name: p.name, color: p.color, classType: p.classType, weapon: p.weapon, armor: p.armor, accessory: p.accessory, level: p.level, hp: health, maxHp: health, x: WORLD.spawnX + (this.state.players.size % 3) * 1.3, z: WORLD.spawnZ });
    this.state.players.set(id, player); this.changed(id);
    this.syncEquipment(id);
    this.emit({ type: 'chat', data: { name: 'Valle', text: `${p.name} ha llegado a la aldea.`, system: true } });
  }
  remove(id: string) {
    this.invalidateCombat(id); this.combatAt.delete(id);
    this.state.projectiles.forEach((shot, key) => { if (shot.owner === id) { this.state.projectiles.delete(key); this.shots.delete(key); } });
    this.save(id); this.profiles.delete(id); this.tokens.delete(id); this.inputs.delete(id); this.targets.delete(id); this.chatTimes.delete(id);
    this.state.players.delete(id);
    this.contributors.forEach(c => c.delete(id));
  }
  save(id: string) { const p = this.profiles.get(id), token = this.tokens.get(id); if (p && token) this.store.save(token, p); }
  saveAll() { this.profiles.forEach((_, id) => this.save(id)); }
  changed(id: string) { this.save(id); this.emit({ type: 'profile', data: this.profiles.get(id), to: id }); }
  notice(id: string, text: string) { this.emit({ type: 'notice', data: text, to: id }); }
  private ready(id: string) { const p = this.state.players.get(id), profile = this.profiles.get(id); return !!p && !!profile && p.hp > 0 && p.connected && !profile.classChoicePending && !profile.bannerChoicePending; }
  chooseBanner(id: string, bannerId: unknown) {
    const p = this.profiles.get(id), state = this.state.players.get(id);
    if (!p?.bannerChoicePending || !state?.connected || !isBanner(bannerId)) return;
    p.bannerId = bannerId; p.color = BANNERS[bannerId].color; p.bannerChoicePending = false;
    this.syncEquipment(id); this.changed(id); this.notice(id, `Estandarte ${BANNERS[bannerId].name} confirmado. Tu progreso se ha conservado.`);
  }
  invalidateCombat(id: string, stop = true) {
    const p = this.state.players.get(id); if (p) p.life++;
    if (stop) { this.bandages.delete(id); this.stop(id); this.elara.end(id, this.state.time); }
    this.state.projectiles.forEach((shot, key) => { if (shot.owner === id || shot.targetType === 'player' && shot.target === id) { this.state.projectiles.delete(key); this.shots.delete(key); } });
  }
  chooseClass(id: string, kind: unknown) {
    const p = this.profiles.get(id), state = this.state.players.get(id);
    if (!p?.classChoicePending || !state?.connected || typeof kind !== 'string' || !Object.hasOwn(CHARACTER_CLASSES, kind)) return;
    p.classType = kind as CharacterClass; p.classChoicePending = false;
    if (p.weapon !== 'starter' && ITEMS[p.weapon].classType !== p.classType) p.weapon = 'starter';
    this.syncEquipment(id); state.hp = state.maxHp; this.changed(id);
    this.notice(id, `Tu nueva clase es ${CHARACTER_CLASSES[p.classType].name}. Tu progreso se ha conservado.`);
  }
  private syncEquipment(id: string) {
    const p = this.profiles.get(id)!, state = this.state.players.get(id)!;
    Object.assign(state, { bannerId: p.bannerId, color: BANNERS[p.bannerId].color, ready: !p.classChoicePending && !p.bannerChoicePending, classType: p.classType, weapon: p.weapon, armor: p.armor, accessory: p.accessory, maxHp: equipmentStats(p).health });
    state.level = p.level; state.hp = Math.min(state.hp, state.maxHp);
  }
  switchClass(id: string, kind: unknown) {
    const current = this.profiles.get(id), player = this.state.players.get(id);
    if (!current || !player || !this.ready(id) || typeof kind !== 'string' || !Object.hasOwn(CHARACTER_CLASSES, kind) || kind === current.classType) return;
    if (distance(player, houseFor(current.bannerId).shop) > SHOP_RADIUS) return this.notice(id, 'Cambia de clase en la casa de tu estandarte.');
    const token = this.tokens.get(id)!;
    this.save(id);
    const next = this.store.loadClass(token, kind as CharacterClass) ?? newProfile(current.name, current.color, kind as CharacterClass, current.bannerId);
    Object.assign(next, { name: current.name, bannerId: current.bannerId, color: current.color, bannerChoicePending: false, classChoicePending: false, cooldowns: {} });
    this.store.save(token, next);
    this.invalidateCombat(id); this.contributors.forEach(c => c.delete(id)); this.combatAt.delete(id);
    this.profiles.set(id, next); player.barrier = player.barrierUntil = player.guardUntil = player.attackUntil = 0;
    this.syncEquipment(id); player.hp = player.maxHp;
    this.changed(id); this.notice(id, `${CHARACTER_CLASSES[next.classType].name} · Nivel ${next.level}. Cada clase conserva su propio progreso.`);
  }
  talk(id: string, active: unknown) {
    if (active === false) this.elara.end(id, this.state.time);
    else if (active === true && this.ready(id) && distance(this.state.players.get(id)!, this.state.elara) <= 4) this.elara.keep(id, this.state.time);
  }
  input(id: string, data: unknown) {
    if (!this.ready(id)) return;
    if (!data || typeof data !== 'object') return;
    const { x, z, run } = data as Record<string, unknown>;
    if (typeof x !== 'number' || typeof z !== 'number' || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const length = Math.max(1, Math.hypot(x, z));
    this.inputs.set(id, { x: x / length, z: z / length, run: run === true, at: this.state.time });
    if (x || z) this.targets.delete(id);
  }
  stop(id: string) { this.inputs.delete(id); this.targets.delete(id); }
  go(id: string, data: unknown) {
    if (!this.ready(id)) return;
    if (!data || typeof data !== 'object') return;
    const { x, z } = data as Record<string, unknown>;
    if (typeof x === 'number' && typeof z === 'number' && Number.isFinite(x) && Number.isFinite(z) && canStand(x, z)) this.targets.set(id, { x, z });
  }
  step(dt: number) {
    dt = Math.min(0.1, Math.max(0, dt)); this.state.time += dt;
    const now = this.state.time;
    this.state.players.forEach((p, id) => {
      p.moving = false;
      if (now >= p.barrierUntil) p.barrier = 0;
      if (p.hp <= 0) {
        if (now >= p.deadUntil) { p.x = WORLD.spawnX; p.z = WORLD.spawnZ; p.hp = p.maxHp; p.deadUntil = 0; this.notice(id, 'Has renacido junto al santuario.'); }
        return;
      }
      if (!this.ready(id)) return;
      const bandageUntil = this.bandages.get(id);
      if (bandageUntil != null) { p.hp = Math.min(p.maxHp, p.hp + Math.max(0, Math.min(dt, bandageUntil - (now - dt))) * 10); if (now >= bandageUntil) this.bandages.delete(id); }
      let input = this.inputs.get(id);
      if (!input || now - input.at > 0.3) input = { x: 0, z: 0, run: false, at: now };
      const target = this.targets.get(id);
      if (target && !input.x && !input.z) {
        const d = distance(p, target);
        if (d < 0.3) this.targets.delete(id);
        else input = { x: (target.x - p.x) / d, z: (target.z - p.z) / d, run: false, at: now };
      }
      if (input.x || input.z) {
        const speed = input.run ? WORLD.runSpeed : WORLD.speed;
        const next = moveWithCollisions(p.x, p.z, input.x * dt * speed, input.z * dt * speed);
        if (!isSafeZone(p) && isSafeZone(next)) this.invalidateCombat(id, false);
        p.moving = distance(p, next) > 0.001; p.x = next.x; p.z = next.z; p.yaw = Math.atan2(input.x, input.z);
        if (!p.moving) this.targets.delete(id);
      }
      if (isSafeZone(p) && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 12 * dt);
    });
    this.elara.step(dt, now, id => this.ready(id) && distance(this.state.players.get(id)!, this.state.elara) <= 4);
    this.state.enemies.forEach((e, id) => this.updateEnemy(id, e, dt));
    this.updateProjectiles();
    this.state.loot.forEach((loot, id) => { if (now >= loot.expires) this.state.loot.delete(id); });
    if (now - this.saveTime > 15) { this.saveAll(); this.saveTime = now; }
  }
  private updateEnemy(id: string, e: EnemyState, dt: number) {
    const now = this.state.time, def = ENEMIES[e.kind as EnemyKind], spawn = SPAWNS[Number(id.slice(1))];
    if (e.hp <= 0) {
      if (now >= e.respawnAt) { e.hp = e.maxHp; e.x = spawn.x; e.z = spawn.z; e.alert = false; this.contributors.delete(id); }
      return;
    }
    if (isSafeZone(e)) { e.x = spawn.x; e.z = spawn.z; e.alert = false; return; }
    let target: PlayerState | undefined, targetId = '', nearest = 14;
    if (distance(e, spawn) < 15) this.state.players.forEach((p, pid) => {
      const d = distance(p, e);
      const aggro = e.kind === 'warden' ? 11 : 8;
      const attacked = now - (this.contributors.get(id)?.get(pid) ?? -999) < 20;
      if (this.ready(pid) && !isSafeZone(p) && d < nearest && (d < aggro || attacked)) { target = p; targetId = pid; nearest = d; }
    });
    e.alert = !!target;
    if (target) {
      e.yaw = Math.atan2(target.x - e.x, target.z - e.z);
      if (nearest > def.radius + 1.1) {
        const next = moveWithCollisions(e.x, e.z, (target.x - e.x) / nearest * def.speed * dt, (target.z - e.z) / nearest * def.speed * dt, def.radius * 0.65);
        if (!isSafeZone(next)) { e.x = next.x; e.z = next.z; }
      } else if (now >= (this.enemyCooldowns.get(id) ?? 0) && clearLine(e, target)) {
        this.enemyCooldowns.set(id, now + (e.kind === 'warden' ? 1.8 : 1.4)); e.attackUntil = now + 0.4;
        if (e.kind === 'warden') {
          this.emit({ type: 'effect', data: { kind: 'slam', x: e.x, z: e.z } });
          this.state.players.forEach((p, pid) => { if (p.hp > 0 && distance(e, p) < 4.5 && clearLine(e, p)) this.damagePlayer(pid, def.damage); });
        } else this.damagePlayer(targetId, def.damage);
      }
    } else {
      const patrol = { x: spawn.x + Math.sin(now * 0.22 + Number(id.slice(1))) * 1.6, z: spawn.z + Math.cos(now * 0.2 + Number(id.slice(1))) * 1.6 };
      const d = distance(e, patrol);
      if (d > 0.2) { const next = moveWithCollisions(e.x, e.z, (patrol.x - e.x) / d * dt, (patrol.z - e.z) / d * dt, def.radius * 0.65); if (!isSafeZone(next)) { e.x = next.x; e.z = next.z; } e.yaw = Math.atan2(patrol.x - e.x, patrol.z - e.z); }
      if (distance(e, spawn) > 10) { e.hp = Math.min(e.maxHp, e.hp + dt * 20); this.contributors.delete(id); }
    }
  }
  private damagePlayer(id: string, amount: number) {
    const p = this.state.players.get(id); if (!p || !this.ready(id) || isSafeZone(p)) return;
    this.combatAt.set(id, this.state.time); this.bandages.delete(id);
    amount = Math.max(1, amount - equipmentStats(this.profiles.get(id)!).defense);
    if (p.guardUntil > this.state.time) amount = Math.ceil(amount * .4);
    if (p.barrierUntil > this.state.time) { const absorbed = Math.min(p.barrier, amount); p.barrier -= absorbed; amount -= absorbed; }
    p.hp = Math.max(0, p.hp - amount);
    this.emit({ type: 'hit', data: { id, x: p.x, z: p.z, amount, player: true } });
    if (p.hp === 0) { p.deadUntil = this.state.time + 5; p.moving = false; p.guardUntil = 0; p.barrierUntil = 0; p.barrier = 0; this.invalidateCombat(id); }
  }
  action(id: string, data: unknown) {
    if (!data || typeof data !== 'object') return;
    const { kind, target } = data as Record<string, unknown>;
    if (!['attack', 'nova', 'heal', 'potion'].includes(kind as string)) return;
    const p = this.state.players.get(id), profile = this.profiles.get(id);
    if (!p || !profile || !this.ready(id)) return;
    const action = kind as ActionKind, now = this.state.time;
    if ((profile.cooldowns[action] ?? 0) > now) return;
    if (action === 'potion') {
      if (p.hp >= p.maxHp) return this.notice(id, 'Tu vida ya está completa.');
      const item = ITEMS[profile.consumable];
      if (item.category !== 'consumable') return;
      if (profile.consumable === 'bandage' && now - (this.combatAt.get(id) ?? -999) < 5) return this.notice(id, 'Espera 5 segundos fuera de combate para usar un vendaje.');
      if (!this.consume(profile, profile.consumable, 1)) return this.notice(id, 'No tienes este consumible. Visita la casa de tu estandarte o selecciona otro en el inventario.');
      if (profile.consumable === 'bandage') this.bandages.set(id, now + 5);
      else p.hp = Math.min(p.maxHp, p.hp + (item.heal ?? 0));
      profile.cooldowns[action] = now + (profile.consumable === 'bandage' ? 8 : 4);
      this.emit({ type: 'effect', data: { kind: 'heal', x: p.x, z: p.z } }); this.changed(id); return;
    }
    const def = CHARACTER_CLASSES[profile.classType], ability = def.abilities[action];
    if (action === 'heal') {
      if (profile.classType === 'knight') p.guardUntil = now + 4;
      else if (profile.classType === 'mage') { p.barrierUntil = now + 5; p.barrier = 45 + (profile.level - 1) * 5; }
      else {
        const input = this.inputs.get(id), fresh = input && now - input.at < .3 && (input.x || input.z);
        const dx = fresh ? input.x : Math.sin(p.yaw), dz = fresh ? input.z : Math.cos(p.yaw), length = Math.hypot(dx, dz) || 1;
        this.stop(id);
        for (let i = 0; i < 12; i++) { const x = p.x + dx / length * .25, z = p.z + dz / length * .25; if (!canStand(x, z)) break; if (!isSafeZone(p) && isSafeZone({ z })) this.invalidateCombat(id, false); p.x = x; p.z = z; }
      }
      profile.cooldowns[action] = now + ability.cooldown;
      this.emit({ type: 'effect', data: { kind: profile.classType === 'archer' ? 'move' : 'guard', x: p.x, z: p.z } }); this.changed(id); return;
    }
    if (isSafeZone(p)) return this.notice(id, 'Zona segura: sal de la aldea para atacar.');
    const range = action === 'nova' && profile.classType === 'knight' ? 5 : def.range;
    const selected = parseTarget(target);
    if (target != null && !selected) return;
    let victims = this.combatTargets(id).filter(v => distance(p, v.entity) <= range + this.targetRadius(v.ref) && clearLine(p, v.entity));
    victims.sort((a, b) => Number(a.ref.type === 'player') - Number(b.ref.type === 'player') || distance(p, a.entity) - distance(p, b.entity));
    if (action === 'attack' || profile.classType !== 'knight') {
      if (selected) victims = victims.filter(v => sameTarget(v.ref, selected));
      victims = victims.slice(0, 1);
    }
    if (!victims.length) return this.notice(id, 'Elige un enemigo dentro de alcance y sin obstáculos.');
    profile.cooldowns[action] = now + ability.cooldown; p.attackUntil = now + 0.4;
    this.combatAt.set(id, now); this.bandages.delete(id);
    if (victims[0]) p.yaw = Math.atan2(victims[0].entity.x - p.x, victims[0].entity.z - p.z);
    const damage = ability.damage + (profile.level - 1) * 5 + equipmentStats(profile).damage;
    if (profile.classType === 'knight') {
      if (action === 'nova') this.emit({ type: 'effect', data: { kind: 'nova', x: p.x, z: p.z } });
      for (const v of victims) this.hitTarget(id, v.ref, damage);
    } else {
      const { ref, entity } = victims[0], key = `s${++this.projectileId}`, shot = new ProjectileState();
      Object.assign(shot, { owner: id, target: ref.id, targetType: ref.type, kind: profile.classType === 'mage' ? 'arcane' : 'arrow', x: p.x, z: p.z, startX: p.x, startZ: p.z, launched: now, impactAt: now + Math.max(.15, distance(p, entity) / 18) });
      this.state.projectiles.set(key, shot); this.shots.set(key, { damage, range, area: action === 'nova' && profile.classType === 'mage', generation: this.generation(ref) });
    }
    this.changed(id);
  }
  private entity(ref: TargetRef) { return ref.type === 'player' ? this.state.players.get(ref.id) : this.state.enemies.get(ref.id); }
  private generation(ref: TargetRef) { return ref.type === 'player' ? this.state.players.get(ref.id)?.life ?? -1 : this.state.enemies.get(ref.id)?.respawnAt ?? -1; }
  private targetRadius(ref: TargetRef) { return ref.type === 'enemy' && this.state.enemies.get(ref.id)?.kind === 'warden' ? 1 : 0; }
  private canHit(id: string, ref: TargetRef) {
    const attacker = this.state.players.get(id), target = this.entity(ref);
    if (!attacker || !this.ready(id) || isSafeZone(attacker) || !target || target.hp <= 0 || isSafeZone(target)) return false;
    return ref.type === 'enemy' || ref.id !== id && this.ready(ref.id) && this.profiles.get(id)!.bannerId !== this.profiles.get(ref.id)!.bannerId;
  }
  private combatTargets(id: string) {
    const refs: TargetRef[] = [...this.state.enemies.keys()].map(id => ({ type: 'enemy', id }));
    refs.push(...[...this.state.players.keys()].map(id => ({ type: 'player' as const, id })));
    return refs.filter(ref => this.canHit(id, ref)).map(ref => ({ ref, entity: this.entity(ref)! }));
  }
  private hitTarget(id: string, ref: TargetRef, damage: number) {
    if (!this.canHit(id, ref)) return;
    if (ref.type === 'enemy') this.hitEnemy(id, ref.id, this.state.enemies.get(ref.id)!, damage);
    else { this.combatAt.set(id, this.state.time); this.bandages.delete(id); this.damagePlayer(ref.id, Math.round(damage * PVP_DAMAGE_MULTIPLIER)); }
  }
  private hitEnemy(id: string, eid: string, e: EnemyState, damage: number) {
    if (e.hp <= 0) return;
    this.combatAt.set(id, this.state.time); this.bandages.delete(id);
    const contributions = this.contributors.get(eid) ?? new Map<string, number>(); contributions.set(id, this.state.time); this.contributors.set(eid, contributions);
    e.hp = Math.max(0, e.hp - damage); this.emit({ type: 'hit', data: { id: eid, x: e.x, z: e.z, amount: damage, player: false } });
    if (e.hp === 0) this.defeat(eid, e, id);
  }
  private updateProjectiles() {
    this.state.projectiles.forEach((shot, key) => {
      const spec = this.shots.get(key)!;
      const ref: TargetRef = { type: shot.targetType === 'player' ? 'player' : 'enemy', id: shot.target };
      const entity = this.entity(ref), origin = { x: shot.startX, z: shot.startZ };
      const valid = entity && this.canHit(shot.owner, ref) && this.generation(ref) === spec.generation && distance(origin, entity) <= spec.range + this.targetRadius(ref) && clearLine(origin, entity);
      if (valid && this.state.time < shot.impactAt) { const t = Math.min(1, (this.state.time - shot.launched) / (shot.impactAt - shot.launched)); shot.x = origin.x + (entity.x - origin.x) * t; shot.z = origin.z + (entity.z - origin.z) * t; return; }
      this.state.projectiles.delete(key); this.shots.delete(key);
      if (!valid) return;
      if (spec.area) {
        this.emit({ type: 'effect', data: { kind: 'nova', x: entity.x, z: entity.z } });
        for (const v of this.combatTargets(shot.owner)) if (distance(entity, v.entity) <= 3 && clearLine(entity, v.entity) && clearLine(origin, v.entity)) this.hitTarget(shot.owner, v.ref, spec.damage);
      } else this.hitTarget(shot.owner, ref, spec.damage);
    });
  }
  private gainXP(id: string, amount: number) {
    const p = this.profiles.get(id)!, state = this.state.players.get(id)!;
    p.xp += amount;
    while (p.level < 5 && p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level); p.level++; state.level = p.level; state.maxHp = equipmentStats(p).health; state.hp = state.maxHp;
      this.notice(id, `¡Nivel ${p.level}! Tu poder y tu vida han aumentado.`);
      this.emit({ type: 'effect', data: { kind: 'level', x: state.x, z: state.z } });
    }
    if (p.level === 5) p.xp = 0;
  }
  private defeat(eid: string, e: EnemyState, killer: string) {
    const kind = e.kind as EnemyKind, def = ENEMIES[kind], now = this.state.time;
    e.respawnAt = now + (kind === 'warden' ? 90 : 24); e.alert = false;
    const contributions = this.contributors.get(eid);
    this.state.players.forEach((player, pid) => {
      // Shared rewards only for living participants in range, never the whole map.
      if (player.hp <= 0 || distance(player, e) > 18 || (pid !== killer && now - (contributions?.get(pid) ?? -999) > 20)) return;
      const profile = this.profiles.get(pid)!;
      this.gainXP(pid, def.xp); profile.gold += def.gold;
      if (profile.questAccepted) profile.kills[kind]++;
      if (kind === 'warden') this.reward(profile, CLASS_WEAPONS[profile.classType][1]);
      this.notice(pid, `+${def.xp} experiencia · +${def.gold} oro`); this.changed(pid);
    });
    const table = LOOT_TABLES[kind]; let roll = Math.random() * table.reduce((sum, entry) => sum + entry.weight, 0);
    const drop = table.find(entry => (roll -= entry.weight) < 0) ?? table[table.length - 1];
    const loot = new LootState(); Object.assign(loot, { x: e.x, z: e.z, expires: now + 90, kind: itemForClass(drop.kind, this.profiles.get(killer)!.classType) });
    this.state.loot.set(`l${++this.lootId}`, loot);
    if (kind === 'warden') this.emit({ type: 'chat', data: { name: 'Valle', text: 'El Guardián ha caído. La luz vuelve a las ruinas.', system: true } });
  }
  private addItem(profile: Profile, kind: ItemKind) {
    const stack = profile.inventory.find(i => i.kind === kind && i.count < ITEMS[kind].stack);
    if (stack) stack.count++;
    else { if (profile.inventory.length >= INVENTORY_CAPACITY) return false; profile.inventory.push({ kind, count: 1 }); }
    return true;
  }
  private consume(profile: Profile, kind: ItemKind, count: number) {
    if (profile.inventory.reduce((n, i) => n + (i.kind === kind ? i.count : 0), 0) < count) return false;
    for (const stack of profile.inventory) { if (stack.kind !== kind) continue; const used = Math.min(stack.count, count); stack.count -= used; count -= used; if (!count) break; }
    profile.inventory = profile.inventory.filter(i => i.count > 0); return true;
  }
  private reward(p: Profile, kind: ItemKind) { if (!this.addItem(p, kind)) { const pending = p.pendingRewards.find(i => i.kind === kind); if (pending) pending.count++; else p.pendingRewards.push({ kind, count: 1 }); } }
  interact(id: string, data?: unknown) {
    const p = this.state.players.get(id), profile = this.profiles.get(id); if (!p || !profile || !this.ready(id)) return;
    if (data && (data as { op?: string }).op === 'house') {
      if (distance(p, houseFor(profile.bannerId).shop) <= SHOP_RADIUS) this.emit({ type: 'shop', data: houseFor(profile.bannerId).id, to: id });
      return;
    }
    if (data && (data as { op?: string }).op !== 'talk') return this.shop(id, data);
    if (distance(p, this.state.elara) <= 4) {
      this.elara.begin(id, this.state.time); this.emit({ type: 'elara', data: true, to: id });
      if (profile.quest >= QUESTS.length) { this.notice(id, 'Elara: el valle recordará vuestra hazaña. Gracias, viajero.'); return; }
      if (!profile.questAccepted) { profile.questAccepted = true; profile.kills = emptyKills(); this.notice(id, `Misión aceptada: ${QUESTS[profile.quest].title}`); }
      else if (questReady(profile)) {
        const quest = QUESTS[profile.quest]; this.gainXP(id, quest.xp); profile.gold += quest.gold; profile.quest++; profile.questAccepted = false; profile.kills = emptyKills();
        this.reward(profile, 'potion'); this.notice(id, `Misión completada · +${quest.xp} EXP · +${quest.gold} oro${profile.pendingRewards.length ? ' · Recompensa pendiente con Elara' : ''}`);
      } else this.notice(id, `Elara: ${QUESTS[profile.quest].text}`);
      this.changed(id); return;
    }
    if (data) return;
    const house = HOUSES.find(h => distance(p, h.shop) <= SHOP_RADIUS);
    if (house) {
      if (house.bannerId !== profile.bannerId) return this.notice(id, `Esta casa es de ${BANNERS[house.bannerId].name}. Busca tu casa ${BANNERS[profile.bannerId].name} en el mapa.`);
      this.emit({ type: 'shop', data: house.id, to: id }); return;
    }
    const loot = [...this.state.loot.entries()].filter(([, l]) => distance(p, l) <= 3).sort((a, b) => distance(p, a[1]) - distance(p, b[1]))[0];
    if (!loot) return this.notice(id, 'Acércate a Elara o a un botín y usa Interactuar.');
    const item = itemForClass(loot[1].kind as ItemKind, profile.classType);
    if (!this.addItem(profile, item)) return this.notice(id, 'No hay espacio para este objeto.');
    this.state.loot.delete(loot[0]); this.changed(id); this.notice(id, `Recogido: ${ITEMS[item].name}`);
  }
  equip(id: string, kind: unknown) {
    const p = this.profiles.get(id); if (!p || !this.ready(id) || typeof kind !== 'string') return;
    if (kind === 'starter') p.weapon = 'starter';
    else if (kind === 'removeArmor') p.armor = '';
    else if (kind === 'removeAccessory') p.accessory = '';
    else {
      if (!Object.hasOwn(ITEMS, kind) || !p.inventory.some(i => i.kind === kind && i.count > 0)) return;
      const item = ITEMS[kind as ItemKind];
      if (item.classType && item.classType !== p.classType) return this.notice(id, `Este objeto es para ${CHARACTER_CLASSES[item.classType].name}.`);
      if (item.category === 'material') return;
      if (item.category === 'consumable') p.consumable = kind as ItemKind;
      else p[item.category] = kind as ItemKind;
    }
    this.syncEquipment(id); this.changed(id); this.notice(id, 'Equipo actualizado.');
  }
  private shop(id: string, data: unknown) {
    const profile = this.profiles.get(id)!;
    const player = this.state.players.get(id)!;
    if (!this.ready(id)) return;
    if ((profile.cooldowns.shop ?? 0) > this.state.time) return;
    const request = data === 'buy' ? { op: 'buy', kind: 'potion' } : data;
    if (!request || typeof request !== 'object') return;
    const { op, kind } = request as Record<string, unknown>;
    if (op === 'claim') { if (distance(player, this.state.elara) > 4) return this.notice(id, 'Acércate a Elara para reclamar tus recompensas.'); this.elara.begin(id, this.state.time); }
    else if (distance(player, houseFor(profile.bannerId).shop) > SHOP_RADIUS) return this.notice(id, `Compra y vende junto a tu casa ${BANNERS[profile.bannerId].name}. Consulta el mapa.`);
    // Work on a copy: insufficient space or currency must never consume payment.
    const next: Profile = structuredClone(profile);
    if (op === 'claim') {
      for (const reward of next.pendingRewards) while (reward.count > 0 && this.addItem(next, itemForClass(reward.kind, next.classType))) reward.count--;
      next.pendingRewards = next.pendingRewards.filter(i => i.count > 0);
    } else {
      if (typeof kind !== 'string' || !Object.hasOwn(ITEMS, kind)) return;
      const key = kind as ItemKind, item = ITEMS[key];
      if (op === 'exchange') {
        if (!next.legacyExchange || !['iron', 'astral'].includes(key) || next.classType === 'knight') return;
        const legacyKey = key as 'iron' | 'astral';
        if (!(next.legacyWeapons[legacyKey] ?? 0)) return;
        const stack = next.inventory.find(i => i.kind === key); if (!stack) return;
        stack.kind = CLASS_WEAPONS[next.classType][key === 'astral' ? 1 : 0];
        next.legacyWeapons[legacyKey]!--;
        if (next.weapon === key) next.weapon = stack.kind;
      } else if (op === 'buy' || op === 'trade') {
        if (item.classType && item.classType !== profile.classType) return this.notice(id, 'Este objeto pertenece a otra clase. Cambia de clase en tu casa para adquirirlo.');
        if (op === 'trade') { if (!item.fragments || !this.consume(next, 'fragment', item.fragments)) return this.notice(id, 'No tienes suficientes fragmentos.'); }
        else if (!(key === 'potion' && this.consume(next, 'crystal', 3))) { if (next.gold < item.price) return this.notice(id, 'No tienes suficiente oro.'); next.gold -= item.price; }
        if (!this.addItem(next, key)) return this.notice(id, 'Inventario lleno. No se ha cobrado nada.');
      } else if (op === 'sell') {
        if (item.category === 'material' || item.category === 'consumable') return;
        if (['weapon', 'armor', 'accessory'].some(slot => next[slot as 'weapon' | 'armor' | 'accessory'] === key) && next.inventory.filter(i => i.kind === key).length <= 1) return this.notice(id, 'Desequipa este objeto antes de venderlo.');
        if (!this.consume(next, key, 1)) return;
        next.gold += Math.max(1, Math.floor(item.price / 4));
      } else return;
    }
    next.cooldowns.shop = this.state.time + .3;
    Object.assign(profile, next); this.syncEquipment(id); this.changed(id);
    this.notice(id, op === 'claim' ? (profile.pendingRewards.length ? 'Se reclamaron los objetos que cabían. Aún quedan recompensas con Elara.' : 'Recompensas reclamadas.') : 'Intercambio completado.');
  }
  chat(id: string, data: unknown) {
    if (typeof data !== 'string' || this.state.time - (this.chatTimes.get(id) ?? -99) < 0.7) return;
    const text = data.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 180), p = this.profiles.get(id);
    if (!text || !p) return; this.chatTimes.set(id, this.state.time);
    this.emit({ type: 'chat', data: { name: p.name, text, system: false } });
  }
}
