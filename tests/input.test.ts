import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameInput, cameraVector, joystickVector } from '../client/input';
import { defaults, parsePreferences, bindingError } from '../client/preferences';

test('joystick dead zone, gradual movement and diagonal cap', () => {
  assert.deepEqual(joystickVector(2, 2, 60), { side: 0, forward: 0 });
  const half = joystickVector(0, -30, 60);
  assert.ok(half.forward > 0 && half.forward < .5);
  const full = joystickVector(100, -100, 60);
  assert.ok(Math.abs(Math.hypot(full.side, full.forward) - 1) < 1e-10);
});
test('movement follows the camera and never accelerates diagonally', () => {
  const north = cameraVector(0, 1, Math.PI / 2);
  assert.ok(Math.abs(north.x) < 1e-10); assert.equal(north.z, -1);
  const east = cameraVector(0, 1, Math.PI);
  assert.equal(east.x, 1); assert.ok(Math.abs(east.z) < 1e-10);
  assert.ok(Math.abs(Math.hypot(...Object.values(cameraVector(1, 1, .8))) - 1) < 1e-10);
});
test('touch owns movement while keyboard and attack remain independent', () => {
  const input = new GameInput(), p = defaults(); input.keys.add('KeyW'); input.touch.side = .5; input.attacking = true;
  let state = input.sample(Math.PI / 2, p);
  assert.ok(Math.abs(state.x + .5) < 1e-10); assert.ok(Math.abs(state.z) < 1e-10); assert.equal(state.attack, true);
  input.touch.side = 0; state = input.sample(Math.PI / 2, p); assert.equal(state.z, -1);
});
test('interruptions reset held keyboard, joystick, attack and toggled run', () => {
  const input = new GameInput(); input.keys.add('Space'); input.keys.add('KeyD'); input.touch.forward = 1; input.attacking = input.running = true;
  input.reset(); const state = input.sample(0, defaults());
  assert.equal(Math.hypot(state.x, state.z), 0); assert.equal(state.attack, false); assert.equal(state.run, false);
});
test('preferences tolerate corrupt storage and reject conflicting or reserved bindings', () => {
  assert.deepEqual(parsePreferences('{bad'), defaults());
  const p = parsePreferences(JSON.stringify({ scale: 90, quality: 'ultra', leftHanded: true, sensitivity: -5 }));
  assert.equal(p.scale, 1.5); assert.equal(p.sensitivity, .5); assert.equal(p.quality, 'auto'); assert.equal(p.leftHanded, true);
  assert.ok(bindingError(p.bindings, 'attack', 'KeyW')); assert.ok(bindingError(p.bindings, 'attack', 'Enter'));
  assert.equal(bindingError(p.bindings, 'attack', 'KeyT'), '');
  assert.deepEqual(parsePreferences(JSON.stringify({ bindings: { attack: 'KeyW' } })).bindings, defaults().bindings);
});
test('custom bindings and run toggle survive reload without retaining a held input', () => {
  const p = defaults(); p.bindings.attack = 'KeyT'; p.toggleRun = true;
  const loaded = parsePreferences(JSON.stringify(p)), input = new GameInput(); input.keys.add('KeyT'); input.keys.add('ShiftLeft');
  assert.equal(input.sample(0, loaded).attack, true); assert.equal(input.sample(0, loaded).run, false);
  input.running = true; assert.equal(input.sample(0, loaded).run, true);
});
