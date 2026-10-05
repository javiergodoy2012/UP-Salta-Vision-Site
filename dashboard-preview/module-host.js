/* Presentation adapter only. The original modules own all operational behavior. */
(() => {
  'use strict';
  const frames=new Map();
  const root=document.getElementById('module-host');
  const ports=document.getElementById('module-ports');
  const feedback=document.getElementById('module-feedback');
  const description=document.getElementById('module-description');
  const retry=document.getElementById('module-retry');
  const fallback=document.getElementById('module-fallback');
  let current=null, currentPage=null;
  const route=(page)=>window.dispatchEvent(new CustomEvent('site-shell:navigate',{detail:{page}}));
  const theme=()=>document.getElementById('app').dataset.theme;
  const names={red:'Explorar la red',clima:'Clima Alert'};
  const paths={red:document.documentElement.dataset.redSrc||'../index.html',
    clima:document.documentElement.dataset.climaSrc||'../clima/index.html'};

  function status(kind,title,detail='') {
    root.dataset.state=kind;
    feedback.textContent=title;
    description.textContent=detail;
    retry.hidden=!['error','slow'].includes(kind);
    fallback.hidden=kind!=='local-file';
  }
  function report(record,kind,title,detail='') {
    record.feedback=[kind,title,detail];
    if(kind==='error')record.frame.setAttribute('aria-busy','false');
    if(current===record.key&&!root.hidden)status(...record.feedback);
  }
  function navigateLink(event, key) {
    if(event.defaultPrevented||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const target=event.target.closest('button,a');
    if(!target)return;
    let page=null;
    if(key==='red'&&target.id==='tabClimaAlert')page='clima';
    if(target.tagName==='A') {
      let url;try{url=new URL(target.getAttribute('href'),target.ownerDocument.baseURI);}catch{return;}
      const ours=url.origin===location.origin||url.hostname==='upsaltavision.com.ar';
      if(ours&&/^\/clima(?:\/|\/index\.html)?$/.test(url.pathname))page='clima';
      if(ours&&/^\/(?:index\.html)?$/.test(url.pathname))page='localizador';
    }
    if(page){event.preventDefault();event.stopImmediatePropagation();route(page);}
  }
  function inspect(record) {
    if(current!==record.key||root.hidden)return;
    const doc=record.doc;if(!doc)return;
    const locked=record.key==='red'&&doc.body.classList.contains('firebase-locked');
    if(locked){
      status('access','Acceso del sitio','Se conserva el ingreso, la aprobación y la revalidación actuales.');
      return;
    }
    if(record.key==='red'){
      if(record.pendingAssistant){
        const launcher=doc.getElementById('sv-assistant-launcher');
        if(launcher){record.pendingAssistant=false;if(!doc.getElementById('sv-assistant-panel')?.classList.contains('open'))launcher.click();}
      }
      const open=doc.getElementById('sv-assistant-panel')?.classList.contains('open');
      if(currentPage==='asistente'&&record.assistantWasOpen&&!open){record.assistantWasOpen=false;route('localizador');return;}
      if(currentPage==='asistente'&&open)record.assistantWasOpen=true;
      if(!doc.querySelector('#ramal option')){
        status('slow','El mapa todavía no terminó de iniciar','Revisá la conexión y las dependencias del módulo. No se sustituyen resultados.');return;
      }
    }
    status('ready',currentPage==='asistente'?'Asistente Site integrado':names[record.key]+' integrado','Módulo original dentro de Site Visión.');
  }
  function decorate(record) {
    const doc=record.frame.contentDocument;
    if(!doc||!doc.body)throw new Error('Documento no disponible');
    if(record.key==='red'&&!doc.getElementById('dashboardApp'))throw new Error('No se encontró el documento completo del mapa');
    if(record.key==='clima'&&!doc.getElementById('panel-clima'))throw new Error('No se encontró el documento de Clima Alert');
    record.doc=doc;
    doc.documentElement.dataset.svModule=record.key;
    doc.documentElement.dataset.theme=theme();
    doc.documentElement.dataset.svView=currentPage==='asistente'&&record.key==='red'?'asistente':'module';
    for(const [id,source] of [['sv-fonts','site-fonts'],['sv-theme','site-shared-theme'],['sv-skin','site-module-skin']]){
      if(!doc.getElementById(id)){
        const style=doc.createElement('style');style.id=id;style.textContent=document.getElementById(source).textContent;doc.head.appendChild(style);
      }
    }
    const originalLabel=doc.querySelector('#tabLocalizador .module-name');
    if(originalLabel)originalLabel.textContent='Explorar la red';
    if(record.key==='clima')for(const link of doc.querySelectorAll('a[href="https://upsaltavision.com.ar/"]'))link.textContent='Explorar la red';
    doc.addEventListener('click',(event)=>navigateLink(event,record.key),true);
    doc.addEventListener('keydown',(event)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'){event.preventDefault();window.dispatchEvent(new CustomEvent('site-shell:search'));}});
    let scheduled=false;
    record.observer?.disconnect();
    record.observer=new MutationObserver(()=>{
      if(scheduled)return;scheduled=true;
      requestAnimationFrame(()=>{scheduled=false;inspect(record);});
    });
    record.observer.observe(doc.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','hidden']});
    record.loaded=true;
    record.frame.setAttribute('aria-busy','false');
    clearTimeout(record.timer);
    inspect(record);
    record.frame.contentWindow.dispatchEvent(new Event('resize'));
  }
  function create(key) {
    const frame=document.createElement('iframe');
    frame.id='site-module-'+key;frame.className='operational-frame';frame.title=names[key]+' · módulo original';
    frame.setAttribute('aria-busy','true');
    // No sandbox permission overrides: preserve the same-origin module's existing environment.
    const record={key,frame,loaded:false,doc:null,pendingAssistant:false,assistantWasOpen:false,
      feedback:['loading','Cargando '+names[key]+'…','Se conserva el documento original y su acceso.']};
    frame.addEventListener('load',()=>{
      try{decorate(record);}catch(error){clearTimeout(record.timer);report(record,'error','No se pudo integrar el módulo',error.message+'. Abrí el paquete completo desde su servidor local.');}
    });
    frame.addEventListener('error',()=>{clearTimeout(record.timer);report(record,'error','No se pudo cargar el módulo','Revisá el servidor local y la conexión.');});
    frame.src=new URL(paths[key],location.href).href;
    frames.set(key,record);ports.appendChild(frame);
    record.timer=setTimeout(()=>{if(!record.loaded)report(record,'slow','El módulo continúa cargando','Podés esperar o recargar este módulo.');},15000);
    return record;
  }
  function show(page) {
    const key=page==='clima'?'clima':'red';
    current=key;currentPage=page;root.hidden=false;
    document.getElementById('content').classList.add('contains-module');
    for(const record of frames.values())record.frame.hidden=record.key!==key;
    if(!['http:','https:'].includes(location.protocol)){
      status('local-file','Preview local de la nueva estructura','Para cargar los módulos completos conservando sus rutas, abrí el paquete integrado con el servidor local incluido.');return;
    }
    let record=frames.get(key);
    if(!record){status('loading','Cargando '+names[key]+'…','Se conserva el documento original y su acceso.');record=create(key);}
    record.frame.hidden=false;
    record.pendingAssistant=page==='asistente';record.assistantWasOpen=false;
    if(record.doc){
      const leavingAssistant=record.doc.documentElement.dataset.svView==='asistente'&&page!=='asistente';
      record.doc.documentElement.dataset.theme=theme();record.doc.documentElement.dataset.svView=page==='asistente'?'asistente':'module';
      if(leavingAssistant&&record.doc.getElementById('sv-assistant-panel')?.classList.contains('open'))record.doc.querySelector('.sv-assistant-close')?.click();
    }
    if(record.loaded)inspect(record);else status(...record.feedback);
    if(record.loaded)requestAnimationFrame(()=>record.frame.contentWindow.dispatchEvent(new Event('resize')));
  }
  function hide(){root.hidden=true;current=null;currentPage=null;for(const r of frames.values())r.frame.hidden=true;document.getElementById('content').classList.remove('contains-module');}
  function syncTheme(){for(const r of frames.values())if(r.doc)r.doc.documentElement.dataset.theme=theme();}
  retry.addEventListener('click',()=>{
    const record=frames.get(current);if(!record)return;
    report(record,'loading','Recargando '+names[current]+'…','Sólo se reinicia este módulo.');record.loaded=false;record.doc=null;record.observer?.disconnect();
    record.frame.setAttribute('aria-busy','true');
    record.pendingAssistant=currentPage==='asistente';record.assistantWasOpen=false;
    clearTimeout(record.timer);record.timer=setTimeout(()=>{if(!record.loaded)report(record,'slow','El módulo continúa cargando','Podés esperar o recargar este módulo.');},15000);
    record.frame.src=new URL(paths[current],location.href).href;
  });
  window.SiteVisionModules=Object.freeze({show,hide,syncTheme});
})();
