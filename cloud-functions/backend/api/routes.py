"""
API Routes - FastAPI route handlers
"""
from fastapi import APIRouter, Query
from .schemas import (
    SellRouteRequest, SellRouteResponse, TerminalOption, CommodityOption,
    PriceEntry, CommodityPricesResponse, WarbondResponse,
    LocationOption, VehicleOption, TradeChainRequest, TradeChainResponse, ChainLeg,
    FeedbackRequest, ItemOption, ItemPriceEntry, ItemPricesResponse,
    ItemAttributeEntry, ItemDetailResponse,
    CategoryAttributeDef, CategoryAttributesResponse,
    ItemWithAttributes, ItemsAttributesBatchResponse,
    ItemsPricesAllResponse
)
from .feedback import feedback_router
from services.uex_api import (
    load_terminals, load_commodities, get_commodity_prices, resolve_terminal,
    clear_caches, load_vehicles, get_locations, get_all_prices,
    load_items, load_item_prices, load_item_attributes,
    load_all_item_prices, load_item_attributes_by_category, load_categories_attributes,
    load_all_terminals, resolve_terminal_location,
)
from services.data_mapper import get_terminal_zh, get_commodity_zh, get_vehicle_zh, SYSTEM_ZH, PLANET_ZH
from services.route_planner import plan_sell_route, plan_buy_route, _is_valid_commodity_terminal
from services.trade_chain import plan_trade_chain
from services.warbond_scraper import fetch_warbonds
from services.cache import get_all_stats, invalidate_all
from version import VERSION, CHANGELOG
import logging
import traceback

router = APIRouter()
router.include_router(feedback_router)
# NOTE: No prefix - EdgeOne Cloud Functions strips /api before forwarding.
# Local dev uses Vite proxy with path rewrite to match this behavior.


@router.get("/version")
async def get_version():
    """Get current application version (simplified for security)."""
    # 只返回主版本号，不暴露详细changelog
    return {"version": VERSION.split(".")[0] + "." + VERSION.split(".")[1]}


@router.post("/sell-route", response_model=SellRouteResponse)
async def sell_route(request: SellRouteRequest, refresh: bool = Query(False)):
    """Plan a sell route for inventory.

    Args:
        refresh: If True, bypass cache and fetch fresh data from UEX API.
    """
    try:
        result = plan_sell_route(
            request.origin,
            [item.model_dump() for item in request.items],
            refresh=refresh,
            origin_id=request.origin_id,
        )
        return result
    except Exception as e:
        logging.error(f"Route planning error: {e}")
        logging.error(traceback.format_exc())
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Route planning error: {str(e)}")


@router.post("/buy-route", response_model=SellRouteResponse)
async def buy_route(request: SellRouteRequest, refresh: bool = Query(False)):
    """Plan a buy route - find cheapest sellers for commodities.

    Args:
        refresh: If True, bypass cache and fetch fresh data from UEX API.
    """
    try:
        result = plan_buy_route(
            request.origin,
            [item.model_dump() for item in request.items],
            refresh=refresh,
            origin_id=request.origin_id,
        )
        return result
    except Exception as e:
        logging.error(f"Buy route planning error: {e}")
        logging.error(traceback.format_exc())
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Buy route planning error: {str(e)}")


