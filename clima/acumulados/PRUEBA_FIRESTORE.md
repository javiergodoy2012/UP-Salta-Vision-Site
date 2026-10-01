# Prueba real de Firestore · Acumulados V5

## Antes de escribir

1. Mantener la rama `feature/clima-acumulados-precipitacion-futuro`.
2. Incorporar en las reglas activas de Firestore el fragmento de solo lectura para usuarios aprobados.
3. No modificar `monitorClimaAlert`.
4. Ejecutar primero el backfill en **DRY RUN**.

## Backfill inicial sugerido

```bash
node clima/acumulados/backfill-precipitacion-historica.js --days=31
```

Debe terminar con:

- 23 localidades procesadas;
- sin errores;
- `written: 0`.

Recién después:

```bash
node clima/acumulados/backfill-precipitacion-historica.js --days=31 --write
```

Máximo esperado para 31 días: **713 documentos** (23 × 31), salvo días ausentes en la fuente.

## Validaciones Firestore

Colección:

`precipitacionesDiarias`

Comprobar al menos:

- documento `salta-capital_<fecha>`;
- `tipo = historico_modelado`;
- `estado = consolidado`;
- `fuente = open-meteo`;
- `precipitacionMm` numérico;
- ausencia de duplicados por localidad/fecha.

## Validación UI

Con una cuenta aprobada:

1. Abrir Clima Alert de la rama de prueba.
2. Entrar a **🌧️ Acumulados**.
3. Confirmar indicador **FIRESTORE · HISTÓRICO**.
4. Revisar Salta Capital en 24 h / 72 h / 7 días / mes.
5. Cambiar de ramal y localidad.
6. Pulsar **Actualizar**.
7. Verificar que las pestañas Clima, Reporte, Bot 24/7 y Alertas siguen funcionando.

## Importante

Open-Meteo no representa una lectura directa de pluviómetro. Por eso el módulo usa el término **histórico consolidado/modelado** y no “medición real” u “observado de estación”.
