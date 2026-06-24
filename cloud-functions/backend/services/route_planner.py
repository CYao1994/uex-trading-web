"""
Route Planner - Core trading route optimization algorithms

UEX API 2.0 price semantics (PLAYER perspective):
  - price_buy  = the price when the player BUYS from the terminal
                 (i.e. the terminal's selling price / what the player pays)
  - price_sell = the price when the player SELLS to the terminal
                 (i.e. the terminal's buying price / what the player receives)
  - scu_buy        = terminal's stock available for the player to BUY
  - scu_sell_stock = terminal's stock/demand for buying FROM the player
  - status_buy / status_sell = data freshness (1=latest, higher=stale)

Routing logic:
  - Buy route:  looks at price_buy  (find cheapest place for player to buy)
  - Sell route: looks at price_sell (find best-paying place for player to sell)
"""
from typing import Dict, List, Optional, Tuple
from services.uex_api import (
    search_terminal, search_commodity, get_commodity_prices,
    resolve_terminal, build_distance_matrix, get_distance,
    fetch_routes_from_terminal, resolve_terminal as _resolve_terminal_info,
    is_systems_connected, get_jump_point,
)
from services.cache import distance_cache
from services.data_mapper import get_terminal_zh, get_commodity_zh, format_location_zh, SYSTEM_ZH, PLANET_ZH


# ---------------------------------------------------------------------------
# Terminal classification helpers
# ---------------------------------------------------------------------------

# Sub-terminal prefixes that are NOT commodity trading kiosks.
# These appear in UEX API with type=commodity but don't offer commodity
# trading in-game (locker rooms, maintenance rooms, food/drink shops, etc.)
_NON_TRADING_PREFIXES = (
    "Locker Room",
    "Maintenance Room",
    "Wake Up",
    "Feed The People",
    "Near Beer",
    "Shelf Stable",
    "Cordry's",
    "Nyx Nax",
    "Laying Roots",
    "Wear & Tear",
    "Tools & Supplies",
    "Hats & More",
    "Tech Shop",
    "Pharmacy",
    "Juice Bar",
    "Noodle Bar",
    "Hot Dogs",
    "Pizza",
    "Burrito Bar",
    "Ellroy's",
    "Kel-To",
    "Grey's Market",
    "Sundries",
    "Arkanis",
    "Traveler Rentals",
    "Vantage Rentals",
    "Teach's",
    "Landing Services",
    "Cargo Services",
    "Armor",
    "Live Fire",
    "Ship Weapons",
    "Personal Weapons",
    "Weapons and Armor",
    "Refinery Shop",
    "Refinement Center",
    "Refinery Ore Sales",
    "Ready to Trade",
    "Unique Quality",
    "Shop Terminal",
    "Aloprats",
    "Fried Grubs",
    "Ore Sales",
    "Security Tower",
    "AydoExpress Hub",
)


def _is_valid_commodity_terminal(name: str) -> bool:
    """Return True if the terminal name looks like a real commodity trading kiosk.

    Filters out food/drink shops, locker rooms, maintenance rooms, and other
    sub-terminals that UEX tags as type=commodity but don't trade commodities
    in-game.
    """
    if not name:
        return True  # can't filter without a name
    for prefix in _NON_TRADING_PREFIXES:
        if name.startswith(prefix):
            return False
    return True


# Maximum status value to trust - higher means data is too stale.
# UEX status: 1 = latest, 2-3 = recent, 4-7 = stale/old
_MAX_TRUSTED_STATUS = 3

# Maximum number of terminal splits per commodity.
# When a single terminal cannot satisfy the full quantity, the commodity is
# split across multiple terminals, up to this limit.  Additional unfulfilled
# quantity generates a warning.
_MAX_SPLITS = 3

# Fallback distance estimates when no route data is available.
# Based on Star Citizen quantum travel distances.
# These are approximate AU values used for nearest-neighbor sorting.
_FALLBACK_SAME_LOCATION = 1        # Same exact station/city/outpost
_FALLBACK_SAME_PLANET = 5          # Same planet: short atmospheric hop
_FALLBACK_PLANET_ORBIT_LINK = 15   # Planet ↔ its orbital station (same orbit)
_FALLBACK_PLANET_TO_ORBIT = 40     # Planet to different orbital station
_FALLBACK_ORBIT_TO_ORBIT = 50      # Two orbital stations around same planet
_FALLBACK_SAME_SYSTEM = 60         # Different planets in same system
_FALLBACK_DIFF_SYSTEM = 200        # Different star system


def _estimate_fallback_distance(origin_td: dict, dest_td: dict) -> Optional[int]:
    """Estimate distance when no UEX route data is available.

    Uses the full location hierarchy (system > planet > orbit > moon > station)
    for granular fallback estimates.
    """
    origin_system = origin_td.get("star_system_name") or ""
    dest_system = dest_td.get("star_system_name") or ""
    origin_planet = origin_td.get("planet_name") or ""
    dest_planet = dest_td.get("planet_name") or ""
    origin_orbit = origin_td.get("orbit_name") or ""
    dest_orbit = dest_td.get("orbit_name") or ""
    origin_moon = origin_td.get("moon_name") or ""
    dest_moon = dest_td.get("moon_name") or ""
    origin_station = origin_td.get("space_station_name") or ""
    dest_station = dest_td.get("space_station_name") or ""
    origin_city = origin_td.get("city_name") or ""
    dest_city = dest_td.get("city_name") or ""
    origin_outpost = origin_td.get("outpost_name") or ""
    dest_outpost = dest_td.get("outpost_name") or ""

    # Different star system - must travel through jump point
    if origin_system != dest_system:
        if is_systems_connected(origin_system, dest_system):
            jp = get_jump_point(origin_system, dest_system)
            fuel_penalty = int((jp.get("fuel_cost", 0) or 0) * 100) if jp else 20
            return _FALLBACK_SAME_SYSTEM + _FALLBACK_SAME_SYSTEM + fuel_penalty
        # Systems not directly connected - check if reachable via intermediate
        # For now, check single-hop only (Stanton↔Pyro↔Nyx chains are 2 hops)
        return None

    # Same system
    if origin_planet and dest_planet and origin_planet == dest_planet:
        if origin_orbit and dest_orbit and origin_orbit == dest_orbit:
            # Same orbit around same planet
            if origin_moon and dest_moon and origin_moon == dest_moon:
                return _FALLBACK_SAME_LOCATION
            return _FALLBACK_ORBIT_TO_ORBIT
        return _FALLBACK_SAME_PLANET

    if origin_planet and dest_planet and origin_planet != dest_planet:
        # Different planets - check if they share an orbit parent
        if origin_orbit and dest_orbit and origin_orbit == dest_orbit:
            return _FALLBACK_PLANET_ORBIT_LINK
        return _FALLBACK_SAME_SYSTEM

    # One or both have no planet info (likely orbital stations)
    if (not origin_planet and origin_station) or (not dest_planet and dest_station):
        return _FALLBACK_PLANET_TO_ORBIT

    return _FALLBACK_SAME_SYSTEM


