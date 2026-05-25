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

# Manufacturer English → Chinese mapping (official from global.ini)
MANUFACTURER_ZH = {
    "Aegis": "圣盾",
    "Anvil": "铁砧",
    "Argo": "南船座",
    "Banu": "巴努",
    "Consolidated Outland": "联合外域",
    "Crusader": "十字军",
    "Drake": "德雷克",
    "Esperia": "埃斯佩里亚",
    "Greycat": "灰猫",
    "Kruger": "克鲁格",
    "MISC": "武藏",
    "Origin": "起源",
    "RSI": "RSI",
    "Tumbril": "盾博尔",
    "Xi'an": "奥波亚",
    "Gatac": "盖塔克",
    "Vanduul": "剜度",
}

# Chinese name mapping for Star Citizen ships — based on official global.ini translations
# Format: "{制造商中文名} {船型中文名}" following the official localization convention
SHIP_NAME_ZH = {
    # ========== RSI ==========
    "Aurora": "RSI 极光",
    "Aurora ES": "RSI 极光 ES",
    "Aurora MR": "RSI 极光 MR",
    "Aurora CL": "RSI 极光 CL",
    "Aurora LX": "RSI 极光 LX",
    "Aurora LN": "RSI 极光 LN",
    "Aurora Mk II": "RSI 极光 Mk II",
    "Aurora Mk II plus Combat Module": "RSI 极光 Mk II + 战斗模块",
    "Constellation Andromeda": "RSI 星座 仙女座",
    "Constellation Aquila": "RSI 星座 天鹰座",
    "Constellation Phoenix": "RSI 星座 凤凰座",
    "Constellation Taurus": "RSI 星座 金牛座",
    "Mantis": "RSI 螳螂",
    "Polaris": "RSI 北极星",
    "Perseus": "RSI 英仙座",
    "Scorpius": "RSI 天蝎座",
    "Ursa Rover": "RSI 大熊座漫游车",
    "Zeus Mk II ES": "RSI 宙斯 Mk II ES",
    "Zeus Mk II CL": "RSI 宙斯 Mk II CL",
    "Apollo": "RSI 阿波罗",

    # ========== Aegis (圣盾) ==========
    "Avenger": "圣盾 复仇者",
    "Avenger Stalker": "圣盾 复仇者 追猎",
    "Avenger Titan": "圣盾 复仇者 泰坦",
    "Avenger Warlock": "圣盾 复仇者 术士",
    "Avenger Renegade": "圣盾 复仇者 变节者",
    "Eclipse": "圣盾 日蚀",
    "Gladius": "圣盾 短剑",
    "Gladius Valiant": "圣盾 短剑 勇士",
    "Hammerhead": "圣盾 锤头鲨",
    "Idris": "圣盾 伊德里斯",
    "Javelin": "圣盾 标枪",
    "Nautilus": "圣盾 鹦鹉螺",
    "Reclaimer": "圣盾 回收者",
    "Redeemer": "圣盾 救赎",
    "Retaliator": "圣盾 报复者",
    "Retaliator Bomber": "圣盾 报复者 轰炸",
    "Sabre": "圣盾 军刀",
    "Sabre Comet": "圣盾 军刀 彗星",
    "Sabre Raven": "圣盾 军刀 渡鸦",
    "Vanguard Warden": "圣盾 先锋 典狱长",
    "Vanguard Harbinger": "圣盾 先锋 先驱",
    "Vanguard Hoplite": "圣盾 先锋 重装",
    "Vanguard Sentinel": "圣盾 先锋 哨兵",
    "Vulcan": "圣盾 火神",
    "Carrack": "圣盾 远征者",

    # ========== Anvil (铁砧) ==========
    "Arrow": "铁砧 箭矢",
    "Ballista": "铁砧 弩炮",
    "Ballista Dunestalker": "铁砧 弩炮 沙丘追猎者",
    "Ballista Snowblind": "铁砧 弩炮 雪盲",
    "C8 Pisces": "铁砧 C8 双鱼座",
    "C8X Pisces Expedition": "铁砧 C8X 双鱼座探索",
    "Crucible": "铁砧 坩埚",
    "Gladiator": "铁砧 角斗士",
    "Hawk": "铁砧 猎鹰",
    "Hornet": "铁砧 F7C 大黄蜂",
    "Hornet F7C": "铁砧 F7C 大黄蜂",
    "Hornet F7C Wildfire": "铁砧 F7C 大黄蜂 野火",
    "Hornet F7CM": "铁砧 F7C-M 超级大黄蜂",
    "Super Hornet": "铁砧 F7C-M 超级大黄蜂",
    "F7C Hornet": "铁砧 F7C 大黄蜂",
    "F7C-M Super Hornet": "铁砧 F7C-M 超级大黄蜂",
    "F7C-R Hornet Tracker": "铁砧 F7C-R 大黄蜂 追踪者",
    "F7C-S Hornet Ghost": "铁砧 F7C-S 大黄蜂 幽灵",
    "F8 Lightning": "铁砧 F8 闪电",
    "Hurricane": "铁砧 飓风",
    "Liberator": "铁砧 解放者",
    "Spartan": "铁砧 斯巴达",
    "Terrapin": "铁砧 水龟",
    "Valkyrie": "铁砧 女武神",

    # ========== Argo (南船座/南船) ==========
    "MPUV Cargo": "南船座 MPUV 货运",
    "MPUV Personnel": "南船座 MPUV 载人",
    "MOLE": "南船座 鼹鼠",
    "MOLE Carbon": "南船座 鼹鼠 炭黑",
    "MOLE Talus": "南船座 鼹鼠 岩白",
    "RAFT": "南船 RAFT",
    "SRV": "南船 SRV",

    # ========== Banu (巴努) ==========
    "Defender": "巴努 防卫者",
    "Merchantman": "巴努 商船",
    "Banu Merchantman": "巴努 商船",

    # ========== Consolidated Outland (联合外域) ==========
    "Mustang": "联合外域 野马",
    "Mustang Alpha": "联合外域 野马-阿尔法",
    "Mustang Beta": "联合外域 野马-贝塔",
    "Mustang Delta": "联合外域 野马-德尔塔",
    "Mustang Gamma": "联合外域 野马-伽马",
    "Mustang Omega": "联合外域 野马-欧米伽",
    "Nomad": "联合外域 游牧者",
    "Pioneer": "联合外域 开拓者",

    # ========== Crusader (十字军) ==========
    "Mercury Star Runner": "十字军 墨丘利 星际快运船",
    "Ares Inferno": "十字军 战神 星际战斗机 地狱火",
    "Ares Ion": "十字军 战神 星际战斗机 离子光",
    "C2 Hercules": "十字军 C2 大力神 星际运输船",
    "M2 Hercules": "十字军 M2 大力神 星际运输船",
    "A2 Hercules": "十字军 A2 大力神 星际运输船",
    "C2": "十字军 C2 大力神 星际运输船",
    "M2": "十字军 M2 大力神 星际运输船",
    "A2": "十字军 A2 大力神 星际运输船",
    "Genesis": "十字军 创世纪 星际航线",
    "Genesis Starliner": "十字军 创世纪 星际航线",

    # ========== Drake (德雷克) ==========
    "Buccaneer": "德雷克 掠夺者",
    "Caterpillar": "德雷克 毛虫",
    "Corsair": "德雷克 海盗船",
    "Cutlass": "德雷克 弯刀",
    "Cutlass Black": "德雷克 黑弯刀",
    "Cutlass Blue": "德雷克 蓝弯刀",
    "Cutlass Red": "德雷克 红弯刀",
    "Dragonfly": "德雷克 蜻蜓",
    "Herald": "德雷克 信使",
    "Kraken": "德雷克 海妖",
    "Vulture": "德雷克 秃鹫",
    "Clipper": "德雷克 飞剪船",
    "Ironclad": "德雷克 铁甲",
    "Ironclad Assault": "德雷克 铁甲 突击型",

    # ========== Esperia (埃斯佩里亚) ==========
    "Prowler": "埃斯佩里亚 徘徊者",
    "Talon": "埃斯佩里亚 利爪",
    "Talon Shrike": "埃斯佩里亚 利爪 伯劳",
    "Blade": "埃斯佩里亚 刀锋",
    "Glaive": "埃斯佩里亚 长刀",

    # ========== Vanduul (剜度) ==========
    "Scythe": "剜度 死镰",

    # ========== Greycat (灰猫) ==========
    "PTV": "灰猫 PTV",
    "ROC": "灰猫 ROC",
    "ROC-DS": "灰猫 ROC-DS",

    # ========== Kruger (克鲁格) ==========
    "Merlin": "克鲁格 P-52 梅林",
    "P-52 Merlin": "克鲁格 P-52 梅林",
    "Archimedes": "克鲁格 P-72 阿基米德",
    "P-72 Archimedes": "克鲁格 P-72 阿基米德",

    # ========== MISC (武藏) ==========
    "Freelancer": "武藏 自由枪骑兵",
    "Freelancer MAX": "武藏 自由枪骑兵 MAX",
    "Freelancer DUR": "武藏 自由枪骑兵 DUR",
    "Freelancer MIS": "武藏 自由枪骑兵 MIS",
    "Hull A": "武藏 货轮 A",
    "Hull B": "武藏 货轮 B",
    "Hull C": "武藏 货轮 C",
    "Hull D": "武藏 货轮 D",
    "Hull E": "武藏 货轮 E",
    "Prospector": "武藏 勘探者",
    "Razor": "武藏 剃刀",
    "Razor EX": "武藏 剃刀 EX",
    "Razor LX": "武藏 剃刀 LX",
    "Reliant": "武藏 信赖",
    "Reliant Mako": "武藏 信赖 新闻",
    "Reliant Sen": "武藏 信赖 科考",
    "Reliant Tana": "武藏 信赖 武装",
    "Starfarer": "武藏 星际远航者",
    "Starfarer Gemini": "武藏 星际远航者 双子座",
    "Endeavor": "武藏 奋进",
    "Odyssey": "武藏 奥德赛",

    # ========== Origin (起源) ==========
    "100i": "起源 100i",
    "125a": "起源 125a",
    "135c": "起源 135c",
    "300i": "起源 300i",
    "315p": "起源 315p",
    "325a": "起源 325a",
    "350r": "起源 350r",
    "400i": "起源 400i",
    "600i": "起源 600i",
    "600i Explorer": "起源 600i 旅行版",
    "85X": "起源 85X",
    "890 Jump": "起源 890 跃动",
    "M50": "起源 M50 拦截者",

    # ========== Tumbril (盾博尔) ==========
    "Cyclone": "盾博尔 旋风",
    "Cyclone AA": "盾博尔 旋风 AA",
    "Cyclone MT": "盾博尔 旋风 MT",
    "Cyclone RC": "盾博尔 旋风 RC",
    "Cyclone RN": "盾博尔 旋风 RN",
    "Cyclone TR": "盾博尔 旋风 TR",
    "Nova": "盾博尔 新星",
    "Ranger TR": "盾博尔 游骑兵 TR",

    # ========== Xi'an / Gatac (奥波亚 / 盖塔克) ==========
    "Nox": "奥波亚 Nox",
    "Nox Kue": "奥波亚 Nox Kue",
    "Khartu-Al": "奥波亚 卡图",
    "Railen": "盖塔克 锐伦",
    "X1": "奥波亚 X1",

    # ========== Combo items (manufacturer + ship + kit) ==========
    "Drake Buccaneer plus Flight Blades Kit": "德雷克 掠夺者 + 飞行刃套件",
    "Drake Clipper plus Flight Blades Kit": "德雷克 飞剪船 + 飞行刃套件",
    "Anvil Gladiator plus S5 Bomb Rack Weapon Kit": "铁砧 角斗士 + S5 炸弹架武器套件",
    "Kruger L-21 Wolf plus Flight Blades Kit": "克鲁格 L-21 狼 + 飞行刃套件",

    # ========== Concept / New ships not yet in global.ini ==========
    "M80": "M80",
    "Tiburon": "提伯龙",
    "Pitbull": "比特犬",
    "Starlite": "星光",
    "Zeus Mk II": "RSI 宙斯 Mk II",
    "Nyx": "RSI 夜神",

    # ========== Game / Package items ==========
    "Squadron 42": "第42中队",
    "Star Citizen": "星际公民",
    "Game Package": "游戏包",
    "Starter Package": "新手包",

    # ========== Paint / Skin ==========
    "Paint": "涂装",
    "Skin": "皮肤",

    # ========== Equipment ==========
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
    """Get Chinese name for a ship/item. Returns original name if no mapping.

    Matching priority:
    1. Exact match in SHIP_NAME_ZH
    2. Prefix match (e.g., "Cutlass Black Warbond" → "德雷克 黑弯刀" + " Warbond")
    3. Strip known manufacturer prefix and match base name
       (e.g., "Aegis Gladius" → strip "Aegis " → match "Gladius" → "圣盾 短剑")
    """
    # 1. Exact match
    if name in SHIP_NAME_ZH:
        return SHIP_NAME_ZH[name]

    # 2. Prefix match (handles suffixes like " Warbond Edition", etc.)
    for eng, zh in sorted(SHIP_NAME_ZH.items(), key=lambda x: -len(x[0])):
        if name.startswith(eng):
            return zh + name[len(eng):]

    # 3. Strip manufacturer prefix and try matching base name
    for mfr_en, mfr_zh in MANUFACTURER_ZH.items():
        prefix = mfr_en + " "
        if name.startswith(prefix):
            base = name[len(prefix):]
            # Exact match on base name
            if base in SHIP_NAME_ZH:
                return SHIP_NAME_ZH[base]
            # Prefix match on base name
            for eng, zh in sorted(SHIP_NAME_ZH.items(), key=lambda x: -len(x[0])):
                if base.startswith(eng):
                    return zh + base[len(eng):]
            # No match on base, return manufacturer + original base
            return mfr_zh + " " + base

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
