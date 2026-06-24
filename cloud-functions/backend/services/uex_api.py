"""
UEX API Client - Handles TLS compatibility, authentication and caching.
Uses centralized TTL cache from cache.py.

HTTP requests use Python's built-in urllib.request instead of subprocess+curl,
because EdgeOne Cloud Functions may not have the curl binary available.
"""
import json
import os
import ssl
import threading
import time
import urllib.parse
import urllib.request
from typing import Dict, List, Optional, Tuple

from services.cache import (
    terminal_cache, commodity_cache, price_cache, distance_cache,
    vehicle_cache, all_prices_cache, item_cache, item_price_cache, item_attr_cache,
    all_item_prices_cache, categories_attr_cache, all_terminal_cache,
    space_station_cache, city_cache, outpost_cache,
    invalidate_all,
)


# ---------------------------------------------------------------------------
# Jump point connectivity data
# ---------------------------------------------------------------------------
_JUMP_POINTS_PATH = os.path.join(
    os.path.dirname(__file__), '..', '..', '..', 'frontend', 'public', 'data', 'starmap-positions.json'
)
_jump_point_cache: Optional[List[Dict]] = None


def _load_jump_points() -> List[Dict]:
    """Load jump point connections from starmap-positions.json (cached)."""
    global _jump_point_cache
    if _jump_point_cache is not None:
        return _jump_point_cache
    try:
        with open(_JUMP_POINTS_PATH, 'r', encoding='utf-8') as f:
            data = json.load(f)
        connections = data.get("connections", [])
        _jump_point_cache = connections
        return connections
    except Exception:
        _jump_point_cache = []
        return []


def is_systems_connected(sys1: str, sys2: str) -> bool:
    """Check if two star systems are connected via a direct jump point."""
    if not sys1 or not sys2:
        return False
    if sys1 == sys2:
        return True
    s1 = sys1.lower().strip()
    s2 = sys2.lower().strip()
    connections = _load_jump_points()
    for jp in connections:
        entry = (jp.get("entry_system") or "").lower().strip()
        exit_ = (jp.get("exit_system") or "").lower().strip()
        if (entry == s1 and exit_ == s2) or (entry == s2 and exit_ == s1):
            return True
    return False


def get_jump_point(sys1: str, sys2: str) -> Optional[Dict]:
    """Get jump point info between two systems. Returns dict with fuel_cost or None."""
    if not sys1 or not sys2 or sys1 == sys2:
        return None
    s1 = sys1.lower().strip()
    s2 = sys2.lower().strip()
    connections = _load_jump_points()
    for jp in connections:
        entry = (jp.get("entry_system") or "").lower().strip()
        exit_ = (jp.get("exit_system") or "").lower().strip()
        if (entry == s1 and exit_ == s2) or (entry == s2 and exit_ == s1):
            return jp
    return None


def get_connected_systems(system: str) -> List[str]:
    """Get all systems directly connected to the given system via jump points."""
    if not system:
        return []
    s = system.lower().strip()
    connected = set()
    connections = _load_jump_points()
    for jp in connections:
        entry = (jp.get("entry_system") or "").lower().strip()
        exit_ = (jp.get("exit_system") or "").lower().strip()
        if entry == s:
            connected.add(exit_)
        elif exit_ == s:
            connected.add(entry)
    return list(connected)

BASE_URL = "https://api.uexcorp.space/2.0"

# SSL context: skip verification (equivalent to curl -k)
# EdgeOne Cloud Functions may have outdated CA bundles
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE


def _get_api_key() -> str:
    """Read UEX API Key from environment (lazy, so .env is loaded first)."""
    return os.environ.get("UEX_API_KEY", "")