@router.get("/terminals", response_model=list[TerminalOption])
async def search_terminals(q: str = Query("", max_length=100), refresh: bool = Query(False)):
    """Search terminals by name.

    Args:
        refresh: If True, bypass cache and fetch fresh terminal data.
    """
    terminals = load_terminals(refresh=refresh)
    query = q.lower().strip()

    if not query:
        results = terminals[:50]
    else:
        results = []
        for t in terminals:
            name = t.get("name", "").lower()
            nick = t.get("nickname", "").lower()
            zh = get_terminal_zh(
                t.get("name", ""), t.get("nickname", ""),
                t.get("space_station_name", ""),
                t.get("planet_name", ""), t.get("star_system_name", "")
            ).lower()
            if query in name or query in nick or query in zh:
                results.append(t)
            if len(results) >= 20:
                break

    return [
        TerminalOption(
            id=t.get("id", 0),
            name=t.get("name", ""),
            name_zh=get_terminal_zh(
                t.get("name") or "", t.get("nickname") or "",
                t.get("space_station_name") or "",
                t.get("planet_name") or "", t.get("star_system_name") or ""
            ),
            system=t.get("star_system_name") or "",
            system_zh=SYSTEM_ZH.get(t.get("star_system_name") or "", t.get("star_system_name") or ""),
            planet=t.get("planet_name") or "",
            planet_zh=PLANET_ZH.get(t.get("planet_name") or "", t.get("planet_name") or ""),
        )
        for t in results
    ]


@router.get("/commodities", response_model=list[CommodityOption])
async def search_commodities(
    q: str = Query("", max_length=100),
    limit: int = Query(50, ge=1, le=500),
    refresh: bool = Query(False),
):
    """Search commodities by name.

    Args:
        q: Search query string.
        limit: Maximum number of results to return (1-500, default 50).
        refresh: If True, bypass cache and fetch fresh commodity data.
    """
    commodities = load_commodities(refresh=refresh)
    query = q.lower().strip()

    if not query:
        results = commodities[:limit]
    else:
        results = []
        for c in commodities:
            name = c.get("name", "").lower()
            zh = get_commodity_zh(c.get("name", "")).lower()
            if query in name or query in zh:
                results.append(c)
            if len(results) >= limit:
                break

    return [
        CommodityOption(
            id=c.get("id", 0),
            name=c.get("name", ""),
            name_zh=get_commodity_zh(c.get("name", "")),
            category=c.get("commodity_kind", "") or "",
        )
        for c in results
    ]


@router.get("/commodity-prices/{commodity_id}", response_model=CommodityPricesResponse)
async def commodity_prices(commodity_id: int, refresh: bool = Query(False)):
    """Get buy/sell prices for a specific commodity across all terminals.

    Args:
        commodity_id: UEX commodity ID
        refresh: If True, bypass cache and fetch fresh price data.
    """
    # Verify commodity exists
    commodities = load_commodities()
    commodity = None
    for c in commodities:
        if c.get("id") == commodity_id:
            commodity = c
            break
    if not commodity:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Commodity not found")

    # Fetch all prices (with TTL cache)
    prices_data = get_commodity_prices(commodity_id, refresh=refresh)

    # Build price entries
    #
    # UEX API 2.0 price semantics (PLAYER perspective):
    #   price_buy  = station selling price = what you PAY when buying from terminal
    #   price_sell = player selling price  = what you GET when selling to terminal
    #
    # Our PriceEntry fields (PLAYER perspective):
    #   buy_price  = what you get when selling (maps to UEX price_sell)
    #   sell_price = what you pay when buying (maps to UEX price_buy)
    buy_entries = []  # Terminals that BUY from you (you sell to them) - price_sell > 0
    sell_entries = []  # Terminals that SELL to you (you buy from them) - price_buy > 0

    for p in prices_data:
        tid = p.get("id_terminal", 0)
        if not tid:
            continue

        t_info = resolve_terminal(tid)
        t_name = t_info.get("name", f"Terminal-{tid}")
        t_nick = t_info.get("nickname", "")
        t_station = t_info.get("space_station_name", "")
        t_planet = t_info.get("planet_name") or ""
        t_system = t_info.get("star_system_name") or ""

        # Filter out non-commodity-trading sub-terminals
        if not _is_valid_commodity_terminal(t_name):
            continue

        uex_price_buy = p.get("price_buy")   # station selling price
        uex_price_sell = p.get("price_sell")  # player selling price

        entry = PriceEntry(
            terminal_id=tid,
            terminal_name=t_name,
            terminal_name_zh=get_terminal_zh(
                t_name, t_nick, t_station, t_planet, t_system
            ),
            system=t_system,
            system_zh=SYSTEM_ZH.get(t_system, t_system),
            planet=t_planet,
            planet_zh=PLANET_ZH.get(t_planet, t_planet),
            buy_price=uex_price_sell,   # what you get when selling to this terminal
            sell_price=uex_price_buy,   # what you pay when buying from this terminal
            price_star=p.get("price_star", 0),
        )

        # A terminal that buys this commodity from you (UEX price_sell > 0)
        if entry.buy_price and entry.buy_price > 0:
            buy_entries.append(entry)
        # A terminal that sells this commodity to you (UEX price_buy > 0)
        if entry.sell_price and entry.sell_price > 0:
            sell_entries.append(entry)

    # Sort: buy by highest buy_price (best payout for you), sell by lowest sell_price (cheapest to buy)
    buy_entries.sort(key=lambda e: e.buy_price, reverse=True)
    sell_entries.sort(key=lambda e: e.sell_price)

    return CommodityPricesResponse(
        commodity_id=commodity_id,
        commodity_name=commodity.get("name", ""),
        commodity_name_zh=get_commodity_zh(commodity.get("name", "")),
        buy_prices=buy_entries,
        sell_prices=sell_entries,
    )


