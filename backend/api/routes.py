"""
API Routes - FastAPI route handlers
"""
from fastapi import APIRouter, Query
from .schemas import (
    SellRouteRequest, SellRouteResponse, TerminalOption, CommodityOption,
    PriceEntry, CommodityPricesResponse, WarbondResponse,
    LocationOption, VehicleOption, TradeChainRequest, TradeChainResponse, ChainLeg
)
from services.uex_api import (
    load_terminals, load_commodities, get_commodity_prices, resolve_terminal,
    clear_caches, load_vehicles, get_locations, get_all_prices
)
from services.data_mapper import get_terminal_zh, get_commodity_zh, get_vehicle_zh, SYSTEM_ZH, PLANET_ZH
from services.route_planner import plan_sell_route, plan_buy_route, _is_valid_commodity_terminal
from services.trade_chain import plan_trade_chain
from services.warbond_scraper import fetch_warbonds
from services.cache import get_all_stats, invalidate_all
from version import VERSION, CHANGELOG

router = APIRouter(prefix="/api")


@router.get("/version")
async def get_version():
    """Get current application version and changelog."""
    return {"version": VERSION, "changelog": CHANGELOG}


@router.post("/sell-route", response_model=SellRouteResponse)
async def sell_route(request: SellRouteRequest, refresh: bool = Query(False)):
    """Plan a sell route for inventory.
    
    Args:
        refresh: If True, bypass cache and fetch fresh data from UEX API.
    """
    import traceback
    try:
        result = plan_sell_route(
            request.origin,
            [item.model_dump() for item in request.items],
            refresh=refresh,
            origin_id=request.origin_id,
        )
        return result
    except Exception as e:
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Route planning error: {str(e)}")


@router.post("/buy-route", response_model=SellRouteResponse)
async def buy_route(request: SellRouteRequest, refresh: bool = Query(False)):
    """Plan a buy route — find cheapest sellers for commodities.
    
    Args:
        refresh: If True, bypass cache and fetch fresh data from UEX API.
    """
    import traceback
    try:
        result = plan_buy_route(
            request.origin,
            [item.model_dump() for item in request.items],
            refresh=refresh,
            origin_id=request.origin_id,
        )
        return result
    except Exception as e:
        traceback.print_exc()
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
async def search_commodities(q: str = Query("", max_length=100), refresh: bool = Query(False)):
    """Search commodities by name.
    
    Args:
        refresh: If True, bypass cache and fetch fresh commodity data.
    """
    commodities = load_commodities(refresh=refresh)
    query = q.lower().strip()

    if not query:
        results = commodities[:50]
    else:
        results = []
        for c in commodities:
            name = c.get("name", "").lower()
            zh = get_commodity_zh(c.get("name", "")).lower()
            if query in name or query in zh:
                results.append(c)
            if len(results) >= 20:
                break

    return [
        CommodityOption(
            id=c.get("id", 0),
            name=c.get("name", ""),
            name_zh=get_commodity_zh(c.get("name", "")),
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
    buy_entries = []  # Terminals that BUY from you (you sell to them) — price_sell > 0
    sell_entries = []  # Terminals that SELL to you (you buy from them) — price_buy > 0

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
    """Health check — verifies UEX API data is loaded."""
    from services.uex_api import _get_api_key
    terminals = load_terminals()
    commodities = load_commodities()
    return {
        "status": "ok" if terminals and commodities else "degraded",
        "terminals_loaded": len(terminals),
        "commodities_loaded": len(commodities),
        "api_key_configured": bool(_get_api_key()),
        "version": VERSION,
    }


@router.get("/cache/stats")
async def cache_stats():
    """Get cache statistics — shows TTL, age, and hit/miss counts for all caches."""
    return get_all_stats()


@router.post("/cache/clear")
async def clear_cache():
    """Clear all cached data — forces fresh data on next request."""
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
    import traceback
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
