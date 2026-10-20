import { installPullClose } from './pull-close.mjs?v=trackpad-close-3';
import { createSphereLayout, projectSphereCell, sphereRotation } from './ideas-sphere.mjs';
import { installJerusalemStatus } from './jerusalem.mjs?v=clock-dial-2';
import { installSiteIntro } from './site-intro.mjs?v=about-1';
import { language, direction, t, setLanguage, configureContent, localizeProject } from './i18n.mjs?v=buy-bye-1';

const $ = (selector) => document.querySelector(selector);
const field = $('#field');
const sphereScene = document.createElement('div');
sphereScene.className = 'sphere-scene';
const canvas = $('#canvas');
const navigation = $('.views');
const languageSwitch = $('.language-switch');
const gridZoom = $('.grid-zoom');
const jerusalemStatus = installJerusalemStatus({ root: $('.jerusalem-status'), t });
const MIN_ZOOM = .8, MAX_ZOOM = 1.3;
const DEFAULT_ZOOM = .8;
let gridScale = DEFAULT_ZOOM, gridScaleTarget = DEFAULT_ZOOM, zoomAnimation = null;
const dialog = $('#project');
const shell = $('.project-shell');
const hero = $('#project-hero');
const heroFrame = $('.project-hero-frame');
const projectIntro = $('.project-intro');
const scroller = $('#project-scroll');
const projectCursor = $('#project-cursor');
const cursorLabel = $('#cursor-label');
const cursorTitle = $('#cursor-title');
const cursorBubble = $('.cursor-bubble');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const coarsePointer = matchMedia('(pointer: coarse)');
const siteIntro = installSiteIntro({ node: $('#site-intro'), reducedMotion, trigger: $('#about') });
const cache = new Map();
const canvasSets = new Map();
const projectFilms = new Map();
const projectFilmObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (projectFilms.has(entry.target)) projectFilms.set(entry.target, entry.isIntersecting && entry.intersectionRatio >= .05);
  });
  syncProjectMedia();
}, { root: scroller, threshold: [0, .05] });
let tiles = [];
const pad = (value) => String(value).padStart(2, '0');
const wrap = (value, size) => ((value + size / 2) % size + size) % size - size / 2;
let projects = [];
let presentations = [];
let ideas = [];
let mode = 'things';
let selected = null;
let activeIdea = null;
let returnImage = false;
let sourceTile = null;
let photoIndex = 0;
let requestId = 0;
let closing = false;
let animations = [];
let ghost;
let paused = reducedMotion.matches;
let pointer = { x: 0, y: 0, clientX: 0, clientY: 0, active: false };
let cursorProject = null;
let cursorSize = { width: 0, height: 0 };
let camera = { x: 740, y: 520 };
let velocity = { x: 0, y: 0 };
let viewport = { width: innerWidth, height: innerHeight };
let world = { width: 2600, height: 2200 };
let sphereLayout;
let dragging = null;
let dragged = false;
let keyboard = false;
let frame = 0;
let lastTime = 0;
let viewRequest = 0;
let viewAnimations = [];
const expandedCovers = {
  'broken-crown-h823x-e6wrc': {
    src: '/media/retouched/menora-left-shadow-wide.webp',
    thumb: '/media/retouched/menora-left-shadow-wide-thumb.webp',
    width: 1402, height: 1122, displayScale: .93,
    dialogCrop: { ratio: .75, position: '95.3% 50%' }
  },
  'broken-crown-h823x-3bad3-d3a8m-p6bse': {
    src: '/media/retouched/containers-left-shadow-wide.webp',
    thumb: '/media/retouched/containers-left-shadow-wide-thumb.webp',
    width: 1402, height: 1122, displayScale: .91,
    dialogCrop: { ratio: .75, position: '97.6% 50%' }
  }
};

