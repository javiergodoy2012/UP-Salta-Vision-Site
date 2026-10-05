# Verificación — 1 de octubre de 2026

## Resultado comprobado

**36 comprobaciones aprobadas: 16 del Dashboard, 12 de integración y 8 con
código original de los módulos.** Los 28 controles anteriores no se repitieron
en esta continuación, porque no hubo cambios en la interfaz ni el adaptador. Sin errores
de ejecución en JSDOM 26.1.0. Sintaxis JavaScript válida y HTML generado completo.
Las pruebas no cargan recursos externos ni realizan llamadas a Firebase, AI,
servicios meteorológicos o producción.

| Área | Resultado y alcance |
| --- | --- |
| Preservación | 61 SHA-256 coinciden: documentos, datasets, geometrías, scripts, configuración, pipeline y logos originales |
| Fuentes de consulta | 269 cruces, 90 interferencias, 135 estaciones, 196.641 vértices; arrays coincidentes con la fuente |
| Filtros y fichas | C15, filtros combinados, paginación, PK con coma decimal, estados vacíos, limpieza y correspondencia de fichas |
| Infraestructura y eventos | Búsqueda de estaciones y eventos identificados como históricos |
| Navegación | Ocho secciones, títulos, estado activo, accesos y búsqueda global |
| Tema y móvil | Cambio de tema, menú móvil con fondo inerte, recorrido de foco, Escape y restauración al cambiar de ancho; no prueba de layout |
| Acceso al contenido | El enlace conserva sección, hash e instancia del mapa; no navega a Inicio |
| Aislamiento | Carga diferida de dos documentos separados en frames del mismo origen |
| Persistencia | Se conservan los mismos nodos iframe, documentos y valores ingresados al alternar las ocho secciones |
| Asistente | Se usa el botón y panel originales del bot dentro del mapa; no se abre mientras el acceso está bloqueado |
| Acceso | La capa visual conserva efectiva la regla que oculta la aplicación mientras existe `firebase-locked` |
| Navegación interna | Mapa → Clima, Clima → Red y Ctrl/Cmd+K llegan al shell |
| Carga y fallos | El estado de cada módulo se conserva al volver; la recarga manual mantiene intacta la instancia del otro módulo |
| Estilos | Tema sincronizado incluso en el módulo oculto; controles originales y colores meteorológicos revisados por fuente/DOM |
| Vista de referencia | Selección de ramal y zoom; no desmonta ni sustituye el documento operativo del mapa |
| Visor responsive | Siete configuraciones de tamaño disponibles; no prueba de render |

Los ensayos de integración usan documentos inertes: conservan la estructura
original y abren la UI existente del asistente sin iniciar su servicio AI. El
estado de acceso autorizado se representa únicamente en memoria de la prueba.
No se elude ni modifica la autenticación real. Los ocho controles nuevos sí
ejecutan Leaflet 1.9.4 y el código original de mapa/clima, con dimensiones y
capacidad SVG simuladas dentro de JSDOM. No realizan layout real ni acreditan
popups OAuth, permisos, proveedores de mapas, pronósticos en vivo o Firebase.

## Responsive preparado para revisión

| Vista | Tamaño del visor |
| --- | --- |
| PC | 1366 × 900 |
| Notebook | 1280 × 720 |
| Tablet vertical | 820 × 1000 |
| Tablet horizontal | 1180 × 820 |
| Móvil | 390 × 844 |
| Móvil compacto | 360 × 800 |
| Móvil horizontal | 844 × 390 |

Se incluyen navegación inferior móvil, menú expandible, tarjetas adaptables,
tablas con desplazamiento, diálogos acotados y scroll propio de los módulos.
El navegador de la sesión rechazó `file:` y localhost. **No se obtuvieron
capturas ni se verificó visualmente el render.** No se publicó una versión para
sortear el bloqueo.

## Aprobación visual y pendientes funcionales

El 1 de octubre de 2026 el usuario confirmó: «En cuanto a lo visual esta muy
bien, avanza!». Se conserva el diseño aprobado; esto no equivale a una prueba
autenticada ni a una validación técnica de todos los dispositivos.

- Recorrido funcional en PC, notebook, tablet y móvil con módulos conectados;
  capturas técnicas si aparecen problemas concretos.
- Sesión y OAuth en un origen previamente autorizado, sin cambiar dominios ni
  permisos. Confirmar retorno al shell y revalidaciones originales.
- Persistencia real de pan, zoom, capas, PK, tabs y temporizadores de mapa/clima
  en navegador. Ya se comprobaron instancias, centro, zoom, PK, capas y pestaña
  usando Leaflet y código original en el entorno DOM sin red.
- Funcionamiento conectado de SMN, Windy, pronósticos, Firestore, notificaciones
  y asistente bajo los permisos existentes, sin ensayos que escriban en producción.
