// A fresh gesture at the end is intentional; momentum from reaching the end is not.
const DISTANCES = {
  wheel: { reveal: 120, fill: 180 },
  touch: { reveal: 260, fill: 540 }
};

export class PullProgress {
  constructor() { this.reset(); }
  reset() {
    this.distance = 0;
    this.allowed = false;
    this.lastWheel = -Infinity;
    this.lastDelta = 0;
    this.input = 'wheel';
    this.bottomSince = null;
  }
  atBottom(value, now) {
    if (value && this.bottomSince === null) this.bottomSince = now;
    if (!value) { this.bottomSince = null; this.distance = 0; this.allowed = false; }
  }
  wheel(delta, now) {
    const fresh = now - this.lastWheel > 120;
    const renewedPush = this.bottomSince !== null && now - this.bottomSince > 80 &&
      delta >= 12 && delta > this.lastDelta * 1.4;
    this.lastWheel = now;
    this.lastDelta = Math.max(0, delta);
    this.input = 'wheel';
    if (delta <= 0 || this.bottomSince === null) {
      this.distance = 0;
      this.allowed = false;
      return false;
    }
    if (fresh) this.allowed = now - this.bottomSince > 60;
    else if (renewedPush) this.allowed = true;
    if (!this.allowed) return false;
    this.distance = Math.min(this.maximum, this.distance + Math.min(delta, 100));
    return true;
  }
  touch(delta) {
    if (this.bottomSince === null) return false;
    this.input = 'touch';
    this.distance = Math.max(0, Math.min(this.maximum, this.distance + delta * 2.8));
    return true;
  }
  // Finish bringing the whole button inside the shell before its fill begins.
  get thresholds() { return DISTANCES[this.input]; }
  get maximum() { return this.thresholds.reveal + this.thresholds.fill + 60; }
  get progress() { return Math.max(0, Math.min(1, (this.distance - this.thresholds.reveal) / this.thresholds.fill)); }
  get offset() { return Math.min(1, this.distance / this.thresholds.reveal) * 90 + this.progress * 6; }
  get armed() { return this.progress === 1; }
  release() {
    const close = this.armed;
    this.distance = 0;
    this.allowed = false;
    return close;
  }
}

export function installPullClose({ scroller, shell, button, label, close, getLabel = armed => armed ? 'Release to close' : 'Keep pulling to close' }) {
  const state = new PullProgress();
  let timer, touchY = null, touchEligible = false;
  const bottom = () => scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop <= 2;
  const update = () => {
    shell.style.setProperty('--pull-offset', `${state.offset}px`);
    shell.style.setProperty('--pull-progress', state.progress);
    shell.classList.toggle('is-pulling', state.distance > 0);
    button.classList.toggle('is-armed', state.armed);
    button.tabIndex = state.distance > 0 ? 0 : -1;
    label.textContent = getLabel(state.armed);
  };
  const reset = () => {
    clearTimeout(timer);
    touchY = null;
    touchEligible = false;
    state.reset();
    state.atBottom(bottom(), performance.now());
    update();
  };
  const release = () => {
    clearTimeout(timer);
    const shouldClose = state.release();
    if (shouldClose) close();
    else update();
  };
  scroller.addEventListener('scroll', () => {
    state.atBottom(bottom(), performance.now());
    if (!bottom()) update();
  }, { passive: true });
  scroller.addEventListener('wheel', event => {
    if (event.ctrlKey || event.metaKey || Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
        event.target.closest('video,iframe,.thumbnails')) return;
    state.atBottom(bottom(), performance.now());
    const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? scroller.clientHeight : 1;
    if (state.wheel(event.deltaY * unit, performance.now())) {
      event.preventDefault();
      update();
      clearTimeout(timer);
      if (state.armed) release();
      else timer = setTimeout(release, 260);
    } else if (!state.distance) update();
  }, { passive: false });
  scroller.addEventListener('touchstart', event => {
    clearTimeout(timer);
    state.atBottom(bottom(), performance.now());
    touchEligible = bottom() && event.touches.length === 1 && !event.target.closest('video,iframe,.thumbnails');
    touchY = touchEligible ? event.touches[0].clientY : null;
  }, { passive: true });
  scroller.addEventListener('touchmove', event => {
    if (!touchEligible || touchY === null || event.touches.length !== 1) return;
    const nextY = event.touches[0].clientY;
    const delta = touchY - nextY;
    touchY = nextY;
    if (delta > 0 || state.distance) {
      event.preventDefault();
      state.touch(delta);
      update();
    }
  }, { passive: false });
  scroller.addEventListener('touchend', () => {
    touchEligible = false;
    touchY = null;
    release();
  }, { passive: true });
  scroller.addEventListener('touchcancel', reset, { passive: true });
  button.addEventListener('click', close);
  return { reset, refresh: update };
}
