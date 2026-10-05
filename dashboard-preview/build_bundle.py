"""Package the local preview with byte-identical original modules; never publish."""
from pathlib import Path
import hashlib
import json
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
PREFIX = 'Site-Vision-Preview/'
OUTPUT = ROOT / 'Site-Vision-Preview-Windows.zip'


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def main():
    protected = json.loads((ROOT / 'protected-sources.json').read_text())
    for name, expected in protected.items():
        if sha256((REPO / name).read_bytes()) != expected:
            raise RuntimeError(f'Fuente protegida modificada: {name}')

    names = list(protected)
    for path in ROOT.rglob('*'):
        relative = path.relative_to(ROOT)
        if (path.is_file() and path.suffix != '.zip'
                and not any(part in {'node_modules', '__pycache__'} for part in relative.parts)
                and not any(part.startswith('.') for part in relative.parts)):
            names.append('dashboard-preview/' + relative.as_posix())
    names = sorted(set(names))
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip()
    branch = subprocess.check_output(['git', 'branch', '--show-current'], cwd=REPO, text=True).strip()
    instructions = f'''SITE VISIÓN — PREVIEW LOCAL INTEGRADA

Rama: {branch}
Commit local: {commit}

1. Descomprimir todo el paquete conservando las carpetas.
2. Windows 10/11: ejecutar dashboard-preview/INICIAR-PREVIEW.bat.
   No requiere Python ni instalaciones. Dejar abierta su ventana.
   Otros sistemas con Python 3: desde esta carpeta, ejecutar:
   python dashboard-preview/serve.py --open
3. Abrir http://localhost:8765/dashboard-preview/review.html
4. Ctrl+C o cerrar la ventana del iniciador para detener el servidor local.

No publica nada. Los módulos originales conservan sus conexiones actuales.
La autenticación requiere un origen ya autorizado; no se modifican permisos.
El HTML suelto permite revisar consultas locales; mapa, clima y bot necesitan HTTP.

36 controles locales previos aprobados; {len(protected)} fuentes protegidas conservadas byte por byte.
Diseño visual aprobado por el usuario. Pendiente: integración conectada en origen autorizado
y comparación con el artefacto del pipeline operativo. No es una aprobación
para producción. Ver dashboard-preview/VALIDATION.md y REVIEW.md.
'''
    with zipfile.ZipFile(OUTPUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in names:
            archive.write(REPO / name, PREFIX + name)
        archive.writestr(PREFIX + 'ABRIR-PRIMERO.txt', instructions)
    with zipfile.ZipFile(OUTPUT) as archive:
        damaged = archive.testzip()
        if damaged:
            raise RuntimeError(f'Archivo dañado en el paquete: {damaged}')
        for name, expected in protected.items():
            if sha256(archive.read(PREFIX + name)) != expected:
                raise RuntimeError(f'Fuente alterada en el paquete: {name}')
    print(json.dumps({
        'package': str(OUTPUT), 'bytes': OUTPUT.stat().st_size,
        'files': len(names) + 1, 'protected_sources_verified': len(protected),
        'branch': branch, 'commit': commit,
    }, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