function coverFor(project) {
  return expandedCovers[project.id] ? { ...project.cover, ...expandedCovers[project.id] } : project.cover;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function loadProject(project) {
  const key = `${project.editorial ? 'projects/' : ''}${project.id}`;
  if (!cache.has(key)) {
    const pending = fetch(`/data/${key}.json`).then(response => {
      if (!response.ok) throw new Error('Project unavailable');
      return response.json();
    }).then(item => {
      const cover = expandedCovers[item.id];
      if (cover) {
        item.productImages[0] = {
          ...item.productImages[0], originalSrc: item.productImages[0].src, ...cover
        };
      }
      return item;
    }).catch(error => { cache.delete(key); throw error; });
    cache.set(key, pending);
  }
  return cache.get(key);
}

function layout() {
  viewport = { width: innerWidth, height: innerHeight };
  if (mode === 'ideas') {
    const previousFocal = sphereLayout?.focal;
    sphereLayout = createSphereLayout(tiles.map(tile => tile.media), viewport.width, viewport.height);
    if (previousFocal) {
      camera.x *= sphereLayout.focal / previousFocal;
      camera.y *= sphereLayout.focal / previousFocal;
    }
    field.style.perspective = `${sphereLayout.focal}px`;
    world = sphereLayout.world;
    tiles.forEach((tile, index) => {
      tile.sphere = sphereLayout.cells[index];
      tile.x = tile.sphere.baseX;
      tile.y = tile.sphere.baseY;
      tile.width = tile.sphere.width;
      tile.height = tile.sphere.height;
      tile.node.style.width = `${tile.width}px`;
      tile.node.style.height = `${tile.height}px`;
      tile.node.style.transform = tile.sphere.transform;
    });
    render();
    return;
  }
  const small = viewport.width < 700;
  const rows = Math.max(5, Math.ceil(tiles.length / 6));
  tiles.forEach(tile => {
    const ratio = tile.media.width / tile.media.height;
    const baseWidth = small ? 215 : 315;
    const expansion = !tile.fragment && expandedCovers[tile.project.id];
    // Expanded photographs add floor space, while the physical product retains
    // its former display scale. Reserve that entire width in the layout.
    tile.height = expansion
      ? baseWidth * tile.project.cover.height / tile.project.cover.width * expansion.displayScale
      : baseWidth / ratio;
    tile.width = expansion ? tile.height * ratio : baseWidth;
    tile.node.style.width = `${tile.width}px`;
  });
  const maxWidth = Math.max(...tiles.map(tile => tile.width));
  const maxHeight = Math.max(...tiles.map(tile => tile.height));
  const gutter = small ? 48 : 72;
  // Equal cell centers keep every row/column aligned, including the two wider
  // photographs. Reserve enough world space that wrapping stays offscreen even
  // at the smallest zoom setting.
  world = {
    width: Math.max((maxWidth + gutter) * 6, viewport.width / MIN_ZOOM + maxWidth + gutter),
    height: Math.max((maxHeight + gutter) * rows, viewport.height / MIN_ZOOM + maxHeight + gutter)
  };
  tiles.forEach((tile, index) => {
    tile.x = (index % 6 + .5) * world.width / 6;
    tile.y = (Math.floor(index / 6) + .5) * world.height / rows;
  });
  const set = canvasSets.get('things');
  if (!set.positioned) {
    camera = { x: tiles[0].x, y: tiles[0].y };
    set.positioned = true;
  }
  render();
}

function render() {
  if (mode === 'ideas') {
    const { pitch, yaw } = sphereRotation(camera, sphereLayout);
    sphereScene.style.transform = `translateZ(${sphereLayout.focal}px) rotateX(${pitch}rad) rotateY(${yaw}rad)`;
    for (const tile of tiles) {
      const plane = projectSphereCell(tile.sphere, camera, sphereLayout);
      tile.node.style.opacity = plane ? plane.opacity : 0;
      tile.node.style.pointerEvents = plane ? '' : 'none';
      tile.visible = plane?.visible || false;
      if (plane && !tile.loaded) {
        tile.image.src = tile.previewSrc;
        tile.loaded = true;
      }
      syncPreview(tile);
    }
    return;
  }
  for (const tile of tiles) {
    const width = tile.width * gridScale, height = tile.height * gridScale;
    const x = wrap(tile.x - camera.x, world.width) * gridScale + viewport.width / 2 - width / 2;
    const y = wrap(tile.y - camera.y, world.height) * gridScale + viewport.height / 2 - height / 2;
    tile.node.style.transform = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${gridScale})`;
    // Request previews only as they approach the viewport.
    if (!tile.loaded && x + width > -350 && x < viewport.width + 350 && y + height > -350 && y < viewport.height + 350) {
      tile.image.src = tile.previewSrc;
      tile.loaded = true;
    }
    tile.visible = x + width > 0 && x < viewport.width && y + height > 0 && y < viewport.height;
    syncPreview(tile);
  }
}

function syncPreview(tile) {
  if (!tile.video) return;
  const play = mode === 'ideas' && tile.visible && !paused && !reducedMotion.matches && !dialog.open && !document.hidden;
  if (play && !tile.playing) {
    if (!tile.video.src) tile.video.src = tile.media.preview;
    tile.playing = true;
    tile.video.play().catch(() => { tile.playing = false; });
  } else if (!play && tile.playing) {
    tile.video.pause();
    tile.playing = false;
  }
}

function syncPreviews() {
  for (const set of canvasSets.values()) set.tiles.forEach(syncPreview);
}

function hideProjectCursor() {
  projectCursor.classList.remove('is-visible', 'is-hovering');
  cursorLabel.classList.remove('is-visible', 'has-title');
  document.body.classList.remove('has-project-cursor');
  cursorProject = null;
}

function updateProjectCursor() {
  if (!pointer.active || coarsePointer.matches || keyboard) {
    hideProjectCursor();
    return;
  }
  // Items keep moving beneath a stationary pointer, so hover must follow the
  // rendered hit target as well as physical mouse movement.
  const target = document.elementFromPoint(pointer.clientX, pointer.clientY);
  if (!target) { hideProjectCursor(); return; }
  // A modal is in the browser's top layer. Move the cursor into that layer too,
  // outside the animated/scrolling shell so it stays aligned with the viewport.
  const cursorHost = dialog.open ? dialog : document.body;
  if (projectCursor.parentNode !== cursorHost) cursorHost.append(projectCursor);
  if (cursorLabel.parentNode !== cursorHost) cursorHost.append(cursorLabel);
  const bounds = shell.getBoundingClientRect();
  const onBackdrop = dialog.open && (pointer.clientX < bounds.left + 20 || pointer.clientX > bounds.right - 20 ||
    pointer.clientY < bounds.top + 20 || pointer.clientY > bounds.bottom - 20);
  projectCursor.classList.toggle('is-on-backdrop', onBackdrop);
  const tile = !dialog.open && !dragging ? target.closest('.tile') : null;
  cursorLabel.classList.toggle('has-title', Boolean(tile));
  projectCursor.classList.toggle('is-hovering', Boolean(target.closest('button:not(:disabled), a, video')));
  const overDarkMedia = dialog.open && target.closest('#idea-media .idea-matte');
  const darkView = !dialog.open && (mode === 'ideas' || (mode === 'projects' && document.body.classList.contains('has-project-preview')));
  cursorLabel.classList.toggle('is-light', Boolean(overDarkMedia || darkView));
  if (tile && cursorProject !== tile.dataset.project) {
    cursorProject = tile.dataset.project;
    cursorTitle.textContent = tile.dataset.cursorTitle;
    cursorSize = { width: cursorBubble.offsetWidth, height: cursorBubble.offsetHeight };
  }
  if (!tile) cursorProject = null;
  const labelX = Math.max(12 - pointer.clientX, Math.min(24, viewport.width - pointer.clientX - cursorSize.width - 12));
  const labelY = Math.max(12 - pointer.clientY, Math.min(18, viewport.height - pointer.clientY - cursorSize.height - 12));
  projectCursor.style.transform = `translate3d(${pointer.clientX}px,${pointer.clientY}px,0)`;
  cursorLabel.style.transform = projectCursor.style.transform;
  cursorLabel.style.setProperty('--label-x', `${labelX}px`);
  cursorLabel.style.setProperty('--label-y', `${labelY}px`);
  projectCursor.classList.add('is-visible');
  cursorLabel.classList.add('is-visible');
  document.body.classList.add('has-project-cursor');
}

function setGridScale(value) {
  if (mode !== 'things' || dialog.open) return;
  siteIntro.dismiss();
  gridScaleTarget = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(value * 100) / 100));
  $('#grid-zoom-out').disabled = gridScaleTarget <= MIN_ZOOM;
  $('#grid-zoom-in').disabled = gridScaleTarget >= MAX_ZOOM;
  $('#announcement').textContent = t('zoomChanged', { percent: Math.round(gridScaleTarget * 100) });
  zoomAnimation = { from: gridScale, start: performance.now() };
  if (reducedMotion.matches) {
    gridScale = gridScaleTarget;
    zoomAnimation = null;
    render();
  }
}

function tick(time) {
  const delta = Math.min((time - (lastTime || time)) / 16.667, 2);
  lastTime = time;
  const overMenu = navigation.matches(':hover') || languageSwitch.matches(':hover') || $('.jerusalem-weather').matches(':hover') || (mode === 'things' && gridZoom.matches(':hover'));
  const blocked = overMenu || dialog.open || mode === 'projects' || paused || !pointer.active || dragging || keyboard;
  const distance = Math.hypot(pointer.x, pointer.y);
  const radius = Math.min(distance, 1);
  // Tile hover keeps moving; navigation hover eases the existing velocity to rest.
  // Normalize the vector so diagonals do not accelerate abruptly.
  const speed = blocked ? 0 : (mode === 'ideas' ? 10.5 : 14) * (.18 * radius + .82 * radius * radius);
  const targetX = distance ? pointer.x / distance * speed : 0;
  const targetY = distance ? pointer.y / distance * speed : 0;
  const smoothing = mode === 'ideas'
    ? 1 - Math.exp(-delta * 16.667 / 320)
    : 1 - Math.pow(overMenu ? .86 : .90, delta);
  velocity.x += (targetX - velocity.x) * smoothing;
  velocity.y += (targetY - velocity.y) * smoothing;
  if (dialog.open || dragging) velocity = { x: 0, y: 0 };
  let changed = false;
  if (mode === 'things' && zoomAnimation) {
    const progress = Math.max(0, Math.min(1, (time - zoomAnimation.start) / 280));
    gridScale = zoomAnimation.from + (gridScaleTarget - zoomAnimation.from) * (1 - (1 - progress) ** 3);
    if (progress === 1) zoomAnimation = null;
    changed = true;
  }
  if (Math.abs(velocity.x) + Math.abs(velocity.y) > .005) {
    const scale = mode === 'things' ? gridScale : 1;
    camera.x = (camera.x + velocity.x * delta / scale) % world.width;
    camera.y = (camera.y + velocity.y * delta / scale) % world.height;
    changed = true;
  }
  if (changed) render();
  updateProjectCursor();
  frame = requestAnimationFrame(tick);
}

function makeTiles(view) {
  // Keep a stable object order so returning to the grid preserves its arrangement.
  // The repeating 6 × 5 grid needs 30 occupied cells for 29 originals. Repeat
  // SIGNETURE from the opposite side of the grid to keep the last cell filled.
  const order = [0, 19, 3, 26, 1, 22, 15, 10, 24, 12, 16, 7, 21, 27, 2, 18, 9, 4, 23, 14, 20, 8, 28, 13, 6, 25, 17, 11, 5, 2];
  const entries = view === 'things' ? order.map(index => ({ project: projects[index] })) : ideas.map(fragment => ({ project: fragment.project, fragment }));
  const result = [];
  entries.forEach(({ project, fragment }) => {
    const media = fragment?.media || coverFor(project);
    const previewSrc = /\.gif(?:$|\?)/i.test(media.src)
      ? media.src
      : media.thumb || media.poster || media.src;
    const node = element('button', fragment ? 'tile idea-tile' : 'tile');
    if (fragment?.matte === 'key') node.classList.add('matte-corrected');
    if (fragment?.matte === 'frame') node.classList.add('photo-matte');
    node.dataset.project = fragment?.id || project.id;
    const copy = localizeProject(project);
    node.dataset.cursorTitle = copy.displayTitle;
    const isVideo = media.type === 'video' || media.youtubeId;
    node.setAttribute('aria-label', t('tile', { title: copy.displayTitle, type: fragment ? t(isVideo ? 'video' : 'sourceImage') : copy.objectType, kind: t(fragment ? 'openIdea' : 'openProject') }));
    const image = element('img', 'tile-image');
    image.alt = '';
    image.width = media.width;
    image.height = media.height;
    image.draggable = false;
    image.decoding = 'async';
    const label = element('span', 'tile-label');
    label.append(element('span', '', copy.displayTitle));
    node.append(image);
    let video;
    if (fragment && media.preview) {
      video = element('video', 'idea-motion');
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = 'none';
      video.setAttribute('aria-hidden', 'true');
      node.append(video);
    }
    if (fragment && isVideo) {
      const badge = element('span', 'idea-kind', '▶');
      badge.setAttribute('aria-hidden', 'true');
      node.append(badge);
    }
    node.append(label);
    const tile = { node, image, project, media, previewSrc, fragment, video, loaded: false, playing: false };
    node.addEventListener('click', () => { if (!dragged) fragment ? openIdea(fragment, node) : openProject(project, node); });
    node.addEventListener('pointerdown', event => {
      // Preserve the click target while the canvas continues to travel.
      if (event.pointerType === 'mouse' && event.button === 0) node.setPointerCapture(event.pointerId);
    });
    node.addEventListener('pointerenter', () => { loadProject(project).catch(() => {}); });
    node.addEventListener('focus', () => {
      if (!keyboard) return;
      const rect = node.getBoundingClientRect();
      if (rect.top < 80 || rect.bottom > viewport.height - 90 || rect.left < 20 || rect.right > viewport.width - 20) {
        camera.x = tile.x;
        camera.y = tile.y;
        render();
      }
      if (!tile.loaded) { image.src = previewSrc; tile.loaded = true; }
    });
    result.push(tile);
  });
  canvasSets.set(view, { tiles: result, camera: view === 'ideas' ? { x: 0, y: 0 }
    : innerWidth < 700 ? { x: 155, y: 240 } : { x: 740, y: 520 } });
}

function makeProjects() {
  const list = $('#project-list');
  const backdrops = $('#project-backdrops');
  const show = (id) => {
    document.body.classList.toggle('has-project-preview', Boolean(id));
    list.classList.toggle('has-preview', Boolean(id));
    list.querySelectorAll('button').forEach(node => node.classList.toggle('is-active', node.dataset.project === id));
    backdrops.querySelectorAll('img').forEach(image => {
      const active = image.dataset.project === id;
      if (active && !image.src) image.src = image.dataset.src;
      image.classList.toggle('is-active', active);
    });
  };
  presentations.forEach(project => {
    const background = element('img', 'project-backdrop');
    background.dataset.project = project.id;
    background.dataset.src = project.cover.src;
    background.alt = '';
    background.decoding = 'async';
    backdrops.append(background);
    const button = element('button', 'project-name', localizeProject(project).displayTitle);
    button.dataset.project = project.id;
    button.addEventListener('pointerenter', () => { show(project.id); loadProject(project).catch(() => {}); });
    button.addEventListener('pointerleave', () => { if (!keyboard) show(null); });
    button.addEventListener('focus', () => show(project.id));
    button.addEventListener('blur', () => show(null));
    button.addEventListener('click', () => openProject(project, button));
    list.append(button);
  });
}

async function setView(next) {
  if (!canvasSets.size || (next === mode && document.body.classList.contains('ready') && !viewAnimations.length)) return;
  const request = ++viewRequest;
  const previous = mode === 'projects' ? $('#projects-view') : canvas;
  const opacity = getComputedStyle(previous).opacity;
  viewAnimations.forEach(animation => animation.cancel());
  viewAnimations = [];
  if (!reducedMotion.matches && document.body.classList.contains('ready')) {
    document.body.classList.add('is-switching-view');
    hideProjectCursor();
    const fade = previous.animate([{ opacity }, { opacity: 0 }], {
      duration: 180, easing: 'ease-out', fill: 'forwards'
    });
    viewAnimations.push(fade);
    try { await fade.finished; } catch { return; }
    if (request !== viewRequest) return;
  }
  commitView(next);
  viewAnimations.forEach(animation => animation.cancel());
  viewAnimations = [];
  if (!reducedMotion.matches && document.body.classList.contains('ready')) {
    const current = mode === 'projects' ? $('#projects-view') : canvas;
    const fade = current.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 360, easing: 'cubic-bezier(.2,0,0,1)', fill: 'forwards'
    });
    viewAnimations.push(fade);
    try { await fade.finished; } catch { return; }
    if (request !== viewRequest) return;
    fade.cancel();
    viewAnimations = [];
  }
  document.body.classList.remove('is-switching-view');
}

function commitView(next) {
  if (!canvasSets.size) return;
  if (mode !== 'projects') canvasSets.get(mode).camera = { ...camera };
  mode = next;
  gridZoom.hidden = mode !== 'things';
  if (mode !== 'things' && zoomAnimation) {
    gridScale = gridScaleTarget;
    zoomAnimation = null;
  }
  document.body.dataset.mode = mode;
  $('meta[name="theme-color"]').content = mode === 'ideas' ? '#000000' : mode === 'things' ? '#f7f5f6' : '#ffffff';
  canvas.hidden = mode === 'projects';
  field.classList.toggle('is-sphere', mode === 'ideas');
  if (mode !== 'ideas') field.style.perspective = '';
  $('#projects-view').hidden = mode !== 'projects';
  velocity = { x: 0, y: 0 };
  dragging = null;
  hideProjectCursor();
  if (mode !== 'projects') {
    const set = canvasSets.get(mode);
    tiles = set.tiles;
    camera = { ...set.camera };
    if (mode === 'ideas') {
      sphereScene.replaceChildren(...tiles.map(tile => tile.node));
      field.replaceChildren(sphereScene);
    } else {
      field.replaceChildren(...tiles.map(tile => tile.node));
    }
    layout();
  }
  syncPreviews();
  document.querySelectorAll('[data-view]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.view === mode)));
  $('#announcement').textContent = t(`${mode}Announcement`);
}

// Render text using a narrow HTML allowlist even though imported copy is already
// sanitized. Text and link semantics are retained; old storefront styling is not.
function richText(block) {
  const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'U', 'S', 'A', 'SPAN', 'UL', 'OL', 'LI', 'H2', 'H3', 'H4', 'BLOCKQUOTE', 'SUP', 'SUB']);
  const container = element(['h2', 'h3', 'h4', 'ul', 'ol', 'blockquote'].includes(block.type) ? block.type : 'p');
  if (!block.html) { container.textContent = block.text || ''; return container; }
  const parsed = new DOMParser().parseFromString(block.html, 'text/html');
  const clean = (node) => {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createTextNode('');
    const result = allowed.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : document.createDocumentFragment();
    if (node.tagName === 'A' && /^https?:\/\//i.test(node.getAttribute('href') || '')) {
      result.href = node.getAttribute('href');
      result.target = '_blank';
      result.rel = 'noopener noreferrer';
    }
    node.childNodes.forEach(child => result.append(clean(child)));
    return result;
  };
  parsed.body.childNodes.forEach(node => container.append(clean(node)));
  return container;
}

function mediaFigure(block, item) {
    item = localizeProject(item);
    const figure = element('figure', 'story-image');
    figure.style.setProperty('--media-ratio', (block.width || 1) / (block.height || 1));
    if (block.type === 'video') {
      figure.classList.add('story-film');
      const video = element('video');
      video.muted = true;
      video.defaultMuted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.poster = block.poster || block.thumb || '';
      video.src = block.src;
      video.width = block.width;
      video.height = block.height;
      video.style.aspectRatio = `${block.width} / ${block.height}`;
      video.addEventListener('loadedmetadata', () => {
        if (video.videoWidth && video.videoHeight) {
          figure.style.setProperty('--media-ratio', video.videoWidth / video.videoHeight);
          video.style.aspectRatio = `${video.videoWidth} / ${video.videoHeight}`;
        }
        syncProjectMedia();
      });
      video.addEventListener('play', () => {
        if (!projectFilms.get(video) || !dialog.open || closing || document.hidden) video.pause();
      });
      video.setAttribute('aria-label', t('film', { title: item.displayTitle }));
      figure.append(video);
      projectFilms.set(video, false);
      projectFilmObserver.observe(video);
      return figure;
    }
    const image = element('img');
    image.src = block.src;
    image.width = block.width;
    image.height = block.height;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.alt = t('image', { title: item.displayTitle });
    figure.append(image);
    if (/^[\w-]{11}$/.test(block.youtubeId || '')) {
      figure.classList.add('story-video');
      const title = block.videoTitle || t('projectVideo', { title: item.displayTitle });
      image.alt = title;
      const play = element('a', 'video-play');
      play.href = `https://www.youtube.com/watch?v=${block.youtubeId}`;
      play.target = '_blank';
      play.rel = 'noopener noreferrer';
      play.dataset.videoTitle = block.videoTitle || '';
      play.setAttribute('aria-label', t('playYouTube', { title }));
      const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      icon.setAttribute('viewBox', '0 0 24 24');
      icon.setAttribute('aria-hidden', 'true');
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19Z');
      icon.append(path);
      play.append(icon, element('span', 'video-play-label', t('playVideo')));
      figure.append(play);
    }
    return figure;
}

