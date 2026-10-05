/* Isolated, read-only presentation. No Firebase, location, service worker or API calls. */
(() => {
  'use strict';
  const data = JSON.parse(document.getElementById('site-data').textContent);
  const $ = (selector) => document.querySelector(selector);
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fold = (value) => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const icon = (name) => `<i data-lucide="${name}" aria-hidden="true"></i>`;
  const number = (n) => new Intl.NumberFormat('es-AR').format(n);
  const pk = (n) => n == null ? 'Sin dato' : Number(n).toLocaleString('es-AR', {minimumFractionDigits:3, maximumFractionDigits:3});
  const date = (d) => d ? new Date(`${d}T12:00:00`).toLocaleDateString('es-AR', {day:'2-digit',month:'short',year:'numeric'}) : 'Sin fecha';
  const railOrder = ['C','C13','C14','C15','C16','C18','C25'];
  const rails = railOrder.filter((r) => data.routes[r]);
  const crossingRails = rails.filter((r) => data.crossings.some((x) => x.ramal === r));
  const counts = Object.fromEntries(rails.map((r) => [r, data.crossings.filter((x) => x.ramal === r).length]));
  const labels = {publico:'Público',particular:'Particular',a_nivel_pasivo:'A nivel · pasivo',a_nivel_barreras:'A nivel · barreras',alto_nivel:'A distinto nivel',subterraneo:'Subterránea',aereo:'Aérea',hidraulico:'Hidráulica',permiso:'Permiso',prefactibilidad:'Prefactibilidad',asesoramiento:'Asesoramiento',otros:'Otros',no_derivado:'No derivado'};
  const label = (value) => labels[value] || value || 'Sin dato';
  const pages = [
    ['inicio','Vista general','house','Resumen de la red'],
    ['localizador','Explorar la red','map-pinned','Ramales, capas y búsqueda kilométrica'],
    ['cruces','Cruces habilitados','railroad',`${data.crossings.length} registros del sitio`],
    ['servicios','Interferencias','cable',`${data.services.length} registros documentales`],
    ['infraestructura','Infraestructura','construction','Estaciones y referencias'],
    ['clima','Clima Alert','cloud-sun','Acceso al módulo meteorológico'],
    ['alertas','Alertas y novedades','bell','Histórico disponible en el sitio'],
    ['asistente','Asistente Site','messages-square','Consultas ferroviarias con el asistente actual'],
  ];
  const state = {page:'inicio', rail:'all', zoom:1, filter:'', ramal:'all', category:'all', pageIndex:0,redView:'module'};
  const mobileViewport=window.matchMedia?.('(max-width:760px)');
  const isMobile=()=>mobileViewport?mobileViewport.matches:window.innerWidth<=760;
  const pageSize = 8;
  const icons = () => lucide.createIcons({attrs:{'aria-hidden':'true'}});
  const external = (url, text, cls='btn') => `<a class="${cls}" href="${url}" target="_blank" rel="noopener noreferrer">${esc(text)} ${icon('arrow-up-right')}</a>`;
  const siteLink = (_text='Explorar la red', cls='btn') => button('localizador','Explorar la red','arrow-right',cls);
  const button = (page, text, glyph='arrow-right', cls='btn') => `<button class="${cls}" data-page="${page}">${esc(text)} ${icon(glyph)}</button>`;
  const heading = (title, subtitle, action='') => `<div class="page-top"><div><p class="eyebrow">UP SALTA <span>/</span> CENTRO DE INFORMACIÓN</p><h1 class="page-title">${title}</h1><p class="page-subtitle">${subtitle}</p></div>${action}</div>`;
  const stat = (title, value, note, glyph, color='') => `<article class="stat"><div class="stat-top"><span>${title}</span>${icon(glyph)}</div><div class="stat-number ${color}">${value}</div><div class="stat-bottom">${note}</div></article>`;
  const sourceNote = (text) => `<p class="source-note">${icon('database')} ${text} <button data-action="sources">Ver fuentes</button></p>`;
  const pairs = (items) => `<dl class="detail-pairs">${items.map(([k,v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v ?? 'Sin dato')}</dd></div>`).join('')}</dl>`;
  const options = (values, selected, allText='Todos') => `<option value="all">${allText}</option>` + values.map((v) => `<option value="${esc(v)}"${v === selected ? ' selected':''}>${esc(label(v))}</option>`).join('');

  function mapMarkup(large=false) {
    const chosen = state.rail === 'all' ? crossingRails : [state.rail];
    const bounds = chosen.map((r) => data.routes[r].bounds);
    const minX=Math.min(...bounds.map((b)=>b[0])), minY=Math.min(...bounds.map((b)=>b[1]));
    const maxX=Math.max(...bounds.map((b)=>b[2])), maxY=Math.max(...bounds.map((b)=>b[3]));
    const width=(maxX-minX+65)/state.zoom, height=(maxY-minY+65)/state.zoom;
    const x=(minX+maxX-width)/2, y=(minY+maxY-height)/2;
    const parts=chosen.map((r,i)=>{
      const route=data.routes[r];
      return `<path class="route-line${state.rail !== 'all' ? ' selected':''}" style="--route-color:var(--route-${r})" d="${route.path}"/><circle class="station-dot" cx="${route.start[0]}" cy="${route.start[1]}" r="2"/><circle class="station-dot" cx="${route.end[0]}" cy="${route.end[1]}" r="2"/><text class="route-label" x="${route.end[0]+5}" y="${route.end[1]-7}">${r}</text>`;
    }).join('');
    return `<div class="map-stage${large?' large':''}"><svg class="rail-map" viewBox="${x} ${y} ${width} ${height}" role="img" aria-label="Vista de referencia de los ramales ${chosen.join(', ')}. No es un localizador operativo.">${parts}</svg><div class="map-floating"><span class="map-label">${icon('route')} ${state.rail === 'all' ? 'Red con cruces registrados' : esc(data.routes[state.rail].nombre)}</span></div><div class="map-controls"><button data-action="zoom-in" aria-label="Acercar vista de red">${icon('plus')}</button><button data-action="zoom-out" aria-label="Alejar vista de red">${icon('minus')}</button><button data-action="zoom-reset" aria-label="Restablecer vista de red">${icon('maximize')}</button></div><span class="map-north">N ${icon('arrow-up')}</span><div class="map-caption">VISTA DE REFERENCIA · TRAZAS DEL REPOSITORIO</div></div><div class="map-legend">${chosen.map((r)=>`<button data-rail="${r}" aria-label="Ver ramal ${r}"><i style="background:var(--route-${r})"></i>${r}</button>`).join('')}<span class="legend-note">Sin estado operativo en vivo</span></div>`;
  }

  function overview() {
    state.rail='all'; state.zoom=1;
    return heading('Vista general','La información de UP Salta, en un solo lugar.',button('localizador','Explorar la red','map-pinned','btn btn-primary')) +
      `<div class="preview-note">${icon('eye')} <span>Vista previa de diseño</span><span class="preview-note-separator">·</span><span>Datos del sitio, sin conexión en vivo</span></div>
      <div class="stats-grid">
        ${stat('Cruces habilitados',number(data.crossings.length),`<span class="tiny-pill">${crossingRails.length} ramales</span> Base actual del sitio`,'railroad','mint')}
        ${stat('Interferencias',number(data.services.length),'Registros documentales','cable','purple')}
        ${stat('Estaciones y referencias',number(data.stations.length),`<span class="tiny-pill">${rails.length} ramales</span> Catálogo disponible`,'train-front')}
      </div>
      <div class="dashboard-grid">
        <div class="stack"><section class="panel"><div class="panel-header"><div><h2>Una mirada a la red</h2><p>Ramales con cruces registrados</p></div>${button('localizador','Explorar','arrow-up-right','btn btn-quiet')}</div><div id="network-view">${mapMarkup()}</div></section>
        <section class="quick-section"><div class="section-heading"><h2>Herramientas de consulta</h2><span>Tu espacio de trabajo</span></div><div class="module-grid">
          ${[['cruces','railroad','Cruces habilitados','Ramal, progresiva y tipo'],['servicios','cable','Interferencias','Permisos y documentación'],['infraestructura','construction','Infraestructura','Estaciones de la red']].map(([p,i,t,s])=>`<button class="module-card" data-page="${p}">${icon(i)}<strong>${t}</strong><small>${s}</small>${icon('arrow-up-right')}</button>`).join('')}
        </div></section></div>
        <div class="overview-side"><section class="panel"><div class="panel-header"><div><h2>Cruces por ramal</h2><p>Distribución de los ${data.crossings.length} registros</p></div>${icon('chart-no-axes-column-increasing')}</div><div class="distribution-list">${crossingRails.map((r)=>`<button class="distribution-row" data-crossing-rail="${r}"><span class="rail-symbol">${r}</span><span class="distribution-track"><span style="width:${counts[r]/Math.max(...Object.values(counts))*100}%;background:var(--route-${r})"></span></span><strong>${counts[r]}</strong>${icon('chevron-right')}</button>`).join('')}</div></section>
        <button class="weather-shortcut" data-page="clima"><span class="weather-shortcut-icon">${icon('cloud-sun')}</span><span class="eyebrow">CLIMA ALERT</span><strong>El contexto también importa.</strong><small>Pronóstico y alertas del módulo actual.</small><span class="weather-shortcut-link">Ir a Clima Alert ${icon('arrow-right')}</span></button>
        <div class="reference-note">${icon('layers-2')} <span>Una nueva presentación.<br><b>Las mismas fuentes del sitio.</b></span></div></div>
      </div>${sourceNote(`Base de consulta del repositorio · ${date(data.sourceDate)}.`)}`;
  }

  function referenceView() {
    const selected=state.rail==='all'?null:data.routes[state.rail];
    return heading('Explorar la red','Vista de referencia de los ramales del sitio.', '<button class="btn btn-primary" data-action="module-view">Mapa y herramientas '+icon('map-pinned')+'</button>')+
      `<div class="route-tabs" aria-label="Elegir ramal"><button data-rail="all" class="${!selected?'active':''}" aria-pressed="${!selected}">Vista general</button>${rails.map((r)=>`<button data-rail="${r}" class="${r===state.rail?'active':''}" aria-pressed="${r===state.rail}">${r}</button>`).join('')}</div>
      <div class="locator-grid"><section class="panel"><div class="panel-header"><div><h2>${selected?esc(selected.nombre):'Ramales con cruces registrados'}</h2><p>Vista geográfica de referencia</p></div><span class="badge">Solo lectura</span></div><div id="network-view">${mapMarkup(true)}</div></section><aside class="panel locator-summary"><p class="eyebrow">${selected?'RAMAL '+state.rail:'RED UP SALTA'}</p><h3>${selected?esc(selected.nombre):'Elegí un ramal'}</h3><p>Información disponible en la base del sitio.</p>${selected?pairs([['Cruces registrados',counts[state.rail]],['Estaciones y referencias',data.stations.filter((s)=>s.ramal===state.rail).length],['Interferencias vinculadas',data.services.filter((s)=>s.ramales.includes(state.rail)).length]]):pairs([['Ramales referenciados',rails.length],['Ramales con cruces',crossingRails.length],['Cruces registrados',data.crossings.length]])}<div class="muted-block">La búsqueda por PK, las capas y la ubicación están en la pestaña Mapa y herramientas.</div><button class="btn full-width" data-action="module-view">Mapa y herramientas ${icon('arrow-right')}</button>${selected?`<button class="btn btn-quiet full-width" data-crossing-rail="${state.rail}">Ver cruces de ${state.rail} ${icon('arrow-right')}</button>`:''}</aside></div>
      ${sourceNote('Referencia visual de la red. Las consultas por PK y las capas se encuentran en Mapa y herramientas.')}`;
  }

  function tableConfig() {
    if(state.page==='cruces') return {title:'Cruces habilitados',subtitle:'Consultá progresivas, tipología y ámbito de cada cruce.',data:data.crossings,kind:'crossing',cat:'tipo',catLabel:'Tipo de cruce',headers:['Ramal','PK','Calle / ruta','Tipo','Ámbito','Detalle'],search:(x)=>[x.ramal,x.pk,String(x.pk).replace('.',','),x.calle,x.ruta,label(x.tipo),label(x.ambito)].join(' '),row:(x,i)=>`<td><span class="rail-symbol">${esc(x.ramal)}</span></td><td class="numeric primary">${pk(x.pk)}</td><td>${esc(x.calle||x.ruta||'Sin referencia')}</td><td>${esc(label(x.tipo))}</td><td><span class="badge ${x.ambito==='publico'?'mint':''}">${label(x.ambito)}</span></td><td>${detailButton('crossing',i,`${x.ramal}, PK ${pk(x.pk)}`)}</td>`};
    if(state.page==='servicios') return {title:'Interferencias',subtitle:'Una consulta clara de la documentación disponible.',data:data.services,kind:'service',cat:'categoria',catLabel:'Conducción',headers:['Ramal','Localidad / referencia','PK','Categoría','Trámite','Detalle'],search:(x)=>[x.ramales.join(' '),x.localidad,x.calle,x.pk,x.solicitante,x.id,label(x.tramite),label(x.categoria)].join(' '),row:(x,i)=>`<td><span class="rail-symbol">${esc(x.ramales.join(' / ')||x.ramalOriginal)}</span></td><td class="primary">${esc(x.localidad||'Sin localidad')}<small class="cell-secondary">${esc(x.solicitante||x.calle||'Sin referencia')}</small></td><td class="numeric">${pk(x.pk)}</td><td>${esc(label(x.categoria))}</td><td><span class="badge">${esc(label(x.tramite))}</span></td><td>${detailButton('service',i,`interferencia ${x.id}`)}</td>`};
    if(state.page==='infraestructura') return {title:'Infraestructura',subtitle:'Estaciones y referencias ferroviarias de la base actual.',data:data.stations,kind:'station',headers:['Ramal','Estación / referencia','PK','Código','Detalle'],search:(x)=>[x.ramal,x.nombre,x.pk,x.codigo,x.referencia].join(' '),row:(x,i)=>`<td><span class="rail-symbol">${esc(x.ramal)}</span></td><td class="primary">${esc(x.nombre)}</td><td class="numeric">${pk(x.pk)}</td><td>${esc(x.codigo||'—')}</td><td>${detailButton('station',i,x.nombre)}</td>`};
    return {title:'Alertas y novedades',subtitle:'Consulta del histórico incorporado al sitio.',data:data.incidents,kind:'incident',headers:['Fecha','Ramal','PK','Evento','Boletín','Detalle'],search:(x)=>[x.ramal,x.pk,x.tipo,x.fecha,x.boletin,x.estacion_1,x.estacion_2].join(' '),row:(x,i)=>`<td class="numeric">${date(x.fecha)}</td><td><span class="rail-symbol">${esc(x.ramal)}</span></td><td class="numeric">${pk(x.pk)}</td><td class="primary">${esc(x.tipo)}</td><td>${esc(x.boletin)}</td><td>${detailButton('incident',i,`boletín ${x.boletin}`)}</td>`};
  }
  function detailButton(kind,index,name){return `<button class="row-button" data-detail="${kind}:${index}" aria-label="Ver detalle de ${esc(name)}">${icon('arrow-up-right')}</button>`;}
  function tablePage() {
    const c=tableConfig();
    return heading(c.title,c.subtitle,siteLink())+
      `<div class="section-tabs"><span class="selected">${state.page==='alertas'?'Histórico del sitio':'Base de consulta'} <b>${c.data.length}</b></span><span>Solo lectura</span></div>
      ${state.page==='servicios'?'<p class="inline-notice">El tipo de trámite describe la documentación. No indica el estado de ejecución de una obra.</p>':''}
      ${state.page==='alertas'?'<p class="inline-notice warning"><strong>Histórico documental.</strong> Estos registros no son alertas activas ni un estado de circulación en tiempo real.</p>':''}
      <div class="filter-bar"><div class="filter-field grow"><label for="table-query">Buscar en ${c.title.toLowerCase()}</label><div class="search-field">${icon('search')}<input id="table-query" class="input" value="${esc(state.filter)}" placeholder="Ramal, PK o referencia…" type="search" autocomplete="off"></div></div><div class="filter-field"><label for="table-ramal">Ramal</label><select class="input" id="table-ramal">${options(rails,state.ramal,'Todos los ramales')}</select></div>${c.cat?`<div class="filter-field"><label for="table-category">${c.catLabel}</label><select class="input" id="table-category">${options([...new Set(c.data.map((x)=>x[c.cat]).filter(Boolean))].sort(),state.category,'Todas las categorías')}</select></div>`:''}<button class="btn" data-action="clear-filters">${icon('rotate-ccw')} Limpiar</button></div>
      <div id="table-results" aria-live="polite"></div>${sourceNote(state.page==='cruces'?'269 registros de cruces-habilitados-data.js.':state.page==='servicios'?'90 registros de interferencias-data.js.':state.page==='infraestructura'?'Catálogo STATIONS del index.html completo.':'Histórico DESCARRILOS del index.html completo.')}`;
  }
  function renderTable() {
    const c=tableConfig();
    const query=fold(state.filter).trim();
    const filtered=c.data.map((x,i)=>({x,i})).filter(({x})=>(state.ramal==='all'||(x.ramales||[x.ramal]).includes(state.ramal))&&(!c.cat||state.category==='all'||x[c.cat]===state.category)&&(!query||fold(c.search(x)).includes(query)));
    const pageCount=Math.max(1,Math.ceil(filtered.length/pageSize));
    state.pageIndex=Math.min(state.pageIndex,pageCount-1);
    const start=state.pageIndex*pageSize;
    $('#table-results').innerHTML=`<div class="table-wrap" tabindex="0" role="region" aria-label="Tabla de ${c.title}. Desplazamiento horizontal disponible."><table><caption class="sr-only">${c.title}: ${filtered.length} resultados filtrados</caption><thead><tr>${c.headers.map((h)=>`<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${filtered.slice(start,start+pageSize).map(({x,i})=>`<tr>${c.row(x,i)}</tr>`).join('')||`<tr><td colspan="${c.headers.length}" class="empty-result">${icon('search-x')}<strong>No encontramos coincidencias</strong><span>Probá otra referencia o limpiá los filtros.</span><button class="btn" data-action="clear-filters">Limpiar filtros</button></td></tr>`}</tbody></table></div><div class="table-footer"><span>${filtered.length?start+1:0}–${Math.min(start+pageSize,filtered.length)} de <b>${filtered.length}</b> registros</span><div class="pagination"><button class="btn" data-action="prev-page" aria-label="Página anterior" ${state.pageIndex===0?'disabled':''}>${icon('chevron-left')}</button><span>${state.pageIndex+1} / ${pageCount}</span><button class="btn" data-action="next-page" aria-label="Página siguiente" ${state.pageIndex>=pageCount-1?'disabled':''}>${icon('chevron-right')}</button></div></div>`;
    icons();
  }

  function embeddedPage(page) {
    const info={localizador:['Explorar la red','La búsqueda kilométrica, las capas y el mapa, dentro de Site Visión.'],clima:['Clima Alert','Pronóstico, alertas y herramientas meteorológicas en el mismo espacio.'],asistente:['Asistente Site','El asistente ferroviario actual, con su contexto y sus reglas.']}[page];
    return heading(info[0],info[1],'<span class="small-tag">MÓDULO INTEGRADO</span>')+(page==='localizador'?'<div class="section-tabs module-tabs"><span class="selected">Mapa y herramientas</span><button class="btn btn-quiet" data-action="reference-view">Vista de referencia '+icon('route')+'</button></div>':'');
  }
  function locator(){return state.redView==='reference'?referenceView():embeddedPage('localizador');}
  function climate(){return embeddedPage('clima');}

  function render(focus=false) {
    $('#content').innerHTML=state.page==='inicio'?overview():state.page==='localizador'?locator():state.page==='clima'?climate():state.page==='asistente'?embeddedPage('asistente'):tablePage();
    document.querySelectorAll('.nav-item[data-page],.mobile-nav [data-page]').forEach((el)=>{
      const active=el.dataset.page===state.page; el.classList.toggle('active',active);
      if(active) el.setAttribute('aria-current','page'); else el.removeAttribute('aria-current');
    });
    $('#mobile-more').classList.toggle('active',['servicios','infraestructura','alertas','asistente'].includes(state.page));
    document.title=`${pages.find((p)=>p[0]===state.page)[1]} · Site Visión`;
    const embedded=state.page==='clima'||state.page==='asistente'||(state.page==='localizador'&&state.redView!=='reference');
    if(embedded)window.SiteVisionModules.show(state.page);else window.SiteVisionModules.hide();
    if($('#table-results')) renderTable();
    icons();
    if(focus){$('#content').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  }
  function navigate(page,ramal='all') {
    if(!pages.some((p)=>p[0]===page)) page='inicio';
    Object.assign(state,{page,filter:'',ramal,category:'all',pageIndex:0,rail:'all',zoom:1,redView:'module'});
    closeMenu();
    if($('#search-dialog').open) $('#search-dialog').close();
    if($('#detail-dialog').open) $('#detail-dialog').close();
    if(location.hash!==`#${page}`) history.pushState(null,'',`#${page}`);
    render(true);
  }
  function syncMenuAccess() {
    const mobile=isMobile(),open=mobile&&$('#sidebar').classList.contains('mobile-open');
    $('#sidebar').toggleAttribute('inert',mobile&&!open);
    if(mobile&&!open)$('#sidebar').setAttribute('aria-hidden','true');else $('#sidebar').removeAttribute('aria-hidden');
    document.querySelectorAll('.topbar,#content,#module-host,#assistant-button,.skip-link,.mobile-nav [data-page]').forEach(el=>el.toggleAttribute('inert',open));
  }
  function closeMenu(restoreFocus=false) {
    const wasOpen=$('#sidebar').classList.contains('mobile-open');
    $('#sidebar').classList.remove('mobile-open'); $('#sidebar-scrim').hidden=true;
    $('#mobile-more').setAttribute('aria-expanded','false');
    syncMenuAccess();
    if(restoreFocus&&wasOpen&&isMobile())$('#mobile-more').focus();
  }
  function resizeNavigation() {
    const sidebarHadFocus=$('#sidebar').contains(document.activeElement);
    if(!isMobile())closeMenu();else syncMenuAccess();
    if(isMobile()&&$('#sidebar').hasAttribute('inert')&&sidebarHadFocus)$('#mobile-more').focus();
  }
  function containMenuFocus(event) {
    if(event.key!=='Tab'||!isMobile()||!$('#sidebar').classList.contains('mobile-open'))return;
    const controls=[...$('#sidebar').querySelectorAll('button:not([disabled]),a[href]'),$('#mobile-more')];
    const first=controls[0],last=controls[controls.length-1],active=document.activeElement;
    if(!controls.includes(active)||(event.shiftKey&&active===first)||(!event.shiftKey&&active===last)){
      event.preventDefault();(event.shiftKey?last:first).focus();
    }
  }
  function modal(title,body,footer='',eyebrow='SITE VISIÓN') {
    closeMenu(true);
    $('#detail-content').innerHTML=`<header class="modal-header"><div><p class="eyebrow">${eyebrow}</p><h2 id="modal-title">${title}</h2></div><button class="icon-button" data-action="close-modal" aria-label="Cerrar detalle">${icon('x')}</button></header><div class="modal-body">${body}</div><footer class="modal-footer"><button class="btn" data-action="close-modal">Cerrar</button>${footer}</footer>`;
    $('#detail-dialog').setAttribute('aria-labelledby','modal-title'); icons();
    if(!$('#detail-dialog').open) $('#detail-dialog').showModal();
  }
  function detail(key) {
    const [kind,index]=key.split(':'); let x,title,items;
    if(kind==='crossing') {x=data.crossings[+index];title=`${x.ramal} · PK ${pk(x.pk)}`;items=[['Ramal',x.ramal],['Progresiva',pk(x.pk)],['Tipo',label(x.tipo)],['Ámbito',label(x.ambito)],['Calle',x.calle],['Ruta',x.ruta]];}
    if(kind==='service') {x=data.services[+index];title=`Interferencia ${x.id}`;items=[['Ramal',x.ramales.join(' / ')||x.ramalOriginal],['PK',pk(x.pk)],['Localidad',x.localidad],['Referencia',x.calle],['Solicitante',x.solicitante],['Conducción',x.conduccionOriginal],['Trámite',label(x.tramite)],['Disposición',x.disposicion],['Carpeta',x.referencia?.carpeta],['Observaciones',x.observaciones]];}
    if(kind==='station') {x=data.stations[+index];title=x.nombre;items=[['Ramal',x.ramal],['PK',pk(x.pk)],['Código',x.codigo],['Referencia original',x.referencia]];}
    if(kind==='incident') {x=data.incidents[+index];title=`Boletín ${x.boletin}`;items=[['Tipo',x.tipo],['Fecha',date(x.fecha)],['Ramal',x.ramal],['PK',pk(x.pk)],['Referencia 1',x.estacion_1],['Referencia 2',x.estacion_2],['Causa registrada',x.causa]];}
    if(!x)return;
    modal(esc(title),pairs(items)+`<p class="detail-footnote">Registro de la base del sitio. ${kind==='incident'?'Es un evento histórico; no informa un estado activo.':'Consulta de solo lectura.'}</p>`,siteLink('Abrir sitio actual'),'DETALLE DEL REGISTRO');
  }
  function sources() {
    modal('Las mismas fuentes, una nueva vista.',`<p>Esta versión presenta la información existente de UP Salta Visión para evaluar su organización y navegación.</p><div class="source-list">${[['Cruces habilitados','cruces-habilitados-data.js · '+data.crossings.length+' registros'],['Interferencias','interferencias-data.js · '+data.services.length+' registros'],['Red, estaciones y eventos','NETWORK, STATIONS y DESCARRILOS · index.html completo'],['Clima y asistente','Documentos originales dentro del shell; acceso y reglas vigentes']].map(([a,b])=>`<div><strong>${a}</strong><span>${b}</span></div>`).join('')}</div><p>Base: <code>${data.sourceCommit.slice(0,7)}</code> · ${date(data.sourceDate)}.<br>El logo corresponde a la versión actual del repositorio.</p>`,siteLink(),'ACERCA DE LA PREVIEW');
  }
  function searchResults() {
    const query=fold($('#command-input').value).trim();
    const modules=pages.filter((p)=>!query||fold(p.slice(1).join(' ')).includes(query));
    const records=query?data.crossings.map((x,i)=>({x,i})).filter(({x})=>fold(`${x.ramal} ${x.pk} ${String(x.pk).replace('.',',')} ${x.calle||''} ${x.ruta||''}`).includes(query)).slice(0,6):[];
    const stations=query?data.stations.map((x,i)=>({x,i})).filter(({x})=>fold(`${x.nombre} ${x.ramal} ${x.pk}`).includes(query)).slice(0,4):[];
    $('#command-results').innerHTML=(modules.length?'<div class="command-section">Módulos</div>':'')+modules.map(([p,t,i,s])=>`<button class="command-item" data-page="${p}">${icon(i)}<span>${t}<small>${s}</small></span>${icon('arrow-right')}</button>`).join('')+(records.length?'<div class="command-section">Cruces habilitados</div>':'')+records.map(({x,i})=>`<button class="command-item" data-search-detail="crossing:${i}">${icon('railroad')}<span>${x.ramal} · PK ${pk(x.pk)}<small>${esc(x.calle||x.ruta||label(x.tipo))}</small></span>${icon('arrow-up-right')}</button>`).join('')+(stations.length?'<div class="command-section">Estaciones</div>':'')+stations.map(({x,i})=>`<button class="command-item" data-search-detail="station:${i}">${icon('train-front')}<span>${esc(x.nombre)}<small>${x.ramal} · PK ${pk(x.pk)}</small></span>${icon('arrow-up-right')}</button>`).join('')+(!modules.length&&!records.length&&!stations.length?'<div class="empty-result">Sin resultados. Probá un ramal, PK o nombre de estación.</div>':'');
    icons();
  }
  function searchOpen(){closeMenu();$('#command-input').value='';searchResults();$('#search-dialog').showModal();$('#command-input').focus();}
  function setRail(rail){if(state.page!=='localizador')navigate('localizador');state.rail=rail;state.zoom=1;state.redView='reference';render();}

  document.addEventListener('click',(event)=>{
    const b=event.target.closest('button'); if(!b)return;
    if(b.dataset.page){navigate(b.dataset.page);return;}
    if(b.dataset.rail){setRail(b.dataset.rail);return;}
    if(b.dataset.crossingRail){navigate('cruces',b.dataset.crossingRail);return;}
    if(b.dataset.detail){detail(b.dataset.detail);return;}
    if(b.dataset.searchDetail){$('#search-dialog').close();detail(b.dataset.searchDetail);return;}
    if(b.id==='open-search'){searchOpen();return;}
    if(b.id==='theme-toggle'){
      const light=$('#app').dataset.theme!=='light';$('#app').dataset.theme=light?'light':'dark';
      b.setAttribute('aria-label',`Cambiar a modo ${light?'oscuro':'claro'}`);b.innerHTML=icon(light?'sun':'moon');window.SiteVisionModules.syncTheme();icons();return;
    }
    if(b.id==='mobile-more'){
      if(!isMobile())return;
      const open=!$('#sidebar').classList.contains('mobile-open');
      $('#sidebar').classList.toggle('mobile-open',open);$('#sidebar-scrim').hidden=!open;
      b.setAttribute('aria-expanded',String(open));syncMenuAccess();if(open)$('#sidebar .nav-item').focus();return;
    }
    if(b.id==='sidebar-scrim'){closeMenu(true);return;}
    if(['about-button','profile-button'].includes(b.id)||b.dataset.action==='sources'){sources();return;}
    if(b.id==='assistant-button'){navigate('asistente');return;}

    const action=b.dataset.action;
    if(action==='reference-view'){if(state.page!=='localizador')navigate('localizador');state.redView='reference';render();return;}
    if(action==='module-view'){state.redView='module';render();return;}
    if(action==='close-modal'){$('#detail-dialog').close();return;}
    if(action==='clear-filters'){Object.assign(state,{filter:'',ramal:'all',category:'all',pageIndex:0});render();return;}
    if(action==='prev-page'||action==='next-page'){state.pageIndex+=action==='next-page'?1:-1;renderTable();return;}
    if(action?.startsWith('zoom-')){state.zoom=action==='zoom-reset'?1:Math.max(.7,Math.min(3,state.zoom*(action==='zoom-in'?1.25:.8)));$('#network-view').innerHTML=mapMarkup(state.page==='localizador');icons();}
  });
  document.addEventListener('input',(event)=>{
    if(event.target.id==='table-query'){state.filter=event.target.value;state.pageIndex=0;renderTable();}
    if(event.target.id==='command-input')searchResults();
  });
  document.addEventListener('change',(event)=>{
    if(event.target.id==='table-ramal')state.ramal=event.target.value;
    else if(event.target.id==='table-category')state.category=event.target.value; else return;
    state.pageIndex=0;renderTable();
  });
  document.addEventListener('keydown',(event)=>{
    containMenuFocus(event);
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){
      event.preventDefault();if(!$('#search-dialog').open&&!$('#detail-dialog').open)searchOpen();
    }
    if(event.key==='Escape')closeMenu(true);
  });
  $('.skip-link').addEventListener('click',(event)=>{event.preventDefault();$('#content').focus();});
  if(mobileViewport)mobileViewport.addEventListener('change',resizeNavigation);
  else window.addEventListener('resize',resizeNavigation);
  window.addEventListener('site-shell:navigate',(event)=>navigate(event.detail?.page));
  window.addEventListener('site-shell:search',()=>{if(!$('#search-dialog').open&&!$('#detail-dialog').open)searchOpen();});
  window.addEventListener('hashchange',()=>navigate(location.hash.slice(1)));
  $('#ticker').innerHTML=crossingRails.map((r)=>`<span><b>${r}</b> ${counts[r]} cruces</span>`).join('');
  document.querySelector('.nav-item[data-page="alertas"] span').textContent='Alertas y novedades';
  navigate(location.hash.slice(1)||'inicio');
})();
