// "Issued for" stamp: the visitor picks the role they are hiring for and the sheets are re-issued for it.
// The choice lives in the URL as ?for=<id>, so a role-specific link can be shared.
import { roles, roleById } from './fit.js';
import { h } from './dom.js';

const PARAM = 'for';

function readFromUrl() {
  return roleById(new URLSearchParams(window.location.search).get(PARAM));
}

function writeToUrl(role) {
  const url = new URL(window.location.href);
  if (role) url.searchParams.set(PARAM, role.id);
  else url.searchParams.delete(PARAM);
  window.history.replaceState(null, '', url);
}

export function initRoles({ options, stamp, pitch, evidence, onChange }) {
  const buttons = new Map();
  const defaultPitch = pitch.textContent;
  let current = null;

  function render() {
    for (const [id, button] of buttons) button.setAttribute('aria-pressed', String(current?.id === id));
    stamp.hidden = !current;
    evidence.hidden = !current;
    if (current) {
      stamp.textContent = current.stamp;
      stamp.classList.remove('is-stamped');
      void stamp.offsetWidth; // restart the stamp animation on every change
      stamp.classList.add('is-stamped');
      pitch.textContent = current.pitch;
      evidence.replaceChildren(...current.evidence.map((text) => h('li', { text })));
    } else {
      pitch.textContent = defaultPitch;
      evidence.replaceChildren();
    }
    writeToUrl(current);
    onChange(current);
  }

  function set(role) {
    current = role;
    render();
  }

  for (const role of roles) {
    const button = h('button', {
      class: 'issue__option',
      type: 'button',
      'aria-pressed': 'false',
      text: role.label,
      onclick: () => set(current?.id === role.id ? null : role),
    });
    buttons.set(role.id, button);
    options.append(button);
  }
  set(readFromUrl());

  return { clear: () => set(null), current: () => current };
}
