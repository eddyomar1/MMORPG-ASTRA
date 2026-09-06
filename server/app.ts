import { Server, Room, matchMaker, type Client } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import express from 'express';
import { networkInterfaces } from 'node:os';
import { resolve } from 'node:path';
import { CharacterStore } from './database.js';
import { GameWorld } from './world.js';
import { CHARACTER_CLASSES, WORLD } from '../shared/content.js';
import type { WorldState } from '../shared/schema.js';

export async function createGameServer({ port = 3000, dbPath = 'data/astra.sqlite', dev = false, host = '0.0.0.0' } = {}) {
  const store = new CharacterStore(dbPath);
  let world: GameWorld;
  class ValleyRoom extends Room<{ state: WorldState }> {
    maxClients = WORLD.maxPlayers;
    autoDispose = false;
    maxMessagesPerSecond = 80;
    onCreate() {
      if (world) throw new Error('El valle ya existe. Únete a la sala valle.');
      this.roomId = 'valle';
      world = new GameWorld(store, event => {
        if (event.to) this.clients.find(c => c.sessionId === event.to)?.send(event.type, event.data);
        else this.broadcast(event.type, event.data);
      });
      this.state = world.state; this.patchRate = 50;
      this.setSimulationInterval(dt => world.step(dt / 1000), 50);
      this.onMessage('input', (c, m) => world.input(c.sessionId, m));
      this.onMessage('stop', c => world.stop(c.sessionId));
      this.onMessage('go', (c, m) => world.go(c.sessionId, m));
      this.onMessage('action', (c, m) => world.action(c.sessionId, m));
      this.onMessage('interact', (c, m) => world.interact(c.sessionId, m));
      this.onMessage('equip', (c, m) => world.equip(c.sessionId, m));
      this.onMessage('chooseClass', (c, m) => world.chooseClass(c.sessionId, m));
      this.onMessage('chat', (c, m) => world.chat(c.sessionId, m));
      this.onMessage('profile', c => c.send('profile', world.profiles.get(c.sessionId)));
      this.onMessage('ping', (c, m) => { if (typeof m === 'number' && Number.isFinite(m)) c.send('pong', m); });
    }
    onAuth(_client: Client, options: unknown) {
      if (!options || typeof options !== 'object') throw new Error('Datos de acceso inválidos.');
      const { token, name, classType } = options as Record<string, unknown>;
      if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new Error('Identidad inválida. Recarga el juego.');
      if (typeof name !== 'string' || !/^[\p{L}\p{N} _-]{2,18}$/u.test(name.trim())) throw new Error('Usa un nombre de 2–18 letras o números.');
      if (classType != null && (typeof classType !== 'string' || !Object.hasOwn(CHARACTER_CLASSES, classType))) throw new Error('Clase de personaje inválida.');
      return true;
    }
    onJoin(client: Client, options: { token: string; name: string; color: string; classType?: keyof typeof CHARACTER_CLASSES }) {
      world.add(client.sessionId, options.token, options.name.trim(), options.color, options.classType ?? 'knight');
    }
    async onDrop(client: Client) {
      const player = world.state.players.get(client.sessionId); if (player) { player.connected = false; player.moving = false; }
      try { await this.allowReconnection(client, 20); } catch { /* onLeave persists and removes the character. */ }
    }
    onReconnect(client: Client) {
      const p = world.state.players.get(client.sessionId); if (p) p.connected = true;
      client.send('profile', world.profiles.get(client.sessionId));
    }
    onLeave(client: Client) { world.remove(client.sessionId); }
    onDispose() { world.saveAll(); }
  }
  const currentAddresses = () => Object.values(networkInterfaces()).flat().filter(i => i && i.family === 'IPv4' && !i.internal).map(i => `http://${i!.address}:${port}`);
  const addresses = currentAddresses();
  let vite: Awaited<ReturnType<typeof import('vite')['createServer']>> | undefined;
  if (dev) {
    const { createServer } = await import('vite');
    vite = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'spa' });
  }
  const server = new Server({
    transport: new WebSocketTransport({ maxPayload: 8192, pingInterval: 3000, pingMaxRetries: 2 }),
    greet: false, gracefullyShutdown: false,
    express: app => {
      app.disable('x-powered-by');
      app.get('/api/server', (_req, res) => res.json({ name: 'Valle de Auralia', roomId: 'valle', maxPlayers: WORLD.maxPlayers, players: world?.state.players.size ?? 0, addresses: currentAddresses() }));
      app.get('/api/health', (_req, res) => res.json({ ok: true }));
      app.post('/api/character', express.json({ limit: '2kb' }), (req, res) => {
        res.set('Cache-Control', 'no-store');
        const token = req.body?.token;
        if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) { res.status(400).json({ error: 'Identidad inválida.' }); return; }
        try { const p = store.load(token); res.json(p ? { name: p.name, classType: p.classType, classChoicePending: p.classChoicePending } : null); }
        catch (error) { res.status(409).json({ error: error instanceof Error ? error.message : 'No se pudo leer el personaje.' }); }
      });
      if (vite) app.use(vite.middlewares);
      else app.use(express.static(resolve('dist/client')));
    },
  });
  server.define('valley', ValleyRoom);
  try { await server.listen(port, host); await matchMaker.createRoom('valley', {}); }
  catch (error) { await vite?.close(); store.close(); throw error; }
  return { server, world: world!, addresses, async close() { world.saveAll(); await server.gracefullyShutdown(false); await vite?.close(); store.close(); } };
}
