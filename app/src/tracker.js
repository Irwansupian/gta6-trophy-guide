// tracker.js — checklist state for the Leonida Trophy Atlas.
// Earned trophy ids and the spoiler-shield setting live in localStorage and are
// saved the moment anything changes, so progress survives reloads and can be
// exported to a JSON file and imported back on another machine.

const STORAGE_KEY = 'leonida-trophy-atlas-v1';

function readStoredState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { earned: [], spoilers: false };
    const parsed = JSON.parse(raw);
    return {
      earned: Array.isArray(parsed.earned) ? parsed.earned.filter((id) => Number.isInteger(id)) : [],
      spoilers: parsed.spoilers === true,
    };
  } catch {
    return { earned: [], spoilers: false };
  }
}

export function createTracker() {
  const state = readStoredState();
  const earned = new Set(state.earned);
  let spoilers = state.spoilers;

  function persist() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ earned: [...earned], spoilers }));
    } catch {
      // Storage can be unavailable (private mode); the tracker still works in memory.
    }
  }

  return {
    isEarned(id) {
      return earned.has(id);
    },
    toggleEarned(id) {
      if (earned.has(id)) earned.delete(id);
      else earned.add(id);
      persist();
      return earned.has(id);
    },
    setEarned(ids) {
      earned.clear();
      for (const id of ids) if (Number.isInteger(id)) earned.add(id);
      persist();
    },
    earnedIds() {
      return [...earned].sort((a, b) => a - b);
    },
    earnedCount() {
      return earned.size;
    },
    spoilersOn() {
      return spoilers;
    },
    setSpoilers(on) {
      spoilers = on === true;
      persist();
    },
    progressSummary(trophies) {
      const byGrade = {};
      for (const trophy of trophies) {
        byGrade[trophy.grade] ??= { earned: 0, total: 0 };
        byGrade[trophy.grade].total += 1;
        if (earned.has(trophy.id)) byGrade[trophy.grade].earned += 1;
      }
      const total = trophies.length;
      return {
        earned: earned.size,
        total,
        percent: total === 0 ? 0 : Math.round((earned.size / total) * 100),
        byGrade,
      };
    },
    exportState(gameTitle) {
      return JSON.stringify(
        { app: 'leonida-trophy-atlas', game: gameTitle, version: 1, earned: [...earned].sort((a, b) => a - b), spoilers },
        null,
        2,
      );
    },
    importState(text) {
      const parsed = JSON.parse(text);
      const ids = Array.isArray(parsed) ? parsed : parsed.earned;
      if (!Array.isArray(ids)) throw new Error('No earned list found in that file.');
      earned.clear();
      for (const id of ids) if (Number.isInteger(id)) earned.add(id);
      if (parsed && typeof parsed === 'object' && 'spoilers' in parsed) spoilers = parsed.spoilers === true;
      persist();
      return earned.size;
    },
  };
}
