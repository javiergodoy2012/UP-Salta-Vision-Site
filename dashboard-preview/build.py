"""Build an offline UI preview. Reads production sources; writes only this folder."""
from pathlib import Path
import base64
import hashlib
import json
import math
import re
import subprocess

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
SOURCE = (REPO / 'index.html').read_text()
assert '</body>' in SOURCE and '</html>' in SOURCE, 'Refusing an incomplete index.html'


def constant(name):
    match = re.search(r'(?:const|let|var) ' + name + r'\s*=\s*', SOURCE)
    if not match:
        raise ValueError(f'Missing {name} in complete index.html')
    return json.JSONDecoder().raw_decode(SOURCE[match.end():])[0]


def array_file(name):
    text = (REPO / name).read_text()
    return json.loads(text[text.index('['):text.rindex(']') + 1])


def data_url(path, mime):
    return f'data:{mime};base64,' + base64.b64encode(path.read_bytes()).decode()


network = constant('NETWORK')
# Screen coordinates only: every original vertex is drawn, in its original order.
# No rail correction, PK interpolation, resampling or operational map code runs here.
routes = {}
for name, route in network.items():
    xy = [[(p[2] + 69) * 100 * math.cos(math.radians(24)), (-21 - p[1]) * 100]
          for p in route['puntos']]
    routes[name] = {k: v for k, v in route.items() if k != 'puntos'}
    routes[name].update({
        'path': 'M' + 'L'.join(f'{x:.3f},{y:.3f}' for x, y in xy),
        'bounds': [min(p[0] for p in xy), min(p[1] for p in xy),
                   max(p[0] for p in xy), max(p[1] for p in xy)],
        'start': xy[0], 'end': xy[-1], 'vertices': len(xy),
    })

sources = ['index.html', 'cruces-habilitados-data.js', 'interferencias-data.js',
           'site-vision-logo-v2-512.png', 'clima/index.html', 'site-assistant.js',
           'site-assistant.css', 'assistant-reasoning.js', 'cruces-habilitados.js',
           'interferencias.js', 'clima/firebase-messaging-sw.js', 'site-vision-sw.js',
           'google-maps-config.js', 'clima/acumulados/acumulados-ui.css',
           'clima/acumulados/precipitacion-historica.js',
           'clima/acumulados/acumulados-ui.js', 'clima/acumulados/estadisticas-mensuales.js']
data = {
    'crossings': array_file('cruces-habilitados-data.js'),
    'services': array_file('interferencias-data.js'),
    'stations': constant('STATIONS'),
    'incidents': constant('DESCARRILOS'),
    'routes': routes,
    'sourceCommit': subprocess.check_output(['git', 'merge-base', 'HEAD', 'origin/main'], cwd=REPO, text=True).strip(),
    'sourceDate': subprocess.check_output(['git', 'log', '-1', '--format=%cs', '--', 'index.html',
                                         'cruces-habilitados-data.js', 'interferencias-data.js'],
                                        cwd=REPO, text=True).strip(),
    'sourceHashes': {f: hashlib.sha256((REPO / f).read_bytes()).hexdigest() for f in sources},
}
assert len(data['crossings']) == 269 and len(data['services']) == 90
font_css = '/* Inter font license\n' + (ROOT / 'vendor/Inter-OFL.txt').read_text() + '*/\n' + (ROOT / 'vendor/fonts.css').read_text()
for filename in re.findall(r'url\(([^)]+)\)', font_css):
    font_css = font_css.replace(filename, data_url(ROOT / 'vendor' / filename, 'font/ttf'))

html = (ROOT / 'template.html').read_text()
for key, value in {
    '__FONT_CSS__': font_css,
    '__SHARED_THEME__': (ROOT / 'shared-theme.css').read_text(),
    '__MODULE_SKIN__': (ROOT / 'module-skin.css').read_text(),
    '__MODULE_HOST__': (ROOT / 'module-host.js').read_text(),
    '__STYLE__': (ROOT / 'style.css').read_text(),
    '__LOGO__': data_url(REPO / 'site-vision-logo-v2-512.png', 'image/png'),
    '__DATA__': json.dumps(data, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/'),
    '__LUCIDE__': (ROOT / 'vendor/lucide.min.js').read_text(),
    '__APP__': (ROOT / 'app.js').read_text(),
}.items():
    html = html.replace(key, value)
assert not re.search(r'__(?:APP|DATA|STYLE|LOGO|LUCIDE|FONT_CSS|SHARED_THEME|MODULE_SKIN|MODULE_HOST)__', html)
output = ROOT / 'site-vision-dashboard.html'
output.write_text(html)
(ROOT / 'source-manifest.json').write_text(json.dumps({
    k: data[k] for k in ['sourceCommit', 'sourceDate', 'sourceHashes']
}, indent=2) + '\n')
print(json.dumps({'output': str(output), 'bytes': output.stat().st_size,
                  'crossings': len(data['crossings']), 'services': len(data['services']),
                  'stations': len(data['stations']), 'incidents': len(data['incidents']),
                  'vertices': sum(r['vertices'] for r in routes.values())}))
