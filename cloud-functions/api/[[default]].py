"""
UEX Trade Navigator - FastAPI Backend (EdgeOne Cloud Functions)
Frontend and backend are co-located on EdgeOne Pages - same origin, no CORS needed.
Environment variables are configured via EdgeOne Pages console.

CRITICAL: app = FastAPI(...) must be defined before any route module imports,
because EdgeOne scans for this entry identifier to register the function.
If imports fail, the app still exists with /health and / endpoints for diagnosis.
"""

import sys
import os
import logging

# Ensure the directory containing this file is in sys.path
# so local modules (app/, services/, version.py) can be imported
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from contextlib import asynccontextmanager

# Log API key status (simplified for production)
_api_key = os.environ.get("UEX_API_KEY", "")
logging.info(f"[Config] UEX API Key configured: {bool(_api_key)}")

# Try to import version; use fallback if unavailable
try:
    from version import VERSION
except ImportError:
    VERSION = "0.0.0-unknown"
    logging.warning("version module not available, using fallback")

# Define lifespan with safe imports
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

# === DEFINE app FIRST - this is the entry identifier EdgeOne requires ===
app = FastAPI(
    title="UEX Trade Navigator",
    description="Star Citizen Trading Route Planner API",
    version=VERSION,
    lifespan=lifespan,
)

# Health check endpoint - always available for diagnosis
@app.get("/health")
async def health():
    return {"status": "ok", "version": VERSION, "mode": "edgeone-fullstack"}

# Root endpoint - API info
@app.get("/")
async def root():
    return {"message": "UEX Trade Navigator API", "version": VERSION, "mode": "edgeone-fullstack"}

# === Now load the full route module (after app is defined) ===
try:
    from app.routes import router
    app.include_router(router)
    logging.info("All routes loaded successfully")
except Exception as e:
    logging.error(f"Failed to load routes module: {e}")
    import traceback
    logging.error(traceback.format_exc())