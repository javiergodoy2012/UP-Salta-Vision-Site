# Contraste del pipeline — 1 de octubre de 2026

Consulta de sólo lectura, realizada después del commit local `96423bd`.
No se ejecutó, reintentó ni modificó ningún workflow.

## Evidencia obtenida

| Dato | Resultado |
| --- | --- |
| Workflow | Deploy VisionSite to Pages |
| Última ejecución exitosa encontrada en main | #37 · `36024607689` |
| Resultado | completed / success |
| Inicio registrado | 2026-09-24T16:03:03Z |
| Commit de esa ejecución | `91f7d42d555d621ca3d3d58753722ff8ef3e4dd5` |
| Base de los documentos originales de la preview | El mismo commit |
| Artefactos devueltos por el listado de esa ejecución | 0 |

[Registro de la ejecución](https://github.com/javiergodoy2012/UP-Salta-Vision-Site/actions/runs/36024607689).
El listado vacío no permite descargar y comparar el paquete exacto publicado.
No se afirma una causa de su ausencia.

## Diferencias que deben respetarse

El workflow `.github/workflows/deploy-pages.yml` prepara `_site/` a partir de los
archivos versionados. Agrega GoogleMutant y genera la configuración de Google
Maps a partir del secreto existente. Después ejecuta, en este orden:

| Script existente | Responsabilidad | Tratamiento en esta preview |
| --- | --- | --- |
| `apply_rail_corrections.py` | Correcciones operativas del índice publicado | No se ejecuta ni modifica |
| `extend_c15_to_border.py` | Extensión del C15 aplicada al artefacto | No se ejecuta ni modifica |
| `inject_google_localizador.py` | Integración y controles de Google Maps | No se ejecuta ni modifica |
| `apply_dashboard_brand.py` | Identidad visual y stylesheet del documento | Se conserva; el shell añade su capa dentro del frame |
| `inject_network_overview.py` | Vista general y manejador del selector de ramales | No se ejecuta ni modifica |
| `prioritize_access_startup.py` | Orden de arranque del bloque original de acceso | No se ejecuta ni modifica |

El adaptador del shell sigue cargando `../index.html` y `../clima/index.html`.
No reproduce esos pasos, no reemplaza la geometría ni utiliza la referencia SVG
como mapa operativo. Mapa y clima conservan documentos independientes.

## Resultado y pendiente concreto

La base Git coincide con el último despliegue exitoso consultado; esto **no**
prueba equivalencia de geometría ni de funcionamiento entre el índice sin
procesar y el artefacto de producción. La preview local permite revisar el
contenedor y las consultas, pero el mapa debe contrastarse con un artefacto
validado antes de considerar su integración productiva.

Para cerrar esa comparación se necesita un paquete conservado de ese despliegue
o la revisión del resultado del pipeline en una etapa expresamente autorizada.
Esta continuación no genera ese artefacto, cambia secretos, prepara un despliegue
ni altera la construcción operativa aprobada.

El usuario aprobó la propuesta visual. Sigue pendiente la integración conectada
de la preview en un origen autorizado y el recorrido técnico en dispositivos. El bloqueo de la preview local de esta sesión se conserva
como límite; no se intenta eludirlo mediante publicación o herramientas alternas.