def api_get(endpoint: str, params: dict = None, path_params: dict = None) -> dict:
    """GET request using urllib.request (no curl dependency).
    Includes Authorization header when UEX_API_KEY is set.

    Args:
        endpoint: API resource name (e.g. "terminals", "commodities_prices")
        params: Query string parameters (appended as ?key=value)
        path_params: Path-style parameters (appended as /key/value/ - v2.0 native format)
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

    # Build headers - lazy read so .env is loaded first
    api_key = _get_api_key()
    headers = {
        "Accept": "application/json",
        "User-Agent": "UEX-Trade-Navigator/3.22.0",
    }
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    max_attempts = 2
    last_error = None

    for attempt in range(max_attempts):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=25, context=_ssl_ctx) as resp:
                body = resp.read().decode("utf-8")
                data = json.loads(body)
                return data
        except json.JSONDecodeError:
            last_error = "JSON parse failed"
            if attempt < max_attempts - 1:
                time.sleep(1)
                continue
            break
        except urllib.error.HTTPError as e:
            last_error = f"HTTP {e.code}: {e.reason}"
            if attempt < max_attempts - 1:
                time.sleep(1)
                continue
            break
        except urllib.error.URLError as e:
            last_error = f"URL error: {e.reason}"
            if attempt < max_attempts - 1:
                time.sleep(2)
                continue
            break
        except Exception as e:
            last_error = str(e)
            if attempt < max_attempts - 1:
                time.sleep(1)
                continue
            break

    raise RuntimeError(f"API error for {endpoint}: {last_error}")


def clear_caches():
    """Clear all UEX API caches - forces reload on next request."""
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


def _fetch_terminals_fresh() -> List[Dict]:
    """Fetch fresh commodity terminals from UEX API (blocking)."""
    all_terminals = []
    for sid in _AVAILABLE_STAR_SYSTEMS:
        sys_terminals = _fetch_commodity_terminals_for_system(sid)
        all_terminals.extend(sys_terminals)

    if all_terminals:
        seen_ids = set()
        unique = []
        for t in all_terminals:
            tid = t.get("id")
            if tid and tid not in seen_ids:
                seen_ids.add(tid)
                unique.append(t)
        return unique

    # Fallback: try default endpoint (Stanton only)
    try:
        data = api_get("terminals", path_params={"type": "commodity"})
        terminals = data.get("data", [])
        if terminals:
            return [t for t in terminals if "platinum" not in t.get("name", "").lower()]
    except Exception:
        pass
    return []


def _refresh_terminals():
    """Background refresh of terminals cache."""
    try:
        fresh = _fetch_terminals_fresh()
        if fresh:
            terminal_cache.set(fresh)
            _save_static_to_disk('terminals', fresh)
    except Exception:
        pass
    finally:
        terminal_cache._refreshing = False


def load_terminals(refresh: bool = False) -> List[Dict]:
    """Load all commodity terminals across all available star systems with SWR caching.

    The default UEX terminals endpoint only returns Stanton (id_star_system=68).
    To include Pyro and Nyx terminals, we query each available system separately
    and merge the results.

    Filters out PLATINUM BAY terminals because they have zero price data
    in the UEX API. Each PB location has a corresponding ADMIN terminal
    that has actual buy/sell prices.

    Uses disk persistence for cold-start recovery.

    Args:
        refresh: If True, bypass cache and fetch fresh data.
    """
    if not refresh:
        data, needs_refresh = terminal_cache.get_or_stale()
        if data is not None:
            if needs_refresh:
                terminal_cache._refreshing = True
                threading.Thread(target=_refresh_terminals, daemon=True).start()
            return data

    # Cold start: try disk cache
    if terminal_cache.data is None:
        disk_data = _load_static_from_disk('terminals')
        if disk_data:
            terminal_cache.set(disk_data)
            terminal_cache._refreshing = True
            threading.Thread(target=_refresh_terminals, daemon=True).start()
            return disk_data

    # Synchronous fresh fetch
    fresh = _fetch_terminals_fresh()
    if fresh:
        terminal_cache.set(fresh)
        _save_static_to_disk('terminals', fresh)
        return fresh

    # Return stale cache if available, else empty
    if terminal_cache.data is not None:
        return terminal_cache.data
    return []


def load_all_terminals(refresh: bool = False) -> List[Dict]:
    """Load ALL terminal types (commodity, shop, admin, etc.) for item price lookups.

    Unlike load_terminals() which only loads commodity terminals,
    this includes weapon/component shops (type='shop') so that item
    price records can resolve full location data (station/city/outpost names).
    """
    if not refresh:
        cached = all_terminal_cache.get()
        if cached is not None:
            return cached

    all_terminals = []
    for sid in _AVAILABLE_STAR_SYSTEMS:
        try:
            data = api_get("terminals", params={"id_star_system": sid})
            terminals = data.get("data", [])
            all_terminals.extend(terminals)
        except Exception:
            pass

    if all_terminals:
        seen_ids = set()
        unique = []
        for t in all_terminals:
            tid = t.get("id")
            if tid and tid not in seen_ids:
                seen_ids.add(tid)
                unique.append(t)
        all_terminal_cache.set(unique)
        return unique

    if all_terminal_cache.data is not None:
        return all_terminal_cache.data
    return []


def _load_location_entity(cache: "TTLCache", endpoint: str, refresh: bool = False) -> Dict[int, Dict]:
    """Generic loader for location entities (stations, cities, outposts)."""
    if not refresh:
        cached = cache.get()
        if cached is not None:
            return cached
    try:
        data = api_get(endpoint)
        items = data.get("data", [])
        result = {s["id"]: s for s in items if "id" in s}
        if result:
            cache.set(result)
            return result
    except Exception:
        pass
    if cache.data is not None:
        return cache.data
    return {}


def load_space_stations(refresh: bool = False) -> Dict[int, Dict]:
    return _load_location_entity(space_station_cache, "space_stations", refresh)


def load_cities(refresh: bool = False) -> Dict[int, Dict]:
    return _load_location_entity(city_cache, "cities", refresh)


def load_outposts(refresh: bool = False) -> Dict[int, Dict]:
    return _load_location_entity(outpost_cache, "outposts", refresh)


def resolve_terminal_location(t_info: Dict) -> Dict[str, str]:
    """Resolve terminal foreign key IDs to actual location names.

    UEX API terminal records carry id_space_station/id_city/id_outpost FKs
    but their space_station_name/city_name/outpost_name fields are often empty.
    This function uses the FKs to look up real names from location entities.
    """
    station_name = t_info.get("space_station_name") or ""
    city_name = t_info.get("city_name") or ""
    outpost_name = t_info.get("outpost_name") or ""

    if not station_name and t_info.get("id_space_station", 0) > 0:
        stations = load_space_stations()
        s = stations.get(t_info["id_space_station"])
        if s:
            station_name = s.get("name", "")

    if not city_name and t_info.get("id_city", 0) > 0:
        cities = load_cities()
        c = cities.get(t_info["id_city"])
        if c:
            city_name = c.get("name", "")

    if not outpost_name and t_info.get("id_outpost", 0) > 0:
        outposts = load_outposts()
        o = outposts.get(t_info["id_outpost"])
        if o:
            outpost_name = o.get("name", "")

    return {
        "space_station_name": station_name,
        "city_name": city_name,
        "outpost_name": outpost_name,
    }


def load_commodities(refresh: bool = False) -> List[Dict]:
    """Load all commodities with TTL caching + disk persistence.

    Args:
        refresh: If True, bypass cache and fetch fresh data.
    """
    if not refresh:
        cached = commodity_cache.get()
        if cached is not None:
            return cached

    # Cold start: try disk cache
    if commodity_cache.data is None:
        disk_data = _load_static_from_disk('commodities')
        if disk_data:
            commodity_cache.set(disk_data)
            return disk_data

    try:
        data = api_get("commodities")
        commodities = data.get("data", [])
        if commodities:
            commodity_cache.set(commodities)
            _save_static_to_disk('commodities', commodities)
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
            # E.g., "Area 18" city -> "18区", not "塔萨" from TDD terminal.
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


def _fetch_all_prices_fresh(refresh: bool = False) -> List[Dict]:
    """Fetch fresh all-prices data from UEX API (blocking)."""
    from concurrent.futures import ThreadPoolExecutor, as_completed

    commodities = load_commodities(refresh=refresh)
    if not commodities:
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
    return normalized


def _refresh_all_prices():
    """Background refresh of all-prices cache."""
    try:
        fresh = _fetch_all_prices_fresh()
        if fresh:
            all_prices_cache.set(fresh)
            _save_prices_to_disk(fresh)
    except Exception:
        pass
    finally:
        all_prices_cache._refreshing = False


def get_all_prices(refresh: bool = False) -> List[Dict]:
    """Get all commodity prices across all terminals with SWR caching + disk persistence.

    Uses parallel per-commodity fetching since UEX API 2.0 requires
    id_commodity as a mandatory path parameter for commodities_prices.
    Leverages existing get_commodity_prices() with per-commodity caching.

    On first call (cold start), loads from disk cache instantly,
    then refreshes from UEX API in background.

    Args:
        refresh: If True, bypass cache and fetch fresh data.

    Returns:
        List of dicts with id_terminal, id_commodity, commodity_name,
        price_buy, price_sell, scu_buy, scu_sell_stock, status_buy, status_sell.
    """
    if not refresh:
        data, needs_refresh = all_prices_cache.get_or_stale()
        if data is not None:
            if needs_refresh:
                all_prices_cache._refreshing = True
                threading.Thread(target=_refresh_all_prices, daemon=True).start()
            return data

    # Cold start: try loading from disk cache first
    if all_prices_cache.data is None:
        disk_data = _load_prices_from_disk()
        if disk_data:
            all_prices_cache.set(disk_data)
            # Still refresh from API in background
            all_prices_cache._refreshing = True
            threading.Thread(target=_refresh_all_prices, daemon=True).start()
            return disk_data

    try:
        normalized = _fetch_all_prices_fresh(refresh=refresh)
        if normalized:
            all_prices_cache.set(normalized)
            _save_prices_to_disk(normalized)
            return normalized
    except Exception:
        pass

    # Return stale cache if available, else empty
    if all_prices_cache.data is not None:
        return all_prices_cache.data
    return []


_PRICES_DISK_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'prices_snapshot.json')
_PRICES_MAX_AGE = 24 * 3600  # 24 hours
_STATIC_MAX_AGE = 24 * 3600  # 24 hours for terminals/commodities


def _save_prices_to_disk(prices: list) -> None:
    """Persist prices to disk for cold-start recovery."""
    try:
        os.makedirs(os.path.dirname(_PRICES_DISK_PATH), exist_ok=True)
        with open(_PRICES_DISK_PATH, 'w') as f:
            json.dump({'ts': time.time(), 'prices': prices}, f)
    except Exception:
        pass


def _load_prices_from_disk() -> Optional[list]:
    """Load prices from disk if not too old."""
    try:
        if not os.path.exists(_PRICES_DISK_PATH):
            return None
        with open(_PRICES_DISK_PATH, 'r') as f:
            data = json.load(f)
        ts = data.get('ts', 0)
        if (time.time() - ts) > _PRICES_MAX_AGE:
            return None  # Too old, don't use
        prices = data.get('prices', [])
        if prices:
            print(f"[PricesCache] Loaded {len(prices)} prices from disk ({int((time.time()-ts)/60)}min old)")
            return prices
    except Exception:
        pass
    return None


def _static_disk_path(name: str) -> str:
    return os.path.join(os.path.dirname(__file__), '..', 'data', f'{name}_snapshot.json')


def _save_static_to_disk(name: str, data) -> None:
    """Persist static data (terminals, commodities) to disk."""
    try:
        path = _static_disk_path(name)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w') as f:
            json.dump({'ts': time.time(), 'data': data}, f)
    except Exception:
        pass


def _load_static_from_disk(name: str):
    """Load static data from disk if not too old."""
    try:
        path = _static_disk_path(name)
        if not os.path.exists(path):
            return None
        with open(path, 'r') as f:
            data = json.load(f)
        ts = data.get('ts', 0)
        if (time.time() - ts) > _STATIC_MAX_AGE:
            return None
        result = data.get('data')
        if result:
            print(f"[{name}Cache] Loaded from disk ({int((time.time()-ts)/60)}min old)")
            return result
    except Exception:
        pass
    return None


def load_items(id_category: int = None, refresh: bool = False) -> List[Dict]:
    """Load items from UEX API with optional category filter.

    Args:
        id_category: UEX item category ID (e.g., 19=Coolers, 23=Shields, 32=Guns)
        refresh: If True, bypass cache and fetch fresh data.
    """
    cache_key = f"items_cat_{id_category}" if id_category else "items_all"
    if not refresh:
        cached = item_cache.get(cache_key)
        if cached is not None:
            return cached

    try:
        params = {}
        if id_category:
            params["id_category"] = id_category
        data = api_get("items", params=params if params else None)
        items = data.get("data", [])
        if items:
            item_cache.set(cache_key, items)
            return items
    except Exception:
        pass

    # Return stale cache if available
    cached = item_cache.get(cache_key)
    if cached is not None:
        return cached
    return []


def load_item_prices(id_item: int, refresh: bool = False) -> List[Dict]:
    """Load prices for a specific item across all terminals.

    Args:
        id_item: UEX item ID
        refresh: If True, bypass cache and fetch fresh data.
    """
    cache_key = f"item_prices_{id_item}"
    if not refresh:
        cached = item_price_cache.get(cache_key)
        if cached is not None:
            return cached

    try:
        data = api_get("items_prices", params={"id_item": id_item})
        prices = data.get("data", [])
        item_price_cache.set(cache_key, prices)
        return prices
    except Exception:
        pass

    cached = item_price_cache.get(cache_key)
    if cached is not None:
        return cached
    return []


def load_item_attributes(id_item: int, refresh: bool = False) -> List[Dict]:
    """Load attributes for a specific item.

    Args:
        id_item: UEX item ID
        refresh: If True, bypass cache and fetch fresh data.
    """
    cache_key = f"item_attrs_{id_item}"
    if not refresh:
        cached = item_attr_cache.get(cache_key)
        if cached is not None:
            return cached

    try:
        data = api_get("items_attributes", params={"id_item": id_item})
        attrs = data.get("data", [])
        item_attr_cache.set(cache_key, attrs)
        return attrs
    except Exception:
        pass

    cached = item_attr_cache.get(cache_key)
    if cached is not None:
        return cached
    return []


def load_all_item_prices(refresh: bool = False) -> List[Dict]:
    """批量加载所有物品价格(items_prices_all),按category分组"""
    if not refresh:
        cached = all_item_prices_cache.get()
        if cached is not None:
            return cached
    try:
        data = api_get("items_prices_all")
        prices = data.get("data", [])
        if prices:
            all_item_prices_cache.set(prices)
            return prices
    except Exception:
        pass
    if all_item_prices_cache.data is not None:
        return all_item_prices_cache.data
    return []


def load_item_attributes_by_category(id_category: int, refresh: bool = False) -> List[Dict]:
    """按分类加载物品属性"""
    cache_key = f"cat_attrs_{id_category}"
    if not refresh:
        cached = categories_attr_cache.get(cache_key)
        if cached is not None:
            return cached
    try:
        data = api_get("items_attributes", params={"id_category": id_category})
        attrs = data.get("data", [])
        categories_attr_cache.set(cache_key, attrs)
        return attrs
    except Exception:
        pass
    cached = categories_attr_cache.get(cache_key)
    if cached is not None:
        return cached
    return []


def load_categories_attributes(id_category: int, refresh: bool = False) -> List[Dict]:
    """加载分类属性定义"""
    cache_key = f"cat_def_{id_category}"
    if not refresh:
        cached = categories_attr_cache.get(cache_key)
        if cached is not None:
            return cached
    try:
        data = api_get("categories_attributes", params={"id_category": id_category})
        attrs = data.get("data", [])
        categories_attr_cache.set(cache_key, attrs)
        return attrs
    except Exception:
        pass
    cached = categories_attr_cache.get(cache_key)
    if cached is not None:
        return cached
    return []
