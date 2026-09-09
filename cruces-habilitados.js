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
 root.CrucesHabilitados=Object.freeze({masProximo,mostrar,TOLERANCIA_COINCIDENCIA_M});
})(window);
