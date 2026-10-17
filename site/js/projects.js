// Project "detail views": lettered cards; group, skill, role and keyword filters; a dialog with a media viewer.
import { h } from './dom.js';
import { projectMatches } from './search.js';
import { attachPreview } from './preview.js';

const SWIPE_PX = 48;
const thumbOf = (src) => src.replace(/\.webp$/, '-thumb.webp');

function cardThumb(project) {
  if (project.thumb) return `assets/img/${project.thumb}-thumb.webp`;
  const first = project.media[0];
  const source = first?.type === 'video' ? first.poster : first?.src;
  return source ? thumbOf(source) : null;
}

function mediaElement(item) {
  if (item.type === 'video') {
    return h('video', {
      src: item.src,
      poster: item.poster,
      controls: true,
      playsinline: true,
      muted: true,
      preload: 'none',
      'aria-label': item.alt,
    });
  }
  return h('img', { src: item.src, alt: item.alt, decoding: 'async' });
}

// Returns the viewer element and, for galleries, a step(delta) function used by the arrow keys.
function renderViewer(media) {
  const main = h('div', { class: 'viewer__main' });
  const caption = h('p', { class: 'viewer__caption' });
  const thumbs = h('div', { class: 'viewer__thumbs' });
  const count = h('span', { class: 'viewer__count', 'aria-live': 'polite' });
  let index = 0;

  function show(next) {
    index = (next + media.length) % media.length;
    main.querySelector('video')?.pause();
    main.replaceChildren(mediaElement(media[index]));
    caption.textContent = media[index].caption;
    count.textContent = `${index + 1} of ${media.length}`;
    thumbs.querySelectorAll('button').forEach((button, i) => button.setAttribute('aria-current', String(i === index)));
  }
  const step = (delta) => show(index + delta);

  let nav = null;
  if (media.length > 1) {
    media.forEach((item, i) => {
      const src = thumbOf(item.type === 'video' ? item.poster : item.src);
      thumbs.append(
        h(
          'button',
          {
            class: `viewer__thumb${item.type === 'video' ? ' viewer__thumb--video' : ''}`,
            type: 'button',
            'aria-label': `Show ${item.type}: ${item.caption}`,
            onclick: () => show(i),
          },
          h('img', { src, alt: '', loading: 'lazy' }),
        ),
      );
    });
    nav = h(
      'div',
      { class: 'viewer__nav' },
      h('button', { class: 'button button--small', type: 'button', text: 'Previous', onclick: () => step(-1) }),
      count,
      h('button', { class: 'button button--small', type: 'button', text: 'Next', onclick: () => step(1) }),
    );
    let touchStart = null;
    main.addEventListener('pointerdown', (event) => {
      if (event.pointerType === 'touch') touchStart = event.clientX;
    });
    main.addEventListener('pointerup', (event) => {
      if (touchStart === null) return;
      const dx = event.clientX - touchStart;
      touchStart = null;
      if (Math.abs(dx) >= SWIPE_PX) step(dx < 0 ? 1 : -1);
    });
  }
  show(0);
  return { element: h('div', { class: 'viewer' }, main, caption, nav, media.length > 1 ? thumbs : null), step: media.length > 1 ? step : null };
}

function renderText(project) {
  const facts = project.facts.length
    ? [h('h3', { class: 'dialog__subhead', text: 'Numbers' }), h('ul', { class: 'dialog__facts' }, project.facts.map((fact) => h('li', { text: fact })))]
    : [];
  const links = project.links.length
    ? h('div', { class: 'dialog__links' }, project.links.map((link) => h('a', { class: 'button', href: link.href, target: '_blank', rel: 'noopener', text: link.label })))
    : null;
  return h(
    'div',
    { class: 'dialog__text' },
    project.body.map((paragraph) => h('p', { text: paragraph })),
    facts,
    h('h3', { class: 'dialog__subhead', text: 'Tools' }),
    h('ul', { class: 'dialog__tags' }, project.tags.map((tag) => h('li', { text: tag }))),
    links,
  );
}

