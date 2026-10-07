/**
 * Simulated Squad Health Check workshop, end to end, against a running app.
 *
 * A facilitator, the presenter window and six participants, each in its own browser
 * context, run every category of a default session. Participants behave differently on
 * purpose: phone, French browser, keyboard only, late joiner, vote edit and reload, and
 * one who leaves after round 3. The script checks what each screen shows, runs axe
 * (WCAG 2.2 AA) once per view and phase, downloads the three reports, and fails on any
 * issue, console error or app warning.
 *
 * Usage: npm run dev, then npm run workshop (Chromium: npx playwright install chromium).
 *   BASE  app URL (default http://localhost:3000/)
 *   OUT   screenshots, reports and summary.json (default workshop-report/)
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
const OUT = path.resolve(process.env.OUT ?? 'workshop-report');
fs.mkdirSync(OUT, { recursive: true });

const t0 = Date.now();
const log = (who, msg) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s] ${who.padEnd(11)} ${msg}`);
const issues = [];
const issue = (who, msg) => { issues.push(`${who}: ${msg}`); log(who, `❗ ${msg}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const think = (min, max) => sleep(min + Math.random() * (max - min));
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
  } catch (e) { log(who, `axe failed on ${label}: ${e.message}`); }
}

const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true }).catch(() => {});

/* ─── Shared helpers ─── */
const phaseOf = async (page) =>
  page.evaluate(() => {
    const el = document.querySelector('[class*="participant-view--"], [class*="facilitator-view--"], [class*="presenter-view--"]');
    if (!el) return 'none';
    const m = [...el.classList].map((c) => c.match(/--(lobby|intro|voting|revealed|finished)$/)).find(Boolean);
    return m ? m[1] : 'other';
  });

async function vote(page, color, trend, { keyboard = false } = {}) {
  const form = page.locator('form.voting-panel');
  await form.waitFor({ timeout: 20000 });
  if (keyboard) {
    // Tab into the colour group, arrow to the choice, Tab to the trend group, arrow, Tab to submit, Enter
    const colorInput = form.locator('.voting-panel__field--color input').first();
    await colorInput.focus();
    const colors = ['green', 'orange', 'red'];
    for (let i = 0; i < colors.indexOf(color); i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    const trends = ['down', 'stable', 'up'];
    for (let i = 0; i < trends.indexOf(trend); i++) await page.keyboard.press('ArrowRight');
    await page.keyboard.press('Space');
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim());
    await page.keyboard.press('Enter');
    return focused;
  }
  await form.locator(`.voting-panel__field--color label:has(input[value="${color}"])`).click();
  await form.locator(`.voting-panel__field--trend label:has(input[value="${trend}"])`).click();
  await form.locator('button[type="submit"]').click();
}

