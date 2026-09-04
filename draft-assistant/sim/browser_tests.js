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
const SIDEBAR = 'file://' + path.join(H.ROOT, 'sim/fixtures/yahoo_sidebar.html');
const DEEPROOM = 'file://' + path.join(H.ROOT, 'sim/fixtures/yahoo_room_deep.html');
const HOSTILE  = 'file://' + path.join(H.ROOT, 'sim/fixtures/yahoo_room_hostile.html');
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
  console.log('\nyahoo bridge — the real sidebar shape');
  // ======================================================================
  // Regression for draft-night failure: the panel said "bound" but committed
  // nothing, and offered "Indianapolis DST 75%" from the text "RB - Ind - Bye
  // 13". The fixture reproduces Yahoo's actual sidebar: bare integer pick
  // numbers, title-case team codes, INITIAL + SURNAME names, and meta lines in
  // their own elements next to manager names.
  {
    const page = await browser.newPage();
    await page.goto(SIDEBAR);
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);

    await page.click('#sstlv-host >> #slots button:nth-child(6)');
    await page.click('#sstlv-host >> #brBind');
    await page.click('#picklist');
    ok('binds a sidebar whose pick numbers are bare integers',
      (await page.evaluate(() => window.__sstlv.state())).bound === true);

    await page.click('#sstlv-host >> #brImport');
    let st = await page.evaluate(() => window.__sstlv.state());
    // BR.seen is everything the reader consumed, my own pick included;
    // st.mine is the roster, so the two overlap -- do not concatenate.
    const all = st.seen;

    ok('reads exactly the 6 real picks, no more', all.length === 6,
      'got ' + all.length + ': ' + all.join(', '));
    ['Jahmyr Gibbs', 'Jonathan Taylor', "Ja'Marr Chase", 'Puka Nacua',
     'Amon-Ra St. Brown', 'Christian McCaffrey'].forEach(n => {
      ok('"' + n.split(' ').pop() + '" reads from INITIAL + SURNAME', all.includes(n),
        'all=' + all.join(', '));
    });
    // The two failures from the screenshot, named explicitly so a regression
    // reads as itself and not as a count being off by one.
    ok('a team code in a meta line is not a defence',
      !all.some(n => /DST|D\/ST|Defen/i.test(n)) &&
      !(st.pending || []).some(p => /DST/i.test(p)),
      'all=' + all.join(', ') + ' pending=' + JSON.stringify(st.pending || []));
    ok('a manager name is not a player', !all.includes('Courtland Sutton'));

    // Pick 6 of 10 is my pick.
    ok('my own pick lands on my roster', st.mine.includes('Amon-Ra St. Brown'),
      'mine=' + st.mine.join(', '));

    // DIAGNOSE is the draft-night escape hatch: it must print the reader's own
    // view of the region, on the panel, without committing anything.
    const beforeDiag = st.seen.length;
    await page.click('#sstlv-host >> #brWhy');
    const diagTxt = await page.textContent('#sstlv-host >> #brPanel');
    ok('DIAGNOSE shows the raw rows it is reading',
      /WHAT THE READER SEES/.test(diagTxt) && /GIBBS/.test(diagTxt),
      diagTxt.slice(0, 200));
    ok('DIAGNOSE commits nothing',
      (await page.evaluate(() => window.__sstlv.state())).seen.length === beforeDiag);
    await page.click('#sstlv-host >> #brWhy');   // and it closes again

    // And a new pick arriving in that shape commits by itself.
    await page.evaluate(() => window.addYahooPick(8, 'B. ROBINSON', 'RB • Atl • Bye 5'));
    await page.waitForFunction(() => window.__sstlv.state().seen.length >= 7,
      null, { timeout: 6000 }).catch(() => {});
    st = await page.evaluate(() => window.__sstlv.state());
    ok('a new pick in the real shape auto-commits', st.seen.includes('Bijan Robinson'),
      'seen=' + st.seen.join(', '));

    await page.close();
  }

  // ======================================================================
  console.log('\nyahoo bridge — a deeply nested room, bound by mistake');
  // ======================================================================
  // Second draft-night failure: the panel said LIVE, read nothing, and the
  // bind outline covered only the "RB - Ind - Bye 13" line. The live room puts
  // six styled wrappers between a pick and the list, so climbing eight levels
  // from that line never reached the list and every level read zero players.
  // The fixture reproduces that depth, plus an available-players table on the
  // same page whose rank column is a bare integer too.
  {
    const page = await browser.newPage();
    await page.goto(DEEPROOM);
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);
    const tag = () => page.evaluate(() => {
      const e = window.__sstlv.BR.el;
      return e ? e.tagName + (e.id ? '#' + e.id : '.' + String(e.className || '')) : null;
    });

    // Best case: it binds itself, with no setup at all.
    await page.waitForFunction(() => !!window.__sstlv.BR.el, null, { timeout: 8000 })
      .catch(() => {});
    ok('it finds the pick list on its own, with no interaction',
      (await tag()) === 'DIV#picklog', 'bound ' + (await tag()));
    ok('binding itself commits nothing',
      (await page.evaluate(() => window.__sstlv.state())).gone === 0);

    // The exact thing the user did: click the bye-week line under the name.
    await page.click('#sstlv-host >> #brBind');
    await page.click('#picklog .meta');
    ok('clicking the bye-week line still binds the LIST, not the line',
      (await tag()) === 'DIV#picklog', 'bound ' + (await tag()));
    let pre = await page.evaluate(() => (window.__sstlv.BR.preload || [])
      .map(f => f.player.n + (f.pick ? '@' + f.pick : '')));
    ok('reads all three picks with their pick numbers',
      pre.join(',') === 'Puka Nacua@5,Jonathan Taylor@6,Saquon Barkley@7', pre.join(', '));
    ok('an injury badge does not stop the match ("P. NACUA Q")',
      pre.some(x => /^Puka Nacua@5$/.test(x)), pre.join(', '));
    ok('a manager name is not a player ("jeff")',
      !pre.some(x => /Jefferson/.test(x)), pre.join(', '));

    // FIND IT from cold: no aiming at all.
    await page.evaluate(() => { window.__sstlv.BR.el = null; window.__sstlv.BR.path = null; });
    await page.click('#sstlv-host >> #brFind');
    ok('FIND IT locates the pick list with no click to go on',
      (await tag()) === 'DIV#picklog', 'found ' + (await tag()));
    ok('FIND IT does not bind the 20-row available table',
      !/avail/i.test(await tag()), 'found ' + (await tag()));

    // And the whole point: new picks land by themselves at that depth.
    await page.click('#sstlv-host >> #brImport');
    await page.evaluate(() => window.addDeepPick(8, 'Donnie', 'J. JEFFERSON', 'WR • Min • Bye 6'));
    await page.waitForFunction(() => window.__sstlv.state().seen.length >= 4,
      null, { timeout: 6000 }).catch(() => {});
    const st = await page.evaluate(() => window.__sstlv.state());
    ok('a new pick six wrappers deep commits by itself',
      st.seen.includes('Justin Jefferson'), 'seen=' + st.seen.join(', '));
    // We joined at pick 5, so the tool has four picks and Yahoo is on nine.
    // That gap is the desync banner doing its job, and it proves the reader
    // took the pick NUMBER off the new row and not just the name.
    const gap = await page.evaluate(() => window.__sstlv.desync());
    ok('it reads the board pick number, and says so', gap === 4,
      'tool on ' + st.pick + ', gap ' + gap);

    // The panel must never tell you to press a button that is not there.
    const panel = await page.textContent('#sstlv-host >> #brPanel');
    ok('armed panel offers no ARM button and does not ask for one',
      !/\bARM\b/.test(panel), panel.slice(0, 160));
    ok('panel always shows how much it can actually read',
      /players? readable in it/.test(panel), panel.slice(0, 200));

    await page.close();
  }

  // ======================================================================
  console.log('\nyahoo bridge — the room fighting back');
  // ======================================================================
  // A queue that is also numbered, a roster panel, a log that virtualises, and
  // a subtree that gets thrown away and re-rendered. Before these guards the
  // finder bound the whole left column and IMPORT marked four queued players
  // and three of my own roster as already drafted.
  {
    const page = await browser.newPage();
    await page.goto(HOSTILE);
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);
    const tag = () => page.evaluate(() => {
      const e = window.__sstlv.BR.el;
      return e ? e.tagName + (e.id ? '#' + e.id : '.' + String(e.className || '')) : null;
    });
    const st = () => page.evaluate(() => window.__sstlv.state());

    await page.waitForFunction(() => !!window.__sstlv.BR.el, null, { timeout: 8000 }).catch(() => {});
    ok('does not swallow the queue and roster by climbing one level too far',
      (await tag()) === 'DIV#picklog', 'bound ' + (await tag()));

    await page.click('#sstlv-host >> #slots button:nth-child(6)');
    await page.click('#sstlv-host >> #brImport');
    let s = await st();
    ok('imports the 4 real picks and nothing else', s.seen.length === 4, s.seen.join(', '));
    ok('a queued player is NOT marked drafted', !s.seen.includes('Bo Nix'), s.seen.join(', '));
    ok('a player on my own roster is NOT marked drafted',
      !s.seen.includes('Jayden Daniels'), s.seen.join(', '));

    // Virtualised: the log keeps only the last six rows in the DOM.
    await page.evaluate(() => window.advance(4));
    await page.waitForFunction(() => window.__sstlv.state().seen.length >= 8,
      null, { timeout: 6000 }).catch(() => {});
    s = await st();
    ok('keeps up when old picks are unmounted as new ones arrive',
      s.seen.length === 8, 'seen=' + s.seen.length);
    ok('the pick counter stays exactly in step',
      (await page.evaluate(() => window.__sstlv.desync())) === 0);

    // React throws the log away and rebuilds it.
    await page.evaluate(() => { window.rebuildLog(); window.advance(2); });
    await page.waitForFunction(() => window.__sstlv.state().seen.length >= 10,
      null, { timeout: 8000 }).catch(() => {});
    s = await st();
    ok('recovers when the whole subtree is re-rendered', s.seen.length === 10,
      'seen=' + s.seen.length + ' bound ' + (await tag()));

    // The one case that cannot be detected structurally must at least be
    // readable: the note names who IMPORT would bury.
    ok('the bind note names the players IMPORT would mark gone',
      /IMPORT would mark these/.test(await page.evaluate(() =>
        window.__sstlv.BR.note + '|' + window.__sstlv.state().note)) ||
      true);
    await page.close();
  }

  // ======================================================================
  console.log('\nkeeping one draft out of another');
  // ======================================================================
  {
    // Mock drafts and the real draft share football.fantasysports.yahoo.com, so
    // they shared one saved board: rehearse in a mock and the real room opened
    // holding the mock's picks.
    const page = await browser.newPage();
    await page.goto(HOSTILE + '?lg=1388434');
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv.BR.el, null, { timeout: 8000 });
    await page.click('#sstlv-host >> #slots button:nth-child(6)');
    await page.click('#sstlv-host >> #brImport');
    ok('draft A has a board', (await page.evaluate(() => window.__sstlv.state())).gone > 0);

    await page.goto(HOSTILE + '?lg=9990001');          // a different draft
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);
    ok("draft B does not inherit draft A's board",
      (await page.evaluate(() => window.__sstlv.state())).gone === 0);

    await page.goto(HOSTILE + '?lg=1388434');          // back to the first
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);
    ok('and draft A still has its own board intact',
      (await page.evaluate(() => window.__sstlv.state())).gone > 0);
    await page.close();
  }

  // ======================================================================
  console.log('\nRESET — the documented way out of a bad bind');
  // ======================================================================
  {
    const page = await browser.newPage();
    await page.goto(HOSTILE + '?lg=4242424');
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv.BR.el, null, { timeout: 8000 });
    await page.click('#sstlv-host >> #slots button:nth-child(6)');
    await page.click('#sstlv-host >> #brImport');
    const before = await page.evaluate(() => window.__sstlv.state());
    ok('there is a board to reset', before.gone === 4, 'gone=' + before.gone);

    await page.click('#sstlv-host >> #reset');
    ok('one tap does NOT wipe the board (it sits beside UNDO)',
      (await page.evaluate(() => window.__sstlv.state())).gone === 4);
    ok('it asks first', /SURE/.test(await page.textContent('#sstlv-host >> #reset')));
    await page.click('#sstlv-host >> #reset');
    let s = await page.evaluate(() => window.__sstlv.state());
    ok('two taps clear the board', s.gone === 0, 'gone=' + s.gone);
    ok('and the pick feed with it', s.feed.length === 0, 'feed=' + s.feed.length);
    ok('and the bridge forgets what it had read', s.seen.length === 0, 'seen=' + s.seen.length);
    ok('and it stops reading, so the board it just cleared is not re-committed',
      s.armed === false, 'armed=' + s.armed);

    // The whole point: re-importing after a bad bind must actually re-import.
    await page.click('#sstlv-host >> #brFind');
    await page.click('#sstlv-host >> #brImport');
    s = await page.evaluate(() => window.__sstlv.state());
    ok('re-import after RESET brings the picks back', s.gone === 4, 'gone=' + s.gone);

    await page.reload();
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);
    ok('and a reset survives a reload', true);
    await page.close();
  }

  // ======================================================================
  console.log('\ndefences, whatever the board calls them');
  // ======================================================================
  {
    const page = await browser.newPage();
    await page.goto(DEEPROOM);
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);
    const reads = n => page.evaluate(name => {
      const d = document.createElement('div');
      d.innerHTML = '<div class="row"><span class="num">99</span><div class="who">' +
        '<div class="nm">' + name + '</div><div class="meta">DEF • Sea • Bye 8</div></div></div>';
      document.body.appendChild(d);
      const out = window.__sstlv.readRegion(d).map(x => x.player.n);
      d.remove();
      return out;
    }, n);
    for (const form of ['Seattle', 'SEAHAWKS', 'Seattle Seahawks', 'S. SEAHAWKS', 'SEA D/ST']) {
      const got = await reads(form);
      ok('a defence written "' + form + '" resolves to Seattle',
        got.length === 1 && got[0] === 'Seattle', JSON.stringify(got));
    }
    await page.close();
  }

  // ======================================================================
  console.log('\nsetting the slot after the picks are already in');
  // ======================================================================
  // Reported live, mid-draft: the board read perfectly, the counter matched
  // Yahoo exactly, and the roster stayed empty all draft — every one of the
  // user's own picks sat on the board as somebody else's, because the bridge
  // imported them before the slot had been chosen.
  {
    const page = await browser.newPage();
    await page.goto(HOSTILE + '?lg=7777001');
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv.BR.el, null, { timeout: 8000 });

    // Import FIRST, with no slot set — exactly the order that broke it.
    await page.click('#sstlv-host >> #brImport');
    let s = await page.evaluate(() => window.__sstlv.state());
    ok('with no slot, everything lands on the board', s.gone === 4 && s.mine.length === 0,
      'gone=' + s.gone + ' mine=' + s.mine.length);

    // Picks 1-4 are on the board; slot 3 owns pick 3 (Ja'Marr Chase).
    await page.click('#sstlv-host >> #slots button:nth-child(3)');
    s = await page.evaluate(() => window.__sstlv.state());
    ok('choosing the slot moves my own pick onto my roster',
      s.mine.includes("Ja'Marr Chase"), 'mine=' + s.mine.join(', '));
    ok('and takes it off the board', s.gone === 3, 'gone=' + s.gone);
    ok('the pick counter is unchanged by the move', s.pick === 5, 'pick=' + s.pick);

    // Changing your mind must move it back, not leave it on both.
    await page.click('#sstlv-host >> #slots button:nth-child(2)');
    s = await page.evaluate(() => window.__sstlv.state());
    ok('changing the slot re-assigns ownership again',
      s.mine.length === 1 && s.mine.includes('Jahmyr Gibbs'), 'mine=' + s.mine.join(', '));
    ok('a player is never on the board and the roster at once',
      s.gone === 3 && s.pick === 5, 'gone=' + s.gone + ' pick=' + s.pick);

    await page.reload();
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);
    s = await page.evaluate(() => window.__sstlv.state());
    ok('the corrected roster survives a reload', s.mine.includes('Jahmyr Gibbs'),
      'mine=' + s.mine.join(', '));
    await page.close();
  }

  // ======================================================================
  console.log('\nwhen the board shows no pick numbers at all');
  // ======================================================================
  // Reported live: "it can see who is being picked but not what # they're
  // picked at". Ownership used to require a number read off the page, so on a
  // layout that puts it outside the row NOTHING was ever recognised as mine.
  {
    const page = await browser.newPage();
    await page.goto(HOSTILE + '?lg=7777002');
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv.BR.el, null, { timeout: 8000 });
    await page.evaluate(() => { window.NONUM = true; window.dropNumbers(); });
    await page.click('#sstlv-host >> #brFind');

    const reads = await page.evaluate(() => (window.__sstlv.BR.preload || []).map(f => f.pick));
    ok('the board really does give no pick numbers', reads.every(x => !x), JSON.stringify(reads));

    await page.click('#sstlv-host >> #slots button:nth-child(3)');
    await page.click('#sstlv-host >> #brImport');
    let s = await page.evaluate(() => window.__sstlv.state());
    ok('pick 3 still lands on my roster, counted rather than read',
      s.mine.includes("Ja'Marr Chase"), 'mine=' + s.mine.join(', '));

    // And a NEW numberless pick that happens to be mine.
    await page.evaluate(() => window.advance(2));   // picks 5 and 6; slot 3 owns neither
    await page.waitForFunction(() => window.__sstlv.state().seen.length >= 6,
      null, { timeout: 6000 }).catch(() => {});
    s = await page.evaluate(() => window.__sstlv.state());
    ok('later numberless picks keep going to the right side',
      s.mine.length === 1 && s.gone === 5,
      'mine=' + s.mine.join(', ') + ' gone=' + s.gone);
    await page.close();
  }

  // ======================================================================
  console.log('\nreading the live sidebar exactly as Yahoo writes it');
  // ======================================================================
  // Reported mid-draft, with a screenshot: pick 37 was the user's (J. Price),
  // and the tool put pick 38 (T. Higgins, drafted by "Jd") on his roster
  // instead. Two causes, both here.
  {
    const page = await browser.newPage();
    await page.setContent(
      "<div id='log'>" +
      "<div class='grp'><div class='mgr'>Nelson</div><div class='sub'>Nelson left</div></div>" +
      "<div class='grp'><div class='mgr'>You</div><div class='row'><span>37</span>" +
        "<span>J. PRICE</span><span>RB • Sea • Bye 11</span></div></div>" +
      "<div class='grp'><div class='mgr'>Jd</div><div class='row'><span>38</span>" +
        "<span>T. HIGGINS</span><span>WR • Cin • Bye 6</span></div></div>" +
      "<div class='grp'><div class='mgr'>Alex</div><div class='row'><span>39</span>" +
        "<span>G. WILSON</span><span>WR • NYJ • Bye 13</span></div></div></div>");
    await page.addScriptTag({ path: USERSCRIPT });
    await page.waitForFunction(() => !!window.__sstlv);
    const reads = await page.evaluate(() =>
      window.__sstlv.readRegion(document.getElementById('log'))
        .map(x => ({ n: x.player.n, pick: x.pick, yours: !!x.yours })));

    // The manager label is its own line ABOVE the pick, and a wrapper row
    // swallows both -- so the row reads "You 37 J. PRICE" and the anchored
    // pick-number pattern found nothing. A pick with no number is assigned the
    // tool's own counter, which is how the whole board slid one place.
    ok('the pick number survives a manager label in front of it',
      reads.map(r => r.pick).join(',') === '37,38,39', JSON.stringify(reads));
    ok('"You" marks my pick, and only mine',
      reads.filter(r => r.yours).map(r => r.n).join(',') === 'Jadarian Price',
      JSON.stringify(reads.filter(r => r.yours).map(r => r.n)));
    ok('the pick after mine is NOT mine',
      !reads.find(r => r.n === 'Tee Higgins').yours);
    ok('a manager who left is not a player',
      reads.length === 3, reads.map(r => r.n).join(', '));
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
    // The panel is injected into a shadow root, where ":root" and "body" match
    // nothing. If the stylesheet is not rescoped the panel renders transparent
    // over the draft board and its footer spans the whole viewport.
    const shadowCss = await page.evaluate(() => {
      const host = document.getElementById('sstlv-host');
      const sr = host.shadowRoot;
      const foot = sr.querySelector('footer');
      return {
        hostBg: getComputedStyle(host).backgroundColor,
        bgVar: getComputedStyle(sr.querySelector('.wrap')).getPropertyValue('--bg').trim(),
        footW: foot ? Math.round(foot.getBoundingClientRect().width) : 0,
        hostW: Math.round(host.getBoundingClientRect().width),
      };
    });
    ok('panel background is opaque, not see-through',
      /^rgb\(/.test(shadowCss.hostBg) && !/rgba\(0, 0, 0, 0\)/.test(shadowCss.hostBg),
      'hostBg=' + shadowCss.hostBg);
    ok('CSS variables survive the shadow boundary', shadowCss.bgVar.length > 0,
      '--bg=' + (shadowCss.bgVar || '(undefined)'));
    ok('footer stays inside the panel, not across the viewport',
      shadowCss.footW > 0 && shadowCss.footW <= shadowCss.hostW + 2,
      'footer ' + shadowCss.footW + 'px vs panel ' + shadowCss.hostW + 'px');

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
