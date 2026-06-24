"""ParaTranz Translation Service - Single authoritative source for Chinese translations.

Downloads and caches the complete ParaTranz translation dataset (97K+ entries)
for Star Citizen Chinese localization. Falls back to hardcoded dictionaries
if ParaTranz is unavailable.
"""

import json
import os
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
# Token 从环境变量读取，避免硬编码泄露
# 在 EdgeOne Pages 控制台设置环境变量 PARATRANZ_TOKEN
PARATRANZ_TOKEN = os.environ.get("PARATRANZ_TOKEN", "")

_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

# Known manufacturer English names for prefix matching
_MANUFACTURER_EN = [
    "Anvil", "Aegis", "Argo", "Banu", "Consolidated Outland", "Crusader",
    "Drake", "Esperia", "Greycat", "Kruger", "MISC", "Origin", "RSI",
    "Tumbril", "Xi'an", "Gatac", "Vanduul",
]


class ParaTranzService:
    """ParaTranz translation service for Star Citizen Chinese localization."""

    def __init__(self):
        self._translations: Dict[str, str] = {}
        self._key_translations: Dict[str, str] = {}
        self._loaded = False
        self._last_update = 0

    def _api_get(self, endpoint: str, token: str = None) -> bytes:
        if token is None:
            token = PARATRANZ_TOKEN
        if not token:
            raise RuntimeError("PARATRANZ_TOKEN environment variable is not set")
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
                            if stage is not None and stage < 1:
                                continue
                            if translation == original:
                                continue
                            if len(original) <= 2:
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

        # 1. Exact match
        if name_lower in self._translations:
            trans = self._translations[name_lower]
            if self._is_valid_translation(trans, name):
                # Also try finding a longer match with manufacturer prefix
                # e.g. "C8 Pisces" -> try "Anvil C8 Pisces" which gives "铁砧 C8 双鱼座"
                best = trans
                for prefix in _MANUFACTURER_EN:
                    full_key = (prefix + " " + name_lower).lower()
                    if full_key in self._translations:
                        full_trans = self._translations[full_key]
                        if self._is_valid_translation(full_trans, name):
                            if len(full_trans) >= len(best):
                                best = full_trans
                return best

        # 2. Space/hyphen normalized match
        name_no_space = name_lower.replace(' ', '').replace('-', '')
        for orig, trans in self._translations.items():
            if orig.replace(' ', '').replace('-', '') == name_no_space:
                if self._is_valid_translation(trans, name):
                    return trans

        # 3. Non-overlapping longest-first substring replacement
        # Only replace if the best match covers >= 50% of input to avoid
        # partial word corruption in compound names
        matches = []
        for orig, trans in self._translations.items():
            if len(orig) <= 2:
                continue
            if trans == orig:
                continue
            if all(c in ' -._0123456789' for c in orig):
                continue
            if orig in name_lower:
                matches.append((orig, trans))

        if not matches:
            return None

        matches.sort(key=lambda x: len(x[0]), reverse=True)

        best_orig, best_trans = matches[0]
        if len(best_orig) < len(name) * 0.5:
            return None

        # Greedy non-overlapping replacement
        occupied = set()
        result_chars = list(name)
        for orig, trans in matches:
            start = name_lower.find(orig)
            if start == -1:
                continue
            end = start + len(orig)
            if any(i in occupied for i in range(start, end)):
                continue
            occupied.update(range(start, end))
            for i in range(start, end):
                result_chars[i] = None
            result_chars[start] = trans

        return ''.join(c for c in result_chars if c is not None)

    @staticmethod
    def _is_valid_translation(trans: str, orig: str) -> bool:
        if not trans:
            return False
        if len(trans) > len(orig) * 4:
            return False
        has_chinese = any('\u4e00' <= c <= '\u9fff' for c in trans)
        if not has_chinese:
            return False
        return True

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
