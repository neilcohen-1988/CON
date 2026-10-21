// The first title still visible below the header owns the mobile backdrop.
export function topProjectIndex(titleBottoms, activationLine) {
  if (!titleBottoms.length) return -1;
  const index = titleBottoms.findIndex(bottom => bottom > activationLine);
  return index < 0 ? titleBottoms.length - 1 : index;
}

export function installProjectNavigation({ view, list, header, show, isCurrent, host = window }) {
  const mobile = host.matchMedia('(max-width: 700px), (hover: none) and (pointer: coarse)');
  let frame = 0;
  function refresh() {
    host.cancelAnimationFrame(frame);
    frame = 0;
    if (!isCurrent()) { show(null); return; }
    if (!mobile.matches) return;
    const titles = [...list.querySelectorAll('.project-name-label')];
    const index = topProjectIndex(titles.map(title => title.getBoundingClientRect().bottom), header.getBoundingClientRect().bottom + 20);
    show(index < 0 ? null : titles[index].parentElement.dataset.project);
  }
  function schedule() { if (!frame) frame = host.requestAnimationFrame(refresh); }
  view.addEventListener('scroll', schedule, { passive: true });
  host.addEventListener('resize', schedule);
  mobile.addEventListener('change', () => { show(null); schedule(); });
  return { refresh, get scrollDriven() { return mobile.matches; } };
}
