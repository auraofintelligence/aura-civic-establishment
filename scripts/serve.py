from pathlib import Path
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
import argparse
import functools

ap=argparse.ArgumentParser();ap.add_argument('--port',type=int,default=8768);args=ap.parse_args()
root=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    extensions_map={**SimpleHTTPRequestHandler.extensions_map,'.mjs':'text/javascript','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp'}
server=ThreadingHTTPServer(('127.0.0.1',args.port),functools.partial(Handler,directory=str(root)))
print(f'Serving Aura Civic Establishment at http://127.0.0.1:{args.port}/',flush=True)
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
