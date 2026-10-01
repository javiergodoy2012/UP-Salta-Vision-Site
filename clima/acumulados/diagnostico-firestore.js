/**
 * Clima Alert · Diagnóstico Firestore V5
 * No escribe datos. Solo comprueba:
 * - Firebase disponible
 * - usuario autenticado
 * - acceso a precipitacionesDiarias
 * - cantidad de documentos visibles
 * - esquema mínimo de muestra
 */
(function(global){
  'use strict';

  const COLLECTION='precipitacionesDiarias';
  const REQUIRED=['localidadId','localidad','ramal','fecha','precipitacionMm','fuente','tipo','estado'];

  async function run(){
    const report={
      firebaseDisponible:false,
      usuarioAutenticado:false,
      uid:null,
      lecturaPermitida:false,
      documentos:0,
      esquemaValido:null,
      faltantes:[],
      muestra:null,
      error:null
    };

    try{
      if(!global.firebase?.app) throw new Error('Firebase no está disponible');
      report.firebaseDisponible=true;

      const app=global.firebase.app();
      const user=app.auth?.().currentUser||null;
      report.usuarioAutenticado=Boolean(user);
      report.uid=user?.uid||null;

      const snap=await app.firestore().collection(COLLECTION).limit(3).get();
      report.lecturaPermitida=true;
      report.documentos=snap.size;

      if(!snap.empty){
        const first=snap.docs[0];
        const data=first.data()||{};
        report.muestra={id:first.id,...data};
        report.faltantes=REQUIRED.filter(k=>!(k in data));
        report.esquemaValido=report.faltantes.length===0;
      }

      return report;
    }catch(error){
      report.error={
        code:String(error?.code||''),
        message:String(error?.message||error)
      };
      return report;
    }
  }

  global.ClimaRainDiagnostics=Object.freeze({run});
})(window);
