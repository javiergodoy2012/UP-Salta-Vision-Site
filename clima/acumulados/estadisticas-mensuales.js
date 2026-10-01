/* Clima Alert · Estadística mensual de precipitaciones */
(function(global){
'use strict';

const TZ='America/Argentina/Salta';

function q(id){ return document.getElementById(id); }
function mm(v){ return Number(v||0).toFixed(1).replace('.',',')+' mm'; }
function monthLabel(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Intl.DateTimeFormat('es-AR',{month:'long',year:'numeric',timeZone:TZ})
    .format(new Date(Date.UTC(y,m-1,15)));
}
function daysInMonth(ym){
  const [y,m]=ym.split('-').map(Number);
  return new Date(Date.UTC(y,m,0)).getUTCDate();
}
function previousClosedMonth(){
  const today=global.ClimaRainHistory?.isoDateInTZ?.() || new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const yesterday=global.ClimaRainHistory?.shiftDate?.(today,-1) || today;
  // Si ayer fue el último día de su mes, ese mes quedó cerrado.
  const ym=yesterday.slice(0,7);
  const last=String(daysInMonth(ym)).padStart(2,'0');
  if(yesterday===ym+'-'+last) return ym;

  const [y,m]=today.slice(0,7).split('-').map(Number);
  const d=new Date(Date.UTC(y,m-2,1));
  return d.toISOString().slice(0,7);
}
function rangeForMonth(ym){
  const total=daysInMonth(ym);
  return {desde:ym+'-01',hasta:ym+'-'+String(total).padStart(2,'0'),dias:total};
}
function canonicalRamales(ramal){
  if(ramal==='C / C15') return ['C','C15'];
  if(ramal==='C / C12') return ['C'];
  return [ramal];
}

async function build(ym,force=false){
  const range=rangeForMonth(ym);
  const rows=await global.ClimaRainHistory.cargarRango({desde:range.desde,hasta:range.hasta,force});
  const byLoc=new Map();
  const byDate=new Map();

  for(const r of rows){
    const loc=byLoc.get(r.localidadId)||{
      localidadId:r.localidadId,localidad:r.localidad,provincia:r.provincia,ramal:r.ramal,
      total:0,diasLluvia:0,max24:0,dias:new Set()
    };
    const val=Number(r.precipitacionMm||0);
    loc.total+=val;
    if(val>0) loc.diasLluvia++;
    if(val>loc.max24) loc.max24=val;
    loc.dias.add(r.fecha);
    byLoc.set(r.localidadId,loc);

    const d=byDate.get(r.fecha)||{fecha:r.fecha,total:0,localidades:0};
    d.total+=val; d.localidades++;
    byDate.set(r.fecha,d);
  }

  const localidades=[...byLoc.values()].map(x=>({...x,total:Math.round(x.total*10)/10,max24:Math.round(x.max24*10)/10,completo:x.dias.size===range.dias}));
  const ranking=[...localidades].sort((a,b)=>b.total-a.total);

  const ramalMap=new Map();
  for(const loc of localidades){
    for(const ramal of canonicalRamales(loc.ramal)){
      const r=ramalMap.get(ramal)||{ramal,total:0,localidades:0};
      r.total+=loc.total; r.localidades++;
      ramalMap.set(ramal,r);
    }
  }
  const ramales=[...ramalMap.values()].map(r=>({...r,total:Math.round(r.total*10)/10})).sort((a,b)=>b.total-a.total);

  const serie=[...byDate.values()].sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(d=>({
    ...d,
    promedio:d.localidades?Math.round((d.total/d.localidades)*10)/10:0
  }));

  const maxLoc=ranking[0]||null;
  const maxDaily=rows.reduce((best,r)=>Number(r.precipitacionMm||0)>Number(best?.precipitacionMm||0)?r:best,null);
  const promedio=localidades.length?Math.round((localidades.reduce((a,b)=>a+b.total,0)/localidades.length)*10)/10:0;
  const completas=localidades.filter(x=>x.completo).length;

  return {ym,label:monthLabel(ym),...range,rows,localidades,ranking,ramales,serie,maxLoc,maxDaily,promedio,completas};
}

let current=null;
async function render(force=false){
  const ym=q('rain-month-select')?.value || previousClosedMonth();
  const mode=q('rain-month-mode');
  if(mode) mode.textContent='CARGANDO';
  try{
    current=await build(ym,force);
    if(mode) mode.textContent='MES CERRADO · FIRESTORE';

    q('rain-month-title').textContent='Cuadro mensual · '+current.label;
    const periodEl=q('rain-month-period');
    if(periodEl) periodEl.textContent=current.desde.split('-').reverse().join('/')+' → '+current.hasta.split('-').reverse().join('/')+' · '+current.dias+' días consolidados';
    q('rain-month-max').textContent=current.maxLoc?mm(current.maxLoc.total):'—';
    q('rain-month-max-note').textContent=current.maxLoc?(current.maxLoc.localidad+' · '+current.maxLoc.ramal):'—';
    q('rain-month-avg').textContent=mm(current.promedio);
    q('rain-month-daily-max').textContent=current.maxDaily?mm(current.maxDaily.precipitacionMm):'—';
    q('rain-month-daily-note').textContent=current.maxDaily?(current.maxDaily.localidad+' · '+current.maxDaily.fecha):'—';
    q('rain-month-coverage').textContent=current.completas+' / 23';

    const maxRank=Math.max(...current.ranking.map(x=>x.total),0);
    q('rain-month-ranking').innerHTML=current.ranking.slice(0,10).map(x=>{
      const w=maxRank?Math.max(4,x.total/maxRank*100):4;
      return '<div class="rain-v5-rank-row"><span class="rain-month-name">'+x.localidad+'</span><div class="rain-v5-bar"><div class="rain-v5-fill" style="width:'+w+'%"></div></div><strong>'+mm(x.total)+'</strong></div>';
    }).join('') || '<div class="rain-v5-empty">Sin datos para el mes seleccionado.</div>';

    const maxR=Math.max(...current.ramales.map(x=>x.total),0);
    q('rain-month-ramales').innerHTML=current.ramales.map(x=>{
      const w=maxR?Math.max(4,x.total/maxR*100):4;
      return '<div class="rain-v5-rank-row"><span class="rain-month-name">'+x.ramal+'</span><div class="rain-v5-bar"><div class="rain-v5-fill" style="width:'+w+'%"></div></div><strong>'+mm(x.total)+'</strong></div>';
    }).join('') || '<div class="rain-v5-empty">Sin datos por ramal.</div>';

    const maxDay=Math.max(...current.serie.map(x=>x.promedio),0);
    const destacados=[...current.serie].sort((a,b)=>b.promedio-a.promedio).slice(0,2).map(x=>x.fecha);
    q('rain-month-daily').innerHTML=current.serie.map(x=>{
      const h=maxDay?Math.max(4,x.promedio/maxDay*100):4;
      const day=x.fecha.slice(-2);
      const peak=destacados.includes(x.fecha)&&x.promedio>0;
      return '<div class="rain-month-day'+(peak?' is-peak':'')+'" title="'+x.fecha+' · '+mm(x.promedio)+' promedio">'+
        (peak?'<strong class="rain-month-dayvalue">'+mm(x.promedio)+'</strong>':'')+
        '<div class="rain-month-daybar" style="height:'+h+'%"></div><span>'+day+'</span></div>';
    }).join('');

    q('rain-month-note').textContent=current.completas===23
      ? 'Cobertura completa: 23 localidades con '+current.dias+' días consolidados.'
      : 'Cobertura parcial: '+current.completas+' de 23 localidades tienen el mes completo.';
  }catch(error){
    console.warn('Estadística mensual',error);
    if(mode) mode.textContent='SIN DATOS / SIN PERMISO';
    ['rain-month-max','rain-month-avg','rain-month-daily-max'].forEach(id=>{if(q(id))q(id).textContent='—';});
    if(q('rain-month-coverage'))q('rain-month-coverage').textContent='0 / 23';
    if(q('rain-month-ranking'))q('rain-month-ranking').innerHTML='<div class="rain-v5-empty">No se pudo generar el cuadro mensual.</div>';
    if(q('rain-month-ramales'))q('rain-month-ramales').innerHTML='';
    if(q('rain-month-daily'))q('rain-month-daily').innerHTML='';
  }
}

function fillMonths(){
  const sel=q('rain-month-select');
  if(!sel)return;
  const latest=previousClosedMonth();
  const [y,m]=latest.split('-').map(Number);
  const opts=[];
  for(let i=0;i<24;i++){
    const d=new Date(Date.UTC(y,m-1-i,1));
    const ym=d.toISOString().slice(0,7);
    opts.push('<option value="'+ym+'">'+monthLabel(ym)+'</option>');
  }
  sel.innerHTML=opts.join('');
  sel.value=latest;
}

function bind(){
  fillMonths();
  q('rain-month-select')?.addEventListener('change',()=>render(false));
  q('rain-month-refresh')?.addEventListener('click',()=>render(true));
  q('rain-month-open')?.addEventListener('click',()=>{
    const section=q('rain-month-section');
    if(!section)return;
    section.hidden=!section.hidden;
    if(!section.hidden){ render(false); section.scrollIntoView({behavior:'smooth',block:'start'}); }
  });
}

global.ClimaRainMonthly={render,build};
document.addEventListener('DOMContentLoaded',bind);
})(window);
