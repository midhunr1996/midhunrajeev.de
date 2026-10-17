// Key figures drawn as dimensions. computeStats is pure; renderStats counts the numbers up once on reveal.
import { h } from './dom.js';

const COUNT_MS = 900;
const REVEAL_THRESHOLD = 0.4;

export function computeStats({ projects, profile }) {
  return [
    { id: 'years', value: profile.yearsHandsOn, suffix: '+', label: 'years of hands-on engineering' },
    { id: 'projects', value: projects.length, suffix: '', label: 'projects on this sheet' },
    { id: 'hardware', value: projects.filter((project) => project.group === 'robotics').length, suffix: '', label: 'robots and embedded builds' },
    { id: 'calibration', value: profile.calibrationCut, suffix: '%', label: 'less manual calibration at ITronic' },
  ];
}

const easeOut = (t) => 1 - (1 - t) ** 3;

export function renderStats(container, stats, { motionQuery } = {}) {
  const figures = stats.map((stat) => ({ stat, value: h('span', { class: 'dim__value', 'aria-hidden': 'true', text: `0${stat.suffix}` }) }));
  container.replaceChildren(
    ...figures.map(({ stat, value }) =>
      h(
        'li',
        { class: 'dim' },
        h('span', { class: 'visually-hidden', text: `${stat.value}${stat.suffix} ${stat.label}` }),
        value,
        h('span', { class: 'dim__line', 'aria-hidden': 'true' }),
        h('span', { class: 'dim__label', 'aria-hidden': 'true', text: stat.label }),
      ),
    ),
  );

  const paint = (progress) => {
    for (const { stat, value } of figures) value.textContent = `${Math.round(stat.value * progress)}${stat.suffix}`;
  };
  if (motionQuery?.matches || !('IntersectionObserver' in window)) {
    paint(1);
    return;
  }
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const frame = (now) => {
        const t = Math.min((now - start) / COUNT_MS, 1);
        paint(easeOut(t));
        if (t < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },
    { threshold: REVEAL_THRESHOLD },
  );
  observer.observe(container);
}
