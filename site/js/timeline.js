// Experience drawn as dimension lines on a year scale: one lane for work, one for education.
import { h } from './dom.js';

const LANES = [
  { id: 'work', label: 'Work' },
  { id: 'education', label: 'Education' },
];
const SHORT_NAMES = { btech: 'B.Tech.', protocod: 'Protocod', meng: 'M.Eng.', itronic: 'ITronic' };

const toYears = ([year, month]) => year + (month - 1) / 12;
const compactRange = (entry) => `${entry.start[0]}–${String(entry.end[0]).slice(2)}`;

function renderDetail(detail, entry) {
  detail.replaceChildren(
    h('h3', { text: entry.title }),
    h('p', { class: 'timeline-detail__org', text: `${entry.org}. ${entry.label}` }),
    h('ul', {}, entry.points.map((point) => h('li', { text: point }))),
  );
}

function renderScale(startYear, endYear, toPercent) {
  const scale = h('div', { class: 'timeline__scale', 'aria-hidden': 'true' });
  for (let year = startYear; year <= endYear; year += 1) {
    const tick = h('span', { class: 'timeline__tick', text: String(year) });
    tick.style.left = `${toPercent([year, 1])}%`;
    scale.append(tick);
  }
  return scale;
}

export function renderTimeline(container, detail, { startYear, endYear, entries }, initialId) {
  const toPercent = (date) => ((toYears(date) - startYear) / (endYear - startYear)) * 100;
  const buttons = new Map();

  function select(id) {
    for (const [entryId, button] of buttons) button.setAttribute('aria-pressed', String(entryId === id));
    renderDetail(detail, entries.find((entry) => entry.id === id));
  }

  for (const lane of LANES) {
    const track = h('div', { class: 'timeline__track' });
    for (const entry of entries.filter((item) => item.lane === lane.id)) {
      const button = h(
        'button',
        {
          class: 'span',
          type: 'button',
          'aria-pressed': 'false',
          'aria-label': `${SHORT_NAMES[entry.id] ?? entry.title}: ${entry.title}, ${entry.label}`,
          onclick: () => select(entry.id),
        },
        h('span', { class: 'span__label', text: SHORT_NAMES[entry.id] ?? entry.title }),
        h('span', { class: 'span__line', 'aria-hidden': 'true' }),
        h('span', { class: 'span__dates', text: compactRange(entry) }),
      );
      button.style.left = `${toPercent(entry.start)}%`;
      button.style.width = `${toPercent(entry.end) - toPercent(entry.start)}%`;
      button.style.setProperty('--i', String(entries.indexOf(entry))); // stagger for the draw-in
      buttons.set(entry.id, button);
      track.append(button);
    }
    container.append(h('div', { class: 'timeline__lane' }, h('span', { class: 'timeline__lane-label', text: lane.label }), track));
  }

  container.append(renderScale(startYear, endYear, toPercent));
  select(initialId ?? entries[entries.length - 1].id);
  revealWhenVisible(container);

  return {
    select,
    // Flags the spans a role cares about (CSS draws the mark); pass nothing to clear.
    mark(ids) {
      const relevant = new Set(ids ?? []);
      for (const [entryId, button] of buttons) button.classList.toggle('is-relevant', relevant.has(entryId));
    },
  };
}

// Adds .is-drawn once, the first time the timeline is reasonably in view (CSS does the animation).
function revealWhenVisible(container) {
  if (!('IntersectionObserver' in window)) return;
  container.classList.add('will-draw');
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      container.classList.add('is-drawn');
      observer.disconnect();
    },
    { threshold: 0.35 },
  );
  observer.observe(container);
}
