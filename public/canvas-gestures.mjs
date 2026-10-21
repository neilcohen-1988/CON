// Touch activation belongs to the gesture, not to the compatibility click that
// browsers retarget after pointer capture. A little finger jitter is still a tap.
export function installCanvasGestures({ surface, onPan, onTap, onContact, host = window }) {
  let contact = null;
  let suppressClickUntil = 0;
  const pointers = new Set();
  const now = () => host.performance.now();

  function finish() {
    const previous = contact;
    contact = null;
    if (!previous) return;
    if (surface.hasPointerCapture(previous.id)) surface.releasePointerCapture(previous.id);
    onContact(false, previous.type);
  }

  function cancel() {
    if (contact) suppressClickUntil = now() + 800;
    finish();
    pointers.clear();
  }

  surface.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    pointers.add(event.pointerId);
    if (pointers.size > 1 || event.isPrimary === false) {
      suppressClickUntil = now() + 800;
      finish();
      return;
    }
    suppressClickUntil = 0;
    const target = event.target.closest('.tile');
    // Desktop tile clicks keep their existing shared-image transition.
    if (event.pointerType === 'mouse' && target) return;
    contact = { id: event.pointerId, type: event.pointerType, target,
      startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY,
      moved: false, slop: event.pointerType === 'mouse' ? 6 : 12 };
    surface.setPointerCapture(event.pointerId);
    onContact(true, event.pointerType);
  });

  surface.addEventListener('pointermove', event => {
    if (!contact || contact.id !== event.pointerId) return;
    if (Math.hypot(event.clientX - contact.startX, event.clientY - contact.startY) > contact.slop) contact.moved = true;
    if (!contact.moved) return;
    onPan(event.clientX - contact.x, event.clientY - contact.y);
    contact.x = event.clientX;
    contact.y = event.clientY;
  });

  surface.addEventListener('pointerup', event => {
    pointers.delete(event.pointerId);
    if (!contact || contact.id !== event.pointerId) return;
    const previous = contact;
    // Some browsers coalesce the last movement into pointerup.
    const tapped = !previous.moved && Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) <= previous.slop;
    suppressClickUntil = now() + 800;
    finish();
    if (tapped && previous.target && previous.type !== 'mouse') onTap(previous.target);
  });

  surface.addEventListener('pointercancel', event => {
    pointers.delete(event.pointerId);
    if (contact?.id === event.pointerId) { suppressClickUntil = now() + 800; finish(); }
  });
  surface.addEventListener('lostpointercapture', event => {
    if (contact?.id === event.pointerId) cancel();
  });
  surface.addEventListener('click', event => {
    // Keyboard/assistive activation remains a normal button click.
    if (event.detail === 0 || now() >= suppressClickUntil) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, { capture: true });
  host.addEventListener('blur', cancel);
  host.document.addEventListener('visibilitychange', () => { if (host.document.hidden) cancel(); });
  return { cancel };
}
