"""
TTL Cache Manager - Unified caching with time-to-live for all API data.

Cache durations based on data volatility:
- Terminals/Commodities lists: 6 hours (game data changes very slowly)
- Commodity prices: 2 hours (prices fluctuate with player trading)
- Route distances: 24 hours (distances never change)
- Warbond data: 4 hours (warbonds change ~1-2 times/day)
"""

import time
from typing import Any, Dict, Optional, Tuple

# Cache TTL in seconds
TTL_TERMINALS = 6 * 3600       # 6 hours
TTL_COMMODITIES = 6 * 3600     # 6 hours
TTL_PRICES = 2 * 3600          # 2 hours
TTL_DISTANCES = 24 * 3600      # 24 hours
TTL_WARBONDS = 4 * 3600        # 4 hours
TTL_LOCATIONS = 24 * 3600      # 24 hours (game locations change very slowly)


TTL_VEHICLES = 6 * 3600        # 6 hours
TTL_ALL_PRICES = 2 * 3600      # 2 hours (same as per-commodity prices)
TTL_ITEMS = 6 * 3600           # 6 hours (item definitions change slowly)
TTL_ITEM_PRICES = 2 * 3600     # 2 hours (item prices fluctuate)
TTL_ITEM_ATTRS = 6 * 3600      # 6 hours (attributes rarely change)
TTL_ALL_ITEM_PRICES = 2 * 3600      # 2 hours (未知)
TTL_CATEGORIES_ATTRS = 24 * 3600    # 24 hours (未知)


class TTLCache:
    """Thread-safe TTL cache for a single data category."""

    def __init__(self, ttl: int, name: str = "", swr_grace: int = 1800):
        self._ttl = ttl
        self._name = name
        self._data: Any = None
        self._timestamp: float = 0
        self._hit_count: int = 0
        self._miss_count: int = 0
        self._swr_grace = swr_grace
        self._refreshing: bool = False

    @property
    def is_valid(self) -> bool:
        """Check if cache is populated and not expired."""
        if self._data is None:
            return False
        return (time.time() - self._timestamp) < self._ttl

    @property
    def is_stale_but_usable(self) -> bool:
        """Check if cache is expired but within SWR grace period."""
        if self._data is None:
            return False
        age = time.time() - self._timestamp
        return age >= self._ttl and age < (self._ttl + self._swr_grace)

    @property
    def data(self) -> Any:
        """Get cached data (does NOT check TTL - use is_valid first)."""
        return self._data

    @property
    def age_seconds(self) -> int:
        """How old the cached data is in seconds."""
        if self._timestamp == 0:
            return -1
        return int(time.time() - self._timestamp)

    @property
    def last_updated(self) -> Optional[str]:
        """ISO-formatted last update time."""
        if self._timestamp == 0:
            return None
        from datetime import datetime, timezone
        return datetime.fromtimestamp(self._timestamp, tz=timezone.utc).isoformat()

    def get(self) -> Optional[Any]:
        """Get data if cache is valid, else None."""
        if self.is_valid:
            self._hit_count += 1
            return self._data
        self._miss_count += 1
        return None

    def get_or_stale(self) -> Tuple[Optional[Any], bool]:
        """Get data if valid; if stale but usable, return stale data with needs_refresh flag.
        Returns (data, needs_refresh)."""
        if self.is_valid:
            self._hit_count += 1
            return self._data, False
        if self.is_stale_but_usable:
            self._miss_count += 1
            return self._data, not self._refreshing
        self._miss_count += 1
        return None, True

    def set(self, data: Any) -> None:
        """Store data with current timestamp."""
        self._data = data
        self._timestamp = time.time()

    def invalidate(self) -> None:
        """Clear cached data."""
        self._data = None
        self._timestamp = 0

    def stats(self) -> Dict:
        """Return cache statistics."""
        return {
            "name": self._name,
            "ttl": self._ttl,
            "swr_grace": self._swr_grace,
            "valid": self.is_valid,
            "stale_but_usable": self.is_stale_but_usable,
            "age_seconds": self.age_seconds,
            "last_updated": self.last_updated,
            "hits": self._hit_count,
            "misses": self._miss_count,
            "refreshing": self._refreshing,
        }


class PriceCache:
    """Keyed TTL cache for price/item data.
    Stores {key: data} with individual timestamps.
    Key can be int (commodity_id) or str (cache_key).
    """

    def __init__(self, ttl: int = TTL_PRICES):
        self._ttl = ttl
        self._entries: Dict[Any, Tuple[Any, float]] = {}  # key -> (data, timestamp)

    def get(self, key) -> Optional[Any]:
        """Get cached data if valid."""
        if key in self._entries:
            data, ts = self._entries[key]
            if (time.time() - ts) < self._ttl:
                return data
            del self._entries[key]
        return None

    def set(self, key, data: Any) -> None:
        """Store data with current timestamp."""
        self._entries[key] = (data, time.time())

    def invalidate(self, commodity_id: int = None) -> None:
        """Clear price cache (specific commodity or all)."""
        if commodity_id:
            self._entries.pop(commodity_id, None)
        else:
            self._entries.clear()

    @property
    def size(self) -> int:
        return len(self._entries)


