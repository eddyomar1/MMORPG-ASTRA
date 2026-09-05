import { EnemyState, LootState, PlayerState, WorldState } from '../shared/schema.js';
import { COLORS, ENEMIES, ITEMS, NPC, QUESTS, SPAWNS, WORLD, canStand, clearLine, emptyKills, maxHealth, moveWithCollisions, newProfile, questReady, xpForLevel, type EnemyKind, type ItemKind, type Profile } from '../shared/content.js';
import type { CharacterStore } from './database.js';

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
  private saveTime = 0;
  constructor(private store: CharacterStore, private emit: (event: Event) => void = () => {}) {
    SPAWNS.forEach((spawn, i) => {
      const e = new EnemyState(); Object.assign(e, spawn, { hp: ENEMIES[spawn.kind].hp, maxHp: ENEMIES[spawn.kind].hp });
      this.state.enemies.set(`e${i}`, e);
    });
  }
  add(id: string, token: string, name: string, color: string) {
    if ([...this.tokens.values()].includes(token)) throw new Error('Este personaje ya está conectado en otra pestaña.');
    const p = this.store.load(token) ?? newProfile(name, COLORS.includes(color) ? color : COLORS[0]);
    p.cooldowns = {}; this.profiles.set(id, p); this.tokens.set(id, token);
    const player = new PlayerState(); Object.assign(player, { name: p.name, color: p.color, level: p.level, hp: maxHealth(p.level), maxHp: maxHealth(p.level), x: WORLD.spawnX + (this.state.players.size % 3) * 1.3, z: WORLD.spawnZ });
    this.state.players.set(id, player); this.changed(id);
    this.emit({ type: 'chat', data: { name: 'Valle', text: `${p.name} ha llegado a la aldea.`, system: true } });
  }
  remove(id: string) {
    this.save(id); this.profiles.delete(id); this.tokens.delete(id); this.inputs.delete(id); this.targets.delete(id); this.chatTimes.delete(id);
    this.state.players.delete(id);
    this.contributors.forEach(c => c.delete(id));
  }
  save(id: string) { const p = this.profiles.get(id), token = this.tokens.get(id); if (p && token) this.store.save(token, p); }
  saveAll() { this.profiles.forEach((_, id) => this.save(id)); }
  changed(id: string) { this.save(id); this.emit({ type: 'profile', data: this.profiles.get(id), to: id }); }
  notice(id: string, text: string) { this.emit({ type: 'notice', data: text, to: id }); }
  input(id: string, data: unknown) {
    if (!data || typeof data !== 'object') return;
    const { x, z, run } = data as Record<string, unknown>;
    if (typeof x !== 'number' || typeof z !== 'number' || !Number.isFinite(x) || !Number.isFinite(z)) return;
    const length = Math.max(1, Math.hypot(x, z));
    this.inputs.set(id, { x: x / length, z: z / length, run: run === true, at: this.state.time });
    if (x || z) this.targets.delete(id);
  }
  stop(id: string) { this.inputs.delete(id); this.targets.delete(id); }
  go(id: string, data: unknown) {
    if (!data || typeof data !== 'object') return;
    const { x, z } = data as Record<string, unknown>;
    if (typeof x === 'number' && typeof z === 'number' && Number.isFinite(x) && Number.isFinite(z) && canStand(x, z)) this.targets.set(id, { x, z });
  }
  step(dt: number) {
    dt = Math.min(0.1, Math.max(0, dt)); this.state.time += dt;
    const now = this.state.time;
    this.state.players.forEach((p, id) => {
      p.moving = false;
      if (p.hp <= 0) {
        if (now >= p.deadUntil) { p.x = WORLD.spawnX; p.z = WORLD.spawnZ; p.hp = p.maxHp; p.deadUntil = 0; this.notice(id, 'Has renacido junto al santuario.'); }
        return;
      }
      if (!p.connected) return;
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
        p.moving = distance(p, next) > 0.001; p.x = next.x; p.z = next.z; p.yaw = Math.atan2(input.x, input.z);
        if (!p.moving) this.targets.delete(id);
      }
      if (p.z > 5 && p.hp < p.maxHp) p.hp = Math.min(p.maxHp, p.hp + 12 * dt);
    });
    this.state.enemies.forEach((e, id) => this.updateEnemy(id, e, dt));
    this.state.loot.forEach((loot, id) => { if (now >= loot.expires) this.state.loot.delete(id); });
    if (now - this.saveTime > 15) { this.saveAll(); this.saveTime = now; }
  }
  private updateEnemy(id: string, e: EnemyState, dt: number) {
    const now = this.state.time, def = ENEMIES[e.kind as EnemyKind], spawn = SPAWNS[Number(id.slice(1))];
    if (e.hp <= 0) {
      if (now >= e.respawnAt) { e.hp = e.maxHp; e.x = spawn.x; e.z = spawn.z; e.alert = false; this.contributors.delete(id); }
      return;
    }
    let target: PlayerState | undefined, targetId = '', nearest = e.kind === 'warden' ? 11 : 8;
    if (distance(e, spawn) < 15) this.state.players.forEach((p, pid) => {
      const d = distance(p, e);
      if (p.hp > 0 && p.connected && p.z < 5 && d < nearest) { target = p; targetId = pid; nearest = d; }
    });
    e.alert = !!target;
    if (target) {
      e.yaw = Math.atan2(target.x - e.x, target.z - e.z);
      if (nearest > def.radius + 1.1) {
        const next = moveWithCollisions(e.x, e.z, (target.x - e.x) / nearest * def.speed * dt, (target.z - e.z) / nearest * def.speed * dt, def.radius * 0.65);
        e.x = next.x; e.z = next.z;
      } else if (now >= (this.enemyCooldowns.get(id) ?? 0) && clearLine(e, target)) {
        this.enemyCooldowns.set(id, now + (e.kind === 'warden' ? 1.8 : 1.4)); e.attackUntil = now + 0.4;
        if (e.kind === 'warden') {
          this.emit({ type: 'effect', data: { kind: 'slam', x: e.x, z: e.z } });
          this.state.players.forEach((p, pid) => { if (p.hp > 0 && distance(e, p) < 4.5) this.damagePlayer(pid, def.damage); });
        } else this.damagePlayer(targetId, def.damage);
      }
    } else {
      const patrol = { x: spawn.x + Math.sin(now * 0.22 + Number(id.slice(1))) * 1.6, z: spawn.z + Math.cos(now * 0.2 + Number(id.slice(1))) * 1.6 };
      const d = distance(e, patrol);
      if (d > 0.2) { const next = moveWithCollisions(e.x, e.z, (patrol.x - e.x) / d * dt, (patrol.z - e.z) / d * dt, def.radius * 0.65); e.x = next.x; e.z = next.z; e.yaw = Math.atan2(patrol.x - e.x, patrol.z - e.z); }
      if (distance(e, spawn) > 10) { e.hp = Math.min(e.maxHp, e.hp + dt * 20); this.contributors.delete(id); }
    }
  }
  private damagePlayer(id: string, amount: number) {
    const p = this.state.players.get(id); if (!p || p.hp <= 0) return;
    p.hp = Math.max(0, p.hp - amount);
    this.emit({ type: 'hit', data: { id, x: p.x, z: p.z, amount, player: true } });
    if (p.hp === 0) { p.deadUntil = this.state.time + 5; p.moving = false; this.inputs.delete(id); this.targets.delete(id); }
  }
  action(id: string, data: unknown) {
    if (!data || typeof data !== 'object') return;
    const { kind, target } = data as Record<string, unknown>;
    if (!['attack', 'nova', 'heal', 'potion'].includes(kind as string)) return;
    const p = this.state.players.get(id), profile = this.profiles.get(id);
    if (!p || !profile || p.hp <= 0 || !p.connected) return;
    const action = kind as string, now = this.state.time;
    if ((profile.cooldowns[action] ?? 0) > now) return;
    if (action === 'potion' || action === 'heal') {
      if (p.hp >= p.maxHp) return this.notice(id, 'Tu vida ya está completa.');
      if (action === 'potion' && !this.consume(profile, 'potion', 1)) return this.notice(id, 'No tienes pociones. Visita a Elara.');
      p.hp = Math.min(p.maxHp, p.hp + (action === 'potion' ? 65 : 40));
      profile.cooldowns[action] = now + (action === 'potion' ? 4 : 12);
      this.emit({ type: 'effect', data: { kind: 'heal', x: p.x, z: p.z } }); this.changed(id); return;
    }
    const range = action === 'nova' ? 5.8 : 3.5;
    let victims = [...this.state.enemies.entries()].filter(([, e]) => e.hp > 0 && distance(p, e) <= range + (e.kind === 'warden' ? 1 : 0) && clearLine(p, e));
    victims.sort((a, b) => distance(p, a[1]) - distance(p, b[1]));
    if (action === 'attack') {
      if (typeof target === 'string' && this.state.enemies.has(target)) victims = victims.filter(([eid]) => eid === target);
      victims = victims.slice(0, 1);
    }
    if (!victims.length && action === 'attack') return this.notice(id, 'Acércate a un enemigo para atacar.');
    profile.cooldowns[action] = now + (action === 'nova' ? 6 : 0.65); p.attackUntil = now + 0.4;
    if (victims[0]) p.yaw = Math.atan2(victims[0][1].x - p.x, victims[0][1].z - p.z);
    const bonus = profile.weapon === 'astral' ? 16 : profile.weapon === 'iron' ? 7 : 0;
    const damage = (action === 'nova' ? 37 : 23) + (profile.level - 1) * 5 + bonus;
    if (action === 'nova') this.emit({ type: 'effect', data: { kind: 'nova', x: p.x, z: p.z } });
    for (const [eid, e] of victims) {
      const contributions = this.contributors.get(eid) ?? new Map<string, number>(); contributions.set(id, now); this.contributors.set(eid, contributions);
      e.hp = Math.max(0, e.hp - damage); this.emit({ type: 'hit', data: { id: eid, x: e.x, z: e.z, amount: damage, player: false } });
      if (e.hp === 0) this.defeat(eid, e, id);
    }
    this.changed(id);
  }
  private gainXP(id: string, amount: number) {
    const p = this.profiles.get(id)!, state = this.state.players.get(id)!;
    p.xp += amount;
    while (p.level < 5 && p.xp >= xpForLevel(p.level)) {
      p.xp -= xpForLevel(p.level); p.level++; state.level = p.level; state.maxHp = maxHealth(p.level); state.hp = state.maxHp;
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
      if (kind === 'warden') this.addItem(profile, 'astral');
      this.notice(pid, `+${def.xp} experiencia · +${def.gold} oro`); this.changed(pid);
    });
    const loot = new LootState(); Object.assign(loot, { x: e.x, z: e.z, expires: now + 90, kind: kind === 'boar' ? 'iron' : kind === 'wisp' ? 'potion' : 'crystal' });
    this.state.loot.set(`l${++this.lootId}`, loot);
    if (kind === 'warden') this.emit({ type: 'chat', data: { name: 'Valle', text: 'El Guardián ha caído. La luz vuelve a las ruinas.', system: true } });
  }
  private addItem(profile: Profile, kind: ItemKind) {
    const stack = profile.inventory.find(i => i.kind === kind);
    if (stack) { if (stack.count >= 99) return false; stack.count++; }
    else { if (profile.inventory.length >= 12) return false; profile.inventory.push({ kind, count: 1 }); }
    return true;
  }
  private consume(profile: Profile, kind: ItemKind, count: number) {
    const stack = profile.inventory.find(i => i.kind === kind); if (!stack || stack.count < count) return false;
    stack.count -= count; if (stack.count === 0) profile.inventory = profile.inventory.filter(i => i !== stack); return true;
  }
  interact(id: string, data?: unknown) {
    const p = this.state.players.get(id), profile = this.profiles.get(id); if (!p || !profile || p.hp <= 0) return;
    if (distance(p, NPC) <= 4) {
      if (data === 'buy') {
        if (profile.inventory.find(i => i.kind === 'potion')?.count === 99) return this.notice(id, 'Ya tienes el máximo de pociones.');
        if (!this.consume(profile, 'crystal', 3)) { if (profile.gold < 15) return this.notice(id, 'Necesitas 3 cristales o 15 de oro.'); profile.gold -= 15; }
        this.addItem(profile, 'potion'); this.changed(id); this.notice(id, 'Has recibido una poción de vida.'); return;
      }
      if (profile.quest >= QUESTS.length) { this.notice(id, 'Elara: el valle recordará vuestra hazaña. Gracias, viajero.'); return; }
      if (!profile.questAccepted) { profile.questAccepted = true; profile.kills = emptyKills(); this.notice(id, `Misión aceptada: ${QUESTS[profile.quest].title}`); }
      else if (questReady(profile)) {
        const quest = QUESTS[profile.quest]; this.gainXP(id, quest.xp); profile.gold += quest.gold; profile.quest++; profile.questAccepted = false; profile.kills = emptyKills();
        this.addItem(profile, 'potion'); this.notice(id, `Misión completada · +${quest.xp} EXP · +${quest.gold} oro`);
      } else this.notice(id, `Elara: ${QUESTS[profile.quest].text}`);
      this.changed(id); return;
    }
    const loot = [...this.state.loot.entries()].filter(([, l]) => distance(p, l) <= 3).sort((a, b) => distance(p, a[1]) - distance(p, b[1]))[0];
    if (!loot) return this.notice(id, 'Acércate a Elara o a un botín y pulsa E.');
    if (!this.addItem(profile, loot[1].kind as ItemKind)) return this.notice(id, 'No hay espacio para este objeto.');
    this.state.loot.delete(loot[0]); this.changed(id); this.notice(id, `Recogido: ${ITEMS[loot[1].kind as ItemKind].name}`);
  }
  equip(id: string, kind: unknown) {
    const p = this.profiles.get(id); if (!p || !['iron', 'astral', 'starter'].includes(kind as string)) return;
    if (kind !== 'starter' && !p.inventory.some(i => i.kind === kind && i.count > 0)) return;
    p.weapon = kind as Profile['weapon']; this.changed(id); this.notice(id, 'Arma equipada.');
  }
  chat(id: string, data: unknown) {
    if (typeof data !== 'string' || this.state.time - (this.chatTimes.get(id) ?? -99) < 0.7) return;
    const text = data.replace(/[\x00-\x1f\x7f]/g, '').trim().slice(0, 180), p = this.profiles.get(id);
    if (!text || !p) return; this.chatTimes.set(id, this.state.time);
    this.emit({ type: 'chat', data: { name: p.name, text, system: false } });
  }
}