def _status_score(status: int) -> float:
    """Convert status value to a sorting score.

    Lower status = more recent data = better score.
    Returns a penalty multiplier: 1.0 for status 1, up to 2.0 for status 7+.
    Used to penalize stale prices in sorting without hard-excluding them.
    """
    if status <= 1:
        return 1.0
    if status <= _MAX_TRUSTED_STATUS:
        return 1.0 + (status - 1) * 0.1  # 1.1, 1.2, 1.3
    # status 4+ : significant penalty
    return 1.5 + (status - 4) * 0.1  # 1.5, 1.6, 1.7, 1.8


def _sort_terminals_by_distance(
    terminal_ids: List[int],
    origin_tid: Optional[int],
    origin_td: Optional[dict],
    terminal_info_map: Dict[int, dict],
    dist_matrix: Dict[Tuple[int, int], int],
    refresh: bool = False,
) -> List[int]:
    """Sort terminal IDs using nearest-neighbor greedy from origin.

    Starts from origin, iteratively picks the closest unvisited terminal.
    This produces a distance-optimized visit order instead of commodity-list order.
    """
    if not terminal_ids or not origin_tid:
        return list(terminal_ids)

    sorted_ids: List[int] = []
    remaining = set(terminal_ids)
    current_tid = origin_tid
    current_td = origin_td or {}

    while remaining:
        # Fetch routes from current terminal if not already queried
        if not distance_cache.is_queried(current_tid) and current_tid != origin_tid:
            fetch_routes_from_terminal(current_tid, refresh=refresh)
            for (ot, dt), dist in distance_cache._distances.items():
                if ot == current_tid or dt == current_tid:
                    dist_matrix[(ot, dt)] = dist
                    dist_matrix[(dt, ot)] = dist

        best_tid = None
        best_dist = float('inf')

        for tid in remaining:
            td = terminal_info_map.get(tid, {})

            d = dist_matrix.get((current_tid, tid))
            if d is None:
                d = dist_matrix.get((tid, current_tid))
            if d is None:
                d = get_distance(current_tid, tid)
            if d is None:
                d = _estimate_fallback_distance(current_td, td)

            if d is not None and d < best_dist:
                best_dist = d
                best_tid = tid

        if best_tid is None:
            # Fallback: append remaining in any order
            sorted_ids.extend(remaining)
            break

        sorted_ids.append(best_tid)
        remaining.remove(best_tid)
        current_tid = best_tid
        current_td = terminal_info_map.get(best_tid, {})

    return sorted_ids


# ---------------------------------------------------------------------------
# Buy Route Planner
# ---------------------------------------------------------------------------

def _resolve_origin(origin: str, origin_id: int = None) -> Tuple[Optional[Dict], Optional[int]]:
    """Resolve origin terminal for distance calculation.

    Returns:
        (origin_terminal_dict, origin_tid)
    """
    # Step 1: Try direct ID lookup first (most reliable)
    if origin_id:
        td = resolve_terminal(origin_id)
        if td and td.get("id"):
            return td, origin_id

    # Step 2: Fall back to name-based search
    origin_terminal = search_terminal(origin)
    if origin_terminal:
        tid = origin_terminal.get("id")
        return origin_terminal, tid

    return None, None


