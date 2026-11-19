// roadmap.js — the staged path to the platinum, and the missables view.
// Stage membership comes from each trophy's "stage" field in the data file;
// missable warnings are pinned first inside their stage, as the roadmap asks.

export const ROADMAP_STAGES = [
  {
    n: 1,
    title: 'The Campaign',
    blurb:
      'Play the story straight through: the opening, the four chapters, the named set-piece missions and the finale. Story progress is linear, so nothing here needs side content — but the campaign is also where the one choice-driven trophy lives, so make every decision deliberately and keep a separate save before the final mission.',
  },
  {
    n: 2,
    title: 'The People of Leonida',
    blurb:
      'Clear the character strands: Andy, Kenton, Billy, Randy and Tyrone each end in a final mission, and finishing eight strands in all earns Strangers & Freaks. Bret’s unique-animal hunt and Cal’s fishing challenge belong to this stage too — take the hunt when it is offered, because its target is one of a kind.',
  },
  {
    n: 3,
    title: 'The Completion Grind',
    blurb:
      'The long middle: 100% completion and everything that feeds it. Shooting-range golds, 250 stunts, drone races at every location, 50 challenges, the collectible cards, meditation spots and full exploration of Leonida’s 52 areas. Work categories evenly and share trips between them.',
  },
  {
    n: 4,
    title: 'Money, Mayhem & the Platinum',
    blurb:
      'Free-roam feats and the money game: robberies, wanted-level escapes with your partner, laundering a quarter million in marked bills, spending and property buying, and the small one-off moments scattered around the map. When the last of these lands, the platinum — Vice Got a Price! — is awarded on top.',
  },
];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function stageTrophyLine(trophy, tracker, onSelect) {
  const li = el('li', tracker.isEarned(trophy.id) ? 'done' : '');
  const name = el('span', 't-name', `${tracker.isEarned(trophy.id) ? '✓ ' : ''}${trophy.name}`);
  name.addEventListener('click', () => onSelect(trophy));
  li.append(name);
  li.append(el('span', `chip grade-${trophy.grade}`, trophy.grade));
  if (trophy.missable) {
    li.append(el('span', 'chip missable', 'Missable'));
    li.append(el('span', 'warn', `⚠ ${trophy.missableNote ?? 'One-time opportunity — see the guide.'}`));
  }
  return li;
}

export function renderRoadmap(container, trophies, tracker, onSelect) {
  container.replaceChildren();
  for (const stage of ROADMAP_STAGES) {
    const card = el('article', 'stage-card');
    const heading = el('h2');
    heading.append(el('span', 'stage-no', `Stage ${stage.n} — `));
    heading.append(document.createTextNode(stage.title));
    card.append(heading);
    card.append(el('p', 'blurb', stage.blurb));
    const list = el('ul');
    const inStage = trophies
      .filter((trophy) => trophy.stage === stage.n)
      .sort((a, b) => Number(b.missable) - Number(a.missable) || a.id - b.id);
    for (const trophy of inStage) list.append(stageTrophyLine(trophy, tracker, onSelect));
    card.append(list);
    container.append(card);
  }
}

export function renderMissables(container, trophies, tracker, onSelect) {
  container.replaceChildren();
  for (const trophy of trophies.filter((t) => t.missable)) {
    const card = el('article', 'missable-card');
    const heading = el('h2', null, trophy.name);
    heading.addEventListener('click', () => onSelect(trophy));
    card.append(heading);
    card.append(el('p', 'official', `Official description: “${trophy.description}”`));
    card.append(el('p', 'note', `⚠ ${trophy.missableNote ?? ''}`));
    card.append(el('p', null, trophy.guide));
    const open = el('button', null, 'Open in the guide');
    open.type = 'button';
    open.addEventListener('click', () => onSelect(trophy));
    card.append(open);
    container.append(card);
  }
}
