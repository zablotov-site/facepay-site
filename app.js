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
    ['Organic Milk 1L', 6.90, '7290000000015'], ['Challah Bread', 8.50, '7290000000022'], ['Free-Range Eggs x12', 12.90, '7290000000039'],
    ['Haas Avocado', 3.50, '7290000000046'], ['Dark Chocolate 70%', 8.40, '7290000000053'], ['Cottage Cheese 250g', 5.90, '7290000000060'],
    ['Cherry Tomatoes 500g', 9.90, '7290000000077'], ['Orange Juice 1L', 11.50, '7290000000084'], ['Butter 200g', 13.20, '7290000000091'],
    ['Pita Pack x6', 7.40, '7290000000107'], ['Greek Yogurt', 4.80, '7290000000114'], ['Honey Cake', 14.90, '7290000000121']
  ];
  var priceList = DEFAULT_PRICES.map(function (r) { return [r[0].trim(), r[1]]; });
  try {
    var saved = localStorage.getItem('facepay-prices');
    if (saved) { var candidate=JSON.parse(saved); if(Array.isArray(candidate) && candidate.length && candidate.length<=500 && candidate.every(function(r){return Array.isArray(r)&&typeof r[0]==='string'&&typeof r[1]==='number'&&Number.isFinite(r[1])&&r[1]>=0&&r[1]<=99999&&(r.length===2||(r.length===3&&typeof r[2]==='string'&&/^[0-9]{4,14}$/.test(r[2])));})) priceList=candidate; }
  } catch (e) { /* fresh */ }

  var profile = {};
  try { profile = JSON.parse(localStorage.getItem('facepay-profile') || '{}'); } catch (e) { profile = {}; }

  if(!profile || typeof profile!=='object' || Array.isArray(profile)) profile={};

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
      '<span class="demo-chip">Interactive concept · no real payments</span><div class="home-grid">' +
        '<div>' +
          '<h1 class="hero-title">Pay with<br><span class="grad">your face.</span></h1>' +
          '<p class="hero-sub">A new checkout concept. Look, pick your items, review, and confirm. Try it without sharing a real card or using your camera.</p>' +
          '<p class="hero-heb">משלמים עם הפנים. בלי ארנק, בלי טלפון.</p>' +
          '<div class="btn-row">' +
            '<a class="btn" href="#/signup">Join facePay</a>' +
            '<a class="btn btn-ghost" href="#/checkout">Try the live demo</a>' +
          '</div>' +
          '<div class="steps">' +
            step(1, 'Look at the camera', 'A simulated match, with your camera off') +
            step(2, 'Scan your items', 'Prices come from the store\'s own list') +
            step(3, 'Cashier confirms', 'A human checks every purchase') +
            step(4, 'You press confirm', 'Complete the demo and view your receipt') +
          '</div>' +
          '<p class="hero-sub" style="font-size:13px">No wallet. No phone. <strong style="color:#cdd6f6">Just you.</strong></p><a class="text-link" href="#/security">A clear look at privacy & safety ↗</a>' +
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
        '<p class="page-sub">Try the enrollment concept. Use fictional details only.</p>' + dots();

      if (state.step === 1) {
        html += '<div class="form-card glass">' +
          '<div class="field"><label for="f-name">Demo name</label><input id="f-name" type="text" placeholder="Demo Customer" maxlength="60" value="' + esc(state.name) + '"></div>' +
          '<div class="field"><label for="f-phone">Fictional phone number</label><input id="f-phone" type="tel" placeholder="+1 (555) 010-0100" maxlength="30" value="' + esc(state.phone) + '"></div>' +
          '<div class="field"><label for="f-email">Fictional email</label><input id="f-email" type="email" placeholder="demo@example.com" maxlength="100" value="' + esc(state.email) + '"></div>' +
          '<button class="btn btn-block" id="next1">Continue</button><button class="text-button" id="sample-details">Use sample details instead</button></div>';
      } else if (state.step === 2) {
        html += '<div class="form-card glass" style="text-align:center">' +
          '<p class="page-sub" style="margin-bottom:4px">Step 2 - your face</p>' +
          '<div class="scan-wrap"><div class="scan-ring" id="signup-ring"><div class="scan-line"></div>' + FACE_SVG +
          '<span class="scan-tag" id="signup-tag">Ready</span></div></div>' +
          '<p class="page-sub" id="face-hint">This is an animation. Your camera will not be opened.</p>' +
          '<button class="btn btn-block" id="scanface">Simulate face scan</button></div>';
      } else if (state.step === 3) {
        html += '<span class="demo-chip">Fictional test card · no real card entry</span>' +
          '<div class="form-card glass"><p class="eyebrow">READY TO TRY</p><h3>One test card.<br>Zero real charges.</h3><div class="test-card"><span>facePay Demo</span><strong>•••• •••• •••• 4242</strong><small>Fictional card · not a payment method</small></div><p class="muted">No card number, expiry or security code is needed. This test card only completes the demo.</p><button class="btn btn-block" id="finish-demo">Use test card & finish</button></div>';
      } else {
        html += '<div class="receipt glass">' +
          '<div class="check">✓</div>' +
          '<h3>You\'re in' + (state.name ? ', ' + esc(state.name.split(' ')[0]) : '') + '.</h3>' +
          '<p class="r-sub">Demo profile · ' + esc(state.phone || 'phone set') + ' · card ending ' + esc(state.last4 || '4242') + '</p>' +
          '<div class="btn-row" style="justify-content:center">' +
            '<a class="btn" href="#/checkout">Try the self-checkout demo</a><a class="btn btn-ghost" href="#/account">My account</a>' +
          '</div></div>';
      }
      html += '</div>';
      app.innerHTML = html;
      wire();
    }

    function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

    function wire() {
      var sample=document.getElementById('sample-details');if(sample)sample.onclick=function(){document.getElementById('f-name').value='Demo Customer';document.getElementById('f-phone').value='+1 555 010 0100';document.getElementById('f-email').value='demo@example.com';};
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
          tag.textContent = 'Demo match complete';
          hint.textContent = 'No image was captured or biometric data created.';
          state.face = true;
          sf.textContent = 'Continue';
          sf.disabled = false;
          sf.onclick = function () { state.step = 3; draw(); };
        }, 2400);
      };
      var finish = document.getElementById('finish-demo');
      if (finish) finish.onclick = function () {
        state.last4 = '4242';
        profile = { name: state.name, phone: state.phone, email: state.email, last4: '4242' };
        save('facepay-profile', profile);
        state.step = 4; draw();
      };
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
        '<p class="page-sub">'+esc(merchant ? merchant.name : 'GreenMart')+' · sample analytics, not live sales</p><div class="dashboard-actions"><a class="btn btn-ghost" href="#/business">Set up a demo store</a><a class="text-link" href="#/checkout">Try your catalog →</a></div>' +
        '<div class="stat-grid">' +
          stat('Today\'s sales', '₪3,240', '▲ 18% vs yesterday') +
          stat('Transactions', '86', '▲ 12 new faces') +
          stat('Avg basket', '₪37.70', '▲ 4% this week') +
          stat('Enrolled faces', '1,312', '▲ 58 this month') +
        '</div>' +
        '<div class="dash-grid">' +
          '<div class="upload-card glass">' +
            '<div class="upload-title">Price list</div>' +
            '<div class="upload-sub">Upload demo prices for this browser. Your catalog feeds the checkout item picker. CSV columns: item,price,barcode. The barcode column is optional (4-14 digits) and powers the checkout scanner.</div>' +
            '<div class="upload-drop" id="drop">Drop price-list.csv here<br>or tap to browse</div>' +
            '<input type="file" id="file" accept=".csv,text/csv" style="display:none">' +
            '<div class="file-line"><span id="file-name">price-list.csv · ' + priceList.length + ' items</span><span class="synced">Browser only</span></div>' +
            '<button class="text-button" id="sample-csv">Download example CSV ↓</button><div class="section-label">Demo settings preview</div><p class="local-note">Receipt switches are a visual preview. Nothing is sent.</p>' +
            toggle('Require cashier confirmation', true) +
            toggle('Send SMS receipt', true) +
            toggle('Email receipt', true) +
            toggle('Allow unenrolled guests', false) +
          '</div>' +
          '<div>' +
            '<div class="section-label">Current prices</div>' +
            '<div class="price-card glass"><table class="price-table"><thead><tr><th>Item</th><th>Price</th></tr></thead><tbody id="price-body">' +
            priceList.slice(0, 12).map(function (r) {
              return '<tr><td>' + esc(r[0]) + '</td><td>' + fmt(r[1]) + '</td></tr>';
            }).join('') +
            '</tbody></table></div>' +
            '<div class="section-label">Recent sample checkouts</div>' +
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
        t.onclick = function () { t.classList.toggle('on'); t.setAttribute('aria-checked',String(t.classList.contains('on'))); };
      });
      document.getElementById('sample-csv').onclick=function(){download('facepay-example.csv','item,price,barcode\nOrganic Milk 1L,6.90,7290000000015\nChallah Bread,8.50,7290000000022\nFree-Range Eggs x12,12.90,7290000000039\n','text/csv');};
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
        if(f.size>100000){toast('Use a CSV smaller than 100 KB');return;}
        var reader = new FileReader();
        reader.onload = function () {
          var rows = parseCSV(String(reader.result));
          var parsed = [], invalid = 0;
          rows.forEach(function(parts,index){
            if(parts.every(function(v){return !v.trim();})) return;
            if(index===0 && /^(item|name|product)$/i.test(parts[0].trim()) && /price/i.test(parts[1] || '')) return;
            var name=(parts[0] || '').trim(), raw=(parts[1] || '').trim();
            var price=Number(raw);
            var barcode=(parts[2] || '').trim();
            if(parts.length<2 || parts.length>3 || !name || name.length>120 || !/^\d+(\.\d{1,2})?$/.test(raw) || !Number.isFinite(price) || price<0 || price>99999 || (barcode && !/^[0-9]{4,14}$/.test(barcode))){invalid++;return;}
            parsed.push(barcode?[name,price,barcode]:[name,price]);
          });
          if(invalid || !parsed.length || parsed.length>500) { toast('Use up to 500 item,price rows, with an optional barcode column of 4-14 digits. Prices need 0-2 decimal places. No changes made.'); return; }
          priceList = parsed;
          try { localStorage.setItem('facepay-prices', JSON.stringify(parsed)); } catch (e) { /* ok */ }
          document.getElementById('file-name').textContent = f.name + ' · ' + parsed.length + ' items';
          document.getElementById('price-body').innerHTML = parsed.slice(0, 12).map(function (r) {
            return '<tr><td>' + esc(r[0]) + '</td><td>' + fmt(r[1]) + '</td></tr>';
          }).join('');
          toast(parsed.length + ' demo prices saved in this browser');
        };
        reader.onerror=function(){toast('This file could not be read. Try another CSV.');};
        reader.readAsText(f);
      }
    }

    draw();
  }

  function parseCSV(text) {
    var rows=[],row=[],cell='',quoted=false;
    text=text.replace(/^\uFEFF/,'');
    for(var i=0;i<text.length;i++){var c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===','&&!quoted){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
    if(quoted) return [['invalid']];row.push(cell);rows.push(row);return rows;
  }
  /* ---------------- shared demo state ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch(e) { return fallback; } }
  function save(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch(e) { toast('Browser storage is unavailable. Changes last for this visit only.'); return false; } }
  var history = load('facepay-history', []);
  if (!Array.isArray(history)) history = [];
  var prefs = load('facepay-preferences', { email: true, sms: false });
  var merchant = load('facepay-merchant', null);
  function download(name, content, type) {
    var url = URL.createObjectURL(new Blob([content], {type:type || 'text/plain;charset=utf-8'}));
    var a = document.createElement('a'); a.href = url; a.download = name; a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
  }
  function recordPurchase(items) {
    var tx = { id:'FP-' + Date.now().toString(36).toUpperCase(), date:new Date().toISOString(), store:merchant ? merchant.name : 'GreenMart', items:items.map(function(i){return [i[0],i[1]];}), last4:'4242' };
    history.unshift(tx); history = history.slice(0,100); save('facepay-history',history); return tx;
  }
  function txTotal(tx) { return tx.items.reduce(function(s,i){return s + i[1];},0); }
  function dateLabel(date) { return new Date(date).toLocaleString(undefined,{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}); }
  function eyebrow(text) { return '<p class="eyebrow">' + text + '</p>'; }
  function renderAccount(app) {
    var selected = null, search = '';
    function draw() {
      var spent = history.reduce(function(s,t){return s+txTotal(t);},0);
      app.innerHTML = '<div class="account-head">' + eyebrow('YOUR DEMO WALLET') + '<h1 class="page-title">A little more<br><span class="grad">peace of mind.</span></h1><p class="page-sub">Every demo checkout. Every detail. One place.</p></div>' +
        '<div class="account-grid"><div><section class="wallet-card glass"><div class="wallet-top"><span>facePay</span><span class="badge-pill">TEST CARD</span></div><div class="wallet-orbit">'+FACE_SVG_SM+'</div><p class="card-digits">•••• &nbsp; •••• &nbsp; •••• &nbsp; 4242</p><div class="wallet-bottom"><span>'+esc(profile.name || 'Demo customer')+'</span><span>No real funds</span></div></section>' +
        '<div class="mini-stats"><div><strong>'+history.length+'</strong><span>Demo checkouts</span></div><div><strong>'+fmt(spent)+'</strong><span>Simulated total</span></div></div><p class="local-note">Stored only in this browser. Not a real bank account.</p></div>' +
        '<section class="glass panel"><div class="panel-heading"><h2>Activity</h2><span class="badge-pill">LOCAL ONLY</span></div><label class="sr-only" for="tx-search">Search receipts by store or receipt ID</label><input class="search-input" id="tx-search" placeholder="Search store or receipt ID" value="'+esc(search)+'"><div id="activity-list"></div></section></div>' +
        '<section class="glass panel preferences"><div><p class="eyebrow">YOU ARE IN CONTROL</p><h2>Your demo settings</h2><p class="muted">Preview receipt preferences. No messages are actually sent.</p></div><div>'+prefToggle('email','Email receipts',prefs.email)+prefToggle('sms','SMS receipts',prefs.sms)+'<a class="text-link" href="#/security">How this demo uses your data ↗</a></div></section>' +
        '<section class="reset-panel"><div><h3>Leave no trace on this browser.</h3><p class="muted">Clear your demo profile, receipts, store setup and price list.</p></div><button class="btn btn-ghost" id="reset-data">Reset demo data</button></section>';
      list();
      document.getElementById('tx-search').oninput=function(){search=this.value;list();};
      app.querySelectorAll('[data-pref]').forEach(function(b){b.onclick=function(){var k=b.dataset.pref;prefs[k]=!prefs[k];save('facepay-preferences',prefs);b.classList.toggle('on',prefs[k]);b.setAttribute('aria-checked',String(prefs[k]));};});
      document.getElementById('reset-data').onclick=function(){
        showDialog('<p class="eyebrow">FRESH START</p><h2>Reset this demo?</h2><p class="muted">This removes facePay data from this browser only. Downloads you saved are not deleted.</p><button class="btn btn-block" id="confirm-reset">Yes, reset demo data</button><button class="btn btn-ghost btn-block" id="cancel-reset">Keep my demo data</button>');
        document.getElementById('cancel-reset').onclick=closeDialog;
        document.getElementById('confirm-reset').onclick=function(){['profile','history','prices','preferences','merchant'].forEach(function(k){try{localStorage.removeItem('facepay-'+k);}catch(e){}});profile={};history=[];priceList=DEFAULT_PRICES.map(function(r){return [r[0].trim(),r[1]];});merchant=null;prefs={email:true,sms:false};closeDialog();draw();toast('Demo data cleared from this browser');};
      };
    }
    function list(){
      var matches=history.filter(function(t){return (t.store+' '+t.id).toLowerCase().includes(search.toLowerCase());});
      document.getElementById('activity-list').innerHTML = matches.length ? matches.map(function(t){return '<button class="activity-row" data-receipt="'+esc(t.id)+'"><span class="activity-icon">✓</span><span class="activity-meta"><strong>'+esc(t.store)+'</strong><span>'+esc(dateLabel(t.date))+' · '+t.items.length+' items</span></span><span class="activity-price">'+fmt(txTotal(t))+'<small>View receipt ↗</small></span></button>';}).join('') : '<div class="empty-state"><span class="empty-icon">'+FACE_SVG_SM+'</span><h3>'+(search?'No matching receipts':'Your next checkout starts here.')+'</h3><p>'+(search?'Try another store name or receipt ID.':'Run the self-checkout demo and your receipt will appear here automatically.')+'</p>'+(search?'':'<a class="btn" href="#/checkout">Try a demo checkout</a>')+'</div>';
      app.querySelectorAll('[data-receipt]').forEach(function(b){b.onclick=function(){selected=history.find(function(t){return t.id===b.dataset.receipt;});receiptDialog(selected);};});
    }
    function prefToggle(k,label,on){return '<div class="toggle-row"><span>'+label+'</span><button class="toggle '+(on?'on':'')+'" role="switch" aria-label="'+label+'" aria-checked="'+on+'" data-pref="'+k+'"></button></div>';}
    draw();
  }
  var previousFocus;
  var onDialogClose=null;
  function closeDialog(){var d=document.getElementById('detail-dialog');if(d)d.remove();document.body.classList.remove('modal-open');if(onDialogClose){var f=onDialogClose;onDialogClose=null;try{f();}catch(e){}}if(previousFocus)previousFocus.focus();}
  function showDialog(html){
    previousFocus=document.activeElement;
    var dialog=document.createElement('dialog');dialog.id='detail-dialog';dialog.className='detail-dialog glass';dialog.setAttribute('aria-label','Demo details');dialog.innerHTML='<button class="dialog-close" aria-label="Close dialog">×</button>'+html;document.body.appendChild(dialog);dialog.showModal();document.body.classList.add('modal-open');dialog.querySelector('.dialog-close').onclick=closeDialog;dialog.addEventListener('cancel',function(e){e.preventDefault();closeDialog();});dialog.addEventListener('click',function(e){if(e.target===dialog){var r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialog();}});
  }
  function receiptDialog(tx){
    showDialog('<div class="receipt-detail"><span class="receipt-stamp">✓ DEMO COMPLETE</span><h2>'+esc(tx.store)+'</h2><p class="muted">'+esc(dateLabel(tx.date))+'<br>'+esc(tx.id)+'</p><div class="r-lines">'+tx.items.map(function(i){return '<div class="item-row"><span>'+esc(i[0])+'</span><strong>'+fmt(i[1])+'</strong></div>';}).join('')+'<div class="item-row total"><span>Total</span><span>'+fmt(txTotal(tx))+'</span></div></div><p class="muted">Test card •••• 4242<br>No money moved. Not a tax invoice.</p><button class="btn btn-block" id="download-receipt">Download demo receipt ↓</button></div>');
    document.getElementById('download-receipt').onclick=function(){download(tx.id+'.txt','facePay - DEMO RECEIPT\nNot a tax invoice. No money moved.\n\n'+tx.store+'\n'+tx.id+'\n'+dateLabel(tx.date)+'\n\n'+tx.items.map(function(i){return i[0]+'  '+fmt(i[1]);}).join('\n')+'\n\nTotal: '+fmt(txTotal(tx))+'\nTest card ending 4242\nCashier review and payment were simulated.');};
  }
  function renderBusiness(app){
    app.innerHTML=eyebrow('FACEPAY FOR STORES')+'<div class="business-intro"><h1 class="hero-title">Less friction.<br><span class="grad">More human.</span></h1><p class="hero-sub">Meet the checkout that keeps your team in control. Preview a store setup in under a minute.</p><span class="demo-chip">Concept preview · no contract or live connection</span></div><div class="business-grid"><form class="glass panel" id="merchant-form"><div class="panel-heading"><h2>Make it your store.</h2><span class="badge-pill">01 / 02</span></div><p class="muted">Use a fictional store name. Everything stays on this device.</p><div class="field"><label for="store-name">Demo store name</label><input id="store-name" maxlength="60" required placeholder="e.g. GreenMart" value="'+esc(merchant?merchant.name:'')+'"></div><div class="field"><label for="store-type">Store type</label><select id="store-type"><option>Grocery & supermarket</option><option>Convenience store</option><option>Bakery & specialty food</option><option>Other retail</option></select></div><div class="field"><label for="store-lanes">Self-checkout lanes</label><select id="store-lanes"><option value="1">1 lane</option><option value="2">2 lanes</option><option value="4">4 lanes</option><option value="8">8 lanes</option></select></div><button class="btn btn-block" type="submit">Preview my setup →</button><p class="local-note">No email, payment details or commitment required.</p></form><div class="business-benefits"><div class="benefit"><span>01</span><div><h3>Your prices. Your rules.</h3><p>Import a CSV price list and try it immediately in the checkout demo.</p></div></div><div class="benefit"><span>02</span><div><h3>A human in the loop.</h3><p>Cashier review comes before customer confirmation. No silent checkout.</p></div></div><div class="benefit"><span>03</span><div><h3>A clear way forward.</h3><p>Test the experience first. Hardware, payment integration and rollout are future work.</p></div></div><a class="text-link" href="#/dashboard">Explore the sample dashboard ↗</a></div></div><div class="glass launch-note"><span class="status-dot"></span><div><h3>A prototype, not a live service.</h3><p>Store enrollment, pricing and launch dates have not been set. This preview does not create a merchant account.</p></div></div>';
    document.getElementById('merchant-form').onsubmit=function(e){e.preventDefault();var name=document.getElementById('store-name').value.trim();if(!name){toast('Add a demo store name');return;}merchant={name:name,type:document.getElementById('store-type').value,lanes:Number(document.getElementById('store-lanes').value)};save('facepay-merchant',merchant);app.innerHTML='<div class="screen-narrow"><p class="eyebrow">STORE PREVIEW · 02 / 02</p><div class="glass panel setup-success"><span class="receipt-stamp">✓ DEMO SETUP SAVED</span><h1 class="page-title">Welcome to<br>'+esc(name)+'.</h1><p class="muted">Your sample workspace is ready. Nothing has been connected to a real store.</p><div class="setup-summary"><div><span>Store type</span><strong>'+esc(merchant.type)+'</strong></div><div><span>Demo lanes</span><strong>'+merchant.lanes+'</strong></div><div><span>Payments</span><strong>Simulated only</strong></div></div><a class="btn btn-block" href="#/dashboard">Open my demo dashboard →</a><a class="text-link" href="#/business">Edit store setup</a></div></div>';window.scrollTo(0,0);};
  }
  function renderSecurity(app){
    var faqs=[['Does this demo use my camera?','No. The face scan is an animation. This site does not request camera access, capture a photo, or create a biometric template.'],['Will a card be charged?','No. The demo uses a fixed fictional card ending 4242. No card number, expiry, CVC, ID document or payment credentials are needed.'],['What is saved, and where?','Your demo profile, checkout receipts, price list, store preview and receipt preferences are saved in localStorage in this browser. They are not an online account and do not sync between devices. The hosting provider may receive ordinary web request metadata when you visit.'],['Are SMS and email receipts actually sent?','No. Receipt delivery is a preview only. You can view and download a plain-text demo receipt in My account.'],['How would a real facePay protect people?','A production version would need explicit biometric consent, a non-biometric checkout option, secure template handling, a regulated payment partner, fraud checks, deletion rules and independent security and legal review. None of that is implemented or certified here.'],['Can I use this in my store today?','Only as a product demonstration. There is no live payment processing, hardware integration, identity verification, merchant contract or published store pricing.'],['How do I delete my demo data?','Open My account and choose Reset demo data. This clears facePay data in this browser only. Any receipt files you downloaded must be deleted separately.']];
    app.innerHTML='<div class="trust-hero">'+eyebrow('TRUST, WITHOUT THE FINE PRINT')+'<h1 class="hero-title">Your face.<br><span class="grad">Your choice.</span></h1><p class="hero-sub">A payment experience should earn trust before asking for it. Here is exactly what this prototype does, and what it does not.</p></div><div class="trust-banner glass"><span class="status-dot"></span><div><strong>This is a simulation.</strong><p>No camera access. No real card entry. No biometric enrollment.</p></div></div><div class="trust-grid"><section class="glass panel"><span class="feature-mark">◎</span><p class="eyebrow">TODAY · THE DEMO</p><h2>Nothing to scan.<br>Nothing to charge.</h2><p class="muted">The face animation and cashier review are scripted. The test card is fictional. Your checkout is a local demo receipt, not a payment.</p><a class="text-link" href="#/account">Manage local demo data ↗</a></section><section class="glass panel future-card"><span class="feature-mark">↗</span><p class="eyebrow">TOMORROW · DESIGN GOALS</p><h2>Built on consent.<br>Never assumption.</h2><p class="muted">A real service would require consent-based biometric processing, payment tokenization, access controls and independent review. These are goals, not claims about this demo.</p><span class="badge-pill">NOT IMPLEMENTED</span></section></div><section class="faq-section"><p class="eyebrow">GOOD QUESTIONS. STRAIGHT ANSWERS.</p><h2 class="page-title">Before you try it.</h2><div class="faq-list">'+faqs.map(function(f,i){return '<details '+(i===0?'open':'')+'><summary>'+f[0]+'<span aria-hidden="true">+</span></summary><p>'+f[1]+'</p></details>';}).join('')+'</div></section><section class="glass trust-end"><h2>Try the experience.<br>Keep your real details to yourself.</h2><a class="btn" href="#/checkout">Start a demo checkout →</a></section>';
  }

  /* ---------------- customer-controlled checkout ---------------- */
  function renderCheckoutV2(app) {
    var phase='start', basket=[], query='', completed=null;
    function sum(){return basket.reduce(function(s,i){return s+i.price*i.qty;},0);}
    function store(){return merchant ? merchant.name : 'GreenMart';}
    function draw(){
      app.innerHTML='<div class="checkout-heading">'+eyebrow('SELF-CHECKOUT · SIMULATED')+'<h1 class="page-title">'+esc(store())+'</h1><p class="page-sub">Choose. Review. Confirm. You stay in control.</p><div class="checkout-progress"><span class="'+(phase==='start'?'current':'complete')+'">1 · Identify</span><span class="'+(phase==='shop'?'current':'')+'">2 · Your basket</span><span class="'+(['review','confirm','done'].includes(phase)?'current':'')+'">3 · Confirm</span></div></div><div id="checkout-content"></div>';
      var area=document.getElementById('checkout-content');
      if(phase==='start'){
        area.innerHTML='<div class="screen-narrow"><div class="glass panel start-card"><div class="scan-wrap"><div class="scan-ring">'+FACE_SVG+'<span class="scan-tag">Animation only</span></div></div><h2>A familiar face.<br>A fresh basket.</h2><p class="muted">Try a fictional face match, then pick or scan items from the store catalog. The face match never uses your camera; barcode scanning asks first.</p><button class="btn btn-block" id="start-demo">Start demo →</button></div></div>';
        document.getElementById('start-demo').onclick=function(){this.disabled=true;this.textContent='Simulating match...';setTimeout(function(){if(!document.getElementById('checkout-content'))return;phase='shop';draw();},750);};
      }else if(phase==='shop'){
        area.innerHTML='<div class="matched-banner"><span class="status-dot"></span> Demo match · '+esc(profile.name?profile.name.split(' ')[0]:'Demo customer')+'<span>Test card •••• 4242</span></div><div class="shopping-grid"><section class="glass panel catalog-panel"><div class="panel-heading"><h2>Pick your items</h2><span class="badge-pill">'+priceList.length+' PRODUCTS</span></div><label class="sr-only" for="product-search">Search products</label><input class="search-input" id="product-search" placeholder="Search the store catalog" value="'+esc(query)+'"><button class="btn btn-scan" id="scan-barcode">▦ Scan a barcode</button><div class="catalog" id="catalog"></div><a class="text-link" href="#/dashboard">Manage store prices ↗</a></section><section class="glass panel basket-panel"><div class="panel-heading"><h2>Your basket</h2><span id="basket-count" class="badge-pill"></span></div><div id="basket-lines"></div><div class="basket-total"><span>Total</span><strong id="basket-total"></strong></div><button class="btn btn-block" id="review-basket">Send to cashier →</button><p class="local-note">Demo prices are final. No tax or fee is added.</p></section></div>';
        document.getElementById('product-search').oninput=function(){query=this.value;catalog();};catalog();basketView();
        document.getElementById('review-basket').onclick=function(){if(!basket.length)return;phase='review';draw();};
        document.getElementById('scan-barcode').onclick=openScan;
      }else if(phase==='review'||phase==='confirm'){
        area.innerHTML='<div class="screen-narrow"><div class="glass panel"><span class="receipt-stamp">'+(phase==='review'?'CASHIER REVIEW · DEMO':'✓ CASHIER CONFIRMED · DEMO')+'</span><h2>'+ (phase==='review'?'One more pair of eyes.':'Your turn to confirm.')+'</h2><p class="muted">'+(phase==='review'?'In the real concept, a cashier checks this basket. Use the button below to simulate their approval.':'Review the final total. No real payment will be made.')+'</p>'+basket.map(function(i){return '<div class="item-row"><span>'+esc(i.name)+' <small>× '+i.qty+'</small></span><strong>'+fmt(i.price*i.qty)+'</strong></div>';}).join('')+'<div class="basket-total"><span>Demo total</span><strong>'+fmt(sum())+'</strong></div><button class="btn btn-block" id="confirm-step">'+(phase==='review'?'Simulate cashier approval':'Confirm demo payment · '+fmt(sum()))+'</button><button class="btn btn-ghost btn-block" id="edit-basket">← Edit basket</button><p class="local-note">Fictional test card ending 4242. Nothing is charged.</p></div></div>';
        document.getElementById('edit-basket').onclick=function(){phase='shop';draw();};
        document.getElementById('confirm-step').onclick=function(){if(phase==='review'){phase='confirm';draw();}else{this.disabled=true;this.textContent='Completing demo...';completed=recordPurchase(basket.map(function(i){return [i.name+(i.qty>1?' × '+i.qty:''),i.price*i.qty];}));phase='done';draw();}};
      }else if(phase==='done'){
        area.innerHTML='<div class="screen-narrow"><div class="receipt glass"><div class="check">✓</div><p class="eyebrow">DEMO CHECKOUT COMPLETE</p><h2>'+fmt(txTotal(completed))+'</h2><p class="muted">No money moved. Your demo receipt is ready.</p><div class="receipt-id">'+esc(completed.id)+'</div><div class="r-lines">'+completed.items.map(function(i){return '<div class="item-row"><span>'+esc(i[0])+'</span><strong>'+fmt(i[1])+'</strong></div>';}).join('')+'</div><p class="local-note">Saved in this browser. No SMS or email was sent.</p><button class="btn btn-block" id="open-receipt">View & download receipt</button><a class="btn btn-ghost btn-block" href="#/account">My account & history</a><button class="text-button" id="another-checkout">Start another demo checkout</button></div></div>';
        document.getElementById('open-receipt').onclick=function(){receiptDialog(completed);};document.getElementById('another-checkout').onclick=function(){phase='start';basket=[];query='';draw();};
      }
    }
    function catalog(){
      var found=priceList.map(function(i,n){return {name:i[0],price:i[1],index:n};}).filter(function(i){return i.name.toLowerCase().includes(query.toLowerCase());});
      document.getElementById('catalog').innerHTML=found.length?found.map(function(i){var inBasket=basket.find(function(b){return b.index===i.index;});return '<div class="product-row"><span class="product-icon" aria-hidden="true">'+(['◒','◇','▤','◉'][i.index%4])+'</span><span class="product-info"><strong>'+esc(i.name)+'</strong><span>'+fmt(i.price)+' each'+(inBasket?' · '+inBasket.qty+' in basket':'')+'</span></span><button class="add-product" data-add="'+i.index+'" aria-label="Add '+esc(i.name)+'">+</button></div>';}).join(''):'<p class="empty-search">No products match. Try another search.</p>';
      app.querySelectorAll('[data-add]').forEach(function(b){b.onclick=function(){var n=Number(b.dataset.add);if(addItem(n)===false)return;var button=app.querySelector('[data-add="'+n+'"]');if(button)button.focus();};});
    }
    function basketView(){
      var count=basket.reduce(function(s,i){return s+i.qty;},0);document.getElementById('basket-count').textContent=count+' ITEMS';
      document.getElementById('basket-total').textContent=fmt(sum());document.getElementById('review-basket').disabled=!count;
      document.getElementById('basket-lines').innerHTML=basket.length?basket.map(function(i){return '<div class="basket-line"><div><strong>'+esc(i.name)+'</strong><span>'+fmt(i.price)+' each</span></div><div class="quantity"><button data-qty="'+i.index+'" data-delta="-1" aria-label="Remove one '+esc(i.name)+'">−</button><span>'+i.qty+'</span><button data-qty="'+i.index+'" data-delta="1" aria-label="Add one '+esc(i.name)+'">+</button></div><strong>'+fmt(i.price*i.qty)+'</strong><button class="remove-item" data-remove="'+i.index+'" aria-label="Remove '+esc(i.name)+' from basket">×</button></div>';}).join(''):'<div class="empty-basket">Your basket is waiting.<br><span>Tap + next to an item to add it.</span></div>';
      app.querySelectorAll('[data-qty]').forEach(function(b){b.onclick=function(){var item=basket.find(function(i){return i.index===Number(b.dataset.qty);});item.qty=Math.min(99,item.qty+Number(b.dataset.delta));basket=basket.filter(function(i){return i.qty>0;});catalog();basketView();};});
      app.querySelectorAll('[data-remove]').forEach(function(b){b.onclick=function(){basket=basket.filter(function(i){return i.index!==Number(b.dataset.remove);});catalog();basketView();};});
    }
    function addItem(n){
      var item=basket.find(function(i){return i.index===n;});
      if(item){if(item.qty>=99){toast('Demo limit: 99 per item');return false;}item.qty++;}
      else basket.push({index:n,name:priceList[n][0],price:priceList[n][1],qty:1});
      catalog();basketView();
      return true;
    }
    var scanStream=null, scanTimer=null;
    function stopScan(){
      if(scanTimer){clearInterval(scanTimer);scanTimer=null;}
      if(scanStream){scanStream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});scanStream=null;}
    }
    function findByBarcode(code){
      code=String(code).trim();
      for(var n=0;n<priceList.length;n++){ if(priceList[n][2] && String(priceList[n][2])===code) return n; }
      return -1;
    }
    function openScan(){
      stopScan();
      var supported = 'BarcodeDetector' in window && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      showDialog('<div class="scan-dialog"><span class="receipt-stamp">BARCODE SCANNER · DEMO</span><h2>Scan a barcode</h2><div id="scan-stage"></div><div class="scan-actions"><button class="text-button" id="scan-simulate">Simulate a scan instead</button><button class="text-button" id="scan-cancel">Cancel</button></div></div>');
      onDialogClose=stopScan;
      document.getElementById('scan-cancel').onclick=closeDialog;
      document.getElementById('scan-simulate').onclick=function(){simulatedScan(false);};
      if(supported) realScan(); else simulatedScan(true);
    }
    function scanSuccess(n, code, simulated){
      var stage=document.getElementById('scan-stage'); if(!stage) return;
      var added=addItem(n);
      stage.innerHTML='<div class="scan-result ok"><div class="check">✓</div><h3>'+esc(priceList[n][0])+'</h3><p class="muted">'+fmt(priceList[n][1])+' · barcode '+esc(code)+(simulated?' · simulated scan':'')+'</p>'+(added===false?'<p class="muted">Already at the demo limit of 99 per item.</p>':'')+'</div><div class="scan-actions"><button class="btn btn-block" id="scan-another">Scan another</button><button class="text-button" id="scan-done">Done</button></div>';
      if(added!==false) toast('Scanned: '+priceList[n][0]+' added to your basket');
      document.getElementById('scan-another').onclick=function(){closeDialog();openScan();};
      document.getElementById('scan-done').onclick=closeDialog;
    }
    function scanUnknown(code, retry){
      var stage=document.getElementById('scan-stage'); if(!stage) return;
      stage.innerHTML='<div class="scan-result unknown"><h3>Barcode not in catalog</h3><p class="muted">No item in this store\'s price list matches <strong>'+esc(code)+'</strong>. Unknown items stay out of the basket.</p></div><div class="scan-actions"><button class="btn btn-block" id="scan-retry">Try again</button><button class="text-button" id="scan-done">Close</button></div>';
      document.getElementById('scan-retry').onclick=retry;
      document.getElementById('scan-done').onclick=closeDialog;
    }
    function realScan(){
      var stage=document.getElementById('scan-stage'); if(!stage) return;
      stage.innerHTML='<div class="viewfinder live"><video id="scan-video" autoplay playsinline muted></video><span class="vf-line"></span></div><p class="scan-status">Camera is used for live barcode detection only. Nothing is recorded or uploaded.</p>';
      navigator.mediaDevices.getUserMedia({video:{facingMode:'environment'}}).then(function(stream){
        if(!document.getElementById('scan-stage')){stream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});return;}
        scanStream=stream;
        var video=document.getElementById('scan-video'); if(!video){stopScan();return;}
        video.srcObject=stream;
        var detector;
        try{ detector=new BarcodeDetector({formats:['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code']}); }
        catch(e){ stopScan(); simulatedScan(true); return; }
        scanTimer=setInterval(function(){
          var v=document.getElementById('scan-video');
          if(!v||v.readyState<2)return;
          detector.detect(v).then(function(codes){
            if(!codes||!codes.length)return;
            var code=String(codes[0].rawValue||'').trim();
            if(!code)return;
            stopScan();
            var n=findByBarcode(code);
            if(n>=0) scanSuccess(n, code, false); else scanUnknown(code, function(){realScan();});
          }).catch(function(){});
        },350);
      }).catch(function(){
        toast('Camera unavailable - using a simulated scan');
        simulatedScan(true);
      });
    }
    function simulatedScan(auto){
      stopScan();
      var stage=document.getElementById('scan-stage'); if(!stage) return;
      var pool=[];
      for(var n=0;n<priceList.length;n++){ if(priceList[n][2]) pool.push(n); }
      if(!pool.length){
        stage.innerHTML='<div class="scan-result unknown"><h3>No barcodes on file</h3><p class="muted">This price list has no barcode column yet. Upload a CSV with barcodes from the store dashboard.</p></div>';
        return;
      }
      stage.innerHTML='<div class="viewfinder sim"><span class="sim-bars" aria-hidden="true"></span><span class="vf-line"></span><span class="scan-tag">Simulated</span></div><p class="scan-status">'+(auto?'Live scanning is not available in this browser, so this scan is simulated. ':'')+'Scanning the item...</p>';
      setTimeout(function(){
        if(!document.getElementById('scan-stage'))return;
        var pick=pool[Math.floor(Math.random()*pool.length)];
        scanSuccess(pick, priceList[pick][2], true);
      },1900);
    }
    draw();
  }

  /* ---------------- router ---------------- */
  var routes = { home: renderHome, signup: renderSignup, checkout: renderCheckoutV2, dashboard: renderDashboard, account: renderAccount, business: renderBusiness, security: renderSecurity };

  function route() {
    var hash = window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home';
    var name = routes[hash] ? hash : 'home';
    var app = document.getElementById('app');
    closeDialog();
    routes[name](app);
    document.title = 'facePay · ' + ({home:'Pay with your face',signup:'Join the demo',checkout:'Self-checkout demo',dashboard:'Store dashboard',account:'My account',business:'For stores',security:'Trust & FAQ'}[name]);
    Array.prototype.forEach.call(document.querySelectorAll('[data-nav]'), function (a) {
      a.classList.toggle('active', a.getAttribute('data-nav') === name || (a.getAttribute('data-nav') === 'business' && name === 'dashboard'));
    });
    window.scrollTo(0, 0);
  }

  window.addEventListener('hashchange', route);
  route();
})();