class DistanceCache:
    """TTL cache for route distances.
    Preserves the (origin_tid, dest_tid) -> distance mapping pattern
    used by route_planner.py, but adds TTL.
    """

    def __init__(self, ttl: int = TTL_DISTANCES):
        self._ttl = ttl
        self._distances: Dict[Tuple[int, int], int] = {}
        self._queried: set = set()  # terminal IDs that have been fully queried
        self._query_timestamps: Dict[int, float] = {}  # tid -> when it was queried

    def is_queried(self, tid: int) -> bool:
        """Check if a terminal's routes were queried and cache is still valid."""
        if tid not in self._queried:
            return False
        ts = self._query_timestamps.get(tid, 0)
        return (time.time() - ts) < self._ttl

    def mark_queried(self, tid: int) -> None:
        """Mark a terminal as queried."""
        self._queried.add(tid)
        self._query_timestamps[tid] = time.time()

    def get_distance(self, origin: int, dest: int) -> Optional[int]:
        """Get cached distance."""
        key1 = (origin, dest)
        key2 = (dest, origin)
        if key1 in self._distances:
            return self._distances[key1]
        if key2 in self._distances:
            return self._distances[key2]
        return None

    def set_distance(self, origin: int, dest: int, distance: int) -> None:
        """Store distance."""
        self._distances[(origin, dest)] = distance

    def get_routes_from(self, tid: int) -> Dict[int, int]:
        """Get all cached routes from a terminal."""
        return {dt: d for (ot, dt), d in self._distances.items() if ot == tid}

    def invalidate(self) -> None:
        """Clear all distance data."""
        self._distances.clear()
        self._queried.clear()
        self._query_timestamps.clear()

    @property
    def size(self) -> int:
        return len(self._distances)


# ==================== Global Cache Instances ====================

terminal_cache = TTLCache(TTL_TERMINALS, "terminals")
commodity_cache = TTLCache(TTL_COMMODITIES, "commodities")
price_cache = PriceCache(TTL_PRICES)
distance_cache = DistanceCache(TTL_DISTANCES)
warbond_cache = TTLCache(TTL_WARBONDS, "warbonds")
vehicle_cache = TTLCache(TTL_VEHICLES, "vehicles")
all_prices_cache = TTLCache(TTL_ALL_PRICES, "all_prices")

# Item caches use PriceCache pattern (keyed by string key)
item_cache = PriceCache(TTL_ITEMS)
item_price_cache = PriceCache(TTL_ITEM_PRICES)
item_attr_cache = PriceCache(TTL_ITEM_ATTRS)
all_item_prices_cache = TTLCache(TTL_ALL_ITEM_PRICES, "all_item_prices")
items_prices_all_result_cache = PriceCache(TTL_ALL_ITEM_PRICES)  # processed results by id_category
categories_attr_cache = PriceCache(TTL_CATEGORIES_ATTRS)  # keyed by id_category
all_terminal_cache = TTLCache(TTL_TERMINALS, "all_terminals")
space_station_cache = TTLCache(TTL_LOCATIONS, "space_stations")
city_cache = TTLCache(TTL_LOCATIONS, "cities")
outpost_cache = TTLCache(TTL_LOCATIONS, "outposts")


def invalidate_all() -> None:
    """Clear all caches - forces fresh data on next request."""
    terminal_cache.invalidate()
    commodity_cache.invalidate()
    price_cache.invalidate()
    distance_cache.invalidate()
    warbond_cache.invalidate()
    vehicle_cache.invalidate()
    all_prices_cache.invalidate()
    item_cache.invalidate()
    item_price_cache.invalidate()
    item_attr_cache.invalidate()
    all_item_prices_cache.invalidate()
    categories_attr_cache.invalidate()
    all_terminal_cache.invalidate()
    space_station_cache.invalidate()
    city_cache.invalidate()
    outpost_cache.invalidate()


def get_all_stats() -> Dict:
    """Get statistics for all caches."""
    return {
        "terminals": terminal_cache.stats(),
        "commodities": commodity_cache.stats(),
        "prices": {
            "entries": price_cache.size,
            "ttl": TTL_PRICES,
        },
        "distances": {
            "entries": distance_cache.size,
            "queried_terminals": len(distance_cache._queried),
            "ttl": TTL_DISTANCES,
        },
        "warbonds": warbond_cache.stats(),
        "vehicles": vehicle_cache.stats(),
        "all_prices": all_prices_cache.stats(),
        "items": {
            "entries": item_cache.size,
            "ttl": TTL_ITEMS,
        },
        "item_prices": {
            "entries": item_price_cache.size,
            "ttl": TTL_ITEM_PRICES,
        },
        "item_attrs": {
            "entries": item_attr_cache.size,
            "ttl": TTL_ITEM_ATTRS,
        },
        "all_item_prices": all_item_prices_cache.stats(),
        "categories_attrs": {
            "entries": categories_attr_cache.size,
            "ttl": TTL_CATEGORIES_ATTRS,
        },
    }