@router.get("/warbonds", response_model=WarbondResponse)
async def get_warbonds(refresh: bool = Query(False)):
    """Get current warbond items from RSI store.

    Args:
        refresh: If True, bypass cache and fetch fresh warbond data.
    """
    return fetch_warbonds(refresh=refresh)


@router.get("/health")
async def health_check():
    """Health check - lightweight ping only, never triggers UEX API calls.
    Returns ok immediately so the frontend does not false-positive as down
    during cold-start delays of other endpoints.
    After responding, triggers background warmup of critical caches.
    """
    import asyncio
    from services.uex_api import _get_api_key, load_terminals, load_commodities
    from services.cache import (
        terminal_cache, commodity_cache, all_item_prices_cache
    )

    # Only report on *already-cached* data; never trigger a fresh API fetch synchronously
    term_count = len(terminal_cache.data) if terminal_cache.data else 0
    comm_count = len(commodity_cache.data) if commodity_cache.data else 0
    prices_count = len(all_item_prices_cache.data) if all_item_prices_cache.data else 0

    # If critical caches are empty, trigger background warmup
    if term_count == 0 or comm_count == 0:
        async def _warmup():
            try:
                if term_count == 0:
                    load_terminals()
                if comm_count == 0:
                    load_commodities()
            except Exception:
                pass  # Warmup failure is non-critical
        asyncio.create_task(_warmup())

    return {
        "status": "ok" if (term_count > 0 or comm_count > 0) else "degraded",
        "terminals_cached": term_count,
        "commodities_cached": comm_count,
        "item_prices_cached": prices_count,
        "api_key_configured": bool(_get_api_key()),
        "version": VERSION,
    }


@router.get("/cache/stats")
async def cache_stats():
    """Get cache statistics - shows TTL, age, and hit/miss counts for all caches."""
    return get_all_stats()


@router.post("/cache/clear")
async def clear_cache():
    """Clear all cached data - forces fresh data on next request."""
    invalidate_all()
    return {"status": "ok", "message": "All caches cleared"}


@router.get("/locations", response_model=list[LocationOption])
async def search_locations(q: str = Query("", max_length=100), refresh: bool = Query(False)):
    """Search locations (grouped by space station/city/outpost) for chain route origin."""
    locations = get_locations(q=q, refresh=refresh)
    return [
        LocationOption(
            location_id=loc["location_id"],
            location_name=loc["location_name"],
            location_name_zh=loc["location_name_zh"],
            type=loc["type"],
            system=loc.get("system", ""),
            system_zh=loc.get("system_zh", ""),
            planet=loc.get("planet", ""),
            planet_zh=loc.get("planet_zh", ""),
            terminal_ids=loc["terminal_ids"],
        )
        for loc in locations
    ]


