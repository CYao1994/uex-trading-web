"""
UEX Trade Navigator - FastAPI Backend (EdgeOne Cloud Functions)
Frontend and backend are co-located on EdgeOne Pages — same origin, no CORS needed.
Environment variables are configured via EdgeOne Pages console.
"""
import sys
import os

# Ensure cloud-functions/api dir is in path for both package and direct execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Log API key status
_api_key = os.environ.get("UEX_API_KEY", "")
if _api_key:
    print(f"[Config] UEX API Key: {_api_key[:8]}...{_api_key[-4:]}")
    print("[Config] Authenticated mode — full price data available")
else:
    print("[Config] WARNING: UEX_API_KEY not set!")
    print("[Config] Running in unauthenticated mode — data may be incomplete")
    print("[Config] Set UEX_API_KEY in EdgeOne Pages environment variables")
    print("[Config] Get your key at: https://uexcorp.space/api/apps")

from fastapi import FastAPI
from api.routes import router
from version import VERSION

app = FastAPI(
    title="UEX Trade Navigator",
    description="Star Citizen Trading Route Planner API",
    version=VERSION,
)

# API routes (prefix /api)
app.include_router(router)

# Root endpoint — API info
@app.get("/")
async def root():
    return {"message": "UEX Trade Navigator API", "version": VERSION, "mode": "edgeone-fullstack"}
