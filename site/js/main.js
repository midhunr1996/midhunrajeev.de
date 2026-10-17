// Page entry point: renders content and wires up interactions.
import { notes, timeline, groups, projects, billOfMaterials, gearbox, profile } from './content.js';
import { h } from './dom.js';
import { initTheme } from './theme.js';
import { renderTimeline } from './timeline.js';
import { createProjects } from './projects.js';
import { renderBom } from './bom.js';
import { computeStats, renderStats } from './stats.js';
import { initRoles } from './roles.js';
import { createTour } from './tour.js';
import { initContact } from './contact.js';

const $ = (id) => document.getElementById(id);
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const SEARCH_DEBOUNCE_MS = 120;

function trackSheets() {
  const sections = [...document.querySelectorAll('main > .sheet')];
  const links = new Map([...document.querySelectorAll('[data-sheet-link]')].map((link) => [link.dataset.sheetLink, link]));
  const label = $('current-sheet');
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = entry.target.id;
        for (const [key, link] of links) link.setAttribute('aria-current', String(key === id));
        label.textContent = `Sheet ${entry.target.dataset.sheet} of ${sections.length}`;
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );
  sections.forEach((section) => observer.observe(section));
}

function formatReadout({ inputDeg, outputDeg }) {
  $('readout-input').textContent = `${Math.round(inputDeg).toLocaleString('en-GB')}°`;
  $('readout-output').textContent = `${outputDeg.toFixed(1)}°`;
}

async function mountDrive() {
  const stage = $('drive-stage');
  const explode = $('drive-explode');
  try {
    const { mountGearbox } = await import('./gearbox.js');
    const drive = mountGearbox(stage, gearbox, { callouts: $('drive-callouts'), onReadout: formatReadout, motionQuery });
    explode.addEventListener('click', () => {
      const next = !drive.isExploded();
      drive.setExploded(next);
      explode.setAttribute('aria-pressed', String(next));
    });
    $('drive-reset').addEventListener('click', () => {
      drive.resetView();
      explode.setAttribute('aria-pressed', 'false');
    });
  } catch (error) {
    console.warn('3D drive unavailable, showing a static drawing instead:', error.message);
    $('drive-view').hidden = true;
    const { drawFallback } = await import('./drive-fallback.js');
    drawFallback(stage, gearbox);
    stage.setAttribute('aria-label', 'Plan-view drawing of the first stage of my compound cycloidal drive.');
  }
}

function initSearch(input, api) {
  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => api.setQuery(input.value), SEARCH_DEBOUNCE_MS);
  });
  // "/" jumps to the search field, as on GitHub, unless the visitor is already typing somewhere.
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    if (document.querySelector('dialog[open]') || event.target.closest('input, textarea, [contenteditable]')) return;
    event.preventDefault();
    input.focus();
  });
}

function openFromHash(api) {
  const match = /^#project-([a-z0-9-]+)$/.exec(window.location.hash);
  if (match) api.openProject(match[1]);
}

function init() {
  initTheme($('theme-toggle'));
  $('notes').replaceChildren(...notes.map((note) => h('li', { text: note })));
  renderStats($('about-stats'), computeStats({ projects, profile }), { motionQuery });
  const spans = renderTimeline($('timeline'), $('timeline-detail'), timeline, 'itronic');

  const heading = $('projects-title');
  heading.setAttribute('tabindex', '-1');
  const search = $('project-search');
  const contact = initContact({ copyButton: $('copy-email'), status: $('copy-status'), draft: $('draft-email'), profile });
  let roles;
  const api = createProjects({
    projects,
    groups,
    grid: $('project-grid'),
    filtersEl: $('project-filters'),
    statusEl: $('filter-status'),
    dialog: $('project-dialog'),
    heading,
    motionQuery,
    onShowAll: () => {
      search.value = '';
      roles.clear();
    },
  });
  const skills = renderBom($('bom'), billOfMaterials, api);
  roles = initRoles({
    options: $('issue-options'),
    stamp: $('issue-stamp'),
    pitch: $('hero-next'),
    evidence: $('issue-evidence'),
    onChange: (role) => {
      api.setRole(role);
      spans.mark(role?.timeline);
      if (role) spans.select(role.timeline[0]);
      skills.mark(role);
      contact.setRole(role);
    },
  });
  initSearch(search, api);
  createTour({ button: $('start-tour'), spans, cardFor: api.cardFor, motionQuery });

  trackSheets();
  openFromHash(api);
  mountDrive();
}

init();
