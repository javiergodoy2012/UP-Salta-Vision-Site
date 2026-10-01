/**
 * Clima Alert · Backfill histórico de precipitación
 * Uso previsto: Cloud Shell / entorno Node con firebase-admin.
 *
 * Seguridad:
 * - DRY RUN por defecto.
 * - Solo escribe si se invoca con --write.
 * - IDs idempotentes: <localidadId>_<YYYY-MM-DD>.
 *
 * Ejemplos:
 *   node backfill-precipitacion-historica.js --days=7
 *   node backfill-precipitacion-historica.js --days=31 --write
 */

const TZ='America/Argentina/Salta';
const COLLECTION='precipitacionesDiarias';

const LOCALIDADES = [
  { id:"salta-capital", localidad:"Salta Capital", provincia:"Salta", ramal:"C13", lat:-24.7859, lon:-65.4116 },
  { id:"metan", localidad:"Metán", provincia:"Salta", ramal:"C / C12", lat:-25.4944, lon:-64.9744 },
  { id:"embarcacion", localidad:"Embarcación", provincia:"Salta", ramal:"C15", lat:-23.2097, lon:-64.1014 },
  { id:"pichanal", localidad:"Pichanal", provincia:"Salta", ramal:"C15", lat:-23.3167, lon:-64.2167 },
  { id:"general-guemes", localidad:"General Güemes", provincia:"Salta", ramal:"C", lat:-24.6667, lon:-65.05 },
  { id:"perico", localidad:"Perico", provincia:"Jujuy", ramal:"C / C15", lat:-24.3833, lon:-65.1167 },
  { id:"san-pedro-de-jujuy", localidad:"San Pedro de Jujuy", provincia:"Jujuy", ramal:"C15", lat:-24.2333, lon:-64.8667 },
  { id:"campo-quijano", localidad:"Campo Quijano", provincia:"Salta", ramal:"C14", lat:-24.9, lon:-65.6333 },
  { id:"san-antonio-de-los-cobres", localidad:"San Antonio de los Cobres", provincia:"Salta", ramal:"C14", lat:-24.226711, lon:-66.316378 },
  { id:"tolar-grande", localidad:"Tolar Grande", provincia:"Salta", ramal:"C14", lat:-24.588351, lon:-67.390988 },
  { id:"socompa", localidad:"Socompa", provincia:"Salta", ramal:"C14", lat:-24.4167, lon:-68.2333 },
  { id:"lumbreras", localidad:"Lumbreras", provincia:"Salta", ramal:"C", lat:-25.209216, lon:-64.925198 },
  { id:"palomitas", localidad:"Palomitas", provincia:"Salta", ramal:"C", lat:-24.898745, lon:-64.973082 },
  { id:"ing-maury", localidad:"Ing. Maury", provincia:"Salta", ramal:"C14", lat:-24.681907, lon:-65.772606 },
  { id:"las-cuevas", localidad:"Las Cuevas", provincia:"Salta", ramal:"C14", lat:-24.341251, lon:-65.994822 },
  { id:"laguna-seca", localidad:"Laguna Seca", provincia:"Salta", ramal:"C14", lat:-24.22784, lon:-66.916828 },
  { id:"gral-savio", localidad:"Gral. Savio", provincia:"Salta", ramal:"C", lat:-24.250277, lon:-65.204414 },
  { id:"la-estrella", localidad:"La Estrella", provincia:"Salta", ramal:"C18", lat:-23.822596, lon:-64.07222 },
  { id:"gral-pizarro", localidad:"Gral. Pizarro", provincia:"Salta", ramal:"C18", lat:-24.227961, lon:-63.992501 },
  { id:"yuto", localidad:"Yuto", provincia:"Jujuy", ramal:"C15", lat:-23.6333, lon:-64.4667 },
  { id:"urundel", localidad:"Urundel", provincia:"Jujuy", ramal:"C15", lat:-23.5667, lon:-64.3833 },
  { id:"ledesma", localidad:"Ledesma", provincia:"Jujuy", ramal:"C15", lat:-23.8167, lon:-64.7833 },
  { id:"fraile-pintado", localidad:"Fraile Pintado", provincia:"Jujuy", ramal:"C15", lat:-23.9333, lon:-64.7833 }
];

