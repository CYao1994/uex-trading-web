"""
Warbond Scraper Service
Fetches current warbond items from starnotifier.com and RSI store API.
Caches results for 1 hour to avoid excessive requests.
"""

import subprocess
import json
import re
import time
from datetime import datetime, timezone

_cache = {
    "data": None,
    "timestamp": 0,
}
_CACHE_TTL = 3600  # 1 hour in seconds

# RSI store base URL
RSI_STORE_BASE = "https://robertsspaceindustries.com"
RSI_WARBOND_STORE_URL = f"{RSI_STORE_BASE}/store/pledge/browse/extras/standalone-ships?sort=weight&direction=desc"
RSI_SHIPS_URL = f"{RSI_STORE_BASE}/store/pledge/browse/extras/standalone-ships?sort=weight&direction=desc"
RSI_UPGRADES_URL = f"{RSI_STORE_BASE}/store/pledge/browse/extras/ship-upgrades?sort=weight&direction=desc"

# Chinese name mapping for common Star Citizen ships and items
SHIP_NAME_ZH = {
    # Small ships
    "Aurora": "极光",
    "Aurora Mk II plus Combat Module": "极光 Mk II + 战斗模块",
    "Mustang": "野马",
    "Reliant": "信赖",
    "Arrow": "箭矢",
    "Buccaneer": "海盗",
    "Drake Buccaneer plus Flight Blades Kit": "德雷克 海盗 + 飞行刃套件",
    "Gladius": "角斗士",
    "Eclipse": "日蚀",
    "Hurricane": "飓风",
    "Vanguard": "先锋",
    "Hornet": "大黄蜂",
    "Super Hornet": "超级大黄蜂",
    "Sabre": "军刀",
    "Sabre Comet": "军刀 彗星",
    "Blade": "刃",
    "Scythe": "镰刀",
    "Glaive": "阔剑",
    "Khartu-Al": "卡尔图-阿尔",
    "Defender": "守卫者",
    "Prowler": "潜行者",
    "Banu Merchantman": "巴努 商人",
    "Nox": "nox",
    "X1": "X1",
    "Dragonfly": "蜻蜓",
    "Archimedes": "阿基米德",
    "Merlin": "梅林",
    "Snub": "子舰",

    # Medium ships
    "Avenger": "复仇者",
    "300i": "300i",
    "315p": "315p",
    "325a": "325a",
    "350r": "350r",
    "Cutlass": "弯刀",
    "Cutlass Black": "弯刀 黑色",
    "Freelancer": "游侠",
    "Freelancer MAX": "游侠 MAX",
    "Freelancer DUR": "游侠 DUR",
    "Freelancer MIS": "游侠 MIS",
    "Constellation": "星座",
    "Andromeda": "仙女座",
    "Aquila": "天鹰座",
    "Phoenix": "凤凰座",
    "Taurus": "金牛座",
    "Crucible": "熔炉",
    "Retaliator": "报复者",
    "Caterpillar": "毛虫",
    "Hull A": "货舱 A",
    "Hull B": "货舱 B",
    "Hull C": "货舱 C",
    "Hull D": "货舱 D",
    "Hull E": "货舱 E",
    "Starfarer": "星运者",
    "Genesis": "创世纪",

    # Large ships
    "Reclaimer": "回收者",
    "Carrack": "卡拉卡",
    "890 Jump": "890 跃迁",
    "600i": "600i",
    "600i Explorer": "600i 探索者",
    "Phoenix": "凤凰座",
    "Corsair": "海盗船",
    "Crusader": "十字军",
    "A2": "A2 星际运兵船",
    "C2": "C2 星际运输船",
    "M2": "M2 星际重型运输船",
    "Vulcan": "火神",
    "Polaris": "北极星",
    "Idris": "伊德里斯",
    "Javelin": "标枪",

    # Drake ships
    "Drake Clipper plus Flight Blades Kit": "德雷克 飞剪船 + 飞行刃套件",

    # Anvil ships
    "Anvil Gladiator plus S5 Bomb Rack Weapon Kit": "铁砧 角斗士 + S5 炸弹架武器套件",

    # Misc/Unique
    "Liberator": "解放者",
    "Ironclad": "铁甲",
    "Ironclad Assault": "铁甲 突击型",
    "M80": "M80",
    "Tiburon": "提伯龙",
    "Pitbull": "比特犬",
    "Starlite": "星光",
    "Kruger L-21 Wolf plus Flight Blades Kit": "克鲁格 L-21 狼 + 飞行刃套件",

    # RSI ships
    "Apollo": "阿波罗",
    "Zeus": "宙斯",
    "Zeus Mk II": "宙斯 Mk II",
    "Zeus Mk II ES": "宙斯 Mk II ES",
    "Zeus Mk II CL": "宙斯 Mk II CL",
    "Nyx": "夜神",
    "Mantis": "螳螂",

    # Misc manufacturers
    "Razor": "剃刀",
    "Razor EX": "剃刀 EX",
    "Razor LX": "剃刀 LX",
    "M50": "M50",
    "Racer": "竞速者",
    "MP5U": "MP5U",
    "URSA": "URSA",
    "Rover": "漫游车",
    "Cyclone": "旋风",
    "Nova": "新星",
    "Tank": "坦克",
    "Ballista": "弩炮",
    "Tread": "履带",

    # Package / Game items
    "Squadron 42": "第42中队",
    "Star Citizen": "星际公民",
    "Game Package": "游戏包",
    "Starter Package": "新手包",

    # Paint categories
    "Paint": "涂装",
    "Skin": "皮肤",

    # Equipment
    "Weapon": "武器",
    "Shield": "护盾",
    "Power Plant": "发电厂",
    "Cooler": "冷却器",
    "Quantum Drive": "量子驱动",
    "Engine": "引擎",
    "Missile": "导弹",
    "Gun": "火炮",
    "Turret": "炮塔",
}

