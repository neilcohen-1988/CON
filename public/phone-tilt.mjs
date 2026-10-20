const radians = Math.PI / 180;
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);

// DeviceOrientation uses Z-X-Y rotations. Compare screen normals in the
// calibrated phone frame so upright grips and Euler-angle wrap stay continuous.
function orientationFrame({ alpha, beta, gamma }) {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return null;
  const a = (Number.isFinite(alpha) ? alpha : 0) * radians;
  const b = beta * radians, g = gamma * radians;
  const ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const cg = Math.cos(g), sg = Math.sin(g);
  return {
    x: [ca * cg - sa * sb * sg, sa * cg + ca * sb * sg, -cb * sg],
    y: [-sa * cb, ca * cb, sb],
    z: [ca * sg + sa * sb * cg, sa * sg - ca * sb * cg, cb * cg]
  };
}

export class TiltSignal {
  constructor() { this.reset(); }
  reset() { this.origin = null; this.angle = null; }
  sample(reading, angle = 0) {
    const current = orientationFrame(reading);
    if (!current) return null;
    if (!this.origin || this.angle !== angle) {
      this.origin = current;
      this.angle = angle;
      return { x: 0, y: 0 };
    }
    const forward = dot(this.origin.z, current.z);
    const horizontal = Math.atan2(dot(this.origin.x, current.z), forward) / radians;
    const vertical = -Math.atan2(dot(this.origin.y, current.z), forward) / radians;
    const rotation = angle * radians;
    const x = horizontal * Math.cos(rotation) + vertical * Math.sin(rotation);
    const y = vertical * Math.cos(rotation) - horizontal * Math.sin(rotation);
    const distance = Math.hypot(x, y);
    // Ignore hand tremor, then progressively approach full steering at 18°.
    const strength = Math.min(1, Math.max(0, (distance - 1.5) / 16.5));
    return distance ? { x: x / distance * strength, y: y / distance * strength } : { x: 0, y: 0 };
  }
}

export function installPhoneTilt({ button, status, t, onActivate = () => {}, host = window }) {
  const signal = new TiltSignal();
  const mobile = host.matchMedia('(pointer: coarse), (max-width: 700px)');
  const sensor = host.DeviceOrientationEvent;
  const supported = Boolean(host.isSecureContext && sensor);
  let state = 'off', vector = { x: 0, y: 0 }, generation = 0;
  let sensorTimer, messageTimer, messageKey = '';
  const screenAngle = () => host.screen?.orientation?.angle ?? host.orientation ?? 0;
  const refresh = () => {
    button.hidden = !mobile.matches || !supported;
    button.disabled = state === 'permission' || state === 'waiting';
    button.setAttribute('aria-pressed', String(state === 'on'));
    button.setAttribute('aria-label', t(state === 'on' ? 'tiltDisable' : 'tiltEnable'));
    button.querySelector('span').textContent = t('tilt');
    status.textContent = messageKey ? t(messageKey) : '';
    status.hidden = !messageKey || button.hidden;
  };
  const message = (key, duration = 0) => {
    host.clearTimeout(messageTimer);
    messageKey = key;
    refresh();
    if (duration) messageTimer = host.setTimeout(() => { messageKey = ''; refresh(); }, duration);
  };
  const recenter = () => { signal.reset(); vector = { x: 0, y: 0 }; };
  const disable = (notice = '') => {
    generation++;
    state = 'off';
    host.clearTimeout(sensorTimer);
    host.removeEventListener('deviceorientation', read);
    recenter();
    message(notice, notice ? 5000 : 0);
  };
  function read(event) {
    if (host.document.hidden || !['waiting', 'on'].includes(state)) return;
    const next = signal.sample(event, screenAngle());
    vector = next || { x: 0, y: 0 };
    if (!next || state === 'on') return;
    host.clearTimeout(sensorTimer);
    state = 'on';
    onActivate();
    message('tiltReady', 3500);
  }
  async function enable() {
    if (!supported || !mobile.matches || state !== 'off') return;
    const request = ++generation;
    state = 'permission';
    message('tiltWaiting');
    try {
      // This call stays directly in the tap handler for Safari's activation rule.
      if (typeof sensor.requestPermission === 'function') {
        const permission = await sensor.requestPermission();
        if (request !== generation) return;
        if (permission !== 'granted') { disable('tiltDenied'); return; }
      }
      if (request !== generation || host.document.hidden) { disable(); return; }
      state = 'waiting';
      recenter();
      host.addEventListener('deviceorientation', read, { passive: true });
      sensorTimer = host.setTimeout(() => disable('tiltUnavailable'), 4000);
      refresh();
    } catch {
      if (request === generation) disable('tiltDenied');
    }
  }
  button.addEventListener('click', () => state === 'on' ? disable() : enable());
  host.screen?.orientation?.addEventListener('change', recenter);
  host.addEventListener('orientationchange', recenter);
  host.document.addEventListener('visibilitychange', () => {
    recenter();
    if (host.document.hidden && ['waiting', 'permission'].includes(state)) disable();
  });
  mobile.addEventListener('change', () => { if (!mobile.matches) disable(); refresh(); });
  refresh();
  return {
    get active() { return state === 'on' && !host.document.hidden && mobile.matches; },
    get vector() { return vector; },
    enable, disable, recenter, refresh
  };
}
