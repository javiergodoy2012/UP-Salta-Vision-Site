# UP Salta · Infraestructura

Aplicación paralela e independiente para personal habilitado de Infraestructura.

## Alcance v1

Incluye únicamente:

- mapa ferroviario de C, C13, C14, C15, C16 y C18;
- localizador Ramal + PK;
- mapas base Google Maps, Google Satélite y Google Relieve;
- OpenStreetMap como respaldo;
- capa Red ferroviaria (OpenRailwayMap);
- Cruces Habilitados;
- Interferencias / Servicios;
- ficha del punto seleccionado;
- botón Ver en Google Maps para el PK localizado.

No carga ni enlaza Site Visión, Clima Alert, Site Bot, Seguridad, personal, descarrilos ni administración general.

## Acceso

La identidad usa Firebase Authentication con Google.

La autorización es exclusiva de esta herramienta mediante:

`infraestructuraUsuarios/{uid}`

Documento esperado:

```json
{
  "activo": true,
  "rol": "infraestructura",
  "email": "usuario@dominio.com",
  "nombre": "Nombre Apellido"
}
```

El primer ingreso con Google crea automáticamente una solicitud en
`infraestructuraUsuarios/{uid}` con `activo: false`, el correo verificado,
nombre y fecha de solicitud. La persona queda pendiente sin acceso a los datos.
El administrador habilita su documento en Firebase Firestore cambiando
`activo` a `true`; la persona pulsa «Reintentar» o vuelve a ingresar.
No hay aprobación automática.

La autorización de Infraestructura no otorga acceso a Site Visión ni a Clima Alert.

## Protección de datos

Los datasets ferroviarios no se sirven como archivos estáticos del Hosting.

El navegador autenticado solicita:

- `network`
- `cruces`
- `interferencias`

al endpoint `/infra-api`.

La Cloud Function `infraestructuraData` verifica el Firebase ID Token y consulta server-side `infraestructuraUsuarios/{uid}` antes de devolver información.

El cliente no lee Firestore directamente, por lo que esta aplicación no requiere ampliar las reglas Firestore existentes.

## Datos

`scripts/build-infraestructura-lite.py` genera:

- `functions-infra/data/network.json`
- `functions-infra/data/cruces.json`
- `functions-infra/data/interferencias.json`

Se validan 6 ramales, 269 cruces y 90 interferencias.

## Hosting

La publicación prevista es un sitio Firebase Hosting propio dentro del proyecto `up-salta-vision`.

El template:

`infraestructura/firebase.infraestructura.template.json`

publica solo `infraestructura/` y reescribe `/infra-api` hacia la Cloud Function protegida.

## Despliegue

Desde Cloud Shell:

```bash
git switch feature/infraestructura-lite-v1
git pull
bash scripts/deploy-infraestructura-lite.sh
```

Por defecto intenta crear el Hosting:

`up-salta-infraestructura`

También puede indicarse otro Site ID:

```bash
bash scripts/deploy-infraestructura-lite.sh mi-site-id
```

## Habilitar un usuario

La cuenta debe existir previamente en Firebase Authentication.

Luego:

```bash
bash scripts/provision-infraestructura-user.sh correo@dominio.com "Nombre Apellido"
```

Este alta es administrativa y no modifica las autorizaciones de Site Visión o Clima Alert.

## Estado

Rama de desarrollo: `feature/infraestructura-lite-v1`.

No fusionar a `main` hasta completar prueba positiva y negativa de acceso.


## Google Maps

Durante el despliegue, `scripts/deploy-infraestructura-lite.sh` prepara
`infraestructura/google-maps-config.js` sin versionar la clave en Git.

El script usa primero `GOOGLE_MAPS_API_KEY` si está definida. Si no, intenta reutilizar la configuración pública vigente de VisionSite.

La clave de Google Maps debe admitir como HTTP referrers:

- `https://up-salta-infraestructura.web.app/*`
- `https://up-salta-infraestructura.firebaseapp.com/*`

Si Google Maps no está autorizado o no responde, la herramienta activa automáticamente OpenStreetMap · Respaldo.


## Beta instalable

El manifiesto `manifest.webmanifest` permite instalar «Infra Beta» y abrirla
con `display: standalone`. Reutiliza el mismo sitio y las autorizaciones
actuales. La versión en una pestaña sigue disponible.

No incorpora service worker ni funcionamiento sin conexión. Requiere Internet
para acceder, cargar los datos protegidos y consultar el mapa.

Después de publicar Hosting, probar en Chrome Android:

1. Abrir el sitio y usar el menú de Chrome → Instalar aplicación / Agregar a la pantalla principal (el texto depende del navegador).
2. Abrir «Infra Beta» desde el ícono instalado y comprobar que no aparece la barra de direcciones.
3. Ingresar con Google: una cuenta habilitada debe cargar mapa y capas; una nueva debe quedar pendiente.
4. Probar búsqueda, desplazamiento del mapa, capas, rotación del teléfono y cierre/reapertura.
5. Cerrar sesión y verificar que se vuelve a solicitar el acceso.

La instalación y el regreso desde Google requieren validación en un teléfono
real después de publicar; la validación estática no confirma esos recorridos.
Desinstalar «Infra Beta» no elimina la cuenta ni su autorización.
