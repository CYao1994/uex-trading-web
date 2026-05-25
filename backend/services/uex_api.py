"""
UEX API Client - Handles TLS compatibility, authentication and caching
"""
import json
import os
import subprocess
import time
import urllib.parse
from typing import Dict, List, Optional, Tuple

BASE_URL = "https://api.uexcorp.space/v2.1"

# Module-level caches (shared across functions, importable by route_planner)
_distance_cache: Dict[Tuple[int, int], int] = {}
_routes_queried: set = set()
_terminal_cache: List[Dict] = []
_terminal_cache_loaded: bool = False
_commodity_cache: List[Dict] = []
_commodity_cache_loaded: bool = False


def _get_api_key() -> str:
    """Read UEX API Key from environment (lazy, so .env is loaded first)."""
    return os.environ.get("UEX_API_KEY", "")


def api_get(endpoint: str, params: dict = None) -> dict:
    """GET request using curl with TLS fallback chain.
    Includes Authorization header when UEX_API_KEY is set.
    """
    url = f"{BASE_URL}/{endpoint}"
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
    global _terminal_cache, _terminal_cache_loaded
    global _commodity_cache, _commodity_cache_loaded
    global _distance_cache, _routes_queried
    _terminal_cache = []
    _terminal_cache_loaded = False
    _commodity_cache = []
    _commodity_cache_loaded = False
    _distance_cache = {}
    _routes_queried = set()


def load_terminals() -> List[Dict]:
    """Load all commodity terminals with caching.

    Filters out PLATINUM BAY terminals because they have zero price data
    in the UEX API. Each PB location has a corresponding ADMIN terminal
    that has actual buy/sell prices.
    
    NOTE: Does NOT cache empty results from failed API calls to prevent
    "poisoned cache" — if UEX API is temporarily down, we retry on next request.
    """
    global _terminal_cache, _terminal_cache_loaded
    if _terminal_cache_loaded and _terminal_cache:
        return _terminal_cache
    try:
        data = api_get("terminals", {"per_page": 500, "type": "commodity"})
        terminals = data.get("data", [])
        if terminals:
            _terminal_cache = terminals
            _terminal_cache_loaded = True
            # Filter PLATINUM BAY after confirming data loaded
            _terminal_cache = [t for t in _terminal_cache if "platinum" not in t.get("name", "").lower()]
            return _terminal_cache
    except Exception:
        pass
    
    # Fallback: try without type filter
    try:
        data = api_get("terminals", {"per_page": 500})
        terminals = [t for t in data.get("data", []) if t.get("type") == "commodity"]
        if terminals:
            _terminal_cache = [t for t in terminals if "platinum" not in t.get("name", "").lower()]
            _terminal_cache_loaded = True
            return _terminal_cache
    except Exception:
        pass
    
    # Return empty but DON'T cache — allow retry on next request
    return []


def load_commodities() -> List[Dict]:
    """Load all commodities with caching.
    
    NOTE: Does NOT cache empty results from failed API calls to prevent
    "poisoned cache" — if UEX API is temporarily down, we retry on next request.
    """
    global _commodity_cache, _commodity_cache_loaded
    if _commodity_cache_loaded and _commodity_cache:
        return _commodity_cache
    try:
        data = api_get("commodities", {"per_page": 500})
        commodities = data.get("data", [])
        if commodities:
            _commodity_cache = commodities
            _commodity_cache_loaded = True
            return _commodity_cache
    except Exception:
        pass
    # Return empty but DON'T cache — allow retry on next request
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


def get_commodity_prices(commodity_id: int) -> List[Dict]:
    """Get prices for a commodity across all terminals."""
    data = api_get(f"commodities_prices/id_commodity/{commodity_id}")
    return data.get("data", [])


def fetch_routes_from_terminal(tid: int) -> Dict[int, int]:
    """Get route distances from a terminal. Returns {dest_tid: distance}."""
    if tid in _routes_queried:
        return {dt: d for (ot, dt), d in _distance_cache.items() if ot == tid}

    try:
        data = api_get(f"commodities_routes/id_terminal_origin/{tid}", {"per_page": 500})
        routes = data.get("data", [])
    except Exception:
        routes = []

    result = {}
    seen = set()
    for r in routes:
        dest_tid = r.get("id_terminal_destination", 0)
        dist = r.get("distance", 0)
        if dest_tid and dist and (tid, dest_tid) not in seen:
            _distance_cache[(tid, dest_tid)] = dist
            result[dest_tid] = dist
            seen.add((tid, dest_tid))

    _routes_queried.add(tid)
    return result


def get_distance(origin_tid: int, dest_tid: int) -> Optional[int]:
    """Get distance between two terminals."""
    if origin_tid == dest_tid:
        return 0
    if (origin_tid, dest_tid) in _distance_cache:
        return _distance_cache[(origin_tid, dest_tid)]
    if (dest_tid, origin_tid) in _distance_cache:
        return _distance_cache[(dest_tid, origin_tid)]
    routes = fetch_routes_from_terminal(origin_tid)
    return routes.get(dest_tid)


def build_distance_matrix(origin_tid: int, candidate_tids: List[int]) -> Dict[Tuple[int, int], Optional[int]]:
    """Build distance matrix between origin and candidates."""
    all_tids = set([origin_tid] + candidate_tids)

    # Step 1: Get routes from origin
    fetch_routes_from_terminal(origin_tid)

    # Step 2: Fill missing pairs by querying candidate terminals (max 12)
    known_pairs = set()
    for (ot, dt) in _distance_cache.keys():
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
                       and (tid, other) not in _distance_cache
                       and (other, tid) not in _distance_cache)

        sorted_missing = sorted(missing_tids, key=missing_count, reverse=True)
        for i, tid in enumerate(sorted_missing[:12]):
            if tid not in _routes_queried:
                fetch_routes_from_terminal(tid)
                time.sleep(0.2)

    # Build matrix
    matrix: Dict[Tuple[int, int], Optional[int]] = {}
    for a in all_tids:
        for b in all_tids:
            if a == b:
                matrix[(a, b)] = 0
            elif (a, b) in _distance_cache:
                matrix[(a, b)] = _distance_cache[(a, b)]
            elif (b, a) in _distance_cache:
                matrix[(a, b)] = _distance_cache[(b, a)]
            else:
                matrix[(a, b)] = None
    return matrix


def resolve_terminal(tid: int) -> dict:
    """Resolve terminal info from cache."""
    terminals = load_terminals()
    for t in terminals:
        if t.get("id") == tid:
            return t
    return {"id": tid, "name": f"Terminal-{tid}", "nickname": "",
            "star_system_name": "", "planet_name": "", "space_station_name": ""}
