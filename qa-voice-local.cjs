const {chromium}=require('playwright'),fs=require('fs');
const OUT='/downloads',BASE='https://facepay.pages.dev',PW=fs.readFileSync('/tmp/fp-qa-pw','utf8').trim();
(async()=>{
 const b=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream']});
 const ctx=await b.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,permissions:['camera','microphone']});
 await ctx.route('**/fx/*',r=>{const n=r.request().url().split('/').pop();r.fulfill({path:'/tmp/fx/'+n,contentType:'image/png'})});
 const page=await ctx.newPage();page.on('pageerror',e=>console.log('PAGEERROR',e.message));
 await page.goto(BASE+'/tzedakah');
 const mock=async()=>{
 await page.evaluate(async()=>{await FacePayFace.load();window.__fx='sheldon1';window.__crops={};
  for(const n of ['sheldon1','sheldon2','sheldon3','leonard2']){const img=await faceapi.fetchImage('/fx/'+n+'.png');const c=document.createElement('canvas');c.width=640;c.height=480;const x=c.getContext('2d');x.fillStyle='#777';x.fillRect(0,0,640,480);const sc=Math.min(640/img.width,480/img.height)*0.95,w=img.width*sc,h=img.height*sc;x.drawImage(img,(640-w)/2,(480-h)/2,w,h);window.__crops[n]=c;}
  navigator.mediaDevices.getUserMedia=async()=>{const c=window.__crops[window.__fx],s=c.captureStream(10);setInterval(()=>c.getContext('2d').drawImage(c,0,0),100);return s;};
  window.__srText='akhtsn';
  const SRStub=class{constructor(){}start(){this.onstart&&this.onstart();setTimeout(()=>{const alt=[{transcript:window.__srText,confidence:.9}];alt.isFinal=true;this.onresult&&this.onresult({results:[alt]});this.onend&&this.onend();},900)} abort(){}stop(){}};['SpeechRecognition','webkitSpeechRecognition'].forEach(k=>Object.defineProperty(window,k,{value:SRStub,configurable:true,writable:true}));
 });
 };
 
 await page.locator('#fp-login').waitFor();await page.fill('#lu','ari');await page.fill('#lp',PW);await page.locator('#fp-login button[type=submit]').click();await page.locator('#tz-go').waitFor();
 const scenarios={
  A_native:null,
  B_local_ready:`class S{constructor(){window.__inst=this;this._pl=false}set processLocally(v){this._pl=v;window.__plSet=v}get processLocally(){return this._pl}start(){window.__started={pl:this._pl,lang:this.lang};this.onstart&&this.onstart();setTimeout(()=>{const alt=[{transcript:'akhtsn',confidence:.9}];alt.isFinal=true;this.onresult&&this.onresult({results:[alt]})},500)}abort(){}stop(){}};S.available=async(o)=>{window.__availArgs=JSON.stringify(o);return 'available'};S.install=async()=>{};`,
  C_downloadable:`class S{get processLocally(){return false}set processLocally(v){}start(){window.__started='SHOULD NOT START'}abort(){}stop(){}};S.available=async()=>'downloadable';S.install=async(o)=>{window.__installed=JSON.stringify(o)};`,
  D_no_processLocally:`class S{start(){window.__started='SHOULD NOT START'}abort(){}stop(){}};`
 };
 for(const [name,code] of Object.entries(scenarios)){
  await page.goto(BASE+'/tzedakah');await page.locator('#tz-go').waitFor();await mock();
  await page.evaluate(()=>{window.__fx='leonard2'});
  if(code) await page.evaluate(c=>{const S=eval('('+'(()=>{'+c+'return S})()'+')');Object.defineProperty(window,'SpeechRecognition',{value:S,configurable:true,writable:true});Object.defineProperty(window,'webkitSpeechRecognition',{value:S,configurable:true,writable:true});},code);
  await page.locator('#tz-go').click();await page.locator('#tz-cam-on').click();await page.locator('#tz-guest').waitFor({timeout:50000});
  await page.locator('#tz-guest').click();await page.locator('#tz-confirm:not([hidden])').waitFor({timeout:15000}).catch(()=>{});await page.waitForTimeout(1500);
  const info=await page.evaluate(()=>({started:window.__started||null,plSet:window.__plSet||null,avail:window.__availArgs||null,installed:window.__installed||null,badge:[...document.querySelectorAll('.tz-simbadge')].map(e=>e.innerText),note:[...document.querySelectorAll('.local-note')].map(e=>e.innerText).join(' | '),heard:document.querySelector('#tz-heard')?.innerText,install:!!document.querySelector('#tz-install'),native:{has:!!(window.SpeechRecognition),pl:'processLocally' in (window.SpeechRecognition||{prototype:{}}).prototype,avail:typeof (window.SpeechRecognition||{}).available}}));
  console.log(name,JSON.stringify(info));
  await page.screenshot({path:OUT+'/vp-'+name+'.png'});
 }
 await b.close();
})().catch(e=>{console.error('FAIL',e);process.exit(1)});
