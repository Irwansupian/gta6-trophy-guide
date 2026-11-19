// shots.js — deterministic screenshot scenes, driven by ?shot= URL params.
// The kit photographs the app through these scenes: each one seeds the same
// fixed demo progress, picks a view, and signals readiness when rendered.

// A fixed, believable mid-playthrough state: 17 of 55 earned, story well
// under way, a few strands and grinds done, nothing in stage 4 finished
// except a first partner escape, a beach cocktail and some spending.
export const DEMO_EARNED_IDS = [2, 3, 4, 5, 8, 9, 10, 16, 18, 20, 21, 22, 25, 28, 33, 44, 53];

export function readShotRequest() {
  const params = new URLSearchParams(window.location.search);
  const scene = params.get('shot');
  if (!scene) return null;
  return { scene, name: params.get('name') ?? '' };
}

export function finishShotScene() {
  window.__shotReady = true;
}
