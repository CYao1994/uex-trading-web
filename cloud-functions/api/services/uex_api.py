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
    vehicle_cache, all_prices_cache,
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


# Star systems that are currently available in Star Citizen live build.
# The default terminals endpoint only returns Stanton; we must query
# each available system separately to get complete coverage.
_AVAILABLE_STAR_SYSTEMS = [68, 64, 55]  # Stanton, Pyro, Nyx


def _fetch_commodity_terminals_for_system(system_id: int) -> List[Dict]:
    """Fetch commodity terminals for a specific star system."""
    try:
        data = api_get("terminals", params={"id_star_system": system_id})
        terminals = data.get("data", [])
        return [t for t in terminals
                if t.get("type") == "commodity"
                and "platinum" not in t.get("name", "").lower()]
    except Exception:
        return []


def load_terminals(refresh: bool = False) -> List[Dict]:
    """Load all commodity terminals across all available star systems with TTL caching.

    The default UEX terminals endpoint only returns Stanton (id_star_system=68).
    To include Pyro and Nyx terminals, we query each available system separately
    and merge the results.

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

    # Primary: fetch from each available star system separately
    all_terminals = []
    for sid in _AVAILABLE_STAR_SYSTEMS:
        sys_terminals = _fetch_commodity_terminals_for_system(sid)
        all_terminals.extend(sys_terminals)

    if all_terminals:
        # Deduplicate by terminal id (in case of overlap)
        seen_ids = set()
        unique = []
        for t in all_terminals:
            tid = t.get("id")
            if tid and tid not in seen_ids:
                seen_ids.add(tid)
                unique.append(t)
        terminal_cache.set(unique)
        return unique

    # Fallback: try default endpoint (Stanton only)
    try:
        data = api_get("terminals", path_params={"type": "commodity"})
        terminals = data.get("data", [])
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
        dist = r.get("distance")
        if dest_tid and dist is not None and (tid, dest_tid) not in seen:
            distance_cache.set_distance(tid, dest_tid, dist)
            seen.add((tid, dest_tid))

    distance_cache.mark_queried(tid)
    return distance_cache.get_routes_from(tid)


def _get_location_key(td: dict) -> str:
    """Create a location key for a terminal to group same-location terminals.

    Terminals at the same city, outpost, or space station share the same
    location key, meaning they can use each other's route distances.

    Priority: space_station > city > outpost > planet
    NOTE: UEX API sometimes sets city_name for space station terminals
    (e.g., Seraphim Station has city_name=Orison). We prioritize
    space_station_name when both are set, since the terminal is physically
    at the space station, not in the city.
    """
    system = td.get("star_system_name") or ""
    planet = td.get("planet_name") or ""
    city = td.get("city_name") or ""
    outpost = td.get("outpost_name") or ""
    station = td.get("space_station_name") or ""
    # Priority: same station > same city > same outpost > same planet
    if station:
        return f"{system}|{planet}|station:{station}"
    if city:
        return f"{system}|{planet}|city:{city}"
    if outpost:
        return f"{system}|{planet}|outpost:{outpost}"
    return f"{system}|{planet}|{td.get('name', '')}"


def _build_location_index() -> Dict[str, List[int]]:
    """Build an index: location_key -> [terminal_ids].

    Used to find same-location terminals for distance inference.
    """
    terminals = load_terminals()
    index: Dict[str, List[int]] = {}
    for t in terminals:
        key = _get_location_key(t)
        tid = t.get("id", 0)
        if tid and key:
            index.setdefault(key, []).append(tid)
    return index


def _infer_distance_via_location(origin_tid: int, dest_tid: int) -> Optional[int]:
    """Try to infer distance using same-location terminals.

    If we can't find distance from A to B directly, but there's a terminal A'
    at the same location as A with a known distance to B, use that.
    """
    origin_td = resolve_terminal(origin_tid)
    origin_key = _get_location_key(origin_td)
    if not origin_key:
        return None

    loc_index = _build_location_index()
    same_loc_tids = loc_index.get(origin_key, [])

    for other_tid in same_loc_tids:
        if other_tid == origin_tid:
            continue
        # Check if we have distance from this same-location terminal to dest
        d = distance_cache.get_distance(other_tid, dest_tid)
        if d is not None:
            # Cache this inferred distance for future lookups
            distance_cache.set_distance(origin_tid, dest_tid, d)
            return d

    return None


def get_distance(origin_tid: int, dest_tid: int) -> Optional[int]:
    """Get distance between two terminals.

    Lookup order:
    1. Direct cache lookup (includes reverse)
    2. Query routes from origin terminal
    3. Infer via same-location terminals
    """
    if origin_tid == dest_tid:
        return 0
    cached = distance_cache.get_distance(origin_tid, dest_tid)
    if cached is not None:
        return cached
    routes = fetch_routes_from_terminal(origin_tid)
    d = routes.get(dest_tid)
    if d is not None:
        return d
    # Try inferring via same-location terminals
    return _infer_distance_via_location(origin_tid, dest_tid)


def build_distance_matrix(origin_tid: int, candidate_tids: List[int], refresh: bool = False) -> Dict[Tuple[int, int], Optional[int]]:
    """Build distance matrix between origin and candidates.

    Includes same-location distance inference to handle sparse UEX route data.
    """
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

    # Step 3: Infer distances via same-location terminals
    loc_index = _build_location_index()
    for a in all_tids:
        a_td = resolve_terminal(a)
        a_key = _get_location_key(a_td)
        same_loc = loc_index.get(a_key, [])
        for b in all_tids:
            if a == b:
                continue
            if distance_cache.get_distance(a, b) is not None:
                continue
            # Try to infer from same-location terminals
            for other_tid in same_loc:
                if other_tid == a:
                    continue
                d = distance_cache.get_distance(other_tid, b)
                if d is not None:
                    distance_cache.set_distance(a, b, d)
                    break

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
            "star_system_name": "", "planet_name": "", "space_station_name": "",
            "city_name": "", "outpost_name": ""}


def load_vehicles(refresh: bool = False) -> List[Dict]:
    """Load all vehicles with SCU > 0 with TTL caching.

    Filters to only include ships that have cargo capacity (scu > 0),
    which are relevant for trade route planning.

    Args:
        refresh: If True, bypass cache and fetch fresh data.
    """
    if not refresh:
        cached = vehicle_cache.get()
        if cached is not None:
            return cached

    try:
        data = api_get("vehicles")
        vehicles = data.get("data", [])
        if vehicles:
            filtered = [v for v in vehicles if (v.get("scu") or 0) > 0]
            vehicle_cache.set(filtered)
            return filtered
    except Exception:
        pass

    # Return stale cache if available, else empty
    if vehicle_cache.data is not None:
        return vehicle_cache.data
    return []


def get_locations(q: str = "", refresh: bool = False) -> List[Dict]:
    """Get locations grouped by space station/city/outpost.

    Each location groups multiple terminals at the same physical location
    (same space station, city, or outpost) into a single selectable option
    for chain route origin selection.

    Args:
        q: Search query for filtering by location name (Chinese or English).
        refresh: If True, bypass terminal cache and fetch fresh data.

    Returns:
        List of dicts with location_id, location_name, location_name_zh,
        type, system, system_zh, planet, planet_zh, terminal_ids.
    """
    from services.data_mapper import get_terminal_zh, SYSTEM_ZH, PLANET_ZH

    terminals = load_terminals(refresh=refresh)
    grouped: Dict[str, Dict] = {}

    for t in terminals:
        key = _get_location_key(t)
        if not key:
            continue

        if key not in grouped:
            # Determine location display name and type
            # Priority: station > city > outpost > fallback (matches _get_location_key)
            city = t.get("city_name") or ""
            outpost = t.get("outpost_name") or ""
            station = t.get("space_station_name") or ""
            system = t.get("star_system_name") or ""
            planet = t.get("planet_name") or ""

            if station:
                loc_name = station
                loc_type = "space_station"
            elif city:
                loc_name = city
                loc_type = "city"
            elif outpost:
                loc_name = outpost
                loc_type = "outpost"
            else:
                loc_name = t.get("name", "")
                loc_type = "space_station"

            # Generate a stable positive integer ID from location key
            # Use hashlib for deterministic hashing (Python's hash() is randomized)
            import hashlib
            loc_id = int(hashlib.md5(key.encode()).hexdigest()[:8], 16) % (10 ** 8)

            # Translate location name using the location name itself,
            # NOT the first terminal's name (which may be a specific shop/admin).
            # E.g., "Area 18" city → "18区", not "贸易发展部" from TDD terminal.
            loc_name_zh = get_terminal_zh(
                loc_name, loc_name, loc_name,
                planet, system
            )

            grouped[key] = {
                "location_id": loc_id,
                "location_name": loc_name,
                "location_name_zh": loc_name_zh,
                "type": loc_type,
                "system": system,
                "system_zh": SYSTEM_ZH.get(system, system),
                "planet": planet,
                "planet_zh": PLANET_ZH.get(planet, planet),
                "terminal_ids": [],
            }

        grouped[key]["terminal_ids"].append(t.get("id", 0))

    locations = list(grouped.values())

    # Filter by query if provided
    if q:
        ql = q.lower().strip()
        locations = [
            loc for loc in locations
            if ql in loc["location_name"].lower()
            or ql in loc["location_name_zh"].lower()
            or ql in loc.get("system", "").lower()
            or ql in loc.get("system_zh", "").lower()
            or ql in loc.get("planet", "").lower()
            or ql in loc.get("planet_zh", "").lower()
        ]

    return locations


def get_all_prices(refresh: bool = False) -> List[Dict]:
    """Get all commodity prices across all terminals with TTL caching.

    Uses parallel per-commodity fetching since UEX API 2.0 requires
    id_commodity as a mandatory path parameter for commodities_prices.
    Leverages existing get_commodity_prices() with per-commodity caching.

    Args:
        refresh: If True, bypass cache and fetch fresh data.

    Returns:
        List of dicts with id_terminal, id_commodity, commodity_name,
        price_buy, price_sell, scu_buy, scu_sell_stock, status_buy, status_sell.
    """
    if not refresh:
        cached = all_prices_cache.get()
        if cached is not None:
            return cached

    try:
        from concurrent.futures import ThreadPoolExecutor, as_completed

        commodities = load_commodities(refresh=refresh)
        if not commodities:
            if all_prices_cache.data is not None:
                return all_prices_cache.data
            return []

        def _fetch_one(cid):
            return cid, get_commodity_prices(cid, refresh=refresh)

        normalized = []
        with ThreadPoolExecutor(max_workers=10) as pool:
            futures = {pool.submit(_fetch_one, c["id"]): c["id"] for c in commodities}
            for future in as_completed(futures):
                cid, prices = future.result()
                for p in prices:
                    tid = p.get("id_terminal", 0)
                    if not tid or not cid:
                        continue
                    normalized.append({
                        "id_terminal": tid,
                        "id_commodity": cid,
                        "commodity_name": p.get("commodity_name", ""),
                        "price_buy": p.get("price_buy"),
                        "price_sell": p.get("price_sell"),
                        "scu_buy": p.get("scu_buy", 0),
                        "scu_sell_stock": p.get("scu_sell_stock", 0),
                        "status_buy": p.get("status_buy", 99),
                        "status_sell": p.get("status_sell", 99),
                    })

        if normalized:
            all_prices_cache.set(normalized)
            return normalized

    except Exception:
        pass

    # Return stale cache if available, else empty
    if all_prices_cache.data is not None:
        return all_prices_cache.data
    return []
