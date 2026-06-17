"""
Vercel Serverless Function - API Entry Point
All /api/* routes handled here.
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


def handler(request, response):
    """Vercel Python handler."""
    try:
        app = _get_app()

        path = request.url.split('?')[0]
        if '/api/' in path:
            path = '/' + path.split('/api/', 1)[-1]
        else:
            path = '/'

        query = request.url.split('?')[1] if '?' in request.url else ''

        headers = []
        for k, v in request.headers.items():
            headers.append((k.lower().encode('utf-8'), v.encode('utf-8')))

        scope = {
            'type': 'http',
            'method': request.method,
            'path': path,
            'query_string': query.encode('utf-8') if query else b'',
            'headers': headers,
            'server': ('localhost', 443),
        }

        _response_body = bytearray()
        _response_status = 200
        _response_headers = []

        async def send(msg):
            nonlocal _response_body, _response_status, _response_headers
            if msg['type'] == 'http.response.start':
                _response_status = msg.get('status', 200)
                _response_headers = msg.get('headers', [])
            elif msg['type'] == 'http.response.body':
                _response_body.extend(msg.get('body', b''))

        async def receive():
            body = request.body if hasattr(request, 'body') else b''
            return {'type': 'http.request', 'body': body, 'more_body': False}

        import asyncio
        loop = asyncio.new_event_loop()
        loop.run_until_complete(app(scope, receive, send))
        loop.close()

        response.status_code = _response_status
        for k, v in _response_headers:
            rk = k.decode() if isinstance(k, bytes) else str(k)
            rv = v.decode() if isinstance(v, bytes) else str(v)
            response.headers[rk] = rv
        response.body = bytes(_response_body)

        return response

    except Exception as e:
        import traceback
        response.status_code = 500
        response.headers['Content-Type'] = 'application/json'
        response.body = json.dumps({'error': 'Worker error', 'detail': str(e), 'tb': traceback.format_exc()})
        return response
