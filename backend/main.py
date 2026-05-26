"""
UEX Trade Navigator - FastAPI Backend
API-only mode: frontend is deployed on Cloudflare Pages separately.
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
from api.routes import router
from version import VERSION

app = FastAPI(
    title="UEX Trade Navigator",
    description="Star Citizen Trading Route Planner API",
    version=VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://uex-trading-web.pages.dev",       # Cloudflare Pages default domain
        "https://uex-trading-web-production.up.railway.app",  # Railway backend (if accessed directly)
        "http://localhost:5173",                    # Local dev (Vite)
        "http://localhost:5174",                    # Local dev (Vite fallback port)
        "http://localhost:8000",                    # Local dev (direct)
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes (prefix /api)
app.include_router(router)

# Root endpoint — API info
@app.get("/")
async def root():
    return {"message": "UEX Trade Navigator API", "version": VERSION, "mode": "api-only"}

print("[API-only] Frontend served by Cloudflare Pages, backend running in API-only mode")