@router.get("/vehicles", response_model=list[VehicleOption])
async def search_vehicles(q: str = Query("", max_length=100), refresh: bool = Query(False)):
    """Search vehicles with SCU capacity for chain route planning."""
    vehicles = load_vehicles(refresh=refresh)
    query = q.lower().strip()

    if query:
        results = []
        for v in vehicles:
            name = v.get("name", "").lower()
            zh = get_vehicle_zh(v.get("name", "")).lower()
            if query in name or query in zh:
                results.append(v)
            if len(results) >= 20:
                break
    else:
        # Default: sort by SCU ascending, return up to 50
        results = sorted(vehicles, key=lambda v: v.get("scu", 0))[:50]

    return [
        VehicleOption(
            id=v.get("id", 0),
            name=v.get("name", ""),
            name_zh=get_vehicle_zh(v.get("name", "")),
            scu=v.get("scu", 0),
        )
        for v in results
    ]


@router.post("/trade-chain", response_model=TradeChainResponse)
async def trade_chain(request: TradeChainRequest, refresh: bool = Query(False)):
    """Plan a chain of trade routes for maximum profit."""
    try:
        if refresh:
            from services.uex_api import clear_caches
            clear_caches()
        result = plan_trade_chain(
            vehicle_id=request.vehicle_id,
            scu_override=request.scu_override,
            origin_location_id=request.origin_location_id,
            origin_location_name=request.origin_location_name,
            capital=request.capital,
            max_legs=request.max_legs,
        )
        return result
    except Exception as e:
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Trade chain planning error: {str(e)}")


# ==================== Ship Items API ====================

# Category ID to Chinese name mapping (verified against UEX API categories endpoint)
ITEM_CATEGORY_ZH = {
    # Systems (系统)
    19: "冷却器", 21: "发电机", 22: "量子引擎", 23: "护盾发生器",
    # Utility (工具)
    25: "对接环", 26: "油箱", 28: "装置",
    29: "采矿激光器", 30: "采矿设备", 31: "打捞光束",
    64: "容器", 67: "牵引光束", 109: "制造机", 110: "打捞光束",
    # Vehicle Weapons (武器)
    32: "火炮", 33: "导弹架", 34: "导弹", 35: "炮塔",
    70: "炸弹", 79: "点防御炮", 90: "炸弹架",
    # Avionics (航空电子)
    82: "飞行模块", 83: "雷达",
    # Propulsion (推进)
    86: "跳跃模块",
    # Personal Weapons
    17: "个人武器", 18: "附件",
    # Armor & Clothing
    1: "护甲-头盔", 2: "护甲-躯干", 4: "护甲-手臂", 5: "护甲-腿部",
    8: "护甲-背包", 9: "护甲-护腿", 14: "护甲-手套", 15: "护甲-面罩",
    # Other
    16: "服装", 36: "消耗品", 38: "其他",
}

# Section to Chinese name
SECTION_ZH = {
    "Systems": "系统",
    "Vehicle Weapons": "武器",
    "Utility": "工具",
    "Avionics": "航空电子",
    "Propulsion": "推进",
    "Personal Weapons": "个人武器",
    "Armor": "护甲",
    "Clothing": "服装",
    "Commodities": "商品",
    "Miscellaneous": "杂项",
    "Other": "其他",
}

