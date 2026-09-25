#!/usr/bin/env python3
"""Genera exclusivamente los datos necesarios para UP Salta · Infraestructura.

No modifica index.html ni las fuentes operativas.
"""
from pathlib import Path
import json
import shutil

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "infraestructura" / "data"
OUT.mkdir(parents=True, exist_ok=True)

src = (ROOT / "index.html").read_text(encoding="utf-8")
marker = "const NETWORK="
pos = src.find(marker)
if pos < 0:
    raise SystemExit("No se encontró const NETWORK= en index.html")

start = pos + len(marker)
decoder = json.JSONDecoder()
network, _ = decoder.raw_decode(src[start:].lstrip())

allowed = ["C", "C13", "C14", "C15", "C16", "C18"]
filtered = {k: network[k] for k in allowed if k in network}

missing = [k for k in allowed if k not in filtered]
if missing:
    raise SystemExit(f"Faltan ramales en NETWORK: {missing}")

payload = "window.INFRA_NETWORK = " + json.dumps(
    filtered, ensure_ascii=False, separators=(",", ":")
) + ";\n"

(OUT / "network-data.js").write_text(payload, encoding="utf-8")

for source in ["cruces-habilitados-data.js", "interferencias-data.js"]:
    shutil.copy2(ROOT / source, OUT / source)

print("Generado:")
for p in [
    OUT / "network-data.js",
    OUT / "cruces-habilitados-data.js",
    OUT / "interferencias-data.js",
]:
    print(f"- {p.relative_to(ROOT)} ({p.stat().st_size} bytes)")
