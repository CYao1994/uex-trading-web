"""
Route Planner - Core trading route optimization algorithms
"""
from typing import Dict, List, Optional, Tuple
from services.uex_api import (
    search_terminal, search_commodity, get_commodity_prices,
    resolve_terminal, build_distance_matrix, get_distance,
    fetch_routes_from_terminal,
)
from services.cache import distance_cache
from services.data_mapper import get_terminal_zh, get_commodity_zh, format_location_zh, SYSTEM_ZH, PLANET_ZH


def plan_buy_route(origin: str, items: List[Dict], refresh: bool = False) -> Dict:
    """
    Plan buy route: find best sellers and optimize by distance/cost.

    Same logic as sell route, but looks at price_sell (terminal selling price)
    instead of price_buy (terminal buying price).

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

    # Step 1: Find best sellers for each commodity
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
            warnings.append(f"{zh_name}({name}): 未找到商品")
            continue

        comm_id = comm["id"]
        comm_name = comm.get("name", name)
        zh_name = get_commodity_zh(comm_name)

        try:
            prices = get_commodity_prices(comm_id, refresh=refresh)
        except Exception as e:
            warnings.append(f"{zh_name}({comm_name}): 价格查询失败 - {e}")
            continue

        # Find sellers (price_sell > 0) — terminals that SELL this commodity to you
        sellers = []
        for p in prices:
            ps = p.get("price_sell", 0) or 0
            tid = p.get("id_terminal", 0)
            scu = p.get("scu_sell_stock", 0) or 0   # scu_sell_stock = current stock
            if ps > 0:
                sellers.append({"tid": tid, "price_sell": ps, "scu_sell": scu})

        if not sellers:
            warnings.append(f"{zh_name}({comm_name}): UEX 无出售价数据")
            continue

        # Deduplicate by location, keep lowest price (cheapest)
        best_per_loc = {}
        for s in sellers:
            td = resolve_terminal(s["tid"])
            tname = td.get("name", "")
            sys_name = td.get("star_system_name", "")
            loc_key = f"{tname}|{sys_name}"
            if loc_key not in best_per_loc or s["price_sell"] < best_per_loc[loc_key]["price_sell"]:
                best_per_loc[loc_key] = {**s, "terminal_info": td}

        # Sort by price_sell ascending (cheapest first)
        sorted_sellers = sorted(best_per_loc.values(), key=lambda x: x["price_sell"])

        # Check stock availability
        best_stock = sorted_sellers[0].get("scu_sell", 0) if sorted_sellers else 0
        if best_stock > 0 and best_stock < qty:
            warnings.append(f"{zh_name}({comm_name}): 最佳站点库存仅 {best_stock} SCU，需求 {qty} SCU")

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

    # Step 2: Commodity summary (cheapest price per commodity)
    commodity_summary = []
    for r in buyable_results:
        best = r["sellers"][0]
        td = best["terminal_info"]
        commodity_summary.append({
            "name": r["name"],
            "name_zh": r["name_zh"],
            "quantity": r["quantity"],
            "best_price": best["price_sell"],
            "best_revenue": best["price_sell"] * r["quantity"],
            "scu_sell": best.get("scu_sell", 0),
            "best_terminal": format_location_zh(
                td.get("name") or "", td.get("nickname") or "",
                td.get("space_station_name") or "",
                td.get("planet_name") or "", td.get("star_system_name") or ""
            ),
        })

    # Step 3: Find origin terminal
    origin_terminal = search_terminal(origin)
    origin_tid = origin_terminal.get("id") if origin_terminal else None
    origin_system = (origin_terminal.get("star_system_name") or "") if origin_terminal else ""

    # Step 4: Build terminal-commodity map
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
               s["price_sell"] < terminal_sell_map[tid]["commodities"][r["name"]]["price_sell"]:
                terminal_sell_map[tid]["commodities"][r["name"]] = {
                    "price_sell": s["price_sell"],
                    "scu_sell": s.get("scu_sell", 0),
                    "quantity": r["quantity"],
                    "name_zh": r["name_zh"],
                    "revenue": s["price_sell"] * r["quantity"],
                }

    # Step 5: Build distance matrix
    candidate_tids = list(terminal_sell_map.keys())
    dist_matrix = {}
    if origin_tid:
        dist_matrix = build_distance_matrix(origin_tid, candidate_tids, refresh=refresh)

    # Step 6: Nearest-neighbor greedy route (shortest distance)
    shortest_route = []
    shortest_total_distance = 0
    shortest_total_revenue = 0

    if origin_tid and dist_matrix:
        remaining = {r["name"]: {"name_zh": r["name_zh"], "quantity": r["quantity"]} for r in buyable_results}
        current_tid = origin_tid
        current_system = origin_system

        while remaining:
            if not distance_cache.is_queried(current_tid) and current_tid != origin_tid:
                fetch_routes_from_terminal(current_tid, refresh=refresh)
                for (ot, dt), dist in distance_cache._distances.items():
                    if ot == current_tid or dt == current_tid:
                        dist_matrix[(ot, dt)] = dist
                        dist_matrix[(dt, ot)] = dist

            best_stop = None
            best_score = -1
            best_stop_distance = 0
            best_stop_items = []
            best_stop_tid = None

            for tid, tinfo in terminal_sell_map.items():
                stop_cost = 0
                stop_items = []
                for comm_name, comm_info in tinfo["commodities"].items():
                    if comm_name in remaining:
                        stop_cost += comm_info["revenue"]
                        stop_items.append((comm_name, comm_info))

                if not stop_items:
                    continue

                d = dist_matrix.get((current_tid, tid))
                if d is None:
                    d = dist_matrix.get((tid, current_tid))
                if d is None:
                    d = get_distance(current_tid, tid)

                if d is None:
                    dest_sys = tinfo.get("star_system", "")
                    cur_sys = terminal_sell_map.get(current_tid, {}).get("star_system", current_system)
                    d = 50 if dest_sys == cur_sys else 100

                score = stop_cost / (d + 1)
                if score > best_score:
                    best_score = score
                    best_stop = tinfo
                    best_stop_distance = d
                    best_stop_items = stop_items
                    best_stop_tid = tid

            if not best_stop:
                break

            commodities_bought = []
            for comm_name, comm_info in best_stop_items:
                commodities_bought.append({
                    "name": comm_name,
                    "name_zh": comm_info["name_zh"],
                    "quantity": comm_info["quantity"],
                    "price_per_scu": comm_info["price_sell"],
                    "revenue": comm_info["revenue"],
                    "scu_sell": comm_info.get("scu_sell", 0),
                })

            shortest_total_revenue += sum(c["revenue"] for c in commodities_bought)
            if best_stop_distance < 9999:
                shortest_total_distance += best_stop_distance

            shortest_route.append({
                "terminal_id": best_stop_tid,
                "terminal_name": best_stop["terminal_name"],
                "terminal_name_zh": best_stop["zh_loc"],
                "system": best_stop["star_system"],
                "system_zh": SYSTEM_ZH.get(best_stop["star_system"], best_stop["star_system"]),
                "planet": best_stop["planet"] or "",
                "planet_zh": PLANET_ZH.get(best_stop["planet"] or "", best_stop["planet"] or ""),
                "distance_from_prev": best_stop_distance if best_stop_distance < 9999 else None,
                "cumulative_distance": shortest_total_distance,
                "commodities_sold": commodities_bought,
                "stop_revenue": sum(c["revenue"] for c in commodities_bought),
            })

            current_tid = best_stop_tid
            for comm_name, _ in best_stop_items:
                if comm_name in remaining:
                    del remaining[comm_name]

    # Step 7: Cheapest route (each commodity to its cheapest seller)
    max_profit_route = []
    max_profit_total_revenue = 0
    max_profit_total_distance = None
    prev_tid = origin_tid

    for r in buyable_results:
        best = r["sellers"][0]
        td = best["terminal_info"]
        stop_cost = best["price_sell"] * r["quantity"]

        d = None
        if prev_tid:
            d = get_distance(prev_tid, best["tid"])

        if max_profit_total_distance is None and d is not None:
            max_profit_total_distance = 0
        if d is not None and max_profit_total_distance is not None:
            max_profit_total_distance += d

        max_profit_total_revenue += stop_cost

        max_profit_route.append({
            "terminal_id": best["tid"],
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
            "commodities_sold": [{
                "name": r["name"],
                "name_zh": r["name_zh"],
                "quantity": r["quantity"],
                "price_per_scu": best["price_sell"],
                "revenue": stop_cost,
                "scu_sell": best.get("scu_sell", 0),
            }],
            "stop_revenue": stop_cost,
        })
        prev_tid = best["tid"]

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


def plan_sell_route(origin: str, items: List[Dict], refresh: bool = False) -> Dict:
    """
    Plan sell route: find best buyers and optimize by distance.

    Args:
        origin: Origin terminal name (Chinese or English)
        items: [{"name": "Tungsten", "quantity": 16}, ...]

    Returns:
        Dict with commodity_summary, shortest_route, max_profit_route, warnings
    """
    warnings = []
    sellable_results = []

    # Step 1: Find best buyers for each commodity
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
            warnings.append(f"{zh_name}({name}): 未找到商品")
            continue

        comm_id = comm["id"]
        comm_name = comm.get("name", name)
        zh_name = get_commodity_zh(comm_name)

        try:
            prices = get_commodity_prices(comm_id, refresh=refresh)
        except Exception as e:
            warnings.append(f"{zh_name}({comm_name}): 价格查询失败 - {e}")
            continue

        # Find buyers (price_buy > 0)
        buyers = []
        for p in prices:
            pb = p.get("price_buy", 0) or 0
            tid = p.get("id_terminal", 0)
            scu = p.get("scu_buy", 0) or 0
            if pb > 0:
                buyers.append({"tid": tid, "price_buy": pb, "scu_buy": scu})

        if not buyers:
            warnings.append(f"{zh_name}({comm_name}): UEX 无收购价数据，建议去就近 Admin 终端")
            continue

        # Deduplicate by location, keep highest price
        best_per_loc = {}
        for b in buyers:
            td = resolve_terminal(b["tid"])
            tname = td.get("name", "")
            sys_name = td.get("star_system_name", "")
            loc_key = f"{tname}|{sys_name}"
            if loc_key not in best_per_loc or b["price_buy"] > best_per_loc[loc_key]["price_buy"]:
                best_per_loc[loc_key] = {**b, "terminal_info": td}

        sorted_buyers = sorted(best_per_loc.values(), key=lambda x: x["price_buy"], reverse=True)

        # Check demand availability
        best_demand = sorted_buyers[0].get("scu_buy", 0) if sorted_buyers else 0
        if best_demand > 0 and best_demand < qty:
            warnings.append(f"{zh_name}({comm_name}): 最佳站点收购量仅 {best_demand} SCU，库存 {qty} SCU")

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

    # Step 2: Commodity summary (best price per commodity)
    commodity_summary = []
    for r in sellable_results:
        best = r["buyers"][0]
        td = best["terminal_info"]
        commodity_summary.append({
            "name": r["name"],
            "name_zh": r["name_zh"],
            "quantity": r["quantity"],
            "best_price": best["price_buy"],
            "best_revenue": best["price_buy"] * r["quantity"],
            "scu_buy": best.get("scu_buy", 0),
            "best_terminal": format_location_zh(
                td.get("name") or "", td.get("nickname") or "",
                td.get("space_station_name") or "",
                td.get("planet_name") or "", td.get("star_system_name") or ""
            ),
        })

    # Step 3: Find origin terminal
    origin_terminal = search_terminal(origin)
    origin_tid = origin_terminal.get("id") if origin_terminal else None
    origin_system = (origin_terminal.get("star_system_name") or "") if origin_terminal else ""

    # Step 4: Build terminal-commodity map
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
               b["price_buy"] > terminal_buy_map[tid]["commodities"][r["name"]]["price_buy"]:
                terminal_buy_map[tid]["commodities"][r["name"]] = {
                    "price_buy": b["price_buy"],
                    "scu_buy": b.get("scu_buy", 0),
                    "quantity": r["quantity"],
                    "name_zh": r["name_zh"],
                    "revenue": b["price_buy"] * r["quantity"],
                }

    # Step 5: Build distance matrix
    candidate_tids = list(terminal_buy_map.keys())
    dist_matrix = {}
    if origin_tid:
        dist_matrix = build_distance_matrix(origin_tid, candidate_tids, refresh=refresh)

    # Step 6: Nearest-neighbor greedy route (shortest distance)
    shortest_route = []
    shortest_total_distance = 0
    shortest_total_revenue = 0

    if origin_tid and dist_matrix:
        remaining = {r["name"]: {"name_zh": r["name_zh"], "quantity": r["quantity"]} for r in sellable_results}
        current_tid = origin_tid
        current_system = origin_system

        while remaining:
            # Real-time route query at current station
            if not distance_cache.is_queried(current_tid) and current_tid != origin_tid:
                fetch_routes_from_terminal(current_tid, refresh=refresh)
                for (ot, dt), dist in distance_cache._distances.items():
                    if ot == current_tid or dt == current_tid:
                        dist_matrix[(ot, dt)] = dist
                        dist_matrix[(dt, ot)] = dist

            best_stop = None
            best_score = -1
            best_stop_distance = 0
            best_stop_items = []
            best_stop_tid = None

            for tid, tinfo in terminal_buy_map.items():
                stop_revenue = 0
                stop_items = []
                for comm_name, comm_info in tinfo["commodities"].items():
                    if comm_name in remaining:
                        stop_revenue += comm_info["revenue"]
                        stop_items.append((comm_name, comm_info))

                if not stop_items:
                    continue

                d = dist_matrix.get((current_tid, tid))
                if d is None:
                    d = dist_matrix.get((tid, current_tid))
                if d is None:
                    d = get_distance(current_tid, tid)

                if d is None:
                    dest_sys = tinfo.get("star_system", "")
                    cur_sys = terminal_buy_map.get(current_tid, {}).get("star_system", current_system)
                    d = 50 if dest_sys == cur_sys else 100

                score = stop_revenue / (d + 1)
                if score > best_score:
                    best_score = score
                    best_stop = tinfo
                    best_stop_distance = d
                    best_stop_items = stop_items
                    best_stop_tid = tid

            if not best_stop:
                break

            commodities_sold = []
            for comm_name, comm_info in best_stop_items:
                commodities_sold.append({
                    "name": comm_name,
                    "name_zh": comm_info["name_zh"],
                    "quantity": comm_info["quantity"],
                    "price_per_scu": comm_info["price_buy"],
                    "revenue": comm_info["revenue"],
                    "scu_buy": comm_info.get("scu_buy", 0),
                })

            shortest_total_revenue += sum(c["revenue"] for c in commodities_sold)
            if best_stop_distance < 9999:
                shortest_total_distance += best_stop_distance

            shortest_route.append({
                "terminal_id": best_stop_tid,
                "terminal_name": best_stop["terminal_name"],
                "terminal_name_zh": best_stop["zh_loc"],
                "system": best_stop["star_system"],
                "system_zh": SYSTEM_ZH.get(best_stop["star_system"], best_stop["star_system"]),
                "planet": best_stop["planet"] or "",
                "planet_zh": PLANET_ZH.get(best_stop["planet"] or "", best_stop["planet"] or ""),
                "distance_from_prev": best_stop_distance if best_stop_distance < 9999 else None,
                "cumulative_distance": shortest_total_distance,
                "commodities_sold": commodities_sold,
                "stop_revenue": sum(c["revenue"] for c in commodities_sold),
            })

            current_tid = best_stop_tid
            for comm_name, _ in best_stop_items:
                if comm_name in remaining:
                    del remaining[comm_name]

    # Step 7: Max profit route (each commodity to its best price terminal)
    max_profit_route = []
    max_profit_total_revenue = 0
    max_profit_total_distance = None
    prev_tid = origin_tid

    for r in sellable_results:
        best = r["buyers"][0]
        td = best["terminal_info"]
        stop_revenue = best["price_buy"] * r["quantity"]

        d = None
        if prev_tid:
            d = get_distance(prev_tid, best["tid"])

        if max_profit_total_distance is None and d is not None:
            max_profit_total_distance = 0
        if d is not None and max_profit_total_distance is not None:
            max_profit_total_distance += d

        max_profit_total_revenue += stop_revenue

        max_profit_route.append({
            "terminal_id": best["tid"],
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
            "commodities_sold": [{
                "name": r["name"],
                "name_zh": r["name_zh"],
                "quantity": r["quantity"],
                "price_per_scu": best["price_buy"],
                "revenue": stop_revenue,
                "scu_buy": best.get("scu_buy", 0),
            }],
            "stop_revenue": stop_revenue,
        })
        prev_tid = best["tid"]

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
