/**
 * Clima Alert · Automatización de precipitación histórica
 * Módulo listo para integrar en el source real de Firebase Functions.
 *
 * No se ejecuta desde Hosting. Debe copiarse al directorio functions/
 * del proyecto Firebase up-salta-vision y exportarse desde functions/index.js.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getApps, initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

if (!getApps().length) initializeApp();
const db = getFirestore();

const TZ = "America/Argentina/Salta";
const REGION = "southamerica-east1";
const DAILY_COLLECTION = "precipitacionesDiarias";
const MONTHLY_COLLECTION = "estadisticasMensualesLluvia";

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

function isoInTZ(date = new Date()){
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: TZ, year:"numeric", month:"2-digit", day:"2-digit"
    }).formatToParts(date).filter(p=>p.type!=="literal").map(p=>[p.type,p.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function shiftDate(iso, days){
  const d = new Date(`${iso}T12:00:00-03:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0,10);
}

function previousLocalDate(){
  return shiftDate(isoInTZ(), -1);
}

function monthRange(ym){
  const [year, month] = ym.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    desde: `${ym}-01`,
    hasta: `${ym}-${String(last).padStart(2,"0")}`,
    dias: last
  };
}

function previousMonth(){
  const today = isoInTZ();
  const [y,m] = today.slice(0,7).split("-").map(Number);
  const d = new Date(Date.UTC(y, m-2, 1));
  return d.toISOString().slice(0,7);
}

function canonicalRamales(ramal){
  if(ramal === "C / C15") return ["C","C15"];
  if(ramal === "C / C12") return ["C"];
  return [ramal];
}

async function fetchPreviousDay(loc, fecha){
  const qs = new URLSearchParams({
    latitude: String(loc.lat),
    longitude: String(loc.lon),
    daily: "precipitation_sum",
    timezone: TZ,
    past_days: "1",
    forecast_days: "1"
  });

  const response = await fetch("https://api.open-meteo.com/v1/forecast?" + qs);
  if(!response.ok) throw new Error(`Open-Meteo ${response.status} · ${loc.id}`);

  const body = await response.json();
  const times = body?.daily?.time || [];
  const values = body?.daily?.precipitation_sum || [];
  const idx = times.indexOf(fecha);

  if(idx < 0) throw new Error(`Fecha ${fecha} no disponible · ${loc.id}`);
  const mm = Number(values[idx]);
  if(!Number.isFinite(mm)) throw new Error(`Precipitación inválida · ${loc.id} · ${fecha}`);

  return Math.round(mm * 10) / 10;
}

async function registrarDia(fecha){
  const failures = [];
  let written = 0;

  for(const loc of LOCALIDADES){
    try{
      const precipitacionMm = await fetchPreviousDay(loc, fecha);
      const docId = `${loc.id}_${fecha}_openmeteo`;

      await db.collection(DAILY_COLLECTION).doc(docId).set({
        localidadId: loc.id,
        localidad: loc.localidad,
        provincia: loc.provincia,
        ramal: loc.ramal,
        fecha,
        precipitacionMm,
        fuente: "open-meteo",
        tipo: "historico_modelado",
        estado: "consolidado",
        timezone: TZ,
        actualizado: FieldValue.serverTimestamp(),
        backfill: false
      }, { merge:true });

      written++;
    }catch(error){
      failures.push({ localidadId:loc.id, error:String(error?.message || error) });
    }
  }

  await db.collection("estadoPrecipitacion").doc("diario").set({
    fecha,
    written,
    expected: LOCALIDADES.length,
    failures,
    ok: failures.length === 0 && written === LOCALIDADES.length,
    updatedAt: FieldValue.serverTimestamp()
  }, { merge:true });

  if(failures.length) {
    throw new Error(`Carga diaria incompleta: ${written}/${LOCALIDADES.length}`);
  }

  return { fecha, written };
}

async function generarCierreMensual(ym){
  const { desde, hasta, dias } = monthRange(ym);
  const snap = await db.collection(DAILY_COLLECTION)
    .where("fecha", ">=", desde)
    .where("fecha", "<=", hasta)
    .get();

  const rows = snap.docs.map(doc=>({ id:doc.id, ...doc.data() }))
    .filter(r=>r.tipo === "historico_modelado" && r.fuente === "open-meteo");

  const byLoc = new Map();
  const byDate = new Map();
  for(const r of rows){
    const val = Number(r.precipitacionMm || 0);
    const x = byLoc.get(r.localidadId) || {
      localidadId:r.localidadId,
      localidad:r.localidad,
      provincia:r.provincia,
      ramal:r.ramal,
      total:0,
      max24:0,
      diasLluvia:0,
      fechas:new Set()
    };
    x.total += val;
    x.max24 = Math.max(x.max24, val);
    if(val > 0) x.diasLluvia++;
    x.fechas.add(r.fecha);
    byLoc.set(r.localidadId, x);

    const day = byDate.get(r.fecha) || {fecha:r.fecha,total:0,localidades:0};
    day.total += val;
    day.localidades++;
    byDate.set(r.fecha, day);
  }

  const localidades = [...byLoc.values()].map(x=>({
    localidadId:x.localidadId,
    localidad:x.localidad,
    provincia:x.provincia,
    ramal:x.ramal,
    totalMm:Math.round(x.total*10)/10,
    max24Mm:Math.round(x.max24*10)/10,
    diasLluvia:x.diasLluvia,
    diasDisponibles:x.fechas.size,
    completo:x.fechas.size === dias
  }));

  const completas = localidades.filter(x=>x.completo).length;
  if(localidades.length !== LOCALIDADES.length || completas !== LOCALIDADES.length){
    await db.collection("estadoPrecipitacion").doc("mensual").set({
      periodo:ym,
      estado:"pendiente",
      localidades:localidades.length,
      completas,
      expected:LOCALIDADES.length,
      updatedAt:FieldValue.serverTimestamp()
    }, {merge:true});
    throw new Error(`Mes incompleto ${ym}: ${completas}/${LOCALIDADES.length} localidades completas`);
  }

  const ranking = [...localidades].sort((a,b)=>b.totalMm-a.totalMm);
  const ramalMap = new Map();
  for(const loc of localidades){
    for(const ramal of canonicalRamales(loc.ramal)){
      const item = ramalMap.get(ramal) || { ramal, totalMm:0, localidades:0 };
      item.totalMm += loc.totalMm;
      item.localidades++;
      ramalMap.set(ramal,item);
    }
  }
  const ramales = [...ramalMap.values()]
    .map(x=>({...x,totalMm:Math.round(x.totalMm*10)/10}))
    .sort((a,b)=>b.totalMm-a.totalMm);

  const promedioLocalidadMm = Math.round(
    (localidades.reduce((a,b)=>a+b.totalMm,0) / localidades.length) * 10
  ) / 10;

  const maximoDiario = rows.reduce((best,r)=>{
    return Number(r.precipitacionMm || 0) > Number(best?.precipitacionMm || 0) ? {
      fecha:r.fecha,
      localidadId:r.localidadId,
      localidad:r.localidad,
      provincia:r.provincia,
      ramal:r.ramal,
      precipitacionMm:Math.round(Number(r.precipitacionMm || 0)*10)/10
    } : best;
  }, null);

  const serieDiaria = [...byDate.values()]
    .sort((a,b)=>a.fecha.localeCompare(b.fecha))
    .map(d=>({
      fecha:d.fecha,
      totalMm:Math.round(d.total*10)/10,
      localidades:d.localidades,
      promedioMm:d.localidades ? Math.round((d.total/d.localidades)*10)/10 : 0
    }));

  await db.collection(MONTHLY_COLLECTION).doc(ym).set({
    periodo:ym,
    desde,
    hasta,
    dias,
    fuente:"open-meteo",
    tipo:"historico_modelado",
    estado:"cerrado",
    cobertura:{ localidades:localidades.length, completas },
    promedioLocalidadMm,
    maximaLocalidad: ranking[0] || null,
    maximoDiario,
    serieDiaria,
    rankingLocalidades: ranking,
    totalesPorRamal: ramales,
    generadoAt: FieldValue.serverTimestamp()
  }, { merge:true });

  await db.collection("estadoPrecipitacion").doc("mensual").set({
    periodo:ym,
    estado:"cerrado",
    localidades:localidades.length,
    completas,
    updatedAt:FieldValue.serverTimestamp()
  }, { merge:true });

  return { periodo:ym, completas };
}

exports.registrarPrecipitacionDiaria = onSchedule({
  schedule: "10 6 * * *",
  timeZone: TZ,
  region: REGION,
  retryCount: 2
}, async () => {
  const fecha = previousLocalDate();
  await registrarDia(fecha);
});

exports.cerrarEstadisticaMensualLluvia = onSchedule({
  schedule: "20 7 1 * *",
  timeZone: TZ,
  region: REGION,
  retryCount: 2
}, async () => {
  const ym = previousMonth();
  await generarCierreMensual(ym);
});

exports._precipitacionInternals = {
  LOCALIDADES,
  previousLocalDate,
  previousMonth,
  monthRange,
  registrarDia,
  generarCierreMensual
};
