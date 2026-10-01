/**
 * Clima Alert · Acumulados de precipitación · V5 técnica
 * BORRADOR: no desplegar sin validación.
 *
 * Cloud Function separada de monitorClimaAlert.
 * Requiere firebase-functions v2 y firebase-admin inicializado.
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const TZ = "America/Argentina/Salta";
const COLLECTION = "precipitacionesDiarias";

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

function ymdInTimezone(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function previousLocalDate() {
  // Se toma "ahora menos 12 h" para caer con seguridad en el día local anterior
  // cuando la función corre a primera hora de Argentina.
  return ymdInTimezone(new Date(Date.now() - 12 * 60 * 60 * 1000), TZ);
}

async function fetchDailyPrecipitation(loc, date) {
  const qs = new URLSearchParams({
    latitude: String(loc.lat),
    longitude: String(loc.lon),
    daily: "precipitation_sum",
    timezone: TZ,
    start_date: date,
    end_date: date
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${qs}`);
  if (!res.ok) throw new Error(`Open-Meteo ${res.status} para ${loc.id}`);

  const body = await res.json();
  const value = body?.daily?.precipitation_sum?.[0];

  if (!Number.isFinite(value)) {
    throw new Error(`Sin precipitation_sum válido para ${loc.id} en ${date}`);
  }
  return Math.round(value * 10) / 10;
}

exports.registrarPrecipitacionDiaria = onSchedule(
  {
    schedule: "10 6 * * *",
    timeZone: TZ,
    region: "southamerica-east1",
    retryCount: 2
  },
  async () => {
    const db = getFirestore();
    const fecha = previousLocalDate();

    const results = await Promise.allSettled(
      LOCALIDADES.map(async loc => {
        const precipitacionMm = await fetchDailyPrecipitation(loc, fecha);
        const docId = `${loc.id}_${fecha}`;

        await db.collection(COLLECTION).doc(docId).set({
          localidadId: loc.id,
          localidad: loc.localidad,
          provincia: loc.provincia,
          ramal: loc.ramal,
          fecha,
          precipitacionMm,
          fuente: "open-meteo",
          tipo: "historico_modelado",
          estado: "consolidado",
          actualizado: FieldValue.serverTimestamp()
        }, { merge: true });

        return { localidadId: loc.id, precipitacionMm };
      })
    );

    const ok = results.filter(r => r.status === "fulfilled").length;
    const failed = results
      .map((r, i) => ({ r, loc: LOCALIDADES[i] }))
      .filter(x => x.r.status === "rejected")
      .map(x => ({ localidadId: x.loc.id, error: String(x.r.reason?.message || x.r.reason) }));

    console.log("registrarPrecipitacionDiaria", { fecha, ok, failed });

    if (failed.length) {
      throw new Error(`Fallaron ${failed.length} de ${LOCALIDADES.length} localidades`);
    }
  }
);

// Helpers puros para la futura lectura en Clima Alert.
function sumaPeriodo(registros, desdeFecha, hastaFecha) {
  return Math.round(
    registros
      .filter(r => r.fecha >= desdeFecha && r.fecha <= hastaFecha)
      .reduce((acc, r) => acc + Number(r.precipitacionMm || 0), 0) * 10
  ) / 10;
}

module.exports.LOCALIDADES = LOCALIDADES;
module.exports.sumaPeriodo = sumaPeriodo;
