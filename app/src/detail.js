// detail.js — the detail panel: one trophy in full, with its guide in the
// atlas's own words, its missable warning, its roadmap stage and its sources.

import { KIND_LABELS } from './filters.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function renderDetailPanel(panel, trophy, tracker, { onClose, onToggleEarned }) {
  panel.replaceChildren();

  const close = el('button', 'detail-close', 'Close');
  close.type = 'button';
  close.addEventListener('click', onClose);
  panel.append(close);

  const chips = el('div', 'row-top');
  chips.append(el('span', `chip grade-${trophy.grade}`, trophy.grade));
  chips.append(el('span', 'chip kind', KIND_LABELS[trophy.kind] ?? trophy.kind));
  chips.append(el('span', 'chip stage', `Roadmap stage ${trophy.stage}`));
  if (trophy.missable) chips.append(el('span', 'chip missable', 'Missable'));
  panel.append(chips);

  panel.append(el('h2', null, trophy.name));
  panel.append(el('p', 'official', `Official description: “${trophy.description}”`));

  if (trophy.missable && trophy.missableNote) {
    panel.append(el('h3', null, 'Missable warning'));
    panel.append(el('p', 'missable-note', trophy.missableNote));
  }

  panel.append(el('h3', null, 'Guide'));
  panel.append(el('p', null, trophy.guide));

  const toggle = el('button', null, tracker.isEarned(trophy.id) ? 'Earned — tap to unmark' : 'Mark as earned');
  toggle.type = 'button';
  toggle.addEventListener('click', () => onToggleEarned(trophy.id));
  panel.append(toggle);

  panel.append(el('h3', null, 'Sources'));
  const sources = el('p', 'sources', `List data and guide grounded in: ${trophy.sources.join('; ')}.`);
  panel.append(sources);

  panel.hidden = false;
}

export function hideDetailPanel(panel) {
  panel.hidden = true;
  panel.replaceChildren();
}
