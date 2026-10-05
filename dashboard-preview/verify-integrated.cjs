/* Adapter contract checks with inert module documents, not live Firebase/API tests. */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const read=(file)=>fs.readFileSync(path.join(__dirname,file),'utf8');
const errors=[],passed=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
const dom=new JSDOM(read('site-vision-dashboard.html'),{
  url:'https://preview.example.invalid/dashboard-preview/site-vision-dashboard.html',
  runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};}
});
const w=dom.window,d=w.document;
const click=(selector,doc=d)=>{const el=doc.querySelector(selector);assert.ok(el,selector);el.click();};
const tick=()=>new Promise(resolve=>w.requestAnimationFrame(()=>w.requestAnimationFrame(resolve)));
async function check(name,fn){await fn();passed.push(name);console.log('PASS',name);}
function fixture(frame,html){const doc=frame.contentDocument;doc.open();doc.write(html);doc.close();frame.dispatchEvent(new w.Event('load'));return doc;}

(async()=>{
  await check('All 71 protected current-main files retain their exact hashes',()=>{
    const hashes=JSON.parse(read('protected-sources.json'));assert.equal(Object.keys(hashes).length,71);
    for(const [file,hash] of Object.entries(hashes))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash,file);
  });
  let red,redDoc,clima,climaDoc;
  await check('Lazy same-origin modules and isolated documents',()=>{
    assert.equal(d.querySelectorAll('.operational-frame').length,0);
    click('.sidebar [data-page="localizador"]');red=d.getElementById('site-module-red');
    assert.equal(red.src,'https://preview.example.invalid/index.html');
    assert.equal(d.querySelectorAll('.operational-frame').length,1);
    assert.equal(d.getElementById('module-host').dataset.state,'loading');
    click('.sidebar [data-page="inicio"]');click('.sidebar [data-page="localizador"]');
    assert.equal(d.getElementById('module-host').dataset.state,'loading');
    assert.equal(d.getElementById('site-module-red'),red);
    const source=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
    const accessStyle=source.match(/<style id="firebase-access-styles">([\s\S]*?)<\/style>/)[1];
    redDoc=fixture(red,`<!doctype html><html><head><style>${accessStyle}</style></head><body class="firebase-locked"><div id="firebaseAccessGate">Acceso original de prueba</div><div id="dashboardApp" class="app"><button id="tabClimaAlert">Clima</button><button id="tabLocalizador"><span class="module-name">LOCALIZADOR KM</span></button><select id="ramal"><option>C15</option></select><input id="km" value="1400,400"><div id="map"></div></div></body></html>`);
    assert.notEqual(redDoc,d);
    assert.equal(redDoc.querySelector('#tabLocalizador .module-name').textContent,'Explorar la red');
  });
  await check('Original access lock remains effective after applying the visual skin',()=>{
    assert.ok(redDoc.body.classList.contains('firebase-locked'));
    assert.equal(redDoc.getElementById('firebaseAccessGate').hidden,false);
    assert.equal(red.contentWindow.getComputedStyle(redDoc.getElementById('dashboardApp')).display,'none');
    assert.equal(d.getElementById('module-host').dataset.state,'access');
  });
  await check('Original assistant launcher is not opened while access is locked',async()=>{
    red.contentWindow.eval(fs.readFileSync(path.join(__dirname,'../site-assistant.js'),'utf8'));
    if(!redDoc.getElementById('sv-assistant-launcher'))redDoc.dispatchEvent(new red.contentWindow.Event('DOMContentLoaded'));
    assert.ok(redDoc.getElementById('sv-assistant-launcher'));
    click('#assistant-button');await tick();
    assert.equal(d.querySelector('h1').textContent,'Asistente Site');
    assert.equal(redDoc.getElementById('sv-assistant-panel').classList.contains('open'),false);
  });
  await check('Assistant reuses the original UI and the original map document',async()=>{
    // Simulated authorized DOM in the isolated test fixture; no authentication code is run.
    redDoc.body.classList.remove('firebase-locked');redDoc.getElementById('firebaseAccessGate').hidden=true;
    await tick();
    assert.ok(redDoc.getElementById('sv-assistant-panel').classList.contains('open'));
    assert.equal(d.getElementById('site-module-red'),red);
    assert.equal(redDoc.querySelectorAll('#sv-assistant-root').length,1);
    assert.match(redDoc.getElementById('sv-assistant-messages').textContent,/datos ferroviarios/);
    click('.sv-assistant-close',redDoc);await tick();
    assert.equal(d.querySelector('h1').textContent,'Explorar la red');
    assert.equal(redDoc.getElementById('km').value,'1400,400');
  });
  await check('Internal navigation from the original map stays inside the shell',()=>{
    click('#tabClimaAlert',redDoc);
    assert.equal(d.querySelector('h1').textContent,'Clima Alert');
    assert.equal(red.hidden,true);clima=d.getElementById('site-module-clima');
    assert.equal(clima.src,'https://preview.example.invalid/clima/index.html');
    clima.dispatchEvent(new w.Event('error'));
    assert.equal(d.getElementById('module-host').dataset.state,'error');
    click('.sidebar [data-page="localizador"]');click('.sidebar [data-page="clima"]');
    assert.equal(d.getElementById('module-host').dataset.state,'error');
    click('#module-retry');
    assert.equal(d.getElementById('module-host').dataset.state,'loading');
    assert.equal(clima.getAttribute('aria-busy'),'true');
    assert.equal(red.contentDocument,redDoc);
    climaDoc=fixture(clima,'<!doctype html><html><head></head><body><div class="app"><header><div class="logo">Original climate header</div></header><a id="site-return" href="https://upsaltavision.com.ar/">VisionSite</a><div id="panel-clima"><div id="sectors-grid"><article>Fixture de estado</article></div></div><input id="fixture-filter" value="C14"><div id="panel-reporte"><span class="fixture-temperature" style="color:#FFE600">30</span><span class="fixture-temperature" style="color:#FF4545">31</span></div></div></body></html>');
    assert.notEqual(climaDoc,redDoc);assert.equal(d.getElementById('module-host').dataset.state,'ready');
  });
  await check('Eight section changes preserve both iframe identities and entered state',()=>{
    for(const page of ['inicio','cruces','servicios','infraestructura','alertas','localizador','clima','asistente'])click(`.sidebar [data-page="${page}"]`);
    assert.equal(d.getElementById('site-module-red'),red);assert.equal(d.getElementById('site-module-clima'),clima);
    assert.equal(red.contentDocument,redDoc);assert.equal(clima.contentDocument,climaDoc);
    assert.equal(redDoc.getElementById('km').value,'1400,400');assert.equal(climaDoc.getElementById('fixture-filter').value,'C14');
    assert.equal(d.querySelectorAll('.operational-frame').length,2);
  });
  await check('Shared theme reaches visible and hidden modules without changing weather colors',()=>{
    const before=[...climaDoc.querySelectorAll('.fixture-temperature')].map(e=>e.getAttribute('style'));
    click('#theme-toggle');assert.equal(redDoc.documentElement.dataset.theme,'light');assert.equal(climaDoc.documentElement.dataset.theme,'light');
    click('#theme-toggle');assert.equal(redDoc.documentElement.dataset.theme,'dark');assert.equal(climaDoc.documentElement.dataset.theme,'dark');
    assert.deepEqual([...climaDoc.querySelectorAll('.fixture-temperature')].map(e=>e.getAttribute('style')),before);
    for(const doc of [redDoc,climaDoc])for(const id of ['sv-fonts','sv-theme','sv-skin'])assert.equal(doc.querySelectorAll('#'+id).length,1);
  });
  await check('Climate return link and global keyboard search retain common navigation',()=>{
    click('.sidebar [data-page="clima"]');click('#site-return',climaDoc);
    assert.equal(d.querySelector('h1').textContent,'Explorar la red');assert.equal(red.hidden,false);
    redDoc.dispatchEvent(new red.contentWindow.KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true,cancelable:true}));
    assert.ok(d.getElementById('search-dialog').open);d.getElementById('search-dialog').close();
  });
  await check('The frame reference view does not replace or reload the operational frame',()=>{
    click('[data-action="reference-view"]');assert.ok(d.getElementById('module-host').hidden);
    assert.ok(d.querySelector('.rail-map'));click('[data-action="module-view"]');
    assert.equal(d.getElementById('site-module-red'),red);assert.equal(red.contentDocument,redDoc);
    assert.equal(redDoc.getElementById('km').value,'1400,400');
  });
  await check('Viewer exposes desktop, notebook, tablet and portrait/landscape mobile dimensions',()=>{
    const viewer=new JSDOM(read('review.html'));
    const dimensions=[...viewer.window.document.querySelectorAll('[data-width]')].map(e=>`${e.dataset.width}x${e.dataset.height}`);
    for(const v of ['1366x900','1280x720','820x1000','1180x820','390x844','360x800','844x390'])assert.ok(dimensions.includes(v),v);
    viewer.window.close();
  });
  await check('Source gate, controls and operational temperature rules remain untouched',()=>{
    const map=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
    const clima=fs.readFileSync(path.join(__dirname,'../clima/index.html'),'utf8');
    for(const id of ['ramal','km','buscar','crucesActiva','interferenciasActiva','tabPersonal','tabSeguridad','tabClientes','firebaseAccessGate'])assert.ok(map.includes(`id="${id}"`),id);
    for(const id of ['windy-frame','threshold-save-btn','push-toggle-btn','contacts-login-btn','report-table','alarm-toggle'])assert.ok(clima.includes(`id="${id}"`),id);
    assert.ok(!/--(?:warn|danger|ok|hot|rain|storm)\s*:/.test(read('module-skin.css')));
    assert.ok(!/\.(?:rth-alerta|alerta-bajo|alerta-moderado|alerta-alto)\s*\{/.test(read('module-skin.css')));
    assert.deepEqual(errors,[]);
  });
  console.log(JSON.stringify({checks:passed.length,passed:passed.length,errors,scope:'DOM contracts with inert fixtures; no live services or visual browser verification'}));
  dom.window.close();
})().catch(error=>{console.error(error);dom.window.close();process.exitCode=1;});
