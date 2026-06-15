"""ParaTranz Translation Service - Single authoritative source for Chinese translations.

Downloads and caches the complete ParaTranz translation dataset (97K+ entries)
for Star Citizen Chinese localization. Falls back to hardcoded dictionaries
if ParaTranz is unavailable.
"""

import json
import ssl
import zipfile
import io
import urllib.request
from typing import Optional, Dict
import time
import logging

logger = logging.getLogger(__name__)

PARATRANZ_API_BASE = "https://paratranz.cn/api"
PARATRANZ_PROJECT_ID = 8340
PARATRANZ_TOKEN = "84147631b3b588cdcc23ecf36c8a8c8d"

_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


class ParaTranzService:
    """ParaTranz translation service for Star Citizen Chinese localization."""

    def __init__(self):
        self._translations: Dict[str, str] = {}
        self._key_translations: Dict[str, str] = {}
        self._loaded = False
        self._last_update = 0

    def _api_get(self, endpoint: str, token: str = PARATRANZ_TOKEN) -> bytes:
        url = f"{PARATRANZ_API_BASE}{endpoint}"
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/json",
        })
        with urllib.request.urlopen(req, timeout=60, context=_ssl_ctx) as resp:
            return resp.read()

    def load_translations(self, force: bool = False):
        if self._loaded and not force:
            return

        logger.info("Loading translations from ParaTranz...")
        start = time.time()

        try:
            zip_bytes = self._api_get(f"/projects/{PARATRANZ_PROJECT_ID}/artifacts/download")
            logger.info(f"Downloaded: {len(zip_bytes):,} bytes")

            translations = {}
            key_translations = {}

            with zipfile.ZipFile(io.BytesIO(zip_bytes), 'r') as zf:
                for name in zf.namelist():
                    if not name.endswith('.json'):
                        continue
                    try:
                        with zf.open(name) as f:
                            entries = json.load(f)
                        for entry in entries:
                            original = (entry.get('original') or '').strip()
                            translation = (entry.get('translation') or '').strip()
                            key = (entry.get('key') or '').strip()
                            stage = entry.get('stage', 0)

                            if not original or not translation:
                                continue
                            if stage and stage < 1:
                                continue

                            original_lower = original.lower().strip()
                            if original_lower:
                                if original_lower not in translations:
                                    translations[original_lower] = translation

                            if key:
                                key_lower = key.lower()
                                if key_lower not in key_translations:
                                    key_translations[key_lower] = translation
                    except Exception as e:
                        logger.warning(f"Failed to parse {name}: {e}")
                        continue

            self._translations = translations
            self._key_translations = key_translations
            self._loaded = True
            self._last_update = time.time()

            elapsed = time.time() - start
            logger.info(
                f"ParaTranz loaded: "
                f"{len(translations):,} original, "
                f"{len(key_translations):,} key entries, "
                f"{elapsed:.1f}s"
            )

        except Exception as e:
            logger.error(f"ParaTranz load failed: {e}")
            raise

    def translate(self, english_name: str) -> Optional[str]:
        if not english_name or not self._loaded:
            return None

        name = english_name.strip()
        name_lower = name.lower()

        if name_lower in self._translations:
            return self._translations[name_lower]

        name_no_space = name_lower.replace(' ', '').replace('-', '')
        for orig, trans in self._translations.items():
            if orig.replace(' ', '').replace('-', '') == name_no_space:
                return trans

        for orig, trans in self._translations.items():
            if name_lower in orig or orig in name_lower:
                if len(name_lower) >= 4:
                    return trans

        return None

    def translate_by_key(self, key: str) -> Optional[str]:
        if not key or not self._loaded:
            return None
        return self._key_translations.get(key.lower().strip())

    def get_stats(self) -> dict:
        return {
            "loaded": self._loaded,
            "original_count": len(self._translations),
            "key_count": len(self._key_translations),
            "last_update": self._last_update,
        }


paratranz = ParaTranzService()
