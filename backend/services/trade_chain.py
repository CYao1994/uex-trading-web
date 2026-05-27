"""
Trade Chain Planner - Chain route planning for maximum profit.
Iteratively finds the best commodity × destination at each location.
"""
import math
from typing import Dict, List, Optional

from services.uex_api import (
    load_terminals, load_vehicles, get_locations,
    get_all_prices, resolve_terminal, _get_location_key, _build_location_index
)
from services.data_mapper import (
    get_terminal_zh, get_commodity_zh, get_vehicle_zh,
    SYSTEM_ZH, PLANET_ZH
)
from services.route_planner import _is_valid_commodity_terminal


def plan_trade_chain(
    vehicle_id: Optional[int],
    scu_override: Optional[int],
    origin_location_id: Optional[int],
    origin_location_name: Optional[str],
    capital: int,
    max_legs: int = 5,
) -> dict:
    """Plan a chain of trade routes maximizing profit at each step.

    Algorithm:
    1. Resolve SCU from vehicle or override
    2. Resolve origin location -> terminal_ids
    3. For each leg (up to max_legs):
       a. Scan all buyable commodities at current location terminals
       b. For each commodity x destination, calculate profit
       c. Pick the highest profit combination
       d. If profit <= 0, stop early
       e. Update: location = destination, capital += profit
    4. Return chain with legs + summary
    """
    warnings: List[str] = []

    # Step 1: Resolve SCU
    ship_scu = _resolve_scu(vehicle_id, scu_override, warnings)

    # Step 2: Resolve origin location
    current_terminal_ids = _resolve_origin_terminals(
        origin_location_id, origin_location_name, warnings
    )
    if not current_terminal_ids:
        return _empty_response(warnings, "无法解析出发地，请检查出发地选择")

    # Step 3: Bulk load all price data
    all_prices = get_all_prices()

    # Build terminal_id -> prices lookup
    terminal_prices: Dict[int, List[dict]] = {}
    for p in all_prices:
        tid = p.get("id_terminal", 0)
        if tid:
            terminal_prices.setdefault(tid, []).append(p)

    # Load terminals for name resolution
    terminals = load_terminals()
    terminal_map: Dict[int, dict] = {t.get("id"): t for t in terminals}

    # Build destination lookup: {commodity_id: [dest_records]}
    dest_lookup = _build_destination_lookup(terminal_prices, terminal_map)

    # Step 4: Iterative chain planning
    legs: List[dict] = []
    current_capital = float(capital)
    stale_warned = False

    for leg_idx in range(1, max_legs + 1):
        buyable = _scan_buyable(
            current_terminal_ids, terminal_prices, terminal_map,
            current_capital, ship_scu
        )

        if not buyable:
            return _build_response(
                legs, capital, current_capital,
                f"第 {leg_idx} 段无可用购买数据，链式规划提前结束",
                warnings
            )

        # Check for stale data and add warning once
        if not stale_warned:
            has_stale = any(
                p.get("status_buy", 99) > 2
                for p in buyable
            )
            if has_stale:
                warnings.append("部分购买数据较旧（status>2），价格可能不完全准确")
                stale_warned = True

        best = _find_best_leg(buyable, dest_lookup, terminal_map, ship_scu, current_capital)

        if best is None or best["profit"] <= 0:
            return _build_response(
                legs, capital, current_capital,
                f"第 {leg_idx} 段无盈利路线，链式规划提前结束",
                warnings
            )

        # Build leg record
        dest_td = terminal_map.get(best["dest_terminal_id"], {})
        origin_td = terminal_map.get(best["origin_terminal_id"], {})

        leg = _make_leg_dict(leg_idx, origin_td, dest_td, best)
        legs.append(leg)

        # Update for next leg
        current_capital += best["profit"]

        # Next origin = destination's location
        dest_location_key = _get_location_key(dest_td)
        loc_index = _build_location_index()
        current_terminal_ids = loc_index.get(dest_location_key, [best["dest_terminal_id"]])

    return _build_response(legs, capital, current_capital, None, warnings)


