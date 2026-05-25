"""
UEX Trade Navigator - FastAPI Backend
Serves both API and frontend static files in production mode.
"""
import sys
import os

# Ensure backend dir is in path for both package and direct execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Load .env file for local development (Railway uses its own env vars)
_env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '.env')
if os.path.isfile(_env_path):
    with open(_env_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, _, value = line.partition('=')
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    print(f"[Config] Loaded .env from {_env_path}")

# Log API key status
_api_key = os.environ.get("UEX_API_KEY", "")
if _api_key:
    print(f"[Config] UEX API Key: {_api_key[:8]}...{_api_key[-4:]}")
    print("[Config] Authenticated mode — full price data available")
else:
    print("[Config] WARNING: UEX_API_KEY not set!")
    print("[Config] Running in unauthenticated mode — data may be incomplete")
    print("[Config] Set UEX_API_KEY in .env (local) or Railway env vars (deployed)")
    print("[Config] Get your key at: https://uexcorp.space/api/apps")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from api.routes import router
from version import VERSION

app = FastAPI(
    title="UEX Trade Navigator",
    description="Star Citizen Trading Route Planner API",
    version=VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes (prefix /api)
app.include_router(router)

# --- Production: serve frontend static files ---
FRONTEND_DIST = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'frontend', 'dist')

if os.path.isdir(FRONTEND_DIST):
    # Mount assets (js, css, images)
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    # Serve other static files (favicon, icons, etc.)
    @app.get("/favicon.svg")
    async def favicon():
        return FileResponse(os.path.join(FRONTEND_DIST, "favicon.svg"))

    @app.get("/icons.svg")
    async def icons():
        return FileResponse(os.path.join(FRONTEND_DIST, "icons.svg"))

    # SPA fallback: all non-API, non-asset routes return index.html
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    print(f"[Production] Serving frontend from {FRONTEND_DIST}")
else:
    # Dev mode: just API, frontend served by Vite
    @app.get("/")
    async def root():
        return {"message": "UEX Trade Navigator API", "version": VERSION, "mode": "dev"}

    print("[Dev] Frontend dist not found, running in API-only mode")