function populate(item) {
  selected = item;
  item = localizeProject(item);
  $('#photo-controls').hidden = item.productImages.length < 2;
  $('#thumbnails').hidden = item.productImages.length < 2;
  $('#thumbnails').replaceChildren();
  item.productImages.forEach((photo, index) => {
    const button = element('button');
    button.setAttribute('aria-label', t('photograph', { number: index + 1, total: item.productImages.length }));
    const image = element('img');
    image.src = photo.thumb || photo.src;
    framePhoto(image, photo);
    image.alt = '';
    image.loading = 'lazy';
    button.append(image);
    button.addEventListener('click', () => showPhoto(index));
    $('#thumbnails').append(button);
  });
  showPhoto(0, false);
  const story = $('#story-content');
  story.replaceChildren();
  const usedImages = new Set(item.productImages.flatMap(photo => [photo.src, photo.originalSrc].filter(Boolean)));
  let textGroup;
  const addImage = (block) => {
    const figure = mediaFigure(block, item);
    story.append(figure);
    usedImages.add(block.src);
    textGroup = null;
  };
  for (const section of item.projectContent) {
    for (const block of section.blocks || []) {
      if (['image', 'video'].includes(block.type) && block.src) addImage(block);
      else if (block.type !== 'media' && (block.html || block.text)) {
        if (!textGroup) { textGroup = element('div', 'story-text prose'); story.append(textGroup); }
        textGroup.append(richText(block));
      }
    }
  }
  for (const image of item.additionalPageImages) if (!usedImages.has(image.src)) addImage(image);
  $('#project-story').hidden = !story.childElementCount;
  $('#read-concept').hidden = item.editorial || !story.childElementCount;
  updateProjectCopy(selected);
}

