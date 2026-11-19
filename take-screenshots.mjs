// take-screenshots.mjs — photograph the Leonida Trophy Atlas for the entry.
// Starts the app's own static server, drives the ?shot= scenes in headless
// Chrome, and writes the four JPEGs in screenshots/ at the gate's limits.

import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from '/home/hatch/workspace/makefun/.shottools/node_modules/puppeteer-core/lib/esm/puppeteer/puppeteer-core.js';

const repoDir = fileURLToPath(new URL('.', import.meta.url));
const CHROME = '/home/hatch/workspace/makefun/.browsers/chrome-headless-shell/linux-158.0.8127.36/chrome-headless-shell-linux64/chrome-headless-shell';
const PORT = 8124;
const BASE = `http://localhost:${PORT}`;

const SHOTS = [
  { file: '1-checklist.jpg', url: '/?shot=checklist' },
  { file: '2-guide.jpg', url: '/?shot=detail&name=Actions%20Speak%20Louder' },
  { file: '3-roadmap.jpg', url: '/?shot=roadmap' },
  { file: '4-spoilers.jpg', url: '/?shot=spoilers' },
];

async function waitForServer() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(BASE + '/');
      if (response.ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('serve.ts did not come up on port ' + PORT);
}

const server = spawn('node', ['serve.ts', '--port', String(PORT)], { cwd: repoDir, stdio: 'ignore' });
const problems = [];
try {
  await waitForServer();
  const browser = await puppeteer.launch({ executablePath: CHROME, args: ['--no-sandbox', '--disable-gpu'] });
  try {
    for (const shot of SHOTS) {
      const page = await browser.newPage();
      page.on('pageerror', (error) => problems.push(`${shot.file}: pageerror: ${error.message}`));
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(`${shot.file}: console: ${message.text()}`);
      });
      await page.setViewport({ width: 1280, height: 800 });
      await page.goto(BASE + shot.url, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.waitForFunction('window.__shotReady === true', { timeout: 15000 });
      const target = join(repoDir, 'screenshots', shot.file);
      await page.screenshot({ path: target, type: 'jpeg', quality: 82 });
      console.log(`${shot.file}: ${statSync(target).size} bytes`);
      await page.close();
    }

    // Persistence probe: tick a trophy in the plain editor, reload, confirm it stuck.
    const page = await browser.newPage();
    page.on('pageerror', (error) => problems.push(`persistence: pageerror: ${error.message}`));
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(BASE + '/', { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForFunction('window.__shotReady === true', { timeout: 15000 });
    const before = await page.$eval('#earned-count', (node) => node.textContent);
    await page.click('.trophy-row input[type="checkbox"]');
    const afterCheck = await page.$eval('#earned-count', (node) => node.textContent);
    await page.reload({ waitUntil: 'networkidle0' });
    await page.waitForFunction('window.__shotReady === true', { timeout: 15000 });
    const afterReload = await page.$eval('#earned-count', (node) => node.textContent);
    console.log(`persistence probe: before=${before} afterCheck=${afterCheck} afterReload=${afterReload}`);
    if (!(Number(afterCheck) === Number(before) + 1 && afterReload === afterCheck)) {
      problems.push('persistence probe failed: checkbox state did not survive reload');
    }
    await page.close();
  } finally {
    await browser.close();
  }
} finally {
  server.kill();
}

if (problems.length) {
  console.error('PROBLEMS:\n' + problems.join('\n'));
  process.exit(1);
}
console.log('all scenes rendered with no console or page errors');
