#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-up-salta-vision}"
EMAIL="${1:-}"

if [[ -z "$EMAIL" ]]; then
  echo "Uso: bash scripts/provision-infraestructura-user.sh correo@dominio.com [Nombre]"
  exit 1
fi

NAME="${2:-$EMAIL}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

command -v firebase >/dev/null 2>&1 || {
  echo "Falta Firebase CLI."
  exit 1
}
command -v gcloud >/dev/null 2>&1 || {
  echo "Falta gcloud CLI."
  exit 1
}
command -v python3 >/dev/null 2>&1 || {
  echo "Falta python3."
  exit 1
}

echo "Buscando UID de $EMAIL en Firebase Authentication..."
firebase auth:export "$TMP" --format=json --project "$PROJECT_ID" >/dev/null

UID_VALUE="$(python3 - "$TMP" "$EMAIL" <<'PY'
import json, sys
data=json.load(open(sys.argv[1],encoding="utf-8"))
wanted=sys.argv[2].strip().lower()
for u in data.get("users",[]):
    if str(u.get("email","")).strip().lower()==wanted:
        print(u.get("localId",""))
        break
PY
)"

if [[ -z "$UID_VALUE" ]]; then
  echo "No existe un usuario de Firebase Authentication con ese correo."
  echo "Primero debe iniciar sesión una vez con Google en el proyecto."
  exit 2
fi

TOKEN="$(gcloud auth print-access-token)"
DOC_URL="https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/(default)/documents/infraestructuraUsuarios/$UID_VALUE"

BODY="$(python3 - "$EMAIL" "$NAME" <<'PY'
import json,sys
print(json.dumps({
  "fields":{
    "activo":{"booleanValue":True},
    "rol":{"stringValue":"infraestructura"},
    "email":{"stringValue":sys.argv[1]},
    "nombre":{"stringValue":sys.argv[2]}
  }
},ensure_ascii=False))
PY
)"

curl --fail --silent --show-error   -X PATCH "$DOC_URL"   -H "Authorization: Bearer $TOKEN"   -H "Content-Type: application/json"   --data "$BODY" >/dev/null

echo "Usuario habilitado:"
echo "  UID:    $UID_VALUE"
echo "  correo: $EMAIL"
echo "  rol:    infraestructura"
