import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { area, fillRegion, initGeom, intersection } from './geom.mjs';
import { makeRenderer } from './render.mjs';

await initGeom();
const src = fileURLToPath(new URL('../../../outline/icons/', import.meta.url));
const render = makeRenderer(src);

function hasInk(region, [x, y]) {
  const probe = fillRegion([
    {
      closed: true,
      pts: [
        [x - 0.01, y - 0.01],
        [x + 0.01, y - 0.01],
        [x + 0.01, y + 0.01],
        [x - 0.01, y + 0.01],
      ],
    },
  ]);
  return area(intersection(region, probe)) > 0;
}

test('phone-off uses the opposite diagonal and retains a gap on only one side', () => {
  const phone = render('phone');
  const off = render('phone-off');
  assert.ok(hasInk(off, [22, 2]));
  assert.ok(hasInk(off, [2, 22]));
  assert.ok(hasInk(off, [12, 12]));
  assert.ok(hasInk(phone, [6.5, 14.5]));
  assert.ok(!hasInk(off, [6.5, 14.5]));
  assert.ok(hasInk(phone, [8.5, 18.5]));
  assert.ok(hasInk(off, [8.5, 18.5]));
});

test('automatic and explicitly drawn off icons retain the standard diagonal', () => {
  for (const name of ['camera-off', 'alarm-clock-off']) {
    const off = render(name);
    assert.ok(hasInk(off, [2, 2]), name);
    assert.ok(hasInk(off, [22, 22]), name);
    assert.ok(!hasInk(off, [22, 2]), name);
    assert.ok(!hasInk(off, [2, 22]), name);
  }
});

test('the reversed slash follows the icon transform without mirroring the receiver', () => {
  const transform = ([x, y]) => [x * 0.5 + 3, y * 0.5 + 6];
  const off = render('phone-off', transform);
  assert.ok(hasInk(off, [14, 7]));
  assert.ok(hasInk(off, [4, 17]));
  assert.ok(hasInk(off, [4, 8]));
  assert.ok(!hasInk(off, [20, 7]));
});