function sizeProjectPhoto() {
  if (!dialog.open || activeIdea || selected?.editorial || innerWidth <= 700) {
    projectIntro.style.removeProperty('--hero-width');
    return;
  }
  const ratio = parseFloat(hero.style.aspectRatio.split('/')[0]) / (parseFloat(hero.style.aspectRatio.split('/')[1]) || 1);
  const stacked = innerWidth <= 960;
  const availableWidth = Math.min(heroFrame.clientWidth, stacked ? 420 : Infinity);
  if (!availableWidth || !Number.isFinite(ratio) || ratio <= 0) return;
  const maximumHeight = availableWidth / ratio;
  let height = Math.min(maximumHeight, Math.max(300, innerHeight - 220));
  const button = $('#read-concept');
  // On laptop layouts, align with the CTA only when it is already nearby.
  // Never add empty space, move the CTA, or push a photo down to force alignment.
  if (!stacked && !button.hidden) {
    const alignedHeight = button.getBoundingClientRect().bottom - heroFrame.getBoundingClientRect().top;
    if (alignedHeight >= height * .85 && alignedHeight <= Math.min(maximumHeight, height * 1.15)) height = alignedHeight;
  }
  const width = `${Math.round(height * ratio * 100) / 100}px`;
  if (projectIntro.style.getPropertyValue('--hero-width') !== width) projectIntro.style.setProperty('--hero-width', width);
}

