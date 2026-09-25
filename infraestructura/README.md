# UP Salta · Infraestructura

Aplicación paralela de trabajo para personal de Infraestructura.

## Alcance de v1

La aplicación contiene únicamente:

- mapa ferroviario de los ramales C, C13, C14, C15, C16 y C18;
- localizador por Ramal + PK;
- capa Cruces Habilitados;
- capa Interferencias / Servicios;
- ficha de consulta del punto seleccionado.

## Aislamiento

Esta aplicación no carga ni enlaza:

- Site Visión;
- Clima Alert;
- Site Bot;
- módulos de Seguridad;
- personal;
- descarrilos;
- administración general.

Los datos necesarios se generan dentro de `infraestructura/data/` a partir de las fuentes del repositorio, de modo que el frontend de Infraestructura no necesita leer `index.html` ni otros módulos de Site Visión en tiempo de ejecución.

## Estado

**Prototipo de rama. No desplegar todavía.**

La capa de acceso independiente se implementará antes de publicar la herramienta.

## Fuente de datos

`scripts/build-infraestructura-lite.py` genera:

- `infraestructura/data/network-data.js`
- `infraestructura/data/cruces-habilitados-data.js`
- `infraestructura/data/interferencias-data.js`

La geometría se extrae de `NETWORK` del localizador actual. Cruces e interferencias se copian de sus fuentes operativas vigentes.
