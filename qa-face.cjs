const {chromium}=require('playwright'),fs=require('fs'),http=require('http'),path=require('path'),assert=require('assert');
(async()=>{
const root=__dirname,base=process.env.QA_URL||'http://127.0.0.1:8766';let server;
if(!process.env.QA_URL){server=http.createServer((req,res)=>{let u=decodeURI(req.url.split('?')[0]),f=u.startsWith('/fixtures/')?path.join('/tmp/face-test-fixtures',path.basename(u)):path.join(root,u==='/'?'index.html':u);if(!path.extname(f)&&!fs.existsSync(f))f+='.html';if(!fs.existsSync(f)){res.statusCode=404;return res.end();}const types={'.js':'text/javascript','.json':'application/json','.html':'text/html','.jpg':'image/jpeg','.css':'text/css'};res.setHeader('Content-Type',types[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));});await new Promise(r=>server.listen(8766,r));}
const browser=await chromium.launch({headless:true}),page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));let outbound=[];page.on('request',r=>{if(r.method()!=='GET')outbound.push(r.url());});
async function signup(){await page.goto(base+'/signup');await page.locator('#sample-details').click();await page.locator('#next1').click();}
async function shot(name){await page.screenshot({path:'/downloads/facepay-real-'+name+'.png',fullPage:true});}
await signup();await page.locator('.face-start').click();await page.locator('.face-status').filter({hasText:/No camera|denied/}).waitFor();await shot('no-camera');assert(await page.locator('.face-demo').isVisible());await page.locator('.face-demo').click();await page.locator('#finish-demo').click();assert(!(await page.evaluate(()=>JSON.parse(localStorage.getItem('facepay-profile')).faceDescriptors)));
console.log('PASS natural camera-less fallback, explicit simulation has no face descriptors');
// Install deterministic detector only for UI logic paths. No test hook is shipped.
await page.addInitScript(()=>{
 const zero=()=>Array(128).fill(0);window.__fakeFace=zero();window.__count=1;window.__streams=[];
 Object.defineProperty(navigator.mediaDevices,'getUserMedia',{configurable:true,value:async()=>{let c=document.createElement('canvas');c.width=640;c.height=480;c.getContext('2d').fillRect(0,0,640,480);const s=c.captureStream(5);window.__streams.push(s);return s;}});
 const net={loadFromUri:async()=>{}};
 window.faceapi={nets:{tinyFaceDetector:net,faceLandmark68Net:net,faceRecognitionNet:net},TinyFaceDetectorOptions:function(){},detectAllFaces:()=>({withFaceLandmarks:()=>({withFaceDescriptors:async()=>Array.from({length:window.__count},()=>({descriptor:window.__fakeFace,detection:{box:{width:300,height:300}}}))})})};
});
await signup();await page.locator('.face-start').click();await page.locator('.face-start').filter({hasText:'Continue'}).waitFor();assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));await shot('captured-ui-test');await page.locator('.face-start').click();await page.locator('#finish-demo').click();let p=await page.evaluate(()=>JSON.parse(localStorage.getItem('facepay-profile')));assert.equal(p.faceDescriptors.length,3);assert.equal(p.faceDescriptors[0].length,128);console.log('PASS 3-capture enrollment UI, storage and camera shutdown (deterministic detector)');
await page.goto(base+'/checkout');await page.locator('.face-start').click();await page.locator('.face-start').filter({hasText:'Continue as'}).waitFor();await shot('match-ui-test');await page.locator('.face-start').click();await page.getByText('Real local face match',{exact:false}).waitFor();console.log('PASS real-path matched profile label (deterministic detector)');
await page.goto(base+'/checkout');await page.evaluate(()=>window.__fakeFace=Array(128).fill(1));await page.locator('.face-start').click();await page.getByText('No face match.',{exact:false}).waitFor();await shot('no-match-ui-test');assert(await page.locator('.face-start').isEnabled());await page.locator('.face-demo').click();await page.getByText('Simulated demo · not a face match',{exact:false}).waitFor();console.log('PASS mismatch rejection, retry and explicit demo fallback (deterministic detector)');
await signup();await page.evaluate(()=>window.__count=2);await page.locator('.face-start').click();await page.getByText('More than one face.',{exact:false}).waitFor();assert(!(await page.locator('.face-start').isVisible()));await page.getByRole('link',{name:'Home',exact:true}).click();assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));console.log('PASS multiple-face guard and camera shutdown on navigation');
await signup();await page.evaluate(()=>window.__count=0);await page.locator('.face-start').click();await page.getByText('Center your face, move closer',{exact:false}).waitFor();await page.getByRole('link',{name:'Home',exact:true}).click();console.log('PASS no-face guard');
await signup();await page.locator('.face-start').click();await page.getByText('FACE DETECTED',{exact:true}).waitFor();await page.evaluate(()=>document.dispatchEvent(new Event('pagehide'))); // test real event below
await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));assert(await page.evaluate(()=>window.__streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))));console.log('PASS pagehide stops camera');
// Separate fresh context: load and execute the actual shipped neural networks.
const real=await browser.newPage({viewport:{width:390,height:844}});real.on('pageerror',e=>errors.push(e.message));await real.goto(base+'/');
if(!process.env.QA_URL){
 const result=await real.evaluate(async()=>{
  await FacePayFace.load();let descriptors=[];
  for(const name of ['obama','obama2','biden']){const img=await faceapi.fetchImage('/fixtures/'+name+'.jpg');const r=await faceapi.detectSingleFace(img,new faceapi.TinyFaceDetectorOptions({inputSize:608,scoreThreshold:.4})).withFaceLandmarks().withFaceDescriptor();if(!r)throw Error('No face in fixture '+name);descriptors.push(Array.from(r.descriptor));}
  const [a,b,c]=descriptors;return {same:FacePayFace.distance(a,b),different:FacePayFace.distance(a,c),sameMatch:FacePayFace.match(b,[a,a,a]),differentMatch:FacePayFace.match(c,[a,a,a]),invalid:FacePayFace.match([1],[a,a,a]),threshold:FacePayFace.threshold};
 });
 console.log('REAL MODEL RESULTS',result);assert(result.sameMatch);assert(!result.differentMatch);assert(!result.invalid);console.log('PASS vendored neural-network inference recognizes same person in different photo and rejects different person');
}
assert.equal(outbound.length,0);assert.equal(errors.length,0,errors.join('\n'));console.log('PASS no non-GET requests, no page errors');await browser.close();if(server)server.close();
})().catch(e=>{console.error(e);process.exit(1)});
