#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-up-salta-vision}"
SITE_ID="${1:-${INFRA_SITE_ID:-up-salta-infraestructura}}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TEMPLATE="$ROOT/infraestructura/firebase.infraestructura.template.json"
CONFIG="$ROOT/firebase.infraestructura.json"

command -v firebase >/dev/null 2>&1 || {
  echo "Falta Firebase CLI. Instalá/actualizá con: npm i -g firebase-tools"
  exit 1
}

cd "$ROOT"

echo "Proyecto: $PROJECT_ID"
echo "Hosting:  $SITE_ID"

if firebase hosting:sites:list --project "$PROJECT_ID" 2>/dev/null | grep -Fq "$SITE_ID"; then
  echo "El sitio Hosting ya existe."
else
  echo "Creando sitio Hosting independiente..."
  firebase hosting:sites:create "$SITE_ID" --project "$PROJECT_ID"
fi

python3 - "$TEMPLATE" "$CONFIG" "$SITE_ID" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1]).read_text(encoding="utf-8")
src = src.replace("REEMPLAZAR_POR_SITE_ID_INFRAESTRUCTURA", sys.argv[3])
Path(sys.argv[2]).write_text(src, encoding="utf-8")
PY

GOOGLE_CONFIG="$ROOT/infraestructura/google-maps-config.js"
GOOGLE_MUTANT="$ROOT/infraestructura/Leaflet.GoogleMutant.js"

echo "Preparando adaptador Google Maps para Leaflet..."
curl --fail --location --silent --show-error \
  "https://cdn.jsdelivr.net/npm/leaflet.gridlayer.googlemutant@0.16.0/dist/Leaflet.GoogleMutant.js" \
  --output "$GOOGLE_MUTANT"

python3 - "$GOOGLE_MUTANT" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
src = path.read_text(encoding="utf-8")
needles = ('backgroundColor: "transparent",', "backgroundColor: 'transparent',")
matches = [needle for needle in needles if src.count(needle) == 1]
if len(matches) != 1:
    raise SystemExit("No se pudo preparar GoogleMutant: backgroundColor no es único")
needle = matches[0]
replacement = (
    needle + "\n\t\t\t\trenderingType: "
    "(google.maps.RenderingType ? google.maps.RenderingType.RASTER : undefined),"
)
path.write_text(src.replace(needle, replacement, 1), encoding="utf-8")
PY

if [[ -n "${GOOGLE_MAPS_API_KEY:-}" ]]; then
  python3 - "$GOOGLE_CONFIG" "$GOOGLE_MAPS_API_KEY" <<'PY'
from pathlib import Path
import json, sys
Path(sys.argv[1]).write_text(
    "window.VISION_GOOGLE_MAPS_API_KEY = " + json.dumps(sys.argv[2]) + ";\n",
    encoding="utf-8",
)
PY
  echo "Google Maps: configuración tomada de GOOGLE_MAPS_API_KEY."
else
  echo "Google Maps: intentando reutilizar la configuración pública de VisionSite..."
  if curl --fail --location --silent --show-error \
      "https://upsaltavision.com.ar/google-maps-config.js" \
      --output "$GOOGLE_CONFIG"; then
    echo "Google Maps: configuración de VisionSite copiada."
  else
    echo "ADVERTENCIA: no se pudo recuperar la configuración de Google Maps."
    echo "Se publicará OpenStreetMap como respaldo."
    printf "window.VISION_GOOGLE_MAPS_API_KEY = '';\n" > "$GOOGLE_CONFIG"
  fi
fi

echo "Regenerando datasets protegidos..."
python3 scripts/build-infraestructura-lite.py

echo "Instalando dependencias del backend..."
npm --prefix functions-infra install

echo "Desplegando backend protegido + Hosting independiente..."
firebase deploy   --project "$PROJECT_ID"   --config "$CONFIG"   --only functions:infraestructura,hosting

echo
echo "Despliegue finalizado."
echo "URL esperada: https://$SITE_ID.web.app"
echo "Antes de probar, autorizá al menos un usuario con:"
echo "  bash scripts/provision-infraestructura-user.sh correo@dominio.com"
