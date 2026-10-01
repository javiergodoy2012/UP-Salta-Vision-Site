/* Clima Alert · Acumulados V5 · UI adapter */
(function(global){
'use strict';
const REF_TZ='America/Argentina/Salta';
let state={period:'168',summary:null,selectedId:'',ramal:'all',loading:false};

function q(id){return document.getElementById(id)}
function mm(v){return Number(v||0).toFixed(1).replace('.',',')+' mm'}
function today(){return global.ClimaRainHistory?.isoDateInTZ?.() || new Intl.DateTimeFormat('en-CA',{timeZone:REF_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())}
function periodValue(row){return state.period==='24'?row.h24:state.period==='72'?row.h72:state.period==='31'?row.d31:state.period==='month'?row.mes:row.d7}
function matchesRamal(rowRamal, selected){
  if(selected==='all') return true;
  // Perico pertenece operativamente a C y C15.
  if(rowRamal==='C / C15') return selected==='C' || selected==='C15';
  // Metán queda integrado en la búsqueda del Ramal C.
  if(rowRamal==='C / C12') return selected==='C';
  return rowRamal===selected;
}
function visibleRows(){return (state.summary?.localidades||[]).filter(r=>matchesRamal(r.ramal,state.ramal))}
function setMode(kind,label){const el=q('rain-v5-mode');if(!el)return;el.className='rain-v5-mode '+kind;el.textContent=label}
function setLoading(on){state.loading=on;const b=q('rain-v5-refresh');if(b){b.disabled=on;b.textContent=on?'Actualizando…':'Actualizar'}}

async function load(force=false){
 if(!global.ClimaRainHistory?.cargarResumen){
   setMode('sim','LECTOR NO DISPONIBLE');
   renderEmpty('El lector de histórico no está disponible en esta vista.');
   return;
 }
 setLoading(true);
 try{
   state.summary=await global.ClimaRainHistory.cargarResumen({force});
   setMode('real','FIRESTORE · HISTÓRICO');
   rebuildFilters();
   render();
 }catch(error){
   console.warn('Acumulados V5',error);
   setMode('sim','SIN DATOS / SIN PERMISO');
   renderEmpty('No se pudo leer el histórico de precipitaciones. La vista principal de Clima Alert continúa funcionando normalmente.');
 }finally{setLoading(false)}
}
function rebuildFilters(){
 const rows=state.summary?.localidades||[], ramal=q('rain-v5-ramal'), loc=q('rain-v5-localidad');
 if(!ramal||!loc)return;
 const oldR=state.ramal, oldL=state.selectedId;
 const ramales=[...new Set(rows.map(r=>r.ramal).filter(Boolean).filter(r=>r!=='C / C15' && r!=='C / C12'))].sort();
 ramal.innerHTML='<option value="all">Todos los ramales</option>'+ramales.map(r=>'<option>'+r+'</option>').join('');
 state.ramal=[...ramal.options].some(o=>o.value===oldR)?oldR:'all';ramal.value=state.ramal;
 loc.innerHTML=rows.map(r=>'<option value="'+r.localidadId+'">'+r.localidad+' · '+r.ramal+'</option>').join('');
 state.selectedId=rows.some(r=>r.localidadId===oldL)?oldL:(rows[0]?.localidadId||'');loc.value=state.selectedId;
}
function render(){
 const rows=visibleRows();
 if(!rows.length){renderEmpty('Todavía no hay registros históricos para el filtro seleccionado.');return}
 const vals=rows.map(periodValue), max=Math.max(...vals,0), avg=vals.reduce((a,b)=>a+b,0)/vals.length;
 const maxRow=rows[vals.indexOf(max)]||rows[0];
 q('rain-v5-max').textContent=mm(max);q('rain-v5-max-note').textContent=maxRow.localidad+' · '+maxRow.ramal;
 q('rain-v5-avg').textContent=mm(avg);q('rain-v5-count').textContent=rows.length+' / 23';
 const sorted=[...rows].sort((a,b)=>periodValue(b)-periodValue(a)).slice(0,8);
 q('rain-v5-ranking').innerHTML=sorted.map(r=>{const v=periodValue(r),w=max?Math.max(4,v/max*100):4;return '<div class="rain-v5-rank-row"><button class="rain-v5-link" data-rain-loc="'+r.localidadId+'">'+r.localidad+'</button><div class="rain-v5-bar"><div class="rain-v5-fill" style="width:'+w+'%"></div></div><strong>'+mm(v)+'</strong></div>'}).join('');
 q('rain-v5-ranking').querySelectorAll('[data-rain-loc]').forEach(b=>b.onclick=()=>selectLocation(b.dataset.rainLoc));
 if(!rows.some(r=>r.localidadId===state.selectedId)) state.selectedId=rows[0].localidadId;
 const loc=q('rain-v5-localidad');if(loc)loc.value=state.selectedId;
 renderDetail();
}
function renderDetail(){
 const row=(state.summary?.localidades||[]).find(r=>r.localidadId===state.selectedId);if(!row)return;
 q('rain-v5-title').textContent=row.localidad;q('rain-v5-meta').textContent=(row.provincia||'')+' · Ramal '+(row.ramal||'—');
 q('rain-v5-24').textContent=mm(row.h24);q('rain-v5-72').textContent=mm(row.h72);q('rain-v5-7').textContent=mm(row.d7);q('rain-v5-month').textContent=mm(row.d31);
 const records=(state.summary.registros||[]).filter(r=>r.localidadId===row.localidadId).sort((a,b)=>b.fecha.localeCompare(a.fecha)).slice(0,31);
 q('rain-v5-body').innerHTML=records.length?records.map(r=>'<tr><td>'+r.fecha+'</td><td>'+r.localidad+'</td><td>'+r.ramal+'</td><td><strong>'+mm(r.precipitacionMm)+'</strong></td><td><span class="rain-v5-source">'+r.fuente+'</span></td><td>'+r.estado+'</td></tr>').join(''):'<tr><td colspan="6" class="rain-v5-empty">Sin registros para esta localidad.</td></tr>';
}
function renderEmpty(message){
 ['rain-v5-max','rain-v5-avg'].forEach(id=>{if(q(id))q(id).textContent='—'});if(q('rain-v5-count'))q('rain-v5-count').textContent='0 / 23';
 if(q('rain-v5-ranking'))q('rain-v5-ranking').innerHTML='<div class="rain-v5-empty">'+message+'</div>';
 if(q('rain-v5-body'))q('rain-v5-body').innerHTML='<tr><td colspan="6" class="rain-v5-empty">'+message+'</td></tr>';
}
function selectLocation(id){state.selectedId=id;const l=q('rain-v5-localidad');if(l)l.value=id;renderDetail()}
function bind(){
 document.querySelectorAll('[data-rain-period]').forEach(b=>b.addEventListener('click',()=>{state.period=b.dataset.rainPeriod;document.querySelectorAll('[data-rain-period]').forEach(x=>x.classList.toggle('active',x===b));render()}));
 q('rain-v5-ramal')?.addEventListener('change',e=>{state.ramal=e.target.value;const rows=visibleRows();state.selectedId=rows[0]?.localidadId||'';render()});
 q('rain-v5-localidad')?.addEventListener('change',e=>selectLocation(e.target.value));
 q('rain-v5-refresh')?.addEventListener('click',()=>load(true));
}
global.ClimaRainV5={init:function(){bind();load(false)},refresh:()=>load(true)};
document.addEventListener('DOMContentLoaded',()=>global.ClimaRainV5.init());
})(window);
