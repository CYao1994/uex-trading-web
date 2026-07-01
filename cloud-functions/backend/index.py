"""
UEX Trade Navigator - FastAPI Backend (EdgeOne Cloud Functions)

CRITICAL: app = FastAPI(...) must be defined before any route module imports,
because EdgeOne scans for this entry identifier to register the function.
"""

import sys
import os
import time
import logging
from collections import defaultdict
from contextlib import asynccontextmanager
from fastapi import Request
from fastapi.responses import JSONResponse

# Ensure cloud-functions/backend dir is in path for both package and direct execution
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

_api_key = os.environ.get("UEX_API_KEY", "")
logging.info(f"[Config] UEX API Key configured: {bool(_api_key)}")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

@asynccontextmanager
async def lifespan(app: FastAPI):
    def _preload_paratranz():
        try:
            from services.paratranz_service import paratranz
            paratranz.load_translations()
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

# === DEFINE app FIRST - EdgeOne requires this at module top level ===
app = FastAPI(
    title="UEX Trade Navigator",
    description="Star Citizen Trading Route Planner API",
    version="3.28.1",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple sliding window rate limiter
_rate_limits = defaultdict(list)

RATE_LIMITS = {
    "/sell-route": (2, 1),
    "/buy-route": (2, 1),
    "/trade-chain": (1, 1),
    "/commodities": (5, 1),
    "/terminals": (5, 1),
}

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    path = request.url.path
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{path}"

    for pattern, (max_req, window) in RATE_LIMITS.items():
        if path.startswith(pattern):
            now = time.time()
            _rate_limits[key] = [t for t in _rate_limits[key] if now - t < window]
            if len(_rate_limits[key]) >= max_req:
                return JSONResponse(status_code=429, content={"detail": "Too many requests"})
            _rate_limits[key].append(now)
            break

    return await call_next(request)

@app.get("/health")
async def health():
    return {"status": "ok", "version": "3.28.1"}

@app.get("/")
async def root():
    return {"message": "UEX Trade Navigator API", "version": "3.28.1", "mode": "edgeone-fullstack"}

# Now load routes AFTER app is defined
try:
    from api.routes import router
    app.include_router(router)
    logging.info("All routes loaded successfully")
except Exception as e:
    logging.error(f"Failed to load routes: {e}")
