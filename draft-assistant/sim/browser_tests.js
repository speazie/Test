// End-to-end tests in a real browser (Chromium via Playwright).
//
// The node sims stub the DOM, so they cannot catch anything about shadow roots,
// MutationObservers, localStorage or real key events — which is most of what
// the input work is. These tests drive the actual UI the way a thumb would.
//
//   node sim/browser_tests.js
const path = require('path');
const { chromium } = require('playwright');
const H = require('./harness');

H.readFreshHtml();            // refuse to test a stale build

const TOOL = 'file://' + path.join(H.ROOT, 'tool/live-draft-assistant.html');
const ROOM = 'file://' + path.join(H.ROOT, 'sim/fixtures/mock_draft_room.html');
const PRACTICE = 'file://' + path.join(H.ROOT, 'tool/practice.html');
const USERSCRIPT = path.join(H.ROOT, 'tool/yahoo-draft-bridge.user.js');

let pass = 0, fail = 0;
function ok(label, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + label); }
  else { fail++; console.log('  FAIL ' + label + (detail ? '\n         ' + detail : '')); }
}

(async () => {
  const browser = await chromium.launch();

  // ======================================================================
  console.log('\nstandalone tool — typing replaced by fuzzy match');
  // ======================================================================
  {
    const page = await browser.newPage();
    await page.goto(TOOL);
    await page.waitForFunction(() => !!document.getElementById('fast'));

    // Choose a draft slot the way the user does.
    await page.click('#slots button:nth-child(6)');

    // "stfd" then Enter must mark Stafford gone — four keystrokes, no name.
    await page.fill('#fast', 'stfd');
    const firstHit = await page.textContent('#fastRes .fr.sel .fn');
    ok('"stfd" surfaces Stafford as top hit', /Stafford/.test(firstHit || ''), 'got: ' + firstHit);
    await page.press('#fast', 'Enter');
    const goneCount = await page.evaluate(() => document.getElementById('curPick').textContent);
    ok('Enter commits the pick (counter -> 2)', goneCount === '2', 'counter=' + goneCount);
    const boxNowEmpty = await page.inputValue('#fast');
    ok('search box clears itself for the next pick', boxNowEmpty === '');

    // Shift+Enter takes a player for me rather than marking him gone.
    await page.fill('#fast', 'jsn');
    const jsnHit = await page.textContent('#fastRes .fr.sel .fn');
    ok('"jsn" surfaces Smith-Njigba', /Smith-Njigba/.test(jsnHit || ''), 'got: ' + jsnHit);
    await page.press('#fast', 'Shift+Enter');
    const rosterCount = await page.textContent('#cnt');
    ok('Shift+Enter adds to my roster', /^1/.test(rosterCount || ''), 'roster=' + rosterCount);

    // The likely-next panel: one tap, no typing at all.
    const beforeTap = await page.textContent('#curPick');
    await page.click('#likely .lkb:first-child');
    const afterTap = await page.textContent('#curPick');
    ok('tapping "going next" advances the board',
      Number(afterTap) === Number(beforeTap) + 1, beforeTap + ' -> ' + afterTap);

    // Drop-off view: what waiting until the next pick actually costs.
    // Three picks are in, so from slot 6 the next one is pick 6.
    const dropText = await page.textContent('#drop');
    ok('drop-off view names the next pick', /COST OF WAITING TO 6/.test(dropText || ''),
      'got: ' + (dropText || '').slice(0, 60));
    const chips = await page.locator('#drop .dchip').count();
    ok('drop-off shows a chip per position', chips === 4, 'chips=' + chips);

    // Per-row undo in the feed.
    const feedRows = await page.locator('#feed .fdrow').count();
    ok('every entry appears in the pick feed', feedRows === 3, 'rows=' + feedRows);
    await page.click('#feed .fdrow:first-child button');
    const afterUndo = await page.textContent('#curPick');
    ok('feed UNDO rolls a pick back',
      Number(afterUndo) === Number(afterTap) - 1, afterTap + ' -> ' + afterUndo);

    // Persistence. This is the bug that lost a whole board on a refresh.
    const before = await page.textContent('#curPick');
    await page.reload();
    await page.waitForFunction(() => !!document.getElementById('fast'));
    const after = await page.textContent('#curPick');
    ok('board survives a page reload', before === after, before + ' -> ' + after);
    const slotKept = await page.getAttribute('#slots button:nth-child(6)', 'aria-pressed');
    ok('draft slot survives a reload', slotKept === 'true');

    await page.close();
  }

  // ======================================================================
  console.log('\nyahoo bridge — reading a live board');
  // ======================================================================
  {
    const page = await browser.newPage();
    await page.goto(ROOM);
    await page.evaluate(() => window.addPick(4));      // draft is already underway
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);

    ok('panel mounts in a shadow root, isolated from the page',
      await page.evaluate(() => !!document.getElementById('sstlv-host').shadowRoot));

    // Set the draft slot, as the user does before the draft starts. Without it
    // the tool cannot know which pick numbers are his.
    await page.click('#sstlv-host >> #slots button:nth-child(6)');

    // Bind the pick log by clicking it, exactly as on draft night.
    await page.click('#sstlv-host >> #brBind');
    await page.click('#picklog');
    const bound = await page.evaluate(() => window.__sstlv.state());
    ok('binding finds the picks already made', bound.bound === true);

    // THE test: import the log, and confirm the available list was not touched.
    await page.click('#sstlv-host >> #brImport');
    let st = await page.evaluate(() => window.__sstlv.state());
    ok('imports exactly the 4 picks on the board', st.gone + st.mine.length === 4,
      'gone=' + st.gone + ' mine=' + st.mine.length);
    ok('does NOT consume the available-players list',
      !st.seen.includes('Saquon Barkley') && !st.seen.includes('Puka Nacua'),
      'seen=' + st.seen.join(', '));

    // New picks must land with no user action at all.
    await page.evaluate(() => window.addPick(1));
    await page.waitForFunction(() => window.__sstlv.state().gone + window.__sstlv.state().mine.length >= 5,
      null, { timeout: 5000 }).catch(() => {});
    st = await page.evaluate(() => window.__sstlv.state());
    ok('a new pick is read automatically', st.gone + st.mine.length === 5,
      'total=' + (st.gone + st.mine.length));

    // Abbreviated and punctuated names off the board.
    await page.evaluate(() => window.addPick(5));
    await page.waitForFunction(() => window.__sstlv.state().gone + window.__sstlv.state().mine.length >= 9,
      null, { timeout: 5000 }).catch(() => {});
    st = await page.evaluate(() => window.__sstlv.state());
    const got = st.seen;
    ok('"J. Chase" resolves to Ja\'Marr Chase', got.includes("Ja'Marr Chase"), got.join(', '));
    ok('"A.J. Brown" resolves', got.includes('A.J. Brown'));
    ok('"Amon-Ra St. Brown" resolves', got.includes('Amon-Ra St. Brown'));
    ok('"Brian Thomas Jr." resolves', got.includes('Brian Thomas Jr.'));
    ok('"M. Stafford" resolves via team+position', got.includes('Matthew Stafford'));

    // Pick 1.06 is slot 6 — my pick. It must land on MY roster, not the board.
    ok('my own pick (1.06) goes to my roster', st.mine.includes('Brian Thomas Jr.'),
      'mine=' + st.mine.join(', '));

    // The counter must track the board.
    ok('pick counter matches the board', st.pick === 11, 'pick=' + st.pick);

    await page.close();
  }

  // ======================================================================
  console.log('\nyahoo bridge — refusing to destroy the board');
  // ======================================================================
  {
    const page = await browser.newPage();
    await page.goto(ROOM);
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);

    // Bind the AVAILABLE list by mistake — the catastrophic operator error.
    await page.click('#sstlv-host >> #brBind');
    await page.click('#available');
    await page.click('#sstlv-host >> #brArm');       // arm WITHOUT importing
    // Now a burst appears in that region.
    await page.evaluate(() => {
      const ul = document.getElementById('available');
      [['Chris Olave','NO - WR'],['Tee Higgins','CIN - WR'],['Jayden Daniels','WAS - QB'],
       ['Trey McBride','ARI - TE'],['Kyren Williams','LAR - RB'],['Nico Collins','HOU - WR'],
       ['Ladd McConkey','LAC - WR']].forEach(([n,m]) => {
        const li = document.createElement('li');
        li.innerHTML = n + ' <span class="meta">' + m + '</span>';
        ul.appendChild(li);
      });
    });
    await page.waitForTimeout(2200);
    const st = await page.evaluate(() => window.__sstlv.state());
    ok('a burst of names pauses instead of committing', st.paused === true, 'paused=' + st.paused);
    ok('nothing was committed during the burst', st.gone === 0, 'gone=' + st.gone);
    ok('it says why', /available list/i.test(st.note || ''), 'note=' + st.note);

    await page.close();
  }

  // ======================================================================
  console.log('\nmobile — a phone must not get a 28-pixel slit');
  // ======================================================================
  {
    const { devices } = require('playwright');
    const ctx = await browser.newContext({ ...devices['iPhone 13'] });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', e => errs.push(String(e).slice(0, 120)));

    // The standalone tool first: it is the offline fallback and may well be
    // used on a phone.
    await page.goto(TOOL);
    await page.waitForFunction(() => !!document.getElementById('fast'));
    ok('standalone tool fits the viewport',
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 2),
      'scrollWidth ' + await page.evaluate(() => document.documentElement.scrollWidth));

    // Then the practice page, which mounts the panel the same way the
    // userscript does on Yahoo.
    await page.goto(PRACTICE);
    await page.waitForFunction(() => !!window.__sstlv, null, { timeout: 10000 });
    ok('draft room keeps full width (not squeezed by panel padding)',
      await page.evaluate(() => document.querySelector('.cols').getBoundingClientRect().width > 300));
    ok('panel starts closed on a phone',
      await page.evaluate(() => document.getElementById('sstlv-host').style.display === 'none'));
    const tab = page.locator('#sstlv-tab');
    await tab.tap();
    ok('tab opens it full-width',
      await page.evaluate(() => {
        const h = document.getElementById('sstlv-host');
        return h.style.display !== 'none' && h.getBoundingClientRect().width > 350;
      }));

    // Binding by touch: the picker must step out of the way and come back.
    await page.locator('#sstlv-host >> #slots button').nth(5).tap();
    await tab.tap();
    for (let i = 0; i < 4; i++) await page.locator('#pStep').tap();
    await tab.tap();
    await page.locator('#sstlv-host >> #brBind').tap();
    await page.waitForTimeout(250);
    ok('picker hides the panel so the board is tappable',
      await page.evaluate(() => document.getElementById('sstlv-host').style.display === 'none'));
    await page.locator('#pLog tr').nth(1).locator('td').nth(1).tap();
    await page.waitForTimeout(350);
    ok('panel returns after the bind tap',
      await page.evaluate(() => document.getElementById('sstlv-host').style.display !== 'none'));
    await page.locator('#sstlv-host >> #brImport').tap();
    const mst = await page.evaluate(() => window.__sstlv.state());
    ok('imports by touch', mst.gone + mst.mine.length === 4, 'got ' + (mst.gone + mst.mine.length));
    ok('no page errors on mobile', errs.length === 0, errs.join(' | '));
    ok('self-diagnostic banner clears on a healthy load',
      await page.evaluate(() => {
        const c = document.getElementById('jsCheck');
        return !c || getComputedStyle(c).display === 'none';
      }));
    await ctx.close();

    // The failure the user actually hit: a preview that does not run scripts.
    // The page must SAY so rather than looking like dead buttons.
    const noJs = await browser.newContext({ ...devices['iPhone 13'], javaScriptEnabled: false });
    const np = await noJs.newPage();
    await np.goto(PRACTICE);
    const banner = (await np.textContent('#jsCheck')) || '';
    ok('with scripts disabled the page explains itself',
      /JavaScript has not run/.test(banner) && /Open in Safari/.test(banner),
      banner.slice(0, 80));
    await noJs.close();
  }

  await browser.close();
  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
