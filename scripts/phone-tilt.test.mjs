import test from 'node:test';
import assert from 'node:assert/strict';
import { TiltSignal, installPhoneTilt } from '../public/phone-tilt.mjs';

test('the holding position is neutral and small hand tremors are ignored', () => {
  const tilt = new TiltSignal();
  assert.deepEqual(tilt.sample({ alpha: 80, beta: 65, gamma: -12 }), { x: 0, y: 0 });
  const noise = tilt.sample({ alpha: 80, beta: 65.4, gamma: -11.8 });
  assert.equal(Math.hypot(noise.x, noise.y), 0);
});

test('steering gets stronger with tilt, keeps its direction and caps diagonal speed', () => {
  const tilt = new TiltSignal();
  tilt.sample({ beta: 0, gamma: 0 });
  const light = tilt.sample({ beta: 0, gamma: 6 });
  const strong = tilt.sample({ beta: 0, gamma: 18 });
  assert.ok(light.x > 0 && light.x < strong.x);
  assert.ok(Math.abs(strong.y) < 1e-10);
  assert.ok(tilt.sample({ beta: -10, gamma: -10 }).y < 0);
  const diagonal = tilt.sample({ beta: 45, gamma: 45 });
  assert.ok(Math.abs(Math.hypot(diagonal.x, diagonal.y) - 1) < 1e-10);
});

test('upright grips and angle wrapping remain continuous', () => {
  const tilt = new TiltSignal();
  tilt.sample({ alpha: 25, beta: 88, gamma: 0 });
  const upright = tilt.sample({ alpha: 25, beta: 88, gamma: 10 });
  assert.ok(upright.x > .4 && Math.abs(upright.y) < 1e-10);
  tilt.reset();
  tilt.sample({ alpha: 0, beta: 179, gamma: 0 });
  const wrapped = tilt.sample({ alpha: 0, beta: -179, gamma: 0 });
  assert.ok(wrapped.y > 0 && wrapped.y < .1);
});

test('portrait and landscape map steering to screen axes and rotation recalibrates', () => {
  const tilt = new TiltSignal();
  tilt.sample({ beta: 0, gamma: 0 }, 90);
  const landscape = tilt.sample({ beta: 10, gamma: 0 }, 90);
  assert.ok(landscape.x > .4 && Math.abs(landscape.y) < 1e-10);
  assert.deepEqual(tilt.sample({ beta: 10, gamma: 0 }, 0), { x: 0, y: 0 });
  tilt.reset();
  assert.deepEqual(tilt.sample({ beta: 33, gamma: 15 }, 0), { x: 0, y: 0 });
});

test('missing or invalid sensor readings cannot move or calibrate the canvas', () => {
  const tilt = new TiltSignal();
  for (const beta of [null, undefined, NaN, Infinity]) assert.equal(tilt.sample({ beta, gamma: 0 }), null);
  assert.deepEqual(tilt.sample({ beta: 45, gamma: 5 }), { x: 0, y: 0 });
});

function fixture({ permission, secure = true, sensor = true } = {}) {
  const target = () => ({
    listeners: new Map(),
    addEventListener(name, fn) { this.listeners.set(name, fn); },
    removeEventListener(name) { this.listeners.delete(name); },
    emit(name, event = {}) { return this.listeners.get(name)?.(event); }
  });
  const media = Object.assign(target(), { matches: true });
  const host = Object.assign(target(), {
    isSecureContext: secure,
    DeviceOrientationEvent: sensor ? (permission ? { requestPermission: permission } : {}) : undefined,
    document: Object.assign(target(), { hidden: false }),
    screen: { orientation: Object.assign(target(), { angle: 0 }) },
    matchMedia: () => media,
    timers: new Map(), nextTimer: 0,
    setTimeout(fn, delay) { this.timers.set(++this.nextTimer, { fn, delay }); return this.nextTimer; },
    clearTimeout(id) { this.timers.delete(id); }
  });
  const span = {}, attributes = {};
  const button = Object.assign(target(), {
    querySelector: () => span,
    setAttribute: (key, value) => { attributes[key] = value; }
  });
  const status = {};
  let activations = 0;
  const control = installPhoneTilt({ button, status, host, t: key => key, onActivate: () => { activations++; } });
  return { host, media, button, status, attributes, control, activations: () => activations };
}

test('permission is requested only on tap, synchronously, and valid readings activate tilt', async () => {
  let requests = 0;
  const f = fixture({ permission: () => { requests++; return Promise.resolve('granted'); } });
  assert.equal(requests, 0);
  const pending = f.button.emit('click');
  assert.equal(requests, 1);
  await pending;
  assert.equal(f.control.active, false);
  f.host.emit('deviceorientation', { beta: null, gamma: null });
  assert.equal(f.control.active, false);
  f.host.emit('deviceorientation', { beta: 50, gamma: 0 });
  assert.equal(f.control.active, true);
  assert.equal(f.attributes['aria-pressed'], 'true');
  assert.equal(f.activations(), 1);
  f.host.emit('deviceorientation', { beta: 50, gamma: 15 });
  assert.ok(f.control.vector.x > .5);
  f.button.emit('click');
  assert.equal(f.control.active, false);
  assert.equal(f.host.listeners.has('deviceorientation'), false);
});

test('denied or rejected permissions leave drag as the fallback', async () => {
  for (const permission of [() => Promise.resolve('denied'), () => Promise.reject(new Error('Denied'))]) {
    const f = fixture({ permission });
    await f.button.emit('click');
    assert.equal(f.control.active, false);
    assert.equal(f.status.textContent, 'tiltDenied');
    assert.equal(f.button.disabled, false);
    assert.equal(f.host.listeners.has('deviceorientation'), false);
  }
});

test('non-permission browsers activate from readings; absent hardware times out cleanly', async () => {
  const f = fixture();
  await f.button.emit('click');
  [...f.host.timers.values()].find(timer => timer.delay === 4000).fn();
  assert.equal(f.control.active, false);
  assert.equal(f.status.textContent, 'tiltUnavailable');
  assert.equal(f.host.listeners.has('deviceorientation'), false);
  await f.button.emit('click');
  f.host.emit('deviceorientation', { beta: 35, gamma: -5 });
  assert.equal(f.control.active, true);
});

test('backgrounding and recentering stop movement and resume from a neutral pose', async () => {
  const f = fixture();
  await f.button.emit('click');
  f.host.emit('deviceorientation', { beta: 0, gamma: 0 });
  f.host.emit('deviceorientation', { beta: 15, gamma: 10 });
  f.host.document.hidden = true;
  f.host.document.emit('visibilitychange');
  assert.equal(f.control.active, false);
  assert.deepEqual(f.control.vector, { x: 0, y: 0 });
  f.host.document.hidden = false;
  f.host.document.emit('visibilitychange');
  f.host.emit('deviceorientation', { beta: 60, gamma: 20 });
  assert.deepEqual(f.control.vector, { x: 0, y: 0 });
  f.control.recenter();
  f.host.emit('deviceorientation', { beta: 40, gamma: 0 });
  assert.deepEqual(f.control.vector, { x: 0, y: 0 });
});

test('unsupported devices hide the control and cancelling a pending permission stays off', async () => {
  assert.equal(fixture({ secure: false }).button.hidden, true);
  assert.equal(fixture({ sensor: false }).button.hidden, true);
  let grant;
  const f = fixture({ permission: () => new Promise(resolve => { grant = resolve; }) });
  const pending = f.button.emit('click');
  f.control.disable();
  grant('granted');
  await pending;
  assert.equal(f.control.active, false);
  assert.equal(f.host.listeners.has('deviceorientation'), false);
});
