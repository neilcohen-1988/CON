import test from 'node:test';
import assert from 'node:assert/strict';
import { PullProgress, installPullClose } from '../public/pull-close.mjs';

test('scrolling into the end and its momentum cannot arm a close', () => {
  const pull = new PullProgress();
  pull.atBottom(false, 0);
  pull.wheel(100, 100);
  pull.atBottom(true, 120);
  for (let now = 140; now < 900; now += 30) pull.wheel(100, now);
  assert.equal(pull.release(), false);
});

test('the fill stays empty until the button has fully entered the shell', () => {
  const pull = new PullProgress();
  pull.atBottom(true, 0);
  pull.wheel(60, 500);
  assert.equal(pull.progress, 0);
  assert.ok(pull.offset < 90);
  pull.wheel(12, 530);
  assert.equal(pull.offset, 90);
  assert.equal(pull.progress, 0);
  pull.wheel(20, 560);
  assert.ok(pull.offset >= 90);
  assert.ok(pull.progress > 0 && pull.progress < .25);
  assert.equal(pull.armed, false);
});

test('a short trackpad pull arms without a hold or a pause at the end', () => {
  const pull = new PullProgress();
  pull.atBottom(true, 0);
  pull.wheel(60, 500);
  pull.wheel(60, 520);
  assert.equal(pull.armed, false);
  pull.wheel(60, 540);
  assert.equal(pull.progress, 1);
  assert.equal(pull.release(), true);
  assert.equal(pull.distance, 0);
});

test('a strong fresh pull closes without waiting for more wheel samples', () => {
  const pull = new PullProgress();
  pull.atBottom(true, 0);
  pull.wheel(220, 5);
  assert.equal(pull.armed, true);
  assert.equal(pull.release(), true);
});

test('a renewed trackpad push can follow decaying momentum without a long pause', () => {
  const pull = new PullProgress();
  pull.wheel(70, 0);
  pull.atBottom(true, 10);
  [60, 40, 22, 10, 4].forEach((delta, i) => pull.wheel(delta, 30 + i * 25));
  assert.equal(pull.distance, 0);
  for (const [delta, now] of [[40, 180], [85, 200], [95, 220], [80, 240]]) pull.wheel(delta, now);
  assert.equal(pull.armed, true);
  assert.equal(pull.release(), true);
});

test('gradually increasing trackpad pressure is recognized without a sharp jump or pause', () => {
  const pull = new PullProgress();
  pull.wheel(60, 0);
  pull.atBottom(true, 10);
  [45, 28, 14, 7, 4].forEach((delta, i) => pull.wheel(delta, 16 + i * 16));
  assert.equal(pull.distance, 0);
  // Every successive increase is less than 40%; the old single-sample detector
  // ignored this whole intentional push.
  [5, 6, 7, 8, 10, 12, 15, 18, 22, 27, 32, 38]
    .forEach((delta, i) => pull.wheel(delta, 96 + i * 16));
  assert.equal(pull.armed, true);
});

test('small fluctuations in the momentum tail do not start a close', () => {
  const pull = new PullProgress();
  pull.wheel(80, 0);
  pull.atBottom(true, 10);
  [70, 50, 30, 15, 8, 6, 7, 5, 4, 5, 3, 4, 2, 1]
    .forEach((delta, i) => pull.wheel(delta, 16 + i * 16));
  assert.equal(pull.distance, 0);
  assert.equal(pull.armed, false);
});

test('a light pull, reversing, and leaving the end cancel dismissal', () => {
  const pull = new PullProgress();
  pull.atBottom(true, 0);
  pull.wheel(80, 500);
  assert.equal(pull.release(), false);
  for (const now of [900, 930, 960, 990, 1020, 1050, 1080]) pull.wheel(100, now);
  assert.equal(pull.armed, true);
  pull.wheel(-10, 1110);
  assert.equal(pull.release(), false);
  pull.touch(250);
  pull.atBottom(false, 1200);
  assert.equal(pull.release(), false);
});

test('touch needs an upward pull at the end and can be withdrawn', () => {
  const pull = new PullProgress();
  assert.equal(pull.touch(200), false);
  pull.atBottom(true, 0);
  pull.touch(250);
  assert.equal(pull.armed, false); // Touch retains a longer fill than the trackpad.
  pull.touch(40);
  assert.equal(pull.armed, true);
  pull.touch(-40);
  assert.equal(pull.release(), false);
});

test('a wheel gesture over the revealed shell gap or button can finish closing', () => {
  const element = () => ({
    listeners: new Map(),
    style: { setProperty() {} },
    classList: { toggle() {} },
    closest() { return null; },
    addEventListener(name, listener) { this.listeners.set(name, listener); }
  });
  const scroller = Object.assign(element(), {
    scrollHeight: 1200, clientHeight: 600, scrollTop: 600
  });
  const shell = element(), button = element(), label = {};
  let closes = 0;
  const controller = installPullClose({
    scroller, shell, button, label, close: () => { closes++; }
  });
  for (const target of [shell, button]) {
    controller.reset();
    let prevented = false;
    shell.listeners.get('wheel')({
      deltaX: 0, deltaY: 220, deltaMode: 0, target,
      preventDefault() { prevented = true; }
    });
    assert.equal(prevented, true);
  }
  assert.equal(closes, 2);
});
