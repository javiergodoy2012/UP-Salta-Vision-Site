# Razonamiento Site Visión — integración pendiente de despliegue

Función nueva en el proyecto Firebase existente, codebase `sitevision-ai`.
No reemplaza las funciones del monitor ni modifica reglas Firestore.

Estado: implementación inicial; NO validada aún contra Vertex AI real.
El modelo inicial es `gemini-2.5-flash`, configurable con `SITEVISION_AI_MODEL`.
Disponibilidad documental verificada el 7/9/2026; falta prueba en el proyecto.
Google informa retiro el 20/10/2026: migrar y validar antes de esa fecha.
No hay clave de IA en el frontend.

Preparación pendiente en Cloud Shell:
1. Confirmar el modelo y la cuenta de servicio del runtime.
2. Habilitar aiplatform.googleapis.com y otorgar a esa cuenta solo el rol necesario
   para inferencia de Vertex AI. No usar credenciales personales en el frontend.
3. Instalar con `npm ci` dentro de functions-ai usando Node 22.
4. Desplegar exclusivamente con `firebase deploy --config firebase.ai.json --only functions:sitevision-ai --project up-salta-vision` desde la raíz.
5. Probar autenticación, cuenta pendiente, cuotas, error de proveedor y ambos módulos.
6. Publicar frontend solo después de comprobar el endpoint.

Límites iniciales: 20 intentos/hora y 60/día por usuario; 300/día global UTC.
Estos límites NO son un límite monetario para el proyecto completo.
La colección usoAsistenteIA requiere denegación de acceso directo de clientes;
la copia de reglas revisada no concede acceso a ella. Verificar reglas productivas.

La IA recibe solo el extracto generado por el motor local. No recibe datasets
completos: un listado truncado no permite estadísticas globales. La ampliación de
consultas y agregaciones deterministas sigue pendiente para análisis profundos.
Los extractos del cliente no son evidencia certificada por el servidor.
No se persisten preguntas ni respuestas. No se envían identidades, tokens Push ni
geometrías. La pregunta libre no debe contener datos personales ni credenciales.
Endpoint global: no garantiza procesamiento dentro de Argentina.

Pruebas locales: `node scripts/test-assistant-reasoning.mjs`.
