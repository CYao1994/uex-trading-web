"""
UEX API Client - Handles TLS compatibility, authentication and caching.
Uses centralized TTL cache from cache.py.
"""
import json
import os
import subprocess
import time
import urllib.parse
from typing import Dict, List, Optional, Tuple

from services.cache import (
    terminal_cache, commodity_cache, price_cache, distance_cache,
    invalidate_all,
)

BASE_URL = "https://api.uexcorp.uk/2.0"


def _get_api_key() -> str:
    """Read UEX API Key from environment (lazy, so .env is loaded first)."""
    return os.environ.get("UEX_API_KEY", "")


def api_get(endpoint: str, params: dict = None, path_params: dict = None) -> dict:
    """GET request using curl with TLS fallback chain.
    Includes Authorization header when UEX_API_KEY is set.

    Args:
        endpoint: API resource name (e.g. "terminals", "commodities_prices")
        params: Query string parameters (appended as ?key=value)
        path_params: Path-style parameters (appended as /key/value/ — v2.0 native format)
    """
    # Build URL with path parameters first
    url = f"{BASE_URL}/{endpoint}"
    if path_params:
        for k, v in path_params.items():
            url += f"/{k}/{v}"
    # Ensure trailing slash for v2.0 API compatibility
    if not url.endswith("/"):
        url += "/"
    if params:
        qs = "&".join(
            f"{urllib.parse.quote(str(k))}={urllib.parse.quote(str(v))}"
            for k, v in params.items()
        )
        url += "?" + qs

    # Build curl headers — lazy read so .env is loaded first
    api_key = _get_api_key()
    header_args = []
    if api_key:
        header_args += ["-H", f"Authorization: Bearer {api_key}"]

    tls_options = [
        ["--tlsv1.2"],
        ["--tlsv1.3"],
        [],
    ]

    last_error = None
    for tls_args in tls_options:
        for attempt in range(2):
            try:
                cmd = ["curl", "-k", "-s"] + tls_args + ["--max-time", "90"] + header_args + [url]
                result = subprocess.run(
                    cmd, capture_output=True, text=True, timeout=120
                )
                if result.returncode != 0:
                    last_error = f"curl({result.returncode}): {result.stderr[:100]}"
                    if attempt < 1:
                        time.sleep(1)
                        continue
                    break
                data = json.loads(result.stdout)
                return data
            except json.JSONDecodeError:
                last_error = "JSON parse failed"
                if attempt < 1:
                    time.sleep(1)
                    continue
                break
            except subprocess.TimeoutExpired:
                last_error = "timeout"
                if attempt < 1:
                    time.sleep(2)
                    continue
                break
            except Exception as e:
                last_error = str(e)
                if attempt < 1:
                    time.sleep(1)
                    continue
                break

    raise RuntimeError(f"API error for {endpoint}: {last_error}")


def clear_caches():
    """Clear all UEX API caches — forces reload on next request."""
    invalidate_all()


def load_terminals(refresh: bool = False) -> List[Dict]:
    """Load all commodity terminals with TTL caching.

    Filters out PLATINUM BAY terminals because they have zero price data
    in the UEX API. Each PB location has a corresponding ADMIN terminal
    that has actual buy/sell prices.

    Args:
        refresh: If True, bypass cache and fetch fresh data.
    """
    if not refresh:
        cached = terminal_cache.get()
        if cached is not None:
            return cached

    try:
        data = api_get("terminals", path_params={"type": "commodity"})
        terminals = data.get("data", [])
        if terminals:
            filtered = [t for t in terminals if "platinum" not in t.get("name", "").lower()]
            terminal_cache.set(filtered)
            return filtered
    except Exception:
        pass

    # Fallback: try without type filter, filter locally
    try:
        data = api_get("terminals")
        terminals = [t for t in data.get("data", []) if t.get("type") == "commodity"]
        if terminals:
            filtered = [t for t in terminals if "platinum" not in t.get("name", "").lower()]
            terminal_cache.set(filtered)
            return filtered
    except Exception:
        pass

    # Return stale cache if available, else empty
    if terminal_cache.data is not None:
        return terminal_cache.data
    return []


def load_commodities(refresh: bool = False) -> List[Dict]:
    """Load all commodities with TTL caching.

    Args:
        refresh: If True, bypass cache and fetch fresh data.
    """
    if not refresh:
        cached = commodity_cache.get()
        if cached is not None:
            return cached

    try:
        data = api_get("commodities")
        commodities = data.get("data", [])
        if commodities:
            commodity_cache.set(commodities)
            return commodities
    except Exception:
        pass

    # Return stale cache if available, else empty
    if commodity_cache.data is not None:
        return commodity_cache.data
    return []


