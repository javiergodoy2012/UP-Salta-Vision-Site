(() => {
  'use strict';

  const RAMALES = ['C','C13','C14','C15','C16','C18'];
  const NETWORK = window.INFRA_NETWORK || {};
  const CRUCES = window.CRUCES_HABILITADOS || [];
  const INTERFERENCIAS = window.INTERFERENCIAS_UP_SALTA || [];

  const $ = id => document.getElementById(id);
  const ramalSelect = $('ramal');
  const pkInput = $('pk');
  const searchButton = $('buscar');
  const status = $('status');
  const resultBox = $('resultado');
  const resultContent = $('resultadoContenido');
  const layerSummary = $('layerSummary');

  if (!window.L) {
    document.body.innerHTML = '<p style="padding:30px">No se pudo cargar el motor cartográfico.</p>';
    return;
  }

  const missing = RAMALES.filter(r => !NETWORK[r] || !Array.isArray(NETWORK[r].puntos));
  if (missing.length) {
    status.textContent = 'Faltan datos de geometría. Ejecutar el generador de infraestructura.';
  }

  const map = L.map('map', { zoomControl: true, preferCanvas: true }).setView([-24.7,-65.2], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const railLayer = L.layerGroup().addTo(map);
  const crossingLayer = L.layerGroup();
  const interferenceLayer = L.layerGroup();
  const searchLayer = L.layerGroup().addTo(map);

  function escapeHtml(v){
    return String(v ?? '').replace(/[&<>"']/g, c => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[c]));
  }

  function fmtPk(v){
    return Number(v).toFixed(3).replace('.', ',');
  }

  function parsePk(value){
    const n = Number(String(value).trim().replace(',', '.'));
    return Number.isFinite(n) ? n : NaN;
  }

  function pointsOf(ramal){
    return NETWORK[ramal]?.puntos || [];
  }

  function resolve(ramal, pk){
    const pts = pointsOf(ramal);
    if (pts.length < 2 || !Number.isFinite(pk)) return null;
    if (pk < pts[0][0] || pk > pts[pts.length - 1][0]) return null;

    let lo = 0, hi = pts.length - 1;
    while (lo + 1 < hi) {
      const mid = (lo + hi) >> 1;
      if (pts[mid][0] <= pk) lo = mid;
      else hi = mid;
    }

    const a = pts[lo], b = pts[Math.min(lo + 1, pts.length - 1)];
    if (!a || !b) return null;
    if (b[0] === a[0]) return [Number(a[1]), Number(a[2])];

    const t = Math.max(0, Math.min(1, (pk - a[0]) / (b[0] - a[0])));
    return [
      Number(a[1]) + t * (Number(b[1]) - Number(a[1])),
      Number(a[2]) + t * (Number(b[2]) - Number(a[2]))
    ];
  }

  function nearestCruce(ramal, pk){
    let best = null, delta = Infinity;
    for (const r of CRUCES) {
      if (r.ramal !== ramal || !Number.isFinite(r.pk)) continue;
      const d = Math.abs(r.pk - pk) * 1000;
      if (d < delta) { delta = d; best = r; }
    }
    return best ? { record: best, distanciaM: delta } : null;
  }

  function interferenceRange(r){
    if (Number.isFinite(r.pkDesde) && Number.isFinite(r.pkHasta)) {
      return [Math.min(r.pkDesde,r.pkHasta), Math.max(r.pkDesde,r.pkHasta)];
    }
    return null;
  }

  function interferencePinPk(r){
    if (r.id === 937 && /Taca Taca/i.test(r.denominacionObra || '')) return null;
    if (Number.isFinite(r.pk)) return r.pk;
    const range = interferenceRange(r);
    return range ? (range[0] + range[1]) / 2 : null;
  }

  function distanceToInterference(r, pk){
    const range = interferenceRange(r);
    let target = null;
    if (range) target = Math.max(range[0], Math.min(range[1], pk));
    else if (Number.isFinite(r.pk)) target = r.pk;
    return target === null ? null : Math.abs(target - pk) * 1000;
  }

  function nearestInterferences(ramal, pk){
    let min = Infinity;
    let out = [];
    for (const r of INTERFERENCIAS) {
      if (!Array.isArray(r.ramales) || !r.ramales.includes(ramal)) continue;
      const d = distanceToInterference(r, pk);
      if (!Number.isFinite(d)) continue;
      if (d < min - 1e-6) { min = d; out = [r]; }
      else if (Math.abs(d - min) <= 1e-6) out.push(r);
    }
    return { records: out, distanciaM: min };
  }

  function drawRailways(){
    railLayer.clearLayers();
    const bounds = L.latLngBounds([]);

    for (const ramal of RAMALES) {
      const pts = pointsOf(ramal);
      if (pts.length < 2) continue;

      const stride = Math.max(1, Math.floor(pts.length / 7000));
      const latlngs = [];
      for (let i = 0; i < pts.length; i += stride) {
        latlngs.push([Number(pts[i][1]), Number(pts[i][2])]);
      }
      const last = pts[pts.length - 1];
      if (latlngs.length && (latlngs[latlngs.length-1][0] !== Number(last[1]) ||
          latlngs[latlngs.length-1][1] !== Number(last[2]))) {
        latlngs.push([Number(last[1]), Number(last[2])]);
      }

      const line = L.polyline(latlngs, {
        color: '#2F80ED', weight: ramal === 'C16' ? 2 : 4,
        opacity: ramal === 'C16' ? .65 : .9
      }).bindTooltip(`Ramal ${escapeHtml(ramal)}`, {sticky:true});

      line.on('click', e => {
        ramalSelect.value = ramal;
        const nearest = nearestPkFromLatLng(ramal, e.latlng);
        if (nearest) {
          pkInput.value = nearest.pk.toFixed(3).replace('.', ',');
          buscar();
        }
      });

      line.addTo(railLayer);
      bounds.extend(line.getBounds());
    }

    if (bounds.isValid()) map.fitBounds(bounds, { padding:[25,25], maxZoom:8 });
  }

  function nearestPkFromLatLng(ramal, latlng){
    const pts = pointsOf(ramal);
    if (!pts.length) return null;
    let best = null, dmin = Infinity;
    const stride = Math.max(1, Math.floor(pts.length / 12000));
    for (let i = 0; i < pts.length; i += stride) {
      const p = L.latLng(Number(pts[i][1]), Number(pts[i][2]));
      const d = latlng.distanceTo(p);
      if (d < dmin) { dmin = d; best = { pk:Number(pts[i][0]), d }; }
    }
    return best;
  }

  function crossingPopup(r){
    const where = [r.ruta, r.calle].filter(Boolean).map(escapeHtml).join(' · ');
    const typeLabels = {
      a_nivel_pasivo:'A nivel pasivo',
      a_nivel_barreras:'A nivel con barreras',
      a_nivel_fonoluminoso:'A nivel fonoluminoso',
      alto_nivel:'Alto nivel', bajo_nivel:'Bajo nivel'
    };
    return `<strong>Cruce habilitado</strong>
      <div>Ramal ${escapeHtml(r.ramal)} · PK ${fmtPk(r.pk)}</div>
      ${where ? `<div><b>Ruta/Calle:</b> ${where}</div>` : ''}
      ${r.ambito ? `<div><b>Ámbito:</b> ${r.ambito === 'particular' ? 'Particular' : 'Público'}</div>` : ''}
      ${r.tipo ? `<div><b>Tipo:</b> ${escapeHtml(typeLabels[r.tipo] || r.tipo)}</div>` : ''}`;
  }

  function renderCrossings(){
    crossingLayer.clearLayers();
    let count = 0;
    const icon = L.divIcon({
      className:'cruce-pin',
      html:'<span class="pin-cruce">X</span>',
      iconSize:[28,28], iconAnchor:[14,14]
    });

    for (const r of CRUCES) {
      if (!RAMALES.includes(r.ramal) || !Number.isFinite(r.pk)) continue;
      const pos = resolve(r.ramal, r.pk);
      if (!pos) continue;
      L.marker(pos,{icon}).bindPopup(crossingPopup(r),{maxWidth:340}).addTo(crossingLayer);
      count++;
    }
    return count;
  }

  function interferencePopup(records, ramal, pk){
    const cards = records.map(r => {
      const loc = Number.isFinite(r.pk) ? `PK ${fmtPk(r.pk)}`
        : (Number.isFinite(r.pkDesde) && Number.isFinite(r.pkHasta)
          ? `Tramo PK ${fmtPk(r.pkDesde)} a ${fmtPk(r.pkHasta)}` : 'PK no individualizado');
      return `<div style="margin-top:8px;padding-top:8px;border-top:1px solid #ddd">
        <b>Registro ${escapeHtml(r.id)}</b><br>
        Ramal ${escapeHtml(r.ramalOriginal || ramal)} · ${loc}<br>
        ${r.tramite ? `<b>Trámite:</b> ${escapeHtml(r.tramite)}<br>` : ''}
        ${r.conduccionOriginal ? `<b>Conducción:</b> ${escapeHtml(r.conduccionOriginal)}<br>` : ''}
        ${r.localidad ? `<b>Localidad:</b> ${escapeHtml(r.localidad)}<br>` : ''}
        ${r.denominacionObra ? `<b>Obra:</b> ${escapeHtml(r.denominacionObra)}<br>` : ''}
      </div>`;
    }).join('');

    return `<strong>Interferencia / Servicio</strong>
      <div><em>Registro de trámite; no acredita ejecución ni servicio activo.</em></div>
      ${cards}`;
  }

  function renderInterferences(){
    interferenceLayer.clearLayers();
    const groups = new Map();

    for (const r of INTERFERENCIAS) {
      const pk = interferencePinPk(r);
      if (!Number.isFinite(pk) || !Array.isArray(r.ramales)) continue;

      for (const ramal of r.ramales) {
        if (!RAMALES.includes(ramal)) continue;
        const pos = resolve(ramal,pk);
        if (!pos) continue;
        const key = `${ramal}|${pk.toFixed(6)}`;
        if (!groups.has(key)) groups.set(key,{ramal,pk,pos,records:[]});
        groups.get(key).records.push(r);
      }
    }

    for (const g of groups.values()) {
      const n = g.records.length;
      const icon = L.divIcon({
        className:'interferencia-pin',
        html:`<span class="pin-interferencia">${n > 1 ? n : 'I'}</span>`,
        iconSize:[28,28], iconAnchor:[14,14]
      });
      L.marker(g.pos,{icon})
        .bindPopup(interferencePopup(g.records,g.ramal,g.pk),{maxWidth:390})
        .addTo(interferenceLayer);
    }

    return groups.size;
  }

  function updateLayers(){
    if ($('toggleCruces').checked) {
      if (!map.hasLayer(crossingLayer)) crossingLayer.addTo(map);
    } else if (map.hasLayer(crossingLayer)) map.removeLayer(crossingLayer);

    if ($('toggleInterferencias').checked) {
      if (!map.hasLayer(interferenceLayer)) interferenceLayer.addTo(map);
    } else if (map.hasLayer(interferenceLayer)) map.removeLayer(interferenceLayer);
  }

  function resultHtml(ramal, pk, pos){
    const crossing = nearestCruce(ramal,pk);
    const inter = nearestInterferences(ramal,pk);
    let html = `<div class="result-block"><div class="result-title">Ramal ${escapeHtml(ramal)} · PK ${fmtPk(pk)}</div>
      <div>Lat: ${pos[0].toFixed(6)} · Lon: ${pos[1].toFixed(6)}</div></div>`;

    html += '<div class="result-block"><div class="result-title">Cruces Habilitados</div>';
    if (!crossing) html += '<div>Sin registros para este ramal.</div>';
    else {
      const r = crossing.record;
      html += `<div><b>Más próximo:</b> PK ${fmtPk(r.pk)} · ${Math.round(crossing.distanciaM)} m</div>`;
      if (r.ruta || r.calle) html += `<div>${escapeHtml([r.ruta,r.calle].filter(Boolean).join(' · '))}</div>`;
    }
    html += '</div>';

    html += '<div class="result-block"><div class="result-title">Interferencias / Servicios</div>';
    if (!inter.records.length) html += '<div>Sin registros con PK utilizable para este ramal.</div>';
    else {
      html += `<div><b>Más próxima:</b> ${Math.round(inter.distanciaM)} m</div>`;
      html += inter.records.slice(0,3).map(r =>
        `<div>Registro ${escapeHtml(r.id)} · ${escapeHtml(r.tramite || '')} · ${escapeHtml(r.conduccionOriginal || '')}</div>`
      ).join('');
      html += '<div class="muted">Los registros de trámite no acreditan ejecución ni servicio activo.</div>';
    }
    html += '</div>';
    return html;
  }

  function buscar(){
    const ramal = ramalSelect.value;
    const pk = parsePk(pkInput.value);
    if (!ramal || !Number.isFinite(pk)) {
      status.textContent = 'Ingresá un ramal y un PK válido.';
      return;
    }

    const pos = resolve(ramal,pk);
    if (!pos) {
      const pts = pointsOf(ramal);
      const range = pts.length ? `${fmtPk(pts[0][0])} a ${fmtPk(pts[pts.length-1][0])}` : 'sin datos';
      status.textContent = `PK fuera del rango disponible para ${ramal} (${range}).`;
      return;
    }

    searchLayer.clearLayers();
    const marker = L.circleMarker(pos,{
      radius:8, color:'#fff', weight:3, fillColor:'#ff4545', fillOpacity:1
    }).addTo(searchLayer);
    marker.bindTooltip(`Ramal ${ramal} · PK ${fmtPk(pk)}`,{permanent:true,direction:'top',offset:[0,-10]});
    map.setView(pos,15);
    resultContent.innerHTML = resultHtml(ramal,pk,pos);
    resultBox.hidden = false;
    status.textContent = `Ubicado: Ramal ${ramal} · PK ${fmtPk(pk)}`;
  }

  for (const ramal of RAMALES) {
    const pts = pointsOf(ramal);
    if (!pts.length) continue;
    const opt = document.createElement('option');
    opt.value = ramal;
    opt.textContent = `Ramal ${ramal} · PK ${fmtPk(pts[0][0])}–${fmtPk(pts[pts.length-1][0])}`;
    ramalSelect.appendChild(opt);
  }

  const crossingCount = renderCrossings();
  const interferenceCount = renderInterferences();
  layerSummary.textContent = `${crossingCount} cruces cartografiables · ${interferenceCount} ubicaciones de interferencias/servicios`;

  $('toggleCruces').addEventListener('change',updateLayers);
  $('toggleInterferencias').addEventListener('change',updateLayers);
  searchButton.addEventListener('click',buscar);
  pkInput.addEventListener('keydown',e => { if (e.key === 'Enter') buscar(); });

  drawRailways();
})();
