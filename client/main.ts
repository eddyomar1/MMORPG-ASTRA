import { Client, type Room } from '@colyseus/sdk';
import { CHARACTER_CLASSES, COLORS, ENEMIES, ITEMS, NPC, OBSTACLES, QUESTS, WORLD, questReady, xpForLevel, type CharacterClass, type EnemyKind, type ItemKind, type Profile } from '../shared/content';
import type { WorldState } from '../shared/schema';
import { WorldView } from './scene';
import { $, escapeHTML as esc, icon, mountUI, showModal, toast } from './ui';
import { GameAudio } from './audio';
import './style.css';

mountUI();
const audio = new GameAudio();
let view: WorldView;
try { view = new WorldView($<HTMLCanvasElement>('world')); }
catch (error) { $('join-error').textContent = 'No se pudo iniciar WebGL. Activa la aceleración gráfica del navegador y recarga.'; $<HTMLButtonElement>('join').disabled = true; throw error; }
const client = new Client(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);
let room: Room<any, WorldState> | undefined, profile: Profile | undefined;
let connected = false, joining = false, color = COLORS[0], panel = '';
let serverInfo: { addresses: string[]; players: number; roomId: string };
const keys = new Set<string>();
function read(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function save(key: string, value: string) { try { localStorage.setItem(key, value); } catch { toast('No se pudo guardar el acceso en este navegador. Exporta tu acceso desde Ajustes.'); } }
let token = read('astra-token');
if (!token || !/^[a-f0-9]{64}$/.test(token)) { token = [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join(''); save('astra-token', token); }
const savedClass = read('astra-class') as CharacterClass | null;
let selectedClass: CharacterClass = savedClass && savedClass in CHARACTER_CLASSES ? savedClass : 'traveler';
$<HTMLInputElement>('name').value = read('astra-name') || '';
color = COLORS.includes(read('astra-color') || '') ? read('astra-color')! : COLORS[0];
function colors() { $('colors').innerHTML = COLORS.map((c, i) => `<button type="button" aria-label="Estandarte ${['jade', 'ámbar', 'amatista', 'oro'][i]}" aria-pressed="${c === color}" data-color="${c}" class="color-choice ${c === color ? 'selected' : ''}" style="--swatch:${c}"></button>`).join(''); $('colors').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => { color = b.dataset.color!; colors(); }); }
function updateClassLabel() {
  const info = CHARACTER_CLASSES[selectedClass];
  $('class-label').textContent = info.label;
  $('class-label').title = info.description;
  $('classes').innerHTML = Object.entries(CHARACTER_CLASSES).map(([key, info]) => `<button type="button" data-class="${key}" class="class-choice ${selectedClass === key ? 'selected' : ''}" style="--swatch:${info.color}; --glow:${info.accent}"><span>${info.name}</span></button>`).join('');
  $('classes').querySelectorAll<HTMLButtonElement>('button').forEach(b => b.onclick = () => { selectedClass = b.dataset.class as CharacterClass; save('astra-class', selectedClass); updateClassLabel(); });
}
colors(); updateClassLabel();
async function loadServerInfo() {
  const response = await fetch('/api/server', { signal: AbortSignal.timeout(4000) });
  if (!response.ok) throw new Error('El servidor no responde.'); serverInfo = await response.json(); $('lobby-count').textContent = String(serverInfo.players);
}
void loadServerInfo().catch(() => { $('join-error').textContent = 'Esperando al servidor. Comprueba que esté encendido.'; });
setInterval(() => { if (!view.playing) void loadServerInfo().catch(() => {}); }, 8000);
function send(type: string, data?: unknown) { if (connected && room) room.send(type, data); }
async function join() {
  if (joining) return;
  const name = $<HTMLInputElement>('name').value.trim();
  if (!/^[\p{L}\p{N} _-]{2,18}$/u.test(name)) { $('join-error').textContent = 'Elige un nombre de 2–18 letras o números.'; return; }
  joining = true; $('join-error').textContent = ''; $<HTMLButtonElement>('join').disabled = true; $('join').textContent = 'Abriendo las puertas…';
  try {
    await loadServerInfo();
    const next = await client.joinById<WorldState>(serverInfo.roomId, { token, name, color, classType: selectedClass });
    next.reconnection.minUptime = 0;
    // The join handshake precedes the first full state packet. Rendering an
    // empty reflected schema here would stop Babylon's render loop.
    room = next; connected = true; view.selfId = room.sessionId; view.playing = true; view.state = undefined;
    view.camera.alpha = Math.PI / 2; view.camera.beta = 0.87; view.camera.radius = 23; view.camera.upperRadiusLimit = 36;
    $('welcome').hidden = true; $('hud').hidden = false; $('connection-lost').hidden = true; $('connection').textContent = 'Conectado';
    $('tutorial').hidden = read('astra-tutorial') === 'done';
    save('astra-name', name); save('astra-color', color);
    room.onStateChange(state => { if (state.players && state.enemies && state.loot) view.state = state; });
    room.onMessage('profile', (p: Profile) => { profile = p; save('astra-name', p.name); if (p.classType) { selectedClass = p.classType; updateClassLabel(); } updateProfile(); });
    room.onMessage('notice', (message: string) => toast(message));
    room.onMessage('chat', (message: { name: string; text: string; system: boolean }) => {
      const line = document.createElement('p'); line.className = message.system ? 'system' : '';
      const name = document.createElement('b'); name.textContent = message.system ? '✧ ' : `${message.name}: `; line.append(name, document.createTextNode(message.text));
      const log = $('chat-log'); log.append(line); if (log.childElementCount > 60) log.firstElementChild?.remove(); log.scrollTop = log.scrollHeight;
    });
    room.onMessage('pong', (timestamp: number) => $('ping').textContent = `${Math.max(0, Math.round(performance.now() - timestamp))} ms`);
    room.onMessage('effect', (e: { kind: string; x: number; z: number }) => { view.effect(e.kind, e.x, e.z); audio.play(e.kind); });
    room.onMessage('hit', (e: { id: string; amount: number; x: number; z: number; player: boolean }) => {
      const position = view.project(e.x, 2.2, e.z); if (!position.visible) return;
      const text = document.createElement('span'); text.className = `damage-number ${e.player ? 'damage-taken' : ''}`; text.textContent = `${e.player ? '−' : ''}${e.amount}`; text.style.left = `${position.x}px`; text.style.top = `${position.y}px`; document.body.append(text); setTimeout(() => text.remove(), 1100); audio.play('hit');
    });
    room.onDrop(() => { connected = false; keys.clear(); $('connection-lost').hidden = false; $('reconnect-text').textContent = 'Intentando reconectar con el servidor…'; $<HTMLButtonElement>('retry').disabled = true; $('connection').textContent = 'Reconectando'; });
    room.onReconnect(() => { connected = true; $('connection-lost').hidden = true; $('connection').textContent = 'Conectado'; send('profile'); toast('Conexión recuperada.'); });
    room.onLeave(() => { connected = false; keys.clear(); $('connection-lost').hidden = false; $('reconnect-text').textContent = 'Comprueba que el servidor siga encendido y vuelve a conectar.'; $<HTMLButtonElement>('retry').disabled = false; $('connection').textContent = 'Desconectado'; });
    room.onError((_code, message) => toast(message || 'La conexión ha encontrado un problema.'));
    send('profile'); view.canvas.focus();
  } catch (error) {
    const raw = error instanceof Error ? error.message : String(error);
    const message = /locked|full|seat/i.test(raw) ? 'El valle está lleno. Espera a que haya una plaza libre.' : /already|personaje ya/i.test(raw) ? 'Este personaje está abierto en otra pestaña. Ciérrala antes de entrar.' : /fetch|network|connect|ECONN|not found/i.test(raw) ? 'No se pudo conectar. Comprueba la red y que el servidor esté encendido.' : raw;
    $('join-error').textContent = message; if (view.playing) { $('reconnect-text').textContent = message; toast(message); }
  } finally { joining = false; $<HTMLButtonElement>('join').disabled = false; $('join').innerHTML = `Entrar al valle ${icon('arrow')}`; }
}
$('join-form').addEventListener('submit', e => { e.preventDefault(); void join(); });
$('retry').onclick = () => void join();
$('dismiss-tutorial').onclick = () => { $('tutorial').hidden = true; save('astra-tutorial', 'done'); };
view.onSelect = id => { view.selected = id; };
view.onGround = (x, z) => send('go', { x, z });
const act = (kind: string) => send('action', { kind, target: view.selected || undefined });
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b => b.onclick = () => act(b.dataset.action!));
$('interact-button').onclick = () => send('interact');
function isTyping() { return document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement; }
function stopMovement() { keys.clear(); send('stop'); }
window.addEventListener('keydown', e => {
  if (!view.playing || !connected) return;
  if ($<HTMLDialogElement>('modal').open) return;
  if (isTyping()) { if (e.code === 'Escape') { (document.activeElement as HTMLElement).blur(); stopMovement(); } return; }
  if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  keys.add(e.code); if (e.repeat) return;
  if (e.code === 'Enter') { stopMovement(); $<HTMLInputElement>('chat-input').focus(); }
  if (e.code === 'KeyE') send('interact');
  if (e.code === 'KeyQ') act('nova'); if (e.code === 'KeyF') act('heal'); if (e.code === 'KeyR') act('potion');
  if (e.code === 'Space' || e.code === 'Digit1') act('attack');
  if (e.code === 'KeyI') inventory(); if (e.code === 'KeyJ') journal(); if (e.code === 'KeyM') map();
  if (e.code === 'Escape') view.selected = '';
  if (e.code === 'Tab') {
    const p = view.state?.players.get(view.selfId); if (!p) return;
    const targets = [...view.state!.enemies.entries()].filter(([, e]) => e.hp > 0 && Math.hypot(p.x - e.x, p.z - e.z) < 20).sort((a, b) => Math.hypot(p.x - a[1].x, p.z - a[1].z) - Math.hypot(p.x - b[1].x, p.z - b[1].z));
    const index = targets.findIndex(([id]) => id === view.selected); view.selected = targets[(index + 1) % targets.length]?.[0] || '';
  }
});
window.addEventListener('keyup', e => keys.delete(e.code));
window.addEventListener('blur', stopMovement); document.addEventListener('visibilitychange', () => { if (document.hidden) stopMovement(); });
$('chat-input').addEventListener('focus', stopMovement);
$('chat-form').addEventListener('submit', e => { e.preventDefault(); const input = $<HTMLInputElement>('chat-input'); if (input.value.trim()) send('chat', input.value); input.value = ''; input.blur(); });
setInterval(() => {
  if (!connected) return;
  let x = 0, z = 0;
  if (!isTyping() && !$<HTMLDialogElement>('modal').open) {
    const forward = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
    const side = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    const alpha = view.camera.alpha;
    x = -Math.cos(alpha) * forward - Math.sin(alpha) * side; z = -Math.sin(alpha) * forward + Math.cos(alpha) * side;
    if (keys.has('Space')) act('attack');
  }
  send('input', { x, z, run: keys.has('ShiftLeft') || keys.has('ShiftRight') });
}, 50);
setInterval(() => { if (connected) { send('ping', performance.now()); $('fps').textContent = `${view.fps} FPS`; } }, 2000);
function updateProfile() {
  if (!profile) return;
  $('player-name').textContent = profile.name; $('level-badge').textContent = String(profile.level); const classInfo = CHARACTER_CLASSES[profile.classType ?? selectedClass]; $('class-label').textContent = classInfo.label; $('gold').textContent = `${profile.gold} ◈`; $('xp-text').textContent = profile.level === 5 ? 'NIVEL MÁXIMO' : `${profile.xp} / ${xpForLevel(profile.level)} EXP`;
  $('xp-fill').style.width = `${profile.level === 5 ? 100 : profile.xp / xpForLevel(profile.level) * 100}%`;
  $('potion-count').textContent = String(profile.inventory.find(i => i.kind === 'potion')?.count ?? 0);
  const quest = QUESTS[profile.quest];
  $('quest-title').textContent = quest?.title ?? 'El valle vuelve a brillar';
  $('quest-summary').textContent = !quest ? 'Tu aventura ha dejado huella en Auralia.' : !profile.questAccepted ? 'Habla con Elara junto al santuario para aceptar esta misión.' : questReady(profile) ? 'Regresa con Elara para recibir tu recompensa.' : quest.text;
  $('quest-objectives').innerHTML = quest && profile.questAccepted ? objectives(profile) : '';
  $('quest-reward').innerHTML = quest ? `<span class="gold-dot">◇</span> ${quest.xp} EXP <span>·</span> ${quest.gold} oro` : '<span class="gold-dot">✧</span> Historia completada';
  if ($<HTMLDialogElement>('modal').open && panel === 'inventory') inventory(true);
  if ($<HTMLDialogElement>('modal').open && panel === 'journal') journal(true);
}
function objectives(p: Profile) {
  const quest = QUESTS[p.quest]; if (!quest) return '';
  return Object.entries(quest.targets).map(([kind, goal]) => `<div class="objective ${p.kills[kind as EnemyKind] >= goal ? 'complete' : ''}"><span>${p.kills[kind as EnemyKind] >= goal ? '✓' : '◇'} ${ENEMIES[kind as EnemyKind].name}</span><b>${Math.min(p.kills[kind as EnemyKind], goal)}/${goal}</b></div>`).join('');
}
let partyHTML = '';
setInterval(() => {
  if (!view.playing || !view.state) return;
  const state = view.state, p = state.players.get(view.selfId); if (!p) return;
  $('hp-fill').style.width = `${p.hp / p.maxHp * 100}%`; $('hp-text').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('hp-fill').classList.toggle('low', p.hp / p.maxHp < 0.3);
  const zone = p.z > 5 ? 'ALDEA DE AURALIA' : p.z > -25 ? 'BOSQUE DE LOS ECOS' : 'RUINAS DEL UMBRAL';
  $('zone').textContent = zone; $('zone-safety').textContent = p.z > 5 ? 'Zona segura' : p.z > -25 ? 'Territorio silvestre' : 'Zona de élite';
  const count = state.players.size; $('online-count').textContent = `${count} aventurero${count > 1 ? 's' : ''}`;
  const friends = [...state.players.entries()].filter(([id]) => id !== view.selfId);
  const html = friends.map(([, f]) => `<div class="party-player panel"><span class="party-dot" style="background:${COLORS.includes(f.color) ? f.color : COLORS[0]}"></span><div><strong>${esc(f.name)} <small>NV. ${f.level}</small></strong><div class="party-health"><i style="width:${f.hp / f.maxHp * 100}%"></i></div></div><span class="muted">${f.connected ? '●' : '◌'}</span></div>`).join('');
  if (html !== partyHTML) { $('party').innerHTML = html; partyHTML = html; }
  const enemy = state.enemies.get(view.selected); $('target').hidden = !enemy || enemy.hp <= 0;
  if (enemy && enemy.hp <= 0) view.selected = '';
  if (enemy) { $('target-name').textContent = ENEMIES[enemy.kind as EnemyKind].name; $('target-kind').textContent = enemy.kind === 'warden' ? 'ÉLITE · RUINAS DEL UMBRAL' : 'CRIATURA DEL VALLE'; $('target-hp').style.width = `${enemy.hp / enemy.maxHp * 100}%`; $('target-value').textContent = `${Math.ceil(enemy.hp)} / ${enemy.maxHp}`; }
  const nearNPC = Math.hypot(p.x - NPC.x, p.z - NPC.z) <= 4;
  const nearLoot = [...state.loot.values()].some(l => Math.hypot(p.x - l.x, p.z - l.z) < 3);
  $('interaction').hidden = !(nearNPC || nearLoot) || p.hp <= 0;
  $('interaction-text').textContent = nearNPC ? (profile && questReady(profile) ? 'Entregar misión a Elara' : 'Hablar con Elara') : 'Recoger botín';
  $('death').hidden = p.hp > 0; $('death-count').textContent = String(Math.max(0, Math.ceil(p.deadUntil - state.time)));
  for (const kind of ['attack', 'nova', 'heal', 'potion']) {
    const remaining = Math.max(0, (profile?.cooldowns[kind] ?? 0) - state.time); const button = $<HTMLButtonElement>(kind);
    button.classList.toggle('cooling', remaining > 0); button.querySelector('.cooldown')!.textContent = remaining > 0 ? String(Math.ceil(remaining)) : ''; button.disabled = p.hp <= 0 || remaining > 0;
  }
  drawMap($<HTMLCanvasElement>('minimap'));
  if ($<HTMLDialogElement>('modal').open && panel === 'map') drawMap($<HTMLCanvasElement>('full-map'));
}, 100);
function open(title: string, html: string, type: string) { stopMovement(); panel = type; view.suspended = true; showModal(title, html); }
$('modal').addEventListener('close', () => { view.suspended = false; });
function inventory(refresh = false) {
  if (!profile) return toast('Entra al valle para abrir tu inventario.');
  const html = `<div class="inventory-summary"><span>${icon('bag')} ${profile.inventory.length}/12 espacios</span><strong>${profile.gold} ◈</strong></div><div class="equipped"><span>ARMA EQUIPADA</span><strong>${profile.weapon === 'starter' ? 'Espada de viajero' : ITEMS[profile.weapon].name}</strong><small>Daño adicional: +${profile.weapon === 'astral' ? 16 : profile.weapon === 'iron' ? 7 : 0}</small></div><div class="inventory-grid">${Array.from({ length: 12 }, (_, i) => { const stack = profile!.inventory[i]; return stack ? `<button class="item-slot" data-item="${stack.kind}" title="${ITEMS[stack.kind].name}" style="--item-color:${ITEMS[stack.kind].color}"><span>${ITEMS[stack.kind].icon}</span><b>${stack.count}</b><small>${ITEMS[stack.kind].name}</small></button>` : '<div class="item-slot empty"><span>·</span></div>'; }).join('')}</div><div id="item-detail" class="item-detail">Selecciona un objeto para usarlo o equiparlo.</div><div class="shop-row"><p><b>Elara · Suministros</b><br>1 poción por 3 cristales o 15 de oro.<br><small>Debes estar junto al santuario.</small></p><button id="buy-potion" class="secondary">Comprar poción</button></div>`;
  if (refresh) $('modal-body').innerHTML = html; else open('Tu inventario', html, 'inventory');
  document.querySelectorAll<HTMLButtonElement>('[data-item]').forEach(b => b.onclick = () => {
    const kind = b.dataset.item as ItemKind, item = ITEMS[kind];
    $('item-detail').innerHTML = `<strong>${item.name}</strong><p>${item.description}</p>${kind === 'crystal' ? '' : `<button id="use-item" class="secondary">${kind === 'potion' ? 'Usar poción' : profile?.weapon === kind ? 'Equipada' : 'Equipar arma'}</button>`}`;
    if ($('use-item')) $('use-item').onclick = () => kind === 'potion' ? act('potion') : send('equip', kind);
  });
  $('buy-potion').onclick = () => { const p = view.state?.players.get(view.selfId); if (!p || Math.hypot(p.x - NPC.x, p.z - NPC.z) > 4) toast('Acércate a Elara para comprar una poción.'); else send('interact', 'buy'); };
}
function journal(refresh = false) {
  if (!profile) return toast('Entra al valle para consultar tus misiones.');
  const html = QUESTS.map((q, i) => `<article class="journal-quest ${i === profile!.quest ? 'active' : ''}"><span class="eyebrow">${i < profile!.quest ? '✓ COMPLETADA' : i === profile!.quest ? profile!.questAccepted ? 'EN CURSO' : 'DISPONIBLE CON ELARA' : 'POR DESCUBRIR'} · CAPÍTULO 0${i + 1}</span><h3>${q.title}</h3><p>${q.text}</p>${i === profile!.quest && profile!.questAccepted ? objectives(profile!) : ''}<div class="quest-reward">◇ ${q.xp} EXP · ${q.gold} oro · 1 poción</div></article>`).join('') + '<p class="modal-note">Acepta y entrega las misiones hablando con Elara (E). Los compañeros que participen en combate reciben experiencia y progreso.</p>';
  if (refresh) $('modal-body').innerHTML = html; else open('Diario de viaje', html, 'journal');
}
function drawMap(canvas: HTMLCanvasElement) {
  if (!canvas) return; const ctx = canvas.getContext('2d')!; const w = canvas.width, h = canvas.height;
  const sx = (x: number) => (40 - x) / 80 * w, sz = (z: number) => (z + 46) / 82 * h;
  ctx.fillStyle = '#314f45'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#577158'; ctx.fillRect(0, sz(5), w, h - sz(5)); ctx.fillStyle = '#526964'; ctx.fillRect(0, 0, w, sz(-26));
  ctx.strokeStyle = '#afaa82'; ctx.lineWidth = w / 25; ctx.beginPath(); ctx.moveTo(sx(0), sz(30)); ctx.lineTo(sx(0), sz(-40)); ctx.stroke();
  ctx.fillStyle = '#b9b797'; ctx.beginPath(); ctx.ellipse(sx(0), sz(14), w / 10, h / 10, 0, 0, Math.PI * 2); ctx.fill();
  for (const o of OBSTACLES) { ctx.fillStyle = o.kind === 'house' ? '#d1b784' : o.kind === 'tree' ? '#294d40' : '#92a390'; if (o.kind === 'house') ctx.fillRect(sx(o.x) - w / 30, sz(o.z) - h / 32, w / 15, h / 16); else { ctx.beginPath(); ctx.arc(sx(o.x), sz(o.z), o.kind === 'tree' ? w / 70 : w / 100, 0, Math.PI * 2); ctx.fill(); } }
  const dot = (x: number, z: number, color: string, size: number) => { ctx.fillStyle = color; ctx.beginPath(); ctx.arc(sx(x), sz(z), size, 0, Math.PI * 2); ctx.fill(); };
  view.state?.enemies.forEach(e => { if (e.hp > 0) dot(e.x, e.z, e.kind === 'warden' ? '#edb56e' : '#d38c76', e.kind === 'warden' ? 4 : 2.2); });
  view.state?.loot.forEach(l => dot(l.x, l.z, '#ffe3a1', 2));
  dot(NPC.x, NPC.z, '#ffe29b', 3);
  view.state?.players.forEach((p, id) => { if (id === view.selfId) { ctx.save(); ctx.translate(sx(p.x), sz(p.z)); ctx.rotate(p.yaw); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, 7); ctx.lineTo(-4.5, -5); ctx.lineTo(0, -2); ctx.lineTo(4.5, -5); ctx.closePath(); ctx.fill(); ctx.restore(); } else dot(p.x, p.z, '#7ce1d1', 4); });
  ctx.font = `${w > 300 ? 14 : 9}px sans-serif`; ctx.fillStyle = '#e7e6cd'; ctx.textAlign = 'center'; ctx.fillText('N', w / 2, 13);
  if (w > 300) { ctx.fillText('RUINAS DEL UMBRAL', w / 2, sz(-42)); ctx.fillText('BOSQUE DE LOS ECOS', w * 0.7, sz(-9)); ctx.fillText('ALDEA DE AURALIA', w / 2, sz(29)); }
}
function map() { open('El valle de Auralia', '<canvas id="full-map" width="600" height="500" aria-label="Mapa completo del valle"></canvas><div class="map-legend"><span>▲ Tú</span><span class="jade">● Compañeros</span><span class="gold-dot">● Elara / Élite</span><span class="danger">● Criaturas</span></div><p class="modal-note">Sigue el camino hacia el norte para llegar al bosque y las ruinas.</p>', 'map'); drawMap($<HTMLCanvasElement>('full-map')); }
$('inventory-button').onclick = () => inventory(); $('journal-button').onclick = () => journal(); $('quest-open').onclick = () => journal();
$('map-button').onclick = map; $('open-map').onclick = map;
$('invite').onclick = async () => {
  await loadServerInfo().catch(() => {});
  const urls = serverInfo?.addresses.length ? serverInfo.addresses : [location.origin];
  open('La aventura se comparte', `<p class="modal-intro">Conecta a tus amigos al mismo Wi-Fi o red Ethernet y comparte una de estas direcciones.</p>${urls.map((url, i) => `<div class="invite-url"><input readonly value="${esc(url)}" aria-label="Dirección de conexión ${i + 1}"/><button class="secondary copy-url" data-url="${esc(url)}">Copiar</button></div>`).join('')}<div class="invite-note">${icon('people')}<p>Hasta <b>8 aventureros</b> en el mismo mundo.<br>El PC que ejecuta el servidor debe permanecer encendido.</p></div><p class="modal-note">Si no conecta, permite el puerto del servidor en el firewall de la red privada. Las redes de invitados pueden bloquear la comunicación entre dispositivos.</p>`, 'invite');
  document.querySelectorAll<HTMLButtonElement>('.copy-url').forEach(b => b.onclick = async () => {
    try { await navigator.clipboard.writeText(b.dataset.url!); b.textContent = 'Copiado ✓'; } catch { const input = b.previousElementSibling as HTMLInputElement; input.focus(); input.select(); toast('Dirección seleccionada. Usa Ctrl+C para copiar.'); }
  });
};
$('sound').onclick = () => { const enabled = audio.toggle(); $('sound').setAttribute('aria-pressed', String(enabled)); $('sound').setAttribute('aria-label', enabled ? 'Desactivar sonido' : 'Activar sonido'); $('sound').title = enabled ? 'Desactivar sonido' : 'Activar sonido'; toast(enabled ? 'Sonido activado' : 'Sonido desactivado'); };
$('settings').onclick = () => {
  open('Tu aventura, a tu manera', `<div class="settings-section"><h3>Controles</h3><div class="controls-grid"><span><kbd>WASD</kbd> / clic en suelo</span><b>Moverse</b><span><kbd>Shift</kbd></span><b>Correr</b><span>Arrastrar botón derecho / rueda</span><b>Cámara / zoom</b><span><kbd>1</kbd> / <kbd>Espacio</kbd></span><b>Atacar (mantén Espacio)</b><span><kbd>Tab</kbd> / clic en enemigo</span><b>Seleccionar objetivo</b><span><kbd>Q</kbd> / <kbd>F</kbd> / <kbd>R</kbd></span><b>Onda / curación / poción</b><span><kbd>E</kbd></span><b>Hablar / recoger botín</b><span><kbd>I</kbd> / <kbd>J</kbd> / <kbd>M</kbd></span><b>Inventario / misiones / mapa</b><span><kbd>Enter</kbd></span><b>Chat local</b></div></div><div class="settings-row"><span><b>Rendimiento</b><small>Reduce sombras y resolución.</small></span><button id="quality" class="secondary">${read('astra-low') === 'yes' ? 'Calidad baja' : 'Calidad alta'}</button></div><div class="settings-row"><span><b>Acceso a tu personaje</b><small>Exporta una copia para recuperarlo en otro navegador.</small></span><button id="export-access" class="secondary">Guardar acceso</button></div>${view.playing ? '<button id="leave-game" class="secondary leave-button">Guardar y salir al inicio</button>' : ''}<p class="modal-note">El progreso se guarda automáticamente en el PC servidor. Tu archivo de acceso identifica al personaje; consérvalo para ti.</p>`, 'settings');
  $('quality').onclick = () => { const low = read('astra-low') !== 'yes'; save('astra-low', low ? 'yes' : 'no'); view.setQuality(low); $('quality').textContent = low ? 'Calidad baja' : 'Calidad alta'; };
  $('export-access').onclick = () => {
    const blob = new Blob([JSON.stringify({ game: 'astra', token, name: profile?.name || $<HTMLInputElement>('name').value || 'Viajero' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'astra-acceso.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if ($('leave-game')) $('leave-game').onclick = async () => { connected = false; await room?.leave(); location.reload(); };
};
$('import-access').onclick = () => $<HTMLInputElement>('access-file').click();
$('access-file').addEventListener('change', async () => {
  const file = $<HTMLInputElement>('access-file').files?.[0]; if (!file) return;
  try {
    if (file.size > 4096) throw new Error(); const data = JSON.parse(await file.text());
    if (data.game !== 'astra' || typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token) || typeof data.name !== 'string' || !/^[\p{L}\p{N} _-]{2,18}$/u.test(data.name)) throw new Error();
    token = data.token; save('astra-token', token!); save('astra-name', data.name); $<HTMLInputElement>('name').value = data.name; toast('Acceso recuperado. Entra al valle para continuar.');
  } catch { toast('El archivo de acceso no es válido.'); }
});
if (read('astra-low') === 'yes') view.setQuality(true);
window.addEventListener('beforeunload', () => { if (connected) void room?.leave(); });
