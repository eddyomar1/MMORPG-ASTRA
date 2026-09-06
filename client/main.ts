import { Client, type Room } from '@colyseus/sdk';
import { CHARACTER_CLASSES, COLORS, ENEMIES, ITEMS, NPC, OBSTACLES, QUESTS, WORLD, questReady, xpForLevel, type CharacterClass, type EnemyKind, type ItemKind, type Profile } from '../shared/content';
import type { WorldState } from '../shared/schema';
import { WorldView } from './scene';
import { $, escapeHTML as esc, icon, mountUI, showModal, toast } from './ui';
import { GameAudio } from './audio';
import { GameInput } from './input';
import { TouchControls } from './touch-controls';
import { defaults, parsePreferences, bindingError, bindingLabels, keyLabel, type Binding, type Preferences } from './preferences';
import './style.css';
import './responsive.css';

mountUI();
const audio = new GameAudio();
let view: WorldView;
try { view = new WorldView($<HTMLCanvasElement>('world')); }
catch (error) { $('join-error').textContent = 'No se pudo iniciar WebGL. Activa la aceleración gráfica del navegador y recarga.'; $<HTMLButtonElement>('join').disabled = true; throw error; }
const client = new Client(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);
let room: Room<any, WorldState> | undefined, profile: Profile | undefined;
let connected = false, joining = false, color = COLORS[0], panel = '';
let serverInfo: { addresses: string[]; players: number; roomId: string };
const input = new GameInput();
let preferences: Preferences;
let touchMode = matchMedia('(any-pointer: coarse)').matches;
let unread = 0, tutorialStep = 0, wasDead = false, lastAttackSent = 0;
let previousFocus: HTMLElement | null = null;
let selectedItem: ItemKind | undefined;
let rebinding: Binding | undefined;
function read(key: string) { try { return localStorage.getItem(key); } catch { return null; } }
function save(key: string, value: string) { try { localStorage.setItem(key, value); } catch { toast('No se pudo guardar el acceso en este navegador. Exporta tu acceso desde Ajustes.'); } }
preferences = parsePreferences(read('astra-preferences'));
if (!read('astra-preferences') && read('astra-low') === 'yes') preferences.quality = 'low';
let token = read('astra-token');
if (!token || !/^[a-f0-9]{64}$/.test(token)) { token = [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, '0')).join(''); save('astra-token', token); }
const savedClass = read('astra-class') as CharacterClass | null;
let selectedClass: CharacterClass = savedClass && Object.hasOwn(CHARACTER_CLASSES, savedClass) ? savedClass : 'traveler';
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
    $('tutorial').hidden = read('astra-tutorial') === 'done'; document.body.classList.add('playing'); setChat(!touchMode && !document.body.classList.contains('compact')); updateTutorial();
    save('astra-name', name); save('astra-color', color);
    room.onStateChange(state => { if (state.players && state.enemies && state.loot) view.state = state; });
    room.onMessage('profile', (p: Profile) => { profile = p; save('astra-name', p.name); if (p.classType) { selectedClass = p.classType; updateClassLabel(); } updateProfile(); });
    room.onMessage('notice', (message: string) => { toast(message); if ($<HTMLDialogElement>('modal').open) $('modal-health').textContent = message; });
    room.onMessage('chat', (message: { name: string; text: string; system: boolean }) => {
      const line = document.createElement('p'); line.className = message.system ? 'system' : '';
      const name = document.createElement('b'); name.textContent = message.system ? '✧ ' : `${message.name}: `; line.append(name, document.createTextNode(message.text));
      const log = $('chat-log'); log.append(line); if (log.childElementCount > 60) log.firstElementChild?.remove(); log.scrollTop = log.scrollHeight; if ($('chat-panel').hidden && !message.system) { unread++; $('unread').hidden = false; $('unread').textContent = String(unread); }
    });
    room.onMessage('pong', (timestamp: number) => $('ping').textContent = `${Math.max(0, Math.round(performance.now() - timestamp))} ms`);
    room.onMessage('effect', (e: { kind: string; x: number; z: number }) => { view.effect(e.kind, e.x, e.z); audio.play(e.kind); });
    room.onMessage('hit', (e: { id: string; amount: number; x: number; z: number; player: boolean }) => {
      if (e.id === view.selfId && e.player) { $('modal-live').classList.add('hurt'); setTimeout(() => $('modal-live').classList.remove('hurt'), 1200); }
      if (view.reducedMotion) return;
      const position = view.project(e.x, 2.2, e.z); if (!position.visible) return;
      const text = document.createElement('span'); text.className = `damage-number ${e.player ? 'damage-taken' : ''}`; text.textContent = `${e.player ? '−' : ''}${e.amount}`; text.style.left = `${position.x}px`; text.style.top = `${position.y}px`; document.body.append(text); setTimeout(() => text.remove(), 1100); audio.play('hit');
    });
    room.onDrop(() => { connected = false; stopMovement(); $('connection-lost').hidden = false; $('reconnect-text').textContent = 'Intentando reconectar con el servidor…'; $<HTMLButtonElement>('retry').disabled = true; $('connection').textContent = 'Reconectando'; });
    room.onReconnect(() => { connected = true; stopMovement(); $('connection-lost').hidden = true; $('connection').textContent = 'Conectado'; send('profile'); toast('Conexión recuperada.'); });
    room.onLeave(() => { connected = false; stopMovement(); $('connection-lost').hidden = false; $('reconnect-text').textContent = 'Comprueba que el servidor siga encendido y vuelve a conectar.'; $<HTMLButtonElement>('retry').disabled = false; $('connection').textContent = 'Desconectado'; });
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
view.onGround = (x, z) => { if (canPlay()) { send('go', { x, z }); advanceTutorial(0); } };
function isTyping() { return !!document.activeElement?.matches('input, textarea, select, [contenteditable="true"]'); }
function canPlay() { return connected && view.playing && !document.hidden && !$<HTMLDialogElement>('modal').open && !isTyping() && !document.body.classList.contains('menu-open') && (view.state?.players.get(view.selfId)?.hp ?? 0) > 0; }
function selectNext() {
  const p = view.state?.players.get(view.selfId); if (!p) return;
  const targets = [...view.state!.enemies.entries()].filter(([, e]) => {
    const screen = view.project(e.x, 1, e.z);
    return e.hp > 0 && Math.hypot(p.x - e.x, p.z - e.z) < 20 && screen.visible && screen.x > 0 && screen.x < view.canvas.clientWidth && screen.y > 0 && screen.y < view.canvas.clientHeight;
  }).sort((a, b) => Math.hypot(p.x - a[1].x, p.z - a[1].z) - Math.hypot(p.x - b[1].x, p.z - b[1].z));
  const index = targets.findIndex(([id]) => id === view.selected); view.selected = targets[(index + 1) % targets.length]?.[0] || '';
  if (!view.selected) toast('No hay enemigos visibles cerca.');
}
function act(kind: string, fromInventory = false) {
  if (!connected || (!fromInventory && !canPlay())) return;
  if ((profile?.cooldowns[kind] ?? 0) > (view.state?.time ?? 0)) return;
  if (kind === 'attack') {
    if (performance.now() - lastAttackSent < 200) return;
    lastAttackSent = performance.now();
    if (!view.selected && preferences.assist) selectNext();
    advanceTutorial(2);
  }
  send('action', { kind, target: view.selected || undefined });
}
const touch = new TouchControls($('joystick'), $('attack'), {
  enabled: canPlay,
  move: (side, forward) => { input.touch = { side, forward }; if (side || forward) advanceTutorial(0); },
  attack: held => { input.attacking = held; if (held) act('attack'); },
});
view.canInteract = canPlay;
function stopMovement() {
  input.reset(); touch.reset(); view.gestures.reset(); send('stop');
  $('run-toggle').setAttribute('aria-pressed', 'false');
}
function interact() { if (canPlay()) { send('interact'); const p = view.state?.players.get(view.selfId); if (p && Math.hypot(p.x - NPC.x, p.z - NPC.z) <= 4) advanceTutorial(1); } }
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(b => b.onclick = e => {
  if (b.id !== 'attack' || e.detail === 0) act(b.dataset.action!);
});
$('interact-button').onclick = interact;
$('next-target').onclick = () => { if (canPlay()) selectNext(); };
$('run-toggle').onclick = () => { if (canPlay()) { input.running = !input.running; $('run-toggle').setAttribute('aria-pressed', String(input.running)); } };
$('camera-center').onclick = () => { if (canPlay()) view.centerCamera(); };
$('zoom-in').onclick = () => { if (canPlay()) view.zoom(.85); };
$('zoom-out').onclick = () => { if (canPlay()) view.zoom(1.15); };
function setChat(show: boolean, focus = false) {
  $('chat-panel').hidden = !show; $('chat-toggle').setAttribute('aria-expanded', String(show));
  document.body.classList.toggle('chat-open', show);
  if (show) { unread = 0; $('unread').hidden = true; if (focus) { stopMovement(); $<HTMLInputElement>('chat-input').focus(); } }
  else { $<HTMLInputElement>('chat-input').blur(); document.body.classList.remove('typing'); }
}
$('chat-toggle').onclick = () => setChat($('chat-panel').hidden === true, true);
$('chat-close').onclick = () => { setChat(false); stopMovement(); view.canvas.focus({ preventScroll: true }); };
$('party-toggle').onclick = () => { const show = $('party').hidden; $('party').hidden = !show; $('party-toggle').setAttribute('aria-expanded', String(show)); };
function closeMenu() { document.body.classList.remove('menu-open'); $('menu-toggle').setAttribute('aria-expanded', 'false'); }
$('menu-toggle').onclick = () => { const show = !document.body.classList.contains('menu-open'); stopMovement(); document.body.classList.toggle('menu-open', show); $('menu-toggle').setAttribute('aria-expanded', String(show)); };
$('menu-settings').onclick = () => $('settings').click(); $('menu-invite').onclick = () => $('invite').click(); $('menu-sound').onclick = () => $('sound').click();
$('quest-brief').onclick = () => journal();
function updateTutorial() {
  const move = touchMode ? 'Arrastra el joystick izquierdo para moverte.' : `Muévete con ${keyLabel(preferences.bindings.forward)}${keyLabel(preferences.bindings.left)}${keyLabel(preferences.bindings.back)}${keyLabel(preferences.bindings.right)} o haz clic en el suelo.`;
  $('tutorial-text').textContent = [move, touchMode ? 'Busca a Elara y toca «Hablar con Elara» para aceptar tu misión.' : `Busca a Elara y usa ${keyLabel(preferences.bindings.interact)} para aceptar tu misión.`, touchMode ? 'Toca un enemigo del bosque y mantén Ataque. Arrastra el mundo para orientar la cámara.' : `Selecciona un enemigo y mantén ${keyLabel(preferences.bindings.attack)} para atacar.`][Math.min(2, tutorialStep)];
}
function advanceTutorial(step: number) { if (tutorialStep === step) { tutorialStep++; updateTutorial(); if (tutorialStep > 2) { $('tutorial').hidden = true; save('astra-tutorial', 'done'); } } }
function applyPreferences(graphics = true) {
  if (preferences.controls !== 'auto') touchMode = preferences.controls === 'touch';
  document.body.classList.toggle('touch-controls', touchMode);
  document.body.classList.toggle('left-handed', preferences.leftHanded);
  document.body.classList.toggle('compact', preferences.compact || innerWidth < 1050 || innerHeight < 620 || preferences.scale > 1 && innerWidth < 1400);
  document.body.style.setProperty('--ui-scale', String(preferences.scale));
  document.body.style.setProperty('--control-scale', String(preferences.controlSize));
  view.sensitivity = preferences.sensitivity; view.tapToMove = preferences.tapToMove;
  view.reducedMotion = preferences.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.body.classList.toggle('reduce-motion', view.reducedMotion);
  if (graphics) view.setQuality(preferences.quality);
  for (const kind of ['attack', 'nova', 'heal', 'potion'] as Binding[]) {
    $<HTMLElement>(kind).querySelector('kbd')!.textContent = keyLabel(preferences.bindings[kind]);
    $(kind).title = `${bindingLabels[kind]} · ${keyLabel(preferences.bindings[kind])}`;
  }
  $('interact-button').querySelector('kbd')!.textContent = keyLabel(preferences.bindings.interact);
  for (const [id, action] of [['inventory-button', 'inventory'], ['journal-button', 'journal'], ['map-button', 'map']] as const) $(id).querySelector('kbd')!.textContent = keyLabel(preferences.bindings[action]);
  updateTutorial();
}
function persistPreferences() { save('astra-preferences', JSON.stringify(preferences)); stopMovement(); applyPreferences(); }
function inputMethod(touchInput: boolean) {
  if (preferences.controls !== 'auto' || touchInput === touchMode) return;
  stopMovement(); touchMode = touchInput; applyPreferences(false); if (touchMode) setChat(false);
}
document.addEventListener('pointerdown', e => { if (!$<HTMLDialogElement>('modal').open) inputMethod(e.pointerType === 'touch'); }, { capture: true });
window.addEventListener('keydown', e => {
  if (rebinding) {
    e.preventDefault(); e.stopPropagation();
    if (e.code === 'Escape') { rebinding = undefined; $('binding-status').textContent = 'Cambio cancelado.'; return; }
    const error = bindingError(preferences.bindings, rebinding, e.code);
    if (error) { $('binding-status').textContent = error; return; }
    preferences.bindings[rebinding] = e.code; rebinding = undefined; persistPreferences(); renderBindings(); return;
  }
  if ($<HTMLDialogElement>('modal').open) return;
  if (e.code === 'Escape') { stopMovement(); if (isTyping() || touchMode && !$('chat-panel').hidden) setChat(false); else if (document.body.classList.contains('menu-open')) closeMenu(); else view.selected = ''; view.canvas.focus({ preventScroll: true }); return; }
  if (!connected || !view.playing || isTyping()) return;
  // Preserve Tab, Space and Enter behavior for focused buttons and all menus.
  if (document.body.classList.contains('menu-open') || document.activeElement?.closest('button, nav') && ['Space', 'Enter', 'Tab'].includes(e.code)) return;
  if (document.activeElement?.closest('button')) view.canvas.focus({ preventScroll: true });
  inputMethod(false);
  if (e.code === 'Enter') { e.preventDefault(); setChat(true, true); return; }
  if (!canPlay()) return;
  const b = preferences.bindings;
  if ([...Object.values(b), 'Digit1', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  input.keys.add(e.code); if (e.repeat) return;
  if (e.code === b.run && preferences.toggleRun) input.running = !input.running;
  if (e.code === b.interact) interact();
  for (const kind of ['nova', 'heal', 'potion', 'attack'] as const) if (e.code === b[kind] || kind === 'attack' && e.code === 'Digit1') act(kind);
  if (e.code === b.inventory) inventory(); if (e.code === b.journal) journal(); if (e.code === b.map) map();
  if (e.code === b.target) selectNext(); if (e.code === b.center) view.centerCamera();
});
window.addEventListener('keyup', e => input.keys.delete(e.code));
window.addEventListener('blur', stopMovement);
document.addEventListener('visibilitychange', () => { stopMovement(); if (!document.hidden) audio.resume(); });
screen.orientation?.addEventListener('change', stopMovement);
window.addEventListener('orientationchange', stopMovement);
$<HTMLInputElement>('chat-input').value = read('astra-chat-draft') || '';
$('chat-input').addEventListener('input', () => save('astra-chat-draft', $<HTMLInputElement>('chat-input').value));
$('chat-input').addEventListener('focus', () => { stopMovement(); document.body.classList.add('typing'); });
$('chat-input').addEventListener('blur', () => document.body.classList.remove('typing'));
$('chat-form').addEventListener('submit', e => {
  e.preventDefault(); const field = $<HTMLInputElement>('chat-input');
  if (!connected) { toast('El mensaje se conserva hasta recuperar la conexión.'); return; }
  if (field.value.trim()) send('chat', field.value); field.value = ''; save('astra-chat-draft', '');
  field.blur(); if (touchMode) setChat(false); view.canvas.focus({ preventScroll: true });
});
let landscape = innerWidth > innerHeight;
function updateViewport() {
  const nextOrientation = innerWidth > innerHeight;
  if (nextOrientation !== landscape && !isTyping()) stopMovement();
  landscape = nextOrientation;
  const v = window.visualViewport;
  document.documentElement.style.setProperty('--visible-height', `${v?.height ?? innerHeight}px`);
  document.documentElement.style.setProperty('--visible-top', `${v?.offsetTop ?? 0}px`);
  applyPreferences(false); view.engine.resize();
}
window.addEventListener('resize', updateViewport);
window.visualViewport?.addEventListener('resize', updateViewport);
window.visualViewport?.addEventListener('scroll', updateViewport);
matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', () => applyPreferences(false));
view.canvas.addEventListener('webglcontextlost', () => { stopMovement(); toast('Recuperando la imagen del juego…'); });
view.canvas.addEventListener('webglcontextrestored', () => { stopMovement(); applyPreferences(); toast('Imagen recuperada.'); });
setInterval(() => {
  if (!connected) return;
  const state = canPlay() ? input.sample(view.camera.alpha, preferences) : { x: 0, z: 0, run: false, attack: false };
  send('input', { x: state.x, z: state.z, run: state.run });
  if (state.x || state.z) advanceTutorial(0);
  if (state.attack) act('attack');
}, 50);
setInterval(() => { if (connected) { send('ping', performance.now()); $('fps').textContent = `${view.fps} FPS`; } }, 2000);
function updateProfile() {
  if (!profile) return;
  $('player-name').textContent = profile.name; $('player-name').title = profile.name; $('level-badge').textContent = String(profile.level); const classInfo = CHARACTER_CLASSES[profile.classType ?? selectedClass]; $('class-label').textContent = classInfo.label; $('gold').textContent = `${profile.gold} ◈`; $('xp-text').textContent = profile.level === 5 ? 'NIVEL MÁXIMO' : `${profile.xp} / ${xpForLevel(profile.level)} EXP`;
  $('xp-fill').style.width = `${profile.level === 5 ? 100 : profile.xp / xpForLevel(profile.level) * 100}%`;
  $('potion-count').textContent = String(profile.inventory.find(i => i.kind === 'potion')?.count ?? 0);
  const quest = QUESTS[profile.quest];
  $('quest-title').textContent = quest?.title ?? 'El valle vuelve a brillar';
  $('quest-summary').textContent = !quest ? 'Tu aventura ha dejado huella en Auralia.' : !profile.questAccepted ? 'Habla con Elara junto al santuario para aceptar esta misión.' : questReady(profile) ? 'Regresa con Elara para recibir tu recompensa.' : quest.text;
  $('quest-objectives').innerHTML = quest && profile.questAccepted ? objectives(profile) : '';
  $('quest-next').textContent = $('quest-summary').textContent;
  $('quest-reward').innerHTML = quest ? `<span class="gold-dot">◇</span> ${quest.xp} EXP <span>·</span> ${quest.gold} oro` : '<span class="gold-dot">✧</span> Historia completada';
  if ($<HTMLDialogElement>('modal').open && panel === 'inventory') refreshPanel(() => inventory(true));
  if ($<HTMLDialogElement>('modal').open && panel === 'journal') refreshPanel(() => journal(true));
}
function objectives(p: Profile) {
  const quest = QUESTS[p.quest]; if (!quest) return '';
  return Object.entries(quest.targets).map(([kind, goal]) => `<div class="objective ${p.kills[kind as EnemyKind] >= goal ? 'complete' : ''}"><span>${p.kills[kind as EnemyKind] >= goal ? '✓' : '◇'} ${ENEMIES[kind as EnemyKind].name}</span><b>${Math.min(p.kills[kind as EnemyKind], goal)}/${goal}</b></div>`).join('');
}
let partyHTML = '', lastMapPaint = 0;
setInterval(() => {
  if (!view.playing || !view.state) return;
  const state = view.state, p = state.players.get(view.selfId); if (!p) return;
  $('hp-fill').style.width = `${p.hp / p.maxHp * 100}%`; $('hp-text').textContent = `${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('hp-fill').classList.toggle('low', p.hp / p.maxHp < 0.3);
  $('modal-health').textContent = p.hp <= 0 ? 'Has caído · Regresando al santuario' : `Vida: ${Math.ceil(p.hp)} / ${p.maxHp}`;
  $('modal-live').classList.toggle('danger', p.hp / p.maxHp < .3);
  if (p.hp <= 0 && !wasDead) stopMovement(); wasDead = p.hp <= 0;
  const zone = p.z > 5 ? 'ALDEA DE AURALIA' : p.z > -25 ? 'BOSQUE DE LOS ECOS' : 'RUINAS DEL UMBRAL';
  $('zone').textContent = zone; $('zone-safety').textContent = p.z > 5 ? 'Zona segura' : p.z > -25 ? 'Territorio silvestre' : 'Zona de élite';
  const count = state.players.size; $('online-count').textContent = `${count} aventurero${count > 1 ? 's' : ''}`;
  const friends = [...state.players.entries()].filter(([id]) => id !== view.selfId);
  const html = (friends.length ? friends.map(([, f]) => `<div class="party-player panel"><span class="party-dot" style="background:${COLORS.includes(f.color) ? f.color : COLORS[0]}"></span><div><strong>${esc(f.name)} <small>NV. ${f.level}</small></strong><div class="party-health"><i style="width:${f.hp / f.maxHp * 100}%"></i></div></div><span class="muted">${f.connected ? '●' : '◌'}</span></div>`).join('') : '<p class="panel party-empty">Invita a alguien para explorar juntos.</p>');
  if (html !== partyHTML) { $('party').innerHTML = html; partyHTML = html; }
  const enemy = state.enemies.get(view.selected); $('target').hidden = !enemy || enemy.hp <= 0;
  if (enemy && enemy.hp <= 0) view.selected = '';
  if (enemy) { $('target').classList.toggle('out-of-range', Math.hypot(p.x - enemy.x, p.z - enemy.z) > (enemy.kind === 'warden' ? 4.5 : 3.5)); $('target').setAttribute('aria-label', Math.hypot(p.x - enemy.x, p.z - enemy.z) > (enemy.kind === 'warden' ? 4.5 : 3.5) ? 'Objetivo fuera de alcance cuerpo a cuerpo' : 'Objetivo cercano'); $('target-name').textContent = ENEMIES[enemy.kind as EnemyKind].name; $('target-kind').textContent = enemy.kind === 'warden' ? 'ÉLITE · RUINAS DEL UMBRAL' : 'CRIATURA DEL VALLE'; $('target-hp').style.width = `${enemy.hp / enemy.maxHp * 100}%`; $('target-value').textContent = `${Math.ceil(enemy.hp)} / ${enemy.maxHp}`; }
  const nearNPC = Math.hypot(p.x - NPC.x, p.z - NPC.z) <= 4;
  const nearLoot = [...state.loot.values()].some(l => Math.hypot(p.x - l.x, p.z - l.z) < 3);
  $('interaction').hidden = !(nearNPC || nearLoot) || p.hp <= 0;
  $('interaction-text').textContent = nearNPC ? (profile && questReady(profile) ? 'Entregar misión a Elara' : 'Hablar con Elara') : 'Recoger botín';
  $('death').hidden = p.hp > 0; $('death-count').textContent = String(Math.max(0, Math.ceil(p.deadUntil - state.time)));
  for (const kind of ['attack', 'nova', 'heal', 'potion']) {
    const remaining = Math.max(0, (profile?.cooldowns[kind] ?? 0) - state.time); const button = $<HTMLButtonElement>(kind);
    button.classList.toggle('cooling', remaining > 0); button.querySelector('.cooldown')!.textContent = remaining > 0 ? String(Math.ceil(remaining)) : ''; button.disabled = false; button.setAttribute('aria-disabled', String(p.hp <= 0 || remaining > 0));
  }
  if ($('open-map').getClientRects().length && performance.now() - lastMapPaint > 250) { drawMap($<HTMLCanvasElement>('minimap')); lastMapPaint = performance.now(); }
  if ($<HTMLDialogElement>('modal').open && panel === 'map') drawMap($<HTMLCanvasElement>('full-map'));
}, 100);
function open(title: string, html: string, type: string) {
  if (!$<HTMLDialogElement>('modal').open) previousFocus = document.activeElement as HTMLElement;
  stopMovement(); closeMenu(); panel = type; $('modal-live').hidden = !view.playing; showModal(title, html);
}
$('modal').addEventListener('close', () => { rebinding = undefined; stopMovement(); if (previousFocus?.isConnected && previousFocus.getClientRects().length) previousFocus.focus({ preventScroll: true }); else view.canvas.focus({ preventScroll: true }); });
function refreshPanel(render: () => void) {
  const focused = document.activeElement as HTMLElement | null, id = focused?.id, item = focused?.dataset.item;
  const scroll = $('modal-body').scrollTop; render();
  const next = id ? document.getElementById(id) : item ? document.querySelector<HTMLElement>(`[data-item="${item}"]`) : null;
  next?.focus({ preventScroll: true }); $('modal-body').scrollTop = scroll;
}
function inventory(refresh = false) {
  if (!profile) return toast('Entra al valle para abrir tu inventario.');
  const html = `<div class="inventory-summary"><span>${icon('bag')} ${profile.inventory.length}/12 espacios</span><strong>${profile.gold} ◈</strong></div><div class="equipped"><span>ARMA EQUIPADA</span><strong>${profile.weapon === 'starter' ? 'Espada de viajero' : ITEMS[profile.weapon].name}</strong><small>Daño adicional: +${profile.weapon === 'astral' ? 16 : profile.weapon === 'iron' ? 7 : 0}</small></div><div class="inventory-grid">${Array.from({ length: 12 }, (_, i) => { const stack = profile!.inventory[i]; return stack ? `<button class="item-slot" data-item="${stack.kind}" title="${ITEMS[stack.kind].name}" style="--item-color:${ITEMS[stack.kind].color}"><span>${ITEMS[stack.kind].icon}</span><b>${stack.count}</b><small>${ITEMS[stack.kind].name}</small></button>` : '<div class="item-slot empty"><span>·</span></div>'; }).join('')}</div><div id="item-detail" class="item-detail">Selecciona un objeto para usarlo o equiparlo.</div><div class="shop-row"><p><b>Elara · Suministros</b><br>1 poción por 3 cristales o 15 de oro.<br><small>Debes estar junto al santuario.</small></p><button id="buy-potion" class="secondary">Comprar poción</button></div>`;
  if (!refresh) selectedItem = undefined;
  if (refresh) $('modal-body').innerHTML = html; else open('Tu inventario', html, 'inventory');
  function detail(kind: ItemKind) {
    selectedItem = kind; const item = ITEMS[kind], owned = profile?.inventory.some(i => i.kind === kind);
    document.querySelectorAll<HTMLElement>('[data-item]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.item === kind)));
    $('item-detail').innerHTML = `<strong>${item.name}</strong><p>${item.description}</p>${!owned ? '<p>Ya no tienes este objeto.</p>' : kind === 'crystal' ? '' : `<button id="use-item" class="secondary" ${profile?.weapon === kind ? 'disabled' : ''}>${kind === 'potion' ? 'Usar poción' : profile?.weapon === kind ? 'Equipada' : 'Equipar arma'}</button>`}`;
    if ($('use-item')) $('use-item').onclick = () => kind === 'potion' ? act('potion', true) : send('equip', kind);
  }
  document.querySelectorAll<HTMLButtonElement>('[data-item]').forEach(b => b.onclick = () => detail(b.dataset.item as ItemKind));
  if (selectedItem) detail(selectedItem);
  $('buy-potion').onclick = () => { const p = view.state?.players.get(view.selfId); if (!p || Math.hypot(p.x - NPC.x, p.z - NPC.z) > 4) toast('Acércate a Elara para comprar una poción.'); else send('interact', 'buy'); };
}
function journal(refresh = false) {
  if (!profile) return toast('Entra al valle para consultar tus misiones.');
  const html = QUESTS.map((q, i) => `<article class="journal-quest ${i === profile!.quest ? 'active' : ''}"><span class="eyebrow">${i < profile!.quest ? '✓ COMPLETADA' : i === profile!.quest ? profile!.questAccepted ? 'EN CURSO' : 'DISPONIBLE CON ELARA' : 'POR DESCUBRIR'} · CAPÍTULO 0${i + 1}</span><h3>${q.title}</h3><p>${q.text}</p>${i === profile!.quest && profile!.questAccepted ? objectives(profile!) : ''}<div class="quest-reward">◇ ${q.xp} EXP · ${q.gold} oro · 1 poción</div></article>`).join('') + '<p class="modal-note">Acepta y entrega las misiones usando Interactuar junto a Elara. Los compañeros que participen en combate reciben experiencia y progreso.</p>';
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
  settings();
};
function settings() {
  const select = (id: string, label: string, options: [string, string][], value: string) => `<label class="settings-row"><span>${label}</span><select id="${id}">${options.map(([v, text]) => `<option value="${v}" ${v === value ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
  const check = (id: keyof Preferences, label: string) => `<label class="settings-row"><span>${label}</span><input id="pref-${id}" type="checkbox" ${preferences[id] ? 'checked' : ''}></label>`;
  open('Tu aventura, a tu manera', `<div class="settings-section"><h3>Pantalla y controles</h3>
    ${select('pref-controls', 'Método de control', [['auto','Automático'],['touch','Táctil'],['desktop','Teclado y ratón']], preferences.controls)}
    ${select('pref-scale', 'Tamaño de interfaz', [['1','100 %'],['1.25','125 %'],['1.5','150 %']], String(preferences.scale))}
    ${select('pref-controlSize', 'Tamaño de botones táctiles', [['1','Normal'],['1.15','Grande'],['1.25','Muy grande']], String(preferences.controlSize))}
    ${select('pref-sensitivity', 'Sensibilidad de cámara', [['0.5','Suave'],['1','Normal'],['1.5','Rápida'],['2','Muy rápida']], String(preferences.sensitivity))}
    ${check('leftHanded','Distribución para zurdos')}${check('tapToMove','Tocar el suelo para moverse')}${check('toggleRun','Alternar correr con una pulsación')}
    ${check('compact','Paneles compactos')}${check('assist','Seleccionar un enemigo cercano al atacar')}${check('reducedMotion','Reducir movimiento y efectos')}
    ${select('quality', 'Calidad gráfica', [['auto','Automática'],['low','Baja · 30 FPS'],['medium','Media'],['high','Alta'],['battery','Ahorro · 30 FPS']], preferences.quality)}
    <p class="modal-note">El rendimiento depende del dispositivo. Arrastra el mundo para girar en móvil; botón derecho en PC. Pellizca o usa +/− para acercar. Los botones ◎ y Cambiar objetivo están disponibles en ambos modos.</p>
    <h3>Atajos de teclado</h3><p class="modal-note">Selecciona una acción y pulsa su nueva tecla. Enter abre el chat; Escape cierra. Las flechas y 1 conservan movimiento y ataque.</p><div id="bindings" class="binding-grid"></div><p id="binding-status" role="status"></p>
    <button id="show-tutorial" class="secondary">Volver a mostrar la ayuda</button><button id="reset-preferences" class="secondary">Restablecer ajustes</button></div>
    <div class="settings-row"><span>Acceso a tu personaje</span><button id="export-access" class="secondary">Guardar acceso</button></div>
    <p class="modal-note" id="performance-info">${view.fps} FPS · ${$('ping').textContent || 'Sin conexión'}</p>
    ${view.playing ? '<button id="leave-game" class="secondary leave-button">Guardar y salir al inicio</button>' : ''}
    <p class="modal-note">El progreso se guarda automáticamente en el servidor. Conserva tu archivo de acceso para recuperar el personaje.</p>`, 'settings');
  renderBindings();
  for (const key of ['controls', 'scale', 'controlSize', 'sensitivity', 'leftHanded', 'tapToMove', 'toggleRun', 'compact', 'assist', 'reducedMotion'] as const) {
    $(`pref-${key}`).onchange = () => {
      const element = $<HTMLInputElement>(`pref-${key}`);
      if (key === 'controls') { preferences.controls = element.value as Preferences['controls']; if (preferences.controls === 'auto') touchMode = matchMedia('(any-pointer: coarse)').matches; }
      else if (key === 'scale' || key === 'controlSize' || key === 'sensitivity') preferences[key] = Number(element.value);
      else preferences[key] = element.checked;
      persistPreferences();
    };
  }
  $('quality').onchange = () => { preferences.quality = $<HTMLSelectElement>('quality').value as Preferences['quality']; persistPreferences(); };
  $('reset-preferences').onclick = () => { rebinding = undefined; preferences = defaults(); touchMode = matchMedia('(any-pointer: coarse)').matches; persistPreferences(); settings(); };
  $('show-tutorial').onclick = () => { tutorialStep = 0; save('astra-tutorial', ''); $('tutorial').hidden = false; updateTutorial(); $<HTMLDialogElement>('modal').close(); };
  $('export-access').onclick = () => {
    const blob = new Blob([JSON.stringify({ game: 'astra', token, name: profile?.name || $<HTMLInputElement>('name').value || 'Viajero' }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a'); a.href = url; a.download = 'astra-acceso.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  if ($('leave-game')) $('leave-game').onclick = async () => { connected = false; await room?.leave(); location.reload(); };
}
function renderBindings() {
  $('bindings').innerHTML = (Object.keys(bindingLabels) as Binding[]).map(key => `<button class="secondary" data-binding="${key}"><span>${bindingLabels[key]}</span><kbd>${keyLabel(preferences.bindings[key])}</kbd></button>`).join('');
  $('bindings').querySelectorAll<HTMLButtonElement>('button').forEach(button => button.onclick = () => { rebinding = button.dataset.binding as Binding; $('binding-status').textContent = `Pulsa la tecla para ${bindingLabels[rebinding].toLowerCase()}. Escape cancela.`; });
  $('binding-status').textContent = 'Atajos guardados en este navegador.';
}
$('import-access').onclick = () => $<HTMLInputElement>('access-file').click();
$('access-file').addEventListener('change', async () => {
  const file = $<HTMLInputElement>('access-file').files?.[0]; if (!file) return;
  try {
    if (file.size > 4096) throw new Error(); const data = JSON.parse(await file.text());
    if (data.game !== 'astra' || typeof data.token !== 'string' || !/^[a-f0-9]{64}$/.test(data.token) || typeof data.name !== 'string' || !/^[\p{L}\p{N} _-]{2,18}$/u.test(data.name)) throw new Error();
    token = data.token; save('astra-token', token!); save('astra-name', data.name); $<HTMLInputElement>('name').value = data.name; toast('Acceso recuperado. Entra al valle para continuar.');
  } catch { toast('El archivo de acceso no es válido.'); }
});
applyPreferences(); updateViewport();
window.addEventListener('beforeunload', () => { if (connected) void room?.leave(); });
