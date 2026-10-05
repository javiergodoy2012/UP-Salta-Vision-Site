"""Append the approved shell after the existing map build; leave modules intact."""
from pathlib import Path
import hashlib
import json
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Uso: prepare_publication.py DIRECTORIO_ARTEFACTO')
    site = Path(sys.argv[1]).resolve()
    if site == REPO or not (site / 'index.html').is_file():
        raise SystemExit('Se requiere un artefacto separado con el mapa ya construido.')
    original = (site / 'index.html').read_bytes()
    text = original.decode('utf-8')
    if 'id="dashboardApp"' not in text or '</html>' not in text:
        raise SystemExit('Falta el mapa original completo; se cancela la publicación.')
    if (site / 'explorar.html').exists():
        raise SystemExit('explorar.html ya existe; no se sustituye otro documento.')

    # These assets are taken from current main, not the earlier September preview.
    climate_files = ['clima/index.html', 'clima/acumulados/acumulados-ui.css',
                     'clima/acumulados/precipitacion-historica.js',
                     'clima/acumulados/acumulados-ui.js',
                     'clima/acumulados/estadisticas-mensuales.js']
    for name in climate_files:
        if (site / name).read_bytes() != (REPO / name).read_bytes():
            raise SystemExit('El artefacto no conserva Clima actual: ' + name)

    subprocess.run([sys.executable, str(ROOT / 'build.py')], cwd=REPO, check=True)
    shell = (ROOT / 'site-vision-dashboard.html').read_text()
    commit = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=REPO, text=True).strip()
    shell = shell.replace('<html lang="es">', '<html lang="es" data-red-src="./explorar.html" '
                          'data-clima-src="./clima/index.html" data-site-release="' + commit + '">', 1)
    replacements = {
        ' VISTA PREVIA</span>': ' SITE VISIÓN</span>',
        'Shell en evaluación': 'Consulta integrada',
        'Preview local</span>': 'UP Salta Visión</span>',
        'Vista previa de diseño': 'Vista general de la red',
        'Datos del sitio, sin conexión en vivo': 'Registros del sitio · Mapa y Clima integrados',
        'para evaluar su organización y navegación.': 'con una navegación integrada.',
        'ACERCA DE LA PREVIEW': 'ACERCA DE SITE VISIÓN',
    }
    for old, new in replacements.items():
        if shell.count(old) != 1:
            raise SystemExit('No se encontró un texto único del shell: ' + old)
        shell = shell.replace(old, new, 1)
    metadata = '''<meta name="theme-color" content="#07111b">
  <meta property="og:title" content="Site Visión · UP Salta">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://upsaltavision.com.ar/">
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/site-vision-icon-192.png">
'''
    shell = shell.replace('</head>', metadata + '</head>', 1)
    # Reuse the exact existing PWA registration, without changing its behavior.
    worker = re.search(r'<script>\s*if \(\x27serviceWorker\x27 in navigator\) \{[\s\S]*?</script>', text)
    if not worker:
        raise SystemExit('No se encontró el registro PWA original.')
    shell = shell.replace('</body>', worker.group(0) + '\n</body>', 1)

    (site / 'explorar.html').write_bytes(original)
    (site / 'index.html').write_text(shell)
    # Preview launchers, test tools and documentation are not web-facing assets.
    preview_copy = site / ROOT.name
    if preview_copy.is_dir():
        shutil.rmtree(preview_copy)
    if preview_copy.exists():
        raise SystemExit('No se pudieron retirar las herramientas de preview del artefacto.')
    assert (site / 'explorar.html').read_bytes() == original
    print(json.dumps({'release': commit,
                      'map_sha256': hashlib.sha256(original).hexdigest(),
                      'clima_sha256': hashlib.sha256((site / 'clima/index.html').read_bytes()).hexdigest(),
                      'entry': 'index.html', 'map': 'explorar.html',
                      'climate_assets_preserved': len(climate_files)}))


if __name__ == '__main__':
    main()