# RSI media image URL pattern for ships
# Format: https://media.robertsspaceindustries.com/{slug}/heap_infobox/{ship-name}.jpg
# We'll try to construct image URLs based on the item name


def _get_name_zh(name: str) -> str:
    """Get Chinese name for a ship/item. Returns original name if no mapping."""
    # Exact match first
    if name in SHIP_NAME_ZH:
        return SHIP_NAME_ZH[name]
    # Try partial match (e.g., "Cutlass Black Warbond" -> "Cutlass Black")
    for eng, zh in SHIP_NAME_ZH.items():
        if name.startswith(eng):
            return zh + name[len(eng):]
    return name


def _get_image_url(name: str) -> str:
    """Generate RSI media image URL for a ship/item."""
    # Convert ship name to URL slug
    slug = name.lower().replace(" ", "-")
    # Remove special characters
    slug = re.sub(r'[^a-z0-9-]', '', slug)
    # Use the RSI media CDN pattern
    return f"https://media.robertsspaceindustries.com/{slug}/heap_infobox/{slug}.jpg"


def _curl_get(url: str, timeout: int = 15) -> str:
    """HTTP GET via curl with TLS 1.2 fallback."""
    result = subprocess.run(
        ["curl", "-s", "-k", "--tlsv1.2", url],
        capture_output=True, text=True, timeout=timeout
    )
    return result.stdout


