"""
UEX Trade Navigator - FastAPI Backend (EdgeOne Cloud Functions)
Frontend and backend are co-located on EdgeOne Pages - same origin, no CORS needed.
Environment variables are configured via EdgeOne Pages console.
"""

import sys
import os
import logging
from contextlib import asynccontextmanager

# Ensure cloud-functions/backend dir is in path for both package and direct execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Log API key status (simplified for production)
_api_key = os.environ.get("UEX_API_KEY", "")
logging.info(f"[Config] UEX API Key configured: {bool(_api_key)}")

from fastapi import FastAPI
from api.routes import router
from version import VERSION

@asynccontextmanager
async def lifespan(app: FastAPI):
    def _preload_paratranz():
        try:
            from services.paratranz_service import paratranz
            paratranz.load_translations()
            # Invalidate caches that depend on translations
            from services.cache import terminal_cache, commodity_cache, vehicle_cache
            terminal_cache.invalidate()
            commodity_cache.invalidate()
            vehicle_cache.invalidate()
            logging.info("ParaTranz loaded, caches invalidated for re-translation")
        except Exception as e:
            logging.warning(f"ParaTranz preload failed (falling back to local dict): {e}")

    import threading
    threading.Thread(target=_preload_paratranz, daemon=True).start()
    yield

app = FastAPI(
    title="UEX Trade Navigator",
    description="Star Citizen Trading Route Planner API",
    version=VERSION,
    lifespan=lifespan,
)

# API routes (prefix /api)
app.include_router(router)

# Root endpoint - API info
@app.get("/")
async def root():
    return {"message": "UEX Trade Navigator API", "version": VERSION, "mode": "edgeone-fullstack"}