# Attribute name to Chinese (verified against UEX API categories_attributes endpoint)
ATTR_NAME_ZH = {
    "Size": "尺寸", "Damage": "伤害", "Rate Of Fire": "射速",
    "Range": "射程", "Speed": "速度", "Spread": "散布",
    "Heat Per Shot": "每发热量", "Power Draw": "功耗",
    "Shield Health": "护盾血量", "Regen Rate": "再生速率",
    "Downed Regen Rate": "倒地再生速率", "Damaged Regen Rate": "受损再生速率",
    "Max Shield Face": "最大护盾面", "Cooldown Rate": "冷却速率",
    "Cooldown Time": "冷却时间", "Spin Up Time": "预热时间",
    "Capacity": "容量", "Fuel Capacity": "燃料容量",
    "Quantum Fuel Requirement": "量子燃料需求",
    "Jump Fuel Requirement": "跳跃燃料需求",
    "Calibration Rate": "校准速率",
    "Sensitivity": "灵敏度", "Signature": "信号特征",
    "EMP Resistance": "EMP抗性", "Distortion Resistance": "扭曲抗性",
    "Thermal Energy": "热能", "Thermal Rate": "热能速率",
    "Item Count": "物品数量", "Durability": "耐久度",
    "Class": "分类", "Grade": "品级",
    "Weapon Class": "武器分类", "Type": "类型",
    "Penetration": "穿透力", "Absorption": "吸收率",
    "Port Count": "端口数量", "Inventory Count": "库存数量",
    "Cargo Capacity": "货物容量", "Weight": "重量",
    "Volume": "体积", "Mass": "质量",
    "Grade Letter": "品级字母", "Grade Numeric": "品级数字",
    "Extraction Laser Power": "提取激光功率",
    "Extraction Speed": "提取速度",
    "Extraction Throughput": "提取吞吐量",
    "Extraction Efficiency": "提取效率",
    "Mining Laser Power": "采矿激光功率",
    "Optimal Charge Rate": "最佳充能速率",
    "Optimal Charge Window Rate": "最佳充能窗口速率",
    "Optimal Charge Window Size": "最佳充能窗口大小",
    "Catastrophic Charge Rate": "灾难性充能速率",
    "Safe Flow Rate": "安全流速",
    "Optimal Range": "最佳射程",
    "Max Range": "最大射程",
    "Maximum Range": "最大射程",
    "Maximum Speed": "最大速度",
    "Minimum Lock Distance": "最小锁定距离",
    "Maximum Lock Distance": "最大锁定距离",
    "Module Slots": "模块槽位",
    "SCU": "SCU容量",
    "Inert Material Level": "惰性材料等级",
    "Laser Instability": "激光不稳定性",
    "Instability": "不稳定性",
    "Shatter Damage": "碎裂伤害",
    "Resistance": "抗性",
    "Gather Radius": "采集半径",
    "Collection Point Radius": "收集点半径",
    "Collection Throughput": "收集吞吐量",
    "Flow Rate": "流速",
    "Full Strength Distance": "全强度距离",
    "Max Angle": "最大角度",
    "Radius": "半径",
    "Duration": "持续时间",
    "Uses": "使用次数",
    "Missiles": "导弹",
    "Power Transfer": "功率传输",
    "Hydrogen Flow Modifier": "氢气流量调节器",
    "Hydrogen Flow Speed": "氢气流速",
    "Quantum Flow Modifier": "量子流量调节器",
    "Quantum Flow Speed": "量子流速",
    "Cluster Modifier": "集群调节器",
    "Tracking Signal": "追踪信号",
    "Throttle min": "最小油门",
    "Max. Integrity": "最大完整性",
    "Item Type": "物品类型",
}