/* ─── Participant agent ─── */
async function participant(agent, persona, ctl) {
  const { page, name } = agent;
  let joinedVia;
  if (persona.joinViaHome) {
    await page.goto(BASE);
    await think(500, 1500);
    await page.locator('input').first().fill(ctl.code.toLowerCase()); // typed lowercase from a projector
    await page.locator('form button[type="submit"], button:has-text("Join"), button:has-text("Rejoindre")').first().click();
    joinedVia = 'home code';
  } else {
    await page.goto(ctl.link);
    joinedVia = 'share link';
  }
  const nameInput = page.locator('.join-session input');
  await nameInput.waitFor({ timeout: 20000 });
  await expectEnabled(nameInput);
  if (persona.emptyFirst) {
    await page.locator('.join-session button[type="submit"]').click();
    const err = await page.locator('.join-session').getByText(/Enter your name|Saisissez|nom/i).isVisible().catch(() => false);
    if (!err) issue(name, 'no error shown on empty name submit');
    else log(name, 'empty name rejected with an error, as expected');
  }
  await nameInput.fill(name);
  await page.locator('.join-session button[type="submit"]').click();
  await page.locator('.join-session').waitFor({ state: 'detached', timeout: 20000 }).catch(() => issue(name, 'join form did not go away'));
  const err = (await page.locator('[role="alert"]').count()) ? await page.locator('[role="alert"]').first().textContent() : null;
  log(name, `joined via ${joinedVia}${err ? ` (alert: ${err})` : ''}; phase=${await phaseOf(page)}`);
  if (persona.mobile) await axe(name, page, `participant-${await phaseOf(page)}-mobile${persona.locale ? '-fr' : ''}`);

  let lastRound = -1;
  let reloaded = false;
  while (true) {
    if (persona.dropAfterRound != null && lastRound >= persona.dropAfterRound) {
      log(name, '📴 closes the laptop and leaves the room');
      await agent.ctx.close();
      return { left: true };
    }
    const phase = await phaseOf(page);
    if (phase === 'finished') {
      const txt = await page.locator('.participant-view--finished').innerText().catch(() => '');
      log(name, `sees end screen: "${txt.replace(/\s+/g, ' ').slice(0, 80)}"`);
      if (persona.mobile) await axe(name, page, 'participant-finished-mobile');
      await shot(page, `participant-${name}-finished`);
      return { left: false };
    }
    if (phase === 'voting' && (await page.locator('form.voting-panel').count())) {
      const round = ctl.round;
      if (round === lastRound) { await sleep(300); continue; }
      const [color, trend] = persona.pick(round);
      await think(...persona.thinkMs);
      if (persona.mobile && round === 0) {
        await axe(name, page, 'participant-voting-mobile');
        const fits = await page.evaluate(() => {
          const b = document.querySelector('.voting-panel button[type="submit"]').getBoundingClientRect();
          return { bottom: Math.round(b.bottom + window.scrollY), vh: window.innerHeight, scrollW: document.documentElement.scrollWidth, w: window.innerWidth };
        });
        if (fits.bottom > fits.vh) issue(name, `phone ${fits.w}x${fits.vh}: Submit button at y=${fits.bottom}, below the fold (the vote form should fit one screen)`);
        if (fits.scrollW > fits.w) issue(name, `horizontal scroll on phone: ${fits.scrollW} > ${fits.w}`);
        await shot(page, `participant-${name}-voting-r${round}`);
      }
      if (persona.incompleteFirst && round === 0) {
        await page.locator('form.voting-panel label:has(input[value="green"])').first().click();
        await page.locator('form.voting-panel button[type="submit"]').click();
        const focusedTrend = await page.evaluate(() => !!document.activeElement?.closest('.voting-panel__field--trend'));
        const errShown = await page.locator('.voting-panel__field--trend').getByText(/Pick a trend|tendance/i).isVisible();
        log(name, `submitted without trend → error shown=${errShown}, focus moved to trend=${focusedTrend}`);
        if (!errShown || !focusedTrend) issue(name, 'incomplete vote: missing error or focus not moved');
      }
      const submitLabel = await vote(page, color, trend, { keyboard: persona.keyboard });
      if (persona.keyboard && round === 0) log(name, `⌨ keyboard vote; Tab after trend landed on "${submitLabel}"`);
      log(name, `votes ${color}/${trend} on round ${round + 1}`);
      const ok = await page.locator('.vote-submitted').waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
      if (!ok && (await phaseOf(page)) === 'voting') issue(name, `no "Vote submitted" confirmation on round ${round + 1}`);
      if (ok && persona.keyboard && round === 0) {
        const f = await page.evaluate(() => document.activeElement?.className ?? '');
        if (!/vote-submitted/.test(f)) issue(name, `focus not on confirmation after keyboard vote (on "${f}")`);
      }
      if (persona.editRound === round && ok) {
        await think(800, 1500);
        const edit = page.getByRole('button', { name: /Edit my vote|Modifier/i });
        if (await edit.isVisible().catch(() => false)) {
          await edit.click();
          const [c2, t2] = persona.editTo;
          const pre = await page.locator(`.voting-panel__field--color input[value="${color}"]`).isChecked().catch(() => null);
          log(name, `✏️ edits vote (previous pick preselected=${pre}) → ${c2}/${t2}`);
          await vote(page, c2, t2);
          await page.locator('.vote-submitted').waitFor({ timeout: 10000 }).catch(() => issue(name, 'no confirmation after edit'));
        } else log(name, 'round revealed before edit was possible');
      }
      if (persona.reloadRound === round && !reloaded) {
        reloaded = true;
        log(name, '🔄 reloads the page mid-round');
        await page.reload();
        await page.locator('.join-session, .participant-view').first().waitFor({ timeout: 20000 });
        if (await page.locator('.join-session').count()) issue(name, 'asked for name again after reload');
        else {
          const ph = await phaseOf(page);
          const stillVoted = ph !== 'voting' || (await page.locator('.vote-submitted').count()) > 0;
          log(name, `back after reload, phase=${ph}, vote still recorded=${stillVoted}`);
          if (!stillVoted) issue(name, 'after reload the vote form came back although already voted');
        }
      }
      lastRound = round;
      continue;
    }
    if (phase === 'revealed' && persona.mobile && !axeSeen.has('participant-revealed-mobile')) await axe(name, page, 'participant-revealed-mobile');
    if (phase === 'intro' && persona.mobile) await axe(name, page, 'participant-intro-mobile');
    await sleep(400);
  }
}

