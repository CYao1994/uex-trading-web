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
    try:
        from services.paratranz_service import paratranz
        paratranz.load_translations()
    except Exception as e:
        logging.warning(f"ParaTranz preload failed (falling back to local dict): {e}")
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
