// Tzedakah mode QA. Usage: node qa-tzedakah.cjs  (QA_URL optional, fixtures in /tmp/fx, screenshots to /downloads)
const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path');
const OUT=process.env.QA_OUT||'/downloads', FX='/tmp/fx';
(async()=>{
 let base=process.env.QA_URL,server;
 if(!base){const root=__dirname;server=http.createServer((req,res)=>{let u=req.url.split('?')[0],f=u.startsWith('/fx/')?path.join(FX,path.basename(u)):path.join(root,u==='/'?'index.html':u);if(!fs.existsSync(f)&&!path.extname(f))f+='.html';if(!fs.existsSync(f)){res.statusCode=404;return res.end('nf')}res.setHeader('content-type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'}[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}).listen(0);base='http://localhost:'+server.address().port;}
 const b=await chromium.launch({headless:true});const ctx=await b.newContext({viewport:{width:1180,height:820},deviceScaleFactor:1});const page=await ctx.newPage();
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));page.on('console',m=>{if(/^DBG/.test(m.text()))console.log(m.text())});
 const shot=async n=>{await page.screenshot({path:OUT+'/tz-'+n+'.png'});console.log('shot',n)};
 await page.goto(base+'/');
 const mock=async()=>{
 await page.evaluate(async()=>{await FacePayFace.load();window.__fx='sheldon1';window.__crops={};
  for(const n of ['sheldon1','sheldon2','sheldon3','leonard2']){const img=await faceapi.fetchImage('/fx/'+n+'.png');const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle='#777';x.fillRect(0,0,640,480);const sc=Math.min(640/img.width,480/img.height)*0.95,w=img.width*sc,h=img.height*sc;x.drawImage(img,(640-w)/2,(480-h)/2,w,h);window.__crops[n]=c;}
  navigator.mediaDevices.getUserMedia=async()=>{const c=window.__crops[window.__fx],s=c.captureStream(10);setInterval(()=>c.getContext('2d').drawImage(c,0,0),100);return s;};
  window.__srText='akhtsn';
  const SRStub=class{constructor(){}start(){this.onstart&&this.onstart();setTimeout(()=>{const alt=[{transcript:window.__srText,confidence:.9}];alt.isFinal=true;this.onresult&&this.onresult({results:[alt]});this.onend&&this.onend();},900)} abort(){}stop(){}};['SpeechRecognition','webkitSpeechRecognition'].forEach(k=>Object.defineProperty(window,k,{value:SRStub,configurable:true,writable:true}));
 });
 };
 await mock();
 // enroll sheldon at signup
 await page.getByRole('link',{name:'Join facePay'}).click();await page.locator('#sample-details').click();await page.evaluate(()=>{document.getElementById('f-name').value='Sheldon Cooper'});await page.locator('#next1').click();
 await page.locator('.face-start').click();await page.locator('.face-start').filter({hasText:'Continue'}).waitFor({timeout:60000});await page.locator('.face-start').click();
 await page.locator('#finish-demo').click();
 // home entry
 await page.goto(base+'/');await shot('0-home-entry');
 await page.evaluate(()=>window.__fx='sheldon1');
 await page.goto(base+'/tzedakah');await mock();
 await page.evaluate(async()=>{await FacePayFace.load();});
 await shot('1-collector-start');
 await page.locator('#tz-go').click();await shot('2a-scan-ready');
 await page.evaluate(()=>window.__fx='sheldon2');
 await page.locator('#tz-cam-on').click();await page.waitForTimeout(1500);await shot('2b-scanning');
  await page.locator('#tz-confirm').waitFor({state:'attached',timeout:60000});
 await page.locator('#tz-confirm:not([hidden])').waitFor({timeout:30000});await page.waitForTimeout(500);await shot('3-voice-amount-green-confirm');
 console.log('heard/amount:',await page.locator('#tz-heard').innerText(),'|',await page.locator('#tz-amount').innerText(),'| manual hidden:',await page.locator('#tz-manual').isHidden());
 await page.locator('#tz-confirm').click();await page.waitForTimeout(400);await shot('4-charging');
 await page.locator('.tz-success').waitFor({timeout:15000});await shot('5-success');
 await page.locator('#tz-rec-view').click();await page.waitForTimeout(1200);await shot('6-donor-record');
 console.log('clip bytes in IDB:',await page.evaluate(async()=>{const rec=await new Promise(res=>{const r=indexedDB.open('facepay-tzedakah');r.onsuccess=()=>{const g=r.result.transaction('videos').objectStore('videos').getAll();g.onsuccess=()=>res(g.result)}});return rec.map(x=>({id:x.id,size:x.blob.size,mime:x.mime,ms:x.ms}))}));
 console.log('clip playable:',await page.locator('.tz-clip').first().evaluate(v=>new Promise(res=>{v.onloadedmetadata=()=>res('meta ok dur='+v.duration+' w='+v.videoWidth);setTimeout(()=>res('readyState '+v.readyState+' src '+!!v.src),4000)})));
 // unknown face -> quick enroll, speech: "five dollars"
 await page.goto(base+'/tzedakah');await mock();await page.evaluate(()=>{window.__fx='leonard2';window.__srText='five dollars'});
 await page.locator('#tz-go').click();await page.locator('#tz-cam-on').click();await page.locator('#tz-enroll').waitFor({timeout:40000}).catch(async e=>{await shot('7x-fail');console.log('status',await page.locator('#tz-status').innerText().catch(()=>'?'));throw e});await shot('7-unknown-face-quick-enroll');
 await page.fill('#tz-name','Leonard H');await page.fill('#tz-phone','+1 555 010 0199');await page.fill('#tz-email','leonard@example.com');await page.locator('#tz-enroll').click();
 await page.locator('#tz-confirm:not([hidden])').waitFor({timeout:30000});console.log('amount2:',await page.locator('#tz-amount').innerText());
 await page.waitForTimeout(1500);await page.locator('#tz-confirm').click();await page.locator('.tz-success').waitFor();
 await page.locator('#tz-next').click();await page.locator('#tz-donors').click();await shot('8-donor-list');
 // account receipt
 await page.goto(base+'/account');await page.locator('[data-receipt]').first().click();await page.waitForTimeout(300);await shot('9-account-receipt-dialog');
 // fallback: no SpeechRecognition, no camera
 const p2=await ctx.newPage();await p2.addInitScript(()=>{delete window.webkitSpeechRecognition;delete window.SpeechRecognition;Object.defineProperty(navigator,'mediaDevices',{value:undefined,configurable:true});});
 await p2.goto(base+'/tzedakah');await p2.locator('#tz-go').click();await p2.screenshot({path:OUT+'/tz-10a-fallback-no-camera.png'});await p2.locator('#tz-sim-face').click();await p2.locator('#tz-confirm:not([hidden])').waitFor({timeout:15000});await p2.screenshot({path:OUT+'/tz-10b-fallback-voice-simulated.png'});await p2.locator('#tz-confirm').click();await p2.locator('.tz-success').waitFor();await p2.screenshot({path:OUT+'/tz-10c-fallback-success.png'});
 // manual fallback on unparseable speech
 await page.goto(base+'/tzedakah');await mock();await page.evaluate(()=>{window.__fx='sheldon2';window.__srText='hello there'});await page.locator('#tz-go').click();await page.locator('#tz-cam-on').click();await page.locator('#tz-manual:not([hidden])').waitFor({timeout:60000});await shot('11-manual-fallback-when-unclear');
 // parser unit checks
 console.log(JSON.stringify(await page.evaluate(()=>['5','18','36','five dollars','$10','finf','akhtsn','zeks un draysik','double chai','twenty five','\u05D7\u05DE\u05E9 \u05D3\u05D5\u05DC\u05E8','\u05E9\u05DE\u05D5\u05E0\u05D4 \u05E2\u05E9\u05E8\u05D4','yes 18 dollars','hello'].map(t=>[t,FacePayTzedakah.parseAmount(t)]))));
 await b.close();if(server)server.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
