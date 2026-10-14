/**
 * Asynchronous voting session, end to end, against a running app.
 *
 * A facilitator (Léa, who also votes), the presenter window and three participants, each
 * in its own browser context, run a session whose votes are collected before the meeting:
 * Alice (phone, English) votes every category, Bruno (desktop, French) votes two, reloads
 * and finds his answers back, and the facilitator votes too. The meeting then starts with
 * every category already revealed, a late joiner (Dana) arrives during the reveal, and the
 * script checks what each screen shows, runs axe (WCAG 2.2 AA) once per view and phase,
 * downloads the three reports, and fails on any issue, console error or app warning.
 *
 * Usage: npm run dev, then npm run workshop:async (Chromium: npx playwright install chromium).
 *   BASE  app URL (default http://localhost:3000/)
 *   OUT   screenshots, reports and summary.json (default workshop-async-report/)
 *
 * It uses the Firebase project of src/lib/firebaseConfig.ts: each run creates a real
 * session there, whose word stays taken until the session expires.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const require = createRequire(import.meta.url);
const axeSource = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');

const BASE = process.env.BASE ?? 'http://localhost:3000/';
const OUT = path.resolve(process.env.OUT ?? 'workshop-async-report');
fs.mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
const log = (who, msg) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s] ${who.padEnd(11)} ${msg}`);
const issues = [];
const issue = (who, msg) => { issues.push(`${who}: ${msg}`); log(who, `❗ ${msg}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const axeSeen = new Set();
const axeResults = [];

const browser = await chromium.launch({ headless: true });

async function newAgent(name, { locale = 'en-US', mobile = false } = {}) {
  const ctx = await browser.newContext({
    locale,
    acceptDownloads: true,
    ...(mobile ? { viewport: { width: 375, height: 667 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 } : { viewport: { width: 1440, height: 900 } }),
  });
  const page = await ctx.newPage();
  watch(name, page);
  return { name, ctx, page };
}

function watch(name, page) {
  page.on('pageerror', (e) => issue(name, `page error: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' || (m.type() === 'warning' && /\[(session|export)\]/.test(m.text()))) {
      issue(name, `console.${m.type()}: ${m.text().slice(0, 300)}`);
    }
  });
}

async function axe(who, page, label) {
  if (axeSeen.has(label)) return;
  axeSeen.add(label);
  try {
    await page.addScriptTag({ content: axeSource });
    const r = await page.evaluate(async () =>
      (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] })).violations
        .map((v) => ({ id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.slice(0, 3).map((n) => n.target.join(' ')) })));
    axeResults.push({ label, violations: r });
    if (r.length) issue(who, `axe (${label}): ${r.map((v) => `${v.id}[${v.impact}] ${v.nodes.join(', ')}`).join(' | ')}`);
    else log(who, `axe ${label}: clean`);
  } catch (e) { issue(who, `axe could not run on ${label}: ${e.message.split('\n')[0]}`); }
}

const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true }).catch(() => {});

async function expectEnabled(locator) {
  for (let i = 0; i < 50; i++) { if (await locator.isEnabled()) return; await sleep(200); }
}

/** Polls fn until it returns a truthy value or ms elapses; returns the last value */
async function waitUntil(fn, ms = 10000) {
  const end = Date.now() + ms;
  let v = await fn();
  while (!v && Date.now() < end) { await sleep(300); v = await fn(); }
  return v;
}

/* ─── Shared helpers ─── */
const COLORS = ['green', 'orange', 'red'];
const TRENDS = ['down', 'stable', 'up'];
/** The status text of a saved step, per language: "Vote saved for <category>" */
const SAVED = { en: 'Vote saved for ', fr: 'Vote enregistré pour ' };