- Comparación del mapa con el artefacto del pipeline validado. Esta preview no
  ejecuta las transformaciones operativas del despliegue. Se confirmó la ejecución
  exitosa #37 sobre la misma base; no hay artefactos descargables en su listado.
  Ver `PIPELINE-REVIEW.md`.

La igualdad de hashes prueba que no se editaron los originales; no garantiza por
sí sola que cada control se comporte igual bajo la nueva presentación. Esta
entrega no se declara lista para producción.

## Repetir controles

Desde la raíz del repositorio:

```sh
python dashboard-preview/build.py
cd dashboard-preview
npm ci --ignore-scripts
npm test
```

Para revisión visual, desde la raíz:

```sh
python dashboard-preview/serve.py --open
```

El paquete conserva el árbol completo para resolver `../index.html`,
`../clima/index.html` y sus recursos. No servir únicamente `dashboard-preview/`
si se desea revisar los módulos integrados.

## Ocho controles nuevos sobre los módulos originales

`verify-original-modules.cjs` compara dos ejecuciones de las mismas fuentes: una
independiente y otra dentro de los frames persistentes del shell. Las fuentes no
se editan. Firebase y sus scripts de acceso no se ejecutan; la condición de
usuario autorizado existe sólo en los documentos de prueba en memoria.

1. Leaflet 1.9.4 inicia con los ramales y controles originales.
2. Las búsquedas C 1147,547; C13 1132,132; C15 1400,400 y C16 1290,000 producen
   los mismos resultados y fichas de cruces/interferencias que la fuente intacta.
3. PK fuera de rango, texto inválido y sector C 1088,000 conservan la respuesta
   original, sin sustituir coordenadas ni geometrías.
4. Las capas de cruces/interferencias y las pestañas originales Personal,
   Seguridad, Clientes, Histórico y Explorar la red conservan su comportamiento.
5. Sectores y evaluación de umbrales de Clima coinciden en ambas ejecuciones.
6. El reporte de siete días conserva valores, severidades y clases semánticas
   usando un fixture meteorológico en memoria, sin mostrarlo en la preview.
7. Al navegar por el shell persisten mapa, centro, zoom, PK, capas, datos de
   prueba, pestaña de reporte y observaciones. Se espera a que termine el
   redimensionamiento original de Leaflet antes de comparar el centro.
8. Cero solicitudes de red y cero errores de ejecución en los ocho controles.

Sólo repetir esta etapa, desde `dashboard-preview/` con dependencias instaladas:

```sh
npm run test:original
```

Leaflet se agrega únicamente como dependencia de desarrollo, en la misma versión
que utiliza el índice original. No se agrega al runtime del shell.

## Paso necesario para la sesión real

Se verificó por lectura de la configuración pública de Firebase que `localhost`
ya está autorizado. La opción local concreta es ejecutar el lanzador en una PC y
abrir `http://localhost:8765/dashboard-preview/review.html`, usando una cuenta
existente con acceso aprobado. El servidor sigue limitado a loopback. No se
modificó Firebase ni se agregaron dominios, usuarios o permisos.

`content://` en Android y `file://` no acreditan OAuth. `127.0.0.1` no figura en la
lista consultada; por eso el lanzador abre el hostname autorizado `localhost`.
Esta verificación confirma el dominio admitido, no una sesión iniciada ni el
resultado del popup de Google. La prueba real sigue pendiente en el navegador
de la PC del revisor; el navegador de esta sesión mantiene su bloqueo local.

Con esa URL, el recorrido pendiente es ingreso original → búsqueda por PK →
Clima → regreso al mismo mapa → Asistente; comprobar la conservación de estado,
la revalidación y el retorno de los flujos originales de acceso. Si el popup de
Google es bloqueado, se debe comprobar el fallback original sin reescribirlo.
La URL de producción por sí sola no prueba la nueva preview. No se despliega
una copia para obtener esa URL sin autorización expresa.

## Iniciador sin Python — 5 de octubre de 2026

`INICIAR-PREVIEW.bat` usa Windows PowerShell y compila `serve-windows.cs` en
memoria. No instala dependencias ni cambia políticas del equipo. Mantiene el
servidor en loopback y la URL autorizada con `localhost`.

Se verificaron compilación con sintaxis C# 5, análisis del comando PowerShell,
arranque y cierre, rechazo de un segundo servidor en el mismo puerto, respuestas
GET/HEAD y carga concurrente de 11 documentos y recursos, incluidos mapa y
Clima completos. Los cuerpos recibidos coinciden byte por byte con los archivos;
MIME y cabeceras de caché son correctos. Se rechazan métodos de escritura,
otros hosts, rutas que salen del directorio y archivos internos de Git.

Estas comprobaciones se ejecutaron con PowerShell 7.4.6 portátil sobre Linux.
No equivalen a ejecutar el BAT en Windows ni prueban navegación o autenticación
reales. El archivo HTML cambia solamente el texto de ayuda para abrir el paquete.
Se conservaron los 61 originales; no se repitieron los 36 controles anteriores
porque no cambió la interfaz, el adaptador ni la lógica de los módulos.