function arg(name, fallback){
  const hit=process.argv.find(x=>x.startsWith('--'+name+'='));
  return hit ? hit.split('=').slice(1).join('=') : fallback;
}
function has(flag){ return process.argv.includes('--'+flag); }

function isoInTZ(date=new Date()){
  const parts=Object.fromEntries(
    new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'})
      .formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function shift(iso,days){
  const d=new Date(`${iso}T12:00:00-03:00`);
  d.setDate(d.getDate()+days);
  return d.toISOString().slice(0,10);
}
function datesBetween(start,end){
  const out=[]; for(let d=start;d<=end;d=shift(d,1)) out.push(d); return out;
}

async function fetchRange(loc,start,end){
  // El archive API es apropiado para reconstrucción histórica.
  const qs=new URLSearchParams({
    latitude:String(loc.lat),
    longitude:String(loc.lon),
    start_date:start,
    end_date:end,
    daily:'precipitation_sum',
    timezone:TZ
  });
  const res=await fetch('https://archive-api.open-meteo.com/v1/archive?'+qs);
  if(!res.ok) throw new Error(`Open-Meteo archive ${res.status} · ${loc.id}`);
  const body=await res.json();
  const times=body?.daily?.time||[];
  const rain=body?.daily?.precipitation_sum||[];
  return times.map((fecha,i)=>({fecha,precipitacionMm:Number(rain[i]||0)}));
}

async function main(){
  const write=has('write');

  let db=null;
  let serverTimestamp=null;

  // En DRY RUN no se carga firebase-admin: la validación meteorológica
  // puede ejecutarse sin dependencias de Firestore.
  if(write){
    const { getApps, initializeApp } = require('firebase-admin/app');
    const { getFirestore, FieldValue } = require('firebase-admin/firestore');
    if(!getApps().length) initializeApp();
    db=getFirestore();
    serverTimestamp=FieldValue.serverTimestamp;
  }
  const days=Math.max(1,Math.min(365,Number(arg('days','31'))||31));
  const today=isoInTZ();
  const end=shift(today,-1);
  const start=shift(end,-(days-1));

  console.log(JSON.stringify({mode:write?'WRITE':'DRY_RUN',start,end,days,localidades:LOCALIDADES.length},null,2));

  let prepared=0, written=0, failed=[];
  for(const loc of LOCALIDADES){
    try{
      const rows=await fetchRange(loc,start,end);
      prepared+=rows.length;

      if(write){
        let batch=db.batch(), count=0;
        for(const row of rows){
          const ref=db.collection(COLLECTION).doc(`${loc.id}_${row.fecha}`);
          batch.set(ref,{
            localidadId:loc.id,
            localidad:loc.localidad,
            provincia:loc.provincia,
            ramal:loc.ramal,
            fecha:row.fecha,
            precipitacionMm:Math.round(row.precipitacionMm*10)/10,
            fuente:'open-meteo',
            tipo:'historico_modelado',
            estado:'consolidado',
            actualizado:serverTimestamp(),
            backfill:true
          },{merge:true});
          count++;
          if(count===400){ await batch.commit(); written+=count; batch=db.batch(); count=0; }
        }
        if(count){ await batch.commit(); written+=count; }
      }

      console.log(`${loc.id}: ${rows.length} registros ${write?'procesados':'validados'}`);
    }catch(error){
      failed.push({localidadId:loc.id,error:String(error?.message||error)});
      console.error(loc.id,error);
    }
  }

  console.log(JSON.stringify({prepared,written,failed},null,2));
  if(failed.length) process.exitCode=1;
}

main();