def plan_buy_route(origin: str, items: List[Dict], refresh: bool = False, origin_id: int = None) -> Dict:
    """
    Plan buy route: find best sellers and optimize by distance/cost.

    Uses price_buy (player's purchase price) and scu_buy (station's stock
    available for sale to players).

    Args:
        origin: Origin terminal name (Chinese or English)
        items: [{"name": "Tungsten", "quantity": 16}, ...]

    Returns:
        Dict with commodity_summary, shortest_route, max_profit_route, warnings
        - shortest_route: nearest-neighbor greedy by distance
        - max_profit_route: each commodity to its cheapest seller (min cost)
    """
    warnings = []
    buyable_results = []

    # Step 0: Resolve origin terminal - prefer origin_id for exact matching
    origin_terminal, origin_tid = _resolve_origin(origin, origin_id)
    origin_system = (origin_terminal.get("star_system_name") or "") if origin_terminal else ""

    # Step 1: Find best sellers for each commodity
    # "Seller" = a terminal that SELLS this commodity TO the player
    # API field: price_buy (what the player pays) > 0 means terminal sells it
    for item in items:
        name = item["name"]
        qty = item["quantity"]
        zh_name = get_commodity_zh(name)

        comm = search_commodity(name)
        if not comm:
            from services.data_mapper import COMMODITY_ZH_MAP
            zh_to_en = {v: k for k, v in COMMODITY_ZH_MAP.items() if v}
            en_name = zh_to_en.get(name, name)
            comm = search_commodity(en_name)

        if not comm:
            warnings.append(f"{zh_name}({name}): 未知")
            continue

        comm_id = comm["id"]
        comm_name = comm.get("name", name)
        zh_name = get_commodity_zh(comm_name)

        try:
            prices = get_commodity_prices(comm_id, refresh=refresh)
        except Exception as e:
            warnings.append(f"{zh_name}({comm_name}): 未知 - {e}")
            continue

        # Find sellers: price_buy > 0 means the terminal sells this commodity
        # scu_buy = terminal's stock available for the player to buy
        # status_buy = freshness of the buy-side data
        sellers = []
        for p in prices:
            pb = p.get("price_buy", 0) or 0
            tid = p.get("id_terminal", 0)
            stock = p.get("scu_buy", 0) or 0
            status = p.get("status_buy", 1) or 1

            if pb <= 0:
                continue

            # Resolve terminal to check its name for classification
            td = resolve_terminal(tid)
            t_name = td.get("name", "")

            # Filter out non-commodity-trading sub-terminals
            if not _is_valid_commodity_terminal(t_name):
                continue

            sellers.append({
                "tid": tid,
                "price_buy": pb,
                "scu_buy": stock,
                "status": status,
                "terminal_info": td,
            })

        if not sellers:
            warnings.append(f"{zh_name}({comm_name}): UEX 未知(未知/未知)")
            continue

        # Split sellers into in-stock and zero-stock
        in_stock = [s for s in sellers if s["scu_buy"] > 0]
        zero_stock = [s for s in sellers if s["scu_buy"] == 0]

        # Deduplicate by location - for in-stock, keep lowest price; for zero-stock, keep lowest price
        def _dedup_by_location(seller_list, keep_lowest=True):
            best = {}
            for s in seller_list:
                td = s["terminal_info"]
                tname = td.get("name", "")
                sys_name = td.get("star_system_name", "")
                loc_key = f"{tname}|{sys_name}"
                should_replace = False
                if loc_key not in best:
                    should_replace = True
                elif keep_lowest and s["price_buy"] < best[loc_key]["price_buy"]:
                    should_replace = True
                elif not keep_lowest and s["price_buy"] > best[loc_key]["price_buy"]:
                    should_replace = True
                # Prefer in-stock over zero-stock when same price
                if should_replace:
                    best[loc_key] = s
                elif s["scu_buy"] > 0 and best[loc_key]["scu_buy"] == 0 and s["price_buy"] == best[loc_key]["price_buy"]:
                    best[loc_key] = s
            return list(best.values())

        in_stock_deduped = _dedup_by_location(in_stock, keep_lowest=True)
        zero_stock_deduped = _dedup_by_location(zero_stock, keep_lowest=True)

        # Sort with status penalty - stale data gets deprioritized
        # For buy route: lower price_buy = cheaper = better
        def _sort_key(s):
            status_penalty = _status_score(s.get("status", 1))
            # Effective price = actual price * status penalty
            return s["price_buy"] * status_penalty

        sorted_in_stock = sorted(in_stock_deduped, key=_sort_key)
        sorted_zero_stock = sorted(zero_stock_deduped, key=_sort_key)

        # Merge: in-stock first, zero-stock last (as fallback)
        sorted_sellers = sorted_in_stock + sorted_zero_stock

        # Truncate to top 20 but ensure we don't lose all in-stock entries
        sorted_sellers = sorted_sellers[:20]

        # Stock warnings
        if in_stock:
            best_stock = sorted_in_stock[0].get("scu_buy", 0)
            if best_stock > 0 and best_stock < qty:
                warnings.append(f"{zh_name}({comm_name}): 未知 {best_stock} SCU,未知 {qty} SCU")
        else:
            warnings.append(f"{zh_name}({comm_name}): 未知 0,未知")

        buyable_results.append({
            "commodity_id": comm_id,
            "name": comm_name,
            "name_zh": zh_name,
            "quantity": qty,
            "sellers": sorted_sellers[:20],
        })

    if not buyable_results:
        return {
            "commodity_summary": [],
            "shortest_route": [],
            "shortest_route_total_distance": 0,
            "shortest_route_total_revenue": 0,
            "max_profit_route": [],
            "max_profit_route_total_distance": None,
            "max_profit_route_total_revenue": 0,
            "warnings": warnings,
        }

    # Step 2: Commodity summary (cheapest IN-STOCK price per commodity, with split info)
    commodity_summary = []
    for r in buyable_results:
        # Find first in-stock seller for summary
        in_stock_sellers = [s for s in r["sellers"] if s.get("scu_buy", 0) > 0]
        best = in_stock_sellers[0] if in_stock_sellers else (r["sellers"][0] if r["sellers"] else None)
        if not best:
            continue
        td = best["terminal_info"]
        best_loc = format_location_zh(
            td.get("name") or "", td.get("nickname") or "",
            td.get("space_station_name") or "",
            td.get("planet_name") or "", td.get("star_system_name") or ""
        )

        # Check whether splitting is needed
        best_capacity = best.get("scu_buy", 0)
        needs_split = best_capacity > 0 and best_capacity < r["quantity"]

        if not needs_split:
            # Single terminal can handle everything - same as before
            commodity_summary.append({
                "name": r["name"],
                "name_zh": r["name_zh"],
                "quantity": r["quantity"],
                "best_price": best["price_buy"],
                "best_revenue": best["price_buy"] * r["quantity"],
                # Output as scu_sell for frontend compatibility (buy mode reads scu_sell)
                "scu_sell": best_capacity,
                "best_terminal": best_loc,
            })
        else:
            # Split across multiple terminals (sorted by price_buy ascending = cheapest first)
            remaining_qty = r["quantity"]
            splits = []
            visited_tids = set()

            for seller in in_stock_sellers:
                if remaining_qty <= 0 or len(splits) >= _MAX_SPLITS:
                    break
                if seller["tid"] in visited_tids:
                    continue
                if seller.get("scu_buy", 0) <= 0:
                    continue
                actual = min(seller["scu_buy"], remaining_qty)
                seller_td = seller["terminal_info"]
                splits.append({
                    "terminal": format_location_zh(
                        seller_td.get("name") or "", seller_td.get("nickname") or "",
                        seller_td.get("space_station_name") or "",
                        seller_td.get("planet_name") or "", seller_td.get("star_system_name") or ""
                    ),
                    "quantity": actual,
                    "price": seller["price_buy"],
                })
                remaining_qty -= actual
                visited_tids.add(seller["tid"])

            # Compute actual total revenue across splits
            total_revenue = sum(s["price"] * s["quantity"] for s in splits)

            # Build human-readable split summary for best_terminal
            terminal_summary = " + ".join(f"{s['terminal']}({s['quantity']})" for s in splits)

            if remaining_qty > 0:
                warnings.append(f"{r['name_zh']}({r['name']}): 未知 {remaining_qty} SCU 未知")

            commodity_summary.append({
                "name": r["name"],
                "name_zh": r["name_zh"],
                "quantity": r["quantity"],
                "best_price": best["price_buy"],
                "best_revenue": total_revenue,
                # Output as scu_sell for frontend compatibility (buy mode reads scu_sell)
                "scu_sell": best_capacity,
                "best_terminal": terminal_summary,
                "splits": splits,
            })

    # Step 3: Build terminal-commodity map
    terminal_sell_map: Dict[int, Dict] = {}
    for r in buyable_results:
        for s in r["sellers"]:
            tid = s["tid"]
            td = s["terminal_info"]
            if tid not in terminal_sell_map:
                terminal_sell_map[tid] = {
                    "terminal_id": tid,
                    "terminal_name": td.get("name") or "",
                    "terminal_nickname": td.get("nickname") or "",
                    "terminal_station": td.get("space_station_name") or "",
                    "star_system": td.get("star_system_name") or "",
                    "planet": td.get("planet_name") or "",
                    "zh_loc": get_terminal_zh(
                        td.get("name") or "", td.get("nickname") or "",
                        td.get("space_station_name") or "",
                        td.get("planet_name") or "", td.get("star_system_name") or ""
                    ),
                    "commodities": {},
                }
            if r["name"] not in terminal_sell_map[tid]["commodities"] or \
               s["price_buy"] < terminal_sell_map[tid]["commodities"][r["name"]]["price_buy"]:
                terminal_sell_map[tid]["commodities"][r["name"]] = {
                    "price_buy": s["price_buy"],
                    "scu_buy": s.get("scu_buy", 0),
                    "quantity": r["quantity"],
                    "name_zh": r["name_zh"],
                    "cost": s["price_buy"] * r["quantity"],
                }

    # Step 4: Build distance matrix
    candidate_tids = list(terminal_sell_map.keys())
    dist_matrix = {}
    if origin_tid:
        dist_matrix = build_distance_matrix(origin_tid, candidate_tids, refresh=refresh)

    # Step 5: Nearest-neighbor greedy route (shortest distance) - with split support
    # This route prioritizes DISTANCE above all else - the closest terminal
    # with needed items is visited first, regardless of price.
    # When a terminal's stock is insufficient, remaining quantity is carried
    # forward to subsequent terminals (split routing).
    shortest_route = []
    shortest_total_distance = 0
    shortest_total_cost = 0

    if origin_tid and dist_matrix:
        remaining = {r["name"]: {"name_zh": r["name_zh"], "remaining_qty": r["quantity"]} for r in buyable_results}
        visited_for_commodity = {r["name"]: set() for r in buyable_results}
        splits_count = {r["name"]: 0 for r in buyable_results}
        current_tid = origin_tid
        current_td = origin_terminal or {}

        while any(v["remaining_qty"] > 0 for v in remaining.values()):
            if not distance_cache.is_queried(current_tid) and current_tid != origin_tid:
                fetch_routes_from_terminal(current_tid, refresh=refresh)
                for (ot, dt), dist in distance_cache._distances.items():
                    if ot == current_tid or dt == current_tid:
                        dist_matrix[(ot, dt)] = dist
                        dist_matrix[(dt, ot)] = dist

            best_stop = None
            best_effective_d = float('inf')
            best_stop_distance = None
            best_stop_items = []   # list of (comm_name, comm_info, actual_qty)
            best_stop_tid = None
            best_assignable_scu = 0

            for tid, tinfo in terminal_sell_map.items():
                stop_items = []
                total_assignable_scu = 0
                has_zero_stock = False

                for comm_name, comm_info in tinfo["commodities"].items():
                    if comm_name not in remaining or remaining[comm_name]["remaining_qty"] <= 0:
                        continue
                    if tid in visited_for_commodity.get(comm_name, set()):
                        continue
                    if splits_count.get(comm_name, 0) >= _MAX_SPLITS:
                        continue

                    stock = comm_info.get("scu_buy", 0)
                    if stock <= 0:
                        has_zero_stock = True
                        # Zero-stock terminals don't participate in splitting
                        continue

                    actual = min(stock, remaining[comm_name]["remaining_qty"])
                    stop_items.append((comm_name, comm_info, actual))
                    total_assignable_scu += actual

                if not stop_items:
                    # Check if this terminal has zero-stock items for any
                    # remaining commodity that hasn't been visited/split-maxed.
                    # These are included as fallback with a 500 AU penalty,
                    # which naturally deprioritizes them behind in-stock terminals.
                    for comm_name, comm_info in tinfo["commodities"].items():
                        if comm_name not in remaining or remaining[comm_name]["remaining_qty"] <= 0:
                            continue
                        if tid in visited_for_commodity.get(comm_name, set()):
                            continue
                        if splits_count.get(comm_name, 0) >= _MAX_SPLITS:
                            continue
                        stock = comm_info.get("scu_buy", 0)
                        if stock <= 0:
                            stop_items.append((comm_name, comm_info, remaining[comm_name]["remaining_qty"]))
                            has_zero_stock = True

                if not stop_items:
                    continue

                d = dist_matrix.get((current_tid, tid))
                if d is None:
                    d = dist_matrix.get((tid, current_tid))
                if d is None:
                    d = get_distance(current_tid, tid)

                if d is None:
                    # Use improved fallback based on planet/system
                    d = _estimate_fallback_distance(current_td, tinfo)

                if d is None:
                    # Unreachable system (no jump point connection)
                    continue

                # Zero-stock penalty
                zero_penalty = 500 if has_zero_stock else 0
                # Capacity bonus: prefer terminals that handle more SCU (fewer total stops)
                # Capped at 50% of distance to prevent negative effective distances
                capacity_bonus = min(total_assignable_scu * 0.1, d * 0.5) if d > 0 else 0
                # Full fulfillment bonus: if this terminal can satisfy ALL remaining
                # quantity for every commodity it handles, give a significant bonus
                # to avoid unnecessary splitting across multiple terminals.
                all_fulfilled = all(
                    actual >= remaining[comm_name]["remaining_qty"]
                    for comm_name, _, actual in stop_items
                    if comm_name in remaining
                )
                fulfillment_bonus = 20 if all_fulfilled else 0

                effective_d = d - capacity_bonus - fulfillment_bonus + zero_penalty

                if effective_d < best_effective_d or \
                   (effective_d == best_effective_d and total_assignable_scu > best_assignable_scu):
                    best_effective_d = effective_d
                    best_stop = tinfo
                    best_stop_distance = d
                    best_stop_items = stop_items
                    best_stop_tid = tid
                    best_assignable_scu = total_assignable_scu

            if not best_stop:
                # No more terminals available - warn about unfulfilled commodities
                for comm_name, info in list(remaining.items()):
                    if info["remaining_qty"] > 0:
                        warnings.append(f"{info['name_zh']}({comm_name}): 未知,未知 {info['remaining_qty']} SCU")
                break

            commodities_bought = []
            for comm_name, comm_info, actual_qty in best_stop_items:
                commodities_bought.append({
                    "name": comm_name,
                    "name_zh": comm_info["name_zh"],
                    "quantity": actual_qty,
                    "price_per_scu": comm_info["price_buy"],
                    "revenue": comm_info["price_buy"] * actual_qty,
                    # Output as scu_sell for frontend compatibility
                    "scu_sell": comm_info.get("scu_buy", 0),
                })
                remaining[comm_name]["remaining_qty"] -= actual_qty
                visited_for_commodity[comm_name].add(best_stop_tid)
                splits_count[comm_name] += 1

                if remaining[comm_name]["remaining_qty"] <= 0:
                    del remaining[comm_name]
                elif splits_count[comm_name] >= _MAX_SPLITS:
                    warnings.append(f"{comm_info['name_zh']}({comm_name}): 未知({_MAX_SPLITS}),未知 {remaining[comm_name]['remaining_qty']} SCU 未知")
                    del remaining[comm_name]

            shortest_total_cost += sum(c["revenue"] for c in commodities_bought)
            if best_stop_distance is not None and best_stop_distance < 9999:
                shortest_total_distance += best_stop_distance

            shortest_route.append({
                "terminal_id": best_stop_tid,
                "terminal_name": best_stop["terminal_name"],
                "terminal_name_zh": best_stop["zh_loc"],
                "system": best_stop["star_system"],
                "system_zh": SYSTEM_ZH.get(best_stop["star_system"], best_stop["star_system"]),
                "planet": best_stop["planet"] or "",
                "planet_zh": PLANET_ZH.get(best_stop["planet"] or "", best_stop["planet"] or ""),
                "distance_from_prev": best_stop_distance if best_stop_distance is not None and best_stop_distance < 9999 else None,
                "cumulative_distance": shortest_total_distance,
                "commodities_sold": commodities_bought,
                "stop_revenue": sum(c["revenue"] for c in commodities_bought),
            })

            current_tid = best_stop_tid

    # Step 6: Cheapest route (each commodity to its cheapest IN-STOCK seller) - with split support
    # When the best terminal's stock is insufficient, remaining quantity is
    # split to the next cheapest terminals (up to _MAX_SPLITS terminals total).
    # After determining which terminals to visit, sort by nearest-neighbor greedy
    # distance from origin (instead of commodity-list order).
    max_profit_route = []
    max_profit_total_cost = 0
    max_profit_total_distance = None
    prev_tid = origin_tid
    prev_td = origin_terminal

    # Collect all commodity splits first, then build merged stops
    all_splits: List[Dict] = []  # [{tid, terminal_info, commodity_info, quantity, price}]

    for r in buyable_results:
        # Prefer in-stock sellers for cheapest route
        in_stock_sellers = [s for s in r["sellers"] if s.get("scu_buy", 0) > 0]
        # Zero-stock sellers as fallback (prices may be unreliable)
        zero_stock_sellers = [s for s in r["sellers"] if s.get("scu_buy", 0) == 0]

        remaining_qty = r["quantity"]
        visited_tids = set()
        commodity_splits = []

        # First pass: use in-stock sellers
        for seller in in_stock_sellers:
            if remaining_qty <= 0 or len(commodity_splits) >= _MAX_SPLITS:
                break
            if seller["tid"] in visited_tids:
                continue
            actual = min(seller["scu_buy"], remaining_qty)
            if actual <= 0:
                continue
            commodity_splits.append({
                "tid": seller["tid"],
                "terminal_info": seller["terminal_info"],
                "name": r["name"],
                "name_zh": r["name_zh"],
                "quantity": actual,
                "price": seller["price_buy"],
            })
            remaining_qty -= actual
            visited_tids.add(seller["tid"])

        # Second pass: fall back to zero-stock sellers if still needed
        if remaining_qty > 0 and len(commodity_splits) < _MAX_SPLITS:
            for seller in zero_stock_sellers:
                if remaining_qty <= 0 or len(commodity_splits) >= _MAX_SPLITS:
                    break
                if seller["tid"] in visited_tids:
                    continue
                # Zero-stock: assign full remaining (capacity unknown)
                actual = remaining_qty
                commodity_splits.append({
                    "tid": seller["tid"],
                    "terminal_info": seller["terminal_info"],
                    "name": r["name"],
                    "name_zh": r["name_zh"],
                    "quantity": actual,
                    "price": seller["price_buy"],
                })
                remaining_qty -= actual
                visited_tids.add(seller["tid"])

        if remaining_qty > 0:
            warnings.append(f"{r['name_zh']}({r['name']}): 未知,未知 {remaining_qty} SCU")

        all_splits.extend(commodity_splits)

    # Group splits by terminal_id
    terminal_groups: Dict[int, List[Dict]] = {}
    for split in all_splits:
        tid = split["tid"]
        if tid not in terminal_groups:
            terminal_groups[tid] = []
        terminal_groups[tid].append(split)

    # Sort terminals by nearest-neighbor greedy from origin (distance-optimized)
    terminal_order = _sort_terminals_by_distance(
        list(terminal_groups.keys()),
        origin_tid, origin_terminal,
        {tid: splits[0]["terminal_info"] for tid, splits in terminal_groups.items()},
        dist_matrix, refresh=refresh,
    )

    # Build route stops from grouped splits
    for tid in terminal_order:
        group = terminal_groups[tid]
        td = group[0]["terminal_info"]
        commodities_sold = []
        stop_revenue = 0

        for split in group:
            item_revenue = split["price"] * split["quantity"]
            commodities_sold.append({
                "name": split["name"],
                "name_zh": split["name_zh"],
                "quantity": split["quantity"],
                "price_per_scu": split["price"],
                "revenue": item_revenue,
                # Output as scu_sell for frontend compatibility
                "scu_sell": 0,  # Will be filled from terminal data if available
            })
            stop_revenue += item_revenue

        # Try to get SCU data from terminal_sell_map for each commodity
        if tid in terminal_sell_map:
            for cs in commodities_sold:
                comm_info = terminal_sell_map[tid]["commodities"].get(cs["name"])
                if comm_info:
                    cs["scu_sell"] = comm_info.get("scu_buy", 0)

        d = None
        if prev_tid:
            d = get_distance(prev_tid, tid)
            if d is None and prev_td:
                d = _estimate_fallback_distance(prev_td, td)

        if max_profit_total_distance is None and d is not None:
            max_profit_total_distance = 0
        if d is not None and max_profit_total_distance is not None:
            max_profit_total_distance += d

        max_profit_total_cost += stop_revenue

        max_profit_route.append({
            "terminal_id": tid,
            "terminal_name": td.get("name") or "",
            "terminal_name_zh": get_terminal_zh(
                td.get("name") or "", td.get("nickname") or "",
                td.get("space_station_name") or "",
                td.get("planet_name") or "", td.get("star_system_name") or ""
            ),
            "system": td.get("star_system_name") or "",
            "system_zh": SYSTEM_ZH.get(td.get("star_system_name") or "", td.get("star_system_name") or ""),
            "planet": td.get("planet_name") or "",
            "planet_zh": PLANET_ZH.get(td.get("planet_name") or "", td.get("planet_name") or ""),
            "distance_from_prev": d,
            "cumulative_distance": max_profit_total_distance,
            "commodities_sold": commodities_sold,
            "stop_revenue": stop_revenue,
        })
        prev_tid = tid
        prev_td = td

    return {
        "commodity_summary": commodity_summary,
        "shortest_route": shortest_route,
        "shortest_route_total_distance": shortest_total_distance,
        "shortest_route_total_revenue": shortest_total_cost,
        "max_profit_route": max_profit_route,
        "max_profit_route_total_distance": max_profit_total_distance,
        "max_profit_route_total_revenue": max_profit_total_cost,
        "warnings": warnings,
    }


