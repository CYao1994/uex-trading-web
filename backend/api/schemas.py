"""
API Schemas - Pydantic models for request/response
"""
from typing import List, Optional
from pydantic import BaseModel


class SellItem(BaseModel):
    name: str
    quantity: int


class SellRouteRequest(BaseModel):
    origin: str
    items: List[SellItem]


class CommoditySold(BaseModel):
    name: str
    name_zh: str
    quantity: int
    price_per_scu: int
    revenue: int


class RouteStop(BaseModel):
    terminal_id: int
    terminal_name: str
    terminal_name_zh: str
    system: str
    system_zh: str
    planet: str = ""
    planet_zh: str = ""
    distance_from_prev: Optional[int] = None
    cumulative_distance: Optional[int] = None
    commodities_sold: List[CommoditySold]
    stop_revenue: int


class CommoditySummary(BaseModel):
    name: str
    name_zh: str
    quantity: int
    best_price: int
    best_revenue: int
    best_terminal: str


class SellRouteResponse(BaseModel):
    commodity_summary: List[CommoditySummary]
    shortest_route: List[RouteStop]
    shortest_route_total_distance: int
    shortest_route_total_revenue: int
    max_profit_route: List[RouteStop]
    max_profit_route_total_distance: Optional[int] = None
    max_profit_route_total_revenue: int
    warnings: List[str]


class TerminalOption(BaseModel):
    id: int
    name: str
    name_zh: str
    system: str
    system_zh: str
    planet: str = ""
    planet_zh: str = ""

    class Config:
        # Allow None values to be coerced to defaults
        from_attributes = True


class CommodityOption(BaseModel):
    id: int
    name: str
    name_zh: str


class PriceEntry(BaseModel):
    terminal_id: int
    terminal_name: str
    terminal_name_zh: str
    system: str
    system_zh: str
    planet: str = ""
    planet_zh: str = ""
    buy_price: Optional[int] = None  # Terminal buys (you sell here)
    sell_price: Optional[int] = None  # Terminal sells (you buy here)
    price_star: int = 0  # UEX price rating


class CommodityPricesResponse(BaseModel):
    commodity_id: int
    commodity_name: str
    commodity_name_zh: str
    buy_prices: List[PriceEntry]  # Terminals that BUY this commodity (you sell to them)
    sell_prices: List[PriceEntry]  # Terminals that SELL this commodity (you buy from them)


class WarbondItem(BaseModel):
    name: str
    category: str  # "ccu", "standalone_ship", "package", "other"
    category_zh: str  # "升级包", "单船", "游戏包", "其他"
    warbond_price: Optional[int] = None  # in USD cents
    standard_price: Optional[int] = None  # in USD cents
    rsi_url: str  # link to RSI store page
    image_url: Optional[str] = None


class WarbondResponse(BaseModel):
    last_updated: str  # ISO datetime
    ccu_items: List[WarbondItem]
    standalone_ships: List[WarbondItem]
    package_items: List[WarbondItem]
    other_items: List[WarbondItem]
