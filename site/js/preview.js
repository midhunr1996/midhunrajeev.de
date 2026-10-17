// Hover preview: a project card with a video plays it muted while the pointer or focus is on the card.
// The file is only requested on hover, and never under reduced motion or a save-data connection.
import { h } from './dom.js';

const HOVER_DELAY_MS = 150;

export function attachPreview(card, project, motionQuery) {
  const video = project.media.find((item) => item.type === 'video');
  if (!video) return;
  const frame = card.querySelector('.card__media');
  let element = null;
  let timer;

  const blocked = () => motionQuery?.matches || navigator.connection?.saveData === true;

  function start() {
    if (element || blocked()) return;
    element = h('video', { class: 'card__preview', src: video.src, loop: true, playsinline: true, preload: 'none', 'aria-hidden': 'true', tabindex: '-1' });
    element.muted = true;
    frame.append(element);
    element.play().catch(stop);
  }

  function stop() {
    clearTimeout(timer);
    element?.pause();
    element?.remove();
    element = null;
  }

  card.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(timer);
    timer = setTimeout(start, HOVER_DELAY_MS);
  });
  card.addEventListener('pointerleave', stop);
  // Keyboard focus starts the preview; focus returned by a closing dialog (not :focus-visible) does not.
  card.addEventListener('focusin', (event) => {
    if (event.target.matches(':focus-visible')) start();
  });
  card.addEventListener('focusout', (event) => {
    if (!card.contains(event.relatedTarget)) stop();
  });
}