def _resolve_scu(vehicle_id: Optional[int], scu_override: Optional[int], warnings: List[str]) -> int:
    """Resolve ship SCU capacity. Priority: scu_override > vehicle_id > default 32."""
    if scu_override and scu_override > 0:
        return scu_override

    if vehicle_id:
        vehicles = load_vehicles()
        for v in vehicles:
            if v.get("id") == vehicle_id:
                return v.get("scu", 32)
        warnings.append(f"未找到飞船 ID={vehicle_id}，使用默认货仓 32 SCU")

    return 32  # Default: Freelancer standard


def _resolve_origin_terminals(
    location_id: Optional[int], location_name: Optional[str], warnings: List[str]
) -> List[int]:
    """Resolve origin location to a list of terminal IDs."""
    locations = get_locations()

    # Try by location_id first
    if location_id:
        for loc in locations:
            if loc.get("location_id") == location_id:
                return loc.get("terminal_ids", [])

    # Try by name match
    if location_name:
        q = location_name.lower().strip()
        for loc in locations:
            if q in loc.get("location_name", "").lower() or q in loc.get("location_name_zh", "").lower():
                return loc.get("terminal_ids", [])

    warnings.append("未指定出发地或出发地未找到")
    return []


def _build_destination_lookup(
    terminal_prices: Dict[int, List[dict]], terminal_map: Dict[int, dict]
) -> Dict[int, List[dict]]:
    """Build {commodity_id: [dest_records]} for quick destination lookup."""
    lookup: Dict[int, List[dict]] = {}
    for tid, prices in terminal_prices.items():
        td = terminal_map.get(tid, {})
        if not _is_valid_commodity_terminal(td.get("name", "")):
            continue
        for p in prices:
            cid = p.get("id_commodity", 0)
            if not cid:
                continue
            price_sell = p.get("price_sell")
            scu_sell_stock = p.get("scu_sell_stock", 0)
            status_sell = p.get("status_sell", 99)
            if not price_sell or price_sell <= 0 or status_sell > 5:
                continue
            lookup.setdefault(cid, []).append({
                "dest_terminal_id": tid,
                "price_sell": price_sell,
                "scu_sell_stock": scu_sell_stock or 0,
            })
    return lookup


def _scan_buyable(
    terminal_ids: List[int],
    terminal_prices: Dict[int, List[dict]],
    terminal_map: Dict[int, dict],
    capital: float,
    ship_scu: int,
) -> List[dict]:
    """Scan buyable commodities at given terminals.

    Returns list of dicts with:
    - origin_terminal_id, commodity_id, commodity_name
    - price_buy, scu_buy (available stock at origin)
    """
    buyable: List[dict] = []
    seen: set = set()

    for tid in terminal_ids:
        prices = terminal_prices.get(tid, [])
        td = terminal_map.get(tid, {})
        t_name = td.get("name", "")

        if not _is_valid_commodity_terminal(t_name):
            continue

        for p in prices:
            cid = p.get("id_commodity", 0)
            if not cid or (tid, cid) in seen:
                continue

            price_buy = p.get("price_buy")
            scu_buy = p.get("scu_buy", 0)
            status_buy = p.get("status_buy", 99)

            # Filter: must have valid buy data with reasonably fresh status
            # status_buy: 1=latest, 2=fresh, 3-5=slightly stale but usable
            if not price_buy or price_buy <= 0:
                continue
            if not scu_buy or scu_buy <= 0:
                continue
            if status_buy > 5:
                continue

            # Check if we can afford at least 1 SCU
            if capital < price_buy:
                continue

            seen.add((tid, cid))
            buyable.append({
                "origin_terminal_id": tid,
                "commodity_id": cid,
                "commodity_name": p.get("commodity_name", ""),
                "price_buy": price_buy,
                "scu_buy": scu_buy,
                "status_buy": status_buy,
            })

    return buyable


