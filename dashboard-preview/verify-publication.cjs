/* Release routing and original Acumulados UI; fixtures stay in test memory. */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const site=path.resolve(process.argv[2]||'');
assert.ok(process.argv[2],'Pass the prepared artifact directory');
const read=(name)=>fs.readFileSync(path.join(site,name),'utf8');
const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
let network=0;
const dom=new JSDOM(read('index.html'),{url:'https://upsaltavision.com.ar/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,
  beforeParse(w){w.scrollTo=()=>{};w.fetch=()=>{network++;throw Error('Unexpected network')};w.HTMLDialogElement.prototype.showModal=function(){this.open=true};w.HTMLDialogElement.prototype.close=function(){this.open=false};}});
const w=dom.window,d=w.document;
const click=(s,doc=d)=>{const el=doc.querySelector(s);assert.ok(el,s);el.click()};
const tick=()=>new Promise(resolve=>setTimeout(resolve,40));
function fixture(frame,html){const doc=frame.contentDocument;doc.open();doc.write(html);doc.close();frame.dispatchEvent(new w.Event('load'));return doc;}
(async()=>{
  assert.equal(d.documentElement.dataset.redSrc,'./explorar.html');
  assert.equal(d.querySelector('link[rel="manifest"]').getAttribute('href'),'/manifest.webmanifest');
  assert.ok(!fs.existsSync(path.join(site,'dashboard-preview')));
  click('.sidebar [data-page="localizador"]');
  const red=d.getElementById('site-module-red');assert.equal(red.src,'https://upsaltavision.com.ar/explorar.html');
  fixture(red,'<!doctype html><html><body class="firebase-locked"><div id="firebaseAccessGate">Acceso original</div><div id="dashboardApp"><select id="ramal"><option>C15</option></select></div></body></html>');
  click('.sidebar [data-page="clima"]');const climate=d.getElementById('site-module-clima');
  assert.equal(climate.src,'https://upsaltavision.com.ar/clima/index.html');
  console.log('PASS production routes, PWA manifest and exclusion of preview tools');
  const original=read('clima/index.html');
  const cd=fixture(climate,original.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
  await tick();
  const cw=climate.contentWindow;
  cw.fetch=()=>{network++;throw Error('Unexpected climate network')};
  cw.Element.prototype.scrollIntoView=()=>{};
  const NativeDate=cw.Date;
  cw.Date=class extends NativeDate{constructor(...args){super(...(args.length?args:['2026-10-05T12:00:00-03:00']))}static now(){return new NativeDate('2026-10-05T12:00:00-03:00').getTime()}};
  const records=[];
  for(let day=0;day<31;day++)for(const [id,localidad,ramal,mm] of [['cuevas','Las Cuevas','C14',1],['perico','Perico','C / C15',2]]){
    const date=new Date(Date.UTC(2026,8,4+day)).toISOString().slice(0,10);
    records.push({id:id+'_'+date,localidadId:id,localidad,ramal,provincia:'Fixture',fecha:date,precipitacionMm:mm,fuente:'open-meteo',tipo:'historico_modelado',estado:'consolidado'});
  }
  let reads=0;
  const db={collection(name){const filters=[];return {
    where(field,op,value){filters.push([field,op,value]);return this},
    async get(){reads++;return {docs:records.filter(r=>filters.every(([f,op,v])=>op==='>='?r[f]>=v:r[f]<=v)).map(r=>({id:r.id,data:()=>r}))}},
    doc(){return {async get(){reads++;return {exists:false}}}}
  }}};
  cw.firebase={app:()=>({firestore:()=>db}),firestore:()=>db};
  cw.eval(original.match(/function showTab\(name, trigger\)\{[\s\S]*?\n\}/)[0]);
  for(const name of ['precipitacion-historica.js','acumulados-ui.js','estadisticas-mensuales.js'])cw.eval(read('clima/acumulados/'+name));
  cd.dispatchEvent(new cw.Event('DOMContentLoaded'));await tick();
  click('[onclick="showTab(\'acumulados\')"]',cd);
  assert.ok(cd.getElementById('panel-acumulados').classList.contains('active'));
  assert.equal(cd.getElementById('rain-v5-max').textContent,'14,0 mm');
  for(const [period,expected] of [['24','2,0 mm'],['72','6,0 mm'],['31','62,0 mm']]){
    click('[data-rain-period="'+period+'"]',cd);assert.equal(cd.getElementById('rain-v5-max').textContent,expected);
  }
  console.log('PASS original Acumulados tab and four periods using isolated historical fixtures');
  const filter=cd.getElementById('rain-v5-ramal');filter.value='C14';filter.dispatchEvent(new cw.Event('change'));
  assert.equal(cd.getElementById('rain-v5-max').textContent,'31,0 mm');
  assert.equal(cd.getElementById('rain-v5-localidad').value,'cuevas');
  assert.equal(cd.querySelectorAll('#rain-v5-body tr').length,31);
  console.log('PASS original filters, locality selection, ranking and daily history');
  click('#rain-month-open',cd);await tick();
  assert.equal(cd.getElementById('rain-month-section').hidden,false);
  assert.equal(cd.getElementById('rain-month-select').value,'2026-09');
  assert.equal(cd.getElementById('rain-month-max').textContent,'54,0 mm');
  assert.ok(cd.getElementById('rain-month-daily').children.length);
  console.log('PASS monthly statistics and existing fallback when no persisted closing exists');
  for(const page of ['inicio','cruces','servicios','infraestructura','alertas','localizador','asistente','clima'])click('.sidebar [data-page="'+page+'"]');
  assert.equal(d.getElementById('site-module-clima'),climate);
  assert.equal(climate.contentDocument,cd);assert.equal(filter.value,'C14');
  assert.equal(cd.getElementById('rain-month-section').hidden,false);
  assert.ok(cd.querySelector('[data-rain-period="31"]').classList.contains('active'));
  assert.equal(d.getElementById('site-module-red'),red);
  assert.ok(red.contentDocument.body.classList.contains('firebase-locked'));
  assert.equal(network,0);assert.ok(reads>0);assert.deepEqual(errors,[]);
  console.log('PASS Acumulados state retained across all eight sections; original access gate retained; no external requests');
  w.close();
})().catch(e=>{console.error(e);w.close();process.exitCode=1});
