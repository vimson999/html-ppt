import test from 'node:test';
import assert from 'node:assert/strict';
import { CITIES, TAU, rotationForHour, solarHour, phaseAt, surfacePoint, toCamera, fromCamera } from '../model.js';

test('every city has consistent sunrise/noon/sunset/midnight and returns after a day', () => {
  for (const city of Object.values(CITIES)) for (const hour of [0, 6, 12, 18]) {
    const angle = rotationForHour(city, hour);
    assert.ok(Math.abs(solarHour(city, angle) - hour) < 1e-8);
    assert.ok(Math.abs(solarHour(city, angle + TAU) - hour) < 1e-8);
    const sunDot = surfacePoint(city.lat, city.lon, angle)[2];
    if (hour === 0) assert.ok(sunDot < 0);
    if (hour === 12) assert.ok(sunDot > 0);
    if (hour === 6 || hour === 18) assert.ok(Math.abs(sunDot) < 1e-8);
  }
});
test('Beijing noon and New York night coexist without advancing model time', () => {
  const rotation = rotationForHour(CITIES.beijing, 12);
  assert.equal(phaseAt(solarHour(CITIES.beijing, rotation)), 'day');
  assert.equal(phaseAt(solarHour(CITIES['new-york'], rotation)), 'night');
  assert.ok(Math.abs(solarHour(CITIES['new-york'], rotation) - 23.3066666667) < 1e-6);
});
test('half a turn changes noon into midnight; sunrise enters daylight', () => {
  const noon = rotationForHour(CITIES.beijing, 12);
  assert.equal(phaseAt(solarHour(CITIES.beijing, noon + Math.PI)), 'night');
  assert.equal(phaseAt(6), 'sunrise');
  assert.equal(phaseAt(18), 'sunset');
  assert.equal(phaseAt(5.9), 'night');
  assert.equal(phaseAt(6.1), 'day');
});
test('camera transforms invert, preserving world-space light and time', () => {
  const point = surfacePoint(39.9, 116.4, 0);
  for (const yaw of [-2, 0, .8, 3]) for (const pitch of [-1, .18, Math.PI / 2]) {
    const camera = toCamera(point, yaw, pitch);
    const restored = fromCamera(...camera, yaw, pitch);
    restored.forEach((value, i) => assert.ok(Math.abs(value - point[i]) < 1e-10));
  }
});
test('eastward rotation appears counterclockwise from the north pole', () => {
  const before = toCamera(surfacePoint(40, 0, 0), 0, Math.PI / 2);
  const after = toCamera(surfacePoint(40, 0, .1), 0, Math.PI / 2);
  // Positive signed cross product in a y-up camera plane is counterclockwise.
  assert.ok(before[0] * after[1] - before[1] * after[0] > 0);
});
