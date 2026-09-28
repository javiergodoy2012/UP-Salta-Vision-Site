#!/usr/bin/env python3
"""Genera los datos protegidos de UP Salta · Infraestructura.

No modifica index.html ni las fuentes operativas.
Los JSON generados se empaquetan con la Cloud Function y no se sirven
como archivos estáticos del Hosting.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "functions-infra" / "data"
OUT.mkdir(parents=True, exist_ok=True)

decoder = json.JSONDecoder()

def parse_json_after_marker(path: Path, marker: str):
    src = path.read_text(encoding="utf-8")
    pos = src.find(marker)
    if pos < 0:
        raise SystemExit(f"No se encontró marcador {marker!r} en {path.name}")
    start = pos + len(marker)
    chunk = src[start:].lstrip()
    if chunk.startswith("Object.freeze("):
        chunk = chunk[len("Object.freeze("):].lstrip()
    value, _ = decoder.raw_decode(chunk)
    return value

# NETWORK del localizador vigente.
src = (ROOT / "index.html").read_text(encoding="utf-8")
marker = "const NETWORK="
pos = src.find(marker)
if pos < 0:
    raise SystemExit("No se encontró const NETWORK= en index.html")

network, _ = decoder.raw_decode(src[pos + len(marker):].lstrip())
allowed = ["C", "C13", "C14", "C15", "C16", "C18"]
filtered = {k: network[k] for k in allowed if k in network}

missing = [k for k in allowed if k not in filtered]
if missing:
    raise SystemExit(f"Faltan ramales en NETWORK: {missing}")

cruces = parse_json_after_marker(
    ROOT / "cruces-habilitados-data.js",
    "window.CRUCES_HABILITADOS = "
)
interferencias = parse_json_after_marker(
    ROOT / "interferencias-data.js",
    "window.INTERFERENCIAS_UP_SALTA = "
)

if len(cruces) != 269:
    raise SystemExit(f"Se esperaban 269 cruces; se obtuvieron {len(cruces)}")
if len(interferencias) != 90:
    raise SystemExit(f"Se esperaban 90 interferencias; se obtuvieron {len(interferencias)}")

outputs = {
    "network.json": filtered,
    "cruces.json": cruces,
    "interferencias.json": interferencias,
}

for name, payload in outputs.items():
    path = OUT / name
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8"
    )

print("Generado:")
for name in outputs:
    p = OUT / name
    print(f"- {p.relative_to(ROOT)} ({p.stat().st_size} bytes)")
