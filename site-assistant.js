(function(){
'use strict';

const RAMAL_STATUS={
  C:[{from:979,to:1142.149,status:'activo'},{from:1142.150,to:1152,status:'inactivo'}],
  C13:[{status:'activo'}],C14:[{status:'activo'}],
  C15:[{from:1120.846,to:1364.500,status:'activo'},{from:1364.501,to:1454.900,status:'inactivo'},{from:1454.901,to:1456.200,status:'activo'}],
  C16:[{status:'inactivo'}],C18:[{status:'activo'}],C25:[{status:'inactivo'}]
};
const CLIMATE_WORDS=['clima','temperatura','lluvia','llover','llovio','viento','rafaga','pronostico','meteorolog','humedad','tormenta','granizo','alerta smn','alerta meteorologica'];
const MUTATION_WORDS=['cambia','cambiar','modifica','modificar','editar','eliminar','borrar','crear','agregar','actualizar el dato','mover el pk','corregir el pk'];
const MONTHS={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
const state={welcomed:false};

function normalize(value=''){return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9.,\s-]/g,' ').replace(/\s+/g,' ').trim();}
function fmt(value){return Number(value).toFixed(3).replace('.',',');}
function hasAny(q,words){return words.some(word=>q.includes(word));}
function getData(name){try{return window.eval(`typeof ${name} !== 'undefined' ? ${name} : null`);}catch(_){return null;}}
function ramalFrom(q){const match=q.match(/(?:\bramal\s*)?\b(c(?:13|14|15|16|18|25)?)\b/i);return match?match[1].toUpperCase():null;}
function pkFrom(q){const match=q.match(/\b(?:pk|km|kilometro|progresiva)\s*(?:nro\.?\s*)?(\d{3,4}(?:[.,]\d{1,3})?)/i);return match?Number(match[1].replace(',','.')):null;}
function nearestStation(ramal,pk){const stations=getData('STATIONS')||[];return stations.filter(item=>item.ramal===ramal).reduce((best,item)=>!best||Math.abs(item.pk-pk)<Math.abs(best.pk-pk)?item:best,null);}
function findRailPoint(ramal,pk){const network=getData('NETWORK');const points=network?.[ramal]?.puntos;if(!points?.length)return null;const finder=getData('findPoint');if(typeof finder==='function')return finder(points,pk);let lo=0,hi=points.length-1;while(lo<=hi){const mid=(lo+hi)>>1;if(points[mid][0]<pk)lo=mid+1;else hi=mid-1;}const a=points[Math.max(0,hi)],b=points[Math.min(points.length-1,lo)];if(!a||!b||pk<a[0]||pk>b[0])return null;if(a===b)return a;const t=(pk-a[0])/(b[0]-a[0]);return [pk,a[1]+t*(b[1]-a[1]),a[2]+t*(b[2]-a[2])];}
function statusAt(ramal,pk){const sections=RAMAL_STATUS[ramal]||[];return sections.find(section=>(section.from==null||pk>=section.from)&&(section.to==null||pk<=section.to))?.status||'sin estado informado';}
function stationMatch(q){const stations=getData('STATIONS')||[];const generic=new Set(['estacion','codigo','telegrafico','buscar','ubicar','donde','esta','la','el','de','del']);const terms=q.split(' ').filter(term=>term.length>2&&!generic.has(term));return stations.map(item=>{const hay=normalize(`${item.nombre} ${item.codigo||''} ${item.referencia||''}`);const score=terms.reduce((sum,term)=>sum+(hay.includes(term)?term.length:0),0);return {item,score};}).filter(hit=>hit.score>=3).sort((a,b)=>b.score-a.score)[0]?.item||null;}
function ramalDescription(ramal){const network=getData('NETWORK');const meta=network?.[ramal];if(!meta)return null;const sections=RAMAL_STATUS[ramal]||[];const details=sections.length===1&&sections[0].from==null?`Estado: ${sections[0].status}.`:sections.map(section=>`${section.status}: km ${fmt(section.from)} a ${fmt(section.to)}`).join('\n');return {text:`Ramal ${ramal} · ${meta.nombre||'UP Salta'}\nRango incorporado: km ${fmt(meta.km_inicio)} a ${fmt(meta.km_fin)}.\n${details}`,source:'Red ferroviaria cargada en Site Visión'};}
function networkAnswer(){const network=getData('NETWORK')||{};const lines=Object.keys(network).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(ramal=>{const sections=RAMAL_STATUS[ramal]||[];const inactive=sections.every(section=>section.status==='inactivo');const mixed=sections.some(section=>section.status==='activo')&&sections.some(section=>section.status==='inactivo');return `${ramal}: ${inactive?'inactivo':mixed?'activo con sector inactivo':'activo'} · km ${fmt(network[ramal].km_inicio)}–${fmt(network[ramal].km_fin)}`;});return {text:`Red UP Salta · ${lines.length} ramales incorporados:\n${lines.join('\n')}`,source:'Estado operativo cargado en Site Visión'};}
function pkAnswer(ramal,pk){const network=getData('NETWORK');const meta=network?.[ramal];if(!meta)return {text:`No encontré el ramal ${ramal} en la red cargada.`,source:'Site Visión · solo lectura'};if(pk<meta.km_inicio||pk>meta.km_fin)return {text:`El km ${fmt(pk)} está fuera del rango cargado del ramal ${ramal}: ${fmt(meta.km_inicio)} a ${fmt(meta.km_fin)}.`,source:'Red ferroviaria cargada en Site Visión'};const point=findRailPoint(ramal,pk);if(!point)return {text:`El km ${fmt(pk)} del ramal ${ramal} no tiene una coordenada validada disponible.`,source:'Site Visión · geometría existente'};const station=nearestStation(ramal,pk);const distance=station?Math.abs(station.pk-pk):null;return {text:`Ramal ${ramal}, km ${fmt(pk)}: ${point[1].toFixed(7)}, ${point[2].toFixed(7)}.\nEstado del sector: ${statusAt(ramal,pk)}.${station?`\nReferencia más cercana: ${station.nombre}, km ${fmt(station.pk)} (${distance.toFixed(1).replace('.',',')} km).`:''}`,source:'PK y geometría cargados en Site Visión',actions:[{type:'map',label:'Ver en el mapa',ramal,pk,primary:true},{type:'copy',label:'Copiar coordenadas',value:`${point[1].toFixed(7)}, ${point[2].toFixed(7)}`} ]};}
function stationAnswer(station){const point=findRailPoint(station.ramal,station.pk);return {text:`${station.nombre}${station.codigo?` (${station.codigo})`:''}\nRamal ${station.ramal} · km ${fmt(station.pk)}.${station.referencia?`\nReferencia: ${station.referencia}.`:''}${point?`\nCoordenadas: ${point[1].toFixed(7)}, ${point[2].toFixed(7)}.`:''}`,source:'Estaciones incorporadas en Site Visión',actions:[{type:'map',label:'Ver en el mapa',ramal:station.ramal,pk:station.pk,primary:true}]};}
function derailmentFilters(q,ramal){const monthEntry=Object.entries(MONTHS).find(([name])=>q.includes(name));const numericMonth=q.match(/\bmes\s*(?:de\s*)?(0?[1-9]|1[0-2])\b/);const yearMatch=q.match(/\b(20\d{2})\b/);return {ramal,month:monthEntry?monthEntry[1]:(numericMonth?Number(numericMonth[1]):null),monthName:monthEntry?.[0]||null,year:yearMatch?Number(yearMatch[1]):null};}
function derailmentStats(rows,filters){const byRamal=rows.reduce((acc,item)=>(acc[item.ramal]=(acc[item.ramal]||0)+1,acc),{});const byMonth=rows.reduce((acc,item)=>{const key=String(item.fecha||'').slice(0,7);if(key)acc[key]=(acc[key]||0)+1;return acc;},{});const byCause=rows.reduce((acc,item)=>{const key=item.causa||item.tipo||'Sin causa informada';acc[key]=(acc[key]||0)+1;return acc;},{});const cause=Object.entries(byCause).sort((a,b)=>b[1]-a[1])[0];const delayComplete=rows.every(item=>item.demora_dias!==null&&item.demora_dias!==undefined&&item.demora_dias!==''&&Number.isFinite(Number(item.demora_dias)));const delayHours=rows.reduce((sum,item)=>sum+(Number.isFinite(Number(item.demora_dias))?Number(item.demora_dias)*24:0),0);const scope=[filters.ramal?`ramal ${filters.ramal}`:null,filters.monthName||null,filters.year||null].filter(Boolean).join(' · ')||'histórico completo';const ramalLine=Object.entries(byRamal).sort((a,b)=>b[1]-a[1]).map(([key,value])=>`${key}: ${value}`).join(' · ');const monthLine=!filters.month?Object.entries(byMonth).sort().map(([key,value])=>`${key}: ${value}`).join(' · '):'';return {text:`Estadísticas de descarrilos · ${scope}\nTotal: ${rows.length}.\nPor ramal: ${ramalLine||'sin datos'}.${monthLine?`\nPor mes: ${monthLine}.`:''}\nCausa más repetida: ${cause?`${cause[0]} (${cause[1]})`:'sin datos'}.\nDemora acumulada informada: ${delayComplete?delayHours.toFixed(1).replace('.',',')+' horas':'no disponible (registros incompletos)' }.`,source:'Cálculo sobre el histórico cargado en Site Visión · solo lectura'};}
function derailmentAnswer(ramal,q=''){const all=getData('DESCARRILOS')||[],filters=derailmentFilters(q,ramal);const rows=all.filter(item=>(!filters.ramal||item.ramal===filters.ramal)&&(!filters.month||Number(String(item.fecha||'').slice(5,7))===filters.month)&&(!filters.year||Number(String(item.fecha||'').slice(0,4))===filters.year));const scope=[ramal?`ramal ${ramal}`:null,filters.monthName||null,filters.year||null].filter(Boolean).join(' · ');if(!rows.length)return {text:`No hay descarrilos incorporados${scope?` para ${scope}`:''}.`,source:'Histórico de Site Visión'};const wantsStats=['estadistica','cantidad','cuantos','cuantas','total','resumen','porcentaje','promedio','distribucion'].some(term=>q.includes(term));if(wantsStats)return derailmentStats(rows,filters);const ordered=[...rows].sort((a,b)=>String(a.fecha).localeCompare(String(b.fecha)));const list=ordered.slice(0,8).map(item=>`${item.fecha||'Sin fecha'} · ${item.ramal} km ${fmt(item.pk)} · ${item.causa||item.tipo||'sin causa informada'}`).join('\n');return {text:`${rows.length} descarrilo${rows.length===1?'':'s'} registrado${rows.length===1?'':'s'}${scope?` · ${scope}`:''}:\n${list}${rows.length>8?`\n…y ${rows.length-8} más.`:''}`,source:'Histórico de descarrilos cargado en Site Visión',actions:[{type:'map',label:'Ver último en mapa',ramal:ordered[ordered.length-1].ramal,pk:ordered[ordered.length-1].pk,primary:true}]};}
function personnelAnswer(ramal){const traffic=(getData('PERSONAL_TRAFICO')||[]).filter(item=>!ramal||item.ramal===ramal);const track=(getData('PERSONAL_VIA')||[]).filter(item=>!ramal||item.ramal===ramal);const mechanics=(getData('PERSONAL_MECANICA')||[]).filter(item=>!ramal||item.ramal===ramal);const t=traffic.reduce((sum,item)=>sum+Number(item.uf||0)+Number(item.lf||0),0);const v=track.reduce((sum,item)=>sum+Number(item.capataz||0)+Number(item.operarios||0),0);const m=mechanics.reduce((sum,item)=>sum+Number(item.cantidad||0),0);return {text:`Personal ${ramal?`del ramal ${ramal}`:'incorporado en UP Salta'}:\nTráfico: ${t} · Vía: ${v} · Mecánica: ${m}.\nTotal consultable: ${t+v+m}.`,source:'Dotaciones cargadas en Site Visión · solo lectura'};}
function securityAnswer(ramal){const all=getData('DISPOSITIVO_SEGURIDAD')||[];const rows=all.filter(item=>!ramal||item.ramal===ramal);if(!rows.length)return {text:`No hay dispositivos de seguridad incorporados${ramal?` para el ramal ${ramal}`:''}.`,source:'Site Visión · solo lectura'};return {text:`${rows.length} dispositivo${rows.length===1?'':'s'} de seguridad${ramal?` en el ramal ${ramal}`:''}:\n${rows.slice(0,4).map(item=>`${item.localidad}: ${item.tipo}, ${item.objetivo} (${item.dispositivo})`).join('\n')}`,source:'Dispositivos cargados en Site Visión'};}
function clientAnswer(q){const clients=getData('CLIENTES')||[];const found=clients.filter(item=>q.includes(normalize(item.nombre)));const rows=found.length?found:clients;if(!rows.length)return {text:'No hay clientes incorporados para consultar.',source:'Site Visión · solo lectura'};return {text:`${found.length?found[0].nombre:`Clientes incorporados: ${rows.length}`}\n${rows.slice(0,5).map(item=>`${item.nombre}: ${item.producto||'producto sin informar'}`).join('\n')}`,source:'Clientes cargados en Site Visión'};}
function legacyAnswer(question){const q=normalize(question),ramal=ramalFrom(q),pk=pkFrom(q);if(q.includes('descarr'))return derailmentAnswer(ramal,q);if(hasAny(q,CLIMATE_WORDS))return {text:'Esta consulta corresponde a Clima Alert. Abrí ese módulo para consultar condiciones, pronósticos o alertas meteorológicas.',source:'Ámbitos separados por módulo',actions:[{type:'link',label:'Abrir Clima Alert',href:'/clima/',primary:true}]};if(hasAny(q,MUTATION_WORDS))return {text:'El asistente funciona únicamente en modo consulta. No puede crear, modificar ni eliminar datos de Site Visión.',source:'Acceso de solo lectura'};if(!q||q==='hola'||q.includes('ayuda')||q.includes('que podes'))return helpAnswer();if((q.includes('ramales')||q.includes('red up salta'))&&!ramal)return networkAnswer();if(pk!=null&&!ramal)return {text:'Para ubicar ese PK indicame también el ramal, por ejemplo: “C15 km 1400,400”.',source:'Localizador de Site Visión'};if(pk!=null&&ramal)return pkAnswer(ramal,pk);if(q.includes('personal')||q.includes('dotacion'))return personnelAnswer(ramal);if(q.includes('seguridad')||q.includes('vigilancia')||q.includes('policia'))return securityAnswer(ramal);if(q.includes('cliente')||q.includes('producto'))return clientAnswer(q);if(q.includes('estadistica')||q.includes('cuantos accidentes'))return derailmentAnswer(ramal,`${q} descarrilos`);const station=stationMatch(q);if(station&&(q.includes('estacion')||q.includes('codigo')||q.split(' ').length<=4))return stationAnswer(station);if(ramal)return ramalDescription(ramal);return {text:'No encontré esa información dentro de los datos ferroviarios cargados. Puedo consultar ramales y estados, PK y coordenadas, estaciones y códigos, descarrilos, estadísticas, personal, seguridad o clientes.',source:'Asistente Site Visión · sin respuestas inventadas'};}

function isWeather(q){return hasAny(q,CLIMATE_WORDS)||/\b(?:que|como).*tiempo.*(?:hoy|manana)|\bva a llover\b/.test(q);}
const REGISTRY_NOTICE='El registro de Site Visión acredita el trámite incorporado, pero no permite determinar por sí solo si la obra fue ejecutada o continúa activa.';
const REGISTRY_CATEGORIES=['cruces','interferencias'];
const SERVICE_WORDS=/interferencia|servicio|subterrane|aere[oa]|hidraulic|paralel|cruzante|solicitante|contratista|prefactibilidad|asesoramiento|permiso|alcantarilla|\bcanal\b|\bgas\b|\bagua\b|cloacal|fibra optica|\bfo\b|electric/;
const CROSSING_WORDS=/cruce|pasos? a nivel|barrera|particular|rutas? cruzan/;
const TECH_FIELDS=['conductor','camisa','unidad','valor','tapada','altura','angulo','angulo2','ductos','otrasCaracteristicas'];
const REF_FIELDS=['carpeta','convenio','carpetaGAL','cajaArchivo'];
const CATEGORY_LABELS={aereo:'Aéreo',subterraneo:'Subterráneo',hidraulico:'Hidráulico',sin_clasificar:'Sin clasificación'};
const CROSSING_TYPES={a_nivel_pasivo:'A nivel pasivo',a_nivel_barreras:'A nivel con barreras',a_nivel_fonoluminoso:'A nivel fonoluminoso',alto_nivel:'Alto nivel',bajo_nivel:'Bajo nivel'};
function registryCategories(q){
 const service=SERVICE_WORDS.test(q),cross=CROSSING_WORDS.test(q);
 return [...(cross&&(!service||/habilitad|barrera|pasos? a nivel|compar/.test(q))?['cruces']:[]),...(service?['interferencias']:[])];
}
function registryDistance(r,pk,category){
 if(!Number.isFinite(pk))return null;
 const tramo=category==='interferencias'&&Number.isFinite(r.pkDesde)&&Number.isFinite(r.pkHasta);
 const target=tramo?Math.max(Math.min(r.pkDesde,r.pkHasta),Math.min(Math.max(r.pkDesde,r.pkHasta),pk)):Number.isFinite(r.pk)?r.pk:null;
 return target===null?null:{distance:Math.abs(target-pk)*1000,direction:target>pk?'ascendente':target<pk?'descendente':null};
}
function registryRows(category,q,ramal,pk){
 const source=category==='cruces'?'CRUCES_HABILITADOS':'INTERFERENCIAS_UP_SALTA',raw=getData(source);
 let rows=Array.isArray(raw)?raw.filter(r=>!ramal||(category==='cruces'?r.ramal===ramal:r.ramales?.includes(ramal))):[];
 if(category==='cruces'){
  if(/barrera/.test(q))rows=rows.filter(r=>r.tipo==='a_nivel_barreras');
  if(/particular/.test(q))rows=rows.filter(r=>r.ambito==='particular');
  if(/public[oa]/.test(q))rows=rows.filter(r=>r.ambito==='publico');
  if(/rutas? cruzan|que rutas?/.test(q))rows=rows.filter(r=>r.ruta);
 }else{
  for(const [pattern,value] of [[/subterrane/,'subterraneo'],[/aere[oa]/,'aereo'],[/hidraulic/,'hidraulico'],[/sin clasifica/,'sin_clasificar']])if(pattern.test(q))rows=rows.filter(r=>r.categoria===value);
  if(/paralel/.test(q))rows=rows.filter(r=>['paralelo','cruzante y paralelo'].includes(r.disposicion));
  if(/cruzante/.test(q))rows=rows.filter(r=>['cruzante','cruzante y paralelo'].includes(r.disposicion));
  for(const [pattern,value] of [[/permiso/,'permiso'],[/prefactibilidad/,'prefactibilidad'],[/asesoramiento/,'asesoramiento'],[/otros tramites/,'otros tramites'],[/no derivad/,'no derivado por legales / inmuebles']])if(pattern.test(q))rows=rows.filter(r=>r.tramite===value);
  for(const pattern of [/\bgas\b/,/\bagua\b/,/cloacal/,/electric/,/\bcanal\b/,/alcantarilla/])if(pattern.test(q))rows=rows.filter(r=>pattern.test(normalize(r.conduccionOriginal)));
  if(/fibra optica|\bfo\b/.test(q))rows=rows.filter(r=>/\bfo\b/.test(normalize(r.conduccionOriginal)));
  for(const [word,field] of [['solicitante','solicitante'],['contratista','contratista'],['localidad','localidad']]){
   const match=q.match(new RegExp('\\b'+word+'\\s+(?:es\\s+)?(.+?)(?=\\s+(?:en\\s+)?(?:ramal\\b|c(?:13|14|15|16|18|25)?\\b|pk\\b|km\\b)|$)'));
   if(match&&!/^(de|del|tiene|figura|registrad|y)\b/.test(match[1]))rows=rows.filter(r=>normalize(r[field]).includes(match[1]));
  }
  // Names already present in the source can be queried without a field prefix.
  for(const field of ['solicitante','contratista','localidad','denominacionObra']){
   const names=[...new Set((Array.isArray(raw)?raw:[]).map(r=>normalize(r[field]||'')).filter(n=>n.length>3&&q.includes(n)&&!(field==='localidad'&&n==='salta')))];
   if(names.length)rows=rows.filter(r=>names.includes(normalize(r[field]||'')));
  }
 }
 if(Number.isFinite(pk))rows=rows.filter(r=>registryDistance(r,pk,category)!==null).sort((a,b)=>registryDistance(a,pk,category).distance-registryDistance(b,pk,category).distance||(a.pk??a.pkDesde??0)-(b.pk??b.pkDesde??0)||(a.id??0)-(b.id??0));
 return {raw,source,rows};
}
function registrySummary(category,rows){
 const counts=field=>Object.entries(rows.reduce((a,r)=>{const key=r[field]??'No informado';a[key]=(a[key]||0)+1;return a;},{})).map(([k,n])=>`${CATEGORY_LABELS[k]||k}: ${n}`).join(' · ');
 return category==='cruces'?`Por ramal: ${counts('ramal')}`:`Por trámite: ${counts('tramite')}\nPor categoría: ${counts('categoria')}`;
}
function registryLocation(r,category){
 if(category==='cruces')return `Ramal ${r.ramal} · PK ${fmt(r.pk)}`;
 const tramo=Number.isFinite(r.pkDesde)&&Number.isFinite(r.pkHasta);
 return `Ramal ${r.ramalOriginal} · `+[Number.isFinite(r.pk)?`PK ${fmt(r.pk)}`:null,tramo?`Tramo PK ${fmt(r.pkDesde)} a ${fmt(r.pkHasta)}`:null,!Number.isFinite(r.pk)&&!tramo?'Sin PK suficiente':null].filter(Boolean).join(' · ');
}
function registryLine(r,category,pk,q){
 const near=registryDistance(r,pk,category);
 const proximity=near?near.direction?`A ${Math.round(near.distance)} m hacia progresiva ${near.direction}`:'Coincide con el PK o tramo consultado':null;
 if(category==='cruces')return [registryLocation(r,category),r.ambito==='publico'?'Público':r.ambito==='particular'?'Particular':null,CROSSING_TYPES[r.tipo]||r.tipo,[r.calle,r.ruta].filter(Boolean).join(' · '),proximity].filter(Boolean).join(' · ');
 const fields=[['Localidad',r.localidad],['Provincia',r.provincia],['Calle',r.calle],['Solicitante',r.solicitante],['Contratista',r.contratista],['Obra',r.denominacionObra]];
 const tech=r.tecnico||{};
 const technical=Object.entries({conductor:'Conductor',camisa:'Camisa',tapada:'Tapada',altura:'Altura',angulo:'Ángulo',angulo2:'Ángulo 2',ductos:'Ductos',otrasCaracteristicas:'Otras características'}).map(([k,label])=>[label,tech[k]]);
 if(tech.valor!=null)technical.push(['Valor',`${tech.valor} ${tech.unidad==='Kv'?'kV':tech.unidad||''}`.trim()]);else if(tech.unidad)technical.push(['Unidad',tech.unidad]);
 const refs=/referencia administrativa|carpeta|convenio|caja|archivo/.test(q)?Object.entries(r.referencia||{}):[];
 return [registryLocation(r,category),`${CATEGORY_LABELS[r.categoria]||r.categoria} · ${r.conduccionOriginal||'Conducción no informada'} · ${r.disposicion||'Disposición no informada'}`,`Trámite: ${r.tramite}`,proximity,...[...fields,...technical,...refs,['Observaciones',r.observaciones]].filter(([,v])=>v!==null&&v!==undefined&&v!=='').map(([k,v])=>`${k}: ${v}`)].filter(Boolean).join('\n');
}
function registryAnswer(question,context){
 const q=normalize(question),categories=context.categories.filter(c=>REGISTRY_CATEGORIES.includes(c));
 if(!categories.length)return null;
 if(categories.includes('interferencias')&&/construid|ejecutad|activa|en servicio|constatad/.test(q))return {text:REGISTRY_NOTICE,source:'INTERFERENCIAS_UP_SALTA · registros de trámites',context,localOnly:true};
 if(context.pk!==null&&!context.ramal)return {text:'Indicame el ramal para buscar el registro más próximo a ese PK.',source:'Site Visión · consulta interna',context,localOnly:true};
 const blocks=[];
 for(const category of categories){
  const {raw,rows}=registryRows(category,q,context.ramal,context.pk),title=category==='cruces'?'Cruces habilitados':'Interferencias / Servicios';
  if(!Array.isArray(raw)){blocks.push(`${title}: dataset no disponible.`);continue;}
  if(!rows.length){blocks.push(`${title}: 0 registros coincidentes con la consulta.`);continue;}
  if(context.pk!==null){
   const best=registryDistance(rows[0],context.pk,category).distance;
   const nearest=rows.filter(r=>Math.abs(registryDistance(r,context.pk,category).distance-best)<1e-6);
   const tolerance=window.CrucesHabilitados?.TOLERANCIA_COINCIDENCIA_M??1;
   const heading=category==='cruces'?(best<=tolerance+1e-6?'Cruce habilitado en este sector':'Cruce habilitado más próximo'):(best<=1+1e-6?'Interferencia registrada en este sector':'Interferencia registrada más próxima');
   blocks.push(`${title}:\n${heading}${nearest.length>1?` · ${nearest.length} registros` :''}\n${nearest.map(r=>registryLine(r,category,context.pk,q)).join('\n\n')}`);
  }else{
   const summaryOnly=/cuant|total|resumen|compar|informacion/.test(q)||categories.length>1;
   blocks.push(`${title}${context.ramal?' · Ramal '+context.ramal:''}: ${rows.length} registros.\n${registrySummary(category,rows)}${summaryOnly?'':'\n'+rows.slice(0,8).map(r=>registryLine(r,category,null,q)).join('\n\n')+(rows.length>8?`\nSe muestran 8 de ${rows.length} registros; ${rows.length-8} omitidos.`:'')}`);
  }
 }
 if(context.categories.includes('red')&&context.ramal&&context.pk!==null){const station=nearestStation(context.ramal,context.pk);if(station)blocks.push(`Estaciones: referencia más próxima ${station.nombre}, PK ${fmt(station.pk)}.`);}
 else for(const [category,sets] of Object.entries(context.datasets))if(!REGISTRY_CATEGORIES.includes(category))blocks.push(`${category}: ${sets.map(d=>`${d.source}: ${d.total} registros`).join(' · ')}.`);
 if(categories.includes('interferencias'))blocks.push(REGISTRY_NOTICE);
 return {text:blocks.join('\n\n'),source:'Site Visión · '+categories.map(c=>c==='cruces'?'CRUCES_HABILITADOS':'INTERFERENCIAS_UP_SALTA').join(' / '),context,localOnly:true};
}
function contextValue(value){
 if(typeof value==='string')return isWeather(normalize(value))||/clima|meteo|pronostic|rafaga|lluvia|viento|temperatura|humedad|tormenta/.test(normalize(value))?null:value.slice(0,800);
 if(value===null||typeof value==='boolean'||typeof value==='number')return value;
 if(Array.isArray(value))return value.slice(0,50).map(contextValue);
 return null;
}
const CONTEXT_FIELDS={
 estaciones:['nombre','codigo','ramal','pk','referencia'],
 personal:['localidad','nombre','ramal','pk','uf','lf','capataz','operarios','cantidad'],
 seguridad:['localidad','ramal','pk','tipo','objetivo','dispositivo'],
 descarrilos:['fecha','ramal','pk','causa','tipo','demora_dias'],
 clientes:['nombre','ramal','pk','producto'],
 cruces:['ramal','pk','ambito','tipo','calle','ruta'],
 interferencias:['id','tramite','ramalOriginal','ramales','pk','pkDesde','pkHasta','localidad','calle','provincia','solicitante','contratista','disposicion','conduccionOriginal','categoria','denominacionObra','observaciones','tecnico','referencia']
};
function classifySiteQuery(question) {
 const q=question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 if(isWeather(q))return 'clima';
 if(registryCategories(q).length)return 'interna';
 const history=/histori|construy|construccion|inaugur|cuando llego.*ferrocarril/.test(q);
 const technical=/riel|trocha|normativa ferroviaria|norma ferroviaria|reglamento ferroviario/.test(q)&&/caracteristic|diferencia|que es|tecnic|normativ|norma|reglamento/.test(q);
 const internal=/cargad|site vision|personal|dotacion|dispositivo|seguridad|\bpk\b|estado operativo/.test(q);
 return history||technical?(internal?'mixta':history?'historia':'tecnica'):'interna';
}

function contextFor(question){
 const q=normalize(question),explicit=ramalFrom(q);
 const follow=!explicit&&/^(y |cual |cuanto tiempo|cuantas? son|cuantos? son|que sector|esos |esas |esta construid|esta ejecutad|sigue activa|sigue en servicio)/.test(q);
 const previous=state.context;
 const ramal=explicit||(follow?previous?.ramal:null)||null;
 const pk=pkFrom(q)??(follow?previous?.pk:null)??null;
 let intent=/mas atencion|prioriz/.test(q)?'priorizacion':/riesgo|inconsisten|contradic/.test(q)?'riesgo':/compar|diferencia/.test(q)?'comparacion':/cuant|total|promedio|porcentaje|estadistic/.test(q)?'calculo':/analiz|por que|criterio/.test(q)?'analisis':/informacion|resumen/.test(q)?'resumen':follow?'seguimiento':'factual';
 let categories=registryCategories(q);
 if(/personal|dotacion/.test(q))categories.push('personal');
 if(/seguridad|vigilancia|policia/.test(q))categories.push('seguridad');
 if(/descarr|accidente/.test(q)||(!categories.length&&/estadistic/.test(q)))categories.push('descarrilos');
 if(/estacion|codigo/.test(q))categories.push('estaciones');
 if(/cliente|producto/.test(q))categories.push('clientes');
 if(/infraestructura|instalacion/.test(q))categories.push('infraestructura');
 if(!categories.length)categories=follow&&previous?previous.categories:((pk!==null||/estado|rango|inactiv|estacion|codigo/.test(q))?(/registrad|que hay|cerca/.test(q)?['red','estaciones','cruces','interferencias']:['red']):['red','estaciones','personal','seguridad','descarrilos','clientes','infraestructura','cruces','interferencias']);
 const datasets={};
 const sources={estaciones:['STATIONS'],personal:['PERSONAL_TRAFICO','PERSONAL_VIA','PERSONAL_MECANICA'],seguridad:['DISPOSITIVO_SEGURIDAD'],descarrilos:['DESCARRILOS'],clientes:['CLIENTES'],cruces:['CRUCES_HABILITADOS'],interferencias:['INTERFERENCIAS_UP_SALTA']};
 for(const category of categories){
  if(category==='red'||category==='infraestructura')continue;
  datasets[category]=sources[category].map(source=>{
   const raw=getData(source);
   if(REGISTRY_CATEGORIES.includes(category)){
    const {rows}=registryRows(category,q,ramal,pk);
    return {source,status:!Array.isArray(raw)?'no disponible':rows.length?'registros disponibles':'sin registros coincidentes',total:rows.length,omitted:Math.max(0,rows.length-12),summary:contextValue(registrySummary(category,rows)),records:rows.slice(0,12).map(r=>Object.fromEntries(CONTEXT_FIELDS[category].map(k=>[k,k==='tecnico'||k==='referencia'?Object.fromEntries((k==='tecnico'?TECH_FIELDS:REF_FIELDS).map(field=>[field,contextValue(r[k]?.[field]??null)])):contextValue(r[k]??null)])))};
   }
   let rows=Array.isArray(raw)?raw.filter(r=>!ramal||r.ramal===ramal):[];
   if(category==='descarrilos'){const f=derailmentFilters(q,ramal);rows=rows.filter(r=>(!f.month||Number(String(r.fecha).slice(5,7))===f.month)&&(!f.year||Number(String(r.fecha).slice(0,4))===f.year));}
   return {source,status:!Array.isArray(raw)?'no disponible':rows.length?'registros disponibles':'sin registros coincidentes; no equivale a cero',total:rows.length,omitted:Math.max(0,rows.length-12),records:rows.slice(0,12).map(r=>Object.fromEntries(CONTEXT_FIELDS[category].map(k=>[k,typeof r[k]==='string'&&isWeather(normalize(r[k]))?null:r[k]??null])))};
  });
 }
 const meta=ramal?getData('NETWORK')?.[ramal]:null;
 const context={schema:'site-v1',ramal,pk,intent,categories,previousIntent:follow?previous?.intent||null:null,entities:follow?previous?.entities||[]:[],red:meta?{nombre:meta.nombre??null,km_inicio:meta.km_inicio,km_fin:meta.km_fin,estado:RAMAL_STATUS[ramal]||null,source:'NETWORK / RAMAL_STATUS; configuración sin fecha de vigencia'}:null,datasets,missing:['Fecha de vigencia no informada','Fecha de inicio de inactividad no disponible',...(categories.includes('infraestructura')?['Inventario de infraestructura no conectado al asistente']:[])]};
 // Keep exact summaries while reducing samples, never the complete-dataset totals.
 while(JSON.stringify(context).length>23000){const largest=Object.values(datasets).flat().filter(d=>d.records.length).sort((a,b)=>JSON.stringify(b.records).length-JSON.stringify(a.records).length)[0];if(!largest)break;largest.records.pop();largest.omitted=largest.total-largest.records.length;}
 state.context={ramal,pk,intent,categories,entities:[...new Set(Object.values(datasets).flat().flatMap(d=>d.records.map(r=>r.localidad||r.nombre).filter(Boolean)))].slice(0,12)};
 return context;
}
function answer(question){
 const q=normalize(question);
 if(isWeather(q))return {text:'Esa información corresponde al módulo Clima Alert.',source:'Ámbitos separados por módulo',blocked:true};
 if(hasAny(q,MUTATION_WORDS))return {...legacyAnswer(question),blocked:true};
 if(!q||q==='hola'||q.includes('ayuda')||q.includes('que podes'))return legacyAnswer(question);
 const route=classifySiteQuery(question);
 const context=(route==='historia'||route==='tecnica')?{schema:'site-v1',ramal:ramalFrom(q)||state.context?.ramal||null,pk:null,intent:route,categories:[],entities:[],red:null,datasets:{},missing:[]}:contextFor(question);
 if(route==='historia'||route==='tecnica')return {text:'No tengo información pública verificada suficiente para responder esta consulta.',source:'Consulta pública pendiente',context};
 const registry=registryAnswer(question,context);if(registry)return registry;
 const scoped=context.ramal&&!ramalFrom(q)?question+' ramal '+context.ramal:question;
 let local=legacyAnswer(scoped)||{text:'No tengo información suficiente para determinarlo.',source:'Site Visión'};
 const multi=context.categories.length>1;
 if((multi||/personal/.test(q)||context.intent!=='factual')&&!/descarr|estadistic|accidente/.test(q)){
  const lines=Object.entries(context.datasets).map(([category,sets])=>`${category}: ${sets.map(d=>`${d.source}: ${d.status}${d.total?' ('+d.records.length+' de '+d.total+' registros; '+d.omitted+' omitidos)':''}`).join('; ')}`);
  local={text:`${context.ramal?'Ramal '+context.ramal+'.\n':''}${context.red?'Rango registrado: '+fmt(context.red.km_inicio)+'–'+fmt(context.red.km_fin)+' km.\n':''}${lines.join('\n')}\n${['priorizacion','riesgo'].includes(context.intent)?'No tengo información suficiente para determinar qué sector requiere más atención con fundamento.':'Los registros sin fecha de vigencia no permiten afirmar el estado actual.'}`,source:'Registros de Site Visión; resumen local'};
 }
 if(/estadistic|descarr|accidente/.test(q)&&(!Array.isArray(getData('DESCARRILOS'))||!getData('DESCARRILOS').length))local={text:'No tengo información suficiente para determinarlo: histórico no disponible o sin registros.',source:'Site Visión'};
 if(/cuanto tiempo.*inactiv/.test(q))local={text:'No tengo información suficiente para determinarlo: no está registrada la fecha de inicio de inactividad.',source:'Site Visión'};
 return {...local,context};
}

function helpAnswer(){return {text:'Puedo consultar los datos ya incorporados en Site Visión:\n• estado y rango de ramales\n• PK y coordenadas\n• estaciones y códigos telegráficos\n• descarrilos por mes, año o ramal\n• estadísticas del histórico\n• personal, seguridad y clientes\n• cruces habilitados: conteos, rutas y proximidad por PK\n• interferencias y servicios: trámites, conducción, tramos y datos técnicos\nLas interferencias son registros de trámites; no acreditan ejecución ni servicio activo.\nNo modifico ningún dato.',source:'Asistente ferroviario privado · solo lectura'};}
function addMessage(role,result){const messages=document.getElementById('sv-assistant-messages');if(!messages)return;const row=document.createElement('div');row.className=`sv-assistant-row ${role}`;if(role==='bot'){const avatar=document.createElement('span');avatar.className='sv-assistant-avatar';avatar.textContent='S';row.appendChild(avatar);}const bubble=document.createElement('div');bubble.className='sv-assistant-bubble';bubble.textContent=typeof result==='string'?result:result.text;if(result?.source){const source=document.createElement('span');source.className='sv-assistant-source';source.textContent=result.source;bubble.appendChild(source);}if(result?.actions?.length){const actions=document.createElement('div');actions.className='sv-assistant-actions';result.actions.forEach(action=>{const control=action.type==='link'?document.createElement('a'):document.createElement('button');control.className=`sv-assistant-action${action.primary?' primary':''}`;control.textContent=action.label;if(action.type==='link')control.href=action.href;else{control.type='button';control.addEventListener('click',()=>runAction(action));}actions.appendChild(control);});bubble.appendChild(actions);}if(result?.sources?.length){const refs=document.createElement('div');result.sources.forEach((item,i)=>{if(!/^https:\/\//.test(item.uri))return;const a=document.createElement('a');a.href=item.uri;a.target='_blank';a.rel='noopener noreferrer';a.textContent=`[${i+1}] ${item.title}`;refs.appendChild(a);refs.appendChild(document.createElement('br'));});bubble.appendChild(refs);}if(result?.searchSuggestions){const frame=document.createElement('iframe');frame.title='Sugerencias de Google Search';frame.setAttribute('sandbox','allow-popups allow-popups-to-escape-sandbox');frame.style.width='100%';frame.style.border='0';frame.style.height='160px';frame.srcdoc=result.searchSuggestions;bubble.appendChild(frame);}row.appendChild(bubble);messages.appendChild(row);messages.scrollTop=messages.scrollHeight;}
async function runAction(action){if(action.type==='copy'){try{await navigator.clipboard.writeText(action.value);addMessage('bot',{text:'Coordenadas copiadas.',source:'Site Visión'});}catch(_){addMessage('bot',{text:action.value,source:'Copiá estas coordenadas manualmente'});}return;}if(action.type==='map'){const selector=document.getElementById('ramal'),input=document.getElementById('km');if(selector&&input){selector.value=action.ramal;selector.dispatchEvent(new Event('change',{bubbles:true}));input.value=fmt(action.pk);const search=getData('buscar');if(typeof search==='function')search();close();document.getElementById('map')?.scrollIntoView({behavior:'smooth',block:'center'});}}}
function open(){const panel=document.getElementById('sv-assistant-panel'),launcher=document.getElementById('sv-assistant-launcher');panel?.classList.add('open');panel?.setAttribute('aria-hidden','false');launcher?.setAttribute('aria-expanded','true');if(!state.welcomed){state.welcomed=true;addMessage('bot',{text:'Hola. Consulto únicamente los datos ferroviarios cargados en Site Visión y siempre en modo de solo lectura.',source:'Asistente Site Visión'});}setTimeout(()=>document.getElementById('sv-assistant-input')?.focus(),80);}
function close(){const panel=document.getElementById('sv-assistant-panel'),launcher=document.getElementById('sv-assistant-launcher');panel?.classList.remove('open');panel?.setAttribute('aria-hidden','true');launcher?.setAttribute('aria-expanded','false');}
async function submit(event){event.preventDefault();const input=document.getElementById('sv-assistant-input');const question=input?.value.trim();if(!question||state.busy)return;input.value='';addMessage('user',question);state.busy=true;input.disabled=true;const placeholder=input.placeholder;input.placeholder='Consultando…';try{const local=answer(question);let result=local;try{if(!local.localOnly){const ai=await import('/assistant-reasoning.js');result=await ai.analyze('site',question,local);}}catch(_){result={...local,source:local.source+' · Respaldo local'};}addMessage('bot',result);}finally{state.busy=false;input.disabled=false;input.placeholder=placeholder;}}
function build(){const root=document.createElement('div');root.id='sv-assistant-root';root.innerHTML='<button class="sv-assistant-launcher" id="sv-assistant-launcher" type="button" aria-label="Abrir asistente Site Visión" aria-controls="sv-assistant-panel" aria-expanded="false">S<span class="sv-assistant-live" aria-hidden="true"></span></button><section class="sv-assistant-panel" id="sv-assistant-panel" aria-label="Asistente ferroviario Site Visión" aria-hidden="true"><header class="sv-assistant-header"><div class="sv-assistant-mark" aria-hidden="true">S</div><div><div class="sv-assistant-title">Asistente Site Visión</div><div class="sv-assistant-status">Datos ferroviarios · solo lectura</div></div><button class="sv-assistant-close" type="button" aria-label="Cerrar asistente">×</button></header><div class="sv-assistant-messages" id="sv-assistant-messages" aria-live="polite"></div><div class="sv-assistant-suggestions"><button class="sv-assistant-suggestion" type="button">Estado de los ramales</button><button class="sv-assistant-suggestion" type="button">C15 km 1400,400</button><button class="sv-assistant-suggestion" type="button">Estación SLA</button><button class="sv-assistant-suggestion" type="button">Descarrilos de febrero</button><button class="sv-assistant-suggestion" type="button">Estadísticas de descarrilos</button></div><form class="sv-assistant-form" id="sv-assistant-form"><input class="sv-assistant-input" id="sv-assistant-input" maxlength="180" autocomplete="off" placeholder="Ej.: C15 km 1400,400" aria-label="Consulta ferroviaria"><button class="sv-assistant-send" type="submit" aria-label="Enviar consulta">➤</button></form></section>';document.body.appendChild(root);root.querySelector('#sv-assistant-launcher').addEventListener('click',()=>root.querySelector('#sv-assistant-panel').classList.contains('open')?close():open());root.querySelector('.sv-assistant-close').addEventListener('click',close);root.querySelector('#sv-assistant-form').addEventListener('submit',submit);root.querySelectorAll('.sv-assistant-suggestion').forEach(button=>button.addEventListener('click',()=>{open();const input=root.querySelector('#sv-assistant-input');input.value=button.textContent;submit({preventDefault(){}});}));}
window.SiteVisionAssistant=Object.freeze({answer});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build);else build();
})();
