# Clima Alert · Acumulados de precipitación · V5 técnica

Estado: **borrador técnico, sin deploy y sin integración con producción**.

## Objetivo

Construir un histórico diario para las 23 localidades actuales de Clima Alert y calcular desde ese histórico:

- 24 h
- 72 h
- 7 días
- mes actual

El histórico **no debe mezclar pronóstico con observado**.

## Flujo propuesto

1. Una Cloud Function independiente corre diariamente.
2. Consulta Open-Meteo para el **día anterior** con `daily=precipitation_sum`.
3. Guarda un documento por localidad y fecha.
4. El ID es idempotente: `<localidadId>_<YYYY-MM-DD>_openmeteo`.
5. Clima Alert consulta esos documentos y calcula acumulados en lectura.

## Firestore

Colección propuesta:

`precipitacionesDiarias`

Documento ejemplo:

```json
{
  "localidadId": "salta-capital",
  "localidad": "Salta Capital",
  "provincia": "Salta",
  "ramal": "C13",
  "fecha": "2026-09-30",
  "precipitacionMm": 6.1,
  "fuente": "open-meteo",
  "tipo": "historico_modelado",
  "estado": "consolidado",
  "actualizado": "serverTimestamp"
}
```

## Lectura preparada

Archivo:

`clima/acumulados/precipitacion-historica.js`

Expone:

`window.ClimaRainHistory`

Métodos principales:

- `cargarRango({desde,hasta})`
- `cargarResumen({referencia})`
- `acumuladosLocalidad(registros, localidadId, referencia)`
- `limpiarCache()`

La lectura usa la instancia Firebase compat que ya utiliza Clima Alert:

`firebase.app().firestore()`

Para evitar consultas innecesarias, mantiene caché local de 5 minutos.

### Decisión de consulta

El adaptador consulta por rango de `fecha` y agrupa por localidad en cliente. Con 23 localidades y un horizonte mensual, el volumen esperado es pequeño y se evita depender inicialmente de índices compuestos adicionales.

## Integración futura en la UI

La V3 visual debe reemplazar su `localStorage` por:

```js
const resumen = await ClimaRainHistory.cargarResumen();
```

Con ese objeto se pueden alimentar:

- 24 h
- 72 h
- 7 días
- mes actual
- ranking por localidad
- ranking por ramal
- histórico detallado

El pronóstico actual de Clima Alert debe seguir leyendo sus fuentes actuales y mostrarse separado.

## Reglas de diseño

- No modificar `monitorClimaAlert`.
- No tocar alertas, push, umbrales ni pronóstico actual.
- No guardar acumulados derivados: se calculan desde el histórico diario.
- Mantener pronóstico y observado en bloques separados.
- No desplegar esta versión.
- No modificar `clima/index.html` hasta validar el backend y la lectura.
