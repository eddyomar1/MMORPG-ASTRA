import type { SchemaType } from '@colyseus/schema';
import { NpcState } from '../shared/schema.js';
import { HOUSES, isSafeZone } from '../shared/banners.js';
import { canStand } from '../shared/content.js';

type Point = { x: number; z: number };
// Four-neighbour village paths avoid trees and houses, including the narrow shop approaches.
export function villagePath(start: Point, goal: Point): Point[] {
  const key = (p: Point) => `${p.x},${p.z}`;
  const first = { x: Math.round(start.x), z: Math.round(start.z) }, last = { x: Math.round(goal.x), z: Math.round(goal.z) };
  const queue = [first], previous = new Map<string, Point | null>([[key(first), null]]);
  for (let i = 0; i < queue.length; i++) {
    const p = queue[i];
    if (key(p) === key(last)) {
      const path: Point[] = [goal]; let cursor: Point | null = p;
      while (cursor) { path.unshift(cursor); cursor = previous.get(key(cursor)) ?? null; }
      return path;
    }
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = { x: p.x + dx, z: p.z + dz };
      if (previous.has(key(next)) || !isSafeZone(next) || !canStand(next.x, next.z)) continue;
      previous.set(key(next), p); queue.push(next);
    }
  }
  return [];
}
export class ElaraWalk {
  private conversations = new Map<string, number>();
  private path: Point[] = [];
  private house = 0;
  constructor(private npc: SchemaType<typeof NpcState>) {}
  begin(id: string, now: number) { this.conversations.set(id, now + 2.5); this.npc.moving = false; }
  keep(id: string, now: number) { if (this.conversations.has(id)) this.conversations.set(id, now + 2.5); }
  end(id: string, now: number) {
    if (this.conversations.delete(id) && !this.conversations.size) this.npc.pauseUntil = now + 3 + Math.floor(Math.random() * 8);
  }
  step(dt: number, now: number, valid: (id: string) => boolean) {
    for (const [id, until] of this.conversations) if (until <= now || !valid(id)) this.end(id, now);
    this.npc.moving = false;
    if (this.conversations.size || now < this.npc.pauseUntil) return;
    if (!this.path.length) { this.path = villagePath(this.npc, HOUSES[this.house].shop); this.house = (this.house + 1) % HOUSES.length; }
    const next = this.path[0]; if (!next) return;
    const dx = next.x - this.npc.x, dz = next.z - this.npc.z, distance = Math.hypot(dx, dz);
    if (distance < .001) { this.path.shift(); return; }
    const amount = Math.min(distance, dt * .85);
    this.npc.x += dx / distance * amount; this.npc.z += dz / distance * amount;
    this.npc.yaw = Math.atan2(dx, dz); this.npc.moving = true;
    if (amount >= distance) this.path.shift();
  }
}
