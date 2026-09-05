import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Client, CloseCode, type Room } from '@colyseus/sdk';
import { createGameServer } from '../server/app.js';
import type { WorldState } from '../shared/schema.js';
import { LootState } from '../shared/schema.js';
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate: () => boolean, timeout = 5000) { const start = Date.now(); while (!predicate()) { if (Date.now() - start > timeout) throw new Error('Timed out waiting for synchronized state'); await delay(25); } }
test('real WebSocket clients share one world, chat, loot, capacity and reconnection', { timeout: 25000 }, async t => {
  const game = await createGameServer({ port: 0, dbPath: ':memory:', host: '127.0.0.1' });
  const address = game.server.transport.server!.address() as { port: number };
  const client = new Client(`ws://127.0.0.1:${address.port}`); const rooms: Room<any, WorldState>[] = [];
  t.after(async () => { await Promise.race([Promise.all(rooms.map(r => r.leave().catch(() => {}))), delay(500)]); await game.close(); });
  const a = await client.joinById<WorldState>('valle', { name: 'Alice', token: 'a'.repeat(64), color: '#64b8ab' }); rooms.push(a);
  a.onMessage('*', () => {});
  const b = await client.joinById<WorldState>('valle', { name: 'Bob', token: 'b'.repeat(64), color: '#cf8d60' }); rooms.push(b);
  for (const r of rooms) { r.onMessage('*', () => {}); r.reconnection.minUptime = 0; }
  await until(() => a.state?.players?.size === 2 && b.state?.players?.size === 2);
  assert.equal(a.roomId, b.roomId);
  let chat = ''; b.onMessage('chat', (m: { text: string }) => { chat = m.text; }); a.send('chat', '<b>¡Hola, valle!</b>'); await until(() => chat.includes('¡Hola')); assert.equal(chat, '<b>¡Hola, valle!</b>');
  const start = a.state.players.get(a.sessionId)!.z;
  for (let i = 0; i < 12; i++) { a.send('input', { x: 0, z: -1, run: false }); await delay(50); }
  a.send('input', { x: 0, z: 0 });
  await until(() => b.state.players.get(a.sessionId)!.z < start - 2);
  assert.ok(Math.abs(a.state.players.get(a.sessionId)!.z - b.state.players.get(a.sessionId)!.z) < 0.6);
  const p1 = game.world.state.players.get(a.sessionId)!, p2 = game.world.state.players.get(b.sessionId)!;
  p1.x = 0; p1.z = -1; p2.x = 0; p2.z = -1;
  const loot = new LootState(); loot.x = 0; loot.z = -1; loot.expires = 100; game.world.state.loot.set('race', loot);
  a.send('interact'); b.send('interact'); await until(() => !game.world.state.loot.has('race'));
  const crystals = [a, b].reduce((sum, r) => sum + (game.world.profiles.get(r.sessionId)!.inventory.find(i => i.kind === 'crystal')?.count ?? 0), 0); assert.equal(crystals, 1);
  let reconnected = false; a.onReconnect(() => { reconnected = true; }); a.connection.close(CloseCode.MAY_TRY_RECONNECT, 'test network interruption');
  await until(() => reconnected, 8000); assert.equal(game.world.state.players.size, 2);
  await assert.rejects(client.joinById('valle', { name: 'Invalid', token: 'short' }));
  for (let i = 0; i < 6; i++) { const r = await client.joinById<WorldState>('valle', { name: `Player${i}`, token: String(i + 1).repeat(64), color: '#64b8ab' }); r.onMessage('*', () => {}); rooms.push(r); }
  await until(() => a.state.players.size === 8); await assert.rejects(client.joinById('valle', { name: 'Ninth', token: '9'.repeat(64) }));
  assert.equal(game.world.state.players.size, 8);
});
