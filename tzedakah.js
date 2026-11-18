/* facePay Tzedakah mode: collector-facing donation flow. Face match, voice amount, simulated charge. Browser only. */
(function () {
  'use strict';
  var DB_NAME = 'facepay-tzedakah', STORE = 'videos', KEY = 'facepay-donors';
  var S = null; // session

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function usd(n) { return '$' + Number(n).toFixed(n % 1 ? 2 : 0); }
  function usd2(n) { return '$' + Number(n).toFixed(2); }
  function loadJSON(k, f) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  function toast(m) { var t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(function () { t.remove(); }, 3200); }

  /* ---------- IndexedDB video store ---------- */
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
  function getVideo(id) { return idb('readonly', function (st) { return st.get(id); }); }
  function delVideo(id) { return idb('readwrite', function (st) { return st.delete(id); }); }
  function clearAll() { try { localStorage.removeItem(KEY); } catch (e) {} return idb('readwrite', function (st) { return st.clear(); }).catch(function () {}); }

  /* ---------- donors database ---------- */
  function validDesc(d) { return window.FacePayFace && FacePayFace.valid(d); }
  function hasFace(d) { return d && Array.isArray(d.faceDescriptors) && d.faceDescriptors.length >= 3 && d.faceDescriptors.every(validDesc); }
  function donors() {
    var list = loadJSON(KEY, []);
    if (!Array.isArray(list)) list = [];
    var p = loadJSON('facepay-profile', {});
    if (p && p.name) {
      var d = list.find(function (x) { return x.id === 'signup'; });
      if (!d) { d = { id: 'signup', donations: [], createdAt: p.faceEnrolledAt || new Date().toISOString() }; list.unshift(d); }
      d.name = p.name; d.phone = p.phone || ''; d.email = p.email || ''; d.cardLast4 = p.last4 || '4242'; d.cardLabel = 'Test card';
      d.faceDescriptors = p.faceDescriptors && p.faceModel === 'face-api-0.22.2' ? p.faceDescriptors : null;
    }
    return list;
  }
  function saveDonors(list) {
    if (!saveJSON(KEY, list)) toast('Could not save donor records. Browser storage may be full.');
  }
  function maskCard(d) { return (d.cardLabel || 'Test card') + ' \u2022\u2022\u2022\u2022 ' + (d.cardLast4 || '4242'); }

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
    return { view: 'start', stream: null, video: null, recorder: null, chunks: [], clip: null, clipMs: 0, donor: null, samples: [], amount: null, heard: '', lang: 'en-US', rec: null, simulated: false, timers: [], mime: '', hasAudio: false, cancelled: false, receipt: null };
  }
  function stopMedia() {
    if (!S) return;
    S.cancelled = true;
    S.timers.forEach(clearTimeout); S.timers = [];
    try { if (S.rec) { S.rec.onend = null; S.rec.abort(); } } catch (e) {}
    S.rec = null;
    try { if (S.recorder && S.recorder.state !== 'inactive') { S.recorder.onstop = null; S.recorder.stop(); } } catch (e) {}
    S.recorder = null;
    if (S.stream) S.stream.getTracks().forEach(function (t) { t.stop(); });
    S.stream = null;
    if (S.video) S.video.srcObject = null;
  }
  function cameraSupported() { return !!(window.isSecureContext && navigator.mediaDevices && navigator.mediaDevices.getUserMedia); }
  function SR() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }

  /* ---------- render entry ---------- */
  function render(app) {
    stopMedia();
    S = newSession();
    S.app = app;
    S.video = document.createElement('video');
    S.video.setAttribute('playsinline', ''); S.video.muted = true; S.video.autoplay = true;
    view('start');
  }
  function stage(html, cls) {
    var app = S.app;
    app.innerHTML = '<div class="tz ' + (cls || '') + '">' + html + '</div>';
    return app.firstChild;
  }
  function view(name) { S.view = name; ({ start: vStart, scan: vScan, unknown: vUnknown, voice: vVoice, charging: vCharging, success: vSuccess, donors: vDonors, donor: vDonor })[name](); window.scrollTo(0, 0); }
  function header(step, title, sub) {
    var steps = ['Face', 'Amount', 'Confirm', 'Done'];
    return '<div class="tz-head"><p class="eyebrow">TZEDAKAH MODE \u00B7 COLLECTOR</p><h1 class="tz-title">' + title + '</h1>' + (sub ? '<p class="tz-sub">' + sub + '</p>' : '') +
      (step ? '<div class="tz-steps" aria-label="Progress">' + steps.map(function (s, i) { return '<span class="' + (i + 1 < step ? 'done' : i + 1 === step ? 'now' : '') + '">' + (i + 1) + ' \u00B7 ' + s + '</span>'; }).join('') + '</div>' : '') + '</div>';
  }
  function leaveTo(v) { return function () { stopMedia(); S.cancelled = false; S.timers = []; S.stream = null; S.rec = null; view(v); }; }

  /* ---------- start ---------- */
  function vStart() {
    var list = donors(), n = list.reduce(function (s, d) { return s + (d.donations ? d.donations.length : 0); }, 0);
    var total = list.reduce(function (s, d) { return s + (d.donations || []).reduce(function (a, x) { return a + x.amount; }, 0); }, 0);
    var el = stage(header(0, 'Collect tzedakah.<br><span class="grad">Face to face.</span>', 'The donor looks at the tablet. facePay finds them, hears the amount, and you press the green button.') +
      '<div class="tz-hero-actions"><button class="tz-big" id="tz-go">Start collecting<small>Open camera</small></button><button class="tz-big alt" id="tz-donors">Donor records<small>' + list.length + ' donors \u00B7 ' + n + ' gifts \u00B7 ' + usd2(total) + '</small></button></div>' +
      '<p class="local-note tz-note">Demo. Face matching runs on this device. The charge is simulated on the fictional test card from sign-up. The camera clip and donor details stay in this browser.</p>');
    el.querySelector('#tz-go').onclick = function () { S.donor = null; S.samples = []; S.amount = null; S.heard = ''; view('scan'); };
    el.querySelector('#tz-donors').onclick = function () { view('donors'); };
  }

  /* ---------- scan (1:N face match) ---------- */
  function vScan() {
    var el = stage(header(1, 'Look at the camera', 'Hold the tablet at face height. One donor at a time.') +
      '<div class="tz-grid"><div class="tz-cam glass"><div class="tz-vid" id="tz-vid"></div><span class="tz-cam-label" id="tz-label">CAMERA OFF</span></div>' +
      '<div class="tz-side glass"><p class="tz-status" id="tz-status" role="status" aria-live="polite">Tap the button to turn the camera on.</p>' +
      '<button class="tz-big" id="tz-cam-on">Open camera</button>' +
      '<button class="tz-big alt" id="tz-sim-face">Simulate a recognized donor</button>' +
      '<button class="tz-link" id="tz-back">\u2190 Back</button></div></div>');
    var vid = el.querySelector('#tz-vid'); vid.appendChild(S.video);
    var label = el.querySelector('#tz-label'), status = el.querySelector('#tz-status'), on = el.querySelector('#tz-cam-on');
    el.querySelector('#tz-back').onclick = leaveTo('start');
    el.querySelector('#tz-sim-face').onclick = function () { stopMedia(); S.cancelled = false; S.timers = []; simulateFace(); };
    if (!cameraSupported()) { status.textContent = 'Camera is not available here (needs HTTPS and a camera). Use the simulated donor below to try the full flow.'; on.hidden = true; }
    on.onclick = async function () {
      on.disabled = true; status.textContent = 'Allow camera and microphone when asked.';
      try {
        var stream;
        try { stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } } }); S.hasAudio = true; }
        catch (e1) { stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } } }); S.hasAudio = false; }
        if (S.cancelled || S.view !== 'scan') { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        S.stream = stream; S.video.srcObject = stream; await S.video.play();
        label.textContent = 'LIVE \u00B7 ON DEVICE'; status.textContent = 'Loading face models. First use may take a moment.';
        await FacePayFace.load(); if (S.cancelled || S.view !== 'scan') return;
        on.hidden = true; S.samples = []; S.started = Date.now(); scanTick(label, status);
      } catch (e) {
        on.disabled = false; on.textContent = 'Try camera again';
        status.textContent = e && e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow it in browser settings, or use the simulated donor.' : 'Could not start the camera or face models. Retry, or use the simulated donor.';
        if (S.stream) { S.stream.getTracks().forEach(function (t) { t.stop(); }); S.stream = null; }
      }
    };
  }
  function bestDonor(d) {
    var best = null;
    donors().forEach(function (x) {
      if (!hasFace(x)) return;
      var avg = x.faceDescriptors.reduce(function (s, y) { return s + FacePayFace.distance(d, y); }, 0) / x.faceDescriptors.length;
      if (avg < FacePayFace.threshold && (!best || avg < best.avg)) best = { donor: x, avg: avg };
    });
    return best;
  }
  async function scanTick(label, status) {
    if (S.cancelled || S.view !== 'scan') return;
    var video = S.video;
    try {
      if (Date.now() - S.started > 60000) { status.textContent = 'No clear face yet. Face the light and tap Open camera to retry.'; return; }
      if (video.readyState < 2 || !video.videoWidth) { S.timers.push(setTimeout(function () { scanTick(label, status); }, 250)); return; }
      var results = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.6 })).withFaceLandmarks().withFaceDescriptors();
      if (S.cancelled || S.view !== 'scan') return;
      var one = results.length === 1 ? results[0] : null;
      var clear = one && one.detection.box.width / video.videoWidth > 0.18 && one.detection.box.height / video.videoHeight > 0.24;
      var cam = S.app.querySelector('.tz-cam'); if (cam) cam.classList.toggle('detected', !!clear);
      if (!clear) { S.samples = []; status.textContent = results.length > 1 ? 'More than one face. One donor at a time.' : 'Center the donor\u2019s face and move closer.'; label.textContent = results.length > 1 ? 'ONE FACE ONLY' : 'LOOKING FOR A FACE'; }
      else {
        var d = Array.from(one.descriptor); label.textContent = 'FACE DETECTED'; S.samples.push(d); status.textContent = 'Checking \u00B7 ' + S.samples.length + ' of 3';
        if (S.samples.length >= 3) {
          var votes = {}, bestBy = {};
          S.samples.forEach(function (s) { var b = bestDonor(s); if (b) { votes[b.donor.id] = (votes[b.donor.id] || 0) + 1; bestBy[b.donor.id] = b.donor; } });
          var id = Object.keys(votes).sort(function (a, b) { return votes[b] - votes[a]; })[0];
          if (id && votes[id] >= 2) { S.donor = bestBy[id]; S.matchedReal = true; label.textContent = 'MATCHED'; status.textContent = 'Matched ' + S.donor.name; S.timers.push(setTimeout(function () { view('voice'); }, 700)); return; }
          var consistent = S.samples.every(function (s) { return FacePayFace.match(s, [S.samples[0], S.samples[0], S.samples[0]]); });
          if (!consistent) { S.samples = []; status.textContent = 'Keep the same face in view.'; }
          else { view('unknown'); return; }
        }
      }
      S.timers.push(setTimeout(function () { scanTick(label, status); }, 450));
    } catch (e) { status.textContent = 'Face detection could not finish. Tap Open camera to retry, or use the simulated donor.'; var b = S.app.querySelector('#tz-cam-on'); if (b) { b.hidden = false; b.disabled = false; } }
  }
  function simulateFace() {
    var list = donors(), d = list.find(function (x) { return x.id === 'signup'; }) || list[0];
    if (!d) {
      d = { id: 'demo-donor', name: 'Demo Donor', phone: '+1 555 010 0100', email: 'demo@example.com', cardLast4: '4242', cardLabel: 'Test card', donations: [], createdAt: new Date().toISOString() };
      list.push(d); saveDonors(list);
    }
    S.donor = d; S.matchedReal = false; S.simulated = true; view('voice');
  }

  /* ---------- unknown face: quick enroll or guest ---------- */
  function vUnknown() {
    var el = stage(header(1, 'New face', 'We do not know this donor yet. Add them in ten seconds, or continue as a guest.') +
      '<div class="tz-grid"><div class="tz-cam glass"><div class="tz-vid" id="tz-vid"></div><span class="tz-cam-label">NOT RECOGNIZED</span></div><div class="tz-side glass">' +
      '<div class="tz-field"><label for="tz-name">Name</label><input id="tz-name" maxlength="60" autocomplete="off" placeholder="Donor name"></div>' +
      '<div class="tz-field"><label for="tz-phone">Phone</label><input id="tz-phone" type="tel" maxlength="30" placeholder="+1 555 010 0100"></div>' +
      '<div class="tz-field"><label for="tz-email">Email</label><input id="tz-email" type="email" maxlength="100" placeholder="donor@example.com"></div>' +
      '<button class="tz-big" id="tz-enroll">Save donor and continue</button><button class="tz-big alt" id="tz-guest">Continue as guest</button><button class="tz-link" id="tz-retry">Try the camera again</button></div></div>');
    el.querySelector('#tz-vid').appendChild(S.video);
    el.querySelector('#tz-retry').onclick = function () { S.samples = []; stopMedia(); S.cancelled = false; S.timers = []; view('scan'); };
    el.querySelector('#tz-guest').onclick = function () {
      var list = donors(), g = list.find(function (x) { return x.id === 'guest'; });
      if (!g) { g = { id: 'guest', name: 'Guest donor', phone: '', email: '', cardLast4: '4242', cardLabel: 'Test card', donations: [], createdAt: new Date().toISOString() }; list.push(g); saveDonors(list); }
      S.donor = g; view('voice');
    };
    el.querySelector('#tz-enroll').onclick = function () {
      var name = el.querySelector('#tz-name').value.trim(); if (!name) { toast('Add a name first'); return; }
      var list = donors();
      var d = { id: 'd-' + Date.now().toString(36), name: name, phone: el.querySelector('#tz-phone').value.trim(), email: el.querySelector('#tz-email').value.trim(), cardLast4: '4242', cardLabel: 'Test card', faceModel: 'face-api-0.22.2', faceDescriptors: S.samples.slice(0, 3), donations: [], createdAt: new Date().toISOString() };
      list.push(d); saveDonors(list); S.donor = d; view('voice');
    };
  }

  /* ---------- voice + video ---------- */
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
  var PRESETS = [5, 10, 18, 25, 36, 50, 72, 100, 180];
  function vVoice() {
    var d = S.donor, recOk = !!SR() && !S.simulated;
    S.amount = null; S.heard = '';
    var el = stage(header(2, 'How much, ' + esc(d.name.split(' ')[0]) + '?', 'The donor just says the amount out loud, in English, Yiddish or Hebrew. Nothing to type. For example \u201Cfive dollars\u201D, \u201C18\u201D, \u201Cfinf\u201D, \u201Cakhtsn\u201D.') +
      '<div class="tz-grid"><div class="tz-cam glass"><div class="tz-vid" id="tz-vid"></div><span class="tz-rec" id="tz-rec" hidden>\u25CF REC</span><span class="tz-cam-label" id="tz-label">' + (S.stream ? 'LIVE \u00B7 CLIP RECORDING' : 'NO CAMERA \u00B7 SIMULATED') + '</span>' +
      '<div class="tz-donor-chip"><strong>' + esc(d.name) + '</strong><span>' + (S.matchedReal ? 'Face matched' : S.simulated ? 'Simulated match' : d.id === 'guest' ? 'Guest' : 'Selected') + '</span></div></div>' +
      '<div class="tz-side glass"><div class="tz-mic" id="tz-mic"><span class="tz-mic-dot"></span><span id="tz-mic-text">Starting voice capture\u2026</span></div>' +
      '<div class="tz-heard" id="tz-heard" aria-live="polite">Waiting for the donor\u2026</div>' +
      '<div class="tz-amount" id="tz-amount" hidden></div>' +
      '<button class="tz-confirm" id="tz-confirm" hidden></button>' +
      '<div class="tz-row"><button class="tz-mid" id="tz-listen">' + (recOk ? '\u21BB Listen again' : 'Simulate donor voice') + '</button>' + (recOk ? '<button class="tz-mid" id="tz-lang">English</button>' : '') + '</div>' +
      '<div id="tz-manual" hidden><p class="tz-label-small">Could not catch an amount. Pick one:</p><div class="tz-presets" id="tz-presets">' + PRESETS.map(function (p) { return '<button class="tz-pre" data-a="' + p + '">' + usd(p) + '</button>'; }).join('') + '</div>' +
      '<div class="tz-custom"><input id="tz-custom" type="number" inputmode="decimal" min="1" max="5000" step="1" placeholder="Other amount"><button class="tz-mid" id="tz-custom-ok">Set</button></div></div>' +
      (recOk ? '' : '<p class="local-note">Voice recognition is not available in this browser, so the full flow runs with a simulated transcript. Chrome or Edge on Android, or Safari, supports it.</p>') +
      '<button class="tz-link" id="tz-cancel">\u2190 Cancel and start over</button></div></div>');
    el.querySelector('#tz-vid').appendChild(S.video);
    if (S.stream) { S.video.srcObject = S.stream; S.video.play().catch(function () {}); startRecording(); }
    else if (cameraSupported() && !S.simulated && !S.stream) { /* camera was not opened in this session (guest after simulated), simulated clip */ }
    el.querySelector('#tz-cancel').onclick = leaveTo('start');
    el.querySelectorAll('.tz-pre').forEach(function (b) { b.onclick = function () { setAmount(Number(b.dataset.a), 'Picked by collector'); }; });
    el.querySelector('#tz-custom-ok').onclick = function () { var v = parseFloat(el.querySelector('#tz-custom').value); if (!(v > 0 && v <= 5000)) { toast('Enter an amount from 1 to 5000'); return; } setAmount(Math.round(v * 100) / 100, 'Picked by collector'); };
    var lang = el.querySelector('#tz-lang');
    if (lang) lang.onclick = function () { S.lang = S.lang === 'en-US' ? 'he-IL' : 'en-US'; lang.textContent = S.lang === 'en-US' ? 'English' : '\u05E2\u05D1\u05E8\u05D9\u05EA'; listen(); };
    el.querySelector('#tz-listen').onclick = function () { if (recOk) listen(); else simulateVoice(); };
    if (recOk) listen(); else { micState('idle', 'Voice recognition unavailable here. Tap Simulate donor voice.'); S.timers.push(setTimeout(simulateVoice, 1200)); }
  }
  function showManual() { var m = S.app && S.app.querySelector('#tz-manual'); if (m && !S.amount) m.hidden = false; }
  function micState(k, text) { var m = S.app.querySelector('#tz-mic'); if (!m) return; m.className = 'tz-mic ' + k; S.app.querySelector('#tz-mic-text').textContent = text; }
  function heard(text, note) { var h = S.app.querySelector('#tz-heard'); if (h) h.innerHTML = text ? '<small>Heard</small>\u201C' + esc(text) + '\u201D' + (note ? '<em>' + esc(note) + '</em>' : '') : (note || ''); }
  function listen() {
    var Ctor = SR(); if (!Ctor) return;
    try { if (S.rec) { S.rec.onend = null; S.rec.abort(); } } catch (e) {}
    var r = new Ctor(), got = false, finalText = '';
    S.rec = r; r.lang = S.lang; r.interimResults = true; r.maxAlternatives = 5; r.continuous = false;
    r.onstart = function () { micState('live', 'Listening\u2026 say the amount'); };
    r.onresult = function (e) {
      var res = e.results[e.results.length - 1], alts = [];
      for (var i = 0; i < res.length; i++) alts.push(res[i].transcript);
      heard(alts[0], res.isFinal ? '' : 'listening\u2026');
      if (res.isFinal) {
        got = true; finalText = alts[0]; var amt = null;
        for (var j = 0; j < alts.length && amt == null; j++) amt = parseAmount(alts[j]);
        if (amt != null) setAmount(amt, 'Heard: \u201C' + alts[0] + '\u201D'); else { micState('idle', 'Amount not clear'); heard(alts[0], 'No amount found. Tap Listen again, or pick the amount below.'); showManual(); }
      }
    };
    r.onerror = function (e) {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { micState('idle', 'Microphone blocked. Use the buttons below.'); heard('', 'Voice is blocked here. Tap Simulate, or pick an amount below.'); showManual(); var b = S.app.querySelector('#tz-listen'); if (b) { b.textContent = 'Simulate donor voice'; b.onclick = simulateVoice; } }
      else if (e.error === 'no-speech') { micState('idle', 'Nothing heard'); heard('', 'Nothing heard. Tap Listen again.'); showManual(); }
      else if (e.error !== 'aborted') { micState('idle', 'Voice error: ' + e.error); showManual(); }
    };
    r.onend = function () { if (!got && S.view === 'voice' && S.app.querySelector('#tz-mic.live')) { micState('idle', 'Nothing heard'); heard('', 'Nothing heard. Tap Listen again, or pick the amount.'); showManual(); } };
    try { r.start(); } catch (e) { micState('idle', 'Could not start voice capture'); showManual(); }
  }
  var SIM = [['five dollars', 5], ['akhtsn', 18], ['zeks un draysik', 36], ['$10', 10], ['double chai', 36], ['tsen dollar', 10]];
  function simulateVoice() {
    var pick = SIM[Math.floor(Math.random() * SIM.length)], amt = parseAmount(pick[0]);
    micState('live', 'Simulated voice\u2026'); heard(pick[0], 'simulated transcript');
    S.timers.push(setTimeout(function () { if (S.view === 'voice') setAmount(amt, 'Simulated: \u201C' + pick[0] + '\u201D'); }, 900));
  }
  function setAmount(a, source) {
    if (S.view !== 'voice') return;
    S.amount = a; S.heardSource = source;
    micState('done', 'Amount caught \u00B7 charge prepared'); var mm=S.app.querySelector('#tz-manual'); if(mm) mm.hidden=true;
    heard(source.indexOf('Picked') === 0 ? '' : source.replace(/^(Heard|Simulated): /, '').replace(/^\u201C|\u201D$/g, ''), source.indexOf('Picked') === 0 ? 'Picked by collector' : '');
    var am = S.app.querySelector('#tz-amount'); am.hidden = false; am.innerHTML = '<small>Amount</small><strong>' + usd(a) + '</strong>';
    var c = S.app.querySelector('#tz-confirm'); c.hidden = false; c.innerHTML = '\u2713 Confirm ' + usd(a) + '<small>Charge ready \u00B7 tap to charge ' + esc(maskCard(S.donor)) + '</small>';
    c.onclick = confirmDonation; c.focus({ preventScroll: true });
    try { if (S.rec) { S.rec.onend = null; S.rec.stop(); } } catch (e) {}
    c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    S.timers.push(setTimeout(stopRecording, 1500));
  }

  /* ---------- confirm, charge, save ---------- */
  async function confirmDonation() {
    var btn = S.app.querySelector('#tz-confirm'); if (btn) btn.disabled = true;
    try { if (S.rec) { S.rec.onend = null; S.rec.abort(); } } catch (e) {}
    stopRecording();
    if (S.recPromise) { try { await Promise.race([S.recPromise, new Promise(function (r) { setTimeout(r, 1500); })]); } catch (e) {} }
    view('charging');
    S.timers.push(setTimeout(finishDonation, 1600));
  }
  function vCharging() {
    stage('<div class="tz-charging"><div class="tz-spin"></div><h1 class="tz-title">Charging ' + usd(S.amount) + '</h1><p class="tz-sub">' + esc(maskCard(S.donor)) + ' \u00B7 simulated, no money moves</p></div>');
    if (S.stream) { S.stream.getTracks().forEach(function (t) { t.stop(); }); S.stream = null; if (S.video) S.video.srcObject = null; }
  }
  async function finishDonation() {
    var list = donors(), d = list.find(function (x) { return x.id === S.donor.id; });
    if (!d) { d = S.donor; list.push(d); }
    var id = 'TZ-' + Date.now().toString(36).toUpperCase(), videoId = null, clipSaved = false;
    if (S.clip && S.clip.size > 0) {
      videoId = 'v-' + id;
      try { await putVideo({ id: videoId, donorId: d.id, receiptId: id, blob: S.clip, mime: S.clip.type, ms: S.clipMs, date: new Date().toISOString() }); clipSaved = true; } catch (e) { videoId = null; toast('Could not save the video clip (storage). Donation was still recorded.'); }
    }
    var gift = { id: id, date: new Date().toISOString(), amount: S.amount, videoId: videoId, source: S.heardSource || '' };
    d.donations = (d.donations || []).concat([gift]);
    var store = list.map(function (x) { var c = {}; Object.keys(x).forEach(function (k) { c[k] = x[k]; }); if (x.id === 'signup') { delete c.faceDescriptors; } return c; });
    saveDonors(store);
    var rec = { id: id, date: gift.date, store: 'Tzedakah collection', items: [['Tzedakah donation \u00B7 ' + d.name, S.amount]], last4: d.cardLast4 || '4242', currency: 'USD', kind: 'tzedakah' };
    if (window.FacePayApp && FacePayApp.addReceipt) FacePayApp.addReceipt(rec);
    S.receipt = rec; S.gift = gift; S.donor = d; S.clipSaved = clipSaved;
    S.view = 'success'; view('success');
  }

  function vSuccess() {
    var d = S.donor, r = S.receipt;
    var el = stage('<div class="tz-success glass"><div class="tz-check">\u2713</div><p class="eyebrow">DONATION RECEIVED</p><h1 class="tz-title">' + usd2(S.amount) + '<br><span class="grad">from ' + esc(d.name) + '</span></h1><p class="tz-sub">Thank you. Tizku l\u2019mitzvos.</p>' +
      '<div class="tz-receipt"><div><span>Receipt</span><strong>' + esc(r.id) + '</strong></div><div><span>Card</span><strong>' + esc(maskCard(d)) + '</strong></div><div><span>Phone</span><strong>' + esc(d.phone || 'not given') + '</strong></div><div><span>Email</span><strong>' + esc(d.email || 'not given') + '</strong></div><div><span>Video clip</span><strong>' + (S.clipSaved ? 'Saved to donor record' : 'None (no camera)') + '</strong></div></div>' +
      '<div class="tz-hero-actions"><button class="tz-big" id="tz-next">Next donor</button><button class="tz-big alt" id="tz-rec-view">View donor record</button></div><p class="local-note">Charge simulated on the test card. Receipt saved in My account.</p></div>');
    el.querySelector('#tz-next').onclick = function () { view('start'); };
    el.querySelector('#tz-rec-view').onclick = function () { S.openDonor = d.id; view('donor'); };
  }

  /* ---------- donor records ---------- */
  function vDonors() {
    var list = donors();
    var el = stage(header(0, 'Donor records', 'Everyone who has given on this tablet. Tap a donor to see their details and saved video clips.') +
      '<div class="tz-donor-list">' + (list.length ? list.map(function (d) {
        var tot = (d.donations || []).reduce(function (s, x) { return s + x.amount; }, 0);
        return '<button class="tz-donor glass" data-id="' + esc(d.id) + '"><span class="tz-avatar">' + esc((d.name || '?').charAt(0).toUpperCase()) + '</span><span class="tz-donor-meta"><strong>' + esc(d.name) + '</strong><span>' + esc(d.phone || 'no phone') + ' \u00B7 ' + esc(maskCard(d)) + '</span></span><span class="tz-donor-tot">' + usd2(tot) + '<small>' + (d.donations || []).length + ' gifts</small></span></button>';
      }).join('') : '<div class="tz-empty glass"><h3>No donors yet</h3><p class="muted">Start collecting and your first donor will appear here.</p></div>') + '</div>' +
      '<button class="tz-big alt" id="tz-b">\u2190 Back</button>');
    el.querySelector('#tz-b').onclick = function () { view('start'); };
    el.querySelectorAll('.tz-donor').forEach(function (b) { b.onclick = function () { S.openDonor = b.dataset.id; view('donor'); }; });
  }
  function vDonor() {
    var d = donors().find(function (x) { return x.id === S.openDonor; });
    if (!d) return view('donors');
    var gifts = (d.donations || []).slice().reverse(), tot = gifts.reduce(function (s, x) { return s + x.amount; }, 0);
    var el = stage(header(0, esc(d.name), 'Donor record') +
      '<div class="tz-record glass"><div class="tz-facts"><div><span>Phone</span><strong>' + esc(d.phone || 'not given') + '</strong></div><div><span>Email</span><strong>' + esc(d.email || 'not given') + '</strong></div><div><span>Card on file</span><strong>' + esc(maskCard(d)) + '</strong></div><div><span>Face</span><strong>' + (hasFace(d) ? 'Enrolled on this device' : 'Not enrolled') + '</strong></div><div><span>Total given</span><strong>' + usd2(tot) + '</strong></div></div></div>' +
      '<h2 class="tz-h2">Donations and clips</h2><div class="tz-gifts">' + (gifts.length ? gifts.map(function (g) {
        return '<div class="tz-gift glass"><div class="tz-gift-top"><strong>' + usd2(g.amount) + '</strong><span>' + esc(new Date(g.date).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })) + ' \u00B7 ' + esc(g.id) + '</span></div>' +
          (g.videoId ? '<video class="tz-clip" controls playsinline preload="metadata" data-v="' + esc(g.videoId) + '"></video>' : '<p class="muted">No video clip for this gift.</p>') + '</div>';
      }).join('') : '<div class="tz-empty glass"><p class="muted">No donations yet.</p></div>') + '</div>' +
      '<div class="tz-hero-actions"><button class="tz-big alt" id="tz-b">\u2190 All donors</button><button class="tz-big danger" id="tz-del">Delete this donor and clips</button></div>');
    el.querySelector('#tz-b').onclick = function () { view('donors'); };
    el.querySelector('#tz-del').onclick = async function () {
      if (!confirm('Delete ' + d.name + ' and all saved clips? This cannot be undone.')) return;
      for (var i = 0; i < (d.donations || []).length; i++) if (d.donations[i].videoId) { try { await delVideo(d.donations[i].videoId); } catch (e) {} }
      var rest = loadJSON(KEY, []).filter(function (x) { return x.id !== d.id; }); saveDonors(rest);
      if (d.id === 'signup') toast('Sign-up profile kept; only donation history was removed.');
      view('donors');
    };
    el.querySelectorAll('.tz-clip').forEach(function (v) { getVideo(v.dataset.v).then(function (rec) { if (rec && rec.blob) v.src = URL.createObjectURL(rec.blob); else v.replaceWith(Object.assign(document.createElement('p'), { className: 'muted', textContent: 'Clip not found in this browser.' })); }).catch(function () {}); });
  }

  window.addEventListener('pagehide', function () { stopMedia(); });
  document.addEventListener('visibilitychange', function () { if (document.hidden && S && (S.view === 'scan' || S.view === 'voice')) { stopMedia(); S.cancelled = false; S.timers = []; S.stream = null; view('start'); toast('Camera stopped while the page was in the background'); } });
  window.FacePayTzedakah = { render: render, stop: function () { stopMedia(); }, parseAmount: parseAmount, clear: clearAll };
})();