// Text wrapping, language changes and viewport resizing can move the CTA.
const projectPhotoObserver = new ResizeObserver(() => {
  if (!closing) sizeProjectPhoto();
});
projectPhotoObserver.observe($('.project-info'));
projectPhotoObserver.observe(heroFrame);

// Update copy in place, preserving the selected photograph, video playback and scroll.
function updateProjectCopy(source) {
  const item = localizeProject(source);
  $('.project-info').dir = direction();
  $('#story-content').dir = direction();
  $('#project-title').textContent = item.displayTitle;
  $('#project-kind').textContent = item.objectType;
  $('#project-collaboration').textContent = item.collaboration || '';
  $('#story-title').textContent = t(item.editorial ? 'theProject' : 'behind');
  if (!item.productDescription) return;
  $('#product-description').replaceChildren(...item.productDescription.blocks.map(richText));
  $('#project-meta').replaceChildren();
  $('#project-meta').hidden = !item.year;
  if (item.year) $('#project-meta').append(element('dt', '', t('released')), element('dd', '', String(item.year)));
  const blocks = item.projectContent.flatMap(section => section.blocks || [])
    .filter(block => !['image', 'video', 'media'].includes(block.type) && (block.html || block.text));
  $('#story-content').querySelectorAll('.story-text > *').forEach((node, index) => {
    if (blocks[index]) node.replaceWith(richText(blocks[index]));
  });
  $('#thumbnails').querySelectorAll('button').forEach((button, index) => {
    button.setAttribute('aria-label', t('photograph', { number: index + 1, total: item.productImages.length }));
  });
  hero.alt = t('photoAlt', { title: item.displayTitle, number: photoIndex + 1 });
  updateMediaCopy(item);
  const projectWebsite = $('#project-website');
  projectWebsite.hidden = !item.editorial || !item.website;
  projectWebsite.removeAttribute('href');
  if (item.editorial && item.website) {
    projectWebsite.href = item.website.href;
    projectWebsite.querySelector('span').textContent = item.website.label;
  }
  sizeProjectPhoto();
}

function updateMediaCopy(item) {
  dialog.querySelectorAll('.story-image img').forEach(image => {
    image.alt = t('image', { title: item.displayTitle });
  });
  dialog.querySelectorAll('video').forEach(video => video.setAttribute('aria-label', t('film', { title: item.displayTitle })));
  dialog.querySelectorAll('.video-play').forEach(link => {
    const title = link.dataset.videoTitle || t('projectVideo', { title: item.displayTitle });
    link.setAttribute('aria-label', t('playYouTube', { title }));
    link.querySelector('.video-play-label').textContent = t('playVideo');
  });
}

function framePhoto(image, photo) {
  image.width = photo.width;
  image.height = photo.height;
  image.style.aspectRatio = photo.dialogCrop ? String(photo.dialogCrop.ratio) : `${photo.width} / ${photo.height}`;
  image.classList.toggle('is-cropped', Boolean(photo.dialogCrop));
  if (photo.dialogCrop) image.style.setProperty('--photo-position', photo.dialogCrop.position);
  else image.style.removeProperty('--photo-position');
}

function showPhoto(index, animate = true) {
  if (!selected?.productImages) return;
  photoIndex = (index + selected.productImages.length) % selected.productImages.length;
  const photo = selected.productImages[photoIndex];
  hero.src = photo.src;
  framePhoto(hero, photo);
  hero.alt = t('photoAlt', { title: localizeProject(selected).displayTitle, number: photoIndex + 1 });
  $('#photo-count').textContent = `${pad(photoIndex + 1)} / ${pad(selected.productImages.length)}`;
  $('#thumbnails').querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-pressed', String(i === photoIndex)));
  sizeProjectPhoto();
  if (animate && !reducedMotion.matches) hero.animate([{ opacity: .35 }, { opacity: 1 }], { duration: 240, easing: 'ease-out' });
}

function stopAnimations() {
  animations.forEach(animation => animation.cancel());
  animations = [];
  ghost?.remove();
  ghost = null;
  hero.style.visibility = '';
}

