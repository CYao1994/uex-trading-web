"""
UEX Trade Navigator - Cloudflare Workers Python Entry Point
Uses native Cloudflare Workers Python API with ASGI bridge via asgiref.
"""
import json
import sys
import os
import traceback

# Add backend to Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(CURRENT_DIR, '..', '..', 'cloud-functions', 'backend')
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

_app = None

def _get_app():
    global _app
    if _app is None:
        from index import app
        _app = app
    return _app


async def on_fetch(request, env, ctx):
    """Handle all /api/* requests."""
    from js import Response

    try:
        app = _get_app()
    except Exception as e:
        return Response.new(
            json.dumps({"error": "Backend init failed", "detail": str(e)}),
            status=500,
            headers={"Content-Type": "application/json"}
        )

    try:
        method = request.method
        url = request.url

        # Extract path after /api/
        if "/api/" in url:
            path = "/" + url.split("/api/", 1)[-1].split("?")[0]
        else:
            path = "/" + url.split("://", 1)[-1].split("/", 1)[-1].split("?")[0]

        query = url.split("?", 1)[1] if "?" in url else ""

        # Read body
        body = b""
        try:
            body = bytes(await request.arrayBuffer())
        except Exception:
            pass

        # Build ASGI scope
        headers = []
        for k in request.headers.keys():
            v = request.headers.get(k)
            headers.append((k.lower().encode("utf-8"), v.encode("utf-8")))

        scope = {
            "type": "http",
            "method": method,
            "path": path,
            "query_string": query.encode("utf-8") if query else b"",
            "headers": headers,
            "server": ("localhost", 443),
        }

        # ASGI transport
        _response_body = bytearray()
        _response_status = 200
        _response_headers = []

        async def send(msg):
            nonlocal _response_body, _response_status, _response_headers
            if msg["type"] == "http.response.start":
                _response_status = msg.get("status", 200)
                _response_headers = msg.get("headers", [])
            elif msg["type"] == "http.response.body":
                _response_body.extend(msg.get("body", b""))

        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}

        await app(scope, receive, send)

        # Build response headers
        resp_headers = {}
        for k, v in _response_headers:
            rk = k.decode() if isinstance(k, bytes) else str(k)
            rv = v.decode() if isinstance(v, bytes) else str(v)
            resp_headers[rk] = rv

        return Response.new(bytes(_response_body), status=_response_status, headers=resp_headers)

    except Exception as e:
        tb = traceback.format_exc()
        return Response.new(
            json.dumps({"error": "Worker error", "detail": str(e), "tb": tb}),
            status=500,
            headers={"Content-Type": "application/json"}
        )
