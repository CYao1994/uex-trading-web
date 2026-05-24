"""
API Routes - FastAPI route handlers
"""
from fastapi import APIRouter, Query
from .schemas import (
    SellRouteRequest, SellRouteResponse, TerminalOption, CommodityOption,
    PriceEntry, CommodityPricesResponse
)
from services.uex_api import load_terminals, load_commodities, get_commodity_prices, resolve_terminal
from services.data_mapper import get_terminal_zh, get_commodity_zh, SYSTEM_ZH, PLANET_ZH
from services.route_planner import plan_sell_route

router = APIRouter(prefix="/api")


@router.post("/sell-route", response_model=SellRouteResponse)
async def sell_route(request: SellRouteRequest):
    """Plan a sell route for inventory."""
    import traceback
    try:
        result = plan_sell_route(request.origin, [item.model_dump() for item in request.items])
        return result
    except Exception as e:
        traceback.print_exc()
        from fastapi import HTTPException
        raise HTTPException(status_code=500, detail=f"Route planning error: {str(e)}")


@router.get("/terminals", response_model=list[TerminalOption])
async def search_terminals(q: str = Query("", max_length=100)):
    """Search terminals by name."""
    terminals = load_terminals()
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
async def search_commodities(q: str = Query("", max_length=100)):
    """Search commodities by name."""
    commodities = load_commodities()
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
async def commodity_prices(commodity_id: int):
    """Get buy/sell prices for a specific commodity across all terminals."""
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

    # Fetch all prices
    prices_data = get_commodity_prices(commodity_id)

    # Build price entries
    buy_entries = []  # Terminals that BUY (you sell to them)
    sell_entries = []  # Terminals that SELL (you buy from them)

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
            buy_price=p.get("price_buy"),
            sell_price=p.get("price_sell"),
            price_star=p.get("price_star", 0),
        )

        # A terminal that buys this commodity from you
        if entry.buy_price and entry.buy_price > 0:
            buy_entries.append(entry)
        # A terminal that sells this commodity to you
        if entry.sell_price and entry.sell_price > 0:
            sell_entries.append(entry)

    # Sort: buy by highest buy_price (best for you), sell by lowest sell_price (cheapest to buy)
    buy_entries.sort(key=lambda e: e.buy_price, reverse=True)
    sell_entries.sort(key=lambda e: e.sell_price)

    return CommodityPricesResponse(
        commodity_id=commodity_id,
        commodity_name=commodity.get("name", ""),
        commodity_name_zh=get_commodity_zh(commodity.get("name", "")),
        buy_prices=buy_entries,
        sell_prices=sell_entries,
    )
