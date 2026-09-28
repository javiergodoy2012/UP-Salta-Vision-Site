# UP Salta · Infraestructura

Aplicación paralela de trabajo para personal habilitado de Infraestructura.

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

Los datos necesarios se generan dentro de `infraestructura/data/` a partir de las fuentes vigentes del repositorio. El frontend de Infraestructura no necesita cargar `index.html`, `clima/`, Site Bot ni otros módulos en tiempo de ejecución.

## Acceso independiente

La identidad se valida mediante Firebase Authentication, pero la autorización es exclusiva de Infraestructura.

Una cuenta solo ingresa si existe el documento:

`infraestructuraUsuarios/{uid}`

con un contenido equivalente a:

```json
{
  "activo": true,
  "rol": "infraestructura",
  "email": "usuario@dominio.com",
  "nombre": "Nombre Apellido"
}
```

No existe registro público ni aprobación automática.

Autorizar una cuenta en `infraestructuraUsuarios` no la autoriza en Site Visión ni en Clima Alert. Esos módulos mantienen sus propios controles.

## Firebase Hosting

La página utiliza `/__/firebase/init.js`, por lo que la publicación prevista para esta herramienta es un sitio Firebase Hosting propio dentro del proyecto, con URL independiente.

Esto evita compartir la navegación o el origen web de Site Visión.

## Regla Firestore requerida

El fragmento de `firestore.rules.fragment.txt` debe integrarse con las reglas existentes. No debe reemplazarlas en bloque.

## Fuente de datos

`scripts/build-infraestructura-lite.py` genera:

- `infraestructura/data/network-data.js`
- `infraestructura/data/cruces-habilitados-data.js`
- `infraestructura/data/interferencias-data.js`

La geometría se extrae de `NETWORK` del localizador actual. Cruces e interferencias se copian de sus fuentes operativas vigentes.

## Estado

**Rama de desarrollo. No desplegar todavía.**

Pendientes antes de publicar:

1. integrar y desplegar la regla de `infraestructuraUsuarios` sin alterar las reglas vigentes de Site Visión;
2. crear al menos un usuario piloto autorizado;
3. crear/configurar el sitio Firebase Hosting independiente;
4. agregar el dominio final a Firebase Authentication > Authorized domains;
5. ejecutar prueba positiva y prueba negativa de acceso;
6. validar que no haya rutas o enlaces hacia Site Visión o Clima Alert.
