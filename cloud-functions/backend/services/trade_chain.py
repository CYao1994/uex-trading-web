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

        # Check for stale data and add warning with specific commodity names
        # status 4-5: slightly stale, still reliable
        # status 6-7: stale, prices may be inaccurate but better than no data
        if not stale_warned:
            from services.data_mapper import get_commodity_zh
            very_stale_items = []
            slightly_stale_items = []
            for p in buyable:
                s = p.get("status_buy", 99)
                cname = p.get("commodity_name", "")
                cname_zh = get_commodity_zh(cname)
                label = f"{cname_zh}({cname}) status={s}"
                if s > 5:
                    very_stale_items.append(label)
                elif s > 3:
                    slightly_stale_items.append(label)
            if very_stale_items:
                items_str = "、".join(very_stale_items[:5])
                suffix = f"等{len(very_stale_items)}种商品" if len(very_stale_items) > 5 else ""
                warnings.append(f"以下商品数据较旧，价格可能不准确：{items_str}{suffix}，建议在游戏中核实")
                stale_warned = True
            elif slightly_stale_items:
                items_str = "、".join(slightly_stale_items[:5])
                suffix = f"等{len(slightly_stale_items)}种商品" if len(slightly_stale_items) > 5 else ""
                warnings.append(f"以下商品数据略旧，价格可能不完全准确：{items_str}{suffix}")
                stale_warned = True

        best = _find_best_leg(buyable, dest_lookup, terminal_map, ship_scu, current_capital)

        if best is None or best["profit"] <= 0:
            return _build_response(
                legs, capital, current_capital,
                f"第 {leg_idx} 段无盈利路线，链式规划提前结束",
                warnings
            )

        # Find supplementary commodities to fill remaining SCU and budget
        supplements = _find_supplement_commodities(
            buyable, best, dest_lookup, terminal_map, ship_scu, current_capital
        )

        # Build leg record
        dest_td = terminal_map.get(best["dest_terminal_id"], {})
        origin_td = terminal_map.get(best["origin_terminal_id"], {})

        leg = _make_leg_dict(leg_idx, origin_td, dest_td, best, supplements)
        legs.append(leg)

        # Update capital with total profit from all commodities (primary + supplements)
        total_leg_profit = leg["profit"]
        current_capital += total_leg_profit

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
            # Same threshold alignment as _scan_buyable: accept status up to 7
            if not price_sell or price_sell <= 0 or status_sell > 7:
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

            # Filter: must have valid buy data with usable status
            # status_buy: 1=latest, 2=fresh, 3-5=slightly stale, 6-7=stale but usable
            # Hard filter at >7: beyond this the data is too unreliable
            # Note: status 6-7 data is included because many locations (e.g. Area 18)
            # only have stale buy data — showing something with a warning is better
            # than showing "no data available"
            if not price_buy or price_buy <= 0:
                continue
            if not scu_buy or scu_buy <= 0:
                continue
            if status_buy > 7:
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
    """Find the best leg by aggregating multi-commodity combos per destination.

    Algorithm:
    1. Build candidate list: for each buyable commodity, compute max quantity
       and pair with each profitable destination.
    2. Group candidates by destination terminal.
    3. For each destination, greedily assign cargo space by unit profit
       (respecting SCU, budget, and destination stock constraints).
    4. Pick the destination with highest total profit.

    Returns a dict with the best destination and all commodities assigned to it,
    plus an _all_commodities field for the supplement finder.
    """
    # Step 1: Build candidate pairs (commodity x destination)
    candidates_by_dest: Dict[int, List[dict]] = {}

    for item in buyable:
        cid = item["commodity_id"]
        price_buy = item["price_buy"]
        origin_tid = item["origin_terminal_id"]
        status_buy = item.get("status_buy", 99)

        max_by_capital = math.floor(capital / price_buy) if price_buy > 0 else 0
        max_buy = min(item["scu_buy"], max_by_capital, ship_scu)
        if max_buy <= 0:
            continue

        unit_profit_margin = 0
        destinations = dest_lookup.get(cid, [])
        for dest in destinations:
            dest_tid = dest["dest_terminal_id"]
            if dest_tid == origin_tid:
                continue
            price_sell = dest["price_sell"]
            if price_sell <= price_buy:
                continue
            unit_profit_margin = price_sell - price_buy
            break
        if unit_profit_margin <= 0:
            continue

        for dest in destinations:
            dest_tid = dest["dest_terminal_id"]
            if dest_tid == origin_tid:
                continue
            price_sell = dest["price_sell"]
            if price_sell <= price_buy:
                continue
            scu_sell_stock = dest["scu_sell_stock"]

            effective_factor = 0.9 if status_buy > 5 else 1.0

            candidates_by_dest.setdefault(dest_tid, []).append({
                "origin_terminal_id": origin_tid,
                "dest_terminal_id": dest_tid,
                "commodity_id": cid,
                "commodity_name": item["commodity_name"],
                "price_buy": price_buy,
                "price_sell": price_sell,
                "max_buyable": max_buy,
                "scu_sell_stock": scu_sell_stock,
                "unit_profit": price_sell - price_buy,
                "effective_factor": effective_factor,
                "status_buy": status_buy,
            })

    if not candidates_by_dest:
        return None

    # Step 2 & 3: For each destination, greedily assign cargo
    best_dest = None
    best_total_effective = 0
    best_total_real_profit = 0

    for dest_tid, cands in candidates_by_dest.items():
        cands.sort(key=lambda c: c["unit_profit"], reverse=True)

        remaining_scu = ship_scu
        remaining_budget = capital
        dest_assigned = []
        total_effective = 0
        total_real_profit = 0

        for c in cands:
            if remaining_scu <= 0 or remaining_budget <= 0:
                break

            dest_stock = c["scu_sell_stock"]
            max_by_budget = math.floor(remaining_budget / c["price_buy"]) if c["price_buy"] > 0 else 0
            vol = min(c["max_buyable"], max_by_budget, remaining_scu,
                      dest_stock if dest_stock > 0 else remaining_scu)
            if vol <= 0:
                continue

            real_profit = vol * c["unit_profit"]
            effective_profit = real_profit * c["effective_factor"]

            dest_assigned.append({
                "origin_terminal_id": c["origin_terminal_id"],
                "dest_terminal_id": dest_tid,
                "commodity_id": c["commodity_id"],
                "commodity_name": c["commodity_name"],
                "price_buy": c["price_buy"],
                "price_sell": c["price_sell"],
                "volume_scu": vol,
                "profit": real_profit,
                "status_buy": c["status_buy"],
            })

            remaining_scu -= vol
            remaining_budget -= vol * c["price_buy"]
            total_effective += effective_profit
            total_real_profit += real_profit

        if total_effective > best_total_effective or (
            total_effective == best_total_effective and total_real_profit > best_total_real_profit
        ):
            best_total_effective = total_effective
            best_total_real_profit = total_real_profit
            best_dest = dest_tid
            best_assigned = dest_assigned

    if best_dest is None or not best_assigned:
        return None

    # Build result: primary is the highest unit-profit commodity
    best_assigned.sort(key=lambda a: a["unit_profit"] if "unit_profit" in a else (a["price_sell"] - a["price_buy"]), reverse=True)
    primary = best_assigned[0]

    return {
        "origin_terminal_id": primary["origin_terminal_id"],
        "dest_terminal_id": best_dest,
        "commodity_id": primary["commodity_id"],
        "commodity_name": primary["commodity_name"],
        "price_buy": primary["price_buy"],
        "price_sell": primary["price_sell"],
        "volume_scu": primary["volume_scu"],
        "profit": primary["profit"],
        "_all_commodities": best_assigned,
    }


