import test from 'node:test';
import assert from 'node:assert/strict';
import { PullProgress } from '../public/pull-close.mjs';

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
  pull.wheel(100, 500);
  assert.equal(pull.progress, 0);
  assert.ok(pull.offset < 90);
  pull.wheel(20, 530);
  assert.equal(pull.offset, 90);
  assert.equal(pull.progress, 0);
  pull.wheel(30, 560);
  assert.ok(pull.offset >= 90);
  assert.ok(pull.progress > 0 && pull.progress < .25);
  assert.equal(pull.armed, false);
});

test('a short trackpad pull arms without a hold or a pause at the end', () => {
  const pull = new PullProgress();
  pull.atBottom(true, 0);
  pull.wheel(400, 500);
  pull.wheel(100, 520);
  assert.equal(pull.armed, false); // A single coarse wheel event is capped.
  pull.wheel(100, 540);
  assert.equal(pull.progress, 1);
  assert.equal(pull.release(), true);
  assert.equal(pull.distance, 0);
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