def search_terminal(query: str) -> Optional[Dict]:
    """Search terminal by name (fuzzy, supports Chinese)."""
    from services.data_mapper import get_terminal_zh
    terminals = load_terminals()
    q = query.lower().strip()

    # Exact nickname match
    for t in terminals:
        if t.get("nickname", "").lower() == q:
            return t
    # Exact name match
    for t in terminals:
        if t.get("name", "").lower() == q:
            return t
    # Fuzzy match
    for t in terminals:
        for field in ["name", "nickname", "displayname"]:
            val = t.get(field, "").lower()
            if q in val:
                return t
    # Chinese reverse lookup
    for t in terminals:
        zh = get_terminal_zh(
            t.get("name", ""), t.get("nickname", ""),
            t.get("space_station_name", ""),
            t.get("planet_name", ""), t.get("star_system_name", "")
        )
        if q in zh.lower():
            return t
    return None


def search_commodity(query: str) -> Optional[Dict]:
    """Search commodity by name (supports Chinese)."""
    from services.data_mapper import get_commodity_zh, COMMODITY_ZH_MAP
    commodities = load_commodities()
    q = query.lower().strip()

    # Chinese reverse lookup
    zh_to_en = {v.lower(): k for k, v in COMMODITY_ZH_MAP.items() if v}
    if q in zh_to_en:
        q = zh_to_en[q].lower()

    for c in commodities:
        if c.get("name", "").lower() == q:
            return c
    for c in commodities:
        if q in c.get("name", "").lower():
            return c
    return None


def get_commodity_prices(commodity_id: int, refresh: bool = False) -> List[Dict]:
    """Get prices for a commodity across all terminals.
    Uses per-commodity TTL cache.

    Args:
        commodity_id: UEX commodity ID
        refresh: If True, bypass cache and fetch fresh data.
    """
    if not refresh:
        cached = price_cache.get(commodity_id)
        if cached is not None:
            return cached

    try:
        data = api_get("commodities_prices", path_params={"id_commodity": commodity_id})
        prices = data.get("data", [])
        price_cache.set(commodity_id, prices)
        return prices
    except Exception:
        # Return stale cache on error
        cached = price_cache.get(commodity_id)
        if cached is not None:
            return cached
        return []


def fetch_routes_from_terminal(tid: int, refresh: bool = False) -> Dict[int, int]:
    """Get route distances from a terminal. Returns {dest_tid: distance}.
    Uses TTL cache with per-terminal query tracking.

    Args:
        tid: Origin terminal ID
        refresh: If True, bypass cache and fetch fresh data.
    """
    if not refresh and distance_cache.is_queried(tid):
        return distance_cache.get_routes_from(tid)

    try:
        data = api_get("commodities_routes", path_params={"id_terminal_origin": tid})
        routes = data.get("data", [])
    except Exception:
        routes = []

    seen = set()
    for r in routes:
        dest_tid = r.get("id_terminal_destination", 0)
        dist = r.get("distance", 0)
        if dest_tid and dist and (tid, dest_tid) not in seen:
            distance_cache.set_distance(tid, dest_tid, dist)
            seen.add((tid, dest_tid))

    distance_cache.mark_queried(tid)
    return distance_cache.get_routes_from(tid)


def get_distance(origin_tid: int, dest_tid: int) -> Optional[int]:
    """Get distance between two terminals."""
    if origin_tid == dest_tid:
        return 0
    cached = distance_cache.get_distance(origin_tid, dest_tid)
    if cached is not None:
        return cached
    routes = fetch_routes_from_terminal(origin_tid)
    return routes.get(dest_tid)


def build_distance_matrix(origin_tid: int, candidate_tids: List[int], refresh: bool = False) -> Dict[Tuple[int, int], Optional[int]]:
    """Build distance matrix between origin and candidates."""
    all_tids = set([origin_tid] + candidate_tids)

    # Step 1: Get routes from origin
    fetch_routes_from_terminal(origin_tid, refresh=refresh)

    # Step 2: Fill missing pairs by querying candidate terminals (max 12)
    known_pairs = set()
    for (ot, dt) in distance_cache._distances.keys():
        known_pairs.add((ot, dt))
        known_pairs.add((dt, ot))

    missing_tids = set()
    for a in candidate_tids:
        for b in candidate_tids:
            if a != b and (a, b) not in known_pairs:
                missing_tids.add(a)
                missing_tids.add(b)

    if missing_tids:
        def missing_count(tid):
            return sum(1 for other in all_tids
                       if other != tid
                       and distance_cache.get_distance(tid, other) is None)

        sorted_missing = sorted(missing_tids, key=missing_count, reverse=True)
        for i, tid in enumerate(sorted_missing[:12]):
            if not distance_cache.is_queried(tid):
                fetch_routes_from_terminal(tid, refresh=refresh)
                time.sleep(0.2)

    # Build matrix
    matrix: Dict[Tuple[int, int], Optional[int]] = {}
    for a in all_tids:
        for b in all_tids:
            if a == b:
                matrix[(a, b)] = 0
            else:
                d = distance_cache.get_distance(a, b)
                matrix[(a, b)] = d
    return matrix


def resolve_terminal(tid: int) -> dict:
    """Resolve terminal info from cache."""
    terminals = load_terminals()
    for t in terminals:
        if t.get("id") == tid:
            return t
    return {"id": tid, "name": f"Terminal-{tid}", "nickname": "",
            "star_system_name": "", "planet_name": "", "space_station_name": ""}
