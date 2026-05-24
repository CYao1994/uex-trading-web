"""
Warbond Scraper Service
Fetches current warbond items from starnotifier.com and RSI store API.
Caches results for 1 hour to avoid excessive requests.
"""

import subprocess
import json
import re
import time
from datetime import datetime, timezone

_cache = {
    "data": None,
    "timestamp": 0,
}
_CACHE_TTL = 3600  # 1 hour in seconds

# RSI store base URL for warbond items
RSI_STORE_BASE = "https://robertsspaceindustries.com"

# Category URL slugs on RSI store
RSI_SHIPS_URL = f"{RSI_STORE_BASE}/store/pledge/browse/extras/standalone-ships?sort=weight&direction=desc"
RSI_UPGRADES_URL = f"{RSI_STORE_BASE}/store/pledge/browse/extras/ship-upgrades?sort=weight&direction=desc"


def _curl_get(url: str, timeout: int = 15) -> str:
    """HTTP GET via curl with TLS 1.2 fallback."""
    result = subprocess.run(
        ["curl", "-s", "-k", "--tlsv1.2", url],
        capture_output=True, text=True, timeout=timeout
    )
    return result.stdout


def _parse_starnotifier(html: str) -> dict:
    """Parse starnotifier.com/daily-warbonds HTML page."""
    result = {
        "ccu_items": [],
        "standalone_ships": [],
        "package_items": [],
        "other_items": [],
        "last_crawled": None,
    }

    # Extract last crawled date
    crawled_match = re.search(r'Last Data Crawled:.*?class="italic">(.*?)</span>', html, re.DOTALL)
    if crawled_match:
        result["last_crawled"] = crawled_match.group(1).strip()

    # Split into sections by <main> tags
    sections = re.findall(r'<main[^>]*>(.*?)</main>', html, re.DOTALL)

    for section in sections:
        # Determine section type
        is_ccu = "CCU Warbond" in section or "CCU" in section
        is_standalone = "standalone" in section.lower()

        # Extract items: <li><b>Name</b><ul><li><i>Warbond Edition 525$</i></li>...</ul></li>
        items_raw = re.findall(
            r'<li>\s*<b>(.*?)</b>\s*<ul>(.*?)</ul>',
            section, re.DOTALL
        )

        for name, details_html in items_raw:
            name = name.strip()
            # Parse warbond and standard prices
            warbond_price = None
            standard_price = None

            detail_items = re.findall(r'<i>(.*?)</i>', details_html)
            for detail in detail_items:
                detail = detail.strip()
                price_match = re.search(r'(\d+)\$', detail)
                if price_match:
                    price_val = int(price_match.group(1)) * 100  # Convert to cents
                    if "Warbond" in detail:
                        warbond_price = price_val
                    elif "Standard" in detail:
                        standard_price = price_val

            item = {
                "name": name,
                "category": "ccu" if is_ccu else ("standalone_ship" if is_standalone else "other"),
                "category_zh": "升级包" if is_ccu else ("单船" if is_standalone else "其他"),
                "warbond_price": warbond_price,
                "standard_price": standard_price,
                "rsi_url": RSI_UPGRADES_URL if is_ccu else RSI_SHIPS_URL,
                "image_url": None,
            }

            if is_ccu:
                result["ccu_items"].append(item)
            elif is_standalone:
                result["standalone_ships"].append(item)
            else:
                result["other_items"].append(item)

    # Also check for standalone ships without prices (plain <li>Name</li>)
    for section in sections:
        is_standalone = "standalone" in section.lower()
        if not is_standalone:
            continue

        # Find plain <li>Name</li> items (no <b> or <ul>)
        plain_items = re.findall(r'<li>\s*\n\s*([A-Za-z0-9][^\n<]+?)\s*\n\s*</li>', section)
        for name in plain_items:
            name = name.strip()
            # Check if already added (from the <b> pattern above)
            if not any(i["name"] == name for i in result["standalone_ships"]):
                result["standalone_ships"].append({
                    "name": name,
                    "category": "standalone_ship",
                    "category_zh": "单船",
                    "warbond_price": None,
                    "standard_price": None,
                    "rsi_url": RSI_SHIPS_URL,
                    "image_url": None,
                })

    return result


def _try_rsi_api():
    """Try to fetch warbond items directly from RSI store API."""
    items = []

    try:
        # Try fetching from the RSI getProducts API with warbond filter
        payload = json.dumps({
            "type": "extras",
            "sort": "weight",
            "search": "",
            "item_type": "warbond",
            "product_id": 72
        })
        result = subprocess.run(
            ["curl", "-s", "-k", "--tlsv1.2",
             f"{RSI_STORE_BASE}/api/store/getProducts",
             "-H", "Content-Type: application/json",
             "-d", payload],
            capture_output=True, text=True, timeout=15
        )
        data = json.loads(result.stdout)

        if data.get("success"):
            html = data.get("data", {}).get("html", "")
            # Extract category links
            categories = re.findall(r'href="(/pledge/[^"]+)"', html)
            # These are category pages, not individual items
            # We'd need to fetch each category page separately
            # For now, just use the starnotifier data
    except Exception:
        pass

    return items


def fetch_warbonds() -> dict:
    """Fetch current warbond items. Uses cache if available."""
    now = time.time()

    # Return cache if fresh
    if _cache["data"] and (now - _cache["timestamp"]) < _CACHE_TTL:
        return _cache["data"]

    try:
        html = _curl_get("https://starnotifier.com/daily-warbonds")
        if not html:
            raise Exception("Empty response from starnotifier")

        parsed = _parse_starnotifier(html)

        # Build response
        response = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "ccu_items": parsed["ccu_items"],
            "standalone_ships": parsed["standalone_ships"],
            "package_items": parsed["package_items"],
            "other_items": parsed["other_items"],
        }

        # Update cache
        _cache["data"] = response
        _cache["timestamp"] = now

        return response

    except Exception as e:
        # Return stale cache if available, otherwise empty
        if _cache["data"]:
            return _cache["data"]
        return {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "ccu_items": [],
            "standalone_ships": [],
            "package_items": [],
            "other_items": [],
            "error": str(e),
        }
