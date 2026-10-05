/* Functional DOM checks. This is not a browser rendering or device test. */
const {JSDOM, VirtualConsole} = require('jsdom');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const html = fs.readFileSync(path.join(__dirname, 'site-vision-dashboard.html'), 'utf8');
const errors=[];
const mediaChanges=[];
const consoleCapture=new VirtualConsole();
consoleCapture.on('jsdomError', (error)=>errors.push(error.message));
const dom=new JSDOM(html, {
  url:'https://preview.example.invalid/dashboard-preview/site-vision-dashboard.html',
  runScripts:'dangerously', virtualConsole:consoleCapture,
  beforeParse(window){
    window.scrollTo=()=>{};
    window.matchMedia=()=>({get matches(){return window.innerWidth<=760;},addEventListener(type,fn){if(type==='change')mediaChanges.push(fn);}});
    window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
    window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  },
});
const {window}=dom, doc=window.document;
const click=(selector)=>{const el=doc.querySelector(selector);assert.ok(el,`Missing ${selector}`);el.click();};
const select=(selector,value)=>{const el=doc.querySelector(selector);el.value=value;el.dispatchEvent(new window.Event('change',{bubbles:true}));};
const input=(selector,value)=>{const el=doc.querySelector(selector);el.value=value;el.dispatchEvent(new window.Event('input',{bubbles:true}));};
const text=(selector)=>doc.querySelector(selector).textContent;
const viewport=(width)=>{window.innerWidth=width;mediaChanges.forEach(fn=>fn());};
const key=(name,shiftKey=false)=>doc.dispatchEvent(new window.KeyboardEvent('keydown',{key:name,shiftKey,bubbles:true,cancelable:true}));
const tests=[];
function check(name,fn){fn();tests.push(name);console.log('PASS',name);}
const embedded=JSON.parse(doc.getElementById('site-data').textContent);

