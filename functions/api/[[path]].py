"""
UEX Trade Navigator - Cloudflare Workers Python Entry Point
Uses native Cloudflare Workers Python API (no ASGI/Starlette dependency).
"""
import json
import sys
import os

# Add backend to path
BACKEND_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'cloud-functions', 'backend')
sys.path.insert(0, BACKEND_DIR)

# Lazy import FastAPI app
_app = None

def _get_app():
    global _app
    if _app is None:
        from index import app
        _app = app
    return _app


async def on_fetch(request, env, ctx):
    """Handle all /api/* requests using Cloudflare Workers native Python API."""
    from js import Response

    try:
        app = _get_app()
    except Exception as e:
        return Response.new(
            json.dumps({"error": "Backend import failed", "detail": str(e)}),
            status=500,
            headers={"Content-Type": "application/json"}
        )

    # Parse request
    method = request.method
    url = request.url
    # Extract path after /api/
    path = url.split("/api/", 1)[-1] if "/api/" in url else url.split("://", 1)[-1].split("/", 1)[-1]
    path = "/" + path
    query = url.split("?")[1] if "?" in url else ""

    # Read request body
    try:
        body = await request.arrayBuffer()
    except:
        body = b""

    # Build ASGI scope manually for Starlette
    headers_list = []
    for k, v in request.headers.items():
        headers_list.append((k.lower().encode("utf-8"), v.encode("utf-8")))

    scope = {
        "type": "http",
        "method": method,
        "path": path,
        "query_string": query.encode("utf-8") if query else b"",
        "headers": headers_list,
        "server": ("localhost", 443),
    }

    # ASGI send callback
    response_body = b""
    response_status = 200
    response_headers = []

    async def send(message):
        nonlocal response_body, response_status, response_headers
        if message["type"] == "http.response.start":
            response_status = message.get("status", 200)
            response_headers = message.get("headers", [])
        elif message["type"] == "http.response.body":
            response_body += message.get("body", b"")

    async def receive():
        return {"type": "http.request", "body": body, "more_body": False}

    try:
        await app(scope, receive, send)

        # Convert headers
        headers_dict = {}
        for k, v in response_headers:
            hk = k.decode() if isinstance(k, bytes) else k
            hv = v.decode() if isinstance(v, bytes) else v
            headers_dict[hk] = hv

        return Response.new(response_body, status=response_status, headers=headers_dict)

    except Exception as e:
        import traceback
        return Response.new(
            json.dumps({"error": "Internal server error", "detail": str(e), "traceback": traceback.format_exc()}),
            status=500,
            headers={"Content-Type": "application/json"}
        )