function imageRect(image) {
  const rect = image.getBoundingClientRect();
  const style = getComputedStyle(image);
  const radius = style.borderRadius;
  if (image.classList.contains('transition-crop')) {
    const content = image.firstElementChild.getBoundingClientRect();
    return {
      left: rect.left, top: rect.top, width: rect.width, height: rect.height, radius,
      content: { left: content.left - rect.left, top: content.top - rect.top, width: content.width, height: content.height }
    };
  }
  if (style.objectFit === 'cover') {
    const sourceWidth = Number(image.getAttribute('width')) || image.naturalWidth;
    const sourceHeight = Number(image.getAttribute('height')) || image.naturalHeight;
    const scale = Math.max(rect.width / sourceWidth, rect.height / sourceHeight);
    const [x, y] = style.objectPosition.split(' ').map(value => parseFloat(value) / 100);
    return {
      left: rect.left, top: rect.top, width: rect.width, height: rect.height, radius,
      content: {
        left: (rect.width - sourceWidth * scale) * x,
        top: (rect.height - sourceHeight * scale) * y,
        width: sourceWidth * scale, height: sourceHeight * scale
      }
    };
  }
  // The previous decoded image can still supply naturalWidth while a new src loads.
  const widthAttribute = Number(image.getAttribute('width'));
  const heightAttribute = Number(image.getAttribute('height'));
  const aspect = widthAttribute && heightAttribute
    ? widthAttribute / heightAttribute
    : (image.naturalWidth || 750) / (image.naturalHeight || 1000);
  const width = Math.min(rect.width, rect.height * aspect);
  const height = width / aspect;
  return { left: rect.left + (rect.width - width) / 2, top: rect.top + (rect.height - height) / 2, width, height, radius };
}

function travelImage(from, to, src, duration) {
  if (from.content || to.content) return travelCroppedImage(from, to, src, duration);
  ghost = element('img', 'transition-image');
  ghost.src = src;
  ghost.alt = '';
  const scaleX = from.width / to.width;
  const scaleY = from.height / to.height;
  ghost.style.cssText = `left:${to.left}px;top:${to.top}px;width:${to.width}px;height:${to.height}px;transform-origin:top left`;
  dialog.append(ghost);
  const animation = ghost.animate([
    {
      transform: `translate(${from.left - to.left}px,${from.top - to.top}px) scale(${scaleX},${scaleY})`,
      borderRadius: `${parseFloat(from.radius) / scaleX}px / ${parseFloat(from.radius) / scaleY}px`
    },
    { transform: 'translate(0,0) scale(1)', borderRadius: to.radius }
  ], { duration, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'forwards' });
  animations.push(animation);
  return animation;
}