@router.get("/items", response_model=list[ItemOption])
async def search_items(
    id_category: int = Query(None, description="Filter by UEX category ID"),
    q: str = Query("", max_length=100),
    limit: int = Query(100, ge=1, le=500),
    refresh: bool = Query(False),
):
    """Search items (ship components, weapons, armor, etc.) by category and name."""
    items = load_items(id_category=id_category, refresh=refresh)
    query = q.lower().strip()

    if query:
        results = []
        for item in items:
            name = item.get("name", "").lower()
            cat = item.get("category", "").lower()
            section = item.get("section", "").lower()
            company = item.get("company_name", "").lower()
            cat_zh = ITEM_CATEGORY_ZH.get(item.get("id_category", 0), "").lower()
            if query in name or query in cat or query in section or query in company or query in cat_zh:
                results.append(item)
            if len(results) >= limit:
                break
    else:
        results = items[:limit]

    return [
        ItemOption(
            id=item.get("id", 0),
            name=item.get("name", ""),
            name_zh=item.get("name", ""),  # UEX items don't have zh names, use EN
            section=item.get("section", ""),
            category=item.get("category", ""),
            category_zh=ITEM_CATEGORY_ZH.get(item.get("id_category", 0), item.get("category", "")),
            company_name=item.get("company_name", ""),
            size=item.get("size", ""),
        )
        for item in results
    ]


@router.get("/items-prices/{item_id}", response_model=ItemPricesResponse)
async def item_prices(item_id: int, refresh: bool = Query(False)):
    """Get prices for a specific item across all terminals."""
    # Verify item exists
    items = load_items()
    item = None
    for i in items:
        if i.get("id") == item_id:
            item = i
            break
    if not item:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Item not found")

    prices_data = load_item_prices(item_id, refresh=refresh)
    
    # Load ALL terminals (including shops) for full location data
    terminals = load_all_terminals()
    terminal_map = {t["id"]: t for t in terminals if "id" in t}

    from services.data_mapper import SYSTEM_ZH, PLANET_ZH, get_terminal_zh
    price_entries = []
    for p in prices_data:
        tid = p.get("id_terminal", 0)
        if not tid:
            continue
        
        # Get terminal info with full location data
        t_info = terminal_map.get(tid, {})
        
        # Get location from terminal data, with FK-based fallback
        sys_name = t_info.get("star_system_name") or p.get("star_system_name") or ""
        planet_name = t_info.get("planet_name") or p.get("planet_name") or ""
        term_name = t_info.get("name") or p.get("terminal_name") or f"Terminal-{tid}"
        resolved = resolve_terminal_location(t_info)
        city_name = resolved["city_name"] or p.get("city_name") or ""
        station_name = resolved["space_station_name"] or p.get("space_station_name") or ""
        outpost_name = resolved["outpost_name"] or p.get("outpost_name") or ""
        
        # Translate to Chinese
        city_name_zh = get_terminal_zh(city_name, "", "", planet_name, sys_name) if city_name else ""
        station_name_zh = get_terminal_zh(station_name, "", "", planet_name, sys_name) if station_name else ""
        outpost_name_zh = get_terminal_zh(outpost_name, "", "", planet_name, sys_name) if outpost_name else ""
        term_name_zh = get_terminal_zh(term_name, t_info.get("nickname", ""), station_name, planet_name, sys_name)
        
        # Determine location display name (station > city > outpost > terminal)
        location_name = station_name or city_name or outpost_name or term_name
        location_name_zh = station_name_zh or city_name_zh or outpost_name_zh or term_name_zh
        
        price_entries.append(ItemPriceEntry(
            terminal_id=tid,
            terminal_name=term_name,
            terminal_name_zh=term_name_zh,
            star_system_name=sys_name,
            star_system_name_zh=SYSTEM_ZH.get(sys_name, sys_name),
            planet_name=planet_name,
            planet_name_zh=PLANET_ZH.get(planet_name, planet_name),
            city_name=city_name,
            city_name_zh=city_name_zh,
            outpost_name=outpost_name,
            outpost_name_zh=outpost_name_zh,
            space_station_name=station_name,
            space_station_name_zh=station_name_zh,
            price_buy=p.get("price_buy"),
            price_sell=p.get("price_sell"),
            durability=p.get("durability"),
        ))

    # Sort: buy (where you can buy from) by cheapest first, sell by highest first
    price_entries.sort(key=lambda e: (e.price_buy is None, e.price_buy or 0))

    return ItemPricesResponse(
        item_id=item_id,
        item_name=item.get("name", ""),
        item_name_zh=item.get("name", ""),
        prices=price_entries,
    )


