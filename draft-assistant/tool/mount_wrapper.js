// The mount shim shared by BOTH generated artifacts (the Yahoo userscript and
// the practice page). It was duplicated in the two generators; a mobile layout
// bug had to be fixed twice to notice, so it now lives in one place.
//
// Responsibilities: create the host element, attach a shadow root, inject the
// UI, expose UIROOT_OVERRIDE to the engine, and lay the panel out sensibly on
// both a desktop and a phone.
// Inside a shadow root, ":root" and "body" match NOTHING -- there is no <html>
// and no <body> in there. The shell stylesheet defines every colour variable on
// :root and the panel background on body, so injected verbatim the panel came
// out with no variables and a transparent background, showing the Yahoo page
// straight through it. And `footer{position:fixed}` is positioned against the
// VIEWPORT, not the panel, so the button bar stretched across the whole screen.
//
// Rewrite those three selectors as the CSS crosses the shadow boundary. The
// standalone HTML build is untouched: there :root and body are real.
function scopeForShadow(css) {
  let out = css
    .replace(/(^|[}\s])\s*:root\s*\{/g, '$1:host{')
    .replace(/(^|[}\s])\s*body\s*\{/g, '$1:host{');
  out += `
/* --- shadow-boundary corrections, appended by mountShim --- */
/* Position colours are re-declared here so the bridge can overwrite them on
   the host element with the draft room's own rendered values. */
:host{display:block;background:#0D1015;color:#E9EEF3;
  font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  font-size:15px;line-height:1.4}
/* the button bar belongs to the panel, not to the page */
footer{position:sticky;left:auto;right:auto;bottom:0;width:100%}
/* keep BIND / ARM reachable without hunting for it */
#brPanel:not(:empty){position:sticky;top:0;z-index:5;
  box-shadow:0 6px 14px rgba(13,16,21,.9)}
`;
  return out;
}

module.exports = function mountShim({ css, body, padBody }) {
  css = scopeForShadow(css);
  return `
  // ---- self-diagnostic, before anything that can fail ----
  // If any of the code below throws, the page would otherwise look like a set
  // of dead buttons. Report it where the user can actually read it.
  function SSTLV_DIAG(msg, detail) {
    try {
      var el = document.getElementById("jsCheck");
      if (!el) { if (detail) console.error(msg, detail); return; }
      el.style.display = "";
      el.innerHTML = "<b>" + msg + "</b>" +
        (detail ? "<div style='margin-top:8px;font:11px ui-monospace,Menlo,Consolas,monospace'>" +
          String(detail).replace(/[<&]/g, " ") + "</div>" : "");
    } catch (e) {}
  }
  (function () {
    var d = document.getElementById("jsDiag");
    if (d) {
      d.textContent = navigator.userAgent + " | shadowDOM:" +
        (!!document.createElement("div").attachShadow) +
        " fromEntries:" + (typeof Object.fromEntries === "function");
    }
    var c = document.getElementById("jsCheck");
    if (c) c.innerHTML = "<b>JavaScript started but did not finish.</b>" +
      "<br>Something below threw. The exact error will replace this message.";
  })();
  window.addEventListener("error", function (ev) {
    SSTLV_DIAG("The assistant hit an error and stopped.",
      (ev.message || "") + "  @" + (ev.filename || "") + ":" + (ev.lineno || ""));
  });

  var HOST = document.createElement("div");
  HOST.id = "sstlv-host";
  var SHADOW = HOST.attachShadow({ mode: "open" });
  SHADOW.innerHTML = "<style>" + ${JSON.stringify(css)} + "</style>" + ${JSON.stringify(body)};
  var MOUNT = document.body || document.documentElement;
  MOUNT.appendChild(HOST);

  var TAB = document.createElement("button");
  TAB.id = "sstlv-tab";
  TAB.textContent = "SSTLV";
  TAB.style.cssText = [
    "position:fixed", "top:8px", "right:8px", "z-index:2147483646",
    "background:#F5C518", "color:#0D1015", "border:0", "border-radius:5px",
    "font:700 12px ui-monospace,Menlo,Consolas,monospace", "letter-spacing:.09em",
    "padding:10px 12px", "cursor:pointer", "touch-action:manipulation"
  ].join(";");
  MOUNT.appendChild(TAB);

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
