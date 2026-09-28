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
