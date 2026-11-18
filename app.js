/* facePay demo - all interactions simulated client-side. No real payments, faces or cards. */
(function () {
  'use strict';

  var FACE_SVG = '<svg width="84" height="84" viewBox="0 0 24 24" fill="none" stroke="#dff6ff" stroke-width="1.4" stroke-linecap="round">' +
    '<path d="M4 8V6a2 2 0 0 1 2-2h2" opacity=".9"/><path d="M16 4h2a2 2 0 0 1 2 2v2" opacity=".9"/>' +
    '<path d="M20 16v2a2 2 0 0 1-2 2h-2" opacity=".9"/><path d="M8 20H6a2 2 0 0 1-2-2v-2" opacity=".9"/>' +
    '<circle cx="9.2" cy="10.2" r=".4" fill="#dff6ff"/><circle cx="14.8" cy="10.2" r=".4" fill="#dff6ff"/>' +
    '<path d="M9.4 14.4c.7.7 1.6 1 2.6 1s1.9-.3 2.6-1"/><path d="M12 10.8v2" opacity=".7"/></svg>';

  var FACE_SVG_SM = FACE_SVG.replace('width="84" height="84"', 'width="40" height="40"');

  function fmt(n) { return '₪' + n.toFixed(2); }

  /* ---------------- demo store data ---------------- */
  var DEFAULT_PRICES = [
    ['Organic Milk 1L', 6.90], ['Challah Bread', 8.50], ['Free-Range Eggs x12', 12.90],
    ['Haas Avocado', 3.50], ['Dark Chocolate 70%', 8.40], [' Cottage Cheese 250g', 5.90],
    ['Cherry Tomatoes 500g', 9.90], ['Orange Juice 1L', 11.50], ['Butter 200g', 13.20],
    ['Pita Pack x6', 7.40], ['Greek Yogurt', 4.80], ['Honey Cake', 14.90]
  ];
  var priceList = DEFAULT_PRICES.map(function (r) { return [r[0].trim(), r[1]]; });
  try {
    var saved = localStorage.getItem('facepay-prices');
    if (saved) priceList = JSON.parse(saved);
  } catch (e) { /* fresh */ }

  var profile = {};
  try { profile = JSON.parse(localStorage.getItem('facepay-profile') || '{}'); } catch (e) { profile = {}; }

  function toast(msg) {
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  /* ---------------- HOME ---------------- */
  function renderHome(app) {
    app.innerHTML =
      '<div class="home-grid">' +
        '<div>' +
          '<h1 class="hero-title">Pay with<br><span class="grad">your face.</span></h1>' +
          '<p class="hero-sub">Walk up to any self-checkout. We know it\'s you. Scan, confirm, done.</p>' +
          '<p class="hero-heb">משלמים עם הפנים. בלי ארנק, בלי טלפון.</p>' +
          '<div class="btn-row">' +
            '<a class="btn" href="#/signup">Join facePay</a>' +
            '<a class="btn btn-ghost" href="#/checkout">Try the live demo</a>' +
          '</div>' +
          '<div class="steps">' +
            step(1, 'Look at the camera', 'The self-checkout recognizes you instantly') +
            step(2, 'Scan your items', 'Prices come from the store\'s own list') +
            step(3, 'Cashier confirms', 'A human checks every purchase') +
            step(4, 'You press confirm', 'Your card is charged. Receipt by SMS & email') +
          '</div>' +
          '<p class="hero-sub" style="font-size:13px">No wallet. No phone. <strong style="color:#cdd6f6">Just you.</strong></p>' +
        '</div>' +
        '<div class="scan-wrap"><div class="scan-ring"><div class="scan-line"></div>' + FACE_SVG +
          '<span class="scan-tag">Face matched</span></div></div>' +
      '</div>';

    function step(n, name, detail) {
      return '<div class="step glass"><span class="step-num">' + n + '</span><span>' +
        '<span class="step-name">' + name + '</span>' +
        '<div class="step-detail">' + detail + '</div></span></div>';
    }
  }

  /* ---------------- SIGNUP ---------------- */
  function renderSignup(app) {
    var state = { step: 1, name: profile.name || '', phone: profile.phone || '', email: profile.email || '', face: false };

    function dots() {
      var d = '';
      for (var i = 1; i <= 4; i++) d += '<span class="' + (i <= state.step ? 'on' : '') + '"></span>';
      return '<div class="wizard-dots">' + d + '</div>';
    }

    function draw() {
      var html = '<div class="screen-narrow">' +
        '<h2 class="page-title">Join facePay</h2>' +
        '<p class="page-sub">One signup. Every store that takes facePay.</p>' + dots();

      if (state.step === 1) {
        html += '<div class="form-card glass">' +
          '<div class="field"><label>Full name</label><input id="f-name" type="text" placeholder="Ari Schwartz" value="' + esc(state.name) + '"></div>' +
          '<div class="field"><label>Phone number</label><input id="f-phone" type="tel" placeholder="+1 (845) 555-0134" value="' + esc(state.phone) + '"></div>' +
          '<div class="field"><label>Email</label><input id="f-email" type="email" placeholder="you@example.com" value="' + esc(state.email) + '"></div>' +
          '<button class="btn btn-block" id="next1">Continue</button></div>';
      } else if (state.step === 2) {
        html += '<div class="form-card glass" style="text-align:center">' +
          '<p class="page-sub" style="margin-bottom:4px">Step 2 - your face</p>' +
          '<div class="scan-wrap"><div class="scan-ring" id="signup-ring"><div class="scan-line"></div>' + FACE_SVG +
          '<span class="scan-tag" id="signup-tag">Ready</span></div></div>' +
          '<p class="page-sub" id="face-hint">Position your face in the circle and hold still.</p>' +
          '<button class="btn btn-block" id="scanface">Scan my face</button></div>';
      } else if (state.step === 3) {
        html += '<span class="demo-chip">Demo - do not enter a real card. Nothing is stored or charged.</span>' +
          '<div class="form-card glass">' +
          '<div class="field"><label>Card number</label><input id="f-card" inputmode="numeric" placeholder="4242 4242 4242 4242" maxlength="19"></div>' +
          '<div class="field-row">' +
            '<div class="field"><label>Expiry</label><input id="f-exp" inputmode="numeric" placeholder="12/28" maxlength="5"></div>' +
            '<div class="field"><label>CVC</label><input id="f-cvc" inputmode="numeric" placeholder="123" maxlength="4"></div>' +
          '</div>' +
          '<button class="btn btn-block" id="finish">Finish signup</button></div>';
      } else {
        html += '<div class="receipt glass">' +
          '<div class="check">✓</div>' +
          '<h3>You\'re in' + (state.name ? ', ' + esc(state.name.split(' ')[0]) : '') + '.</h3>' +
          '<p class="r-sub">Face enrolled · ' + esc(state.phone || 'phone set') + ' · card ending ' + esc(state.last4 || '4242') + '</p>' +
          '<div class="btn-row" style="justify-content:center">' +
            '<a class="btn" href="#/checkout">Try the self-checkout demo</a>' +
          '</div></div>';
      }
      html += '</div>';
      app.innerHTML = html;
      wire();
    }

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

    function wire() {
      var n1 = document.getElementById('next1');
      if (n1) n1.onclick = function () {
        state.name = document.getElementById('f-name').value.trim();
        state.phone = document.getElementById('f-phone').value.trim();
        state.email = document.getElementById('f-email').value.trim();
        if (!state.name || !state.phone || !state.email) { toast('Fill in name, phone and email to continue'); return; }
        state.step = 2; draw();
      };
      var sf = document.getElementById('scanface');
      if (sf) sf.onclick = function () {
        var ring = document.getElementById('signup-ring');
        var tag = document.getElementById('signup-tag');
        var hint = document.getElementById('face-hint');
        sf.disabled = true;
        ring.classList.add('scanning');
        tag.textContent = 'Scanning...';
        hint.textContent = 'Hold still...';
        setTimeout(function () {
          ring.classList.remove('scanning');
          ring.classList.add('matched');
          tag.textContent = 'Face captured';
          hint.textContent = 'Looks great. This is the face stores will match.';
          state.face = true;
          sf.textContent = 'Continue';
          sf.disabled = false;
          sf.onclick = function () { state.step = 3; draw(); };
        }, 2400);
      };
      var card = document.getElementById('f-card');
      if (card) {
        card.addEventListener('input', function () {
          var v = card.value.replace(/\D/g, '').slice(0, 16);
          card.value = v.replace(/(.{4})/g, '$1 ').trim();
        });
        var exp = document.getElementById('f-exp');
        exp.addEventListener('input', function () {
          var v = exp.value.replace(/\D/g, '').slice(0, 4);
          exp.value = v.length > 2 ? v.slice(0, 2) + '/' + v.slice(2) : v;
        });
        document.getElementById('finish').onclick = function () {
          var digits = card.value.replace(/\D/g, '');
          if (digits.length < 12) { toast('Enter a card number (demo: 4242 4242 4242 4242)'); return; }
          state.last4 = digits.slice(-4);
          try {
            localStorage.setItem('facepay-profile', JSON.stringify({ name: state.name, phone: state.phone, email: state.email, last4: state.last4 }));
          } catch (e) { /* private mode */ }
          state.step = 4; draw();
        };
      }
    }

    draw();
  }

  /* ---------------- CHECKOUT DEMO ---------------- */
  function renderCheckout(app) {
    var co = { phase: 'start', items: [], cashier: false };

    function total() { return co.items.reduce(function (s, it) { return s + it[1]; }, 0); }

    function draw() {
      var name = profile.name ? profile.name.split(' ')[0] : 'Ari';
      var last4 = profile.last4 || '4821';
      var html = '<div class="screen-narrow">' +
        '<h2 class="page-title">Self-checkout</h2>' +
        '<p class="lane-line">GreenMart · Lane 3 · live demo</p>';

      if (co.phase === 'start') {
        html += '<div class="form-card glass" style="text-align:center">' +
          '<div class="scan-wrap"><div class="scan-ring"><div class="scan-line"></div>' + FACE_SVG +
          '<span class="scan-tag">Camera ready</span></div></div>' +
          '<p class="page-sub">Walk up and look at the camera. facePay does the rest.</p>' +
          '<button class="btn btn-block" id="start">Start demo - look at camera</button></div>';
      } else if (co.phase === 'scanning') {
        html += '<div class="form-card glass" style="text-align:center">' +
          '<div class="scan-wrap"><div class="scan-ring scanning"><div class="scan-line"></div>' + FACE_SVG +
          '<span class="scan-tag">Matching face...</span></div></div>' +
          '<p class="page-sub"><span class="spinner" style="display:inline-block;vertical-align:-3px"></span> Looking you up...</p></div>';
      } else {
        html += '<div class="face-card glass">' +
          '<div class="face-avatar">' + FACE_SVG_SM + '</div>' +
          '<div class="face-name">Welcome back, ' + name + '</div>' +
          '<div class="face-sub">✓ Face matched · ' + (profile.phone || '+1 (845) 423-1667') + '</div></div>';

        html += '<div class="items-card glass" id="items">' + itemsHtml() + '</div>';

        html += '<div class="status-row">' +
          '<div class="status-chip ' + (co.cashier ? 'status-ok' : 'status-wait') + '" id="cashier-chip">' +
            (co.cashier ? '✓ Cashier confirmed' : co.phase === 'cashier' ? '<span class="spinner"></span> Cashier reviewing...' : 'Waiting for cashier') + '</div>' +
          '<div class="status-chip status-card">Visa •••• ' + last4 + '</div></div>';

        if (co.phase === 'shop') {
          html += '<div class="btn-row">' +
            '<button class="btn" id="scan-item">Scan next item</button>' +
            '<button class="btn btn-ghost" id="to-cashier" ' + (co.items.length ? '' : 'disabled') + '>Done - send to cashier</button></div>';
        } else if (co.phase === 'confirm') {
          html += '<button class="btn btn-block" id="pay">Confirm &amp; Pay ' + fmt(total()) + '</button>' +
            '<p class="page-sub" style="text-align:center;margin-top:12px">Your card is charged only after you confirm</p>';
        } else if (co.phase === 'processing') {
          html += '<button class="btn btn-block" disabled><span class="spinner"></span>&nbsp; Charging card...</button>';
        } else if (co.phase === 'done') {
          html = '<div class="screen-narrow"><div class="receipt glass">' +
            '<div class="check">✓</div>' +
            '<h3>Paid ' + fmt(total()) + '</h3>' +
            '<p class="r-sub">GreenMart · Lane 3 · Visa •••• ' + last4 + '<br>Receipt sent by SMS &amp; email</p>' +
            '<div class="r-lines">' + co.items.map(function (it) {
              return '<div class="item-row"><span>' + it[0] + '</span><span class="price">' + fmt(it[1]) + '</span></div>';
            }).join('') + '</div>' +
            '<div style="height:16px"></div>' +
            '<button class="btn btn-ghost btn-block" id="again">Run the demo again</button></div></div>';
        }
      }
      html += '</div>';
      app.innerHTML = html;
      wire();
    }

    function itemsHtml() {
      if (!co.items.length) return '<div class="items-empty">No items yet - start scanning</div>';
      var rows = co.items.map(function (it, i) {
        return '<div class="item-row' + (i === co.items.length - 1 ? ' flash' : '') + '"><span>' + it[0] + '</span><span class="price">' + fmt(it[1]) + '</span></div>';
      }).join('');
      return rows + '<div class="item-row total"><span>Total</span><span class="price">' + fmt(total()) + '</span></div>';
    }

    function wire() {
      var s = document.getElementById('start');
      if (s) s.onclick = function () {
        co.phase = 'scanning'; draw();
        setTimeout(function () { co.phase = 'shop'; draw(); toast('Face matched'); }, 2200);
      };
      var si = document.getElementById('scan-item');
      if (si) si.onclick = function () {
        var remaining = priceList.filter(function (p) {
          return !co.items.some(function (it) { return it[0] === p[0]; });
        });
        if (!remaining.length) { toast('Scanned everything on the list'); return; }
        var pick = remaining[Math.floor(Math.random() * remaining.length)];
        co.items.push(pick);
        draw();
      };
      var tc = document.getElementById('to-cashier');
      if (tc) tc.onclick = function () {
        co.phase = 'cashier'; draw();
        setTimeout(function () {
          co.cashier = true; co.phase = 'confirm'; draw();
          toast('Cashier confirmed your basket');
        }, 1800);
      };
      var pay = document.getElementById('pay');
      if (pay) pay.onclick = function () {
        co.phase = 'processing'; draw();
        setTimeout(function () { co.phase = 'done'; draw(); }, 1600);
      };
      var again = document.getElementById('again');
      if (again) again.onclick = function () { co = { phase: 'start', items: [], cashier: false }; draw(); };
    }

    draw();
  }

  /* ---------------- DASHBOARD ---------------- */
  function renderDashboard(app) {
    var txs = [
      ['Ari S.', '12:42 · Lane 3', 47.20], ['Miriam K.', '12:31 · Lane 1', 112.80],
      ['Yaakov L.', '12:18 · Lane 2', 23.50], ['Sarah B.', '12:04 · Lane 3', 67.90],
      ['Dovid R.', '11:52 · Lane 1', 89.10]
    ];

    function draw() {
      var html = '<h2 class="page-title">facePay for Stores</h2>' +
        '<p class="page-sub">GreenMart · store dashboard (demo data)</p>' +
        '<div class="stat-grid">' +
          stat('Today\'s sales', '₪3,240', '▲ 18% vs yesterday') +
          stat('Transactions', '86', '▲ 12 new faces') +
          stat('Avg basket', '₪37.70', '▲ 4% this week') +
          stat('Enrolled faces', '1,312', '▲ 58 this month') +
        '</div>' +
        '<div class="dash-grid">' +
          '<div class="upload-card glass">' +
            '<div class="upload-title">Price list</div>' +
            '<div class="upload-sub">Upload your pricing - every self-checkout updates instantly. CSV format: item, price.</div>' +
            '<div class="upload-drop" id="drop">Drop price-list.csv here<br>or tap to browse</div>' +
            '<input type="file" id="file" accept=".csv,text/csv" style="display:none">' +
            '<div class="file-line"><span id="file-name">price-list.csv · ' + priceList.length + ' items</span><span class="synced">✓ Synced 09:42</span></div>' +
            '<div class="section-label">Store settings</div>' +
            toggle('Require cashier confirmation', true) +
            toggle('Send SMS receipt', true) +
            toggle('Email receipt', true) +
            toggle('Allow unenrolled guests', false) +
          '</div>' +
          '<div>' +
            '<div class="section-label">Current prices</div>' +
            '<div class="price-card glass"><table class="price-table"><thead><tr><th>Item</th><th>Price</th></tr></thead><tbody id="price-body">' +
            priceList.slice(0, 12).map(function (r) {
              return '<tr><td>' + r[0] + '</td><td>' + fmt(r[1]) + '</td></tr>';
            }).join('') +
            '</tbody></table></div>' +
            '<div class="section-label">Recent facePay checkouts</div>' +
            '<div class="tx-card glass">' + txs.map(function (t) {
              return '<div class="tx-row"><span class="tx-face"></span><span class="tx-meta"><span class="who">' + t[0] +
                '</span><div class="when">' + t[1] + '</div></span><span class="tx-amt">' + fmt(t[2]) + '</span></div>';
            }).join('') + '</div>' +
          '</div>' +
        '</div>';
      app.innerHTML = html;
      wire();

      function stat(label, value, delta) {
        return '<div class="stat-card glass"><div class="stat-label">' + label + '</div>' +
          '<div class="stat-value">' + value + '</div><div class="stat-delta">' + delta + '</div></div>';
      }
      function toggle(label, on) {
        return '<div class="toggle-row"><span>' + label + '</span>' +
          '<button class="toggle' + (on ? ' on' : '') + '" aria-label="' + label + '"></button></div>';
      }
    }

    function wire() {
      Array.prototype.forEach.call(document.querySelectorAll('.toggle'), function (t) {
        t.onclick = function () { t.classList.toggle('on'); };
      });
      var drop = document.getElementById('drop');
      var file = document.getElementById('file');
      drop.onclick = function () { file.click(); };
      drop.ondragover = function (e) { e.preventDefault(); drop.classList.add('over'); };
      drop.ondragleave = function () { drop.classList.remove('over'); };
      drop.ondrop = function (e) {
        e.preventDefault(); drop.classList.remove('over');
        if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
      };
      file.onchange = function () { if (file.files.length) handleFile(file.files[0]); };

      function handleFile(f) {
        var reader = new FileReader();
        reader.onload = function () {
          var lines = String(reader.result).split(/\r?\n/);
          var parsed = [];
          lines.forEach(function (line) {
            var parts = line.split(',');
            if (parts.length >= 2) {
              var price = parseFloat(parts[parts.length - 1].replace(/[^\d.]/g, ''));
              var name = parts.slice(0, -1).join(',').trim();
              if (name && !isNaN(price)) parsed.push([name, price]);
            }
          });
          if (!parsed.length) { toast('No item, price rows found in that CSV'); return; }
          priceList = parsed;
          try { localStorage.setItem('facepay-prices', JSON.stringify(parsed)); } catch (e) { /* ok */ }
          document.getElementById('file-name').textContent = f.name + ' · ' + parsed.length + ' items';
          document.getElementById('price-body').innerHTML = parsed.slice(0, 12).map(function (r) {
            return '<tr><td>' + r[0].replace(/</g, '&lt;') + '</td><td>' + fmt(r[1]) + '</td></tr>';
          }).join('');
          toast(parsed.length + ' prices synced to all lanes');
        };
        reader.readAsText(f);
      }
    }

    draw();
  }

  /* ---------------- router ---------------- */
  var routes = { home: renderHome, signup: renderSignup, checkout: renderCheckout, dashboard: renderDashboard };

  function route() {
    var hash = window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
    var name = routes[hash] ? hash : 'home';
    var app = document.getElementById('app');
    routes[name](app);
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === name);
    });
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
