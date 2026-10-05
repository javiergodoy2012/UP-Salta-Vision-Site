# Diagnóstico y arquitectura de integración — 1 de octubre de 2026

## Punto de partida confirmado antes de editar

- Rama: `feature/dashboard-profesional-preview-v1`.
- Commit: `706276b384f26da061f5a1232f592356f18ca7a5`.
- Estado: limpio. Base productiva en Git: `91f7d42`.
- El worktree con `index.html` truncado permanece aparte, sin tocar.
- `fix/logo-site-vision-9709-9760` conserva sus dos PNG pendientes, sin incorporarse.

## Módulos y dependencias actuales

| Módulo | Archivos | Dependencias que permanecen aisladas |
| --- | --- | --- |
| Dashboard nuevo | `dashboard-preview/template.html`, `app.js`, `style.css`, `build.py` | Datos locales, Inter, Lucide, filtros y fichas de consulta |
| Explorar la red | `index.html` completo | Leaflet 1.9.4, NETWORK, PK, estaciones, personal, seguridad, clientes, eventos, controles y estado del mapa |
| Cruces | `cruces-habilitados-data.js`, `cruces-habilitados.js` | 269 registros y localización/capas existentes |
| Interferencias | `interferencias-data.js`, `interferencias.js` | 90 registros, permisos, rangos y capas existentes |
| Clima Alert | `clima/index.html` | Open-Meteo, Windy, enlace SMN, Leaflet/Google Maps, Chart.js, exportación Excel, Firebase y servicios de alertas/push |
| Asistente Site | `site-assistant.js`, `site-assistant.css`, `assistant-reasoning.js` | Contexto del mapa, endpoint AI, acceso aprobado, Gemini/Grounding existentes |
| Acceso | Bloque `firebase-access-script` de `index.html`; acceso propio de Clima | Firebase Auth/Firestore, aprobación y revalidación diaria; no se extraen ni modifican |
| Producción | `.github/workflows/deploy-pages.yml`, `scripts/` | Pipeline de GitHub Pages y transformaciones de geometría/marca/mapa que no se ejecutan en esta etapa |

## Arquitectura propuesta antes de los cambios estructurales

1. Mantener el shell aprobado como contenedor único.
2. Cargar los documentos originales en dos iframes del mismo origen, persistentes
   y creados sólo al entrar al módulo. No extraer ni duplicar la lógica de negocio.
3. Mantener los frames fuera del área que se vuelve a renderizar al cambiar de
   página: se ocultan y muestran, conservando formularios, mapa y contexto.
4. Centralizar tokens visuales y tipografía en `shared-theme.css`. El shell y
   ambos documentos consumen los mismos colores neutros, espaciados y fuentes.
5. Aplicar `module-skin.css` dentro de los frames. Se adaptan contenedores,
   cabeceras repetidas, botones y navegación; no se alteran colores semánticos de
   alertas/temperatura, umbrales, trazas ni marcadores.
6. Usar `module-host.js` como adaptador de presentación: cargar, mostrar,
   sincronizar tema y traducir enlaces de navegación interna al shell. No invocar
   Firebase, cambiar roles ni interceptar consultas operativas.
7. Mantener el asistente real dentro del documento del mapa, que ya contiene su
   contexto. El nuevo acceso abre su control original; no crea otro bot.

No se cambian nombres internos: `localizador` sigue siendo la clave de navegación;
la etiqueta visible pasa a **Explorar la red**, o **Red** en móvil.

## Riesgos y tratamiento

- **Colisiones globales/IDs:** los documentos originales no se mezclan en un DOM.
- **Reinicio al navegar:** frames persistentes; un solo documento de mapa, incluso
  al entrar desde Asistente. No se desmontan ni reinsertan al cambiar de sección.
- **Acceso:** el adaptador nunca remueve `firebase-locked`, oculta el gate, cambia
  atributos de permisos o marca un usuario como aprobado. Un origen local puede
  no estar autorizado por Firebase; no se agregan dominios ni se falsifica sesión.
- **Rutas absolutas y worker:** el paquete se sirve desde su raíz por HTTP local.
  `file://` sirve para la consulta autónoma; no se promete funcionamiento completo
  de autenticación, push, imports y servicios desde un archivo suelto.
- **Producción:** no se ejecutan pruebas contra cuentas/servicios productivos.
  Los módulos originales, al abrirse en un navegador conectado, conservan sus
  conexiones actuales. Acciones administrativas siguen bajo los permisos originales.
- **Geometría publicada:** el índice del repositorio es una fuente completa, pero
  el pipeline aplica transformaciones antes de publicar. Esta preview no ejecuta
  esos pasos ni afirma equivalencia del mapa candidato con el artefacto publicado.
  Esa comparación sigue siendo un requisito previo a una integración productiva.
- **Dependencias externas:** Leaflet, Firebase, tiles, clima y APIs requieren red;
  se muestran estados de carga/fallo sin reemplazar los resultados con valores falsos.
- **Responsive y modales:** scroll interno de cada módulo para conservar su
  viewport y comportamiento original de diálogos. El shell mantiene su propia
  cabecera y navegación móvil.

## Archivos afectados

Sólo dentro de `dashboard-preview/`:

- Editar: `app.js`, `template.html`, `style.css`, `build.py`, `review.html`,
  `verify.cjs`, documentación y HTML/manifiestos generados.
- Agregar: `shared-theme.css`, `module-skin.css`, `module-host.js`, `serve.py`,
  verificación de integración y esta arquitectura.

Sin cambios en los documentos operativos, sus scripts, datasets, PNG, configuración
Firebase, permisos, Functions, workflows o rama principal.