def _parse_starnotifier(html: str) -> dict:
    """Parse starnotifier.com/daily-warbonds HTML page."""
    result = {
        "ccu_items": [],
        "standalone_ships": [],
        "package_items": [],
        "equipment_items": [],
        "paint_items": [],
        "combo_items": [],
        "other_items": [],
        "last_crawled": None,
    }

    # Extract last crawled date
    crawled_match = re.search(r'Last Data Crawled:.*?class="italic">(.*?)</span>', html, re.DOTALL)
    if crawled_match:
        result["last_crawled"] = crawled_match.group(1).strip()

    # Split into sections by <main> tags
    sections = re.findall(r'<main[^>]*>(.*?)</main>', html, re.DOTALL)

    for section in sections:
        # Determine section type
        is_ccu = "CCU Warbond" in section or ("CCU" in section and "Warbond" in section)
        is_standalone = "standalone" in section.lower()

        # Extract items: <li><b>Name</b><ul><li><i>Warbond Edition 525$</i></li>...</ul></li>
        items_raw = re.findall(
            r'<li>\s*<b>(.*?)</b>\s*<ul>(.*?)</ul>',
            section, re.DOTALL
        )

        for name, details_html in items_raw:
            name = name.strip()
            warbond_price = None
            standard_price = None

            detail_items = re.findall(r'<i>(.*?)</i>', details_html)
            for detail in detail_items:
                detail = detail.strip()
                price_match = re.search(r'(\d+)\$', detail)
                if price_match:
                    price_val = int(price_match.group(1)) * 100  # Convert to cents
                    if "Warbond" in detail:
                        warbond_price = price_val
                    elif "Standard" in detail:
                        standard_price = price_val

            # Detect category from name
            category, category_zh = _classify_item(name, is_ccu, is_standalone)

            item = {
                "name": name,
                "name_zh": _get_name_zh(name),
                "category": category,
                "category_zh": category_zh,
                "warbond_price": warbond_price,
                "standard_price": standard_price,
                "image_url": _get_image_url(name),
            }

            _add_to_category(result, item)

        # Also check for standalone ships without prices (plain <li>Name</li>)
        plain_items = re.findall(r'<li>\s*\n\s*([A-Za-z0-9][^\n<]+?)\s*\n\s*</li>', section)
        for name in plain_items:
            name = name.strip()
            # Check if already added
            existing_names = {i["name"] for i in result["standalone_ships"]}
            existing_names.update({i["name"] for i in result["combo_items"]})
            if name in existing_names:
                continue

            category, category_zh = _classify_item(name, is_ccu, is_standalone)

            item = {
                "name": name,
                "name_zh": _get_name_zh(name),
                "category": category,
                "category_zh": category_zh,
                "warbond_price": None,
                "standard_price": None,
                "image_url": _get_image_url(name),
            }

            _add_to_category(result, item)

    return result


def _classify_item(name: str, is_ccu: bool, is_standalone: bool) -> tuple:
    """Classify an item into a category. Only CCU and standalone_ship are kept."""
    if is_ccu:
        return "ccu", "升级包"
    if is_standalone:
        return "standalone_ship", "单船"
    # Items that are not CCU or standalone ships are ignored
    return "other", "其他"


def _add_to_category(result: dict, item: dict):
    """Add item to the appropriate category list in result."""
    cat = item["category"]
    if cat == "ccu":
        result["ccu_items"].append(item)
    elif cat == "standalone_ship":
        result["standalone_ships"].append(item)
    elif cat == "package":
        result["package_items"].append(item)
    elif cat == "equipment":
        result["equipment_items"].append(item)
    elif cat == "paint":
        result["paint_items"].append(item)
    elif cat == "combo":
        result["combo_items"].append(item)
    else:
        result["other_items"].append(item)


def fetch_warbonds() -> dict:
    """Fetch current warbond items. Uses cache if available."""
    now = time.time()

    # Return cache if fresh
    if _cache["data"] and (now - _cache["timestamp"]) < _CACHE_TTL:
        return _cache["data"]

    try:
        html = _curl_get("https://starnotifier.com/daily-warbonds")
        if not html:
            raise Exception("Empty response from starnotifier")

        parsed = _parse_starnotifier(html)

        # Build response (only CCU and standalone ships)
        response = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "rsi_store_url": RSI_WARBOND_STORE_URL,
            "ccu_items": parsed["ccu_items"],
            "standalone_ships": parsed["standalone_ships"],
        }

        # Update cache
        _cache["data"] = response
        _cache["timestamp"] = now

        return response

    except Exception as e:
        # Return stale cache if available, otherwise empty
        if _cache["data"]:
            return _cache["data"]
        return {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "rsi_store_url": RSI_WARBOND_STORE_URL,
            "ccu_items": [],
            "standalone_ships": [],
            "error": str(e),
        }