check('Exact source arrays and source hashes',()=>{
  for(const [key,file] of [['crossings','cruces-habilitados-data.js'],['services','interferencias-data.js']]){
    const source=fs.readFileSync(path.join(__dirname,'..',file),'utf8');
    assert.deepEqual(embedded[key],JSON.parse(source.slice(source.indexOf('['),source.lastIndexOf(']')+1)));
  }
  for(const [file,hash] of Object.entries(embedded.sourceHashes)){
    assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'..',file))).digest('hex'),hash,file);
  }
  assert.equal(Object.values(embedded.routes).reduce((sum,route)=>sum+route.vertices,0),196641);
  for(const route of Object.values(embedded.routes)) assert.equal(route.path.split('L').length,route.vertices);
});
check('Overview renders actual dataset totals',()=>{
  assert.equal(text('h1'),'Vista general');
  assert.deepEqual([...doc.querySelectorAll('.stat-number')].map((el)=>el.textContent),['269','90','135']);
  assert.equal(doc.querySelectorAll('.distribution-row').length,6);
  assert.equal(doc.querySelectorAll('.route-line').length,6);
});
check('Ramal shortcut filters the real 90 C15 crossings',()=>{
  click('[data-crossing-rail="C15"]');
  assert.equal(text('h1'),'Cruces habilitados');
  assert.equal(doc.querySelector('#table-ramal').value,'C15');
  assert.match(text('.table-footer'),/90 registros/);
  assert.equal(doc.querySelectorAll('tbody tr').length,8);
});
check('Pagination preserves the source record in the detail dialog',()=>{
  click('[data-action="next-page"]');
  assert.match(text('.table-footer'),/9–16/);
  const key=doc.querySelector('[data-detail]').dataset.detail;
  const record=embedded.crossings[Number(key.split(':')[1])];
  click('[data-detail]');
  assert.ok(doc.querySelector('#detail-dialog').open);
  assert.match(text('#modal-title'),new RegExp(record.ramal));
  assert.ok(text('#detail-content').includes(record.pk.toLocaleString('es-AR',{minimumFractionDigits:3,maximumFractionDigits:3})));
  click('[data-action="close-modal"]');
});
check('Search, combined filters and empty-state recovery',()=>{
  click('[data-action="clear-filters"]');
  select('#table-ramal','C14');
  select('#table-category','a_nivel_pasivo');
  const count=embedded.crossings.filter(x=>x.ramal==='C14'&&x.tipo==='a_nivel_pasivo').length;
  assert.ok(text('.table-footer').includes(count+' registros'));
  input('#table-query','no-existe-esta-referencia');
  assert.ok(text('tbody').includes('No encontramos coincidencias'));
  click('[data-action="clear-filters"]');
  assert.ok(text('.table-footer').includes('269 registros'));
  input('#table-query','981,125');
  assert.ok(text('.table-footer').includes('1 registros'));
});
check('Interferences filter by their actual linked ramal',()=>{
  click('.sidebar [data-page="servicios"]');
  select('#table-ramal','C15');
  const expected=embedded.services.filter(x=>x.ramales.includes('C15')).length;
  assert.ok(text('.table-footer').includes(expected+' registros'));
  click('[data-detail]');
  assert.ok(text('#detail-content').includes('Solicitante'));
  click('[data-action="close-modal"]');
});
check('Station search and historical-event labeling',()=>{
  click('.sidebar [data-page="infraestructura"]');
  input('#table-query','Schneidewind');
  assert.ok(text('tbody').includes('Schneidewind'));
  click('.sidebar [data-page="alertas"]');
  assert.ok(text('.table-footer').includes('24 registros'));
  assert.ok(text('.inline-notice').includes('no son alertas activas'));
});
check('Climate and assistant use the persistent internal module host',()=>{
  click('.sidebar [data-page="clima"]');
  assert.equal(text('h1'),'Clima Alert');
  assert.ok(!doc.querySelector('#module-host').hidden);
  assert.equal(doc.querySelector('#site-module-clima').getAttribute('src'),'https://preview.example.invalid/clima/index.html');
  click('#assistant-button');
  assert.equal(text('h1'),'Asistente Site');
  assert.ok(doc.querySelector('#site-module-red'));
  assert.equal(doc.querySelector('#site-module-clima').hidden,true);
});
check('Network ramal selection and view zoom work independently',()=>{
  click('.sidebar [data-page="localizador"]');
  click('[data-action="reference-view"]');
  click('.route-tabs [data-rail="C25"]');
  assert.ok(text('.locator-summary').includes('Embarcación'));
  assert.equal(doc.querySelectorAll('.route-line').length,1);
  const original=doc.querySelector('.rail-map').getAttribute('viewBox');
  click('[data-action="zoom-in"]');
  assert.notEqual(doc.querySelector('.rail-map').getAttribute('viewBox'),original);
  click('[data-action="zoom-reset"]');
  assert.equal(doc.querySelector('.rail-map').getAttribute('viewBox'),original);
});
check('Global search opens a correct crossing detail',()=>{
  click('#open-search');input('#command-input','981.125');
  assert.ok(text('#command-results').includes('981,125'));
  click('[data-search-detail]');
  assert.ok(!doc.querySelector('#search-dialog').open);
  assert.ok(doc.querySelector('#detail-dialog').open);
  assert.ok(text('#modal-title').includes('981,125'));
  click('[data-action="close-modal"]');
});
check('Theme and mobile menu state respond without backend calls',()=>{
  click('#theme-toggle'); assert.equal(doc.querySelector('#app').dataset.theme,'light');
  click('#theme-toggle'); assert.equal(doc.querySelector('#app').dataset.theme,'dark');
  viewport(390);click('#mobile-more');assert.equal(doc.querySelector('#mobile-more').getAttribute('aria-expanded'),'true');
  click('.sidebar [data-page="servicios"]');assert.equal(doc.querySelector('#mobile-more').getAttribute('aria-expanded'),'false');
  assert.ok(doc.querySelector('#sidebar-scrim').hidden);
});
check('Closed mobile navigation is inert; opening it excludes the background without replacing modules',()=>{
  assert.ok(doc.querySelector('#sidebar').hasAttribute('inert'));
  assert.equal(doc.querySelector('#sidebar').getAttribute('aria-hidden'),'true');
  assert.ok(!doc.querySelector('#content').hasAttribute('inert'));
  const red=doc.querySelector('#site-module-red'),clima=doc.querySelector('#site-module-clima');
  click('#mobile-more');
  assert.ok(!doc.querySelector('#sidebar').hasAttribute('inert'));
  for(const selector of ['.topbar','#content','#module-host','#assistant-button','.skip-link','.mobile-nav [data-page]'])assert.ok(doc.querySelector(selector).hasAttribute('inert'),selector);
  assert.equal(doc.querySelector('#site-module-red'),red);assert.equal(doc.querySelector('#site-module-clima'),clima);
});
check('Mobile keyboard focus stays in the menu and Escape or a dialog releases it',()=>{
  const first=doc.querySelector('#sidebar .nav-item'),more=doc.querySelector('#mobile-more');
  assert.equal(doc.activeElement,first);
  key('Tab',true);assert.equal(doc.activeElement,more);
  key('Tab');assert.equal(doc.activeElement,first);
  key('Escape');assert.equal(doc.activeElement,more);
  assert.equal(more.getAttribute('aria-expanded'),'false');
  assert.ok(!doc.querySelector('#module-host').hasAttribute('inert'));
  click('#mobile-more');click('#about-button');
  assert.ok(doc.querySelector('#detail-dialog').open);
  assert.equal(more.getAttribute('aria-expanded'),'false');
  assert.ok(!doc.querySelector('#content').hasAttribute('inert'));
  click('[data-action="close-modal"]');
});
check('Crossing the mobile breakpoint restores desktop navigation and prevents hidden focus',()=>{
  click('#mobile-more');viewport(820);
  assert.equal(doc.querySelector('#mobile-more').getAttribute('aria-expanded'),'false');
  assert.ok(doc.querySelector('#sidebar-scrim').hidden);
  assert.ok(!doc.querySelector('#sidebar').hasAttribute('inert'));
  assert.ok(!doc.querySelector('#sidebar').hasAttribute('aria-hidden'));
  doc.querySelector('#sidebar .nav-item').focus();viewport(390);
  assert.equal(doc.activeElement,doc.querySelector('#mobile-more'));
  assert.ok(doc.querySelector('#sidebar').hasAttribute('inert'));
  viewport(1366);
});
check('Skip-to-content preserves the current section, route and module instance',()=>{
  click('.sidebar [data-page="localizador"]');
  const hash=window.location.hash,red=doc.querySelector('#site-module-red');
  const event=new window.MouseEvent('click',{bubbles:true,cancelable:true});
  doc.querySelector('.skip-link').dispatchEvent(event);
  assert.ok(event.defaultPrevented,'The native #content navigation must not change the active route');
  assert.equal(window.location.hash,hash);
  assert.equal(text('h1'),'Explorar la red');
  assert.equal(doc.activeElement,doc.querySelector('#content'));
  assert.equal(doc.querySelector('#site-module-red'),red);
});
check('Every preview page has a single heading and no unresolved template markers',()=>{
  for(const page of ['inicio','localizador','cruces','servicios','infraestructura','clima','alertas','asistente']){
    click(`.sidebar [data-page="${page}"]`);
    assert.equal(doc.querySelectorAll('h1').length,1,page);
    assert.equal(doc.querySelectorAll('.sidebar [aria-current="page"]').length,1,page);
  }
  assert.ok(!/__(APP|DATA|STYLE|FONT_CSS|LUCIDE|LOGO|MODULE_SKIN|MODULE_HOST|SHARED_THEME)__/.test(html));
  assert.deepEqual(errors,[]);
});
console.log(JSON.stringify({checks:tests.length,passed:tests.length,errors,scope:'DOM only; no browser layout or visual validation'}));
dom.window.close();
