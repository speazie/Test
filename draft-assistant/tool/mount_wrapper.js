// The mount shim shared by BOTH generated artifacts (the Yahoo userscript and
// the practice page). It was duplicated in the two generators; a mobile layout
// bug had to be fixed twice to notice, so it now lives in one place.
//
// Responsibilities: create the host element, attach a shadow root, inject the
// UI, expose UIROOT_OVERRIDE to the engine, and lay the panel out sensibly on
// both a desktop and a phone.
module.exports = function mountShim({ css, body, padBody }) {
  return `
  var HOST = document.createElement("div");
  HOST.id = "sstlv-host";
  var SHADOW = HOST.attachShadow({ mode: "open" });
  SHADOW.innerHTML = "<style>" + ${JSON.stringify(css)} + "</style>" + ${JSON.stringify(body)};
  document.documentElement.appendChild(HOST);

  var TAB = document.createElement("button");
  TAB.id = "sstlv-tab";
  TAB.textContent = "SSTLV";
  TAB.style.cssText = [
    "position:fixed", "top:8px", "right:8px", "z-index:2147483646",
    "background:#F5C518", "color:#0D1015", "border:0", "border-radius:5px",
    "font:700 12px ui-monospace,Menlo,Consolas,monospace", "letter-spacing:.09em",
    "padding:10px 12px", "cursor:pointer", "touch-action:manipulation"
  ].join(";");
  document.documentElement.appendChild(TAB);

  // A phone cannot show a 400px side panel AND the board at once. On a narrow
  // screen the panel is a full-screen overlay that starts CLOSED, so you see
  // the draft board first and tap SSTLV to consult the assistant. On a wide
  // screen it is the old docked side panel.
  var PAD = ${padBody ? "true" : "false"};
  function narrow() { return Math.min(window.innerWidth || 9999, 900) < 720; }
  var open = !narrow();
  function layout() {
    var n = narrow();
    HOST.style.cssText = [
      "position:fixed", "top:0", "right:0", "z-index:2147483645",
      "overflow:auto", "font-size:15px",
      "height:100vh",
      n ? "width:100vw" : "width:400px",
      n ? "max-width:100vw" : "max-width:96vw",
      n ? "box-shadow:none" : "box-shadow:-2px 0 18px rgba(0,0,0,.45)",
      open ? "display:block" : "display:none"
    ].join(";");
    if (PAD) {
      // Never pad the body on a phone: 410px of padding on a 390px screen
      // squeezes the page to a 28px slit, which looks exactly like "it does
      // nothing".
      document.body.style.paddingRight = (!n && open) ? "410px" : "";
    }
    TAB.textContent = (n && open) ? "CLOSE" : "SSTLV";
  }
  TAB.onclick = function () { open = !open; layout(); };
  window.addEventListener("resize", layout);
  window.addEventListener("orientationchange", function () { setTimeout(layout, 150); });
  layout();

  // The region picker needs to hide the panel on a phone: the panel covers the
  // whole screen there, so you cannot tap the pick list behind it.
  var PANEL = {
    narrow: narrow,
    isOpen: function () { return open; },
    set: function (v) { open = v; layout(); }
  };

  var UIROOT_OVERRIDE = SHADOW;
`;
};