@router.get("/items-attributes/{item_id}", response_model=list[ItemAttributeEntry])
async def item_attributes(item_id: int, refresh: bool = Query(False)):
    """Get attributes for a specific item."""
    attrs_data = load_item_attributes(item_id, refresh=refresh)
    return [
        ItemAttributeEntry(
            attribute_name=a.get("attribute_name", ""),
            attribute_name_zh=ATTR_NAME_ZH.get(a.get("attribute_name", ""), a.get("attribute_name", "")),
            value=a.get("value", ""),
            unit=a.get("unit", ""),
        )
        for a in attrs_data
    ]


@router.get("/items-prices-all", response_model=ItemsPricesAllResponse)
async def items_prices_all(id_category: int = Query(..., description="UEX category ID"), refresh: bool = Query(False)):
    """Get all item prices for a specific category. Uses bulk loading instead of per-item API calls.
    Optimized: filters by id_category from price data directly (no need to load item list).
    """
    all_prices = load_all_item_prices(refresh=refresh)
    
    # Load ALL terminals (including shops) for full location data
    terminals = load_all_terminals()
    terminal_map = {t["id"]: t for t in terminals if "id" in t}

    from services.data_mapper import SYSTEM_ZH, PLANET_ZH, get_terminal_zh
    filtered_prices = []
    for p in all_prices:
        if p.get("id_category") != id_category:
            continue
        tid = p.get("id_terminal", 0)
        if not tid:
            continue
        
        # Get terminal info with full location data
        t_info = terminal_map.get(tid, {})
        
        # Get location from terminal data, with FK-based fallback
        sys_name = t_info.get("star_system_name") or p.get("star_system_name") or ""
        planet_name = t_info.get("planet_name") or p.get("planet_name") or ""
        term_name = t_info.get("name") or p.get("terminal_name") or f"Terminal-{tid}"
        resolved = resolve_terminal_location(t_info)
        city_name = resolved["city_name"] or p.get("city_name") or ""
        station_name = resolved["space_station_name"] or p.get("space_station_name") or ""
        outpost_name = resolved["outpost_name"] or p.get("outpost_name") or ""
        
        filtered_prices.append(ItemPriceEntry(
            id_item=p.get("id_item"),
            terminal_id=tid,
            terminal_name=term_name,
            terminal_name_zh=get_terminal_zh(term_name, t_info.get("nickname", ""), station_name, planet_name, sys_name),
            star_system_name=sys_name,
            star_system_name_zh=SYSTEM_ZH.get(sys_name, sys_name),
            planet_name=planet_name,
            planet_name_zh=PLANET_ZH.get(planet_name, planet_name),
            city_name=city_name,
            city_name_zh=get_terminal_zh(city_name, "", "", planet_name, sys_name) if city_name else "",
            outpost_name=outpost_name,
            outpost_name_zh=get_terminal_zh(outpost_name, "", "", planet_name, sys_name) if outpost_name else "",
            space_station_name=station_name,
            space_station_name_zh=get_terminal_zh(station_name, "", "", planet_name, sys_name) if station_name else "",
            price_buy=p.get("price_buy"),
            price_sell=p.get("price_sell"),
            durability=p.get("durability"),
        ))

    return ItemsPricesAllResponse(
        id_category=id_category,
        category_name_zh=ITEM_CATEGORY_ZH.get(id_category, ""),
        prices=filtered_prices,
    )


