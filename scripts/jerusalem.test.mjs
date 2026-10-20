import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jerusalemTime, freshWeather } from '../public/jerusalem.mjs';

test('the clock follows Jerusalem winter and summer time independently of the visitor timezone', () => {
  assert.equal(jerusalemTime(new Date('2026-01-15T12:00:00Z')).label, '14:00');
  assert.equal(jerusalemTime(new Date('2026-07-15T12:00:00Z')).label, '15:00');
  const midnight = jerusalemTime(new Date('2026-01-15T22:00:00Z'));
  assert.equal(midnight.label, '00:00');
  assert.equal(midnight.hourAngle, 0);
  assert.equal(midnight.minuteAngle, 0);
});

test('clock hands include elapsed minutes and seconds rather than jumping between whole hours', () => {
  const time = jerusalemTime(new Date('2026-01-15T01:30:30Z'));
  assert.equal(time.label, '03:30');
  assert.equal(time.hourAngle, 105.25);
  assert.equal(time.minuteAngle, 183);
  assert.equal(time.secondAngle, 180);
});

test('unavailable, stale and future weather readings are not displayed as current weather', () => {
  const now = Date.parse('2026-10-20T18:00:00Z');
  assert.equal(freshWeather({ temperature: 0, observedAt: now - 900000 }, now), true);
  assert.equal(freshWeather({ temperature: -5, observedAt: now }, now), true);
  assert.equal(freshWeather({ temperature: 16, observedAt: now - 3600000 }, now), false);
  assert.equal(freshWeather({ temperature: 16, observedAt: now + 3600000 }, now), false);
  assert.equal(freshWeather({ temperature: null, observedAt: now }, now), false);
  assert.equal(freshWeather(null, now), false);
});
