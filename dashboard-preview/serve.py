"""Serve the unchanged site and its integrated preview on loopback only."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import argparse

ROOT = Path(__file__).resolve().parent.parent


class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        # Never expose Git internals through the review server.
        from urllib.parse import unquote, urlsplit
        parts = Path(unquote(urlsplit(self.path).path)).parts
        if any(part.startswith('.') for part in parts):
            self.send_error(404)
            return
        super().do_GET()

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        super().end_headers()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    parser.add_argument('--open', action='store_true', help='Abrir el visor en el navegador del equipo del revisor')
    args = parser.parse_args()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(PreviewHandler, directory=str(ROOT)))
    # Firebase already authorizes localhost; 127.0.0.1 is only the bind address.
    preview_url = f'http://localhost:{args.port}/dashboard-preview/review.html'
    print(f'Preview: {preview_url}', flush=True)
    print('No publica el sitio. Ctrl+C para cerrar. Los módulos conservan sus conexiones actuales.', flush=True)
    if args.open:
        import webbrowser
        webbrowser.open(preview_url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