async function expectEnabled(locator) {
  for (let i = 0; i < 50; i++) { if (await locator.isEnabled()) return; await sleep(200); }
}

/* ─── Personas (agents) ─── */
const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const personas = [
  { name: 'Alice', mobile: true, joinViaHome: false, thinkMs: [1000, 3000], pick: () => [rnd(['green', 'green', 'orange']), rnd(['up', 'stable'])] },
  { name: 'Bruno', locale: 'fr-FR', joinViaHome: true, thinkMs: [2000, 5000], pick: () => [rnd(['orange', 'red', 'red']), rnd(['down', 'stable'])] },
  { name: 'Chen', keyboard: true, thinkMs: [1500, 4000], incompleteFirst: false, pick: (r) => [r % 2 ? 'orange' : 'green', 'stable'] },
  { name: 'Dana', late: true, emptyFirst: true, thinkMs: [3000, 7000], pick: () => [rnd(['green', 'orange', 'red']), rnd(['up', 'stable', 'down'])] },
  { name: 'Eli', thinkMs: [500, 1500], incompleteFirst: true, editRound: 1, editTo: ['red', 'down'], reloadRound: 2, pick: () => ['orange', 'up'] },
  { name: 'Fatou', mobile: true, thinkMs: [2000, 4000], dropAfterRound: 2, pick: () => ['green', 'up'] },
];