def _find_supplement_commodities(
    buyable: List[dict],
    best: dict,
    dest_lookup: Dict[int, List[dict]],
    terminal_map: Dict[int, dict],
    ship_scu: int,
    capital: float,
) -> List[dict]:
    """Find supplementary commodities to fill remaining SCU and budget capacity.

    Uses a greedy algorithm that:
    1. Filters candidates: same origin terminal, same destination, profitable,
       and different from all already-assigned commodities.
    2. Sorts candidates by unit profit (price_sell - price_buy) descending.
    3. Greedily fills remaining SCU and budget until exhausted or max 4 supplements.

    When best contains _all_commodities (from multi-commodity aggregation),
    those are treated as already-assigned and excluded from supplement candidates.

    Args:
        buyable: All buyable commodities at current origin terminals.
        best: The primary leg result (best profit combination).
        dest_lookup: {commodity_id: [dest_records]} for destination lookup.
        terminal_map: Terminal metadata map.
        ship_scu: Total ship SCU capacity.
        capital: Current available capital.

    Returns:
        List of supplement dicts, each with:
        - commodity_id, commodity_name, price_buy, price_sell,
          volume_scu, total_cost, total_revenue, profit, dest_terminal_id
    """
    # Collect all already-assigned commodities (primary + aggregated)
    all_assigned = best.get("_all_commodities", [])
    assigned_cids: set = set()
    assigned_volume = 0
    assigned_cost = 0.0
    for ac in all_assigned:
        assigned_cids.add(ac["commodity_id"])
        assigned_volume += ac["volume_scu"]
        assigned_cost += ac["volume_scu"] * ac["price_buy"]

    # Fallback: if no _all_commodities, use primary only
    if not all_assigned:
        assigned_cids.add(best["commodity_id"])
        assigned_volume = best["volume_scu"]
        assigned_cost = best["volume_scu"] * best["price_buy"]

    remaining_scu = ship_scu - assigned_volume
    remaining_budget = capital - assigned_cost

    if remaining_scu <= 0 or remaining_budget <= 0:
        return []

    origin_tid = best["origin_terminal_id"]
    dest_tid = best["dest_terminal_id"]

    candidates: List[dict] = []

    for item in buyable:
        cid = item["commodity_id"]
        if cid in assigned_cids:
            continue
        if item["origin_terminal_id"] != origin_tid:
            continue
        if item["price_buy"] <= 0:
            continue
        if remaining_budget < item["price_buy"]:
            continue

        destinations = dest_lookup.get(cid, [])
        matching_dest = None
        for dest in destinations:
            if dest["dest_terminal_id"] == dest_tid:
                matching_dest = dest
                break

        if matching_dest is None:
            continue

        price_sell = matching_dest["price_sell"]
        dest_stock = matching_dest.get("scu_sell_stock", 0)
        unit_profit = price_sell - item["price_buy"]
        if unit_profit <= 0:
            continue

        max_by_budget = math.floor(remaining_budget / item["price_buy"]) if item["price_buy"] > 0 else 0
        max_vol = min(item["scu_buy"], max_by_budget, remaining_scu,
                      dest_stock if dest_stock > 0 else remaining_scu)
        if max_vol <= 0:
            continue

        candidates.append({
            "commodity_id": cid,
            "commodity_name": item["commodity_name"],
            "price_buy": item["price_buy"],
            "price_sell": price_sell,
            "max_volume": max_vol,
            "unit_profit": unit_profit,
            "dest_stock": dest_stock,
        })

    candidates.sort(key=lambda c: c["unit_profit"], reverse=True)

    supplements: List[dict] = []
    for cand in candidates:
        if remaining_scu <= 0 or remaining_budget <= 0:
            break
        if len(supplements) >= 4:
            break

        max_by_budget = math.floor(remaining_budget / cand["price_buy"]) if cand["price_buy"] > 0 else 0
        dest_stock = cand["dest_stock"]
        vol = min(cand["max_volume"], max_by_budget, remaining_scu,
                  dest_stock if dest_stock > 0 else remaining_scu)
        if vol <= 0:
            continue

        cost = vol * cand["price_buy"]
        revenue = vol * cand["price_sell"]
        profit = vol * cand["unit_profit"]

        supplements.append({
            "commodity_id": cand["commodity_id"],
            "commodity_name": cand["commodity_name"],
            "price_buy": cand["price_buy"],
            "price_sell": cand["price_sell"],
            "volume_scu": vol,
            "total_cost": cost,
            "total_revenue": revenue,
            "profit": profit,
            "dest_terminal_id": dest_tid,
        })

        remaining_scu -= vol
        remaining_budget -= cost

    return supplements