export function createProjects({ projects, groups, grid, filtersEl, statusEl, dialog, heading, motionQuery, onShowAll }) {
  const letters = new Map(projects.map((project, i) => [project.id, String.fromCharCode(65 + i)]));
  const groupLabel = Object.fromEntries(groups.map((group) => [group.id, group.label]));
  const cards = new Map();
  const filterButtons = new Map();
  let state = { group: 'all', part: null, query: '', role: null };

  function renderCard(project) {
    const letter = letters.get(project.id);
    const thumb = cardThumb(project);
    const media = thumb
      ? h('img', { src: thumb, alt: '', loading: 'lazy', decoding: 'async' })
      : h('div', { class: 'card__blank', 'aria-hidden': 'true' }, h('span', { text: letter }));
    const classes = ['card', project.featured && 'card--featured', project.portrait && 'card--portrait'].filter(Boolean).join(' ');
    const card = h(
      'article',
      { class: classes, dataset: { id: project.id } },
      h('div', { class: 'card__media' }, media),
      h(
        'div',
        { class: 'card__body' },
        h('p', { class: 'card__meta' }, h('span', { class: 'balloon', 'aria-hidden': 'true', text: letter }), h('span', { text: `Detail ${letter}` }), h('span', { text: groupLabel[project.group] })),
        h('h3', { class: 'card__title' }, h('button', { class: 'card__open', type: 'button', 'aria-haspopup': 'dialog', onclick: (event) => openProject(project.id, event.currentTarget), text: project.title })),
        h('p', { class: 'card__summary', text: project.summary }),
      ),
    );
    attachPreview(card, project, motionQuery);
    return card;
  }

  function isShown(project) {
    if (state.group !== 'all' && project.group !== state.group) return false;
    if (state.part && !state.part.ids.has(project.id)) return false;
    if (state.role && !state.role.projects.includes(project.id)) return false;
    return projectMatches(project, state.query);
  }

  function describe(visible) {
    const clauses = [
      state.role && `for ${state.role.label} roles`,
      state.part && `that use ${state.part.name}`,
      state.query && `matching "${state.query}"`,
      state.group !== 'all' && !state.part && `in ${groupLabel[state.group]}`,
    ].filter(Boolean);
    if (!clauses.length) return '';
    if (!visible) return `No projects ${clauses.join(', ')}.`;
    return `Showing ${visible} ${visible === 1 ? 'project' : 'projects'} ${clauses.join(', ')}.`;
  }

  function applyFilter() {
    let visible = 0;
    for (const project of projects) {
      const card = cards.get(project.id);
      const show = isShown(project);
      card.hidden = !show;
      card.style.order = state.role ? String(state.role.projects.indexOf(project.id)) : '';
      if (show) visible += 1;
    }
    for (const [id, button] of filterButtons) button.setAttribute('aria-pressed', String(!state.part && id === state.group));
    statusEl.replaceChildren();
    const text = describe(visible);
    if (text) statusEl.append(text, h('button', { type: 'button', text: 'Show all projects', onclick: showAll }));
  }

  function setGroup(group) {
    state = { ...state, group, part: null };
    applyFilter();
  }

  function filterByPart(name, ids) {
    state = { ...state, group: 'all', part: { name, ids: new Set(ids) } };
    applyFilter();
    heading.scrollIntoView({ block: 'start' });
    heading.focus({ preventScroll: true });
  }

  function setQuery(query) {
    state = { ...state, query: query.trim() };
    applyFilter();
  }

  function setRole(role) {
    state = { ...state, role, part: null };
    applyFilter();
  }

  function showAll() {
    state = { group: 'all', part: null, query: '', role: null };
    applyFilter();
    onShowAll?.();
  }

  function openProject(id, opener = null) {
    const project = projects.find((item) => item.id === id);
    if (!project) return;
    const letter = letters.get(id);
    const viewer = project.media.length ? renderViewer(project.media) : null;
    dialog.replaceChildren(
      h(
        'header',
        { class: 'dialog__head' },
        h('span', { class: 'balloon', 'aria-hidden': 'true', text: letter }),
        h('div', {}, h('h2', { class: 'dialog__title', id: 'dialog-title', text: project.title }), h('p', { class: 'dialog__group', text: `Detail ${letter}. ${groupLabel[project.group]}` })),
        h('button', { class: 'button button--small dialog__close', type: 'button', text: 'Close', onclick: () => dialog.close() }),
      ),
      h('div', { class: `dialog__content${viewer ? '' : ' dialog__content--text'}` }, viewer?.element ?? null, renderText(project)),
    );
    dialog.viewerStep = viewer?.step ?? null;
    // Deep links open with nothing focused; send focus to the Projects heading on close instead of <body>.
    const active = document.activeElement;
    dialog.returnFocusTo = opener ?? (active && active !== document.body ? active : heading);
    dialog.showModal();
    history.replaceState(null, '', `#project-${id}`);
  }

  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener('keydown', (event) => {
    // Arrow keys page through a gallery, unless a video has focus (its controls use them to seek).
    if (!dialog.viewerStep || event.target.tagName === 'VIDEO') return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      dialog.viewerStep(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  dialog.addEventListener('close', () => {
    dialog.querySelectorAll('video').forEach((video) => video.pause());
    history.replaceState(null, '', '#projects');
    dialog.returnFocusTo?.focus?.({ preventScroll: true });
  });

  const counts = groups.map((group) => ({ ...group, count: projects.filter((p) => p.group === group.id).length }));
  for (const option of [{ id: 'all', label: 'All', count: projects.length }, ...counts]) {
    const button = h(
      'button',
      { class: 'filter', type: 'button', 'aria-pressed': 'false', onclick: () => setGroup(option.id) },
      option.label,
      h('span', { class: 'filter__count', text: String(option.count) }),
    );
    filterButtons.set(option.id, button);
    filtersEl.append(button);
  }
  for (const project of projects) {
    const card = renderCard(project);
    cards.set(project.id, card);
    grid.append(card);
  }
  applyFilter();

  return {
    letterFor: (id) => letters.get(id),
    titleFor: (id) => projects.find((project) => project.id === id)?.title,
    cardFor: (id) => cards.get(id),
    openProject,
    filterByPart,
    setQuery,
    setRole,
  };
}
