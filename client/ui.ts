export const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
export const escapeHTML = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
export const icon = (name: string) => {
  const shapes: Record<string, string> = {
    star: '<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5Z"/>',
    sword: '<path d="m14 3 7-1-1 7L8 21l-5-5Z M5 13l6 6 M2 22l4-4 M9 15l9-9"/>',
    nova: '<path d="m12 2 2 6 6-2-3 6 5 3-7 1-3 6-2-6-7 1 4-5-5-3 7-1Z"/>',
    heal: '<path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6Z"/>',
    potion: '<path d="M9 2h6 M10 2v6l-5 9a3 3 0 0 0 3 5h8a3 3 0 0 0 3-5l-5-9V2 M7 14h10"/>',
    bag: '<path d="M5 8h14l2 13H3Z M8 9V6a4 4 0 0 1 8 0v3 M8 14h8"/>',
    book: '<path d="M12 5v16 M12 5C9 2 4 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-2-1-7-2-10 1Z"/>',
    map: '<path d="m2 5 6-3 8 3 6-3v17l-6 3-8-3-6 3Z M8 2v17 M16 5v17"/>',
    people: '<circle cx="9" cy="7" r="3"/><path d="M2 21v-4a7 7 0 0 1 14 0v4 M17 4a3 3 0 0 1 0 6 M19 14a5 5 0 0 1 3 5v2"/>',
    sound: '<path d="m3 9 5 0 5-5v16l-5-5H3Z M17 8a6 6 0 0 1 0 8 M20 4a11 11 0 0 1 0 16"/>',
    settings: '<path d="M4 7h16 M4 17h16 M8 4v6 M16 14v6"/>',
    arrow: '<path d="M3 12h17 M14 6l6 6-6 6"/>',
    compass: '<circle cx="12" cy="12" r="10"/><path d="m16 8-2 6-6 2 2-6Z"/>',
    link: '<path d="m9 15 6-6 M8 17l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0 M16 7l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shapes[name] || shapes.star}</svg>`;
};
export function mountUI() {
  $('app').innerHTML = `
    <header class="topbar">
      <a class="brand" href="/" aria-label="Astra, inicio">${icon('star')}<span>ASTRA<small>CRÓNICAS DEL VALLE</small></span></a>
      <div class="realm"><span class="status-dot"></span><span>VALLE DE AURALIA</span><span class="realm-separator">/</span><span class="muted">MUNDO LOCAL</span></div>
      <div class="top-actions"><button id="invite" class="text-button">${icon('people')}<span>Invitar amigos</span></button><span class="divider"></span><button id="sound" class="icon-button" title="Activar sonido" aria-label="Activar sonido" aria-pressed="false">${icon('sound')}</button><button id="settings" class="icon-button" title="Ayuda y ajustes" aria-label="Ayuda y ajustes">${icon('settings')}</button></div>
    </header>
    <section id="welcome" class="welcome">
      <div class="welcome-content"><div class="eyebrow"><span></span> TU PRÓXIMA AVENTURA EMPIEZA AQUÍ</div>
      <h1>El valle<br>te <em>espera.</em></h1>
      <p class="intro">Un antiguo poder despierta entre los árboles.<br>Encuentra tu camino. Comparte la aventura.</p>
      <form id="join-form"><label for="name">EL NOMBRE DE TU HISTORIA</label><input id="name" maxlength="18" minlength="2" required placeholder="Nombre de tu personaje" autocomplete="nickname" />
      <div class="character-choice"><span>Tu estandarte</span><div id="colors" role="group" aria-label="Color del personaje"></div><span class="class-label">Clase · Viajero</span></div>
      <button id="join" class="primary" type="submit">Entrar al valle ${icon('arrow')}</button><p id="join-error" class="error" role="alert"></p></form>
      <div class="welcome-meta"><span><i class="status-dot"></i><b id="lobby-count">0</b>/8 aventureros</span><span>3D · Cooperativo · Red local</span></div>
      <button id="import-access" class="subtle-link">Recuperar un personaje</button><input id="access-file" type="file" accept="application/json,.json" hidden />
      </div>
      <div class="location-caption"><span>01 — EL REFUGIO</span><strong>Aldea de Auralia</strong><p>Todo gran viaje comienza en un pequeño lugar.</p></div>
      <div class="welcome-bottom"><span>EXPLORA. CONECTA. DESCUBRE.</span><span>Una aventura para compartir.</span></div>
    </section>
    <div id="hud" hidden>
      <section class="player-card panel"><div class="portrait">${icon('star')}<b id="level-badge">1</b></div><div class="player-info"><div class="player-heading"><strong id="player-name">Viajero</strong><span>VIAJERO</span></div><div class="health-track"><i id="hp-fill"></i><span id="hp-text">120 / 120</span></div><div class="xp-track"><i id="xp-fill"></i></div><div class="xp-text"><span id="xp-text">0 / 90 EXP</span><span id="gold">0 ◈</span></div></div></section>
      <div id="party" class="party"></div>
      <section id="target" class="target panel" hidden><div><span id="target-kind">CRIATURA DEL VALLE</span><strong id="target-name"></strong></div><div class="health-track enemy-health"><i id="target-hp"></i><span id="target-value"></span></div></section>
      <aside class="right-hud"><button class="minimap panel" id="open-map" title="Abrir mapa (M)"><div class="map-title"><span id="zone">ALDEA DE AURALIA</span>${icon('compass')}</div><canvas id="minimap" width="220" height="170" aria-label="Minimapa del valle"></canvas><div class="map-footer"><span><i class="status-dot"></i><span id="zone-safety">Zona segura</span></span><kbd>M</kbd></div></button>
      <section class="quest-card panel"><div class="section-label">${icon('book')} DIARIO DE VIAJE <button id="quest-open" class="tiny-button" aria-label="Abrir misiones">↗</button></div><h3 id="quest-title">Un nuevo comienzo</h3><p id="quest-summary">Elara te espera junto al santuario.</p><div id="quest-objectives"></div><div class="quest-reward" id="quest-reward"><span class="gold-dot">◇</span> Habla con Elara para comenzar</div></section>
      </aside>
      <div id="tutorial" class="tutorial panel"><span class="tutorial-icon">${icon('compass')}</span><div><strong>Bienvenido a Auralia</strong><p>Muévete con WASD o haz clic en el suelo.<br>Busca a <b>Elara</b> y pulsa <kbd>E</kbd> para comenzar.</p></div><button id="dismiss-tutorial" class="tiny-button" aria-label="Cerrar consejo">×</button></div>
      <div id="interaction" class="interaction" hidden><kbd>E</kbd><span id="interaction-text">Hablar con Elara</span><button id="interact-button" aria-label="Interactuar">↵</button></div>
      <section class="chat panel"><div class="chat-tabs"><span><i class="status-dot"></i> LOCAL</span><span id="online-count">1 aventurero</span></div><div id="chat-log" class="chat-log" role="log" aria-live="polite"><p class="system">Bienvenido al valle. Tu historia comienza aquí.</p></div><form id="chat-form"><input id="chat-input" maxlength="180" placeholder="Enter para conversar…" autocomplete="off" aria-label="Mensaje al chat local"/><button type="submit" aria-label="Enviar mensaje">↵</button></form></section>
      <div class="action-area"><div class="hotbar panel">
        <button class="skill" id="attack" data-action="attack" title="Ataque · Espacio o 1"><kbd>1</kbd>${icon('sword')}<span class="cooldown"></span><small>Ataque</small></button>
        <button class="skill" id="nova" data-action="nova" title="Onda astral · Q · Daño en área"><kbd>Q</kbd>${icon('nova')}<span class="cooldown"></span><small>Onda astral</small></button>
        <button class="skill" id="heal" data-action="heal" title="Luz vital · F · Recupera 40 de vida"><kbd>F</kbd>${icon('heal')}<span class="cooldown"></span><small>Luz vital</small></button>
        <span class="hotbar-divider"></span><button class="skill potion-skill" id="potion" data-action="potion" title="Poción · R · Recupera 65 de vida"><kbd>R</kbd>${icon('potion')}<b id="potion-count">5</b><span class="cooldown"></span><small>Poción</small></button>
      </div><div class="movement-hint"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> Moverse</span><span><kbd>⇧</kbd> Correr</span><span>Botón derecho · Cámara</span></div></div>
      <nav class="quick-nav panel" aria-label="Menú de juego"><button id="inventory-button" title="Inventario (I)">${icon('bag')}<kbd>I</kbd></button><button id="journal-button" title="Misiones (J)">${icon('book')}<kbd>J</kbd></button><button id="map-button" title="Mapa (M)">${icon('map')}<kbd>M</kbd></button></nav>
      <div class="connection-info"><i class="status-dot"></i><span id="connection">Conectado</span><span id="ping">— ms</span><span id="fps"></span></div>
      <div id="death" class="death" hidden><span>✧</span><h2>La luz te guía de vuelta</h2><p>Regresas al santuario en <b id="death-count">5</b> s</p></div>
    </div>
    <div id="notifications" class="notifications" role="status" aria-live="polite"></div>
    <div id="connection-lost" class="connection-lost panel" hidden><span class="eyebrow">CONEXIÓN INTERRUMPIDA</span><h2>El valle sigue esperándote</h2><p id="reconnect-text">Intentando reconectar con el servidor…</p><button id="retry" class="primary">Volver a conectar ${icon('arrow')}</button></div>
    <dialog id="modal"><div class="modal-heading"><div><span class="eyebrow" id="modal-eyebrow">CRÓNICAS DEL VALLE</span><h2 id="modal-title"></h2></div><button id="modal-close" class="icon-button" aria-label="Cerrar ventana">×</button></div><div id="modal-body"></div></dialog>`;
  $('modal-close').onclick = () => ($('modal') as HTMLDialogElement).close();
  $('modal').addEventListener('click', e => { if (e.target === $('modal')) { const r = $('modal').getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) ($('modal') as HTMLDialogElement).close(); } });
}
export function showModal(title: string, html: string, eyebrow = 'CRÓNICAS DEL VALLE') {
  $('modal-title').textContent = title; $('modal-eyebrow').textContent = eyebrow; $('modal-body').innerHTML = html;
  const dialog = $('modal') as HTMLDialogElement; if (!dialog.open) dialog.showModal();
}
export function toast(message: string) {
  const node = document.createElement('div'); node.className = 'toast'; node.textContent = message; $('notifications').append(node);
  if ($('notifications').childElementCount > 5) $('notifications').firstElementChild?.remove();
  setTimeout(() => node.remove(), 4500);
}
