// A rigid 3D sphere viewed from its center, as in the personal site's Vault.
// Tangent planes have fixed positions, orientations and sizes. Only the
// camera rotates. Each plane is projected directly into the viewport, avoiding
// nested preserve-3d layers (and their mobile clipping/hit-testing differences).
const TAU = Math.PI * 2;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createSphereLayout(media, width, height) {
  const small = width < 700;
  // A longer lens and a larger sphere make changes in perspective gradual.
  // Radius alone would cancel out in a camera placed at the sphere's center.
  const fov = (small ? 42 : 38) * Math.PI / 180;
  const focal = Math.min(height, small ? width * 1.65 : height) / (2 * Math.tan(fov / 2));
  const radius = 3000;
  const gap = small || height < 500 ? 22 : 36;
  // Equal-area placement covers the whole sphere, including both poles. Every
  // fragment is unique, and a full revolution returns to the same arrangement.
  const points = media.map((_, i) => {
    const latitude = Math.asin(1 - 2 * (i + .5) / media.length);
    const longitude = ((i * GOLDEN_ANGLE + Math.PI) % TAU) - Math.PI;
    const sl = Math.sin(longitude), cl = Math.cos(longitude);
    const sp = Math.sin(latitude), cp = Math.cos(latitude);
    return { longitude, latitude, normal: [sl * cp, sp, -cl * cp],
      right: [cl, 0, sl], down: [-sl * sp, cp, cl * sp] };
  });
  const cells = points.map((point, index) => {
    const nearest = Math.min(...points.filter((_, i) => i !== index)
      .map(other => Math.acos(clamp(dot(point.normal, other.normal), -1, 1))));
    // Each rectangle is contained by its own disjoint cone from the camera.
    // Rigid rotation preserves these gaps, without shrinking or moving images
    // independently when the pointer travels toward the sides.
    const angularRadius = Math.min(.24, nearest * .42, Math.max(.01, (nearest - gap / focal) / 2));
    const ratio = media[index].width / media[index].height;
    const diagonal = 2 * radius * Math.tan(angularRadius);
    const h = diagonal / Math.sqrt(ratio * ratio + 1);
    const w = h * ratio;
    const center = point.normal.map(value => value * radius);
    return { ...point, center, angularRadius, width: w, height: h,
      baseX: point.longitude * focal, baseY: point.latitude * focal };
  });
  return { width, height, focal, radius, fov, cells,
    gap, world: { width: TAU * focal, height: TAU * focal } };
}

export function sphereRotation(camera, layout) {
  return { pitch: -camera.y / layout.focal, yaw: camera.x / layout.focal };
}

export function rotatePoint(point, { pitch, yaw }) {
  const cy = Math.cos(yaw), sy = Math.sin(yaw), cx = Math.cos(pitch), sx = Math.sin(pitch);
  const x = cy * point[0] + sy * point[2];
  const z = -sy * point[0] + cy * point[2];
  return [x, cx * point[1] - sx * z, sx * point[1] + cx * z];
}

export function projectSphereCell(cell, camera, layout) {
  const rotation = sphereRotation(camera, layout);
  const center = rotatePoint(cell.center, rotation);
  if (center[2] >= 0) return null;
  // Cull whole angular caps before projecting corners. Only the small visible
  // part of the much denser sphere needs detailed geometry on each frame.
  const halfDiagonal = Math.hypot(cell.width, cell.height) / 2;
  const horizontal = (layout.width / 2 + 100) / layout.focal;
  const vertical = (layout.height / 2 + 100) / layout.focal;
  if (Math.abs(center[0]) > -center[2] * horizontal + halfDiagonal * Math.hypot(1, horizontal)
    || Math.abs(center[1]) > -center[2] * vertical + halfDiagonal * Math.hypot(1, vertical)) return null;
  const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => {
    const world = cell.center.map((value, i) => value + x * cell.right[i] * cell.width / 2 + y * cell.down[i] * cell.height / 2);
    const position = rotatePoint(world, rotation);
    return { position, x: layout.width / 2 - layout.focal * position[0] / position[2],
      y: layout.height / 2 - layout.focal * position[1] / position[2] };
  });
  if (corners.some(corner => corner.position[2] >= -.01)) return null;
  const bounds = { left: Math.min(...corners.map(p => p.x)), right: Math.max(...corners.map(p => p.x)),
    top: Math.min(...corners.map(p => p.y)), bottom: Math.max(...corners.map(p => p.y)) };
  if (bounds.right < -100 || bounds.left > layout.width + 100 || bounds.bottom < -100 || bounds.top > layout.height + 100) return null;
  // A perspective homography, not a displacement: all four corners retain the
  // exact rigid-sphere projection. Normalize the local plane into screen-sized
  // pixels so phones don't allocate 3000-unit GPU surfaces for each photograph.
  const right = rotatePoint(cell.right, rotation), down = rotatePoint(cell.down, rotation);
  const origin = corners[0].position;
  const cx = layout.width / 2, cy = layout.height / 2;
  const column = vector => [vector[0] - cx * vector[2] / layout.focal,
    vector[1] - cy * vector[2] / layout.focal, 0, -vector[2] / layout.focal];
  const matrix = [...column(right), ...column(down), 0, 0, 1, 0,
    (layout.focal * origin[0] - cx * origin[2]) / layout.radius,
    (layout.focal * origin[1] - cy * origin[2]) / layout.radius, 0, -origin[2] / layout.radius];
  return { center, corners, bounds, opacity: .94, matrix,
    transform: `matrix3d(${matrix.join(',')})`,
    visible: bounds.right > 0 && bounds.left < layout.width && bounds.bottom > 0 && bounds.top < layout.height };
}