/** Joins the session as `name`, through the share link or the home page code box (typed lowercase, as from a projector) */
async function join(agent, name, code, { viaHome = false } = {}) {
  const { page } = agent;
  if (viaHome) {
    await page.goto(BASE);
    await page.locator('input').first().fill(code.toLowerCase());
    await page.locator('form button[type="submit"], button:has-text("Join"), button:has-text("Rejoindre")').first().click();
  } else {
    await page.goto(`${BASE}#/session/${code}`);
  }
  const nameInput = page.locator('.join-session input');
  await nameInput.waitFor({ timeout: 20000 });
  await expectEnabled(nameInput);
  await nameInput.fill(name);
  await page.locator('.join-session button[type="submit"]').click();
  await page.locator('.join-session').waitFor({ state: 'detached', timeout: 20000 }).catch(() => issue(name, 'join form did not go away'));
}

/** Picks a colour and a trend in the stepper, then submits it (same selectors as workshop.mjs) */
async function pick(page, color, trend) {
  const form = page.locator('form.voting-panel');
  await form.waitFor({ timeout: 20000 });
  await form.locator(`.voting-panel__field--color label:has(input[value="${color}"])`).click();
  await form.locator(`.voting-panel__field--trend label:has(input[value="${trend}"])`).click();
  await form.locator('button[type="submit"]').click();
}

/** Saves the step on screen: the status announces it and focus moves to the next step's heading. Returns false if the save did not go through. */
async function save(agent, color, trend, savedPrefix) {
  const { page, name } = agent;
  const title = (await page.locator('.collecting-view__heading h3').first().innerText()).trim();
  await pick(page, color, trend);
  const announced = await page.locator('[role="status"]').filter({ hasText: `${savedPrefix}${title}` }).first()
    .waitFor({ state: 'attached', timeout: 10000 }).then(() => true, () => false);
  if (!announced) {
    issue(name, `no "${savedPrefix}${title}" announcement after saving: the step did not advance`);
    return false;
  }
  const focused = await page.waitForFunction(() => !!document.activeElement?.closest('.collecting-view__heading'), null, { timeout: 3000 })
    .then(() => true, () => false);
  if (!focused) issue(name, `focus not on the step heading after saving "${title}"`);
  log(name, `saves ${title}: ${color}/${trend}`);
  return true;
}

/** Saves every step in order, from the first category to the review; returns how many steps were saved */
async function voteAll(agent, savedPrefix, pickFor) {
  const { page, name } = agent;
  let i = 0;
  while (!(await page.locator('.collecting-view--review').count())) {
    if (i > 50) { issue(name, 'never reached the review step'); break; }
    const [color, trend] = pickFor(i);
    if (!(await save(agent, color, trend, savedPrefix))) break;
    i++;
  }
  return i;
}

/** Watches for a voting phase, which an async session never has: flags it on the page as window.__sawVoting */
const watchNoVotingPhase = (page) =>
  page.evaluate(() => {
    window.__sawVoting = false;
    new MutationObserver(() => {
      if (document.querySelector('[class*="view--voting"]')) window.__sawVoting = true;
    }).observe(document.body, { subtree: true, childList: true, attributes: true });
  });

