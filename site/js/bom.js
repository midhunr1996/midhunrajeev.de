// Skills as a bill of materials. Part names filter the project grid; letter balloons open a project.
// mark(role) flags the rows a role cares about.
import { h } from './dom.js';
import { isRelevantPart } from './fit.js';

const ROLE_LABELS = { itronic: 'ITronic', protocod: 'Protocod' };

function usedInCell(ids, { letterFor, titleFor, openProject }) {
  const projectIds = ids.filter((id) => letterFor(id)).sort((a, b) => letterFor(a).localeCompare(letterFor(b)));
  const roles = ids.filter((id) => !letterFor(id));
  return h(
    'td',
    {},
    h(
      'div',
      { class: 'bom__used' },
      projectIds.map((id) =>
        h('button', {
          class: 'balloon',
          type: 'button',
          title: titleFor(id),
          'aria-label': `Open project ${letterFor(id)}: ${titleFor(id)}`,
          'aria-haspopup': 'dialog',
          text: letterFor(id),
          onclick: (event) => openProject(id, event.currentTarget),
        }),
      ),
      roles.map((id) => h('span', { class: 'bom__role', text: ROLE_LABELS[id] ?? id })),
    ),
  );
}

export function renderBom(table, groups, api) {
  const rows = new Map();
  let item = 1;
  for (const group of groups) {
    const body = h('tbody', {}, h('tr', {}, h('th', { scope: 'rowgroup', colspan: '4', text: group.group })));
    for (const part of group.parts) {
      const projectIds = part.usedIn.filter((id) => api.letterFor(id));
      const name = projectIds.length
        ? h('button', { type: 'button', text: part.part, onclick: () => api.filterByPart(part.part, projectIds) })
        : part.part;
      const note = h('span', { class: 'visually-hidden' }); // spoken cue for the role mark
      const row = h(
        'tr',
        {},
        h('td', { class: 'bom__item', text: String(item) }),
        h('th', { class: 'bom__part', scope: 'row' }, name, note),
        usedInCell(part.usedIn, api),
        h('td', { class: 'bom__qty', text: String(part.usedIn.length) }),
      );
      rows.set(part.part, { row, note });
      body.append(row);
      item += 1;
    }
    table.append(body);
  }
  return {
    mark(role) {
      for (const [name, { row, note }] of rows) {
        const relevant = isRelevantPart(role, name);
        row.classList.toggle('is-relevant', relevant);
        note.textContent = relevant ? ' (relevant to the selected role)' : '';
      }
    },
  };
}
