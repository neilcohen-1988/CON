// Each page entry gets ten visible seconds, independent of asset loading and
// time spent in another tab. Any click dismisses the text without blocking
// the canvas motion or the control underneath it.
export function installSiteIntro({ node, reducedMotion, trigger }) {
  let started = false, active = false, timer = null, hideTimer = null, since = 0;
  let remaining = 10_000;

  function setActive(value) {
    active = value;
    trigger?.setAttribute('aria-expanded', String(value));
    document.body.classList.toggle('showing-about', value);
  }

  function schedule() {
    if (!active || document.hidden) return;
    since = performance.now();
    timer = setTimeout(dismiss, remaining);
  }

  function dismiss() {
    started = true;
    if (!active) return;
    setActive(false);
    clearTimeout(timer);
    timer = null;
    node.classList.add('is-leaving');
    hideTimer = setTimeout(() => { node.hidden = true; hideTimer = null; }, reducedMotion.matches ? 0 : 600);
  }

  function show({ reopen = false } = {}) {
    if (started && !reopen) return;
    started = true;
    clearTimeout(timer);
    clearTimeout(hideTimer);
    timer = hideTimer = null;
    remaining = 10_000;
    setActive(true);
    node.classList.remove('is-leaving');
    node.hidden = false;
    schedule();
  }

  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden && timer !== null) {
      remaining = Math.max(0, remaining - (performance.now() - since));
      clearTimeout(timer);
      timer = null;
    } else if (!document.hidden) schedule();
  });
  document.addEventListener('click', event => {
    if (!trigger?.contains(event.target)) dismiss();
  }, { capture: true });
  trigger?.addEventListener('click', () => active ? dismiss() : show({ reopen: true }));
  return { show, dismiss, get active() { return active; } };
}