@router.get("/items-attributes", response_model=ItemsAttributesBatchResponse)
async def items_attributes_batch(id_category: int = Query(..., description="UEX category ID"), refresh: bool = Query(False)):
    """Get attributes for all items in a category (bulk endpoint)."""
    attrs_data = load_item_attributes_by_category(id_category, refresh=refresh)

    # 按id_item分组
    items_map = {}
    for a in attrs_data:
        item_id = a.get("id_item", 0)
        if item_id not in items_map:
            items_map[item_id] = {
                "id_item": item_id,
                "item_name": a.get("item_name", ""),
                "attributes": [],
            }
        items_map[item_id]["attributes"].append(ItemAttributeEntry(
            attribute_name=a.get("attribute_name", ""),
            attribute_name_zh=ATTR_NAME_ZH.get(a.get("attribute_name", ""), a.get("attribute_name", "")),
            value=str(a.get("value", "")),
            unit=a.get("unit", ""),
        ))

    return ItemsAttributesBatchResponse(
        id_category=id_category,
        items=list(items_map.values()),
    )


@router.get("/categories-attributes", response_model=CategoryAttributesResponse)
async def categories_attributes(id_category: int = Query(..., description="UEX category ID"), refresh: bool = Query(False)):
    """Get attribute definitions for a category (includes is_lower_better semantics)."""
    attrs_data = load_categories_attributes(id_category, refresh=refresh)

    # is_lower_better 表示：越低越好
    LOWER_IS_BETTER = {"Cooldown Time", "Spin Up Time", "Heat Per Shot", "Power Draw", "Spread", "Sensitivity", "Signature", "Thermal Energy"}

    return CategoryAttributesResponse(
        id_category=id_category,
        category_name_zh=ITEM_CATEGORY_ZH.get(id_category, ""),
        attributes=[
            CategoryAttributeDef(
                id_attribute=a.get("id", 0),
                name=a.get("name", ""),
                name_zh=ATTR_NAME_ZH.get(a.get("name", ""), a.get("name", "")),
                description=a.get("description", ""),
                is_lower_better=a.get("name", "") in LOWER_IS_BETTER,
            )
            for a in attrs_data
        ],
    )


@router.post("/admin/refresh-translations")
async def refresh_translations():
    """Manually refresh ParaTranz translation cache."""
    try:
        from services.paratranz_service import paratranz
        paratranz.load_translations(force=True)
        stats = paratranz.get_stats()
        return {"status": "ok", "stats": stats}
    except Exception as e:
        return {"status": "error", "message": str(e)}


@router.get("/debug/terminal-fields")
async def debug_terminal_fields():
    """Debug: dump all fields from a sample terminal record."""
    from services.uex_api import load_terminals, load_space_stations, load_cities, load_outposts
    terminals = load_terminals()
    stations = load_space_stations()
    cities = load_cities()
    outposts = load_outposts()
    
    # Find Seraphim (id=259) and Everus (id=25)
    sample_terminal = None
    for t in terminals:
        if t.get("id") == 259:
            sample_terminal = t
            break
    
    # Get station details
    station_detail = None
    for sid, s in stations.items():
        if "Seraphim" in (s.get("name") or ""):
            station_detail = s
            break
    
    return {
        "terminal_fields": list(sample_terminal.keys()) if sample_terminal else [],
        "sample_terminal": sample_terminal,
        "station_fields": list(station_detail.keys()) if station_detail else [],
        "sample_station": station_detail,
        "stations_count": len(stations),
        "cities_count": len(cities),
        "outposts_count": len(outposts),
    }


@router.get("/warmup")
async def warmup():
    """Pre-warm critical caches in background to reduce cold-start latency."""
    import asyncio
    from services.uex_api import (
        load_terminals, load_commodities, get_all_prices, load_vehicles,
    )

    async def _warm():
        try:
            load_terminals()
        except Exception:
            pass
        try:
            load_commodities()
        except Exception:
            pass
        try:
            get_all_prices()
        except Exception:
            pass
        try:
            load_vehicles()
        except Exception:
            pass

    asyncio.create_task(_warm())
    return {"status": "ok", "message": "Cache warmup triggered"}