let sessionCode = null;
let total = 0;
const downloads = {};
try {
/* ─── Facilitator: create an async session ─── */
const fac = await newAgent('Facilitator');
const fp = fac.page;
await fp.goto(BASE);
await fp.getByRole('button', { name: 'Create Session' }).click();
await fp.locator('.create-session').waitFor();
/* ODS Toggle: a checkbox named by its wrapping label; click the label text, the input may be visually hidden */
const asyncSwitch = fp.getByRole('checkbox', { name: /Asynchronous voting/ });
await fp.getByText('Asynchronous voting', { exact: true }).click();
if (!(await asyncSwitch.isChecked())) issue('Facilitator', 'the "Asynchronous voting" toggle did not turn on');
if (await fp.getByText('Time per category (minutes)').count()) issue('Facilitator', 'the time per category field is still shown in async mode');
await fp.getByRole('button', { name: 'Start Session' }).click();
await fp.waitForURL(/#\/session\/[A-Z]{6}$/, { timeout: 20000 });
const code = fp.url().match(/session\/([A-Z]{6})/)[1];
sessionCode = code;
log('Facilitator', `async session created: ${code}`);
await fp.locator('.join-session input').waitFor();
await expectEnabled(fp.locator('.join-session input'));
await fp.locator('.join-session input').fill('Léa');
await fp.locator('.join-session button[type="submit"]').click();
await fp.locator('.facilitator-view--collecting').waitFor({ timeout: 20000 });
await axe('Facilitator', fp, 'facilitator-collecting');
await shot(fp, 'facilitator-collecting');
const lea = { ...fac, name: 'Léa' };

/* ─── Presenter window, opened from the collecting screen ─── */
const [presenter] = await Promise.all([
  fp.waitForEvent('popup'),
  fp.locator('.facilitator-view__presenter-hint .open-presenter-button').click(),
]);
watch('Presenter', presenter);
await presenter.setViewportSize({ width: 1280, height: 800 });
await presenter.locator('.presenter-view--collecting').waitFor({ timeout: 20000 });
log('Presenter', `opened, title="${await presenter.title()}"`);
await axe('Presenter', presenter, 'presenter-collecting');
await shot(presenter, 'presenter-collecting');

/* ─── Alice: phone, votes every category ─── */
const alice = await newAgent('Alice', { mobile: true });
await join(alice, 'Alice', code);
await alice.page.locator('.participant-view--collecting').waitFor({ timeout: 20000 });
await axe('Alice', alice.page, 'participant-collecting-mobile');
const fits = await alice.page.evaluate(() => ({ sw: document.documentElement.scrollWidth, w: window.innerWidth }));
log('Alice', `phone ${fits.w}px wide, page scroll width ${fits.sw}`);
if (fits.sw > fits.w) issue('Alice', `horizontal scroll on phone: ${fits.sw} > ${fits.w}`);
await shot(alice.page, 'participant-alice-collecting');
const aliceSteps = await voteAll(alice, SAVED.en, (i) => [COLORS[i % 3], TRENDS[(i + 1) % 3]]);

/* ─── Bruno: French desktop, votes the first two categories, reloads ─── */
const BRUNO_PICKS = [['orange', 'down'], ['red', 'stable']];
const bruno = await newAgent('Bruno', { locale: 'fr-FR' });
await join(bruno, 'Bruno', code, { viaHome: true });
await bruno.page.locator('.participant-view--collecting').waitFor({ timeout: 20000 });
for (const [color, trend] of BRUNO_PICKS) await save(bruno, color, trend, SAVED.fr);
log('Bruno', 'reloads the page');
await bruno.page.reload();
await bruno.page.locator('.participant-view--collecting').waitFor({ timeout: 20000 });
if (await bruno.page.locator('.join-session').count()) issue('Bruno', 'asked for the name again after reload');
const colorBack = await bruno.page.locator('form.voting-panel .voting-panel__field--color input:checked').first()
  .getAttribute('value', { timeout: 15000 }).catch(() => null);
const trendBack = await bruno.page.locator('form.voting-panel .voting-panel__field--trend input:checked').first()
  .getAttribute('value', { timeout: 15000 }).catch(() => null);
log('Bruno', `after reload the first category shows ${colorBack}/${trendBack}`);
if (colorBack !== BRUNO_PICKS[0][0] || trendBack !== BRUNO_PICKS[0][1]) {
  issue('Bruno', `after reload the vote form is not pre-filled with ${BRUNO_PICKS[0].join('/')} (got ${colorBack}/${trendBack})`);
}

/* ─── Léa, the facilitator, votes every category in her own stepper ─── */
const leaSteps = await voteAll(lea, SAVED.en, (i) => [COLORS[(i + 1) % 3], TRENDS[i % 3]]);
if (aliceSteps !== leaSteps) issue('Facilitator', `Alice saved ${aliceSteps} steps, Léa ${leaSteps}`);
total = leaSteps;
log('Facilitator', `${total} categories, all voted by Léa`);

/* ─── Before the meeting: who is finished ─── */
const controls = fp.locator('.facilitator-controls');
const readRows = () => controls.locator('.live-round__voter').evaluateAll((els) =>
  els.map((e) => ({ text: e.textContent.replace(/\s+/g, ' ').trim(), voted: e.classList.contains('live-round__voter--voted') })));
const badgeProblems = (rows) => {
  const problems = [];
  for (const [name, complete] of [['Léa', true], ['Alice', true], ['Bruno', false]]) {
    const row = rows.find((r) => r.text.includes(name));
    const m = row?.text.match(new RegExp(`${name} (\\d+)/(\\d+)`));
    if (!m) { problems.push(`no progress badge for ${name}`); continue; }
    const n = Number(m[1]);
    const of = Number(m[2]);
    const expected = name === 'Bruno' ? BRUNO_PICKS.length : total;
    if (n !== expected || of !== total) problems.push(`${name} badge shows ${n}/${of}, expected ${expected}/${total}`);
    if (row.voted !== complete) problems.push(`${name} is ${row.voted ? 'complete' : 'incomplete'} in the badges`);
  }
  return problems;
};
/* The facilitator's listener may still be receiving the last votes: poll before judging */
let rows = [];
let problems = [];
await waitUntil(async () => { rows = await readRows(); problems = badgeProblems(rows); return problems.length === 0; }, 10000);
for (const r of rows) log('Facilitator', `badge: ${r.text}${r.voted ? ' (complete)' : ''}`);
for (const p of problems) issue('Facilitator', p);
const warningShown = await waitUntil(() => controls.getByText('Not finished: Bruno').isVisible().catch(() => false), 10000);
if (!warningShown) issue('Facilitator', 'no "Not finished: Bruno" warning before the meeting');
await shot(fp, 'facilitator-ready');

/* ─── Alice's review step, then the meeting starts ─── */
await alice.page.locator('.collecting-view--review').waitFor({ timeout: 10000 });
await axe('Alice', alice.page, 'participant-review-mobile');
await watchNoVotingPhase(fp);
await watchNoVotingPhase(presenter);
const startedAt = Date.now();
await fp.getByRole('button', { name: 'Start the meeting' }).click();
await fp.locator('.facilitator-view--revealed').waitFor({ timeout: 10000 })
  .catch(() => issue('Facilitator', 'the meeting did not reveal the first category'));
await presenter.locator('.presenter-view--revealed').waitFor({ timeout: 10000 })
  .then(() => log('Presenter', `revealed ${((Date.now() - startedAt) / 1000).toFixed(1)}s after the facilitator started the meeting`),
    () => issue('Presenter', 'the first category was not revealed on the presenter'));
if (await fp.locator('.facilitator-view--collecting').count()) issue('Facilitator', 'still on the collecting view after starting the meeting');

/* Matrix totals agree on both screens, and each category counts the votes it had */
async function checkRound(idx) {
  await fp.locator('.session-progress__label', { hasText: `category ${idx + 1} of ${total}` }).waitFor({ timeout: 10000 })
    .catch(() => issue('Facilitator', `category ${idx + 1} of ${total} not on screen`));
  await presenter.locator('.presenter-view--revealed').waitFor({ timeout: 10000 })
    .catch(() => issue('Presenter', `category ${idx + 1} not revealed on the presenter`));
  await presenter.locator('.session-progress__label', { hasText: `category ${idx + 1} of ${total}` }).waitFor({ timeout: 10000 })
    .catch(() => issue('Presenter', `category ${idx + 1} of ${total} not on screen`));
  await fp.locator('.facilitator-view--revealed').waitFor({ timeout: 10000 });
  await presenter.locator('.vote-matrix').first().waitFor({ timeout: 10000 }).catch(() => {});
  const sum = (page) => page.locator('.vote-matrix').first().evaluate((t) =>
    [...t.querySelectorAll('.vote-matrix__count')].reduce((s, c) => s + Number(c.firstElementChild?.textContent ?? 0), 0)).catch(() => -1);
  const facCount = await sum(fp);
  const presCount = await sum(presenter);
  /* Bruno voted the first categories only; Alice, Léa and Bruno (where he voted) count */
  const expected = idx < BRUNO_PICKS.length ? 3 : 2;
  log(idx === 0 ? 'Presenter' : 'Facilitator', `category ${idx + 1}: matrix total presenter=${presCount}, facilitator=${facCount}, expected ${expected}`);
  if (facCount !== presCount) issue('Presenter', `category ${idx + 1}: matrix totals differ (presenter ${presCount} vs facilitator ${facCount})`);
  if (facCount !== expected) issue('Facilitator', `category ${idx + 1}: ${facCount} votes in the matrix, expected ${expected}`);
}

await checkRound(0);
await alice.page.locator('.participant-view--revealed').waitFor({ timeout: 10000 })
  .catch(() => issue('Alice', 'not on the revealed view when the meeting started'));
/* Regression guard: quick-vote marks are gated on mode === 'live', so an async session must show none */
const bolts = await fp.getByText('⚡').count();
if (bolts) issue('Facilitator', `⚡ shown ${bolts} time(s) in an async session`);
await axe('Facilitator', fp, 'facilitator-revealed');
await axe('Presenter', presenter, 'presenter-revealed');
await shot(presenter, 'presenter-revealed-r1');
await shot(fp, 'facilitator-revealed-r1');

/* A late joiner arrives during the reveal: the votes are closed for her */
const dana = await newAgent('Dana');
await join(dana, 'Dana', code);
const closed = await dana.page.getByText('Voting is closed').waitFor({ timeout: 15000 }).then(() => true, () => false);
if (!closed) issue('Dana', 'no "Voting is closed" on a late join');
if (await dana.page.locator('form.voting-panel').count()) issue('Dana', 'a late joiner sees the vote form');
log('Dana', `late join during the reveal: "Voting is closed" shown=${closed}`);

/* Next Category until the last one; each goes straight to its results */
for (let idx = 1; idx < total; idx++) {
  await fp.getByRole('button', { name: 'Next Category' }).click();
  await checkRound(idx);
}
await fp.getByRole('button', { name: 'Finish Session' }).click();
await fp.locator('.facilitator-view--finished').waitFor({ timeout: 20000 }).catch(() => issue('Facilitator', 'Finish Session did not show the recap'));
await presenter.locator('.presenter-view--finished').waitFor({ timeout: 20000 }).then(() => log('Presenter', 'shows the recap'), () => issue('Presenter', 'no recap'));
for (const [who, page] of [['Facilitator', fp], ['Presenter', presenter]]) {
  if (await page.evaluate(() => window.__sawVoting)) issue(who, 'went through the voting phase, which an async session never has');
}
await axe('Facilitator', fp, 'facilitator-finished');
await axe('Presenter', presenter, 'presenter-finished');
await shot(presenter, 'presenter-finished');

for (const label of ['Download Markdown', 'Download PDF', 'Download JSON']) {
  const [d] = await Promise.all([fp.waitForEvent('download', { timeout: 20000 }), fp.getByRole('button', { name: label }).click()]);
  const file = path.join(OUT, d.suggestedFilename());
  await d.saveAs(file);
  downloads[label] = file;
  log('Facilitator', `⬇ ${label} → ${path.basename(file)} (${fs.statSync(file).size} B)`);
}

} catch (e) {
  issue('Harness', `scenario stopped: ${e.message.split('\n')[0]}`);
} finally {
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ code: sessionCode, categories: total, downloads, issues, axe: axeResults }, null, 2));
  log('Harness', `done. ${issues.length} issue(s). Output in ${OUT}`);
  await browser.close();
  process.exitCode = issues.length ? 1 : 0;
}
