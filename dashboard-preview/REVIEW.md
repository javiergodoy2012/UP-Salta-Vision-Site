# Entrega local para revisión — shell integrado

- Rama: `feature/dashboard-profesional-preview-v1`.
- Continúa el commit `706276b`; consultar `git rev-parse HEAD` para el commit de
  esta entrega, también registrado en `ABRIR-PRIMERO.txt` del paquete generado.
- Alcance exclusivo: `dashboard-preview/`. Sin push, merge ni deploy.

## Diff resumido

| Archivos | Cambio |
| --- | --- |
| `app.js`, `template.html`, `style.css` | Shell de ocho secciones, Explorar la red, acceso al bot existente y host fuera del área renderizada |
| `shared-theme.css` | Tokens visuales compartidos y tema claro/oscuro |
| `module-host.js` | Dos frames persistentes y aislados; carga, fallos, navegación interna y tema |
| `module-skin.css` | Adaptación visual de mapa/clima sin editar los documentos originales |
| `build.py`, `source-manifest.json`, `site-vision-dashboard.html` | Construcción con fuentes completas y recursos del shell integrados |
| `review.html`, `serve.py`, `serve-windows.cs`, `INICIAR-PREVIEW.bat` | Visor de siete tamaños y apertura por HTTP local; Windows sin Python |
| `verify.cjs`, `verify-integrated.cjs`, `verify-original-modules.cjs`, `package.json`, `package-lock.json` | 36 comprobaciones locales, incluyendo código original y Leaflet |
| `protected-sources.json` | Referencia SHA-256 de los 61 originales protegidos |
| `build_bundle.py` | Paquete descargable; conserva byte por byte los originales |
| `README.md`, `ARCHITECTURE.md`, `VALIDATION.md`, `REVIEW.md`, `PIPELINE-REVIEW.md` | Uso, arquitectura, alcance, pruebas y pendientes |

## Implementado

Inicio → Explorar la red → Cruces → Interferencias → Infraestructura → Clima Alert
→ Alertas y novedades → Asistente dentro del mismo contenedor visual. Los módulos
mapa y clima se crean al primer acceso y se conservan al navegar. El asistente
comparte el documento del mapa. El bloqueo de autenticación sigue vigente.

Las consultas, filtros y fichas usan los datos existentes. La vista SVG es una
referencia opcional y no reemplaza la construcción operativa del mapa.

## Evidencia y límites

36/36 controles locales aprobados, 61/61 originales sin cambios. Persistencia de
contenedores y campos comprobada en documentos inertes; no se ejecutaron
operaciones contra servicios productivos.

Visual aprobado por el usuario. Pendientes: recorrido técnico en navegador,
integración conectada en origen autorizado y contraste con el artefacto operativo del pipeline. El
navegador de esta sesión bloqueó la preview local. Ver `VALIDATION.md`.

El logo aprobado permanece en su rama separada. El índice truncado del worktree
anterior se conserva y no se utilizó como base. No se toca main ni producción.

## Continuación desde `96423bd`

- Corregido el foco del menú móvil: el sidebar cerrado queda fuera de la
  navegación del teclado; al abrirlo se evita interactuar con el fondo,
  manteniendo vivos los frames. Escape devuelve el foco al botón Más.
- El cambio de ancho vuelve a habilitar el sidebar de escritorio y libera el
  fondo. Abrir un diálogo desde el menú también cierra el menú correctamente.
- Ir al contenido enfoca la sección sin alterar el hash ni llevar a Inicio.
- Cuatro controles adicionales de DOM cubren estas regresiones.
- Consulta de sólo lectura al último workflow exitoso y a su listado de
  artefactos, documentada en `PIPELINE-REVIEW.md`. Sin ejecutar pipelines.

## Continuación desde `8755a12` tras la aprobación visual

- Interfaz aprobada conservada sin cambios de presentación o comportamiento.
- Ocho pruebas adicionales ejecutan el código original de mapa y clima dentro
  y fuera del shell, usando Leaflet 1.9.4 y sin conexiones externas.
- Las 28 pruebas previas no se repitieron. No se encontró una incompatibilidad
  del shell en los ocho escenarios nuevos.
- Sesión real pendiente de una URL de preview en origen autorizado; no se
  identifica la aprobación visual como autorización para publicar.

## Apertura local para comprobar autenticación

Se confirmó por consulta de sólo lectura que `localhost` ya está autorizado en
Firebase. El lanzador ahora abre `http://localhost:8765/dashboard-preview/review.html`,
conservando el bind en `127.0.0.1`. Es una dirección de la PC que ejecuta el
servidor, no un enlace publicado. La interfaz aprobada sigue intacta.

No se repitieron los 36 controles: sólo cambian el hostname del lanzador y las
instrucciones. Sigue pendiente iniciar una sesión real en el navegador local.
No se editaron Firebase, autenticación, usuarios, roles, permisos ni producción.

## Windows sin Python — continuación desde `2121f10`

- Reemplazado el iniciador dependiente de Python por Windows PowerShell y un
  servidor estático local en C#, sin instalaciones ni cambios de permisos.
- Actualizadas las instrucciones del ZIP y el texto de ayuda del HTML. Diseño,
  módulos y datos operativos conservados.
- Paquete actualizado: `Site-Vision-Preview-Windows.zip`.
- Servidor comprobado con PowerShell portátil sobre Linux: documentos completos,
  recursos simultáneos, cabeceras, restricciones de rutas y cierre. No se abrió
  un navegador ni se inició sesión. Detalle y límites en `VALIDATION.md`.
- Pendiente: ejecutar el BAT en la PC del usuario y realizar el recorrido
  autenticado. Sin push, merge ni despliegue.
