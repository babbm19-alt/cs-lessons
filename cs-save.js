/* =====================================================================
   cs-save.js  ·  shared autosave + submit-to-teacher for cs-lessons
   ---------------------------------------------------------------------
   Add to ANY lesson page with ONE line, just before </body>:

     <script src="cs-save.js" data-activity="cse-112"></script>

   - Autosave: saves typed answers + identity to THIS browser (localStorage),
     restores on reload, shows a live "Saved" indicator. Per-device only.
   - Submit: sends First name + Last initial + Period + a summary of the
     page's answer log to your Google Sheet (one row per submission).
   - Privacy: collects first name + last initial + period only. No email.

   SETUP (once): paste your deployed Apps Script Web App URL below.
   ===================================================================== */
(function () {
  "use strict";

  /* ---- 1. PASTE YOUR WEB APP URL HERE (see cs-save-README.md) ---- */
  var ENDPOINT_URL = "https://script.google.com/macros/s/AKfycbz4POBwVQL3GwcUY-rR-ExWivY5zDo0pRCssHNSj7Af5Na-lFHm56idJEnWfCKX9-7m/exec";
  /* --------------------------------------------------------------- */

  var me = document.currentScript;
  var ACTIVITY = (me && me.getAttribute("data-activity")) || (document.title || "activity").slice(0, 40);
  var KEY = "cssave:" + ACTIVITY;

  /* ---- storage: feature-detect once ---- */
  var storageOK = (function () {
    try { var k = "__csprobe"; localStorage.setItem(k, "1"); localStorage.removeItem(k); return true; }
    catch (e) { return false; }
  })();

  /* ---- inject self-contained styles (readable on light OR dark pages) ---- */
  var css = document.createElement("style");
  css.textContent =
    "#csSave{max-width:760px;margin:22px auto;padding:0 14px;font-family:'Segoe UI',system-ui,-apple-system,Roboto,Arial,sans-serif}" +
    "#csSave .cs-card{background:#fff;color:#1b2a4a;border:1px solid #d8d4e2;border-radius:14px;box-shadow:0 6px 20px rgba(13,27,52,.18);overflow:hidden}" +
    "#csSave .cs-head{background:linear-gradient(120deg,#1b2a4a,#6b3fa0);color:#fff;padding:10px 15px;display:flex;align-items:center;gap:10px;flex-wrap:wrap}" +
    "#csSave .cs-head b{font-size:.98rem}" +
    "#csSave .cs-ind{margin-left:auto;font-size:.8rem;font-weight:600;background:rgba(255,255,255,.18);padding:3px 10px;border-radius:99px;white-space:nowrap}" +
    "#csSave .cs-ind.ok{background:#1f8a4c}" +
    "#csSave .cs-ind.no{background:#b26a00}" +
    "#csSave .cs-body{padding:14px 15px}" +
    "#csSave .cs-fields{display:flex;gap:10px;flex-wrap:wrap;align-items:flex-end}" +
    "#csSave label{display:block;font-size:.78rem;color:#5a6072;font-weight:700;margin-bottom:3px}" +
    "#csSave input{font:inherit;padding:9px 11px;border:1px solid #c4c0cf;border-radius:9px;color:#1b2a4a;background:#fff;min-width:0}" +
    "#csSave .f-name input{width:150px}#csSave .f-last input{width:70px}#csSave .f-per input{width:80px}" +
    "#csSave .cs-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:12px}" +
    "#csSave button.cs-submit{background:#6b3fa0;color:#fff;border:0;border-radius:10px;padding:11px 18px;font:inherit;font-weight:700;cursor:pointer}" +
    "#csSave button.cs-submit:disabled{opacity:.5;cursor:default}" +
    "#csSave button.cs-reset{background:#fff;color:#1b2a4a;border:1px solid #c4c0cf;border-radius:10px;padding:9px 14px;font:inherit;cursor:pointer}" +
    "#csSave .cs-msg{font-size:.9rem;margin-top:10px;padding:9px 12px;border-radius:9px;display:none}" +
    "#csSave .cs-msg.show{display:block}" +
    "#csSave .cs-msg.good{background:#e8f6ee;color:#1f8a4c}" +
    "#csSave .cs-msg.bad{background:#fdecea;color:#b3261e}" +
    "#csSave .cs-hint{font-size:.78rem;color:#5a6072;margin-top:8px}";
  document.head.appendChild(css);

  /* ---- build the card ---- */
  var box = document.createElement("div");
  box.id = "csSave";
  box.innerHTML =
    '<div class="cs-card">' +
      '<div class="cs-head"><b>Save &amp; submit your work</b>' +
        '<span class="cs-ind" id="csInd">' + (storageOK ? "Autosaving your typing" : "Not saving on this computer") + '</span>' +
      '</div>' +
      '<div class="cs-body">' +
        '<div class="cs-fields">' +
          '<div class="f-name"><label for="csName">First name</label><input id="csName" autocomplete="off" maxlength="30"></div>' +
          '<div class="f-last"><label for="csLast">Last initial</label><input id="csLast" autocomplete="off" maxlength="1"></div>' +
          '<div class="f-per"><label for="csPeriod">Period</label><input id="csPeriod" autocomplete="off" maxlength="6"></div>' +
        '</div>' +
        '<div class="cs-actions">' +
          '<button type="button" class="cs-submit" id="csSubmit">Submit to Mr. Babb</button>' +
          '<button type="button" class="cs-reset" id="csReset">Start over</button>' +
        '</div>' +
        '<div class="cs-msg" id="csMsg"></div>' +
        '<div class="cs-hint">' + (storageOK
          ? 'Autosave keeps your <b>typed answers</b> on this computer so a refresh won\u2019t lose them. Multiple-choice clicks and game progress are <b>not</b> saved \u2014 finish those in one sitting. Press <b>Submit</b> to send your work to Mr. Babb.'
          : 'This computer is blocking autosave. <b>Copy or screenshot your answers</b> before closing. Press <b>Submit</b> to send your work to Mr. Babb.') +
        '</div>' +
      '</div>' +
    '</div>';
  document.body.appendChild(box);

  var $ = function (id) { return document.getElementById(id); };
  var ind = $("csInd"), msg = $("csMsg");
  var idName = $("csName"), idLast = $("csLast"), idPeriod = $("csPeriod");

  /* ---- gather all typed fields on the page (inputs/textareas with id or name), excluding our own ---- */
  function pageFields() {
    var out = {};
    document.querySelectorAll("input, textarea, select").forEach(function (el) {
      if (el.closest("#csSave")) return;
      var k = el.id || el.name;
      if (!k) return;
      if (el.type === "button" || el.type === "submit" || el.type === "hidden") return;
      out[k] = el.value;
    });
    return out;
  }
  function restoreFields(vals) {
    if (!vals) return;
    Object.keys(vals).forEach(function (k) {
      var el = document.getElementById(k) || document.querySelector('[name="' + CSS.escape(k) + '"]');
      if (el && el.value !== undefined) el.value = vals[k];
    });
  }

  /* ---- the "summary" we submit: page's own answer log if present ---- */
  function pageSummary() {
    var el = document.querySelector("#cs-summary, #logOut, #nbHidden, #nbText, .logbox");
    if (!el) return "";
    return (el.value != null && el.value !== "") ? el.value : (el.textContent || "").trim();
  }

  /* ---- autosave ---- */
  var flashTimer = null;
  function flashSaved() {
    if (!storageOK) return;
    ind.textContent = "Saved \u2713"; ind.className = "cs-ind ok";
    clearTimeout(flashTimer);
    flashTimer = setTimeout(function () { ind.textContent = "Autosaving your typing"; ind.className = "cs-ind"; }, 1400);
  }
  var clearing = false; // set true by "Start over" so no pending/close save can rewrite cleared work
  var saveTimer = null;
  function doSave() {
    if (clearing) return false;
    try {
      localStorage.setItem(KEY, JSON.stringify({
        t: Date.now(),
        who: { first: idName.value, last: idLast.value, period: idPeriod.value },
        fields: pageFields()
      }));
      return true;
    } catch (e) {
      // storage failed mid-session (quota, private mode) — tell the student, don't swallow it
      storageOK = false;
      ind.textContent = "Not saving — copy your answers"; ind.className = "cs-ind no";
      return false;
    }
  }
  function save() {
    if (!storageOK || clearing) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { if (doSave()) flashSaved(); }, 500);
  }
  function flushNow() {
    // called on page hide/close so the last half-second of typing isn't lost
    if (!storageOK || clearing) return;
    clearTimeout(saveTimer);
    doSave();
  }
  document.addEventListener("visibilitychange", function () { if (document.visibilityState === "hidden") flushNow(); });
  window.addEventListener("pagehide", flushNow);
  window.addEventListener("beforeunload", flushNow);
  function restore() {
    if (!storageOK) return;
    var raw;
    try { raw = localStorage.getItem(KEY); } catch (e) { return; }
    if (!raw) return;
    try {
      var data = JSON.parse(raw);
      if (data.who) { idName.value = data.who.first || ""; idLast.value = data.who.last || ""; idPeriod.value = data.who.period || ""; }
      restoreFields(data.fields);
      var when = data.t ? new Date(data.t).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "";
      ind.textContent = "Picked up where you left off" + (when ? " \u00b7 " + when : "");
      ind.className = "cs-ind ok";
      setTimeout(function () { ind.textContent = "Autosaving your typing"; ind.className = "cs-ind"; }, 2600);
    } catch (e) {}
  }

  /* save on any typing anywhere on the page */
  document.addEventListener("input", function (e) { if (!e.target.closest || !e.target.closest("#csSave") || e.target.closest(".cs-fields")) save(); }, true);
  document.addEventListener("click", function (e) { setTimeout(save, 50); }, true); // catch button-based answers too

  $("csReset").onclick = function () {
    if (!confirm("Clear your saved work on this device and start over?")) return;
    clearing = true;               // block every save path from here on
    clearTimeout(saveTimer);       // cancel any pending debounced save
    try { localStorage.removeItem(KEY); } catch (e) {}
    location.reload();
  };

  /* ---- submit ---- */
  function showMsg(text, good) { msg.textContent = text; msg.className = "cs-msg show " + (good ? "good" : "bad"); }
  $("csSubmit").onclick = function () {
    var first = idName.value.trim(), last = idLast.value.trim(), period = idPeriod.value.trim();
    if (!first || !last || !period) { showMsg("Add your first name, last initial, and period before submitting.", false); return; }
    if (ENDPOINT_URL.indexOf("PASTE_YOUR") === 0) { showMsg("Submit isn\u2019t set up yet \u2014 tell Mr. Babb the endpoint URL is missing.", false); return; }
    var btn = this; btn.disabled = true; showMsg("Submitting\u2026", true);
    var payload = {
      activity: ACTIVITY, first: first, lastInitial: last, period: period,
      summary: pageSummary(), fields: JSON.stringify(pageFields())
    };
    /* Simple request (text/plain) so the browser can READ the server's reply.
       We show a success check ONLY when the server actually confirms {ok:true}.
       Anything else — a not-ok reply, an unreadable reply, or a network error —
       tells the student to copy their answers, never a false "submitted". */
    fetch(ENDPOINT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.text();
    }).then(function (txt) {
      var j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (j && j.ok) {
        showMsg("Submitted to Mr. Babb \u2713  Recorded" + (j.row ? " (entry #" + j.row + ")" : "") + ". You can close the tab.", true);
        btn.textContent = "Submitted \u2713";
        setTimeout(function () { btn.disabled = false; btn.textContent = "Submit again"; }, 3000);
      } else {
        showMsg("Sent, but I couldn\u2019t get a confirmation back \u2014 your work may not have saved. Copy or screenshot your answers and tell Mr. Babb.", false);
        btn.disabled = false;
      }
    }).catch(function () {
      showMsg("Couldn\u2019t confirm your submission (network or permissions). Copy or screenshot your answers, then try again.", false);
      btn.disabled = false;
    });
  };

  /* ---- boot: restore after the page's own scripts have built their fields ---- */
  if (document.readyState === "complete") setTimeout(restore, 60);
  else window.addEventListener("load", function () { setTimeout(restore, 60); });
})();
