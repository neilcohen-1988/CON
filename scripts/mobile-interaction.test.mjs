import test from 'node:test';
import assert from 'node:assert/strict';
import { installCanvasGestures } from '../public/canvas-gestures.mjs';
import { installProjectNavigation, topProjectIndex } from '../public/project-navigation.mjs';

class Target extends EventTarget {
  capture = new Set();
  setPointerCapture(id) { this.capture.add(id); }
  hasPointerCapture(id) { return this.capture.has(id); }
  releasePointerCapture(id) { this.capture.delete(id); }
  closest() { return this.tile; }
}
function fire(target, type, values = {}) {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, { pointerId: 1, pointerType: 'touch', button: 0, isPrimary: true, clientX: 100, clientY: 100, detail: 1 }, values);
  target.dispatchEvent(event);
  return event;
}
function setup() {
  const surface = new Target(), host = new Target(), taps = [], moves = [], contacts = [];
  host.document = new Target();
  host.performance = { now: () => 1000 };
  const tile = {};
  surface.tile = tile;
  const gestures = installCanvasGestures({ surface, host, onTap: node => taps.push(node),
    onPan: (x, y) => moves.push([x, y]), onContact: active => contacts.push(active) });
  return { surface, host, tile, gestures, taps, moves, contacts };
}

test('touch jitter opens the original tile once, even when pointerup targets the captured canvas', () => {
  const state = setup();
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointermove', { clientX: 108, clientY: 104 });
  state.surface.tile = null;
  fire(state.surface, 'pointerup', { clientX: 108, clientY: 104 });
  assert.deepEqual(state.taps, [state.tile]);
  assert.deepEqual(state.moves, []);
  assert.deepEqual(state.contacts, [true, false]);
  assert.equal(fire(state.surface, 'click').defaultPrevented, true);
  assert.equal(state.surface.capture.size, 0);
});

test('dragging pans continuously without opening anything, and the next tap works immediately', () => {
  const state = setup();
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointermove', { clientX: 121 });
  fire(state.surface, 'pointermove', { clientX: 141, clientY: 108 });
  fire(state.surface, 'pointerup', { clientX: 141, clientY: 108 });
  assert.deepEqual(state.moves, [[21, 0], [20, 8]]);
  assert.equal(state.taps.length, 0);
  assert.equal(fire(state.surface, 'click').defaultPrevented, true);
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointerup');
  assert.equal(state.taps.length, 1);
});

test('pointer cancellation and a cancelled multi-touch gesture never open tiles or leave dragging stuck', () => {
  const state = setup();
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointercancel');
  fire(state.surface, 'pointerup');
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointerdown', { pointerId: 2, isPrimary: false });
  fire(state.surface, 'pointerup');
  fire(state.surface, 'pointerup', { pointerId: 2 });
  assert.equal(state.taps.length, 0);
  assert.deepEqual(state.contacts, [true, false, true, false]);
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointerup');
  assert.equal(state.taps.length, 1);
});

test('a coalesced final move, moving away and back, and tapping empty canvas cannot open a tile', () => {
  const state = setup();
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointerup', { clientY: 150 });
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointermove', { clientX: 130 });
  fire(state.surface, 'pointerup');
  state.surface.tile = null;
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointerup');
  assert.equal(state.taps.length, 0);
});

test('keyboard and desktop activation remain native and work after a touch gesture', () => {
  const state = setup();
  fire(state.surface, 'pointerdown');
  fire(state.surface, 'pointerup');
  assert.equal(fire(state.surface, 'click', { detail: 0 }).defaultPrevented, false);
  fire(state.surface, 'pointerdown', { pointerType: 'mouse' });
  fire(state.surface, 'pointerup', { pointerType: 'mouse' });
  assert.equal(fire(state.surface, 'click', { pointerType: 'mouse' }).defaultPrevented, false);
  assert.equal(state.taps.length, 1);
});

test('leaving the page or changing views releases the active gesture', () => {
  const state = setup();
  fire(state.surface, 'pointerdown');
  state.host.document.hidden = true;
  fire(state.host.document, 'visibilitychange');
  assert.equal(state.surface.capture.size, 0);
  assert.equal(state.contacts.at(-1), false);
  fire(state.surface, 'pointerdown');
  state.gestures.cancel();
  fire(state.surface, 'pointerup');
  assert.equal(state.taps.length, 0);
});

test('Projects picks the uppermost visible title, including the first and last project', () => {
  assert.equal(topProjectIndex([140, 360, 580], 80), 0);
  assert.equal(topProjectIndex([79, 299, 519], 80), 1);
  assert.equal(topProjectIndex([-361, -141, 79], 80), 2);
  assert.equal(topProjectIndex([], 80), -1);
});

test('mobile project scrolling updates backgrounds, leaving clears them, desktop keeps hover control', () => {
  const view = new Target(), host = new Target(), mobile = new Target(), shown = [];
  let scroll = 0, current = true, pending;
  mobile.matches = true;
  host.matchMedia = () => mobile;
  host.requestAnimationFrame = callback => { pending = callback; return 1; };
  host.cancelAnimationFrame = () => { pending = null; };
  const list = { querySelectorAll: () => [0, 1, 2].map(i => ({ parentElement: { dataset: { project: `p${i}` } },
    getBoundingClientRect: () => ({ bottom: 140 + i * 220 - scroll }) })) };
  const nav = installProjectNavigation({ view, list, host, show: id => shown.push(id),
    header: { getBoundingClientRect: () => ({ bottom: 60 }) }, isCurrent: () => current });
  nav.refresh();
  assert.equal(shown.at(-1), 'p0');
  scroll = 100;
  fire(view, 'scroll');
  pending();
  assert.equal(shown.at(-1), 'p1');
  scroll = 440;
  fire(view, 'scroll');
  pending();
  assert.equal(shown.at(-1), 'p2');
  current = false;
  nav.refresh();
  assert.equal(shown.at(-1), null);
  current = true;
  mobile.matches = false;
  nav.refresh();
  assert.equal(nav.scrollDriven, false);
  assert.equal(shown.at(-1), null);
});
