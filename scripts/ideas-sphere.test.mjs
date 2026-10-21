import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createSphereLayout, projectSphereCell, rotatePoint, sphereRotation } from '../public/ideas-sphere.mjs';

const ideas = JSON.parse(readFileSync(new URL('../public/data/ideas.json', import.meta.url)));

test('Ideas uses the reviewed photography and videos across Things and Projects', () => {
  const objects = JSON.parse(readFileSync(new URL('../public/data/index.json', import.meta.url)));
  const projects = JSON.parse(readFileSync(new URL('../public/data/projects.json', import.meta.url)));
  const selection = JSON.parse(readFileSync(new URL('./ideas-selection.json', import.meta.url))).media;
  const allowed = new Map(selection.map(item => [item.src, item.kind]));
  const ids = new Set([...objects, ...projects].map(item => item.id));
  assert.equal(ideas.length, selection.length);
  const productImages = new Set(objects.flatMap(meta => {
    const project = JSON.parse(readFileSync(new URL(`../public/data/${meta.id}.json`, import.meta.url)));
    return [meta.cover.src, ...project.productImages.map(image => image.src)];
  }));
  assert.ok(ideas.every(item => !productImages.has(item.media.src)));
  assert.ok(ideas.every(item => ids.has(item.project.id) && allowed.get(item.media.src) === item.contentKind));
  assert.ok(ideas.some(item => item.project.editorial));
  assert.equal(new Set(ideas.map(item => item.media.youtubeId || item.media.src)).size, ideas.length);
  assert.equal(new Set(ideas.filter(item => item.media.youtubeId).map(item => item.media.youtubeId)).size, 8);
  assert.equal(ideas.filter(item => item.media.type === 'video').length, 10);
});

const distanceToSegment = (p, a, b) => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
};
function polygonGap(a, b) {
  // Real 3D rectangles can have overlapping screen-aligned bounding boxes.
  // Check their projected polygon edges, including corner-to-edge distances.
  let separated = false;
  for (const polygon of [a, b]) for (let i = 0; i < 4; i++) {
    const p = polygon[i], q = polygon[(i + 1) % 4];
    const axis = { x: q.y - p.y, y: p.x - q.x };
    const pa = a.map(p => p.x * axis.x + p.y * axis.y);
    const pb = b.map(p => p.x * axis.x + p.y * axis.y);
    if (Math.max(...pa) < Math.min(...pb) || Math.max(...pb) < Math.min(...pa)) separated = true;
  }
  if (!separated) return 0;
  return Math.min(
    ...a.flatMap(p => b.map((q, i) => distanceToSegment(p, q, b[(i + 1) % 4]))),
    ...b.flatMap(p => a.map((q, i) => distanceToSegment(p, q, a[(i + 1) % 4])))
  );
}

test('projected images keep their gutter through complete sphere revolutions', () => {
  for (const [width, height] of [[320,568], [390,844], [844,390], [1024,768], [1440,900], [2560,1190]]) {
    const layout = createSphereLayout(ideas.map(item => item.media), width, height);
    for (let frame = 0; frame < 160; frame++) {
      const camera = {
        x: layout.world.width * (frame / 159 * 2.1 - 1.05),
        y: layout.world.height * Math.sin(frame * .39)
      };
      const planes = layout.cells.map(cell => projectSphereCell(cell, camera, layout)).filter(plane => plane?.visible);
      assert.ok(planes.length, `empty viewport ${width}×${height}, frame ${frame}`);
      for (let i = 0; i < planes.length; i++) for (let j = i + 1; j < planes.length; j++) {
        const separation = polygonGap(planes[i].corners, planes[j].corners);
        assert.ok(separation >= layout.gap - .001, `images touch at ${width}×${height}, frame ${frame}: gap ${separation}`);
      }
    }
  }
});

test('the sphere is rigid, each fragment is reachable, and a full turn closes seamlessly', () => {
  const layout = createSphereLayout(ideas.map(item => item.media), 1440, 900);
  for (const cell of layout.cells) {
    const camera = { x: cell.baseX, y: cell.baseY };
    const centered = projectSphereCell(cell, camera, layout);
    assert.ok(centered.visible);
    assert.ok(Math.abs(centered.center[0]) < 1e-8 && Math.abs(centered.center[1]) < 1e-8);
    const rotated = rotatePoint(cell.center, sphereRotation({ x: 1257, y: -836 }, layout));
    assert.ok(Math.abs(Math.hypot(...rotated) - layout.radius) < 1e-8);
    const afterTurn = projectSphereCell(cell, { x: camera.x + layout.world.width, y: camera.y }, layout);
    centered.corners.forEach((corner, i) => {
      assert.ok(Math.hypot(corner.x - afterTurn.corners[i].x, corner.y - afterTurn.corners[i].y) < 1e-7);
    });
  }
  const rotation = sphereRotation({ x: 854, y: 378 }, layout);
  for (let i = 1; i < layout.cells.length; i++) {
    const a = layout.cells[i - 1].center, b = layout.cells[i].center;
    const ar = rotatePoint(a, rotation), br = rotatePoint(b, rotation);
    const distance = (p, q) => Math.hypot(...p.map((value, axis) => value - q[axis]));
    assert.ok(Math.abs(distance(a, b) - distance(ar, br)) < 1e-8);
  }
});

test('the mobile-safe CSS projection matches every 3D corner without a nested perspective scene', () => {
  for (const [width, height] of [[320, 568], [390, 844], [844, 390], [1440, 900]]) {
    const layout = createSphereLayout(ideas.map(item => item.media), width, height);
    for (let frame = 0; frame < 40; frame++) {
      const camera = { x: frame * 113, y: Math.sin(frame) * 600 };
      for (const cell of layout.cells) {
        const plane = projectSphereCell(cell, camera, layout);
        if (!plane) continue;
        const w = cell.width * layout.focal / layout.radius, h = cell.height * layout.focal / layout.radius;
        [[0, 0], [w, 0], [w, h], [0, h]].forEach(([x, y], i) => {
          const m = plane.matrix, divisor = m[3] * x + m[7] * y + m[15];
          assert.ok(divisor > 0);
          assert.ok(Math.abs((m[0] * x + m[4] * y + m[12]) / divisor - plane.corners[i].x) < 1e-7);
          assert.ok(Math.abs((m[1] * x + m[5] * y + m[13]) / divisor - plane.corners[i].y) < 1e-7);
          assert.equal(m[2] * x + m[6] * y + m[14], 0);
        });
      }
    }
  }
});

test('excluded hand and sale graphics are absent from Ideas and complete project content', () => {
  const exclusions = JSON.parse(readFileSync(new URL('./excluded-media.json', import.meta.url)));
  const serialized = [JSON.stringify(ideas), ...['the-father', 'sale-tote'].map(id =>
    readFileSync(new URL(`../public/data/${id}.json`, import.meta.url), 'utf8'))].join('');
  for (const src of exclusions) assert.ok(!serialized.includes(src), src);
});
