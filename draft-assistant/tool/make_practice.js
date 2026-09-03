// Generate tool/practice.html — a rehearsal of the whole draft-night flow that
// installs nothing.
//
// One file, opened by double-clicking it. Left/centre: a fake draft room that
// drafts itself. Right: the REAL assistant panel, the real engine, the real
// board reader, mounted exactly as the userscript mounts it on Yahoo. Only the
// draft room is fake — the assistant learns the picks by reading the room, the
// same way it will read Yahoo. If the rehearsal works, the mechanism works.
//
// Built from the same sources as both other artifacts, so the three cannot
// drift apart.
//
//   node tool/make_practice.js <sha256-of-sources>
const fs = require('fs');
const path = require('path');
const mountShim = require('./mount_wrapper.js');

const ROOT = path.resolve(__dirname, '..');
const stamp = process.argv[2];
if (!stamp) { console.error('make_practice: missing source hash'); process.exit(1); }

const shell = fs.readFileSync(path.join(ROOT, 'tool/shell_html.txt'), 'utf8');
const players = fs.readFileSync(path.join(ROOT, 'data/players.json'), 'utf8');
const engineRaw = fs.readFileSync(path.join(ROOT, 'tool/engine_js.txt'), 'utf8');
const bridge = fs.readFileSync(path.join(ROOT, 'tool/yahoo_bridge_js.txt'), 'utf8');
const room = fs.readFileSync(path.join(ROOT, 'tool/practice_room.txt'), 'utf8');
const driver = fs.readFileSync(path.join(ROOT, 'tool/practice_driver.txt'), 'utf8');

const css = shell.split('<style>')[1].split('</style>')[0];
const body = shell.split('<body>')[1].split('<script>')[0];
const engine = engineRaw.split('</script>')[0];

if (!css.trim() || !body.trim() || !engine.trim() || !room.trim()) {
  console.error('make_practice: failed to slice a source');
  process.exit(1);
}

// The practice page keeps its own localStorage keys, so a rehearsal can never
// leave a half-finished board behind that confuses the real tool on draft
// night. Both the engine's key and the bridge's key are renamed.
function namespaceKeys(engineSrc, bridgeSrc) {
  const e = engineSrc.replace('const LSKEY="sstlv-live-v2";',
                              'const LSKEY="sstlv-PRACTICE-live";');
  const b = bridgeSrc.replace('const BR_KEY = "sstlv-bridge-v1";',
                              'const BR_KEY = "sstlv-PRACTICE-bridge";');
  if (e === engineSrc || b === bridgeSrc) {
    console.error('make_practice: storage keys not found - practice would share ' +
                  'state with the real tool. Refusing to build.');
    process.exit(1);
  }
  return [e, b];
}
const [engineScoped, scoped] = namespaceKeys(engine, bridge);

const script = `
(function () {
  "use strict";
${mountShim({ css, body, padBody: true })}

  const PLAYERS = ${players.trim()};
  var BUILD_STAMP = "sha256:${stamp}";

${engineScoped}

${scoped}

${driver}

  // Everything ran. Clear the diagnostic banner.
  (function () {
    var c = document.getElementById("jsCheck");
    if (c) c.style.display = "none";
  })();
})();
`;

const out = room.replace('</body>', '<script>' + script + '</script>\n</body>');

const dest = path.join(ROOT, 'tool/practice.html');
fs.writeFileSync(dest, out);
console.log('  practice   -> tool/practice.html (' + out.length + ' bytes)');