/* ─── Facilitator ─── */
const fac = await newAgent('Facilitator');
const fp = fac.page;
await fp.goto(BASE);
await axe('Facilitator', fp, 'home');
await fp.getByRole('button', { name: 'Create Session' }).click();
await fp.locator('.create-session').waitFor();
await axe('Facilitator', fp, 'create');
await shot(fp, 'facilitator-create');
const categoryCount = await fp.locator('.create-session').getByText(/categories to tackle/).textContent();
log('Facilitator', `create page: ${categoryCount}`);
await fp.getByRole('button', { name: 'Start Session' }).click();
await fp.waitForURL(/#\/session\/[A-Z]{6}$/, { timeout: 20000 });
const code = fp.url().match(/session\/([A-Z]{6})/)[1];
log('Facilitator', `session created: ${code}`);
await fp.locator('.join-session input').waitFor();
await expectEnabled(fp.locator('.join-session input'));
await fp.locator('.join-session input').fill('Léa');
await fp.locator('.join-session button[type="submit"]').click();
await fp.locator('.facilitator-view--lobby').waitFor({ timeout: 20000 });
const link = `${BASE}#/session/${code}`;
const ctl = { code, link, round: -1 };

// Presenter window via the real button (popup)
const [presenter] = await Promise.all([
  fp.waitForEvent('popup'),
  fp.locator('.facilitator-view__presenter-hint .open-presenter-button').click(),
]);
watch('Presenter', presenter);
await presenter.setViewportSize({ width: 1280, height: 800 });
await presenter.locator('.presenter-view--lobby').waitFor({ timeout: 20000 });
log('Presenter', `opened, title="${await presenter.title()}"`);
await axe('Facilitator', fp, 'facilitator-lobby');
await axe('Presenter', presenter, 'presenter-lobby');

// Participants arrive (all but the late one)
const agents = {};
const runs = [];
for (const p of personas.filter((p) => !p.late)) {
  agents[p.name] = await newAgent(p.name, { locale: p.locale, mobile: p.mobile });
  runs.push(participant(agents[p.name], p, ctl).catch((e) => issue(p.name, `agent crashed: ${e.message.split('\n')[0]}`)));
  await think(300, 1200);
}
const expectedLobby = personas.filter((p) => !p.late).length + 1;
await presenter.getByText(`Participants (${expectedLobby})`).waitFor({ timeout: 30000 }).then(
  () => log('Presenter', `lobby shows ${expectedLobby} participants`),
  () => issue('Presenter', `lobby never reached ${expectedLobby} participants`));
await shot(presenter, 'presenter-lobby');
await shot(fp, 'facilitator-lobby');

// Start workshop → intro
const mainBtn = fp.locator('.facilitator-controls button');
log('Facilitator', `clicks "${(await mainBtn.innerText()).trim()}"`);
await mainBtn.click();
await presenter.locator('.presenter-view--intro').waitFor({ timeout: 15000 });
log('Presenter', 'shows the introduction');
await axe('Facilitator', fp, 'facilitator-intro');
await axe('Presenter', presenter, 'presenter-intro');
await shot(presenter, 'presenter-intro');
await think(1500, 2500); // reading out the intro

// Late joiner arrives during the intro
const late = personas.find((p) => p.late);
agents[late.name] = await newAgent(late.name, { locale: late.locale, mobile: late.mobile });
runs.push(participant(agents[late.name], late, ctl).catch((e) => issue(late.name, `agent crashed: ${e.message.split('\n')[0]}`)));
await think(4000, 5000);

log('Facilitator', `clicks "${(await mainBtn.innerText()).trim()}"`);
await mainBtn.click();

await fp.locator('.facilitator-view--voting').waitFor({ timeout: 15000 });
await fp.locator('.session-progress__label').waitFor();
const totalCats = Number((await fp.locator('.session-progress__label').innerText()).match(/of (\d+)/)?.[1] ?? 0);
log('Facilitator', `${totalCats} categories`);
const notes = ['Deploys are smooth since the new pipeline.', 'Too many meetings on Tuesdays.', 'We lack a clear roadmap.', 'Pairing helps a lot.', 'Support load is heavy.'];

for (let r = 0; r < totalCats; r++) {
  ctl.round = r;
  await fp.locator('.facilitator-view--voting').waitFor({ timeout: 15000 });
  const title = (await presenter.locator('.presenter-view__title').innerText().catch(() => '?'));
  log('Facilitator', `── round ${r + 1}/${totalCats}: ${title}`);
  if (r === 0) {
    await axe('Facilitator', fp, 'facilitator-voting');
    await axe('Presenter', presenter, 'presenter-voting');
  }
  // Facilitator votes too, after a bit
  await think(1000, 3000);
  await vote(fp, rnd(['green', 'orange']), 'stable');
  log('Facilitator', 'votes');
  // Note while people vote
  await fp.locator('.facilitator-view__notes textarea').fill(`${notes[r % notes.length]} (round ${r + 1})`);
  // Room member without the app (round 2): add then fix an offline vote
  if (r === 1) {
    await fp.getByRole('button', { name: 'Add a vote: Orange, Stable' }).click();
    await fp.getByRole('button', { name: 'Add a vote: Orange, Stable' }).click();
    await sleep(500);
    await fp.getByRole('button', { name: 'Remove a vote you added: Orange, Stable' }).click();
    log('Facilitator', '➕ adds 2 offline votes for Gaspard (no phone), removes one');
  }
  // Wait for auto-reveal; force it if stuck (someone left)
  const revealed = fp.locator('.facilitator-view--revealed');
  const auto = await revealed.waitFor({ timeout: r > 2 ? 15000 : 45000 }).then(() => true).catch(() => false);
  const gone = (await fp.locator('.live-round__voter--disconnected').allInnerTexts()).map((x) => x.split('\n')[0].trim());
  const hintLoc = fp.locator('.facilitator-controls').getByText(/^Disconnected:/);
  const hint = (await hintLoc.count()) ? await hintLoc.innerText() : '';
  log('Facilitator', `disconnected badges: ${gone.join(',') || 'none'}${hint ? ` | hint: "${hint}"` : ''}`);
  if (r > 2 && !gone.some((g) => g.includes('Fatou'))) issue('Facilitator', `round ${r + 1}: Fatou left but is not shown as disconnected`);
  if (gone.some((g) => !g.includes('Fatou'))) issue('Facilitator', `round ${r + 1}: connected voter shown as disconnected: ${gone}`);
  if (r > 2 && !hint) issue('Facilitator', `round ${r + 1}: no disconnected hint`);
  if (!auto) {
    const label = (await mainBtn.innerText()).trim();
    const waiting = await fp.locator('.live-round__voter:not(.live-round__voter--voted)').allInnerTexts();
    log('Facilitator', `⏱ no auto-reveal (waiting for: ${waiting.map((s) => s.split('\n')[0]).join(', ')}) → clicks "${label}"`);
    await mainBtn.click();
    await revealed.waitFor({ timeout: 15000 });
  } else log('Facilitator', 'round auto-revealed');
  // Cross-check counts across views
  await presenter.locator('.presenter-view--revealed').waitFor({ timeout: 15000 }).catch(() => issue('Presenter', `round ${r + 1} not revealed on presenter`));
  await presenter.locator('.vote-matrix').waitFor({ timeout: 10000 }).catch(() => {});
  const presTitle = await presenter.locator('.presenter-view__title').innerText().catch(() => '');
  const facCount = await fp.locator('.vote-matrix').first().evaluate((t) => [...t.querySelectorAll('.vote-matrix__count')].reduce((s, c) => s + Number(c.firstElementChild?.textContent ?? 0), 0)).catch(() => -1);
  const presCount = await presenter.locator('.vote-matrix').first().evaluate((t) => [...t.querySelectorAll('.vote-matrix__count')].reduce((s, c) => s + Number(c.firstElementChild?.textContent ?? 0), 0)).catch(() => -1);
  let presNames = '';
  for (let i = 0; i < 20; i++) { presNames = await presenter.locator('.presenter-view').innerText(); if (/Alice|Bruno|Chen|Eli/.test(presNames)) break; await sleep(250); }
  const namesShown = ['Alice', 'Bruno', 'Chen', 'Eli'].filter((n) => presNames.includes(n));
  log('Presenter', `"${presTitle}" | matrix total presenter=${presCount}, facilitator=${facCount}; names visible: ${namesShown.join(',') || 'none'}`);
  if (facCount !== presCount) issue('Presenter', `round ${r + 1}: matrix totals differ (presenter ${presCount} vs facilitator ${facCount})`);
  const noteLeak = presNames.includes('(round ');
  if (noteLeak) issue('Presenter', 'facilitator note visible on the presenter!');
  for (const a of Object.values(agents)) {
    if (a.ctx.pages().length === 0) continue;
    const txt = await a.page.innerText('body').catch(() => '');
    if (txt.includes('(round ')) issue(a.name, 'facilitator note visible to participant!');
  }
  if (r === 0) {
    await axe('Facilitator', fp, 'facilitator-revealed');
    await axe('Presenter', presenter, 'presenter-revealed');
    await shot(presenter, 'presenter-revealed-r1');
    await shot(fp, 'facilitator-revealed-r1');
  }
  if (r === 1) await shot(fp, 'facilitator-revealed-r2-offline');
  await think(1500, 3000); // discussion
  log('Facilitator', `clicks "${(await mainBtn.innerText()).trim()}"`);
  await mainBtn.click();
}

await fp.locator('.facilitator-view--finished').waitFor({ timeout: 20000 });
await presenter.locator('.presenter-view--finished').waitFor({ timeout: 20000 }).then(() => log('Presenter', 'shows the recap'), () => issue('Presenter', 'no recap'));
await axe('Facilitator', fp, 'facilitator-finished');
await axe('Presenter', presenter, 'presenter-finished');
await shot(presenter, 'presenter-finished');
const recapText = await presenter.locator('.presenter-view').innerText();
if (recapText.includes('(round ')) issue('Presenter', 'notes leaked in recap');

// Edit a past note, then export
const finishedNotes = fp.locator('.finished-notes textarea');
log('Facilitator', `recap has ${await finishedNotes.count()} note fields`);
await finishedNotes.first().fill('Deploys are smooth since the new pipeline. Action: document it (edited after).');
await sleep(1000);
await shot(fp, 'facilitator-finished');
const downloads = {};
for (const label of ['Download Markdown', 'Download PDF', 'Download JSON']) {
  const [d] = await Promise.all([fp.waitForEvent('download', { timeout: 20000 }), fp.getByRole('button', { name: label }).click()]);
  const file = path.join(OUT, d.suggestedFilename());
  await d.saveAs(file);
  downloads[label] = file;
  log('Facilitator', `⬇ ${label} → ${path.basename(file)} (${fs.statSync(file).size} B)`);
}
const results = await Promise.all(runs);
log('Harness', `participant agents done: ${JSON.stringify(results)}`);

// Facilitator reload: still facilitator
await fp.reload();
await fp.locator('.facilitator-view--finished').waitFor({ timeout: 20000 }).then(() => log('Facilitator', 'reload keeps facilitator role and recap'), () => issue('Facilitator', 'lost facilitator view after reload'));

// Participant tries presenter URL
const b = agents.Alice;
if (b.ctx.pages().length) {
  await b.page.goto(`${BASE}#/session/${code}/present`);
  await b.page.reload();
  const msg = await b.page.getByText(/Only the facilitator/).waitFor({ timeout: 15000 }).then(() => true, () => false);
  log('Alice', `opens presenter URL → blocked=${msg}`);
  if (!msg) issue('Alice', 'participant could open the presenter view');
}

fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify({ code, downloads, issues, axe: axeResults }, null, 2));
log('Harness', `done. ${issues.length} issue(s). Output in ${OUT}`);
await browser.close();
process.exitCode = issues.length ? 1 : 0;
