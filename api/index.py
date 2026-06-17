"""
Vercel Serverless Function - FastAPI to WSGI adapter
Handles all /api/* requests and routes to FastAPI backend.
"""
import sys
import os
import json

# Add backend to Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, '..', 'cloud-functions', 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# Lazy load FastAPI app
_app = None

def _get_app():
    global _app
    if _app is None:
        from index import app
        _app = app
    return _app


def handler(request):
    """Vercel Python WSGI handler."""
    from asgiref.wsgi import WsgiToAsgi

    app = _get_app()
    asgi_app = WsgiToAsgi(app)

    # Convert WSGI request to ASGI
    path = request.get('PATH_INFO', '/')
    method = request.get('REQUEST_METHOD', 'GET')
    query_string = request.get('QUERY_STRING', '')
    body = request.get('wsgi.input', b'').read() if hasattr(request.get('wsgi.input', b''), 'read') else b''
    headers = [(k.lower(), v) for k, v in request.get('HTTP_', {}).items()]

    scope = {
        'type': 'http',
        'method': method,
        'path': path,
        'query_string': query_string.encode(),
        'headers': [(k.encode(), v.encode()) for k, v in headers],
        'server': ('localhost', 443),
    }

    # ASGI transport
    response_body = b''
    response_status = 200
    response_headers = []

    async def send(msg):
        nonlocal response_body, response_status, response_headers
        if msg['type'] == 'http.response.start':
            response_status = msg.get('status', 200)
            response_headers = msg.get('headers', [])
        elif msg['type'] == 'http.response.body':
            response_body += msg.get('body', b'')

    async def receive():
        return {'type': 'http.request', 'body': body, 'more_body': False}

    import asyncio
    loop = asyncio.new_event_loop()
    loop.run_until_complete(asgi_app(scope, receive, send))
    loop.close()

    # Build WSGI response
    status_line = f'HTTP/1.1 {response_status} OK'
    response_headers_dict = {}
    for k, v in response_headers:
        rk = k.decode() if isinstance(k, bytes) else str(k)
        rv = v.decode() if isinstance(v, bytes) else str(v)
        response_headers_dict[rk] = rv

    return {
        'status': response_status,
        'headers': response_headers_dict,
        'body': response_body,
    }
