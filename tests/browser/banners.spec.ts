import { test, expect } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../../server/app';
import { BANNERS, BANNER_IDS, houseFor } from '../../shared/banners';

test('banners, PvP targeting, house commerce and advice notices work through the browser', async ({ page }) => {
  const game = await createGameServer({ port: 0, dbPath: ':memory:', host: '127.0.0.1' });
  const port = (game.server.transport.server!.address() as { port: number }).port;
  game.world.state.enemies.clear();
  const friend = await new Client(`ws://127.0.0.1:${port}`).joinById('valle', { name: 'Rival gris', token: 'f'.repeat(64), bannerId: 'ash', classType: 'archer' });
  friend.onMessage('*', () => {});
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem('astra-low', 'yes'));
  try {
    await page.goto(`http://127.0.0.1:${port}`);
    await expect(page.locator('#colors input')).toHaveCount(5);
    for (const id of BANNER_IDS) { await page.locator(`#colors input[value="${id}"]`).check(); await expect(page.locator(`#colors input[value="${id}"]`)).toBeChecked(); }
    await page.locator('#colors input[value="ember"]').check();
    await page.locator('#name').fill('Naranja'); await page.locator('#join').click();
    await expect(page.locator('#hud')).toBeVisible();
    const [id, player] = [...game.world.state.players.entries()].find(([id]) => id !== friend.sessionId)!;
    const profile = game.world.profiles.get(id)!, rival = game.world.state.players.get(friend.sessionId)!;
    expect(player.bannerId).toBe('ember'); expect(player.color).toBe(BANNERS.ember.color);
    await expect(page.locator('#party')).toContainText('Hoja · Rival');
    await page.locator('#attack').click();
    await expect(page.locator('#notifications')).toContainText('Zona segura');
    const notice = await page.locator('#notifications').boundingBox(), advice = await page.locator('#tutorial-advice').boundingBox();
    expect(notice!.y + notice!.height).toBeLessThanOrEqual(advice!.y + 1);
    await page.locator('#dismiss-tutorial').click();
    await expect(page.locator('#notifications')).toBeVisible(); await expect(page.locator('#tutorial-advice')).not.toBeVisible();
    Object.assign(player, { x: 0, z: 0 }); Object.assign(rival, { x: 0, z: -2 });
    await expect(page.locator('#zone-banner')).toContainText('Territorio de combate');
    await page.locator('#next-target').click(); await expect(page.locator('#target')).toContainText('Rival gris');
    await page.locator('#attack').click(); await expect.poll(() => rival.hp).toBe(92);
    rival.z = 5; await expect(page.locator('#target')).not.toBeVisible();
    profile.gold = 100; game.world.changed(id);
    await page.locator('#inventory-button').click(); await page.locator('#shop-catalog summary').click();
    await page.locator('[data-buy="plate"]').click();
    await expect(page.locator('#modal-notice')).toContainText('Compra y vende junto a tu casa Ámbar');
    await expect(page.locator('#modal-health')).toContainText('150 / 150'); expect(profile.gold).toBe(100);
    Object.assign(player, houseFor('ember').shop); await page.locator('[data-buy="plate"]').click(); await expect.poll(() => profile.gold).toBe(35);
    await expect(page.locator('[data-item="plate"]')).toBeVisible();
    await page.locator('#modal-close').click();
    await page.locator('#map-button').click(); await expect(page.locator('.house-legend span')).toHaveCount(5); await expect(page.locator('.house-legend')).toContainText('Ámbar · Tu casa');
    await page.screenshot({ path: 'test-results/banners-map.png' }); await page.locator('#modal-close').click();
    game.world.notice(id, 'Prueba de aviso con tutorial cerrado.');
    await expect(page.locator('#notifications')).toContainText('Prueba de aviso'); await expect(page.locator('#tutorial-advice')).not.toBeVisible();
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.locator('#settings').click(); await page.locator('#pref-scale').selectOption('1.5'); await page.locator('#modal-close').click();
    await page.screenshot({ path: 'test-results/banners-desktop.png' });
    expect(errors).toEqual([]);
  } finally { await page.goto('about:blank'); await friend.leave(); await game.close(); }
});

test('banner selection and advice remain readable on phones at 150 percent', async ({ browser }) => {
  const game = await createGameServer({ port: 0, dbPath: ':memory:', host: '127.0.0.1' });
  const port = (game.server.transport.server!.address() as { port: number }).port;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('astra-preferences', JSON.stringify({ quality: 'low', controls: 'touch', scale: 1.5 })));
  try {
    await page.goto(`http://127.0.0.1:${port}`);
    await expect(page.locator('#colors input')).toHaveCount(5);
    await page.locator('#colors input[value="forest"]').tap(); await expect(page.locator('#colors input[value="forest"]')).toBeChecked(); await page.locator('#colors').scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'test-results/banners-selector-mobile.png' });
    await page.locator('#name').fill('Bosque'); await page.locator('#join').tap();
    await expect(page.locator('#hud')).toBeVisible();
    const id = [...game.world.state.players.keys()][0];
    for (const [width, height] of [[360, 640], [390, 844], [844, 390]]) {
      await page.setViewportSize({ width, height }); game.world.notice(id, `Aviso ${width}: compra y vende en la casa de tu estandarte. Puedes consultarla en el mapa.`);
      await expect(page.locator('#notifications')).toContainText(`Aviso ${width}`);
      await expect(page.locator('#tutorial-advice')).toBeVisible();
      const panel = await page.locator('#tutorial').boundingBox();
      expect(panel!.x).toBeGreaterThanOrEqual(0); expect(panel!.x + panel!.width).toBeLessThanOrEqual(width);
      for (const control of ['#joystick', '.action-area', '.camera-tools', '#menu-toggle', '.player-card', '#zone-banner', '#quest-brief']) {
        const box = await page.locator(control).boundingBox(); if (!box) continue;
        expect(panel!.x >= box.x + box.width || panel!.x + panel!.width <= box.x || panel!.y >= box.y + box.height || panel!.y + panel!.height <= box.y, `${width}: ${control} overlaps advice`).toBe(true);
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/banners-advice-${width}.png` });
    }
  } finally { await context.close(); await game.close(); }
});
