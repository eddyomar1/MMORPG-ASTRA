import { test, expect } from '@playwright/test';
import { createGameServer } from '../../server/app';
import { NPC, newProfile, COLORS } from '../../shared/content';
import { CharacterStore } from '../../server/database';
import { houseFor } from '../../shared/banners';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('class cards, one 3D preview and mobile layouts lead to the selected class and preserve it', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(() => { localStorage.setItem('astra-low', 'yes'); localStorage.setItem('astra-tutorial', 'done'); });
  await page.goto('/');
  await expect(page.locator('.class-card')).toHaveCount(3);
  await page.locator('[data-class="knight"]').focus(); await page.keyboard.press('ArrowRight');
  await expect(page.locator('[data-class="mage"]')).toBeChecked();
  await expect(page.locator('[data-class="mage"]')).toBeFocused();
  await expect(page.locator('#class-detail')).toContainText('Barrera');
  await page.locator('[data-class="archer"]').check();
  await expect(page.locator('#join')).toContainText('Entrar como arquero');
  for (const [width, height] of [[1366,768], [768,1024], [360,640], [390,844], [844,390]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => document.body.style.setProperty('--ui-scale', '1.5'));
    await expect(page.locator('#class-preview canvas')).toHaveCount(1);
    for (const card of await page.locator('.class-card').all()) {
      const box = await card.boundingBox(); expect(box!.width).toBeGreaterThanOrEqual(48); expect(box!.height).toBeGreaterThanOrEqual(48); expect(box!.x).toBeGreaterThanOrEqual(0); expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator('#classes').scrollIntoViewIfNeeded();
    await page.screenshot({ path: `test-results/classes-${width}x${height}.png` });
  }
  await page.evaluate(() => document.body.style.setProperty('--ui-scale', '1'));
  await page.locator('#name').fill('Arquera nueva'); await page.locator('#join').click();
  await expect(page.locator('#attack small')).toHaveText('Flecha');
  await expect(page.locator('#heal small')).toHaveText('Evasión');
  await expect(page.locator('body > #world')).toBeVisible();
  await page.locator('#settings').click(); await page.locator('#leave-game').click();
  await expect(page.locator('[data-class="archer"]')).toBeChecked();
  await expect(page.locator('[data-class="mage"]')).toBeDisabled();
  await expect(page.locator('#class-persistence')).toContainText('Arquera nueva');
  expect(errors).toEqual([]);
});

test('old cosmetic character chooses a class once and uses new equipment and shop through the UI', async ({ browser }) => {
  const dir = mkdtempSync(join(tmpdir(), 'astra-class-browser-')), db = join(dir, 'save.sqlite');
  const store = new CharacterStore(db), token = 'e'.repeat(64);
  const old = { ...newProfile('Antigua', COLORS[0]), version: 1, classType: 'guardian', gold: 500, inventory: [{ kind: 'astral', count: 1 }, { kind: 'potion', count: 5 }], weapon: 'astral' };
  store.save(token, old as any); store.close();
  const game = await createGameServer({ port: 0, dbPath: db, host: '127.0.0.1' });
  const port = (game.server.transport.server!.address() as { port: number }).port;
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage(), errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await page.addInitScript(token => { localStorage.setItem('astra-token', token); localStorage.setItem('astra-name', 'Antigua'); localStorage.setItem('astra-low', 'yes'); localStorage.setItem('astra-tutorial', 'done'); }, token);
  try {
    await page.goto(`http://127.0.0.1:${port}`); await page.locator('#join').tap();
    await expect(page.locator('#modal-title')).toHaveText('Elige tu nueva clase');
    await page.locator('input[name="migration"][value="mage"]').check(); await page.locator('#confirm-class').tap();
    await expect(page.locator('#modal-title')).toHaveText('Elige tu estandarte');
    await page.locator('input[name="migration-banner"][value="forest"]').check(); await page.locator('#confirm-banner').tap();
    await expect(page.locator('#modal')).not.toBeVisible(); await expect(page.locator('#heal small')).toHaveText('Barrera');
    const [id, player] = [...game.world.state.players.entries()][0], profile = game.world.profiles.get(id)!;
    expect(profile.name).toBe('Antigua'); expect(profile.gold).toBe(500);
    Object.assign(player, houseFor('forest').shop);
    await page.locator('#menu-toggle').tap(); await page.locator('#inventory-button').tap();
    await page.locator('[data-item="astral"]').tap(); await page.locator('#exchange-item').tap();
    await expect(page.locator('[data-item="astralStaff"]')).toBeVisible();
    await page.locator('[data-item="astralStaff"]').tap(); await page.locator('#use-item').tap();
    await expect.poll(() => player.weapon).toBe('astralStaff');
    await page.locator('#shop-catalog summary').tap(); await page.locator('[data-buy="robe"]').tap();
    await expect.poll(() => profile.gold).toBe(435);
    await expect(page.locator('#shop-catalog')).toHaveAttribute('open', '');
    await page.locator('[data-item="robe"]').tap(); await page.locator('#use-item').tap();
    await expect.poll(() => player.armor).toBe('robe');
    await expect.poll(() => player.maxHp).toBe(115);
    expect(profile.classChoicePending).toBe(false); expect(errors).toEqual([]);
  } finally { await context.close(); await game.close(); rmSync(dir, { recursive: true, force: true }); }
});