def _make_leg_dict(leg_idx: int, origin_td: dict, dest_td: dict, best: dict, supplements: List[dict] = None) -> dict:
    """Build a ChainLeg-compatible dict.

    When supplements are provided, builds a commodities list with primary + supplements,
    and aggregates total_cost/total_revenue/profit/volume_scu across all commodities.
    The top-level commodity_name / price_buy / price_sell remain from the primary
    for backward compatibility.
    """
    def _zh(td: dict) -> str:
        return get_terminal_zh(
            td.get("name", ""), td.get("nickname", ""),
            td.get("space_station_name", ""),
            td.get("planet_name", ""), td.get("star_system_name", "")
        )

    dest_system = dest_td.get("star_system_name", "") or ""
    dest_planet = dest_td.get("planet_name", "") or ""

    # Build commodities list if supplements exist
    commodities = None
    if supplements:
        # Primary commodity entry
        primary_entry = {
            "commodity_id": best["commodity_id"],
            "commodity_name": best["commodity_name"],
            "commodity_name_zh": get_commodity_zh(best["commodity_name"]),
            "is_primary": True,
            "price_buy": best["price_buy"],
            "price_sell": best["price_sell"],
            "volume_scu": best["volume_scu"],
            "total_cost": best["volume_scu"] * best["price_buy"],
            "total_revenue": best["volume_scu"] * best["price_sell"],
            "profit": best["volume_scu"] * (best["price_sell"] - best["price_buy"]),
        }
        # Supplement entries
        supplement_entries = []
        for s in supplements:
            supplement_entries.append({
                "commodity_id": s["commodity_id"],
                "commodity_name": s["commodity_name"],
                "commodity_name_zh": get_commodity_zh(s["commodity_name"]),
                "is_primary": False,
                "price_buy": s["price_buy"],
                "price_sell": s["price_sell"],
                "volume_scu": s["volume_scu"],
                "total_cost": s["total_cost"],
                "total_revenue": s["total_revenue"],
                "profit": s["profit"],
            })
        commodities = [primary_entry] + supplement_entries

        # Aggregate totals across all commodities
        agg_volume = sum(c["volume_scu"] for c in commodities)
        agg_cost = sum(c["total_cost"] for c in commodities)
        agg_revenue = sum(c["total_revenue"] for c in commodities)
        agg_profit = sum(c["profit"] for c in commodities)
    else:
        agg_volume = best["volume_scu"]
        agg_cost = best["volume_scu"] * best["price_buy"]
        agg_revenue = best["volume_scu"] * best["price_sell"]
        agg_profit = best["profit"]

    return {
        "leg_index": leg_idx,
        "origin_name": origin_td.get("name", ""),
        "origin_name_zh": _zh(origin_td),
        "commodity_name": best["commodity_name"],
        "commodity_name_zh": get_commodity_zh(best["commodity_name"]),
        "price_buy": best["price_buy"],
        "price_sell": best["price_sell"],
        "volume_scu": agg_volume,
        "total_cost": agg_cost,
        "total_revenue": agg_revenue,
        "profit": agg_profit,
        "destination_name": dest_td.get("name", ""),
        "destination_name_zh": _zh(dest_td),
        "destination_system": dest_system,
        "destination_system_zh": SYSTEM_ZH.get(dest_system, dest_system),
        "destination_planet": dest_planet,
        "destination_planet_zh": PLANET_ZH.get(dest_planet, dest_planet),
        "commodities": commodities,
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
