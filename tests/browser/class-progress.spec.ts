import { test, expect } from '@playwright/test';
import { Client } from '@colyseus/sdk';
import { createGameServer } from '../../server/app';
import { houseFor } from '../../shared/banners';

test('mobile house switching preserves class progress and Elara waits for every conversation', async ({ browser }) => {
  const game = await createGameServer({ port: 0, dbPath: ':memory:', host: '127.0.0.1' });
  const url = `http://127.0.0.1:${(game.server.transport.server!.address() as {port:number}).port}`;
  const context = await browser.newContext({ viewport:{width:390,height:844},hasTouch:true,isMobile:true });
  const page=await context.newPage(), errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=> { localStorage.setItem('astra-preferences',JSON.stringify({quality:'low',controls:'touch'})); localStorage.setItem('astra-tutorial','done'); });
  const friend=await new Client(url).joinById('valle',{name:'Compañero',token:'f'.repeat(64),classType:'knight',bannerId:'sun'}); friend.onMessage('*',()=>{});
  let keep: ReturnType<typeof setInterval> | undefined;
  try {
    await page.goto(url); await page.locator('[data-class="mage"]').tap(); await page.locator('#name').fill('Aprendiz'); await page.locator('#join').tap(); await expect(page.locator('#hud')).toBeVisible();
    const [id,player]=[...game.world.state.players.entries()].find(([id])=>id!==friend.sessionId)!;
    let profile=game.world.profiles.get(id)!; profile.level=3;profile.xp=47;profile.gold=211;profile.quest=1;profile.inventory.push({kind:'oakStaff',count:1});game.world.changed(id);
    Object.assign(player,houseFor(profile.bannerId).shop);
    await page.locator('#menu-toggle').tap(); await page.locator('#inventory-button').tap();
    await expect(page.locator('[data-buy="iron"]')).toHaveCount(0); await expect(page.locator('[data-buy="oakStaff"]')).toHaveCount(1);
    await page.locator('[data-switch-class="archer"]').tap(); await expect.poll(()=>game.world.profiles.get(id)!.classType).toBe('archer');
    await expect(page.locator('#level-badge')).toHaveText('1'); await expect(page.locator('[data-item="oakStaff"]')).toHaveCount(0); expect(player.maxHp).toBe(115);
    profile=game.world.profiles.get(id)!;expect(profile.gold).toBe(0);expect(profile.quest).toBe(0);profile.level=2;profile.gold=29;game.world.changed(id);
    await page.locator('[data-switch-class="mage"]').tap(); await expect(page.locator('#level-badge')).toHaveText('3');
    profile=game.world.profiles.get(id)!;expect(profile.xp).toBe(47);expect(profile.gold).toBe(211);expect(profile.quest).toBe(1);
    await expect(page.locator('[data-item="oakStaff"]')).toBeVisible();
    await page.locator('#modal-close').tap();
    player.x=game.world.state.elara.x;player.z=game.world.state.elara.z;
    await expect(page.locator('#interaction-text')).toContainText('Elara'); await page.locator('#interact-button').tap();
    await expect(page.locator('#modal-title')).toContainText('Elara');
    const other=game.world.state.players.get(friend.sessionId)!;other.x=game.world.state.elara.x;other.z=game.world.state.elara.z;
    friend.send('interact',{op:'talk'});keep=setInterval(()=>friend.send('talk',true),500);
    const before={x:game.world.state.elara.x,z:game.world.state.elara.z};
    await page.waitForTimeout(3000);expect(game.world.state.elara.moving).toBe(false);
    expect(game.world.state.elara.x).toBeCloseTo(before.x,3);expect(game.world.state.elara.z).toBeCloseTo(before.z,3);
    await page.locator('#elara-bye').tap();await page.waitForTimeout(3500);expect(game.world.state.elara.moving).toBe(false);
    clearInterval(keep);keep=undefined;friend.send('talk',false);
    await expect.poll(()=>game.world.state.elara.pauseUntil).toBeGreaterThan(game.world.state.time);
    expect(game.world.state.elara.pauseUntil-game.world.state.time).toBeLessThanOrEqual(10);
    await expect.poll(()=>game.world.state.elara.moving,{timeout:12000}).toBe(true);
    await expect.poll(()=>Math.abs(friend.state.elara.x-game.world.state.elara.x)+Math.abs(friend.state.elara.z-game.world.state.elara.z)).toBeLessThan(.2);
    await page.screenshot({path:'test-results/class-progress-mobile.png'});expect(errors).toEqual([]);
  } finally { if(keep)clearInterval(keep);await context.close();await friend.leave();await game.close(); }
});
