"""
Trade Chain Planner - Chain route planning for maximum profit.
Iteratively finds the best commodity × destination at each location.
"""
import math
from typing import Dict, List, Optional

from services.uex_api import (
    load_terminals, load_vehicles, get_locations,
    get_all_prices, resolve_terminal, _get_location_key, _build_location_index,
    get_distance, is_systems_connected, get_jump_point,
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
    """Plan a chain of trade routes maximizing total profit across all legs.

    Algorithm (cargo-carrying):
    1. At each location, first SELL any carried cargo at best available prices.
    2. Then BUY new cargo with remaining SCU and capital.
    3. Travel to the destination that maximizes total profit.
    4. Unsold cargo carries forward to the next leg.
    5. Last leg: MUST choose a destination where all remaining cargo can be sold.

    This ensures the entire route is optimized as a whole, not just per-leg.
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

    terminal_prices: Dict[int, List[dict]] = {}
    for p in all_prices:
        tid = p.get("id_terminal", 0)
        if tid:
            terminal_prices.setdefault(tid, []).append(p)

    terminals = load_terminals()
    terminal_map: Dict[int, dict] = {t.get("id"): t for t in terminals}

    dest_lookup = _build_destination_lookup(terminal_prices, terminal_map)
    loc_index = _build_location_index()

    # Step 4: Iterative chain planning with cargo carrying
    legs: List[dict] = []
    current_capital = float(capital)
    carried_cargo: List[dict] = []
    stale_warned = False

    for leg_idx in range(1, max_legs + 1):
        is_last_leg = (leg_idx == max_legs)

        # 4a: Sell carried cargo at current location
        sold_revenue = 0.0
        sold_cost = 0.0
        unsold_cargo: List[dict] = []

        if carried_cargo:
            sold_revenue, sold_cost, unsold_cargo = _sell_cargo_at_location(
                carried_cargo, current_terminal_ids, terminal_prices, terminal_map
            )
            current_capital += sold_revenue - sold_cost

        carried_scu_after_sell = sum(c["volume_scu"] for c in unsold_cargo)

        # 4b: Buy new cargo
        remaining_scu = ship_scu - carried_scu_after_sell
        remaining_budget = current_capital

        buyable = []
        if remaining_scu > 0 and remaining_budget > 0:
            buyable = _scan_buyable(
                current_terminal_ids, terminal_prices, terminal_map,
                remaining_budget, remaining_scu
            )

        # 4c: Find best leg
        if is_last_leg:
            best = _find_best_last_leg(
                buyable, unsold_cargo, dest_lookup, terminal_map,
                ship_scu, current_capital, current_terminal_ids
            )
        else:
            best = _find_best_leg(
                buyable, dest_lookup, terminal_map, remaining_scu, remaining_budget,
                carried_cargo=unsold_cargo, origin_terminal_ids=current_terminal_ids
            )

        if best is None or best.get("profit", 0) <= 0:
            if unsold_cargo:
                warnings.append(f"第 {leg_idx} 段无盈利路线，携带 {carried_scu_after_sell} SCU 货物结束")
            else:
                return _build_response(
                    legs, capital, current_capital,
                    f"第 {leg_idx} 段无盈利路线，链式规划提前结束",
                    warnings
                )
            break

        # 4d: Find supplementary commodities
        if not is_last_leg and remaining_scu > 0:
            supplements = _find_supplement_commodities(
                buyable, best, dest_lookup, terminal_map, remaining_scu, remaining_budget
            )
        else:
            supplements = []

        # 4e: Build leg record
        dest_td = terminal_map.get(best["dest_terminal_id"], {})
        origin_td = terminal_map.get(best["origin_terminal_id"], {})
        leg = _make_leg_dict(leg_idx, origin_td, dest_td, best, supplements)

        # Add carried-cargo info
        if sold_revenue > 0:
            leg["carried_sold_revenue"] = round(sold_revenue, 2)
            leg["carried_sold_cost"] = round(sold_cost, 2)
            leg["carried_profit"] = round(sold_revenue - sold_cost, 2)
            leg["profit"] = round(leg["profit"] + sold_revenue - sold_cost, 2)
            leg["total_revenue"] = round(leg["total_revenue"] + sold_revenue, 2)

        legs.append(leg)

        # 4f: Update capital for next leg
        new_cost = sum(ac["volume_scu"] * ac["price_buy"] for ac in best.get("_all_commodities", []))
        new_revenue = sum(ac["volume_scu"] * ac["price_sell"] for ac in best.get("_all_commodities", []))
        supp_cost = sum(s["volume_scu"] * s["price_buy"] for s in supplements)
        supp_revenue = sum(s["volume_scu"] * s["price_sell"] for s in supplements)
        current_capital += (new_revenue - new_cost) + (supp_revenue - supp_cost)

        # 4g: Build carried cargo for next leg
        new_purchases = []
        for ac in best.get("_all_commodities", []):
            new_purchases.append({
                "commodity_id": ac["commodity_id"],
                "commodity_name": ac["commodity_name"],
                "volume_scu": ac["volume_scu"],
                "price_buy": ac["price_buy"],
            })
        for s in supplements:
            new_purchases.append({
                "commodity_id": s["commodity_id"],
                "commodity_name": s["commodity_name"],
                "volume_scu": s["volume_scu"],
                "price_buy": s["price_buy"],
            })

        carried_cargo = [] if is_last_leg else (unsold_cargo + new_purchases)

        # Next origin = destination's location
        dest_location_key = _get_location_key(dest_td)
        current_terminal_ids = loc_index.get(dest_location_key, [best["dest_terminal_id"]])

    # Step 5: Auto-append liquidation leg if cargo remains
    if carried_cargo:
        liquidation_leg = _build_liquidation_leg(
            len(legs) + 1, carried_cargo, current_terminal_ids,
            terminal_prices, terminal_map, dest_lookup, ship_scu
        )
        if liquidation_leg:
            legs.append(liquidation_leg)
            # Update capital from liquidation
            current_capital += liquidation_leg.get("profit", 0)

    return _build_response(legs, capital, current_capital, None, warnings)


def _build_liquidation_leg(
    leg_idx: int,
    carried_cargo: List[dict],
    current_terminal_ids: List[int],
    terminal_prices: Dict[int, List[dict]],
    terminal_map: Dict[int, dict],
    dest_lookup: Dict[int, List[dict]],
    ship_scu: int,
) -> Optional[dict]:
    """Build a liquidation leg: sell all carried cargo at the best destination.

    No new purchases. Only sells existing cargo to clear the hold.
    """
    # Find best destination for carried cargo
    best_dest_loc = None
    best_profit = 0
    best_assigned = []

    # Group carried cargo by commodity
    cargo_by_cid: Dict[int, dict] = {}
    for c in carried_cargo:
        cid = c["commodity_id"]
        if cid in cargo_by_cid:
            cargo_by_cid[cid]["volume_scu"] += c["volume_scu"]
        else:
            cargo_by_cid[cid] = dict(c)

    # Resolve origin system for connectivity check
    origin_system = ""
    if current_terminal_ids:
        origin_td = terminal_map.get(current_terminal_ids[0], {})
        origin_system = (origin_td.get("star_system_name") or "").lower().strip()

    # Find destinations that can sell carried cargo
    dest_options: Dict[str, dict] = {}
    for cid, cargo in cargo_by_cid.items():
        destinations = dest_lookup.get(cid, [])
        for dest in destinations:
            dest_tid = dest["dest_terminal_id"]
            if dest_tid in current_terminal_ids:
                continue
            dest_loc = dest.get("dest_location_key", "")
            price_sell = dest["price_sell"]
            if price_sell <= cargo["price_buy"]:
                continue
            dest_stock = dest.get("scu_sell_stock", 0)
            sellable = cargo["volume_scu"] if dest_stock == 0 else min(cargo["volume_scu"], dest_stock)
            if sellable <= 0:
                continue

            # Skip unreachable systems
            dest_td = terminal_map.get(dest_tid, {})
            dest_system = (dest_td.get("star_system_name") or "").lower().strip()
            if origin_system and dest_system and origin_system != dest_system:
                if not is_systems_connected(origin_system, dest_system):
                    continue

            if dest_loc not in dest_options:
                dest_options[dest_loc] = {
                    "dest_terminal_id": dest_tid,
                    "dest_location_key": dest_loc,
                    "assigned": [],
                    "total_profit": 0,
                }
            do = dest_options[dest_loc]
            profit = sellable * (price_sell - cargo["price_buy"])
            do["assigned"].append({
                "origin_terminal_id": current_terminal_ids[0] if current_terminal_ids else 0,
                "dest_terminal_id": dest_tid,
                "dest_location_key": dest_loc,
                "commodity_id": cid,
                "commodity_name": cargo["commodity_name"],
                "price_buy": cargo["price_buy"],
                "price_sell": price_sell,
                "volume_scu": sellable,
                "profit": profit,
                "status_buy": 0,
            })
            do["total_profit"] += profit

    if not dest_options:
        return None

    # Pick destination with highest total profit
    for dest_loc, do in dest_options.items():
        if do["total_profit"] > best_profit:
            best_profit = do["total_profit"]
            best_dest_loc = dest_loc
            best_assigned = do["assigned"]

    if not best_assigned:
        return None

    best_assigned.sort(key=lambda a: a["profit"], reverse=True)
    primary = best_assigned[0]
    dest_td = terminal_map.get(primary["dest_terminal_id"], {})

    agg_volume = sum(a["volume_scu"] for a in best_assigned)
    agg_cost = sum(a["volume_scu"] * a["price_buy"] for a in best_assigned)
    agg_revenue = sum(a["volume_scu"] * a["price_sell"] for a in best_assigned)
    agg_profit = sum(a["profit"] for a in best_assigned)

    commodities = []
    for a in best_assigned:
        commodities.append({
            "commodity_id": a["commodity_id"],
            "commodity_name": a["commodity_name"],
            "commodity_name_zh": get_commodity_zh(a["commodity_name"]),
            "is_primary": a["commodity_id"] == primary["commodity_id"],
            "price_buy": a["price_buy"],
            "price_sell": a["price_sell"],
            "volume_scu": a["volume_scu"],
            "total_cost": a["volume_scu"] * a["price_buy"],
            "total_revenue": a["volume_scu"] * a["price_sell"],
            "profit": a["profit"],
        })

    def _zh(td: dict) -> str:
        return get_terminal_zh(
            td.get("name", ""), td.get("nickname", ""),
            td.get("space_station_name", ""),
            td.get("planet_name", ""), td.get("star_system_name", "")
        )

    return {
        "leg_index": leg_idx,
        "origin_name": "",
        "origin_name_zh": "清仓路线",
        "commodity_name": primary["commodity_name"],
        "commodity_name_zh": get_commodity_zh(primary["commodity_name"]),
        "price_buy": primary["price_buy"],
        "price_sell": primary["price_sell"],
        "volume_scu": agg_volume,
        "total_cost": agg_cost,
        "total_revenue": agg_revenue,
        "profit": agg_profit,
        "destination_name": dest_td.get("name", ""),
        "destination_name_zh": _zh(dest_td),
        "destination_system": dest_td.get("star_system_name", "") or "",
        "destination_system_zh": SYSTEM_ZH.get(dest_td.get("star_system_name", "") or "", dest_td.get("star_system_name", "") or ""),
        "destination_planet": dest_td.get("planet_name", "") or "",
        "destination_planet_zh": PLANET_ZH.get(dest_td.get("planet_name", "") or "", dest_td.get("planet_name", "") or ""),
        "commodities": commodities,
        "is_liquidation": True,
    }


def _sell_cargo_at_location(
    carried_cargo: List[dict],
    terminal_ids: List[int],
    terminal_prices: Dict[int, List[dict]],
    terminal_map: Dict[int, dict],
) -> tuple:
    """Sell carried cargo at the current location terminals.

    Returns (total_revenue, total_cost, unsold_cargo).
    """
    sold_revenue = 0.0
    sold_cost = 0.0
    unsold_cargo: List[dict] = []

    for cargo in carried_cargo:
        cid = cargo["commodity_id"]
        vol = cargo["volume_scu"]
        buy_price = cargo["price_buy"]
        best_sell_price = 0

        for tid in terminal_ids:
            prices = terminal_prices.get(tid, [])
            for p in prices:
                if p.get("id_commodity") == cid:
                    sp = p.get("price_sell", 0)
                    stock = p.get("scu_sell_stock", 0)
                    status = p.get("status_sell", 99)
                    if sp > 0 and status <= 7:
                        if sp > best_sell_price:
                            best_sell_price = sp

        if best_sell_price > buy_price:
            sold_revenue += vol * best_sell_price
            sold_cost += vol * buy_price
        else:
            unsold_cargo.append(cargo)

    return sold_revenue, sold_cost, unsold_cargo


def _find_best_last_leg(
    buyable: List[dict],
    carried_cargo: List[dict],
    dest_lookup: Dict[int, List[dict]],
    terminal_map: Dict[int, dict],
    ship_scu: int,
    capital: float,
    origin_terminal_ids: List[int],
) -> Optional[dict]:
    """Find the best last-leg destination that can sell ALL carried cargo + new purchases."""
    if not carried_cargo and not buyable:
        return None

    carried_cids = {c["commodity_id"] for c in carried_cargo}
    carried_scu = sum(c["volume_scu"] for c in carried_cargo)

    # Resolve origin system for connectivity check
    origin_system = ""
    if origin_terminal_ids:
        origin_td = terminal_map.get(origin_terminal_ids[0], {})
        origin_system = (origin_td.get("star_system_name") or "").lower().strip()

    # Find destinations that can sell carried cargo
    dest_carry_capacity: Dict[str, dict] = {}
    for cargo in carried_cargo:
        cid = cargo["commodity_id"]
        vol = cargo["volume_scu"]
        destinations = dest_lookup.get(cid, [])
        for dest in destinations:
            dest_tid = dest["dest_terminal_id"]
            if dest_tid in origin_terminal_ids:
                continue
            dest_loc = dest.get("dest_location_key", "")
            price_sell = dest["price_sell"]
            if price_sell <= 0:
                continue

            # Skip unreachable systems
            dest_td = terminal_map.get(dest_tid, {})
            dest_system = (dest_td.get("star_system_name") or "").lower().strip()
            if origin_system and dest_system and origin_system != dest_system:
                if not is_systems_connected(origin_system, dest_system):
                    continue

            if dest_loc not in dest_carry_capacity:
                dest_carry_capacity[dest_loc] = {
                    "dest_terminal_id": dest_tid,
                    "dest_location_key": dest_loc,
                    "carry_profit": 0,
                    "carry_scu_sold": 0,
                }
            dc = dest_carry_capacity[dest_loc]
            dest_stock = dest.get("scu_sell_stock", 0)
            sellable = vol if dest_stock == 0 else min(vol, dest_stock)
            profit = sellable * (price_sell - cargo["price_buy"])
            dc["carry_profit"] += profit
            dc["carry_scu_sold"] += sellable

    if not dest_carry_capacity:
        if buyable:
            return _find_best_leg(buyable, dest_lookup, terminal_map, ship_scu, capital,
                                  origin_terminal_ids=origin_terminal_ids)
        return None

    # For each destination that can sell carried cargo, also try buying new cargo
    best_dest = None
    best_total_profit = 0
    best_assigned = []

    for dest_loc, dc_info in dest_carry_capacity.items():
        dest_tid = dc_info["dest_terminal_id"]

        remaining_scu = ship_scu - carried_scu
        remaining_budget = capital

        dest_candidates = []
        for item in buyable:
            cid = item["commodity_id"]
            if cid in carried_cids:
                continue
            price_buy = item["price_buy"]
            if price_buy <= 0 or remaining_budget < price_buy:
                continue

            destinations = dest_lookup.get(cid, [])
            for dest in destinations:
                if dest.get("dest_location_key") != dest_loc:
                    continue
                if dest["dest_terminal_id"] in origin_terminal_ids:
                    continue
                price_sell = dest["price_sell"]
                if price_sell <= price_buy:
                    continue
                dest_stock = dest.get("scu_sell_stock", 0)
                unit_profit = price_sell - price_buy
                max_by_budget = math.floor(remaining_budget / price_buy) if price_buy > 0 else 0
                vol = min(item["scu_buy"], max_by_budget, remaining_scu,
                          dest_stock if dest_stock > 0 else remaining_scu)
                if vol > 0:
                    dest_candidates.append({
                        "commodity_id": cid,
                        "commodity_name": item["commodity_name"],
                        "price_buy": price_buy,
                        "price_sell": price_sell,
                        "volume_scu": vol,
                        "profit": vol * unit_profit,
                        "origin_terminal_id": item["origin_terminal_id"],
                        "dest_terminal_id": dest_tid,
                        "dest_location_key": dest_loc,
                    })
                    break

        dest_candidates.sort(key=lambda c: c["profit"] / c["volume_scu"] if c["volume_scu"] > 0 else 0, reverse=True)

        r_scu = remaining_scu
        r_budget = remaining_budget
        new_assigned = []
        total_new_profit = 0
        for c in dest_candidates:
            if r_scu <= 0 or r_budget <= 0:
                break
            vol = min(c["volume_scu"], math.floor(r_budget / c["price_buy"]) if c["price_buy"] > 0 else 0, r_scu)
            if vol <= 0:
                continue
            c["volume_scu"] = vol
            c["profit"] = vol * (c["price_sell"] - c["price_buy"])
            new_assigned.append(c)
            total_new_profit += c["profit"]
            r_scu -= vol
            r_budget -= vol * c["price_buy"]

        total_profit = dc_info["carry_profit"] + total_new_profit

        if total_profit > best_total_profit:
            best_total_profit = total_profit
            best_dest = dest_loc
            carry_assigned = []
            for cargo in carried_cargo:
                cid = cargo["commodity_id"]
                for d in dest_lookup.get(cid, []):
                    if d.get("dest_location_key") == dest_loc and d["dest_terminal_id"] not in origin_terminal_ids:
                        sellable = cargo["volume_scu"] if d["scu_sell_stock"] == 0 else min(cargo["volume_scu"], d["scu_sell_stock"])
                        carry_assigned.append({
                            "origin_terminal_id": origin_terminal_ids[0] if origin_terminal_ids else 0,
                            "dest_terminal_id": d["dest_terminal_id"],
                            "dest_location_key": dest_loc,
                            "commodity_id": cid,
                            "commodity_name": cargo["commodity_name"],
                            "price_buy": cargo["price_buy"],
                            "price_sell": d["price_sell"],
                            "volume_scu": sellable,
                            "profit": sellable * (d["price_sell"] - cargo["price_buy"]),
                            "status_buy": 0,
                        })
                        break
            best_assigned = carry_assigned + new_assigned

    if best_dest is None or not best_assigned:
        return None

    best_assigned.sort(key=lambda a: a["profit"], reverse=True)
    primary = best_assigned[0]

    return {
        "origin_terminal_id": primary["origin_terminal_id"],
        "dest_terminal_id": primary["dest_terminal_id"],
        "dest_location_key": best_dest,
        "commodity_id": primary["commodity_id"],
        "commodity_name": primary["commodity_name"],
        "price_buy": primary["price_buy"],
        "price_sell": primary["price_sell"],
        "volume_scu": primary["volume_scu"],
        "profit": primary["profit"],
        "_all_commodities": best_assigned,
    }


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

    # Try by name match (location name or location name_zh)
    if location_name:
        q = location_name.lower().strip()
        for loc in locations:
            if q in loc.get("location_name", "").lower() or q in loc.get("location_name_zh", "").lower():
                return loc.get("terminal_ids", [])

    # Fallback: search terminal names directly (e.g. "IO北塔" is a terminal, not a location)
    if location_name:
        terminals = load_terminals()
        q = location_name.lower().strip()
        matched_tids = []
        for t in terminals:
            tname = (t.get("name") or "").lower()
            tname_zh = (t.get("name_zh") or "").lower()
            if q in tname or q in tname_zh:
                matched_tids.append(t.get("id"))
        if matched_tids:
            return matched_tids

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
        dest_loc_key = _get_location_key(td)
        for p in prices:
            cid = p.get("id_commodity", 0)
            if not cid:
                continue
            price_sell = p.get("price_sell")
            scu_sell_stock = p.get("scu_sell_stock", 0)
            status_sell = p.get("status_sell", 99)
            if not price_sell or price_sell <= 0 or status_sell > 7:
                continue
            lookup.setdefault(cid, []).append({
                "dest_terminal_id": tid,
                "dest_location_key": dest_loc_key,
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
    carried_cargo: List[dict] = None,
    origin_terminal_ids: List[int] = None,
) -> Optional[dict]:
    """Find the best leg by aggregating multi-commodity combos per destination location.

    When carried_cargo is provided, the destination selection also considers
    profit from selling carried cargo at each destination.
    """
    # Step 1: Build candidate pairs (commodity x destination)
    # Group by dest_location_key to aggregate commodities sold at different
    # terminals within the same destination location
    candidates_by_dest: Dict[str, List[dict]] = {}

    for item in buyable:
        cid = item["commodity_id"]
        price_buy = item["price_buy"]
        origin_tid = item["origin_terminal_id"]
        status_buy = item.get("status_buy", 99)

        max_by_capital = math.floor(capital / price_buy) if price_buy > 0 else 0
        max_buy = min(item["scu_buy"], max_by_capital, ship_scu)
        if max_buy <= 0:
            continue

        destinations = dest_lookup.get(cid, [])

        # For each destination, find the terminal with best sell price
        best_per_dest: Dict[str, dict] = {}
        for dest in destinations:
            dest_tid = dest["dest_terminal_id"]
            if dest_tid == origin_tid:
                continue
            price_sell = dest["price_sell"]
            if price_sell <= price_buy:
                continue
            dest_loc = dest["dest_location_key"]
            # Keep best sell price per destination location
            if dest_loc not in best_per_dest or price_sell > best_per_dest[dest_loc]["price_sell"]:
                best_per_dest[dest_loc] = {
                    "dest_terminal_id": dest_tid,
                    "dest_location_key": dest_loc,
                    "price_sell": price_sell,
                    "scu_sell_stock": dest.get("scu_sell_stock", 0),
                }

        for dest_loc, dest_info in best_per_dest.items():
            unit_profit = dest_info["price_sell"] - price_buy
            if unit_profit <= 0:
                continue

            effective_factor = 0.9 if status_buy > 5 else 1.0

            candidates_by_dest.setdefault(dest_loc, []).append({
                "origin_terminal_id": origin_tid,
                "dest_terminal_id": dest_info["dest_terminal_id"],
                "dest_location_key": dest_loc,
                "commodity_id": cid,
                "commodity_name": item["commodity_name"],
                "price_buy": price_buy,
                "price_sell": dest_info["price_sell"],
                "max_buyable": max_buy,
                "scu_sell_stock": dest_info["scu_sell_stock"],
                "unit_profit": unit_profit,
                "effective_factor": effective_factor,
                "status_buy": status_buy,
            })

    if not candidates_by_dest:
        return None

    # Resolve origin system for jump point connectivity check
    origin_system = ""
    if origin_terminal_ids:
        origin_td = terminal_map.get(origin_terminal_ids[0], {})
        origin_system = (origin_td.get("star_system_name") or "").lower().strip()

    # Step 2 & 3: For each destination location, greedily assign cargo
    best_dest_loc = None
    best_score = -1
    best_total_real_profit = 0
    best_total_distance = 99999

    # Profit proximity threshold: destinations within 15% of best profit
    # are considered "similar profit" — distance breaks the tie
    PROXIMITY_RATIO = 0.85

    for dest_loc, cands in candidates_by_dest.items():
        # Skip destinations in unreachable systems (no jump point connection)
        first_dest_td = terminal_map.get(cands[0]["dest_terminal_id"], {})
        dest_system = (first_dest_td.get("star_system_name") or "").lower().strip()
        if origin_system and dest_system and origin_system != dest_system:
            if not is_systems_connected(origin_system, dest_system):
                continue
        cands.sort(key=lambda c: c["unit_profit"], reverse=True)

        remaining_scu = ship_scu
        remaining_budget = capital
        dest_assigned = []
        total_effective = 0
        total_real_profit = 0
        seen_cids: set = set()

        for c in cands:
            if remaining_scu <= 0 or remaining_budget <= 0:
                break
            # Deduplicate: same commodity at same destination location
            if c["commodity_id"] in seen_cids:
                continue
            seen_cids.add(c["commodity_id"])

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
                "dest_terminal_id": c["dest_terminal_id"],
                "dest_location_key": dest_loc,
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

        # Add profit from selling carried cargo at this destination
        carried_profit = 0
        if carried_cargo and origin_terminal_ids:
            for cargo in carried_cargo:
                cid = cargo["commodity_id"]
                for d in dest_lookup.get(cid, []):
                    if d.get("dest_location_key") == dest_loc and d["dest_terminal_id"] not in origin_terminal_ids:
                        sp = d["price_sell"]
                        if sp > cargo["price_buy"]:
                            dest_stock = d.get("scu_sell_stock", 0)
                            sellable = cargo["volume_scu"] if dest_stock == 0 else min(cargo["volume_scu"], dest_stock)
                            carried_profit += sellable * (sp - cargo["price_buy"])
                        break

        total_effective_with_carry = total_effective + carried_profit

        # Distance-aware scoring: get distance from origin to destination
        origin_tid = origin_terminal_ids[0] if origin_terminal_ids else 0
        dest_tid_for_dist = dest_assigned[0]["dest_terminal_id"] if dest_assigned else 0
        dist = get_distance(origin_tid, dest_tid_for_dist)
        if dist is None:
            dist = 60  # fallback

        # Add jump point travel penalty for cross-system travel
        if origin_system and dest_system and origin_system != dest_system:
            jp = get_jump_point(origin_system, dest_system)
            if jp:
                fuel_penalty = int((jp.get("fuel_cost", 0) or 0) * 100)
                dist += fuel_penalty

        # Score = effective profit, with distance penalty for similar-profit destinations
        score = total_effective_with_carry
        if total_effective_with_carry > 0 and best_score > 0:
            # If this destination's profit is within PROXIMITY_RATIO of best,
            # apply distance-based tiebreaker
            if total_effective_with_carry >= best_score * PROXIMITY_RATIO:
                # Prefer closer destination: reduce score slightly for distance
                # Normalize: every 20 AU costs 1% of profit as penalty
                distance_penalty = dist * 0.005
                score = total_effective_with_carry * (1 - distance_penalty)

        if score > best_score or (
            score == best_score and total_real_profit > best_total_real_profit
        ):
            best_score = score
            best_total_real_profit = total_real_profit
            best_total_distance = dist
            best_dest_loc = dest_loc
            best_assigned = dest_assigned

    if best_dest_loc is None or not best_assigned:
        return None

    # Build result: primary is the highest unit-profit commodity
    best_assigned.sort(key=lambda a: a["unit_profit"] if "unit_profit" in a else (a["price_sell"] - a["price_buy"]), reverse=True)
    primary = best_assigned[0]

    return {
        "origin_terminal_id": primary["origin_terminal_id"],
        "dest_terminal_id": primary["dest_terminal_id"],
        "dest_location_key": best_dest_loc,
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
    dest_loc_key = best.get("dest_location_key", "")
    dest_tid = best["dest_terminal_id"]

    candidates: List[dict] = []

    for item in buyable:
        cid = item["commodity_id"]
        if cid in assigned_cids:
            continue
        if item["price_buy"] <= 0:
            continue
        if remaining_budget < item["price_buy"]:
            continue

        destinations = dest_lookup.get(cid, [])
        matching_dest = None
        for dest in destinations:
            if dest.get("dest_location_key") == dest_loc_key:
                if matching_dest is None or dest["price_sell"] > matching_dest["price_sell"]:
                    matching_dest = dest

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
        if len(supplements) >= 10:
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

    Builds a commodities list from _all_commodities (multi-commodity aggregation)
    combined with supplements. Aggregates total_cost/total_revenue/profit/volume_scu
    across all commodities. The top-level commodity_name / price_buy / price_sell
    remain from the primary for backward compatibility.
    """
    def _zh(td: dict) -> str:
        return get_terminal_zh(
            td.get("name", ""), td.get("nickname", ""),
            td.get("space_station_name", ""),
            td.get("planet_name", ""), td.get("star_system_name", "")
        )

    dest_system = dest_td.get("star_system_name", "") or ""
    dest_planet = dest_td.get("planet_name", "") or ""

    # Get distance between origin and destination
    origin_tid = best.get("origin_terminal_id", 0)
    dest_tid = best.get("dest_terminal_id", 0)
    distance = get_distance(origin_tid, dest_tid)

    # Build commodities list from _all_commodities (aggregated by _find_best_leg)
    all_commodities = best.get("_all_commodities", [])
    commodities = None

    if all_commodities or supplements:
        entries = []
        seen_ids = set()

        # Add all commodities from _find_best_leg aggregation
        for ac in all_commodities:
            cid = ac["commodity_id"]
            if cid in seen_ids:
                continue
            seen_ids.add(cid)
            unit_profit = ac.get("price_sell", 0) - ac.get("price_buy", 0)
            entries.append({
                "commodity_id": cid,
                "commodity_name": ac["commodity_name"],
                "commodity_name_zh": get_commodity_zh(ac["commodity_name"]),
                "is_primary": cid == best["commodity_id"],
                "price_buy": ac["price_buy"],
                "price_sell": ac["price_sell"],
                "volume_scu": ac["volume_scu"],
                "total_cost": ac["volume_scu"] * ac["price_buy"],
                "total_revenue": ac["volume_scu"] * ac["price_sell"],
                "profit": ac.get("profit", ac["volume_scu"] * unit_profit),
            })

        # Add supplement entries (skip if already in all_commodities)
        if supplements:
            for s in supplements:
                if s["commodity_id"] in seen_ids:
                    continue
                seen_ids.add(s["commodity_id"])
                entries.append({
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

        # Sort: primary first, then by profit descending
        entries.sort(key=lambda e: (not e["is_primary"], -e["profit"]))
        commodities = entries if entries else None

        # Aggregate totals across all commodities
        agg_volume = sum(c["volume_scu"] for c in (commodities or []))
        agg_cost = sum(c["total_cost"] for c in (commodities or []))
        agg_revenue = sum(c["total_revenue"] for c in (commodities or []))
        agg_profit = sum(c["profit"] for c in (commodities or []))
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
        "distance": distance,
        "commodities": commodities,
    }


def _empty_response(warnings: List[str], early_stop_reason: str) -> dict:
    """Build an empty chain response with an early stop reason."""
    return {
        "legs": [],
        "total_profit": 0,
        "final_capital": 0,
        "total_legs": 0,
        "total_distance": 0,
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
    total_distance = sum(leg.get("distance_km", 0) for leg in legs)
    return {
        "legs": legs,
        "total_profit": round(total_profit, 2),
        "final_capital": round(current_capital, 2),
        "total_legs": len(legs),
        "total_distance": round(total_distance, 0),
        "early_stop_reason": early_stop_reason,
        "warnings": warnings,
    }