function travelCroppedImage(from, to, src, duration) {
  // Animate the clipping window independently of the complete photograph.
  // The object keeps its proportions as the wide canvas image becomes a portrait.
  ghost = element('div', 'transition-image transition-crop');
  const image = element('img');
  image.src = src;
  image.alt = '';
  ghost.setAttribute('aria-hidden', 'true');
  ghost.append(image);
  dialog.append(ghost);
  const frame = rect => ({
    left: `${rect.left}px`, top: `${rect.top}px`,
    width: `${rect.width}px`, height: `${rect.height}px`, borderRadius: rect.radius
  });
  const content = rect => {
    const bounds = rect.content || { left: 0, top: 0, width: rect.width, height: rect.height };
    return { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` };
  };
  Object.assign(ghost.style, frame(to));
  Object.assign(image.style, content(to));
  const timing = { duration, easing: 'cubic-bezier(.22,.68,0,1)', fill: 'forwards' };
  const flight = ghost.animate([frame(from), frame(to)], timing);
  animations.push(flight, image.animate([content(from), content(to)], timing));
  return flight;
}

async function openProject(project, tile) {
  if (dialog.open && !activeIdea) return;
  const wasOpen = dialog.open;
  const request = ++requestId;
  // Resolve the description before measuring the image's landing position.
  // The canvas keeps moving while uncached content loads, so capture its source
  // rectangle afterwards, immediately before the transition.
  let fullProject;
  try { fullProject = await loadProject(project); } catch { /* Show the retry state below. */ }
  if (request !== requestId) return;
  if (!wasOpen) sourceTile = tile;
  returnImage = !wasOpen && !project.editorial;
  pauseProjectMedia();
  activeIdea = null;
  stopAnimations();
  dialog.classList.toggle('is-editorial', Boolean(project.editorial));
  dialog.classList.remove('is-idea');
  dialog.setAttribute('aria-labelledby', 'project-title');
  $('#idea-detail').hidden = true;
  $('#idea-media').replaceChildren();
  $('.project-intro').hidden = false;
  hideProjectCursor();
  selected = project;
  closing = false;
  photoIndex = 0;
  velocity = { x: 0, y: 0 };
  const sourceImage = returnImage ? tile.querySelector('img') : null;
  const from = sourceImage ? imageRect(sourceImage) : null;
  updateProjectCopy(project);
  const loadingCopy = element('p', '', t('loadingProject'));
  loadingCopy.dataset.i18n = 'loadingProject';
  $('#product-description').replaceChildren(loadingCopy);
  $('#project-meta').replaceChildren();
  $('#project-meta').hidden = true;
  $('#thumbnails').replaceChildren();
  $('#thumbnails').hidden = true;
  $('#photo-controls').hidden = true;
  $('#photo-count').textContent = '';
  $('#project-story').hidden = true;
  $('#read-concept').hidden = true;
  $('#project-website').hidden = true;
  $('#project-error').hidden = true;
  const cover = coverFor(project);
  hero.src = cover.thumb || cover.src;
  framePhoto(hero, cover);
  hero.alt = localizeProject(project).displayTitle;
  if (!wasOpen) dialog.showModal();
  dialog.append(languageSwitch);
  scroller.scrollTop = 0;
  pullClose.reset();
  if (fullProject) populate(fullProject);
  sizeProjectPhoto();
  syncPreviews();
  $('#close-project').focus({ preventScroll: true });
  if (!reducedMotion.matches) {
    // Measure the resting layout before animating any ancestor of the hero.
    const sharedImage = sourceImage?.currentSrc && from.width > 0;
    const to = sharedImage ? imageRect(hero) : null;
    animations.push(shell.animate([
      { opacity: 0, transform: sharedImage ? 'none' : 'translateY(12px) scale(.98)' },
      { opacity: 1, transform: sharedImage ? 'none' : 'translateY(0) scale(1)' }
    ], { duration: 440, easing: 'cubic-bezier(.22,.68,0,1)' }));
    if (sharedImage) {
      hero.style.visibility = 'hidden';
      const flight = travelImage(from, to, sourceImage.currentSrc, 520);
      flight.finished.then(() => {
        if (request === requestId && !closing) stopAnimations();
      }).catch(() => {});
    }
  }
  if (!fullProject) {
    const errorCopy = element('p', '', t('projectError'));
    errorCopy.dataset.i18n = 'projectError';
    $('#product-description').replaceChildren(errorCopy);
    const retry = element('button', 'read-concept', t('retry'));
    retry.dataset.i18n = 'retry';
    retry.addEventListener('click', async () => {
      try { const item = await loadProject(project); if (request === requestId && dialog.open) populate(item); }
      catch { $('#announcement').textContent = t('retryError'); }
    });
    $('#product-description').append(retry);
    sizeProjectPhoto();
  }
}

function pauseProjectMedia() {
  projectFilmObserver.disconnect();
  projectFilms.clear();
  dialog.querySelectorAll('video').forEach(video => video.pause());
}

function syncProjectMedia() {
  projectFilms.forEach((visible, video) => {
    if (visible && dialog.open && !closing && !document.hidden) video.play().catch(() => {});
    else video.pause();
  });
}

function openIdea(fragment, tile) {
  if (dialog.open) return;
  requestId++;
  pauseProjectMedia();
  stopAnimations();
  sourceTile = tile;
  activeIdea = fragment;
  returnImage = false;
  selected = null;
  closing = false;
  velocity = { x: 0, y: 0 };
  hideProjectCursor();
  dialog.classList.remove('is-editorial');
  dialog.classList.add('is-idea');
  dialog.setAttribute('aria-labelledby', 'idea-title');
  $('.project-intro').hidden = true;
  $('#project-story').hidden = true;
  $('#idea-detail').hidden = false;
  $('#idea-title').textContent = localizeProject(fragment.project).displayTitle;
  $('#idea-title').dir = 'auto';
  const figure = mediaFigure(fragment.media, fragment.project);
  figure.classList.add('idea-matte');
  if (fragment.matte === 'key') figure.classList.add('matte-corrected');
  if (fragment.matte === 'frame') figure.classList.add('photo-matte');
  $('#idea-media').replaceChildren(figure);
  dialog.showModal();
  dialog.append(languageSwitch);
  scroller.scrollTop = 0;
  pullClose.reset();
  syncPreviews();
  $('#close-project').focus({ preventScroll: true });
  if (!reducedMotion.matches) animations.push(shell.animate([
    { opacity: 0, transform: 'translateY(14px) scale(.98)' },
    { opacity: 1, transform: 'translateY(0) scale(1)' }
  ], { duration: 440, easing: 'cubic-bezier(.22,.68,0,1)' }));
}

async function closeProject() {
  if (!dialog.open || closing) return;
  closing = true;
  requestId++;
  // Capture the current opening frame before cancelling it, so an early close
  // continues from the visible image and container instead of snapping to rest.
  const from = imageRect(ghost || hero);
  const shellStyle = getComputedStyle(shell);
  const shellOpacity = shellStyle.opacity;
  const shellTransform = shellStyle.transform;
  stopAnimations();
  pauseProjectMedia();
  const finish = () => {
    dialog.close();
    stopAnimations();
    dialog.classList.remove('is-closing');
    document.body.append(projectCursor, cursorLabel);
    document.body.append(languageSwitch);
    pullClose.reset();
    closing = false;
    activeIdea = null;
    sourceTile?.focus({ preventScroll: true });
    syncPreviews();
  };
  if (reducedMotion.matches) { finish(); return; }
  const sourceImage = sourceTile?.querySelector('img');
  const canTravel = returnImage && sourceImage?.currentSrc && photoIndex === 0 && scroller.scrollTop < 5 && from.top >= 0 && from.top < innerHeight;
  const duration = canTravel ? 420 : 280;
  dialog.style.setProperty('--close-duration', `${duration}ms`);
  dialog.classList.add('is-closing');
  const fade = shell.animate([
    { opacity: shellOpacity, transform: shellTransform },
    { opacity: 0, transform: 'translateY(6px)' }
  ], { duration, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' });
  animations.push(fade);
  let end = fade;
  if (canTravel) {
    hero.style.visibility = 'hidden';
    end = travelImage(from, imageRect(sourceImage), sourceImage.currentSrc, duration);
  }
  try { await Promise.all([fade.finished, end.finished]); } catch { /* Finish safely if resized or interrupted. */ }
  finish();
}

const pullClose = installPullClose({
  scroller, shell, button: $('#pull-close'), label: $('#pull-close-label'), close: closeProject,
  getLabel: armed => t(armed ? 'releaseClose' : 'keepPulling')
});
$('#idea-project').addEventListener('click', () => {
  if (activeIdea) openProject(activeIdea.project, sourceTile);
});

document.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch') return;
  keyboard = false;
  pointer = {
    x: (event.clientX / viewport.width - .5) * 2,
    y: (event.clientY / viewport.height - .5) * 2,
    clientX: event.clientX,
    clientY: event.clientY,
    active: true
  };
});
document.addEventListener('pointerout', event => {
  if (!event.relatedTarget) { pointer.active = false; hideProjectCursor(); }
});
window.addEventListener('blur', () => { pointer.active = false; velocity = { x: 0, y: 0 }; hideProjectCursor(); });
canvas.addEventListener('pointerdown', event => {
  if (event.button !== 0 || (event.pointerType === 'mouse' && event.target.closest('.tile'))) return;
  dragged = false;
  dragging = { x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY, id: event.pointerId };
});
canvas.addEventListener('pointermove', event => {
  if (!dragging || dragging.id !== event.pointerId) return;
  if (Math.hypot(event.clientX - dragging.startX, event.clientY - dragging.startY) > 6) {
    dragged = true;
    canvas.setPointerCapture(event.pointerId);
  }
  if (dragged) {
    const scale = mode === 'things' ? gridScale : 1;
    camera.x -= (event.clientX - dragging.x) / scale;
    camera.y -= (event.clientY - dragging.y) / scale;
    render();
  }
  dragging.x = event.clientX;
  dragging.y = event.clientY;
});
function endDrag() { dragging = null; setTimeout(() => { dragged = false; }, 0); }
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
canvas.addEventListener('wheel', event => {
  if (event.ctrlKey || event.metaKey || dialog.open) return; // Preserve native browser zoom.
  event.preventDefault();
  velocity = { x: 0, y: 0 };
  const factor = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? viewport.height : 1;
  const scale = mode === 'things' ? gridScale : 1;
  camera.x += event.deltaX * factor / scale;
  camera.y += event.deltaY * factor / scale;
  render();
}, { passive: false });
document.addEventListener('keydown', event => {
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  keyboard = true;
  hideProjectCursor();
  if (siteIntro.active && event.key === 'Escape') { siteIntro.dismiss(); return; }
  if (dialog.open) {
    if (event.target.closest('video')) return;
    if (event.key === 'ArrowLeft') { event.preventDefault(); showPhoto(photoIndex + (language === 'he' ? 1 : -1)); }
    if (event.key === 'ArrowRight') { event.preventDefault(); showPhoto(photoIndex + (language === 'he' ? -1 : 1)); }
    return;
  }
  if (mode === 'projects') return;
  if (mode === 'things' && ['+', '=', '-', '0'].includes(event.key)) {
    event.preventDefault();
    setGridScale(event.key === '0' ? DEFAULT_ZOOM : gridScaleTarget + (event.key === '-' ? -.1 : .1));
    return;
  }
  const offsets = { ArrowLeft: [-120, 0], ArrowRight: [120, 0], ArrowUp: [0, -120], ArrowDown: [0, 120] };
  if (offsets[event.key]) {
    event.preventDefault();
    const scale = mode === 'things' ? gridScale : 1;
    camera.x += offsets[event.key][0] / scale;
    camera.y += offsets[event.key][1] / scale;
    render();
  }
});
function setPaused(value) {
  paused = value;
  document.body.classList.toggle('paused', value);
  const toggle = $('.motion-toggle');
  toggle.setAttribute('aria-pressed', String(value));
  toggle.setAttribute('aria-label', t(value ? 'resume' : 'pause'));
  toggle.title = t(value ? 'resumeTitle' : 'pauseTitle');
  toggle.querySelector('path').setAttribute('d', value ? 'm7 5 8 5-8 5Z' : 'M7 5v10M13 5v10');
  syncPreviews();
}
$('.motion-toggle').addEventListener('click', () => setPaused(!paused));
$('#grid-zoom-in').addEventListener('click', () => setGridScale(gridScaleTarget + .1));
$('#grid-zoom-out').addEventListener('click', () => setGridScale(gridScaleTarget - .1));
reducedMotion.addEventListener('change', () => setPaused(reducedMotion.matches));
document.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
  siteIntro.dismiss();
  setView(button.dataset.view);
}));
$('#close-project').addEventListener('click', closeProject);
dialog.addEventListener('cancel', event => { event.preventDefault(); closeProject(); });
let backdropDown = false;
dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog; });
dialog.addEventListener('click', event => { if (backdropDown && event.target === dialog) closeProject(); backdropDown = false; });
$('#previous-photo').addEventListener('click', () => showPhoto(photoIndex - 1));
$('#next-photo').addEventListener('click', () => showPhoto(photoIndex + 1));
$('#read-concept').addEventListener('click', () => {
  scroller.scrollTo({ top: $('#project-story').offsetTop - scroller.offsetTop, behavior: reducedMotion.matches ? 'instant' : 'smooth' });
});
window.addEventListener('resize', () => {
  if (dialog.open) { stopAnimations(); pullClose.reset(); }
  $('#canvas-help').textContent = t(coarsePointer.matches || innerWidth < 700 ? 'touchHelp' : 'desktopHelp');
  layout();
  sizeProjectPhoto();
});
document.addEventListener('visibilitychange', () => {
  cancelAnimationFrame(frame);
  syncPreviews();
  syncProjectMedia();
  if (!document.hidden) { lastTime = 0; frame = requestAnimationFrame(tick); }
});

async function start() {
  $('#loading').dataset.i18n = 'gathering';
  $('#loading').textContent = t('gathering');
  try {
    const data = await Promise.all(['/data/index.json', '/data/projects.json', '/data/ideas.json', '/data/locales.json'].map(async path => {
      const response = await fetch(path);
      if (!response.ok) throw new Error('Collection unavailable');
      return response.json();
    }));
    [projects, presentations, ideas] = data;
    configureContent(data[3]);
    makeTiles('things');
    makeTiles('ideas');
    makeProjects();
    // setView saves the previous camera, so initialize it before the first view.
    camera = { ...canvasSets.get('things').camera };
    setView('things');
    $('#loading').hidden = true;
    document.body.classList.add('ready');
    document.body.dataset.mode = mode;
    setPaused(paused);
    applyLanguage();
    frame = requestAnimationFrame(tick);
  } catch {
    delete $('#loading').dataset.i18n;
    const errorCopy = element('span', '', `${t('collectionError')} `);
    errorCopy.dataset.i18n = 'collectionError';
    $('#loading').replaceChildren(errorCopy);
    const retry = element('button', '', t('retry'));
    retry.dataset.i18n = 'retry';
    retry.addEventListener('click', start);
    $('#loading').append(retry);
  }
}
function applyLanguage() {
  document.documentElement.lang = language;
  document.documentElement.dir = direction();
  document.title = t('title');
  $('meta[name="description"]').content = t('description');
  $('meta[property="og:title"]').content = t('title');
  $('meta[property="og:description"]').content = t('socialDescription');
  document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = t(node.dataset.i18n); });
  document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label', t(node.dataset.i18nAria)); });
  languageSwitch.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === language)));
  $('#canvas-help').textContent = t(coarsePointer.matches || innerWidth < 700 ? 'touchHelp' : 'desktopHelp');
  $('#previous-photo').textContent = language === 'he' ? '→' : '←';
  $('#next-photo').textContent = language === 'he' ? '←' : '→';
  canvasSets.forEach(set => set.tiles.forEach(tile => {
    const item = localizeProject(tile.project);
    tile.node.dataset.cursorTitle = item.displayTitle;
    tile.node.querySelector('.tile-label span').textContent = item.displayTitle;
    const isVideo = tile.media.type === 'video' || tile.media.youtubeId;
    tile.node.setAttribute('aria-label', t('tile', {
      title: item.displayTitle, type: tile.fragment ? t(isVideo ? 'video' : 'sourceImage') : item.objectType,
      kind: t(tile.fragment ? 'openIdea' : 'openProject')
    }));
  }));
  presentations.forEach(item => {
    $(`.project-name[data-project="${item.id}"]`).textContent = localizeProject(item).displayTitle;
  });
  if (dialog.open && activeIdea) {
    const item = localizeProject(activeIdea.project);
    $('#idea-title').textContent = item.displayTitle;
    updateMediaCopy(item);
  } else if (dialog.open && selected) updateProjectCopy(selected);
  cursorProject = null;
  pullClose.refresh();
  jerusalemStatus.refresh();
  setPaused(paused);
}
languageSwitch.addEventListener('click', event => {
  const button = event.target.closest('[data-language]');
  if (!button || button.dataset.language === language) return;
  if (dialog.open) stopAnimations();
  setLanguage(button.dataset.language);
  applyLanguage();
  $('#announcement').textContent = t('languageChanged');
});
applyLanguage();
document.fonts.ready.then(() => siteIntro.show());
start();
