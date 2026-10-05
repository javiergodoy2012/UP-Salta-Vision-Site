# Publicación del shell — 5 de octubre de 2026

El usuario autorizó avanzar a la publicación, incluyendo la última actualización
existente de Acumulados. Rama: `release/dashboard-integrado-acumulados`.
Se conserva la preview aprobada `dff235d` en su rama anterior.

## Base vigente y alcance

Base: `0fabcea5c39cada936d40a4a1a6d443c7025e0e2`, desplegada con éxito en Pages
el 2 de octubre. Incluye Acumulados y sus ajustes posteriores: último día
completo, 72 horas, 7 días, últimos 31 días, filtros, histórico y cierre mensual.
No se copió la versión inicial `30337d6` sobre esas mejoras.

Los 71 archivos originales protegidos coinciden con esta base. La única excepción
explícita es el workflow de Pages: se añade una llamada al final de su preparación.
Los documentos y scripts de mapa, clima, Acumulados, bot, autenticación, datos y
logos no se modifican. Tampoco se despliegan Functions ni reglas de Firestore.

## Publicación progresiva

1. Se ejecutan los seis pasos existentes de construcción del mapa, sin cambios.
2. `prepare_publication.py` conserva el resultado byte por byte como
   `explorar.html` en el artefacto, sin editar el `index.html` fuente.
3. El shell aprobado pasa a ser el `index.html` del artefacto. Sus atributos
   indican las rutas del mapa y de `clima/index.html`; ambos frames persisten.
   El HTML final se genera durante el despliegue desde las mismas fuentes;
   esta rama no versiona otra copia del archivo generado de 5,6 MB.
4. Clima mantiene su URL, recursos, consultas y comportamiento actuales.
5. Se conservan manifest, iconos y registro original del service worker. Se retiran
   los rótulos de evaluación y la carpeta de herramientas de preview del artefacto.

La publicación se tramita por rama y PR, sin push directo a main. Una reversión
del PR elimina el paso adicional y restaura la entrada anterior del sitio.

## Evidencia previa a la publicación

- Mapa generado por el pipeline existente: **idéntico al HTML servido en
  producción**, 13.488.603 bytes; SHA-256
  `b657eea70c40e446c7b770f85778b5ebf203449c55303248adaf98570e1ce78d`.
- Clima publicado, fuente de main y artefacto candidato: idénticos; SHA-256
  `ea20353e40a1090778d8e471c522faf40c02c901b9827fe54f721aee6b4468b1`.
- 12 controles de integración repetidos por el cambio de rutas y actualización
  de fuentes: aprobados. Los otros 24 controles anteriores no se repitieron.
- 5 controles nuevos del artefacto: rutas de publicación, períodos de Acumulados,
  filtros e histórico, estadística mensual y persistencia entre las ocho secciones.
  Ejecutan los lectores y UI originales con Firestore simulado sólo en memoria;
  no hay valores simulados en el producto, solicitudes externas ni escrituras.

Las pruebas DOM no acreditan render real, OAuth ni notificaciones en dispositivos.
La sesión autenticada sigue pendiente de comprobación en navegador. La evidencia
del mapa publicado resuelve el contraste de artefacto pendiente en el informe
histórico `PIPELINE-REVIEW.md`; no se alteró su construcción operativa.

Comprobación del artefacto preparado:

```sh
node dashboard-preview/verify-publication.cjs RUTA_ARTEFACTO
```

Los hashes remotos y el resultado efectivo del nuevo despliegue se confirmarán
después de fusionar el PR; este documento no afirma que ya se haya publicado.
