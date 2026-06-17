"""
UEX Trade Navigator - FastAPI Backend (EdgeOne Cloud Functions)
Frontend and backend are co-located on EdgeOne Pages - same origin, no CORS needed.
Environment variables are configured via EdgeOne Pages console.

CRITICAL: app = FastAPI(...) must be defined before any route module imports,
because EdgeOne scans for this entry identifier to register the function.
If imports fail, the app still exists with /health and /debug for diagnosis.
"""

import sys
import os
import logging

# Ensure the directory containing this file is in sys.path
# so local modules (routes.py, schemas.py, services/, version.py) can be imported
_CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, _CURRENT_DIR)

from fastapi import FastAPI
from contextlib import asynccontextmanager

# Log API key status (simplified for production)
_api_key = os.environ.get("UEX_API_KEY", "")
logging.info(f"[Config] UEX API Key configured: {bool(_api_key)}")

# Try to import version; use fallback if unavailable
try:
    from version import VERSION
except ImportError as e:
    VERSION = "0.0.0-unknown"
    _version_import_error = str(e)
    logging.warning(f"version module not available: {e}")
else:
    _version_import_error = None

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

# Debug endpoint - reveals runtime environment for troubleshooting import issues
@app.get("/debug")
async def debug():
    """Diagnostic endpoint that shows EdgeOne runtime internals."""
    import traceback as tb_module
    
    # Collect directory contents
    try:
        dir_contents = os.listdir(_CURRENT_DIR)
    except Exception as e:
        dir_contents = [f"ERROR: {e}"]
    
    # Check if routes module exists
    routes_exists = os.path.exists(os.path.join(_CURRENT_DIR, "routes.py"))
    schemas_exists = os.path.exists(os.path.join(_CURRENT_DIR, "schemas.py"))
    feedback_exists = os.path.exists(os.path.join(_CURRENT_DIR, "feedback.py"))
    services_exists = os.path.isdir(os.path.join(_CURRENT_DIR, "services"))
    
    return {
        "current_dir": _CURRENT_DIR,
        "dir_contents": dir_contents,
        "sys_path": sys.path[:10],  # Show first 10 entries
        "file_check": {
            "routes.py": routes_exists,
            "schemas.py": schemas_exists,
            "feedback.py": feedback_exists,
            "services/": services_exists,
        },
        "version_import_error": _version_import_error,
        "routes_import_error": _routes_import_error,
        "routes_loaded": _routes_loaded,
        "python_path": os.environ.get("PYTHONPATH", ""),
        "app_routes": [r.path for r in app.routes] if hasattr(app, 'routes') else [],
    }

# === Now load the full route module (after app is defined) ===
_routes_import_error = None
_routes_loaded = False

try:
    from routes import router
    app.include_router(router)
    _routes_loaded = True
    logging.info("All routes loaded successfully")
except Exception as e:
    _routes_import_error = f"{type(e).__name__}: {e}\n{tb_module.format_exc()}"
    logging.error(f"Failed to load routes module: {e}")
    logging.error(tb_module.format_exc())