def _find_best_leg(
    buyable: List[dict],
    dest_lookup: Dict[int, List[dict]],
    terminal_map: Dict[int, dict],
    ship_scu: int,
    capital: float,
) -> Optional[dict]:
    """Find the commodity x destination with maximum total profit.

    For each buyable item at origin:
    - Calculate max buyable quantity = min(scu_buy, floor(capital/price_buy), ship_scu)
    - For each destination terminal that buys this commodity:
      - actual_volume = min(buyable_qty, scu_sell_stock)
      - profit = actual_volume * (price_sell - price_buy)
    - Track the best profit across all combinations

    Tiebreaker: if profits are equal, pick the one with highest volume_scu.
    """
    best: Optional[dict] = None
    best_profit: float = 0
    best_volume: int = 0

    for item in buyable:
        cid = item["commodity_id"]
        price_buy = item["price_buy"]
        origin_tid = item["origin_terminal_id"]

        # Max quantity we can buy (capped by stock, capital, and ship SCU)
        max_by_capital = math.floor(capital / price_buy) if price_buy > 0 else 0
        max_buy = min(item["scu_buy"], max_by_capital, ship_scu)

        if max_buy <= 0:
            continue

        destinations = dest_lookup.get(cid, [])
        for dest in destinations:
            dest_tid = dest["dest_terminal_id"]

            # Skip if destination is the same terminal
            if dest_tid == origin_tid:
                continue

            price_sell = dest["price_sell"]
            scu_sell_stock = dest["scu_sell_stock"]

            # Actual volume = min(what we can buy, what destination will buy)
            actual_volume = min(max_buy, scu_sell_stock) if scu_sell_stock > 0 else max_buy

            profit = actual_volume * (price_sell - price_buy)

            # Pick highest profit; tiebreaker: highest volume
            if profit > best_profit or (profit == best_profit and actual_volume > best_volume):
                best_profit = profit
                best_volume = actual_volume
                best = {
                    "origin_terminal_id": origin_tid,
                    "dest_terminal_id": dest_tid,
                    "commodity_id": cid,
                    "commodity_name": item["commodity_name"],
                    "price_buy": price_buy,
                    "price_sell": price_sell,
                    "volume_scu": actual_volume,
                    "profit": profit,
                }

    return best


def _make_leg_dict(leg_idx: int, origin_td: dict, dest_td: dict, best: dict) -> dict:
    """Build a ChainLeg-compatible dict."""
    def _zh(td: dict) -> str:
        return get_terminal_zh(
            td.get("name", ""), td.get("nickname", ""),
            td.get("space_station_name", ""),
            td.get("planet_name", ""), td.get("star_system_name", "")
        )

    dest_system = dest_td.get("star_system_name", "") or ""
    dest_planet = dest_td.get("planet_name", "") or ""

    return {
        "leg_index": leg_idx,
        "origin_name": origin_td.get("name", ""),
        "origin_name_zh": _zh(origin_td),
        "commodity_name": best["commodity_name"],
        "commodity_name_zh": get_commodity_zh(best["commodity_name"]),
        "price_buy": best["price_buy"],
        "price_sell": best["price_sell"],
        "volume_scu": best["volume_scu"],
        "total_cost": best["volume_scu"] * best["price_buy"],
        "total_revenue": best["volume_scu"] * best["price_sell"],
        "profit": best["profit"],
        "destination_name": dest_td.get("name", ""),
        "destination_name_zh": _zh(dest_td),
        "destination_system": dest_system,
        "destination_system_zh": SYSTEM_ZH.get(dest_system, dest_system),
        "destination_planet": dest_planet,
        "destination_planet_zh": PLANET_ZH.get(dest_planet, dest_planet),
    }


def _empty_response(warnings: List[str], early_stop_reason: str) -> dict:
    """Build an empty chain response with an early stop reason."""
    return {
        "legs": [],
        "total_profit": 0,
        "final_capital": 0,
        "total_legs": 0,
        "early_stop_reason": early_stop_reason,
        "warnings": warnings,
    }


def _build_response(
    legs: List[dict],
    initial_capital: int,
    current_capital: float,
    early_stop_reason: Optional[str],
    warnings: List[str],
) -> dict:
    """Build the final trade chain response."""
    total_profit = current_capital - float(initial_capital)
    return {
        "legs": legs,
        "total_profit": round(total_profit, 2),
        "final_capital": round(current_capital, 2),
        "total_legs": len(legs),
        "early_stop_reason": early_stop_reason,
        "warnings": warnings,
    }
