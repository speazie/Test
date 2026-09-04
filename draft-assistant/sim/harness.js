// Shared loader for every simulation. Three jobs:
//
//   1. Find the built tool without a hardcoded absolute path.
//   2. REFUSE TO RUN IF THE BUILD IS STALE. Bug #7 in the README was an entire
//      optimisation run against stale code that reported "no effect". The build
//      stamps a hash of its three sources into the output; we recompute that
//      hash here and throw if it does not match.
//   3. Provide the DOM stub the tool needs to run headless.
//
// Every sim requires this file. There is no other way to load the engine, so
// there is no path by which a sim can silently test an old build.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const BUILT = path.join(ROOT, 'tool', 'live-draft-assistant.html');
const SOURCES = [
  path.join(ROOT, 'tool', 'shell_html.txt'),
  path.join(ROOT, 'data', 'players.json'),
  path.join(ROOT, 'tool', 'engine_js.txt'),
];

function sourceHash() {
  return crypto
    .createHash('sha256')
    .update(Buffer.concat(SOURCES.map(f => fs.readFileSync(f))))
    .digest('hex');
}

function die(msg) {
  console.error('\n' + '='.repeat(68));
  console.error('STALE BUILD — REFUSING TO RUN');
  console.error('='.repeat(68));
  console.error(msg);
  console.error('\nRun ./build.sh from the project root, then try again.');
  console.error('='.repeat(68) + '\n');
  process.exit(1);
}

// ---- freshness gate ----
function readFreshHtml() {
  if (!fs.existsSync(BUILT)) die('No built tool at ' + BUILT + '.');
  const html = fs.readFileSync(BUILT, 'utf8');
  const m = html.match(/var BUILD_STAMP\s*=\s*"sha256:([0-9a-f]{64})"/);
  if (!m) {
    die('The built file carries no BUILD_STAMP. It was produced by an older\n' +
        'build.sh, or edited by hand. Either way it cannot be trusted to match\n' +
        'tool/engine_js.txt.');
  }
  const want = sourceHash();
  if (m[1] !== want) {
    die('tool/live-draft-assistant.html was built from different sources than\n' +
        'the ones on disk now.\n\n' +
        '  built from: ' + m[1].slice(0, 16) + '…\n' +
        '  sources now: ' + want.slice(0, 16) + '…\n\n' +
        'You edited a source and did not rebuild. Every number a sim printed\n' +
        'against this file would describe code you are no longer shipping.');
  }
  return html;
}

// ---- DOM stub ----
// The tool renders on every state change, so the engine cannot be exercised
// without one. Deliberately permissive: an unimplemented DOM call should not
// be what breaks a simulation run.
function stubEl() {
  const el = {
    className: '', id: '', textContent: '', innerHTML: '', value: '',
    title: '', placeholder: '', hidden: false, offsetTop: 0, offsetHeight: 0,
    scrollTop: 0, selectionStart: 0, children: [], style: {}, dataset: {},
    classList: {
      _s: new Set(),
      add(...c) { c.forEach(x => this._s.add(x)); },
      remove(...c) { c.forEach(x => this._s.delete(x)); },
      toggle(c, on) { on ? this._s.add(c) : this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    setAttribute() {}, removeAttribute() {}, getAttribute() { return null; },
    appendChild(c) { this.children.push(c); return c; },
    append(...c) { this.children.push(...c); },
    prepend(...c) { this.children.unshift(...c); },
    insertBefore(c) { this.children.push(c); return c; },
    removeChild(c) { return c; },
    remove() {}, focus() {}, blur() {}, select() {}, click() {},
    scrollIntoView() {}, getBoundingClientRect() {
      return { top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0 };
    },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return stubEl(); },
    querySelectorAll() { return []; },
    closest() { return null; },
    contains() { return false; },
  };
  // Inline handler assignment (el.onclick = ...) must not throw or retain.
  for (const h of ['onclick', 'oninput', 'onkeydown', 'onkeyup', 'onfocus',
                   'onblur', 'onchange', 'onsubmit', 'onpointerdown']) {
    Object.defineProperty(el, h, { set() {}, get() { return null; }, configurable: true });
  }
  return el;
}

function installDom() {
  const store = new Map();
  global.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k),
    clear: () => store.clear(),
  };
  global.window = {
    localStorage: global.localStorage,
    storage: { set: async () => {}, get: async () => null },
    scrollTo() {}, addEventListener() {}, removeEventListener() {},
    matchMedia: () => ({ matches: false, addEventListener() {}, addListener() {} }),
    setTimeout: (fn) => { return 0; },   // never fire: sims are synchronous
    clearTimeout() {},
    location: { href: '', protocol: 'file:' },
  };
  global.document = {
    body: stubEl(),
    documentElement: stubEl(),
    getElementById: () => stubEl(),
    createElement: () => stubEl(),
    createTextNode: () => stubEl(),
    querySelector: () => stubEl(),
    querySelectorAll: () => [],
    addEventListener() {}, removeEventListener() {},
    activeElement: null,
  };
  global.alert = () => {};
  global.confirm = () => true;
  global.navigator = { clipboard: { writeText: async () => {} }, userAgent: 'node' };
  global.setTimeout = global.setTimeout || (() => 0);
}

// ---- public API ----
// exports: comma-separated names to lift out of the engine's scope.
// Names added after the original bundle are looked up defensively so this
// harness still loads an older build (e.g. when bisecting).
const opt = n => n + ':(typeof ' + n + "!=='undefined'?" + n + ':null)';
const DEFAULT_EXPORTS =
  'PLAYERS,recommend,markGone,takeIt,unTake,unGone,undo,runMock,fillRoster,' +
  'myPicks,curPick,nextMine,isMyTurn,shortfall,pace,' +
  [opt('nameScore'), opt('searchPlayers'), opt('likelyNext'), opt('norm'),
   opt('matchBoardName'), opt('ingestPick'), opt('setBoardPick'), opt('desync'),
   opt('undoPick'), opt('reconcile'), opt('storageWorks'),
   'getFeed:()=>(typeof feed!=="undefined"?feed:[])'].join(',') + ',' +
  'setSlot:v=>{slot=v},getMine:()=>mine,getGone:()=>gone,getHist:()=>hist';

let CACHED_JS = null;

function engineSource() {
  if (CACHED_JS === null) {
    const html = readFreshHtml();
    const parts = html.split('<script>');
    if (parts.length !== 2) {
      die('Expected exactly one <script> block in the built tool, found ' +
          (parts.length - 1) + '. The sims extract the engine by splitting on\n' +
          'that tag; more than one breaks every simulation.');
    }
    CACHED_JS = parts[1].split('</script>')[0];
  }
  return CACHED_JS;
}

// Build an engine instance from an explicit source string. Used by the
// fingerprint tool to load a deliberately-old build for comparison.
function freshFrom(js, cfg, exports, plan) {
  installDom();
  const names = exports || DEFAULT_EXPORTS;
  return new Function('CFG_OVERRIDE', 'PLAN_OVERRIDE',
    js + '\nreturn {' + names + '};')(cfg, plan);
}

// Build a fresh, isolated instance of the CURRENT build. Gated on freshness.
// cfg: optional CFG_OVERRIDE object for the optimiser.
function fresh(cfg, exports, plan) {
  return freshFrom(engineSource(), cfg, exports, plan);
}

module.exports = {
  fresh, freshFrom, engineSource, sourceHash, readFreshHtml,
  installDom, ROOT, BUILT, stubEl,
};
