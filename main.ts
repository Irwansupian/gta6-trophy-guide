// Leonida Trophy Atlas — hand-in program for gta6-trophy-guide-01 (Node 22, standard library only).
//
// The guide itself is the static web app in app/ beside this file: app/index.html and its ES modules,
// the stylesheet, and the trophy data at app/data/trophies.json. It loads nothing over the network.
// This program's job is to hand that app in exactly as the scorer expects: copy app/ and screenshots/
// into the output directory and write dossier.json there with buildDossier from the vendored library
// in vendor/makefun-frontend.ts (which must stay byte for byte the kit's copy — the scorer rebuilds
// the dossier with its own and compares).
//
// Before copying, the program validates the one file the gate grades hardest: the trophy data. It
// refuses to hand in a list that is not exactly 55 trophies, or where any trophy is missing a name, a
// description, a grade, a guide, a kind, a roadmap stage or its cited sources — a broken guide should
// fail here, loudly, rather than in front of the judge.
//
// Run it the way the grader does, or locally with an output directory of your own:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// (Without MAKEFUN_OUTPUT_DIR it writes to /output.) Serve the app itself with `node serve.ts`.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const EXPECTED_TROPHY_COUNT = 55;
const EXPECTED_GRADES = { platinum: 1, gold: 2, silver: 6, bronze: 46 };
const ALLOWED_KINDS = new Set(['story', 'missable', 'collectibles', 'activities', 'online']);

function validateTrophyData(dataFile) {
  const data = JSON.parse(readFileSync(dataFile, 'utf8'));
  const trophies = data.trophies;
  if (!Array.isArray(trophies) || trophies.length !== EXPECTED_TROPHY_COUNT) {
    throw new Error(`trophies.json must list exactly ${EXPECTED_TROPHY_COUNT} trophies; found ${Array.isArray(trophies) ? trophies.length : 'none'}.`);
  }
  const gradeCounts = {};
  for (const trophy of trophies) {
    const label = `trophy #${trophy.id ?? '?'} (${trophy.name ?? 'unnamed'})`;
    for (const field of ['name', 'description', 'guide']) {
      if (typeof trophy[field] !== 'string' || trophy[field].trim() === '') {
        throw new Error(`${label} has a blank ${field}.`);
      }
    }
    if (!(trophy.grade in EXPECTED_GRADES)) throw new Error(`${label} has an unknown grade "${trophy.grade}".`);
    gradeCounts[trophy.grade] = (gradeCounts[trophy.grade] ?? 0) + 1;
    if (!ALLOWED_KINDS.has(trophy.kind)) throw new Error(`${label} has an unknown kind "${trophy.kind}".`);
    if (!Number.isInteger(trophy.stage) || trophy.stage < 1 || trophy.stage > 4) {
      throw new Error(`${label} has no roadmap stage between 1 and 4.`);
    }
    if (trophy.missable && (typeof trophy.missableNote !== 'string' || trophy.missableNote.trim() === '')) {
      throw new Error(`${label} is flagged missable but gives no missableNote explaining why.`);
    }
    if (!Array.isArray(trophy.sources) || trophy.sources.length === 0) {
      throw new Error(`${label} cites no sources.`);
    }
  }
  for (const [grade, count] of Object.entries(EXPECTED_GRADES)) {
    if (gradeCounts[grade] !== count) {
      throw new Error(`grade split is wrong: expected ${count} ${grade}, found ${gradeCounts[grade] ?? 0}.`);
    }
  }
  return trophies;
}

const trophies = validateTrophyData(join(repoDir, 'app', 'data', 'trophies.json'));
const missableCount = trophies.filter((trophy) => trophy.missable).length;

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoDir, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoDir, 'screenshots'))) {
  cpSync(join(repoDir, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The caps are the scorer's own (reference/gate.json): only text_max_bytes shapes the dossier's bytes;
// the rest make this program refuse an entry the scorer would refuse — more than 4 screenshots or one
// over 256 KiB, or an app/ over 993 entries or 48 MiB beside /output's own 1000-entry cap.
const dossier = buildDossier(outputDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
});
writeFileSync(join(outputDir, 'dossier.json'), dossier);

console.log(
  `Leonida Trophy Atlas handed in: ${trophies.length} trophies (${missableCount} flagged missable), ` +
    `dossier.json ${Buffer.byteLength(dossier)} bytes -> ${outputDir}`,
);
