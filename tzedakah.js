/* facePay Tzedakah mode: collector flow. Donors, donations and amounts come from the server API.
   Camera, voice, face templates and video clips stay on THIS device (IndexedDB / localStorage). Charges are simulated. */
(function () {
  'use strict';
  var DB_NAME = 'facepay-tzedakah', STORE = 'videos', FKEY = 'fp-local-faces';
  var S = null, CFG = { amounts: [5, 10, 18, 36, 50, 72, 100, 180], max_amount: 5000, org_name: '' }, DONORS = [];
  var t = function (s) { return FP.t(s); }, esc = function (s) { return FP.esc(s); }, toast = function (m) { FP.toast(m); };
  FP.merge({
    'Live voice is off here. Watch the synthetic demo amount, or pick one below.': '\u05DC\u05D9\u05D9\u05D5 \u05E7\u05D5\u05DC \u05D0\u05D9\u05D6 \u05D0\u05D5\u05E4\u05BC \u05D0\u05D9\u05E7\u05E2\u05E8. \u05D6\u05D9\u05D9 \u05D0\u05B8\u05E0 \u05D3\u05D9 \u05E1\u05D9\u05E0\u05D8\u05E2\u05D8\u05D9\u05E9\u05E2 \u05D3\u05E2\u05DE\u05D0\u05B8 \u05E1\u05D5\u05DE\u05E2, \u05D0\u05D3\u05E2\u05E8 \u05D0\u05D5\u05E4\u05BC\u05D1\u05E2\u05E8 \u05D0\u05D9\u05D9\u05E0\u05E2 \u05D0\u05D5\u05E0\u05D8\u05E2\u05DF.',
    'Checking on-device voice\u2026': '\u05E4\u05BC\u05E8\u05D5\u05D1\u05D9\u05E8\u05D8 \u05E7\u05D5\u05DC \u05D0\u05D5\u05E4\u05BC \u05D3\u05E2\u05DD \u05D0\u05B7\u05E4\u05BC\u05D0\u05B8\u05E8\u05D0\u05B8\u05D8\u2026',
    'SYNTHETIC VOICE DEMO \u00B7 NO REAL SPEECH IS ANALYZED': '\u05E1\u05D9\u05E0\u05D8\u05E2\u05D8\u05D9\u05E9\u05E2 \u05E7\u05D5\u05DC\u05BE\u05D3\u05E2\u05DE\u05D0\u05B8 \u00B7 \u05E7\u05D9\u05D9\u05DF \u05E8\u05D9\u05D9\u05E0\u05E2 \u05E8\u05E2\u05D3 \u05D5\u05D5\u05E2\u05E8\u05D8 \u05E0\u05D9\u05E9\u05D8 \u05D0\u05B7\u05E0\u05D0\u05B7\u05DC\u05D9\u05D6\u05D9\u05E8\u05D8',
    'Voice is understood on this device only (browser on-device speech).': '\u05E7\u05D5\u05DC \u05D5\u05D5\u05E2\u05E8\u05D8 \u05D0\u05D5\u05E0\u05D8\u05E2\u05E8\u05E9\u05D8\u05D0\u05B7\u05E0\u05E2\u05DF \u05E0\u05D0\u05B8\u05E8 \u05D0\u05D5\u05E4\u05BC \u05D3\u05E2\u05DD \u05D0\u05B7\u05E4\u05BC\u05D0\u05B8\u05E8\u05D0\u05B8\u05D8.',
    'On-device speech recognition is not available here, so live voice is off. Nothing is sent to a speech service. The amount below is made up, or pick one.': '\u05D0\u05D5\u05E4\u05BC \u05D3\u05E2\u05DD \u05D0\u05B7\u05E4\u05BC\u05D0\u05B8\u05E8\u05D0\u05B8\u05D8 \u05D0\u05D9\u05D6 \u05E7\u05D9\u05D9\u05DF \u05E7\u05D5\u05DC\u05BE\u05D0\u05B8\u05E0\u05D2\u05E2\u05E7\u05E0\u05E2\u05E0\u05D5\u05E0\u05D2 \u05E0\u05D9\u05E9\u05D8, \u05D0\u05D5\u05DF \u05E7\u05D9\u05D9\u05DF \u05E8\u05D3\u05E0\u05E2 \u05D5\u05D5\u05E2\u05E8\u05D8 \u05E0\u05D9\u05E9\u05D8 \u05D2\u05E2\u05E9\u05D9\u05E7\u05D8 \u05E6\u05D5 \u05D0 \u05E1\u05E8\u05D5\u05D5\u05D9\u05E1. \u05D3\u05D9 \u05E1\u05D5\u05DE\u05E2 \u05D0\u05D5\u05E0\u05D8\u05E2\u05DF \u05D0\u05D9\u05D6 \u05D0\u05D5\u05E4\u05BC\u05D2\u05E2\u05D1\u05E2\u05E8\u05D8, \u05D0\u05D3\u05E2\u05E8 \u05D0\u05D5\u05E4\u05BC\u05D1\u05E2\u05E8 \u05D0\u05D9\u05D9\u05E0\u05E2.',
    'Demo build. Use made-up donor details only.': '\u05D3\u05E2\u05DE\u05D0\u05B8\u05BE\u05D1\u05D9\u05DC\u05D3. \u05E0\u05D5\u05E5 \u05E0\u05D0\u05B8\u05E8 \u05D0\u05D5\u05E4\u05BC\u05D2\u05E2\u05D8\u05D0\u05B8\u05E0\u05E2 \u05E0\u05D3\u05D1\u05DF\u05BE\u05D3\u05D0\u05B8\u05E0\u05D9\u05E2\u05DF.',
    'Face and video clip stay on this device only.': '\u05E4\u05BC\u05E0\u05D9\u05DD \u05D0\u05D5\u05DF \u05D5\u05D5\u05D9\u05D3\u05E2\u05D0\u05B8\u05BE\u05E7\u05DC\u05D9\u05E4\u05BC \u05D1\u05DC\u05D9\u05D9\u05D1\u05E2\u05DF \u05E0\u05D0\u05B8\u05E8 \u05D0\u05D5\u05E4\u05BC \u05D3\u05E2\u05DD \u05D0\u05B7\u05E4\u05BC\u05D0\u05B8\u05E8\u05D0\u05B8\u05D8.',
    'Donors and receipts are saved on the server. Charge is simulated.': '\u05E0\u05D3\u05D1\u05E0\u05D9\u05DD \u05D0\u05D5\u05DF \u05E7\u05D1\u05DC\u05D5\u05EA \u05D5\u05D5\u05E2\u05E8\u05E2\u05DF \u05D2\u05E2\u05E9\u05E4\u05BC\u05D9\u05E1\u05E2\u05E8\u05D8 \u05D0\u05D5\u05E4\u05BC \u05D3\u05E2\u05DD \u05E1\u05E2\u05E8\u05D5\u05D5\u05E2\u05E8. \u05D3\u05E2\u05E8 \u05D0\u05B8\u05E4\u05BC\u05E9\u05D0\u05B8\u05DC \u05D0\u05D9\u05D6 \u05E1\u05D9\u05DE\u05D5\u05DC\u05D9\u05E8\u05D8.',
    'donors': '\u05E0\u05D3\u05D1\u05E0\u05D9\u05DD', 'gifts': '\u05DE\u05EA\u05E0\u05D5\u05EA', 'Could not reach the server. Nothing was saved.': '\u05E7\u05E2\u05E0\u05E2 \u05E0\u05D9\u05E9\u05D8 \u05D0\u05B7\u05E8\u05D9\u05D9\u05E0\u05E8\u05E2\u05DB\u05E2\u05DF \u05D0\u05D5\u05E4\u05BC \u05D3\u05E2\u05DD \u05E1\u05E2\u05E8\u05D5\u05D5\u05E2\u05E8. \u05E0\u05D9\u05E9\u05D8\u05E9 \u05D0\u05D9\u05D6 \u05E0\u05D9\u05E9\u05D8 \u05D2\u05E2\u05E9\u05E4\u05BC\u05D9\u05E1\u05E2\u05E8\u05D8.',
    'No face is saved for this donor on this device. Use the camera to enroll, or continue.': '\u05E7\u05D9\u05D9\u05DF \u05E4\u05BC\u05E0\u05D9\u05DD \u05D0\u05D9\u05D6 \u05E0\u05D9\u05E9\u05D8 \u05D2\u05E2\u05E9\u05E4\u05BC\u05D9\u05E1\u05E2\u05E8\u05D8.'
  });

  function usd(n) { return '$' + Number(n).toFixed(n % 1 ? 2 : 0); }
  function usd2(n) { return '$' + Number(n).toFixed(2); }
  function loadJSON(k, f) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* ---------- device-local clip store (IndexedDB) ---------- */
  function openDB() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) return rej(new Error('no idb'));
      var r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = function () { r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function idb(mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction(STORE, mode), st = tx.objectStore(STORE), out = fn(st);
        tx.oncomplete = function () { db.close(); res(out && out.result); };
        tx.onerror = tx.onabort = function () { db.close(); rej(tx.error); };
      });
    });
  }
  function putVideo(rec) { return idb('readwrite', function (st) { return st.put(rec); }); }

  /* ---------- server data + device-local faces ---------- */
  function validDesc(d) { return window.FacePayFace && FacePayFace.valid(d); }
  function localFaces() { var f = loadJSON(FKEY, {}); return f && typeof f === 'object' ? f : {}; }
  function setLocalFace(id, descs) { var f = localFaces(); f[id] = descs; saveJSON(FKEY, f); }
  function faceOf(d) { var a = localFaces()[d.id]; return Array.isArray(a) && a.length >= 3 && a.every(validDesc) ? a : null; }
  function refreshDonors() { return FP.api('GET', '/donors').then(function (j) { DONORS = j.donors || []; return DONORS; }); }
  function maskCard(d) { return t('Test card') + ' \u2022\u2022\u2022\u2022 ' + (d.card_last4 || '4242'); }
  /* ---------- amount parsing (no confirmation word needed) ---------- */
  var LEX = {};
  function add(v, words) { words.split(' ').forEach(function (w) { LEX[w] = v; }); }
  add(0, 'zero'); add(1, 'one eyns ayns eins eyn \u05D0\u05D7\u05D3 \u05D0\u05D7\u05EA \u05D0\u05D9\u05D9\u05E0\u05E1'); add(2, 'two tsvey tzvei zwei tsvei tzvey tsvay \u05E9\u05E0\u05D9\u05D9\u05DD \u05E9\u05EA\u05D9\u05D9\u05DD \u05E9\u05EA\u05D9\u05DD \u05E9\u05E0\u05D9 \u05E6\u05D5\u05D5\u05D9\u05D9');
  add(3, 'three dray drei dry \u05E9\u05DC\u05D5\u05E9 \u05E9\u05DC\u05D5\u05E9\u05D4 \u05D3\u05E8\u05D9\u05D9'); add(4, 'four fir fier feer \u05D0\u05E8\u05D1\u05E2 \u05D0\u05E8\u05D1\u05E2\u05D4 \u05E4\u05D9\u05E8');
  add(5, 'five finf fimf finef f\u00FCnf fuenf fenf \u05D7\u05DE\u05E9 \u05D7\u05DE\u05D9\u05E9\u05D4 \u05E4\u05D9\u05E0\u05E3'); add(6, 'six zeks sechs zex \u05E9\u05E9 \u05E9\u05D9\u05E9\u05D4 \u05D6\u05E2\u05E7\u05E1');
  add(7, 'seven zibn zibin zieben ziben \u05E9\u05D1\u05E2 \u05E9\u05D1\u05E2\u05D4 \u05D6\u05D9\u05D1\u05DF'); add(8, 'eight akht acht ocht \u05E9\u05DE\u05D5\u05E0\u05D4 \u05D0\u05DB\u05D8'); add(9, 'nine nayn \u05EA\u05E9\u05E2 \u05EA\u05E9\u05E2\u05D4 \u05E0\u05D9\u05D9\u05DF');
  add(10, 'ten tsen zen tzen tsehn \u05E2\u05E9\u05E8 \u05E2\u05E9\u05E8\u05D4 \u05E6\u05E2\u05DF'); add(11, 'eleven elf elef \u05E2\u05DC\u05E3'); add(12, 'twelve tsvelf tzvelf zwolf \u05E6\u05D5\u05D5\u05E2\u05DC\u05E3');
  add(13, 'thirteen draytsn dreitsn draytsen dreizehn \u05D3\u05E8\u05D9\u05D9\u05E6\u05DF'); add(14, 'fourteen fertsn fiertzen fertzn \u05E4\u05E2\u05E8\u05E6\u05DF'); add(15, 'fifteen fuftsn fufzen fiftzen fuftzn fuftsen \u05E4\u05D5\u05E4\u05E6\u05DF');
  add(16, 'sixteen zekhtsn zechtsn sechzehn zekhtsen \u05D6\u05E2\u05DB\u05E6\u05DF'); add(17, 'seventeen zibetsn zibzen zibetsen zibtsn \u05D6\u05D9\u05D1\u05E2\u05E6\u05DF'); add(18, 'eighteen akhtsn akhtzn akhtsen akhtzen achtzehn achtsn chai khai \u05D0\u05DB\u05E6\u05DF \u05D7\u05D9');
  add(19, 'nineteen nayntsn nayntsen neuntsn \u05E0\u05D9\u05D9\u05E0\u05E6\u05DF'); add(20, 'twenty tsvantsik tsvansig zwanzig tzvantsik \u05E2\u05E9\u05E8\u05D9\u05DD \u05E6\u05D5\u05D5\u05D0\u05E0\u05E6\u05D9\u05E7');
  add(30, 'thirty draysik dreisig drajsik dreisik \u05E9\u05DC\u05D5\u05E9\u05D9\u05DD \u05D3\u05E8\u05D9\u05D9\u05E1\u05D9\u05E7'); add(40, 'forty fertsik fiertzig fertsig \u05D0\u05E8\u05D1\u05E2\u05D9\u05DD \u05E4\u05E2\u05E8\u05E6\u05D9\u05E7');
  add(50, 'fifty fuftsik fuftsig fiftsik fufzig \u05D7\u05DE\u05D9\u05E9\u05D9\u05DD \u05E4\u05D5\u05E4\u05E6\u05D9\u05E7'); add(60, 'sixty zekhtsik zechtsik sechzig \u05E9\u05D9\u05E9\u05D9\u05DD \u05D6\u05E2\u05DB\u05E6\u05D9\u05E7');
  add(70, 'seventy zibetsik zibtsig ziebzig \u05E9\u05D1\u05E2\u05D9\u05DD \u05D6\u05D9\u05D1\u05E2\u05E6\u05D9\u05E7'); add(80, 'eighty akhtsik achtzig akhtzik \u05E9\u05DE\u05D5\u05E0\u05D9\u05DD \u05D0\u05DB\u05E6\u05D9\u05E7');
  add(90, 'ninety nayntsik neuntzig nayntsig \u05EA\u05E9\u05E2\u05D9\u05DD \u05E0\u05D9\u05D9\u05E0\u05E6\u05D9\u05E7'); add(100, 'hundred hundert \u05DE\u05D0\u05D4 \u05D4\u05D5\u05E0\u05D3\u05E2\u05E8\u05D8'); add(200, '\u05DE\u05D0\u05EA\u05D9\u05D9\u05DD');
  var JOIN = { un: 1, and: 1, '\u05D0\u05D5\u05DF': 1, '\u05D5': 1 };
  var MULT = { double: 2, triple: 3, '\u05D3\u05D0\u05D1\u05DC': 2 };
  function normalize(t) {
    return String(t || '').toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/[\u2019'`]/g, '').replace(/[-_,.!?;:()"\u05F3\u05F4]/g, function (c) { return c === ',' || c === '.' ? c : ' '; });
  }
  function parseAmount(text) {
    var t = normalize(text);
    var m = t.match(/\$\s*(\d+(?:\.\d{1,2})?)/) || t.match(/(\d+(?:\.\d{1,2})?)\s*(?:dollars?|bucks|\$|\u05D3\u05D5\u05DC\u05E8)/) || t.match(/(\d+(?:\.\d{1,2})?)/);
    if (m) { var a = parseFloat(m[1]); return a > 0 && a <= 5000 ? a : null; }
    var tokens = t.replace(/[.,]/g, ' ').split(/\s+/).filter(Boolean), total = 0, cur = 0, any = false, mult = 1, lastHeb = false;
    for (var i = 0; i < tokens.length; i++) {
      var w = tokens[i];
      if (!any && MULT[w]) { mult = MULT[w]; continue; }
      if (any && JOIN[w]) continue;
      var v = LEX[w], heb = /[\u0590-\u05FF]/.test(w);
      if (v === undefined) { if (any) break; continue; }
      any = true;
      if (v >= 100) { total += v === 200 ? 200 : (cur || 1) * 100; cur = 0; continue; }
      if (v === 10 && heb && cur > 0 && cur < 10) { cur += 10; continue; }
      if (v >= 20) { if (cur >= 20) break; cur += v; continue; }
      if (v < 10) { if (cur >= 20 && cur % 10 === 0) { cur += v; continue; } if (cur === 0) { cur = v; continue; } if (cur < 10) break; break; }
      if (cur >= 20 || (cur > 0 && cur < 10 && !heb)) break; cur += v;
    }
    var out = (total + cur) * mult;
    return any && out > 0 && out <= 5000 ? out : null;
  }


  /* ---------- session helpers ---------- */
  function newSession() {
    return { view: 'start', stream: null, video: null, recorder: null, chunks: [], clip: null, clipMs: 0, donor: null, samples: [], amount: null, heard: '', vlang: 'en-US', rec: null, simulated: false, timers: [], mime: '', hasAudio: false, cancelled: false, receipt: null };
  }
  function stopMedia() {
    if (!S) return;
    S.cancelled = true;
    S.timers.forEach(clearTimeout); S.timers = [];
    try { if (S.rec) { S.rec.onend = null; S.rec.abort(); } } catch (e) {}
    S.rec = null;
    try { if (S.recorder && S.recorder.state !== 'inactive') { S.recorder.onstop = null; S.recorder.stop(); } } catch (e) {}
    S.recorder = null;
    if (S.stream) S.stream.getTracks().forEach(function (tr) { tr.stop(); });
    S.stream = null;
    if (S.video) S.video.srcObject = null;
  }
  function cameraSupported() { return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function SR() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }

  /* ---------- render entry ---------- */
  function render(app) {
    stopMedia();
    S = newSession(); S.app = app;
    S.video = document.createElement('video');
    S.video.setAttribute('playsinline', ''); S.video.muted = true; S.video.autoplay = true;
    app.innerHTML = '<div class="tz"><p class="tz-sub">\u2026</p></div>';
    FP.me().then(function (me) {
      if (!me) return FP.loginGate(app, function () { render(app); });
      return Promise.all([FP.api('GET', '/settings'), refreshDonors()]).then(function (r) {
        CFG = r[0]; if (!localStorage.getItem('fp-lang')) FP.setLang(CFG.lang || 'yi');
        S.me = me; view('start');
      });
    }).catch(function () { app.innerHTML = '<div class="tz"><p class="tz-sub">' + esc(t('Could not reach the server. Nothing was saved.')) + '</p></div>'; });
  }
  function stage(html, cls) {
    var app = S.app;
    app.innerHTML = '<div class="tz ' + (cls || '') + '" dir="' + FP.dir() + '" lang="' + (FP.lang() === 'yi' ? 'yi' : 'en') + '">' + html + '</div>';
    return app.firstChild;
  }
  function view(name) { S.view = name; ({ start: vStart, scan: vScan, unknown: vUnknown, voice: vVoice, charging: vCharging, success: vSuccess })[name](); window.scrollTo(0, 0); }
  function header(step, title, sub) {
    var steps = ['Face', 'Amount', 'Confirm', 'Done'];
    return '<div class="tz-head"><p class="eyebrow">' + esc(t('TZEDAKAH MODE \u00B7 COLLECTOR')) + '</p><h1 class="tz-title">' + title + '</h1>' + (sub ? '<p class="tz-sub">' + sub + '</p>' : '') +
      (step ? '<div class="tz-steps" aria-label="Progress">' + steps.map(function (s, i) { return '<span class="' + (i + 1 < step ? 'done' : i + 1 === step ? 'now' : '') + '">' + (i + 1) + ' \u00B7 ' + esc(t(s)) + '</span>'; }).join('') + '</div>' : '') + '</div>';
  }
  function leaveTo(v) { return function () { stopMedia(); S.cancelled = false; S.timers = []; S.stream = null; S.rec = null; view(v); }; }
  function simBadge() { return '<p class="tz-simbadge">' + esc(t('SIMULATED CHARGE \u00B7 NO MONEY MOVES')) + '</p>'; }

  /* ---------- start ---------- */
  function vStart() {
    var n = DONORS.reduce(function (s, d) { return s + (d.gifts || 0); }, 0), total = DONORS.reduce(function (s, d) { return s + (d.total_cents || 0); }, 0) / 100;
    var admin = S.me && S.me.role === 'admin';
    var el = stage(header(0, esc(t('Collect tzedakah.')) + '<br><span class="grad">' + esc(t('Face to face.')) + '</span>', esc(t('The donor looks at the tablet. facePay finds them, hears the amount, and you press the green button.'))) +
      '<div class="tz-hero-actions"><button class="tz-big" id="tz-go">' + esc(t('Start collecting')) + '<small>' + esc(t('Open camera')) + '</small></button>' +
      (admin ? '<a class="tz-big alt" id="tz-settings" href="/settings">' + esc(t('Settings')) + '<small>' + DONORS.length + ' ' + esc(t('donors')) + ' \u00B7 ' + n + ' ' + esc(t('gifts')) + ' \u00B7 ' + usd2(total) + '</small></a>' : '<button class="tz-big alt" id="tz-out">' + esc(t('Sign out')) + '<small>' + esc(S.me.user) + '</small></button>') + '</div>' +
      simBadge() + '<p class="local-note tz-note">' + esc(t('Demo build. Use made-up donor details only.')) + ' ' + esc(t('Donors and receipts are saved on the server. Charge is simulated.')) + ' ' + esc(t('Face and video clip stay on this device only.')) + '</p>' +
      '<p class="tz-foot">' + FP.langBtn() + (admin ? '<button class="tz-link" id="tz-out2">' + esc(t('Sign out')) + '</button>' : '') + '</p>');
    el.querySelector('#tz-go').onclick = function () { S.donor = null; S.samples = []; S.amount = null; S.heard = ''; view('scan'); };
    var out = el.querySelector('#tz-out') || el.querySelector('#tz-out2'); if (out) out.onclick = function () { FP.logout().then(function () { render(S.app); }); };
    FP.bindLang(el);
  }

  /* ---------- scan (1:N face match, on this device) ---------- */
  function vScan() {
    var el = stage(header(1, esc(t('Look at the camera')), esc(t('Hold the tablet at face height. One donor at a time.'))) +
      '<div class="tz-grid"><div class="tz-cam glass"><div class="tz-vid" id="tz-vid"></div><span class="tz-cam-label" id="tz-label">' + esc(t('CAMERA OFF')) + '</span></div>' +
      '<div class="tz-side glass"><p class="tz-status" id="tz-status" role="status" aria-live="polite">' + esc(t('Tap the button to turn the camera on.')) + '</p>' +
      '<button class="tz-big" id="tz-cam-on">' + esc(t('Open camera')) + '</button>' +
      '<button class="tz-big alt" id="tz-sim-face">' + esc(t('Simulate a recognized donor')) + '</button>' +
      '<button class="tz-link" id="tz-back">' + (FP.lang() === 'yi' ? '\u2192 ' : '\u2190 ') + esc(t('Back')) + '</button></div></div>');
    var vid = el.querySelector('#tz-vid'); vid.appendChild(S.video);
    var label = el.querySelector('#tz-label'), status = el.querySelector('#tz-status'), on = el.querySelector('#tz-cam-on');
    el.querySelector('#tz-back').onclick = leaveTo('start');
    el.querySelector('#tz-sim-face').onclick = function () { stopMedia(); S.cancelled = false; S.timers = []; simulateFace(); };
    if (!cameraSupported()) { status.textContent = t('Camera is not available here (needs HTTPS and a camera). Use the simulated donor below to try the full flow.'); on.hidden = true; }
    on.onclick = async function () {
      on.disabled = true; status.textContent = t('Allow camera and microphone when asked.');
      try {
        var stream;
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } } }); S.hasAudio = true; }
        catch (e1) { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } } }); S.hasAudio = false; }
        if (S.cancelled || S.view !== 'scan') { stream.getTracks().forEach(function (tr) { tr.stop(); }); return; }
        S.stream = stream; S.video.srcObject = stream; await S.video.play();
        label.textContent = t('LIVE \u00B7 ON DEVICE'); status.textContent = t('Loading face models. First use may take a moment.');
        await FacePayFace.load(); if (S.cancelled || S.view !== 'scan') return;
        on.hidden = true; S.samples = []; S.started = Date.now(); scanTick(label, status);
      } catch (e) {
        on.disabled = false; on.textContent = t('Try camera again');
        status.textContent = e && e.name === 'NotAllowedError' ? t('Camera permission was denied. Allow it in browser settings, or use the simulated donor.') : t('Could not start the camera or face models. Retry, or use the simulated donor.');
        if (S.stream) { S.stream.getTracks().forEach(function (tr) { tr.stop(); }); S.stream = null; }
      }
    };
  }
  function bestDonor(d) {
    var best = null;
    DONORS.forEach(function (x) {
      var fs = faceOf(x); if (!fs) return;
      var avg = fs.reduce(function (s, y) { return s + FacePayFace.distance(d, y); }, 0) / fs.length;
      if (avg < FacePayFace.threshold && (!best || avg < best.avg)) best = { donor: x, avg: avg };
    });
    return best;
  }
  async function scanTick(label, status) {
    if (S.cancelled || S.view !== 'scan') return;
    var video = S.video;
    try {
      if (Date.now() - S.started > 60000) { status.textContent = t('No clear face yet. Face the light and tap Open camera to retry.'); return; }
      if (video.readyState < 2 || !video.videoWidth) { S.timers.push(setTimeout(function () { scanTick(label, status); }, 250)); return; }
      var results = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.6 })).withFaceLandmarks().withFaceDescriptors();
      if (S.cancelled || S.view !== 'scan') return;
      var one = results.length === 1 ? results[0] : null;
      var clear = one && one.detection.box.width / video.videoWidth > 0.18 && one.detection.box.height / video.videoHeight > 0.24;
      var cam = S.app.querySelector('.tz-cam'); if (cam) cam.classList.toggle('detected', !!clear);
      if (!clear) { S.samples = []; status.textContent = results.length > 1 ? t('More than one face. One donor at a time.') : t('Center the donor\u2019s face and move closer.'); label.textContent = results.length > 1 ? t('ONE FACE ONLY') : t('LOOKING FOR A FACE'); }
      else {
        var d = Array.from(one.descriptor); label.textContent = t('FACE DETECTED'); S.samples.push(d); status.textContent = t('Checking') + ' \u00B7 ' + S.samples.length + ' ' + t('of') + ' 3';
        if (S.samples.length >= 3) {
          var votes = {}, bestBy = {};
          S.samples.forEach(function (s) { var b = bestDonor(s); if (b) { votes[b.donor.id] = (votes[b.donor.id] || 0) + 1; bestBy[b.donor.id] = b.donor; } });
          var id = Object.keys(votes).sort(function (a, b) { return votes[b] - votes[a]; })[0];
          if (id && votes[id] >= 2) { S.donor = bestBy[id]; S.matchedReal = true; label.textContent = t('MATCHED'); status.textContent = t('Matched') + ' ' + S.donor.name; S.timers.push(setTimeout(function () { view('voice'); }, 700)); return; }
          var consistent = S.samples.every(function (s) { return FacePayFace.match(s, [S.samples[0], S.samples[0], S.samples[0]]); });
          if (!consistent) { S.samples = []; status.textContent = t('Keep the same face in view.'); }
          else { view('unknown'); return; }
        }
      }
      S.timers.push(setTimeout(function () { scanTick(label, status); }, 450));
    } catch (e) { status.textContent = t('Face detection could not finish. Tap Open camera to retry, or use the simulated donor.'); var b = S.app.querySelector('#tz-cam-on'); if (b) { b.hidden = false; b.disabled = false; } }
  }
  function mkDonor(body) { return FP.api('POST', '/donors', body).then(function (j) { return refreshDonors().then(function () { return DONORS.find(function (x) { return x.id === j.donor.id; }) || j.donor; }); }); }
  function simulateFace() {
    var go = function (d) { S.donor = d; S.matchedReal = false; S.simulated = true; view('voice'); };
    var d = DONORS.find(function (x) { return x.id !== 'guest'; });
    if (d) return go(d);
    mkDonor({ name: 'Demo Donor', phone: '+1 555 010 0100', email: 'demo@example.com' }).then(go).catch(function () { toast(t('Could not reach the server. Nothing was saved.')); });
  }

  /* ---------- unknown face: quick enroll or guest ---------- */
  function vUnknown() {
    var el = stage(header(1, esc(t('New face')), esc(t('We do not know this donor yet. Add them in ten seconds, or continue as a guest.'))) +
      '<div class="tz-grid"><div class="tz-cam glass"><div class="tz-vid" id="tz-vid"></div><span class="tz-cam-label">' + esc(t('NOT RECOGNIZED')) + '</span></div><div class="tz-side glass">' +
      '<p class="tz-simbadge">' + esc(t('Demo build. Use made-up donor details only.')) + '</p>' +
      '<div class="tz-field"><label for="tz-name">' + esc(t('Name')) + '</label><input id="tz-name" maxlength="60" autocomplete="off" placeholder="' + esc(t('Donor name')) + '"></div>' +
      '<div class="tz-field"><label for="tz-phone">' + esc(t('Phone')) + '</label><input id="tz-phone" type="tel" dir="ltr" maxlength="30" placeholder="+1 555 010 0100"></div>' +
      '<div class="tz-field"><label for="tz-email">' + esc(t('Email')) + '</label><input id="tz-email" type="email" dir="ltr" maxlength="100" placeholder="donor@example.com"></div>' +
      '<button class="tz-big" id="tz-enroll">' + esc(t('Save donor and continue')) + '</button><button class="tz-big alt" id="tz-guest">' + esc(t('Continue as guest')) + '</button><button class="tz-link" id="tz-retry">' + esc(t('Try the camera again')) + '</button></div></div>');
    el.querySelector('#tz-vid').appendChild(S.video);
    var fail = function () { toast(t('Could not reach the server. Nothing was saved.')); };
    el.querySelector('#tz-retry').onclick = function () { S.samples = []; stopMedia(); S.cancelled = false; S.timers = []; view('scan'); };
    el.querySelector('#tz-guest').onclick = function () { mkDonor({ guest: true, name: 'Guest donor' }).then(function (g) { S.donor = g; view('voice'); }).catch(fail); };
    el.querySelector('#tz-enroll').onclick = function () {
      var name = el.querySelector('#tz-name').value.trim(); if (!name) { toast(t('Add a name first')); return; }
      var samples = S.samples.slice(0, 3);
      mkDonor({ name: name, phone: el.querySelector('#tz-phone').value.trim(), email: el.querySelector('#tz-email').value.trim() }).then(function (d) { setLocalFace(d.id, samples); S.donor = d; view('voice'); }).catch(fail);
    };
  }

  /* ---------- voice + video clip (clip stays local) ---------- */
  function startRecording() {
    if (!S.stream || !window.MediaRecorder) return;
    try {
      var mt = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(function (m) { return MediaRecorder.isTypeSupported(m); });
      S.chunks = []; S.clip = null; S.mime = mt || '';
      var r = new MediaRecorder(S.stream, mt ? { mimeType: mt } : undefined); S.recorder = r; S.recStart = Date.now();
      r.ondataavailable = function (e) { if (e.data && e.data.size) S.chunks.push(e.data); };
      S.recPromise = new Promise(function (res) { r.onstop = function () { S.clipMs = Date.now() - S.recStart; S.clip = S.chunks.length ? new Blob(S.chunks, { type: r.mimeType || mt || 'video/webm' }) : null; res(S.clip); }; });
      r.start(500);
      S.timers.push(setTimeout(stopRecording, 9000));
      var badge = S.app.querySelector('#tz-rec'); if (badge) badge.hidden = false;
    } catch (e) { S.recorder = null; }
  }
  function stopRecording() {
    var b = S.app && S.app.querySelector('#tz-rec'); if (b) b.hidden = true;
    if (S.recorder && S.recorder.state !== 'inactive') { try { S.recorder.stop(); } catch (e) {} }
  }
  /* On-device speech only. Never fall back to network speech: if processLocally is unsupported or the language pack is missing, live speech stays OFF. */
  function localVoice(lang) {
    var C = SR();
    if (!C || !('processLocally' in C.prototype) || typeof C.available !== 'function') return Promise.resolve('unsupported');
    return C.available({ langs: [lang], processLocally: true }).then(function (st) { return st === 'available' ? 'ready' : (st === 'downloadable' || st === 'downloading') ? 'downloadable' : 'unsupported'; }).catch(function () { return 'unsupported'; });
  }
  function vVoice() {
    var tok = {}; S.voiceTok = tok;
    stage('<div class="tz-charging"><div class="tz-spin"></div><p class="tz-sub">' + esc(t('Checking on-device voice\u2026')) + '</p></div>');
    localVoice(S.vlang).then(function (m) { if (S.voiceTok !== tok || S.view !== 'voice') return; S.voiceMode = m; drawVoice(); });
  }
  function drawVoice() {
    var d = S.donor, recOk = S.voiceMode === 'ready' && !S.simulated, presets = CFG.amounts || [];
    S.amount = null; S.heard = '';
    var el = stage(header(2, esc(t('How much')) + ', ' + esc(d.name.split(' ')[0]) + '?', esc(recOk ? t('The donor just says the amount out loud, in English, Yiddish or Hebrew. Nothing to type. For example \u201Cfive dollars\u201D, \u201C18\u201D, \u201Cfinf\u201D, \u201Cakhtsn\u201D.') : t('Live voice is off here. Watch the synthetic demo amount, or pick one below.'))) +
      '<div class="tz-grid"><div class="tz-cam glass"><div class="tz-vid" id="tz-vid"></div><span class="tz-rec" id="tz-rec" hidden>\u25CF REC</span><span class="tz-cam-label" id="tz-label">' + esc(S.stream ? t('LIVE \u00B7 CLIP RECORDING') : t('NO CAMERA \u00B7 SIMULATED')) + '</span>' +
      '<div class="tz-donor-chip"><strong>' + esc(d.name) + '</strong><span>' + esc(S.matchedReal ? t('Face matched') : S.simulated ? t('Simulated match') : d.id === 'guest' ? t('Guest') : t('Selected')) + '</span></div></div>' +
      '<div class="tz-side glass"><div class="tz-mic" id="tz-mic"><span class="tz-mic-dot"></span><span id="tz-mic-text">' + esc(t('Starting voice capture\u2026')) + '</span></div>' +
      '<div class="tz-heard" id="tz-heard" aria-live="polite">' + esc(t('Waiting for the donor\u2026')) + '</div>' +
      '<div class="tz-amount" id="tz-amount" hidden></div>' +
      '<button class="tz-confirm" id="tz-confirm" hidden></button>' + simBadge() +
      '<div class="tz-row"><button class="tz-mid" id="tz-listen">' + (recOk ? '\u21BB ' + esc(t('Listen again')) : esc(t('Simulate donor voice'))) + '</button>' + (recOk ? '<button class="tz-mid" id="tz-lang" aria-label="' + esc(t('Voice language')) + '">' + (S.vlang === 'en-US' ? 'English' : '\u05E2\u05D1\u05E8\u05D9\u05EA') + '</button>' : '') + '</div>' +
      '<div id="tz-manual" hidden><p class="tz-label-small">' + esc(t('Could not catch an amount. Pick one:')) + '</p><div class="tz-presets" id="tz-presets">' + presets.map(function (p) { return '<button class="tz-pre" data-a="' + p + '">' + usd(p) + '</button>'; }).join('') + '</div>' +
      '<div class="tz-custom"><input id="tz-custom" type="number" dir="ltr" inputmode="decimal" min="1" max="' + CFG.max_amount + '" step="1" placeholder="' + esc(t('Other amount')) + '"><button class="tz-mid" id="tz-custom-ok">' + esc(t('Set')) + '</button></div></div>' +
      (recOk ? '<p class="local-note">' + esc(t('Voice is understood on this device only (browser on-device speech).')) + '</p>' : '<p class="tz-simbadge">' + esc(t('SYNTHETIC VOICE DEMO \u00B7 NO REAL SPEECH IS ANALYZED')) + '</p><p class="local-note">' + esc(S.voiceMode === 'downloadable' ? t('This browser can download an on-device voice pack. Until then voice is off and the amount below is made up.') : t('On-device speech recognition is not available here, so live voice is off. Nothing is sent to a speech service. The amount below is made up, or pick one.')) + '</p>' + (S.voiceMode === 'downloadable' && !S.simulated ? '<button class="tz-mid" id="tz-install">' + esc(t('Download on-device voice pack')) + '</button>' : '')) +
      '<button class="tz-link" id="tz-cancel">' + (FP.lang() === 'yi' ? '\u2192 ' : '\u2190 ') + esc(t('Cancel and start over')) + '</button></div></div>');
    el.querySelector('#tz-vid').appendChild(S.video);
    if (S.stream) { S.video.srcObject = S.stream; S.video.play().catch(function () {}); startRecording(); }
    el.querySelector('#tz-cancel').onclick = leaveTo('start');
    var inst = el.querySelector('#tz-install');
    if (inst) inst.onclick = function () { inst.disabled = true; inst.textContent = '\u2026'; Promise.resolve(SR().install({ langs: [S.vlang], processLocally: true })).catch(function () {}).then(function () { if (S.view === 'voice') view('voice'); }); };
    el.querySelectorAll('.tz-pre').forEach(function (b) { b.onclick = function () { setAmount(Number(b.dataset.a), 'Picked by collector'); }; });
    el.querySelector('#tz-custom-ok').onclick = function () { var v = parseFloat(el.querySelector('#tz-custom').value); if (!(v > 0 && v <= CFG.max_amount)) { toast(t('Enter an amount from 1 to 5000')); return; } setAmount(Math.round(v * 100) / 100, 'Picked by collector'); };
    var lang = el.querySelector('#tz-lang');
    if (lang) lang.onclick = function () { S.vlang = S.vlang === 'en-US' ? 'he-IL' : 'en-US'; stopRecording(); view('voice'); };
    el.querySelector('#tz-listen').onclick = function () { if (recOk) listen(); else simulateVoice(); };
    if (recOk) listen(); else { micState('idle', t('Live voice is off. Synthetic demo only.')); S.timers.push(setTimeout(simulateVoice, 1200)); }
  }
  function showManual() { var m = S.app && S.app.querySelector('#tz-manual'); if (m && !S.amount) m.hidden = false; }
  function micState(k, text) { var m = S.app.querySelector('#tz-mic'); if (!m) return; m.className = 'tz-mic ' + k; S.app.querySelector('#tz-mic-text').textContent = text; }
  function heard(text, note) { var h = S.app.querySelector('#tz-heard'); if (h) h.innerHTML = text ? '<small>' + esc(t('Heard')) + '</small>\u201C' + esc(text) + '\u201D' + (note ? '<em>' + esc(note) + '</em>' : '') : esc(note || ''); }
  function listen() {
    var Ctor = SR(); if (!Ctor) return;
    try { if (S.rec) { S.rec.onend = null; S.rec.abort(); } } catch (e) {}
    var r = new Ctor(), got = false;
    r.processLocally = true;
    if (r.processLocally !== true) { micState('idle', t('Voice is off: on-device speech could not be enforced.')); showManual(); return; }
    S.rec = r; r.lang = S.vlang; r.interimResults = true; r.maxAlternatives = 5; r.continuous = false;
    r.onstart = function () { micState('live', t('Listening\u2026 say the amount')); };
    r.onresult = function (e) {
      var res = e.results[e.results.length - 1], alts = [];
      for (var i = 0; i < res.length; i++) alts.push(res[i].transcript);
      heard(alts[0], res.isFinal ? '' : t('listening\u2026'));
      if (res.isFinal) {
        got = true; var amt = null;
        for (var j = 0; j < alts.length && amt == null; j++) amt = parseAmount(alts[j]);
        if (amt != null) setAmount(amt, 'Heard: \u201C' + alts[0] + '\u201D'); else { micState('idle', t('Amount not clear')); heard(alts[0], t('No amount found. Tap Listen again, or pick the amount below.')); showManual(); }
      }
    };
    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { micState('idle', t('Microphone blocked. Use the buttons below.')); heard('', t('Voice is blocked here. Tap Simulate, or pick an amount below.')); showManual(); var b = S.app.querySelector('#tz-listen'); if (b) { b.textContent = t('Simulate donor voice'); b.onclick = simulateVoice; } }
      else if (e.error === 'no-speech') { micState('idle', t('Nothing heard')); heard('', t('Nothing heard. Tap Listen again.')); showManual(); }
      else if (e.error === 'language-not-supported') { micState('idle', t('Voice is off: no on-device language pack.')); heard('', t('Nothing is sent to a speech service. Pick an amount below.')); showManual(); }
      else if (e.error !== 'aborted') { micState('idle', t('Voice error') + ': ' + e.error); showManual(); }
    };
    r.onend = function () { if (!got && S.view === 'voice' && S.app.querySelector('#tz-mic.live')) { micState('idle', t('Nothing heard')); heard('', t('Nothing heard. Tap Listen again, or pick the amount.')); showManual(); } };
    try { r.start(); } catch (e) { micState('idle', t('Could not start voice capture')); showManual(); }
  }
  var SIM = [['five dollars', 5], ['akhtsn', 18], ['zeks un draysik', 36], ['$10', 10], ['double chai', 36], ['tsen dollar', 10]];
  function simulateVoice() {
    var pick = SIM[Math.floor(Math.random() * SIM.length)], amt = parseAmount(pick[0]);
    micState('live', t('Synthetic demo voice\u2026')); heard(pick[0], t('made-up transcript, not real speech'));
    S.timers.push(setTimeout(function () { if (S.view === 'voice') setAmount(amt, 'Simulated: \u201C' + pick[0] + '\u201D'); }, 900));
  }
  function setAmount(a, source) {
    if (S.view !== 'voice') return;
    S.amount = a; S.heardSource = source;
    micState('done', t('Amount caught \u00B7 charge prepared')); var mm = S.app.querySelector('#tz-manual'); if (mm) mm.hidden = true;
    var picked = source.indexOf('Picked') === 0;
    heard(picked ? '' : source.replace(/^(Heard|Simulated): /, '').replace(/^\u201C|\u201D$/g, ''), picked ? t('Picked by collector') : '');
    var am = S.app.querySelector('#tz-amount'); am.hidden = false; am.innerHTML = '<small>' + esc(t('Amount')) + '</small><strong>' + usd(a) + '</strong>';
    var c = S.app.querySelector('#tz-confirm'); c.hidden = false; c.innerHTML = '\u2713 ' + esc(t('Confirm')) + ' ' + usd(a) + '<small>' + esc(t('Charge ready \u00B7 tap to charge')) + ' ' + esc(maskCard(S.donor)) + '</small>';
    c.onclick = confirmDonation; c.focus({ preventScroll: true });
    try { if (S.rec) { S.rec.onend = null; S.rec.stop(); } } catch (e) {}
    c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    S.timers.push(setTimeout(stopRecording, 1500));
  }

  /* ---------- confirm, charge (simulated, server), save ---------- */
  async function confirmDonation() {
    var btn = S.app.querySelector('#tz-confirm'); if (btn) btn.disabled = true;
    try { if (S.rec) { S.rec.onend = null; S.rec.abort(); } } catch (e) {}
    stopRecording();
    if (S.recPromise) { try { await Promise.race([S.recPromise, new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) {} }
    view('charging');
    finishDonation();
  }
  function vCharging() {
    stage('<div class="tz-charging"><div class="tz-spin"></div><h1 class="tz-title">' + esc(t('Charging')) + ' ' + usd(S.amount) + '</h1><p class="tz-sub">' + esc(maskCard(S.donor)) + ' \u00B7 ' + esc(t('simulated, no money moves')) + '</p></div>');
    if (S.stream) { S.stream.getTracks().forEach(function (tr) { tr.stop(); }); S.stream = null; if (S.video) S.video.srcObject = null; }
  }
  async function finishDonation() {
    var j;
    try { j = await FP.api('POST', '/donations', { donor_id: S.donor.id, amount: S.amount, heard: S.heardSource || '' }); }
    catch (e) { toast(e.status === 401 ? t('Wrong username or password') : t('Could not reach the server. Nothing was saved.')); if (e.status === 401) return render(S.app); S.amount = null; return view('start'); }
    var clipSaved = false;
    if (S.clip && S.clip.size > 0) { try { await putVideo({ id: 'v-' + j.donation.id, donorId: S.donor.id, receiptId: j.donation.id, blob: S.clip, mime: S.clip.type, ms: S.clipMs, date: j.donation.created_at }); clipSaved = true; } catch (e) { toast(t('Could not save the video clip. The donation was still recorded.')); } }
    S.receipt = j.donation; S.clipSaved = clipSaved;
    refreshDonors().catch(function () {});
    view('success');
  }

  function vSuccess() {
    var d = S.donor, r = S.receipt, admin = S.me && S.me.role === 'admin';
    var el = stage('<div class="tz-success glass"><div class="tz-check">\u2713</div><p class="eyebrow">' + esc(t('DONATION RECEIVED')) + '</p><h1 class="tz-title">' + usd2(r.amount_cents / 100) + '<br><span class="grad">' + esc(t('from')) + ' ' + esc(d.name) + '</span></h1><p class="tz-sub">' + esc(t('Thank you. Tizku l\u2019mitzvos.')) + '</p>' +
      simBadge() + '<div class="tz-receipt"><div><span>' + esc(t('Receipt')) + '</span><strong dir="ltr">' + esc(r.id) + '</strong></div><div><span>' + esc(t('Card')) + '</span><strong>' + esc(maskCard(d)) + '</strong></div><div><span>' + esc(t('Phone')) + '</span><strong dir="ltr">' + esc(d.phone || t('not given')) + '</strong></div><div><span>' + esc(t('Email')) + '</span><strong dir="ltr">' + esc(d.email || t('not given')) + '</strong></div><div><span>' + esc(t('Video clip')) + '</span><strong>' + esc(S.clipSaved ? t('Saved to donor record') : t('None (no camera)')) + '</strong></div></div>' +
      '<div class="tz-hero-actions"><button class="tz-big" id="tz-next">' + esc(t('Next donor')) + '</button>' + (admin ? '<a class="tz-big alt" href="/settings">' + esc(t('Settings')) + '</a>' : '') + '</div><p class="local-note">' + esc(t('Donors and receipts are saved on the server. Charge is simulated.')) + ' ' + esc(t('Face and video clip stay on this device only.')) + '</p></div>');
    el.querySelector('#tz-next').onclick = function () { view('start'); };
  }

  window.addEventListener('pagehide', function () { stopMedia(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && S && (S.view === 'scan' || S.view === 'voice')) { stopMedia(); S.cancelled = false; S.timers = []; S.stream = null; view('start'); toast(t('Camera stopped while the page was in the background')); } });
  window.FacePayTzedakah = { render: render, stop: function () { stopMedia(); }, parseAmount: parseAmount };
})();
