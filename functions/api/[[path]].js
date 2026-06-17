"""
UEX Trade Navigator - Cloudflare Workers Python Entry Point
This file handles all /api/* routes and forwards to the FastAPI backend.
"""
from js import Response
import json

# Import the FastAPI app
try:
    from cloud_functions.backend.index import app
    APP_AVAILABLE = True
except Exception as e:
    APP_AVAILABLE = False
    IMPORT_ERROR = str(e)

async def on_fetch(request, env, ctx):
    """Handle all requests to /api/* routes."""
    if not APP_AVAILABLE:
        return Response.new(
            json.dumps({"error": "Backend unavailable", "detail": IMPORT_ERROR}),
            status=500,
            headers={"Content-Type": "application/json"}
        )
    
    try:
        # Use Starlette/ASGI to handle the request
        from starlette.requests import Request as StarletteRequest
        from starlette.responses import Response as StarletteResponse
        
        # Convert Cloudflare request to Starlette request
        body = await request.arrayBuffer()
        scope = {
            "type": "http",
            "method": request.method,
            "path": request.url.split("?")[0].split("://", 1)[-1].split("/", 1)[-1] if "/" in request.url else "/",
            "query_string": request.url.split("?")[1].encode() if "?" in request.url else b"",
            "headers": [(k.lower(), v) for k, v in request.headers.items()],
            "server": ("localhost", 443),
        }
        
        # Use ASGI adapter
        from asgiref.sync import async_to_sync
        import asyncio
        
        async def receive():
            return {"type": "http.request", "body": body, "more_body": False}
        
        response_started = False
        response_body = b""
        response_status = 200
        response_headers = []
        
        async def send(message):
            nonlocal response_started, response_body, response_status, response_headers
            if message["type"] == "http.response.start":
                response_status = message["status"]
                response_headers = message.get("headers", [])
            elif message["type"] == "http.response.body":
                response_body += message.get("body", b"")
        
        await app(scope, receive, send)
        
        headers_dict = {k.decode(): v.decode() for k, v in response_headers}
        return Response.new(response_body, status=response_status, headers=headers_dict)
        
    except Exception as e:
        return Response.new(
            json.dumps({"error": "Internal server error", "detail": str(e)}),
            status=500,
            headers={"Content-Type": "application/json"}
        )
