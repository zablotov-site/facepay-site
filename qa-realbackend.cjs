const {chromium}=require('playwright'),fs=require('fs');
const OUT='/downloads',BASE='https://facepay.pages.dev',PW=fs.readFileSync('/tmp/fp-qa-pw','utf8').trim();
(async()=>{
 const b=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,permissions:['camera','microphone']});
 await ctx.route('**/fx/*',r=>{const n=r.request().url().split('/').pop();r.fulfill({path:'/tmp/fx/'+n,contentType:'image/png'})});
 const page=await ctx.newPage();
 page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 const shot=async n=>{await page.screenshot({path:OUT+'/rb-'+n+'.png'});console.log('shot',n)};
 await page.goto(BASE+'/tzedakah');
 const mock=async()=>{
 await page.evaluate(async()=>{await FacePayFace.load();window.__fx='sheldon1';window.__crops={};
  for(const n of ['sheldon1','sheldon2','sheldon3','leonard2']){const img=await faceapi.fetchImage('/fx/'+n+'.png');const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle='#777';x.fillRect(0,0,640,480);const sc=Math.min(640/img.width,480/img.height)*0.95,w=img.width*sc,h=img.height*sc;x.drawImage(img,(640-w)/2,(480-h)/2,w,h);window.__crops[n]=c;}
  navigator.mediaDevices.getUserMedia=async()=>{const c=window.__crops[window.__fx],s=c.captureStream(10);setInterval(()=>c.getContext('2d').drawImage(c,0,0),100);return s;};
  window.__srText='akhtsn';
  const SRStub=class{constructor(){}start(){this.onstart&&this.onstart();setTimeout(()=>{const alt=[{transcript:window.__srText,confidence:.9}];alt.isFinal=true;this.onresult&&this.onresult({results:[alt]});this.onend&&this.onend();},900)} abort(){}stop(){}};['SpeechRecognition','webkitSpeechRecognition'].forEach(k=>Object.defineProperty(window,k,{value:SRStub,configurable:true,writable:true}));
 });
 };
 
 await page.locator('#fp-login').waitFor();await shot('1-login-yiddish');
 await page.fill('#lu','ari');await page.fill('#lp','wrong');await page.locator('#fp-login button[type=submit]').click();await page.waitForTimeout(800);console.log('bad login msg:',await page.locator('#fp-lerr').innerText());
 await page.fill('#lp',PW);await page.locator('#fp-login button[type=submit]').click();await page.locator('#tz-go').waitFor();await shot('2-collector-start');
 await page.evaluate(()=>{window.__fx='leonard2';window.__srText='akhtsn'});
 await mock();
 await page.locator('#tz-go').click();await page.locator('#tz-cam-on').click();
 await page.locator('#tz-enroll').waitFor({timeout:50000});await shot('3-new-face-enroll');
 await page.fill('#tz-name','Sample Test Donor');await page.fill('#tz-phone','+1 555 010 0188');await page.fill('#tz-email','test@example.com');await page.locator('#tz-enroll').click();
 await page.locator('#tz-confirm:not([hidden])').waitFor({timeout:30000});await page.waitForTimeout(600);await shot('4-voice-amount-confirm');
 console.log('heard/amount:',(await page.locator('#tz-heard').innerText()).replace(/\n/g,' '),'|',(await page.locator('#tz-amount').innerText()).replace(/\n/g,' '));
 await page.locator('#tz-confirm').click();await page.locator('.tz-success').waitFor({timeout:20000});await page.waitForTimeout(300);await shot('5-success');
 // recognition on same device from server donor list
 await page.locator('#tz-next').click();await page.locator('#tz-go').click();await page.locator('#tz-cam-on').click();
 await page.locator('#tz-confirm:not([hidden])').waitFor({timeout:50000}).catch(async()=>{await shot('6x-fail')});
 console.log('second visit chip:',(await page.locator('.tz-donor-chip').innerText()).replace(/\n/g,' '));
 await page.locator('#tz-confirm').click();await page.locator('.tz-success').waitFor({timeout:20000});
 // settings
 await page.goto(BASE+'/settings');await page.locator('#st-body').waitFor();await shot('6-settings-amounts');
 await page.fill('#st-new','26');await page.locator('#st-add').click();await page.locator('#st-save').click();await page.waitForTimeout(700);
 await page.locator('.st-tab[data-tab=donors]').click();await shot('7-settings-donors');
 await page.locator('.tz-donor',{hasText:'Sample Test Donor'}).click();await shot('8-donor-detail');
 await page.locator('.st-tab[data-tab=receipts]').click();await shot('9-settings-receipts');
 await page.locator('.st-tab[data-tab=account]').click();await page.waitForTimeout(500);await shot('10-settings-account');
 // other device: fresh context, no local storage
 const c2=await b.newContext({viewport:{width:820,height:1180},deviceScaleFactor:1});const p2=await c2.newPage();
 await p2.goto(BASE+'/settings');await p2.fill('#lu','ari');await p2.fill('#lp',PW);await p2.locator('#fp-login button[type=submit]').click();await p2.locator('#st-body').waitFor();
 await p2.locator('.st-tab[data-tab=receipts]').click();await p2.waitForTimeout(400);
 console.log('device2 sees receipts:',await p2.locator('.st-rec').count(),'| donors total text:',(await p2.locator('.st-sum').innerText()).replace(/\n/g,' '));
 await p2.screenshot({path:OUT+'/rb-11-other-device-tablet-receipts.png'});
 // English toggle
 await p2.locator('.fp-lang').click();await p2.locator('#st-body').waitFor();await p2.screenshot({path:OUT+'/rb-12-settings-english.png'});
 // CSV export check
 const [dl]=await Promise.all([p2.waitForEvent('download'),p2.locator('#r-csv').click()]);console.log('csv file:',dl.suggestedFilename());
 await b.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
