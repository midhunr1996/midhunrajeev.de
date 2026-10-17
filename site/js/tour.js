// Guided tour: a sequence of drawing notes. Each stop scrolls its target into view and outlines it.
// The tour never advances on its own; Escape ends it.
import { tourSteps } from './tour-steps.js';
import { h } from './dom.js';

export function createTour({ button, spans, cardFor, motionQuery, steps = tourSteps }) {
  const stepLabel = h('p', { class: 'tour__step' });
  const title = h('h2', { class: 'tour__title', id: 'tour-title', tabindex: '-1' });
  const text = h('p', { class: 'tour__text' });
  const back = h('button', { class: 'button button--small', type: 'button', text: 'Back', onclick: () => go(index - 1) });
  const next = h('button', { class: 'button button--small button--primary', type: 'button', onclick: () => go(index + 1) });
  const end = h('button', { class: 'button button--small', type: 'button', text: 'End tour', onclick: () => stop(true) });
  const card = h(
    'aside',
    { class: 'tour', role: 'dialog', 'aria-labelledby': 'tour-title', hidden: true },
    stepLabel,
    title,
    text,
    h('div', { class: 'tour__actions' }, back, next, end),
  );
  document.body.append(card);

  let index = -1;
  let spotlit = null;

  function targetFor(step) {
    const projectCard = step.project ? cardFor(step.project) : null;
    return projectCard && !projectCard.hidden ? projectCard : document.getElementById(step.target);
  }

  function spotlight(element) {
    spotlit?.classList.remove('is-spotlit');
    spotlit = element ?? null;
    if (!element) return;
    element.classList.add('is-spotlit');
    element.scrollIntoView({ behavior: motionQuery?.matches ? 'auto' : 'smooth', block: 'center' });
  }

  function go(to) {
    if (to < 0) return;
    if (to >= steps.length) {
      stop(true);
      return;
    }
    index = to;
    const step = steps[index];
    if (step.timeline) spans.select(step.timeline);
    stepLabel.textContent = `Note ${index + 1} of ${steps.length}`;
    title.textContent = step.title;
    text.textContent = step.text;
    back.disabled = index === 0;
    next.textContent = index === steps.length - 1 ? 'Finish' : 'Next';
    card.hidden = false;
    spotlight(targetFor(step));
    title.focus({ preventScroll: true });
  }

  function stop(returnFocus) {
    spotlit?.classList.remove('is-spotlit');
    spotlit = null;
    card.hidden = true;
    index = -1;
    if (returnFocus) button.focus({ preventScroll: true });
  }

  function onKey(event) {
    if (card.hidden || document.querySelector('dialog[open]') || event.target.closest('input, textarea')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      stop(true);
      return;
    }
    if (!card.contains(event.target)) return;
    if (event.key === 'ArrowRight') go(index + 1);
    else if (event.key === 'ArrowLeft') go(index - 1);
  }

  button.addEventListener('click', () => go(0));
  document.addEventListener('keydown', onKey);
  return { start: () => go(0), stop };
}
