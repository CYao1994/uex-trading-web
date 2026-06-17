"""
UEX Trade Navigator - Cloudflare Workers Python Entry Point
Handles all /api/* routes and forwards to FastAPI backend.
"""
import json
import sys
import os

# Add the backend directory to Python path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(os.path.dirname(CURRENT_DIR), '..', 'cloud-functions', 'backend')
sys.path.insert(0, BACKEND_DIR)

async def on_fetch(request, env, ctx):
    """Handle all requests to /api/* routes."""
    try:
        from index import app
    except Exception as e:
        return Response(json.dumps({"error": "Backend import failed", "detail": str(e)}),
                       status=500, content_type="application/json")

    try:
        from starlette.requests import Request as StarletteRequest
        from starlette.responses import Response as StarletteResponse

        # Build ASGI scope from Cloudflare request
        url = request.url
        path = url.split("://", 1)[-1].split("/", 1)[-1] if "/" in url else "/"
        query = url.split("?")[1] if "?" in url else ""

        scope = {
            "type": "http",
            "method": request.method,
            "path": "/" + path,
            "query_string": query.encode() if query else b"",
            "headers": [(k.lower().encode(), v.encode()) for k, v in request.headers.items()],
            "server": ("localhost", 443),
        }

        body = await request.arrayBuffer()

        async def receive():
            return {"type": "http.request", "body": bytes(body), "more_body": False}

        response_body = b""
        response_status = 200
        response_headers = []

        async def send(message):
            nonlocal response_body, response_status, response_headers
            if message["type"] == "http.response.start":
                response_status = message["status"]
                response_headers = message.get("headers", [])
            elif message["type"] == "http.response.body":
                response_body += message.get("body", b"")

        await app(scope, receive, send)

        headers_dict = {}
        for k, v in response_headers:
            headers_dict[k.decode() if isinstance(k, bytes) else k] = v.decode() if isinstance(v, bytes) else v

        return Response(response_body, status=response_status, headers=headers_dict)

    except Exception as e:
        import traceback
        return Response(json.dumps({"error": "Internal server error", "detail": str(e), "trace": traceback.format_exc()}),
                       status=500, content_type="application/json")
