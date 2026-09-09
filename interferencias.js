/* Registros de trámites: no acreditan ejecución ni servicio activo. */
(function(root){
 'use strict';
 const records=root.INTERFERENCIAS_UP_SALTA||[];
 const labels={aereo:'Aéreo',subterraneo:'Subterráneo',hidraulico:'Hidráulico',sin_clasificar:'Sin clasificación suficiente'};
 const state={soloPermisos:true,filtro:'todos',activa:false,consulta:null};
 let adapter,layer;
 const finite=Number.isFinite;
 const fmt=v=>v.toFixed(3).replace('.',',');
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const present=v=>v!==null&&v!==undefined&&v!=='';
 const range=r=>finite(r.pkDesde)&&finite(r.pkHasta)?[Math.min(r.pkDesde,r.pkHasta),Math.max(r.pkDesde,r.pkHasta)]:null;
 const special=r=>r.id===937&&/Taca Taca/i.test(r.denominacionObra||'');
 function filtered(options=state){return records.filter(r=>(!options.soloPermisos||r.tramite==='permiso')&&(!options.filtro||options.filtro==='todos'||(options.filtro==='paralelos'?['paralelo','cruzante y paralelo'].includes(r.disposicion):r.categoria===options.filtro)));}
 function pinPK(r){if(special(r))return null;if(finite(r.pk))return r.pk;const t=range(r);return t?(t[0]+t[1])/2:null;}
 function distance(r,pk){
  const t=range(r);
  const target=t?Math.max(t[0],Math.min(t[1],pk)):finite(r.pk)?r.pk:null;
  return target===null?null:{distanciaM:Math.abs(target-pk)*1000,direccion:target>pk?'ascendente':target<pk?'descendente':null};
 }
 function masProximas(ramal,pk,options=state){
  if(!finite(pk))return [];
  const candidates=filtered(options).filter(r=>r.ramales.includes(ramal)).map(record=>({record,...distance(record,pk)})).filter(x=>finite(x.distanciaM));
  if(!candidates.length)return [];
  const min=Math.min(...candidates.map(x=>x.distanciaM));
  return candidates.filter(x=>Math.abs(x.distanciaM-min)<1e-6).sort((a,b)=>a.record.id-b.record.id);
 }
 function location(r){const t=range(r);return [finite(r.pk)?`PK ${fmt(r.pk)}`:null,t?`Tramo PK ${fmt(r.pkDesde)} a ${fmt(r.pkHasta)}`:null,!finite(r.pk)&&!t?(finite(r.pkDesde)?`Desde PK ${fmt(r.pkDesde)} · extremo final no informado`:finite(r.pkHasta)?`Hasta PK ${fmt(r.pkHasta)} · extremo inicial no informado`:'Sin PK suficiente'):null].filter(Boolean).join(' · ');}
 function row(label,value){return present(value)?`<div style="margin:4px 0"><b>${esc(label)}:</b> ${esc(value)}</div>`:'';}
 function ficha(r){
  const technical=Object.entries({conductor:'Conductor',camisa:'Camisa',unidad:'Unidad',valor:'Valor',tapada:'Tapada',altura:'H / altura',angulo:'Ángulo',angulo2:'Ángulo 2',ductos:'Ductos',otrasCaracteristicas:'Otras características'}).map(([k,l])=>row(l,r.tecnico[k])).join('');
  const refs=Object.entries({carpeta:'Carpeta',convenio:'Convenio',carpetaGAL:'Carpeta GAL',cajaArchivo:'Caja de archivo'}).map(([k,l])=>row(l,r.referencia[k])).join('');
  return `<article style="overflow-wrap:anywhere;line-height:1.45"><strong>Interferencia / Servicio</strong><div>Registro de trámite · ${esc(r.id)}</div><div>Ramal ${esc(r.ramalOriginal)} · ${esc(location(r))}</div>${!finite(r.pk)&&range(r)&&!special(r)?'<div><em>Pin representativo del tramo</em></div>':''}${special(r)?'<div>Referencia de varios cruces; sin PK individuales. Sin pin.</div>':''}${row('Categoría',labels[r.categoria])}${row('Conducción',r.conduccionOriginal)}${row('Disposición',r.disposicion||'No informado')}${row('Trámite',r.tramite)}${row('Localidad',r.localidad)}${row('Provincia',r.provincia)}${row('Calle coincidente',r.calle)}${row('Solicitante',r.solicitante)}${row('Contratista',r.contratista)}${row('Denominación de obra',r.denominacionObra)}${technical?'<details><summary>Datos técnicos</summary>'+technical+'</details>':''}${row('Observaciones',r.observaciones)}${refs?'<details><summary>Referencia administrativa</summary>'+refs+'</details>':''}</article>`;
 }
 function groupCards(items){return items.map(r=>`<details><summary>Registro ${esc(r.id)} · ${esc(r.tramite)} · ${esc(r.conduccionOriginal||'Sin clasificación')}</summary>${ficha(r)}</details>`).join('');}
 function cartografia(resolve,options={soloPermisos:false,filtro:'todos'}){
  const groups=new Map(),excluded=[],mapped=new Set();
  for(const r of filtered(options)){
   const pk=pinPK(r);
   if(pk===null){excluded.push({id:r.id,motivo:special(r)?'Varios cruces sin PK individuales':range(r)?'Sin ubicación suficiente':finite(r.pkDesde)||finite(r.pkHasta)?'Tramo incompleto':'Sin PK utilizable'});continue;}
   let located=false;
   for(const ramal of r.ramales){
    const pos=resolve(ramal,pk);if(!pos)continue;
    located=true;mapped.add(r.id);
    const key=`${ramal}|${pk.toFixed(6)}`;
    if(!groups.has(key))groups.set(key,{ramal,pk,pos,records:[]});
    groups.get(key).records.push(r);
   }
   if(!located)excluded.push({id:r.id,motivo:'PK fuera de geometría válida'});
  }
  return {groups:[...groups.values()],excluded,cartografiables:mapped.size};
 }
 function mostrar(ramal,pk){
  state.consulta={ramal,pk};const box=document.getElementById('interferenciasResultado');if(!box)return;
  box.hidden=!finite(pk);box.innerHTML='';if(box.hidden)return;
  const results=masProximas(ramal,pk);
  if(!results.length){box.textContent='Sin interferencias registradas para este ramal con los filtros seleccionados.';return;}
  const at=results[0].distanciaM<=1+1e-6;
  const title=at?(results.length>1?`${results.length} interferencias registradas en este sector`:'Interferencia registrada en este sector'):'Interferencia registrada más próxima';
  box.innerHTML=`<strong>${title}</strong>${results.map(x=>`<div>Ramal ${esc(x.record.ramalOriginal)} · ${esc(location(x.record))}${x.direccion?`<div>A ${Math.round(x.distanciaM)} m hacia progresiva ${x.direccion}</div>`:''}</div>`).join('')}${groupCards(results.map(x=>x.record))}`;
 }
 function render(){
  if(!adapter)return;
  layer.clearLayers();
  const report=cartografia(adapter.resolve,state);
  if(state.activa){
   if(!adapter.map.hasLayer(layer))layer.addTo(adapter.map);
   for(const g of report.groups){
    const count=g.records.length;
    const icon=adapter.L.divIcon({className:'interferencia-pin',html:`<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#7c3aed;color:white;border:2px solid white;border-radius:6px;box-shadow:0 1px 5px #333;font-weight:bold">${count>1?count:'I'}</span>`,iconSize:[32,32],iconAnchor:[16,16]});
    adapter.L.marker(g.pos,{icon}).bindTooltip(`${count} registro${count>1?'s':''} · Ramal ${esc(g.ramal)} · PK ${fmt(g.pk)}`).bindPopup(`<div style="max-height:340px;overflow:auto">${count>1?`<strong>${count} registros</strong>`:''}${count>1?groupCards(g.records):ficha(g.records[0])}</div>`,{maxWidth:380,minWidth:260}).addTo(layer);
   }
  }else if(adapter.map.hasLayer(layer))adapter.map.removeLayer(layer);
  const summary=document.getElementById('interferenciasCantidad');
  summary.textContent=`${report.cartografiables} registros cartografiables · ${report.groups.length} ubicaciones · ${report.excluded.length} sin ubicación cartográfica suficiente`;
  document.getElementById('interferenciasExcluidas').innerHTML=report.excluded.length?`<summary>Registros sin pin (${report.excluded.length})</summary>`+report.excluded.map(x=>{const r=records.find(r=>r.id===x.id);return `<details><summary>Registro ${x.id}: ${esc(x.motivo)}</summary>${ficha(r)}</details>`;}).join(''):'';
  if(state.consulta)mostrar(state.consulta.ramal,state.consulta.pk);
 }
 function init(config){
  adapter=config;layer=config.L.layerGroup();
  for(const [id,key] of [['interferenciasActiva','activa'],['interferenciasPermisos','soloPermisos'],['interferenciasFiltro','filtro']])document.getElementById(id).addEventListener('change',e=>{state[key]=e.target.type==='checkbox'?e.target.checked:e.target.value;render();});
  render();
 }
 root.Interferencias=Object.freeze({init,mostrar,masProximas,cartografia,pinPK,filtered,ficha,range});
})(window);
