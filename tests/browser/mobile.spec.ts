import { test, expect, type Page, type CDPSession } from '@playwright/test';
import { createGameServer } from '../../server/app';
import { NPC } from '../../shared/content';

async function center(page: Page, id: string) {
  const r = await page.locator(`#${id}`).boundingBox();
  if (!r) throw new Error(`Control not visible: ${id}`);
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
}
async function touches(cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', points: { x: number; y: number; id: number }[]) {
  await cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(p => ({ ...p, radiusX: 5, radiusY: 5, force: 1 })) });
}

test('touch movement, simultaneous combat, camera and cancellation use the real server', async ({ browser }) => {
  const game = await createGameServer({ port: 0, dbPath: ':memory:', host: '127.0.0.1' });
  const port = (game.server.transport.server!.address() as { port: number }).port;
  const context = await browser.newContext({ viewport: { width: 640, height: 360 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('astra-low', 'yes'); localStorage.setItem('astra-tutorial', 'done'); });
  try {
    await page.goto(`http://127.0.0.1:${port}`); await page.locator('#name').fill('Móvil'); await page.locator('#join').tap();
    await expect(page.locator('#joystick')).toBeVisible();
    await expect.poll(() => game.world.state.players.size).toBe(1);
    const [id, player] = [...game.world.state.players.entries()][0];
    const cdp = await context.newCDPSession(page);
    const stick = await center(page, 'joystick'), initialZ = player.z;
    await touches(cdp, 'touchStart', [{ ...stick, id: 1 }]);
    await touches(cdp, 'touchMove', [{ x: stick.x, y: stick.y - 35, id: 1 }]);
    await expect.poll(() => player.z).toBeLessThan(initialZ - .6);
    await touches(cdp, 'touchCancel', []);
    await expect.poll(() => player.moving).toBe(false);
    const stopped = player.z; await page.waitForTimeout(400); expect(player.z).toBeCloseTo(stopped, 1);

    // Controlled starting position; acceptance and progress still go through UI and server rules.
    player.x = game.world.state.elara.x; player.z = game.world.state.elara.z + 1;
    await expect(page.locator('#interact-button')).toBeVisible(); await page.locator('#interact-button').tap();
    await expect.poll(() => game.world.profiles.get(id)?.questAccepted).toBe(true); await page.locator('#elara-bye').tap();

    const enemy = [...game.world.state.enemies.values()].find(e => e.kind === 'slime')!;
    player.x = enemy.x; player.z = enemy.z + 2; player.hp = player.maxHp;
    await page.waitForTimeout(500);
    const hp = enemy.hp, attack = await center(page, 'attack');
    await touches(cdp, 'touchStart', [{ ...stick, id: 1 }, { ...attack, id: 2 }]);
    await touches(cdp, 'touchMove', [{ x: stick.x, y: stick.y - 18, id: 1 }, { ...attack, id: 2 }]);
    await expect.poll(() => enemy.hp).toBeLessThan(hp);
    await expect.poll(() => player.moving).toBe(true);
    await touches(cdp, 'touchEnd', []); await expect.poll(() => player.moving).toBe(false);
    await page.waitForTimeout(850); const afterAttack = enemy.hp; await page.waitForTimeout(850); expect(enemy.hp).toBe(afterAttack);

    // A canvas drag must rotate the view, never become a move-to-ground command.
    player.x = game.world.state.elara.x; player.z = game.world.state.elara.z + 1; player.hp = player.maxHp;
    await page.waitForTimeout(400);
    let before = { x: player.x, z: player.z };
    await touches(cdp, 'touchStart', [{ x: 300, y: 280, id: 3 }]);
    await touches(cdp, 'touchMove', [{ x: 345, y: 295, id: 3 }]);
    await touches(cdp, 'touchEnd', []);
    await page.waitForTimeout(400); expect(player.x).toBeCloseTo(before.x, 1); expect(player.z).toBeCloseTo(before.z, 1);
    await touches(cdp, 'touchStart', [{ x: stick.x, y: stick.y - 35, id: 1 }]);
    await expect.poll(() => player.x).toBeLessThan(before.x - .15);
    await touches(cdp, 'touchCancel', []); await expect.poll(() => player.moving).toBe(false);
    before = { x: player.x, z: player.z };
    await touches(cdp, 'touchStart', [{ x: 275, y: 300, id: 3 }, { x: 365, y: 300, id: 4 }]);
    await touches(cdp, 'touchMove', [{ x: 250, y: 300, id: 3 }, { x: 390, y: 300, id: 4 }]);
    await touches(cdp, 'touchEnd', []);
    await page.waitForTimeout(400); expect(player.x).toBeCloseTo(before.x, 1); expect(player.z).toBeCloseTo(before.z, 1);

    for (const event of ['blur', 'orientationchange']) {
      await touches(cdp, 'touchStart', [{ x: stick.x, y: stick.y - 35, id: 1 }]);
      await expect.poll(() => player.moving).toBe(true);
      await page.evaluate(name => window.dispatchEvent(new Event(name)), event);
      await expect.poll(() => player.moving).toBe(false);
      await touches(cdp, 'touchMove', [{ x: stick.x, y: stick.y - 38, id: 1 }]);
      await page.waitForTimeout(150); expect(player.moving).toBe(false);
      await touches(cdp, 'touchEnd', []);
    }

    // Opening a panel while moving cancels every contact and keeps live health visible.
    await touches(cdp, 'touchStart', [{ x: stick.x, y: stick.y - 35, id: 1 }]);
    await expect.poll(() => player.moving).toBe(true);
    await page.evaluate(() => document.getElementById('inventory-button')!.click());
    await expect.poll(() => player.moving).toBe(false);
    await touches(cdp, 'touchEnd', []);
    await expect(page.locator('#modal-live')).toContainText('El mundo sigue activo');
    player.x = 30; player.z = 0; player.hp = 60; await expect(page.locator('#modal-health')).toContainText('60 /');
    await page.locator('[data-item="potion"]').tap(); await page.locator('#use-item').tap();
    await expect.poll(() => player.hp).toBe(125);
    await expect(page.locator('#item-detail')).toContainText('Poción');
    await page.locator('#modal-close').tap(); await expect.poll(() => player.moving).toBe(false);
    expect(errors).toEqual([]);
  } finally { await context.close(); await game.close(); }
});

test('phone layouts, large controls, menus, chat and preferences remain usable', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
  const page = await context.newPage(), errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('astra-low', 'yes'); localStorage.setItem('astra-tutorial', 'done'); });
  try {
    await page.goto('/'); await page.locator('#name').fill('Interfaz móvil'); await page.locator('#join').tap();
    await expect(page.locator('#joystick')).toBeVisible();
    for (const [width, height] of [[360,640], [640,360], [844,390], [390,844]]) {
      await page.setViewportSize({width,height});
      await expect.poll(() => page.locator('#world').evaluate(e => Math.round(e.getBoundingClientRect().height))).toBe(height);
      for (const id of ['joystick','attack','nova','heal','potion','menu-toggle','chat-toggle','next-target','camera-center']) {
        const r = await page.locator(`#${id}`).boundingBox(); expect(r, id).not.toBeNull();
        expect(r!.x, id).toBeGreaterThanOrEqual(0); expect(r!.y, id).toBeGreaterThanOrEqual(0);
        expect(r!.x + r!.width, id).toBeLessThanOrEqual(width + 1); expect(r!.y + r!.height, id).toBeLessThanOrEqual(height + 1);
        expect(r!.width, id).toBeGreaterThanOrEqual(48); expect(r!.height, id).toBeGreaterThanOrEqual(48);
      }
      await page.screenshot({path:`test-results/mobile-${width}x${height}.png`});
    }
    await page.locator('#menu-toggle').tap(); await page.locator('#menu-settings').tap();
    await page.locator('#pref-leftHanded').check(); await page.locator('#pref-controlSize').selectOption('1.25');
    await page.locator('#pref-scale').selectOption('1.5'); await page.locator('#quality').selectOption('battery');
    await page.locator('#modal-close').tap();
    await expect(page.locator('body')).toHaveClass(/left-handed/);
    let joystick = await page.locator('#joystick').boundingBox(), attack = await page.locator('#attack').boundingBox();
    expect(joystick!.x).toBeGreaterThan(attack!.x); expect(attack!.width).toBeGreaterThan(64);
    await page.locator('#chat-toggle').tap(); await page.locator('#chat-input').fill('Mensaje conservado');
    await page.locator('#chat-close').tap(); await page.locator('#chat-toggle').tap();
    await expect(page.locator('#chat-input')).toHaveValue('Mensaje conservado');
    await page.locator('#chat-input').press('Enter');
    await expect(page.locator('#chat-log')).toContainText('Mensaje conservado');
    await page.locator('#menu-toggle').tap(); await page.locator('#inventory-button').tap();
    await expect(page.locator('#modal-title')).toHaveText('Tu inventario'); await page.screenshot({path:'test-results/mobile-inventory.png'});
    await page.locator('#modal-close').tap();
    await page.reload(); await page.locator('#join').tap();
    await expect(page.locator('body')).toHaveClass(/left-handed/);
    expect(await page.evaluate(() => JSON.parse(localStorage.getItem('astra-preferences')!).quality)).toBe('battery');
    expect(errors).toEqual([]);
  } finally { await context.close(); }
});
