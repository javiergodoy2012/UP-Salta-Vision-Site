/**
 * Clima Alert · Lectura de histórico de precipitaciones · V5 técnica
 * BORRADOR: no integrado aún en clima/index.html.
 *
 * Reutiliza la instancia Firebase compat ya cargada por Clima Alert:
 * firebase.app().firestore()
 */
(function(global){
  'use strict';

  const COLLECTION = 'precipitacionesDiarias';
  const TZ = 'America/Argentina/Salta';
  const CACHE_MS = 5 * 60 * 1000;
  const cache = new Map();

  function db(){
    if(!global.firebase?.app) throw new Error('Firebase no está disponible');
    return global.firebase.app().firestore();
  }

  function isoDateInTZ(date=new Date()){
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA',{
        timeZone:TZ, year:'numeric', month:'2-digit', day:'2-digit'
      }).formatToParts(date).filter(p=>p.type!=='literal').map(p=>[p.type,p.value])
    );
    return `${parts.year}-${parts.month}-${parts.day}`;
  }

  function shiftDate(iso, days){
    const d = new Date(`${iso}T12:00:00-03:00`);
    d.setDate(d.getDate()+days);
    return d.toISOString().slice(0,10);
  }

  function normalize(doc){
    const data = doc.data() || {};
    return {
      id: doc.id,
      localidadId: data.localidadId || '',
      localidad: data.localidad || '',
      provincia: data.provincia || '',
      ramal: data.ramal || '',
      fecha: data.fecha || '',
      precipitacionMm: Number(data.precipitacionMm || 0),
      fuente: data.fuente || 'open-meteo',
      tipo: data.tipo || 'historico_modelado',
      estado: data.estado || 'consolidado'
    };
  }

  async function cargarRango({desde, hasta, force=false}){
    if(!desde || !hasta) throw new Error('Faltan fechas desde/hasta');
    const key = `${desde}|${hasta}`;
    const hit = cache.get(key);
    if(!force && hit && Date.now()-hit.at < CACHE_MS) return hit.data;

    const snap = await db().collection(COLLECTION)
      .where('fecha','>=',desde)
      .where('fecha','<=',hasta)
      .get();

    const data = snap.docs
      .map(normalize)
      .filter(r=>r.tipo==='historico_modelado' || r.tipo==='observado')
      .sort((a,b)=>a.fecha.localeCompare(b.fecha)||a.localidad.localeCompare(b.localidad));

    cache.set(key,{at:Date.now(),data});
    return data;
  }

  function suma(registros){
    return Math.round(registros.reduce((acc,r)=>acc+Number(r.precipitacionMm||0),0)*10)/10;
  }

  function porLocalidad(registros){
    const out = {};
    registros.forEach(r=>{
      (out[r.localidadId] ||= []).push(r);
    });
    Object.values(out).forEach(arr=>arr.sort((a,b)=>a.fecha.localeCompare(b.fecha)));
    return out;
  }

  function acumuladosLocalidad(registros, localidadId, referencia=isoDateInTZ()){
    const own = registros.filter(r=>r.localidadId===localidadId && r.fecha<=referencia);
    const monthStart = referencia.slice(0,8)+'01';
    return {
      h24: suma(own.filter(r=>r.fecha===referencia)),
      h72: suma(own.filter(r=>r.fecha>=shiftDate(referencia,-2))),
      d7: suma(own.filter(r=>r.fecha>=shiftDate(referencia,-6))),
      d31: suma(own.filter(r=>r.fecha>=shiftDate(referencia,-30))),
      mes: suma(own.filter(r=>r.fecha>=monthStart))
    };
  }

  async function cargarResumen({referencia=shiftDate(isoDateInTZ(),-1), force=false}={}){
    // referencia = último día consolidado. La función diaria guarda el día anterior,
    // por lo que 24 h representa el último día completo disponible y no el día en curso.
    const desde = shiftDate(referencia,-30);
    const registros = await cargarRango({desde,hasta:referencia,force});
    const grupos = porLocalidad(registros);

    const localidades = Object.entries(grupos).map(([localidadId, arr])=>{
      const ultimo = arr[arr.length-1] || {};
      return {
        localidadId,
        localidad: ultimo.localidad || localidadId,
        provincia: ultimo.provincia || '',
        ramal: ultimo.ramal || '',
        ...acumuladosLocalidad(registros,localidadId,referencia)
      };
    });

    return {
      referencia,
      registros,
      localidades,
      ranking31d:[...localidades].sort((a,b)=>b.d31-a.d31),
      ranking7d:[...localidades].sort((a,b)=>b.d7-a.d7),
      ranking72h:[...localidades].sort((a,b)=>b.h72-a.h72)
    };
  }

  function limpiarCache(){ cache.clear(); }

  global.ClimaRainHistory = Object.freeze({
    cargarRango,
    cargarResumen,
    acumuladosLocalidad,
    limpiarCache,
    isoDateInTZ,
    shiftDate
  });
})(window);
