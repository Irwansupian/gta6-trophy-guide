// app.js — the Leonida Trophy Atlas entry point.
// Loads the trophy data, wires the tracker, filters, detail panel, roadmap
// and missables views, and applies any ?shot= scene the kit asks to photograph.

import { createTracker } from './src/tracker.js';
import {
  KIND_LABELS,
  createFilterState,
  trophyMatchesFilters,
  displayNameFor,
  displayDescriptionFor,
} from './src/filters.js';
import { renderDetailPanel, hideDetailPanel } from './src/detail.js';
import { renderRoadmap, renderMissables } from './src/roadmap.js';
import { DEMO_EARNED_IDS, readShotRequest, finishShotScene } from './src/shots.js';

const data = await (await fetch('data/trophies.json')).json();
const trophies = data.trophies;
const tracker = createTracker();
const filters = createFilterState();

const listEl = document.getElementById('trophy-list');
const detailEl = document.getElementById('detail-panel');
const noResultsEl = document.getElementById('no-results');
const earnedCountEl = document.getElementById('earned-count');
const earnedPctEl = document.getElementById('earned-pct');
const progressFillEl = document.getElementById('progress-fill');
const gradeCountsEl = document.getElementById('grade-counts');
const spoilerToggleEl = document.getElementById('spoiler-toggle');

let selectedId = null;
let currentView = 'guide';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderProgress() {
  const summary = tracker.progressSummary(trophies);
  earnedCountEl.textContent = String(summary.earned);
  earnedPctEl.textContent = `${summary.percent}%`;
  progressFillEl.style.width = `${summary.percent}%`;
  const order = ['platinum', 'gold', 'silver', 'bronze'];
  gradeCountsEl.textContent = order
    .map((grade) => `${grade[0].toUpperCase()}${grade.slice(1)} ${summary.byGrade[grade].earned}/${summary.byGrade[grade].total}`)
    .join(' · ');
}

function renderList() {
  listEl.replaceChildren();
  let shown = 0;
  for (const trophy of trophies) {
    if (!trophyMatchesFilters(trophy, filters, tracker)) continue;
    shown += 1;
    const row = el('li', `trophy-row grade-${trophy.grade}${tracker.isEarned(trophy.id) ? ' earned' : ''}${selectedId === trophy.id ? ' selected' : ''}`);

    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = tracker.isEarned(trophy.id);
    box.setAttribute('aria-label', `Mark ${trophy.name} as earned`);
    box.addEventListener('click', (event) => event.stopPropagation());
    box.addEventListener('change', () => {
      tracker.toggleEarned(trophy.id);
      refresh();
    });
    row.append(box);

    const main = el('div', 'row-main');
    const top = el('div', 'row-top');
    top.append(el('span', 'row-name', displayNameFor(trophy, tracker)));
    top.append(el('span', `chip grade-${trophy.grade}`, trophy.grade));
    top.append(el('span', 'chip kind', KIND_LABELS[trophy.kind] ?? trophy.kind));
    if (trophy.missable) top.append(el('span', 'chip missable', 'Missable'));
    main.append(top);
    main.append(el('p', 'row-desc', displayDescriptionFor(trophy, tracker)));
    row.append(main);

    row.addEventListener('click', () => openDetail(trophy));
    listEl.append(row);
  }
  noResultsEl.hidden = shown !== 0;
}

function openDetail(trophy) {
  selectedId = trophy.id;
  showView('guide');
  renderDetailPanel(detailEl, trophy, tracker, {
    onClose: () => {
      selectedId = null;
      hideDetailPanel(detailEl);
      renderList();
    },
    onToggleEarned: () => {
      tracker.toggleEarned(trophy.id);
      refresh();
    },
  });
  renderList();
}

function refresh() {
  renderProgress();
  renderList();
  renderRoadmap(document.getElementById('roadmap-stages'), trophies, tracker, openDetail);
  renderMissables(document.getElementById('missable-list'), trophies, tracker, openDetail);
  if (selectedId !== null) {
    const trophy = trophies.find((t) => t.id === selectedId);
    if (trophy) {
      renderDetailPanel(detailEl, trophy, tracker, {
        onClose: () => {
          selectedId = null;
          hideDetailPanel(detailEl);
          renderList();
        },
        onToggleEarned: () => {
          tracker.toggleEarned(trophy.id);
          refresh();
        },
      });
    }
  }
}

function showView(view) {
  currentView = view;
  document.getElementById('view-guide').hidden = view !== 'guide';
  document.getElementById('view-roadmap').hidden = view !== 'roadmap';
  document.getElementById('view-missables').hidden = view !== 'missables';
  for (const tab of document.querySelectorAll('.tab')) {
    tab.classList.toggle('active', tab.dataset.view === view);
  }
}

for (const tab of document.querySelectorAll('.tab')) {
  tab.addEventListener('click', () => showView(tab.dataset.view));
}

document.getElementById('search').addEventListener('input', (event) => {
  filters.search = event.target.value;
  renderList();
});
document.getElementById('kind-filter').addEventListener('change', (event) => {
  filters.kind = event.target.value;
  renderList();
});
document.getElementById('grade-filter').addEventListener('change', (event) => {
  filters.grade = event.target.value;
  renderList();
});
document.getElementById('only-unearned').addEventListener('change', (event) => {
  filters.onlyUnearned = event.target.checked;
  renderList();
});
spoilerToggleEl.checked = tracker.spoilersOn();
spoilerToggleEl.addEventListener('change', (event) => {
  tracker.setSpoilers(event.target.checked);
  renderList();
});

document.getElementById('export-btn').addEventListener('click', () => {
  const blob = new Blob([tracker.exportState(data.game)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'leonida-trophy-progress.json';
  link.click();
  URL.revokeObjectURL(url);
});
document.getElementById('import-file').addEventListener('change', async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    tracker.importState(await file.text());
    spoilerToggleEl.checked = tracker.spoilersOn();
    refresh();
  } catch {
    window.alert('That file could not be read as a trophy progress export.');
  }
  event.target.value = '';
});

// Screenshot scenes for the kit: seed the demo state, then show the view.
const shot = readShotRequest();
if (shot) {
  tracker.setEarned(DEMO_EARNED_IDS);
  if (shot.scene === 'roadmap') {
    showView('roadmap');
  } else if (shot.scene === 'missables') {
    showView('missables');
  } else if (shot.scene === 'spoilers') {
    tracker.setSpoilers(true);
    spoilerToggleEl.checked = true;
  }
}

refresh();
if (shot && shot.scene === 'detail') {
  const trophy = trophies.find((t) => t.name === shot.name) ?? trophies.find((t) => t.missable);
  if (trophy) openDetail(trophy);
}
requestAnimationFrame(() => requestAnimationFrame(finishShotScene));
