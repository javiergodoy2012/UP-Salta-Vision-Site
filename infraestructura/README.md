# UP Salta · Infraestructura

Aplicación paralela e independiente para personal habilitado de Infraestructura.

## Alcance v1

Incluye únicamente:

- mapa ferroviario de C, C13, C14, C15, C16 y C18;
- localizador Ramal + PK;
- Cruces Habilitados;
- Interferencias / Servicios;
- ficha del punto seleccionado.

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

No hay registro público ni aprobación automática.

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
