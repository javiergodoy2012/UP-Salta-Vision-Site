# Site Visión — shell integrado

**Continuación vigente (5 de octubre):** publicación autorizada en
`release/dashboard-integrado-acumulados`, sobre la versión actual de Clima.
Ver [alcance y controles de publicación](PUBLICATION.md). El estado de preview
documentado a continuación corresponde a las entregas anteriores.

Rama: `feature/dashboard-profesional-preview-v1`. Continuación de `706276b`.
Base de los módulos originales: `91f7d42d555d621ca3d3d58753722ff8ef3e4dd5`.

Los cambios permanecen exclusivamente en `dashboard-preview/`. Los 61 archivos
preexistentes se conservan byte por byte. No hay push, merge ni publicación. La
rama del logo y el worktree con el índice truncado permanecen separados e intactos.

## Abrir la preview completa

Descomprimir todo el paquete, conservando sus carpetas. En Windows, ejecutar
`dashboard-preview/INICIAR-PREVIEW.bat`. Usa Windows PowerShell y .NET incluidos
en Windows 10/11; no requiere Python, instalaciones adicionales ni administrador.
Conservar abierta la ventana del iniciador durante la prueba.

En otros sistemas, si se dispone de Python 3, ejecutar desde la raíz del paquete
o del repositorio:

```sh
python dashboard-preview/serve.py --open
```

Se abre `http://localhost:8765/dashboard-preview/review.html`. El servidor escucha
sólo en el equipo local; Ctrl+C lo cierra. El visor ofrece siete tamaños de PC,
notebook, tablet y móvil, incluyendo orientación horizontal.

Los módulos originales conservan sus conexiones actuales. El 1 de octubre de
2026 se confirmó mediante una consulta de sólo lectura que `localhost` ya figura
en los dominios autorizados del proyecto Firebase. El lanzador usa ese nombre;
no abrir la dirección con `127.0.0.1`. No se agregaron dominios, usuarios ni
permisos. La prueba de ingreso con una cuenta existente y aprobada sigue pendiente.
La dirección funciona en la PC mientras el servidor está abierto; no es un enlace
público para abrir desde el celular.

El iniciador de Windows compila `serve-windows.cs` en memoria. No cambia políticas
de ejecución, permisos, firewall ni Firebase. Si una política del equipo bloquea
PowerShell o la compilación, el iniciador muestra el error; no intenta eludirla.
Si el puerto está ocupado, cerrar la otra preview y volver a abrir el iniciador.

El archivo `site-vision-dashboard.html` también puede abrirse por separado para
recorrer las consultas locales, filtros, fichas y la vista de referencia. Explorar
la red, Clima Alert y el asistente requieren el paquete completo servido por HTTP.
En `file://` se muestran instrucciones, sin simular los módulos originales.

## Arquitectura implementada

- Un shell con cabecera, sidebar, navegación móvil, búsqueda global y tema.
- Ocho secciones: Inicio, Explorar la red, Cruces habilitados, Interferencias,
  Infraestructura, Clima Alert, Alertas y novedades, Asistente Site.
- Dos iframes del mismo origen, creados al entrar por primera vez al mapa o clima.
  Permanecen fuera del contenedor que se renderiza al navegar; se ocultan sin
  desmontarlos. Cada documento conserva sus variables, estilos y controles.
- `shared-theme.css` centraliza tokens neutros y `module-skin.css` adapta la
  presentación de los documentos originales. No redefine colores operativos del clima.
- `module-host.js` conserva los frames, sincroniza el tema, traduce enlaces
  internos y presenta estados de carga, acceso requerido, fallo y recarga manual.
- El asistente utiliza el control original del bot dentro del mismo mapa. El
  adaptador respeta el bloqueo de acceso y no crea otra implementación.

## Información de cada bloque

| Bloque | Fuente conservada | Presentación |
| --- | --- | --- |
| Cruces habilitados | `cruces-habilitados-data.js` | 269 registros, filtros, paginación y fichas |
| Interferencias | `interferencias-data.js` | 90 registros, filtros y fichas documentales |
| Infraestructura | `STATIONS` del índice completo | 135 estaciones y referencias |
| Explorar la red | `index.html` completo | Mapa y controles originales dentro del shell |
| Vista de referencia | `NETWORK` del índice completo | 7 ramales, 196.641 vértices proyectados a SVG; no calcula PK |
| Alertas y novedades | `DESCARRILOS` del índice completo | 24 eventos históricos identificados como tales; no alertas en vivo |
| Clima Alert | `clima/index.html` | Módulo original, sin valores meteorológicos simulados |
| Asistente Site | Bot existente del mapa | Misma instancia, controles y contexto originales |
| Búsqueda global | Módulos, cruces y estaciones | Consulta local y navegación; Ctrl/Cmd+K |

La fecha de datos corresponde al último commit de las fuentes; no representa una
sincronización en vivo. La construcción usa el índice completo del repositorio y
rechaza archivos sin cierre de body/html. No ejecuta las transformaciones de
geometría del pipeline de producción; su equivalencia con el artefacto publicado
queda pendiente de comparar antes de una eventual integración productiva.

## Construcción y controles

```sh
python dashboard-preview/build.py
cd dashboard-preview
npm ci --ignore-scripts
npm test
```

Python y Git generan el HTML autónomo. Inter y Lucide están incluidos con sus
licencias. `source-manifest.json` registra las fuentes del HTML;
`protected-sources.json` contiene los SHA-256 de los 61 archivos preexistentes.
Para generar un paquete local reproducible en contenido:

```sh
python dashboard-preview/build_bundle.py
```

Ejecutar ese último comando desde la raíz del repositorio. No publica nada.

## Revisión pendiente

Pasaron 36 comprobaciones locales: 28 previas y 8 nuevas con código original y Leaflet. No equivalen a una revisión
visual ni a pruebas contra Firebase, mapas y servicios meteorológicos reales.
El usuario aprobó el aspecto visual el 1 de octubre de 2026. El navegador de
esta sesión bloqueó la apertura local y localhost: el agente no obtuvo capturas
ni verificó el render en dispositivos reales. La prueba autenticada queda pendiente.

Consultar [arquitectura y riesgos](ARCHITECTURE.md),
[contraste del pipeline](PIPELINE-REVIEW.md),
[resultados y límites de pruebas](VALIDATION.md) y [entrega para revisión](REVIEW.md).
