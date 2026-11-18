/* On-device face recognition. No camera frames or descriptors are uploaded. */
(function () {
  'use strict';
  var active = null, loading = null;
  var THRESHOLD = 0.50;
  function valid(d) { return Array.isArray(d) && d.length === 128 && d.every(function (v) { return typeof v === 'number' && Number.isFinite(v); }); }
  function enrolled(p) { return !!(p && p.faceModel === 'face-api-0.22.2' && Array.isArray(p.faceDescriptors) && p.faceDescriptors.length >= 3 && p.faceDescriptors.length <= 5 && p.faceDescriptors.every(valid)); }
  function distance(a, b) { if (!valid(a) || !valid(b)) return Infinity; return Math.sqrt(a.reduce(function (s, v, i) { return s + Math.pow(v - b[i], 2); }, 0)); }
  function match(d, samples) { if (!valid(d) || !Array.isArray(samples) || samples.length < 3 || !samples.every(valid)) return false; return samples.reduce(function (s, x) { return s + distance(d, x); }, 0) / samples.length < THRESHOLD; }
  function load() {
    if (loading) return loading;
    loading = new Promise(function (resolve, reject) {
      if (window.faceapi) return resolve();
      var s = document.createElement('script'); s.src = '/vendor/face-api.min.js'; s.onload = resolve; s.onerror = function () { reject(new Error('Model download failed')); }; document.head.appendChild(s);
    }).then(function () { return Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri('/models'), faceapi.nets.faceLandmark68Net.loadFromUri('/models'), faceapi.nets.faceRecognitionNet.loadFromUri('/models')]); }).catch(function (e) { loading = null; throw e; });
    return loading;
  }
  function stop() { if (active) { active.cancelled = true; clearTimeout(active.timer); if (active.stream) active.stream.getTracks().forEach(function (t) { t.stop(); }); if (active.video) active.video.srcObject = null; active = null; } }
  function mount(host, options) {
    stop();
    var run = {cancelled:false, stream:null, timer:null}, samples = [], startedAt = 0;
    active = run;
    host.innerHTML = '<div class="face-camera"><video autoplay playsinline muted aria-label="Live front camera preview"></video><div class="face-guide" aria-hidden="true"></div><span class="camera-label">CAMERA OFF</span></div><p class="face-status" role="status" aria-live="polite">'+(options.mode === 'enroll' ? 'Enroll your face on this device. Keep your face centered in good light.' : 'Match your face against the profile enrolled in this browser.')+'</p><button class="btn btn-block face-start">'+(options.mode === 'enroll' ? 'Enable camera & enroll' : 'Enable camera & match')+'</button><button class="text-button face-demo">Use simulated demo instead</button><p class="local-note">Camera access is optional. Frames and face data never leave this browser. Three face descriptors are stored on this device, not photos. Real on-device face matching, demo-grade - not bank-level security. Photos can fool it.</p>';
    var video = host.querySelector('video'), status = host.querySelector('.face-status'), start = host.querySelector('.face-start'), box = host.querySelector('.face-camera'), label = host.querySelector('.camera-label');
    run.video = video; video.muted = true; video.setAttribute('playsinline', '');
    function alive() { return !run.cancelled && host.isConnected; }
    function endCamera() { if (run.stream) run.stream.getTracks().forEach(function (t) { t.stop(); }); video.srcObject = null; clearTimeout(run.timer); }
    function fail(message) { if (!alive()) return; endCamera(); box.classList.remove('detected'); label.textContent = 'CAMERA OFF'; status.textContent = message; start.hidden = false; start.disabled = false; start.textContent = 'Try camera again'; }
    host.querySelector('.face-demo').onclick = function () { stop(); options.onDemo(); };
    start.onclick = async function () {
      if (!alive()) return;
      if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { fail('Camera is unavailable here. Open this site in Safari or Chrome over HTTPS, or use the clearly labeled simulated demo.'); return; }
      start.disabled = true; samples = []; status.textContent = 'Allow camera access when asked. You can always choose the simulated demo.';
      try {
        var stream = await navigator.mediaDevices.getUserMedia({audio:false, video:{facingMode:'user', width:{ideal:640}, height:{ideal:480}}});
        if (!alive()) { stream.getTracks().forEach(function (t) { t.stop(); }); return; }
        run.stream = stream; video.srcObject = stream; await video.play();
        label.textContent = 'LIVE · ON DEVICE'; status.textContent = 'Loading face models on this device. First use may take a moment.';
        await load(); if (!alive()) return;
        start.hidden = true; startedAt = Date.now(); tick();
      } catch (e) {
        var message = e.name === 'NotAllowedError' ? 'Camera permission was denied. Allow it in browser settings and retry, or use the simulated demo.' : (e.name === 'NotFoundError' || e.name === 'DevicesNotFoundError') ? 'No camera found on this device. Connect a camera and retry, or use the simulated demo.' : 'Could not start the camera or load face models. Check your connection, close other camera apps and retry, or use the simulated demo.';
        fail(message);
      }
    };
    async function tick() {
      if (!alive()) return;
      try {
        if (Date.now() - startedAt > 60000) { fail('No clear face capture yet. Face the light, remove obstructions and try again.'); return; }
        if (video.readyState < 2 || !video.videoWidth) { run.timer = setTimeout(tick, 250); return; }
        var results = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({inputSize:320, scoreThreshold:0.6})).withFaceLandmarks().withFaceDescriptors();
        if (!alive()) return;
        var one = results.length === 1 ? results[0] : null;
        var clear = one && one.detection.box.width / video.videoWidth > 0.18 && one.detection.box.height / video.videoHeight > 0.24;
        box.classList.toggle('detected', !!clear);
        if (!clear) { samples = []; status.textContent = results.length > 1 ? 'More than one face. Only one person should be in the frame.' : 'Center your face, move closer and face the light.'; label.textContent = results.length > 1 ? 'ONE FACE ONLY' : 'LOOKING FOR A FACE'; }
        else {
          var d = Array.from(one.descriptor); if (!valid(d)) throw new Error('Invalid descriptor');
          label.textContent = 'FACE DETECTED';
          if (options.mode === 'enroll') {
            if (samples.length && !match(d, [samples[0],samples[0],samples[0]])) { samples = []; status.textContent = 'Keep the same face in view. Starting captures again.'; }
            else { samples.push(d); status.textContent = 'Face detected · capture '+samples.length+' of 3. Hold still.'; }
            if (samples.length >= 3) { endCamera(); label.textContent = 'CAPTURED · CAMERA OFF'; status.textContent = 'Three captures ready. Continue to save your local face profile.'; start.hidden = false; start.disabled = false; start.textContent = 'Continue'; start.onclick = function () { stop(); options.onEnroll(samples); }; return; }
          } else {
            samples.push(d); status.textContent = 'Checking your face · '+samples.length+' of 3';
            if (samples.length >= 3) {
              endCamera(); label.textContent = 'CAMERA OFF';
              var matches = samples.filter(function (x) { return match(x, options.descriptors); }).length;
              if (matches < 2) { fail('No face match. Try again in good light, enroll again on this browser, or choose the simulated demo.'); return; }
              box.classList.add('detected'); label.textContent = 'FACE MATCHED · CAMERA OFF'; status.textContent = 'Face matched to '+options.name+'. This is a demo-grade match, not identity verification.'; start.hidden = false; start.disabled = false; start.textContent = 'Continue as '+options.name; start.onclick = function () { stop(); options.onMatch(); }; return;
            }
          }
        }
        run.timer = setTimeout(tick, 500);
      } catch (e) { fail('Face detection could not finish. Try again or use the simulated demo.'); }
    }
  }
  window.FacePayFace = {mount:mount, stop:stop, enrolled:enrolled, valid:valid, distance:distance, match:match, load:load, threshold:THRESHOLD};
  window.addEventListener('pagehide', stop);
  document.addEventListener('visibilitychange', function () { if (document.hidden && active) { var host = active.video && active.video.closest('.face-enrollment'); stop(); if (host) host.innerHTML = '<p class="muted">Camera stopped while this page was in the background. Reopen this step to retry.</p><a class="btn" href="'+(location.pathname === '/signup' ? '/signup' : '/checkout')+'">Reopen camera step</a>'; } });
})();