# ---------------------------------------------------------------------------
# Sell Route Planner
# ---------------------------------------------------------------------------

def plan_sell_route(origin: str, items: List[Dict], refresh: bool = False, origin_id: int = None) -> Dict:
    """
    Plan sell route: find best buyers and optimize by distance.

    Uses price_sell (player's selling price) and scu_sell_stock (station's
    demand / how many SCU they'll buy from the player).

    Args:
        origin: Origin terminal name (Chinese or English)
        items: [{"name": "Tungsten", "quantity": 16}, ...]

    Returns:
        Dict with commodity_summary, shortest_route, max_profit_route, warnings
    """
    warnings = []
    sellable_results = []

    # Step 0: Resolve origin terminal - prefer origin_id for exact matching
    origin_terminal, origin_tid = _resolve_origin(origin, origin_id)
    origin_system = (origin_terminal.get("star_system_name") or "") if origin_terminal else ""

    # Step 1: Find best buyers for each commodity
    # "Buyer" = a terminal that BUYS this commodity FROM the player
    # API field: price_sell (what the player receives) > 0 means terminal buys it
    for item in items:
        name = item["name"]
        qty = item["quantity"]
        zh_name = get_commodity_zh(name)

        comm = search_commodity(name)
        if not comm:
            # Try Chinese reverse lookup
            from services.data_mapper import COMMODITY_ZH_MAP
            zh_to_en = {v: k for k, v in COMMODITY_ZH_MAP.items() if v}
            en_name = zh_to_en.get(name, name)
            comm = search_commodity(en_name)

        if not comm:
            warnings.append(f"{zh_name}({name}): 未知")
            continue

        comm_id = comm["id"]
        comm_name = comm.get("name", name)
        zh_name = get_commodity_zh(comm_name)

        try:
            prices = get_commodity_prices(comm_id, refresh=refresh)
        except Exception as e:
            warnings.append(f"{zh_name}({comm_name}): 未知 - {e}")
            continue

        # Find buyers: price_sell > 0 means the terminal buys this commodity from players
        # scu_sell_stock = terminal's stock/demand for buying from players
        # status_sell = freshness of the sell-side data
        buyers = []
        for p in prices:
            ps = p.get("price_sell", 0) or 0
            tid = p.get("id_terminal", 0)
            demand = p.get("scu_sell_stock", 0) or 0
            status = p.get("status_sell", 1) or 1

            if ps <= 0:
                continue

            # Resolve terminal to check its name for classification
            td = resolve_terminal(tid)
            t_name = td.get("name", "")

            # Filter out non-commodity-trading sub-terminals
            if not _is_valid_commodity_terminal(t_name):
                continue

            buyers.append({
                "tid": tid,
                "price_sell": ps,
                "scu_sell_stock": demand,
                "status": status,
                "terminal_info": td,
            })

        if not buyers:
            warnings.append(f"{zh_name}({comm_name}): UEX 未知(未知/未知)")
            continue

        # Split buyers into with-demand and zero-demand
        with_demand = [b for b in buyers if b["scu_sell_stock"] > 0]
        zero_demand = [b for b in buyers if b["scu_sell_stock"] == 0]

        # Deduplicate by location - for sell route, keep highest price
        def _dedup_by_location(buyer_list):
            best = {}
            for b in buyer_list:
                td = b["terminal_info"]
                tname = td.get("name", "")
                sys_name = td.get("star_system_name", "")
                loc_key = f"{tname}|{sys_name}"
                if loc_key not in best or b["price_sell"] > best[loc_key]["price_sell"]:
                    best[loc_key] = b
                elif b["scu_sell_stock"] > 0 and best[loc_key]["scu_sell_stock"] == 0 and b["price_sell"] == best[loc_key]["price_sell"]:
                    best[loc_key] = b
            return list(best.values())

        with_demand_deduped = _dedup_by_location(with_demand)
        zero_demand_deduped = _dedup_by_location(zero_demand)

        # Sort with status penalty
        # For sell route: higher price_sell = better payout
        def _sort_key(b):
            status_penalty = _status_score(b.get("status", 1))
            # Divide by penalty: stale data gets lower effective price
            return b["price_sell"] / status_penalty

        sorted_with_demand = sorted(with_demand_deduped, key=_sort_key, reverse=True)
        sorted_zero_demand = sorted(zero_demand_deduped, key=_sort_key, reverse=True)

        # Merge: with-demand first, zero-demand last
        sorted_buyers = sorted_with_demand + sorted_zero_demand
        sorted_buyers = sorted_buyers[:20]

        # Demand warnings
        if with_demand:
            best_demand = sorted_with_demand[0].get("scu_sell_stock", 0)
            if best_demand > 0 and best_demand < qty:
                warnings.append(f"{zh_name}({comm_name}): 未知 {best_demand} SCU,未知 {qty} SCU")
        else:
            warnings.append(f"{zh_name}({comm_name}): 未知 0,未知")

        sellable_results.append({
            "commodity_id": comm_id,
            "name": comm_name,
            "name_zh": zh_name,
            "quantity": qty,
            "buyers": sorted_buyers[:20],
        })

    if not sellable_results:
        return {
            "commodity_summary": [],
            "shortest_route": [],
            "shortest_route_total_distance": 0,
            "shortest_route_total_revenue": 0,
            "max_profit_route": [],
            "max_profit_route_total_distance": None,
            "max_profit_route_total_revenue": 0,
            "warnings": warnings,
        }

    # Step 2: Commodity summary (best price per commodity, prefer with-demand, with split info)
    commodity_summary = []
    for r in sellable_results:
        with_demand_buyers = [b for b in r["buyers"] if b.get("scu_sell_stock", 0) > 0]
        best = with_demand_buyers[0] if with_demand_buyers else (r["buyers"][0] if r["buyers"] else None)
        if not best:
            continue
        td = best["terminal_info"]
        best_loc = format_location_zh(
            td.get("name") or "", td.get("nickname") or "",
            td.get("space_station_name") or "",
            td.get("planet_name") or "", td.get("star_system_name") or ""
        )

        # Check whether splitting is needed
        best_capacity = best.get("scu_sell_stock", 0)
        needs_split = best_capacity > 0 and best_capacity < r["quantity"]

        if not needs_split:
            # Single terminal can handle everything - same as before
            commodity_summary.append({
                "name": r["name"],
                "name_zh": r["name_zh"],
                "quantity": r["quantity"],
                "best_price": best["price_sell"],
                "best_revenue": best["price_sell"] * r["quantity"],
                # Output as scu_buy for frontend compatibility (sell mode reads scu_buy)
                "scu_buy": best_capacity,
                "best_terminal": best_loc,
            })
        else:
            # Split across multiple terminals (sorted by price_sell descending = best payout first)
            remaining_qty = r["quantity"]
            splits = []
            visited_tids = set()

            for buyer in with_demand_buyers:
                if remaining_qty <= 0 or len(splits) >= _MAX_SPLITS:
                    break
                if buyer["tid"] in visited_tids:
                    continue
                if buyer.get("scu_sell_stock", 0) <= 0:
                    continue
                actual = min(buyer["scu_sell_stock"], remaining_qty)
                buyer_td = buyer["terminal_info"]
                splits.append({
                    "terminal": format_location_zh(
                        buyer_td.get("name") or "", buyer_td.get("nickname") or "",
                        buyer_td.get("space_station_name") or "",
                        buyer_td.get("planet_name") or "", buyer_td.get("star_system_name") or ""
                    ),
                    "quantity": actual,
                    "price": buyer["price_sell"],
                })
                remaining_qty -= actual
                visited_tids.add(buyer["tid"])

            # Compute actual total revenue across splits
            total_revenue = sum(s["price"] * s["quantity"] for s in splits)

            # Build human-readable split summary for best_terminal
            terminal_summary = " + ".join(f"{s['terminal']}({s['quantity']})" for s in splits)

            if remaining_qty > 0:
                warnings.append(f"{r['name_zh']}({r['name']}): 未知 {remaining_qty} SCU 未知")

            commodity_summary.append({
                "name": r["name"],
                "name_zh": r["name_zh"],
                "quantity": r["quantity"],
                "best_price": best["price_sell"],
                "best_revenue": total_revenue,
                # Output as scu_buy for frontend compatibility (sell mode reads scu_buy)
                "scu_buy": best_capacity,
                "best_terminal": terminal_summary,
                "splits": splits,
            })

    # Step 3: Build terminal-commodity map
    terminal_buy_map: Dict[int, Dict] = {}
    for r in sellable_results:
        for b in r["buyers"]:
            tid = b["tid"]
            td = b["terminal_info"]
            if tid not in terminal_buy_map:
                terminal_buy_map[tid] = {
                    "terminal_id": tid,
                    "terminal_name": td.get("name") or "",
                    "terminal_nickname": td.get("nickname") or "",
                    "terminal_station": td.get("space_station_name") or "",
                    "star_system": td.get("star_system_name") or "",
                    "planet": td.get("planet_name") or "",
                    "zh_loc": get_terminal_zh(
                        td.get("name") or "", td.get("nickname") or "",
                        td.get("space_station_name") or "",
                        td.get("planet_name") or "", td.get("star_system_name") or ""
                    ),
                    "commodities": {},
                }
            if r["name"] not in terminal_buy_map[tid]["commodities"] or \
               b["price_sell"] > terminal_buy_map[tid]["commodities"][r["name"]]["price_sell"]:
                terminal_buy_map[tid]["commodities"][r["name"]] = {
                    "price_sell": b["price_sell"],
                    "scu_sell_stock": b.get("scu_sell_stock", 0),
                    "quantity": r["quantity"],
                    "name_zh": r["name_zh"],
                    "revenue": b["price_sell"] * r["quantity"],
                }

    # Step 4: Build distance matrix
    candidate_tids = list(terminal_buy_map.keys())
    dist_matrix = {}
    if origin_tid:
        dist_matrix = build_distance_matrix(origin_tid, candidate_tids, refresh=refresh)

    # Step 5: Nearest-neighbor greedy route (shortest distance) - with split support
    # This route prioritizes DISTANCE above all else - the closest terminal
    # that buys needed items is visited first, regardless of payout.
    # When a terminal's demand is insufficient, remaining quantity is carried
    # forward to subsequent terminals (split routing).
    shortest_route = []
    shortest_total_distance = 0
    shortest_total_revenue = 0

    if origin_tid and dist_matrix:
        remaining = {r["name"]: {"name_zh": r["name_zh"], "remaining_qty": r["quantity"]} for r in sellable_results}
        visited_for_commodity = {r["name"]: set() for r in sellable_results}
        splits_count = {r["name"]: 0 for r in sellable_results}
        current_tid = origin_tid
        current_td = origin_terminal or {}

        while any(v["remaining_qty"] > 0 for v in remaining.values()):
            # Real-time route query at current station
            if not distance_cache.is_queried(current_tid) and current_tid != origin_tid:
                fetch_routes_from_terminal(current_tid, refresh=refresh)
                for (ot, dt), dist in distance_cache._distances.items():
                    if ot == current_tid or dt == current_tid:
                        dist_matrix[(ot, dt)] = dist
                        dist_matrix[(dt, ot)] = dist

            best_stop = None
            best_effective_d = float('inf')
            best_stop_distance = None
            best_stop_items = []   # list of (comm_name, comm_info, actual_qty)
            best_stop_tid = None
            best_assignable_scu = 0

            for tid, tinfo in terminal_buy_map.items():
                stop_items = []
                total_assignable_scu = 0
                has_zero_demand = False

                for comm_name, comm_info in tinfo["commodities"].items():
                    if comm_name not in remaining or remaining[comm_name]["remaining_qty"] <= 0:
                        continue
                    if tid in visited_for_commodity.get(comm_name, set()):
                        continue
                    if splits_count.get(comm_name, 0) >= _MAX_SPLITS:
                        continue

                    demand = comm_info.get("scu_sell_stock", 0)
                    if demand <= 0:
                        has_zero_demand = True
                        # Zero-demand terminals don't participate in splitting
                        continue

                    actual = min(demand, remaining[comm_name]["remaining_qty"])
                    stop_items.append((comm_name, comm_info, actual))
                    total_assignable_scu += actual

                if not stop_items:
                    # Check if this terminal has zero-demand items for any
                    # remaining commodity that hasn't been visited/split-maxed.
                    # These are included as fallback with a 500 AU penalty,
                    # which naturally deprioritizes them behind with-demand terminals.
                    for comm_name, comm_info in tinfo["commodities"].items():
                        if comm_name not in remaining or remaining[comm_name]["remaining_qty"] <= 0:
                            continue
                        if tid in visited_for_commodity.get(comm_name, set()):
                            continue
                        if splits_count.get(comm_name, 0) >= _MAX_SPLITS:
                            continue
                        demand = comm_info.get("scu_sell_stock", 0)
                        if demand <= 0:
                            stop_items.append((comm_name, comm_info, remaining[comm_name]["remaining_qty"]))
                            has_zero_demand = True

                if not stop_items:
                    continue

                d = dist_matrix.get((current_tid, tid))
                if d is None:
                    d = dist_matrix.get((tid, current_tid))
                if d is None:
                    d = get_distance(current_tid, tid)

                if d is None:
                    # Use improved fallback based on planet/system
                    d = _estimate_fallback_distance(current_td, tinfo)

                if d is None:
                    # Unreachable system (no jump point connection)
                    continue

                # Zero-demand penalty
                zero_penalty = 500 if has_zero_demand else 0
                # Capacity bonus: prefer terminals that handle more SCU (fewer total stops)
                # Capped at 50% of distance to prevent negative effective distances
                capacity_bonus = min(total_assignable_scu * 0.1, d * 0.5) if d > 0 else 0
                # Full fulfillment bonus: if this terminal can satisfy ALL remaining
                # quantity for every commodity it handles, give a significant bonus
                # to avoid unnecessary splitting across multiple terminals.
                all_fulfilled = all(
                    actual >= remaining[comm_name]["remaining_qty"]
                    for comm_name, _, actual in stop_items
                    if comm_name in remaining
                )
                fulfillment_bonus = 20 if all_fulfilled else 0

                effective_d = d - capacity_bonus - fulfillment_bonus + zero_penalty

                if effective_d < best_effective_d or \
                   (effective_d == best_effective_d and total_assignable_scu > best_assignable_scu):
                    best_effective_d = effective_d
                    best_stop = tinfo
                    best_stop_distance = d
                    best_stop_items = stop_items
                    best_stop_tid = tid
                    best_assignable_scu = total_assignable_scu

            if not best_stop:
                # No more terminals available - warn about unfulfilled commodities
                for comm_name, info in list(remaining.items()):
                    if info["remaining_qty"] > 0:
                        warnings.append(f"{info['name_zh']}({comm_name}): 未知,未知 {info['remaining_qty']} SCU")
                break

            commodities_sold = []
            for comm_name, comm_info, actual_qty in best_stop_items:
                commodities_sold.append({
                    "name": comm_name,
                    "name_zh": comm_info["name_zh"],
                    "quantity": actual_qty,
                    "price_per_scu": comm_info["price_sell"],
                    "revenue": comm_info["price_sell"] * actual_qty,
                    # Output as scu_buy for frontend compatibility
                    "scu_buy": comm_info.get("scu_sell_stock", 0),
                })
                remaining[comm_name]["remaining_qty"] -= actual_qty
                visited_for_commodity[comm_name].add(best_stop_tid)
                splits_count[comm_name] += 1

                if remaining[comm_name]["remaining_qty"] <= 0:
                    del remaining[comm_name]
                elif splits_count[comm_name] >= _MAX_SPLITS:
                    warnings.append(f"{comm_info['name_zh']}({comm_name}): 未知({_MAX_SPLITS}),未知 {remaining[comm_name]['remaining_qty']} SCU 未知")
                    del remaining[comm_name]

            shortest_total_revenue += sum(c["revenue"] for c in commodities_sold)
            if best_stop_distance is not None and best_stop_distance < 9999:
                shortest_total_distance += best_stop_distance

            shortest_route.append({
                "terminal_id": best_stop_tid,
                "terminal_name": best_stop["terminal_name"],
                "terminal_name_zh": best_stop["zh_loc"],
                "system": best_stop["star_system"],
                "system_zh": SYSTEM_ZH.get(best_stop["star_system"], best_stop["star_system"]),
                "planet": best_stop["planet"] or "",
                "planet_zh": PLANET_ZH.get(best_stop["planet"] or "", best_stop["planet"] or ""),
                "distance_from_prev": best_stop_distance if best_stop_distance is not None and best_stop_distance < 9999 else None,
                "cumulative_distance": shortest_total_distance,
                "commodities_sold": commodities_sold,
                "stop_revenue": sum(c["revenue"] for c in commodities_sold),
            })

            current_tid = best_stop_tid

    # Step 6: Max profit route (each commodity to its best WITH-DEMAND buyer) - with split support
    # When the best terminal's demand is insufficient, remaining quantity is
    # split to the next best-paying terminals (up to _MAX_SPLITS terminals total).
    # After determining which terminals to visit, sort by nearest-neighbor greedy
    # distance from origin (instead of commodity-list order).
    max_profit_route = []
    max_profit_total_revenue = 0
    max_profit_total_distance = None
    prev_tid = origin_tid
    prev_td = origin_terminal

    # Collect all commodity splits first, then build merged stops
    all_splits: List[Dict] = []  # [{tid, terminal_info, commodity_info, quantity, price}]

    for r in sellable_results:
        # Prefer buyers with demand for max profit route
        with_demand_buyers = [b for b in r["buyers"] if b.get("scu_sell_stock", 0) > 0]
        # Zero-demand buyers as fallback (prices may be unreliable)
        zero_demand_buyers = [b for b in r["buyers"] if b.get("scu_sell_stock", 0) == 0]

        remaining_qty = r["quantity"]
        visited_tids = set()
        commodity_splits = []

        # First pass: use with-demand buyers
        for buyer in with_demand_buyers:
            if remaining_qty <= 0 or len(commodity_splits) >= _MAX_SPLITS:
                break
            if buyer["tid"] in visited_tids:
                continue
            actual = min(buyer["scu_sell_stock"], remaining_qty)
            if actual <= 0:
                continue
            commodity_splits.append({
                "tid": buyer["tid"],
                "terminal_info": buyer["terminal_info"],
                "name": r["name"],
                "name_zh": r["name_zh"],
                "quantity": actual,
                "price": buyer["price_sell"],
            })
            remaining_qty -= actual
            visited_tids.add(buyer["tid"])

        # Second pass: fall back to zero-demand buyers if still needed
        if remaining_qty > 0 and len(commodity_splits) < _MAX_SPLITS:
            for buyer in zero_demand_buyers:
                if remaining_qty <= 0 or len(commodity_splits) >= _MAX_SPLITS:
                    break
                if buyer["tid"] in visited_tids:
                    continue
                # Zero-demand: assign full remaining (capacity unknown)
                actual = remaining_qty
                commodity_splits.append({
                    "tid": buyer["tid"],
                    "terminal_info": buyer["terminal_info"],
                    "name": r["name"],
                    "name_zh": r["name_zh"],
                    "quantity": actual,
                    "price": buyer["price_sell"],
                })
                remaining_qty -= actual
                visited_tids.add(buyer["tid"])

        if remaining_qty > 0:
            warnings.append(f"{r['name_zh']}({r['name']}): 未知,未知 {remaining_qty} SCU")

        all_splits.extend(commodity_splits)

    # Group splits by terminal_id
    terminal_groups: Dict[int, List[Dict]] = {}
    for split in all_splits:
        tid = split["tid"]
        if tid not in terminal_groups:
            terminal_groups[tid] = []
        terminal_groups[tid].append(split)

    # Sort terminals by nearest-neighbor greedy from origin (distance-optimized)
    terminal_order = _sort_terminals_by_distance(
        list(terminal_groups.keys()),
        origin_tid, origin_terminal,
        {tid: splits[0]["terminal_info"] for tid, splits in terminal_groups.items()},
        dist_matrix, refresh=refresh,
    )

    # Build route stops from grouped splits
    for tid in terminal_order:
        group = terminal_groups[tid]
        td = group[0]["terminal_info"]
        commodities_sold = []
        stop_revenue = 0

        for split in group:
            item_revenue = split["price"] * split["quantity"]
            commodities_sold.append({
                "name": split["name"],
                "name_zh": split["name_zh"],
                "quantity": split["quantity"],
                "price_per_scu": split["price"],
                "revenue": item_revenue,
                # Output as scu_buy for frontend compatibility
                "scu_buy": 0,  # Will be filled from terminal data if available
            })
            stop_revenue += item_revenue

        # Try to get SCU data from terminal_buy_map for each commodity
        if tid in terminal_buy_map:
            for cs in commodities_sold:
                comm_info = terminal_buy_map[tid]["commodities"].get(cs["name"])
                if comm_info:
                    cs["scu_buy"] = comm_info.get("scu_sell_stock", 0)

        d = None
        if prev_tid:
            d = get_distance(prev_tid, tid)
            if d is None and prev_td:
                d = _estimate_fallback_distance(prev_td, td)

        if max_profit_total_distance is None and d is not None:
            max_profit_total_distance = 0
        if d is not None and max_profit_total_distance is not None:
            max_profit_total_distance += d

        max_profit_total_revenue += stop_revenue

        max_profit_route.append({
            "terminal_id": tid,
            "terminal_name": td.get("name") or "",
            "terminal_name_zh": get_terminal_zh(
                td.get("name") or "", td.get("nickname") or "",
                td.get("space_station_name") or "",
                td.get("planet_name") or "", td.get("star_system_name") or ""
            ),
            "system": td.get("star_system_name") or "",
            "system_zh": SYSTEM_ZH.get(td.get("star_system_name") or "", td.get("star_system_name") or ""),
            "planet": td.get("planet_name") or "",
            "planet_zh": PLANET_ZH.get(td.get("planet_name") or "", td.get("planet_name") or ""),
            "distance_from_prev": d,
            "cumulative_distance": max_profit_total_distance,
            "commodities_sold": commodities_sold,
            "stop_revenue": stop_revenue,
        })
        prev_tid = tid
        prev_td = td

    return {
        "commodity_summary": commodity_summary,
        "shortest_route": shortest_route,
        "shortest_route_total_distance": shortest_total_distance,
        "shortest_route_total_revenue": shortest_total_revenue,
        "max_profit_route": max_profit_route,
        "max_profit_route_total_distance": max_profit_total_distance,
        "max_profit_route_total_revenue": max_profit_total_revenue,
        "warnings": warnings,
    }
