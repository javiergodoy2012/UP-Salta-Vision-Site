/* Consulta por progresiva, sin coordenadas ni evaluación geográfica. */
(function(root){
 'use strict';
 // 1 metro: resolución del localizador. No cambia el PK registrado del cruce.
 const TOLERANCIA_COINCIDENCIA_M = 1;
 function masProximo(ramal,pk,records=root.CRUCES_HABILITADOS||[]){
  if(!Number.isFinite(pk))return null;
  let best=null,delta=Infinity;
  for(const record of records){
   if(record.ramal!==ramal||!Number.isFinite(record.pk))continue;
   const distance=Math.abs(record.pk-pk);
   // Empates: menor PK, independientemente del orden de entrada.
   if(distance<delta-1e-9||(Math.abs(distance-delta)<=1e-9&&(!best||record.pk<best.pk))){best=record;delta=distance;}
  }
  if(!best)return null;
  const distanciaM=delta*1000;
  return {cruce:best,distanciaM,coincide:distanciaM<=TOLERANCIA_COINCIDENCIA_M+1e-6,direccion:best.pk>pk?'ascendente':best.pk<pk?'descendente':null};
 }
 function mostrar(ramal,pk){
  const box=document.getElementById('cruceHabilitado');if(!box)return;
  box.replaceChildren();box.hidden=!Number.isFinite(pk)||!ramal;if(box.hidden)return;
  const result=masProximo(ramal,pk);
  function line(text,bold=false){const el=document.createElement(bold?'strong':'div');el.textContent=text;box.appendChild(el);}
  if(!result){line('Sin cruces habilitados registrados para este ramal.');return;}
  const r=result.cruce;
  line(result.coincide?'Cruce habilitado en este sector':'Cruce habilitado más próximo',true);
  line(`Ramal ${r.ramal} · PK ${r.pk.toFixed(3).replace('.',',')}`);
  if(result.direccion)line(`${Math.round(result.distanciaM)} m hacia progresiva ${result.direccion}`);
  else line('Coincide con el PK buscado');
  if(r.calle||r.ruta)line([r.calle,r.ruta].filter(Boolean).join(' · '));
  const labels={a_nivel_pasivo:'A nivel pasivo',a_nivel_barreras:'A nivel con barreras',a_nivel_fonoluminoso:'A nivel fonoluminoso',alto_nivel:'Alto nivel',bajo_nivel:'Bajo nivel'};
  if(r.ambito)line([r.ambito==='particular'?'Particular':'Público',labels[r.tipo]].filter(Boolean).join(' · '));
 }
 const state={activa:false,etiquetas:true};
 const ZOOM_ETIQUETAS=14;
 let adapter,layer;
 const markers=[];
 const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const tipos={a_nivel_pasivo:'A nivel pasivo',a_nivel_barreras:'A nivel con barreras',a_nivel_fonoluminoso:'A nivel fonoluminoso',alto_nivel:'Alto nivel',bajo_nivel:'Bajo nivel'};
 function ficha(record){
  const fields=[['Ramal',record.ramal],['PK',record.pk.toFixed(3).replace('.',',')],['Ruta/Calle',[record.ruta,record.calle].filter(Boolean).join(' · ')],['Ámbito',record.ambito==='particular'?'Particular':'Público'],['Tipo',tipos[record.tipo]||record.tipo]];
  return '<strong>Cruce habilitado</strong>'+fields.filter(([,value])=>value!==null&&value!==undefined&&value!=='').map(([label,value])=>`<div><b>${label}:</b> ${escape(value)}</div>`).join('');
 }
 function updateLabels(){
  const permanent=state.activa&&state.etiquetas&&adapter.map.getZoom()>=ZOOM_ETIQUETAS;
  for(const item of markers){
   if(item.permanent===permanent)continue;
   item.marker.unbindTooltip();
   item.marker.bindTooltip(item.text,{permanent,direction:'top',offset:[0,-16],opacity:.95});
   item.permanent=permanent;
  }
 }
 function render(){
  if(!adapter)return;
  if(state.activa){if(!adapter.map.hasLayer(layer))layer.addTo(adapter.map);}
  else if(adapter.map.hasLayer(layer))adapter.map.removeLayer(layer);
  updateLabels();
 }
 function init(config){
  // A single layer and one listener per control/zoom, including repeated init calls.
  if(adapter)return;
  adapter=config;layer=config.L.layerGroup();
  const records=root.CRUCES_HABILITADOS||[];
  const icon=config.L.divIcon({className:'cruce-habilitado-pin',html:'<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;background:#ffd43b;color:#102638;border:2px solid #102638;border-radius:6px;box-shadow:0 0 0 1px #fff,0 2px 5px #0008;font-size:18px;font-weight:900">X</span>',iconSize:[32,32],iconAnchor:[16,16],popupAnchor:[0,-16]});
  for(const record of records){
   const pos=config.resolve(record.ramal,record.pk);
   if(!Array.isArray(pos)||pos.length<2||!Number.isFinite(pos[0])||!Number.isFinite(pos[1]))continue;
   const name=record.ruta||record.calle||record.ramal;
   const text=escape(`${name} · PK ${record.pk.toFixed(3).replace('.',',')}${record.ruta||record.calle?' · '+record.ramal:''}`);
   const marker=config.L.marker(pos,{icon}).bindPopup(ficha(record),{maxWidth:340,minWidth:230}).addTo(layer);
   markers.push({marker,text,permanent:null});
  }
  const count=document.getElementById('crucesCantidad');
  if(count)count.textContent=`${records.length} registros · ${markers.length} cartografiables · ${records.length-markers.length} sin ubicación cartográfica`;
  for(const [id,key] of [['crucesActiva','activa'],['crucesEtiquetas','etiquetas']]){
   const control=document.getElementById(id);
   if(control){control.checked=state[key];control.addEventListener('change',event=>{state[key]=event.target.checked;render();});}
  }
  config.map.on('zoomend',updateLabels);
  render();
 }
 root.CrucesHabilitados=Object.freeze({masProximo,mostrar,TOLERANCIA_COINCIDENCIA_M,init,render});
})(window);
