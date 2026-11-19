// filters.js — the checklist's filter state and the rules that decide which
// trophies a filter set shows, including the spoiler shield's masking.

export const KIND_LABELS = {
  story: 'Story',
  missable: 'Missable',
  collectibles: 'Collectibles',
  activities: 'Activities',
  online: 'Online',
};

export function createFilterState() {
  return { search: '', kind: 'all', grade: 'all', onlyUnearned: false };
}

export function trophyMatchesFilters(trophy, filters, tracker) {
  if (filters.grade !== 'all' && trophy.grade !== filters.grade) return false;
  if (filters.kind === 'missable') {
    if (!trophy.missable) return false;
  } else if (filters.kind !== 'all' && trophy.kind !== filters.kind) {
    return false;
  }
  if (filters.onlyUnearned && tracker.isEarned(trophy.id)) return false;
  const query = filters.search.trim().toLowerCase();
  if (query) {
    const haystack = `${trophy.name} ${trophy.description}`.toLowerCase();
    if (!haystack.includes(query)) return false;
  }
  return true;
}

// The spoiler shield: with it on, a story trophy that has not been earned yet
// is shown as a hidden entry — no name, no description — until it is earned.
export function isSpoilerHidden(trophy, tracker) {
  return tracker.spoilersOn() && trophy.kind === 'story' && !tracker.isEarned(trophy.id);
}

export function displayNameFor(trophy, tracker) {
  return isSpoilerHidden(trophy, tracker) ? 'Hidden story trophy' : trophy.name;
}

export function displayDescriptionFor(trophy, tracker) {
  return isSpoilerHidden(trophy, tracker)
    ? 'Hidden by the spoiler shield. Earn this story trophy to reveal it.'
    : trophy.description;
}
