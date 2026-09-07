// Shared transport only. Each page supplies its own local result; no cross-module data retrieval.
export async function analyze(module, question, local) {
  const q = question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (!/analiz|analisis|interpret|recomend|aconsej|conclusion|tendencia|compar|riesgo|patron|por que/.test(q)) return local;
  if (/corresponde a|unicamente|no encontr|no hay descarrilos|no hay clientes|no puede|fuera del rango|indicame|alcance del/i.test(local.text)) return local;
  const user = window.firebase?.auth().currentUser;
  if (!user) return {...local, source: local.source + ' · IA requiere sesión aprobada'};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const token = await user.getIdToken();
    const response = await fetch('https://southamerica-east1-up-salta-vision.cloudfunctions.net/razonarSiteVision', {
      method: 'POST', signal: controller.signal,
      headers: {'Content-Type': 'application/json', Authorization: `Bearer ${token}`},
      body: JSON.stringify({data: {module, question, excerpt: local.text.slice(0, 12000), source: local.source || 'Consulta local'}})
    });
    const payload = await response.json();
    const data = payload.result || payload.data;
    if (!response.ok || payload.error || data?.module !== module || typeof data.answer !== 'string' || !data.answer.trim()) throw new Error('AI_UNAVAILABLE');
    return {text: data.answer, source: data.source, actions: local.actions};
  } catch (_) {
    return {...local, source: (local.source || 'Consulta local') + ' · Respaldo local: análisis IA no disponible'};
  } finally { clearTimeout(timer); }
}
