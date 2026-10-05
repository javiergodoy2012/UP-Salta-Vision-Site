/* Execute original UI/map code with real Leaflet in an offline DOM.
 * No external resources, Firebase, credentials, weather requests or live accounts.
 * SVG capability and element dimensions are test shims, not visual validation.
 */
const {JSDOM,VirtualConsole}=require('jsdom');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const read=name=>fs.readFileSync(path.join(__dirname,name),'utf8');
const errors=[],network=[],passed=[],windows=[];
const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
const plain=x=>JSON.parse(JSON.stringify(x));
const click=(doc,selector)=>{const el=doc.querySelector(selector);assert.ok(el,selector);el.click();};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function check(name,fn){await fn();passed.push(name);console.log('PASS',name);}
function guard(w){
  w.fetch=()=>{network.push('fetch');throw new Error('Network disabled in offline tests');};
  w.XMLHttpRequest=class{constructor(){network.push('xhr');throw new Error('Network disabled in offline tests');}};
  w.open=()=>{network.push('window.open');throw new Error('External navigation disabled');};
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.scrollTo=()=>{};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  w.SVGSVGElement.prototype.createSVGRect=()=>({});
}
function source(name){
  const dom=new JSDOM(read('../'+name));
  const scripts=[...dom.window.document.scripts].map(s=>({src:s.getAttribute('src'),id:s.id,text:s.textContent}));
  dom.window.document.querySelectorAll('script').forEach(s=>s.remove());
  const html=dom.serialize();dom.window.close();return {html,scripts};
}
const mapSource=source('index.html'),climateSource=source('clima/index.html');
const mapScripts=mapSource.scripts.filter(s=>!s.src&&!s.id&&!s.text.includes('navigator.serviceWorker')).map(s=>s.text).join('\n');
const climateScript=climateSource.scripts.find(s=>s.text.includes('const SECTORS =')).text;
const leaflet=fs.readFileSync(require.resolve('leaflet/dist/leaflet.js'),'utf8');
function loadMap(w){
  guard(w);const d=w.document;
  // Authorized fixture only. Original auth code is absent from this offline harness.
  d.body.classList.remove('firebase-locked');d.getElementById('firebaseAccessGate').hidden=true;
  const container=d.getElementById('map');
  Object.defineProperty(container,'clientWidth',{value:960,configurable:true});
  Object.defineProperty(container,'clientHeight',{value:560,configurable:true});
  w.eval(leaflet);
  for(const name of ['cruces-habilitados-data.js','cruces-habilitados.js','interferencias-data.js','interferencias.js'])w.eval(read('../'+name));
  w.eval(mapScripts+'\nwindow.__offlineMap={map,buscar,point:()=>lastPoint,mode:()=>currentMode};');
  return {w,d,state:w.__offlineMap};
}
function snapshotMap(module){
  const {d,state}=module;
  return plain({point:state.point(),coord:d.getElementById('coord').textContent,status:d.getElementById('status').textContent,
    crossing:d.getElementById('cruceHabilitado').textContent,interference:d.getElementById('interferenciasResultado').textContent,
    resultHidden:d.getElementById('resultado').hidden,href:d.getElementById('gmap').getAttribute('href')});
}
async function search(module,rail,pk){
  const select=module.d.getElementById('ramal');select.value=rail;select.dispatchEvent(new module.w.Event('change'));
  module.d.getElementById('km').value=pk;await module.state.buscar();
  assert.ok(!module.d.getElementById('status').textContent.startsWith('Error al cargar'),module.d.getElementById('status').textContent);
  return snapshotMap(module);
}
function loadClimate(w){
  guard(w);
  w.eval(climateScript+'\nwindow.__offlineClima={sectors:SECTORS,defaults:DEFAULT_THR,alerts:getAlerts,report:buildDailyReportRow,dates:reportForecastDates,setData:(id,data)=>weatherData[id]=data,weather:()=>weatherData};');
  // Deliberately do not invoke window.onload: it requests live weather and starts timers.
  w.onload=null;w.renderSectors();w.renderThresholds();w.renderContacts();w.renderLog();
  return {w,d:w.document,state:w.__offlineClima};
}
(async()=>{
  const baseMapDom=new JSDOM(mapSource.html,{url:'https://fixture.invalid/index.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});windows.push(baseMapDom.window);
  const baseClimaDom=new JSDOM(climateSource.html,{url:'https://fixture.invalid/clima/index.html',runScripts:'outside-only',pretendToBeVisual:true,virtualConsole:vc});windows.push(baseClimaDom.window);
  const shell=new JSDOM(read('site-vision-dashboard.html'),{url:'https://fixture.invalid/dashboard-preview/site-vision-dashboard.html',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse:guard});windows.push(shell.window);
  const parent=shell.window,doc=parent.document;
  await turn();
  const baseline=loadMap(baseMapDom.window),baseClimate=loadClimate(baseClimaDom.window);
  click(doc,'.sidebar [data-page="localizador"]');
  const redFrame=doc.getElementById('site-module-red');
  redFrame.contentDocument.open();redFrame.contentDocument.write(mapSource.html);redFrame.contentDocument.close();
  await turn();
  const red=loadMap(redFrame.contentWindow);redFrame.dispatchEvent(new parent.Event('load'));
  await check('Original Leaflet engine initializes all ramales and controls inside the persistent shell',()=>{
    assert.equal(red.w.L.version,'1.9.4');assert.equal(red.d.querySelectorAll('#ramal option').length,baseline.d.querySelectorAll('#ramal option').length);
    assert.ok(red.state.map instanceof red.w.L.Map);assert.equal(doc.getElementById('module-host').dataset.state,'ready');
  });
  await check('Real PK searches and crossing/interference output match the unchanged source',async()=>{
    for(const [rail,pk] of [['C','1147,547'],['C13','1132,132'],['C15','1400,400'],['C16','1290,000']])assert.deepEqual(await search(red,rail,pk),await search(baseline,rail,pk),rail+' '+pk);
    assert.match((await search(red,'C','1147,547')).crossing,/Cruce habilitado/);
  });
  await check('Invalid PK and unvalidated geometry keep the original source behavior',async()=>{
    for(const [rail,pk] of [['C','1088,000'],['C15','9999'],['C13','no-numero']])assert.deepEqual(await search(red,rail,pk),await search(baseline,rail,pk));
  });
  await check('Existing layers and original map modes remain operable under the skin',()=>{
    for(const module of [baseline,red]){
      for(const id of ['crucesActiva','interferenciasActiva']){const box=module.d.getElementById(id);box.checked=true;box.dispatchEvent(new module.w.Event('change'));assert.ok(box.checked);}
      for(const id of ['tabPersonal','tabSeguridad','tabClientes','tabDescarrilos','tabLocalizador'])click(module.d,'#'+id);
    }
    assert.equal(red.state.mode(),baseline.state.mode());
    assert.equal(red.state.map._layers?Object.keys(red.state.map._layers).length:0,Object.keys(baseline.state.map._layers).length);
  });
  click(doc,'.sidebar [data-page="clima"]');
  const climaFrame=doc.getElementById('site-module-clima');
  climaFrame.contentDocument.open();climaFrame.contentDocument.write(climateSource.html);climaFrame.contentDocument.close();await turn();
  const climate=loadClimate(climaFrame.contentWindow);climaFrame.dispatchEvent(new parent.Event('load'));
  await check('Original climate sectors and threshold evaluation match with and without the shell',()=>{
    assert.deepEqual(plain(climate.state.sectors),plain(baseClimate.state.sectors));
    assert.deepEqual(plain(climate.state.defaults),plain(baseClimate.state.defaults));
    for(const sector of climate.state.sectors){
      const threshold=climate.state.defaults[sector.id];
      for(const temperature of [threshold.cold-1,20,threshold.hot+1]){
        const fixture={temperature_2m:temperature,rain24h:threshold.rain+1,wind_speed_10m:threshold.wind+1};
        assert.deepEqual(plain(climate.state.alerts(fixture,sector.id)),plain(baseClimate.state.alerts(fixture,sector.id)));
      }
    }
    assert.equal(climate.d.querySelectorAll('.sector-card').length,climate.state.sectors.length);
  });
  await check('The original seven-day report preserves values, severity and semantic classes',()=>{
    for(const module of [baseClimate,climate]){
      const times=plain(module.state.dates());
      for(const sector of module.state.sectors)module.state.setData(sector.id,{observedAt:times[0]+'T12:00',daily:{time:times,tempMax:[27,28,30.9,31,35,40,26],tempMin:[15,15,15,15,15,15,15],rain:[3,5,0,0,0,0,0],gustMax:[90,70,10,10,10,10,10],rainProbability:[80,75,10,10,10,10,10]}});
      module.w.generateReport();
    }
    assert.equal(climate.d.getElementById('report-tbody').innerHTML,baseClimate.d.getElementById('report-tbody').innerHTML);
    assert.deepEqual(plain(climate.w._lastReportRows),plain(baseClimate.w._lastReportRows));
    assert.equal(climate.d.querySelectorAll('#report-head-row th').length,9);
    for(const name of ['reporte','umbrales','contactos','historial','clima']){climate.w.showTab(name);assert.ok(climate.d.getElementById('panel-'+name).classList.contains('active'));}
  });
  await check('Real Leaflet center, zoom, PK, layers and climate tab survive shell navigation',async()=>{
    await search(red,'C15','1400,400');
    red.state.map.setView([-24.3,-64.9],11,{animate:false});
    // Leaflet rounds the pixel origin during its original resize handler. Compare
    // the settled original and integrated cameras before testing route persistence.
    baseline.state.map.setView([-24.3,-64.9],11,{animate:false});
    baseline.w.dispatchEvent(new baseline.w.Event('resize'));
    red.w.dispatchEvent(new red.w.Event('resize'));
    await new Promise(resolve=>parent.setTimeout(resolve,150));
    assert.deepEqual(plain(red.state.map.getCenter()),plain(baseline.state.map.getCenter()));
    const center=plain(red.state.map.getCenter()),zoom=red.state.map.getZoom(),map=red.state.map,values=snapshotMap(red),weather=climate.state.weather();
    climate.w.showTab('reporte');climate.d.getElementById('report-observations').value='Fixture de prueba local';
    for(const page of ['inicio','cruces','servicios','infraestructura','alertas','localizador','clima'])click(doc,`.sidebar [data-page="${page}"]`);
    await new Promise(resolve=>parent.setTimeout(resolve,150));
    assert.equal(red.state.map,map);assert.deepEqual(plain(map.getCenter()),center);assert.equal(map.getZoom(),zoom);assert.deepEqual(snapshotMap(red),values);
    assert.ok(red.d.getElementById('crucesActiva').checked);assert.ok(red.d.getElementById('interferenciasActiva').checked);
    assert.equal(climate.state.weather(),weather);assert.ok(climate.d.getElementById('panel-reporte').classList.contains('active'));
    assert.equal(climate.d.getElementById('report-observations').value,'Fixture de prueba local');
  });
  await check('All operational checks finish without external requests or runtime errors',()=>{
    assert.deepEqual(network,[]);assert.deepEqual(errors,[]);
  });
  console.log(JSON.stringify({checks:passed.length,passed:passed.length,errors,networkRequests:network.length,scope:'Original code and Leaflet in offline DOM; no real browser layout, auth, tiles, weather, AI or production artifact'}));
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>windows.forEach(w=>w.close()));
