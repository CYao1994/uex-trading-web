"""
Warbond Scraper Service
Fetches current warbond items from starnotifier.com and RSI store API.
Uses centralized TTL cache from cache.py.

HTTP requests use Python's built-in urllib.request instead of subprocess+curl,
because EdgeOne Cloud Functions may not have the curl binary available.
"""

import json
import re
import ssl
import time
import urllib.request
from datetime import datetime, timezone

from services.cache import warbond_cache

# RSI store base URL
RSI_STORE_BASE = "https://robertsspaceindustries.com"
RSI_WARBOND_STORE_URL = f"{RSI_STORE_BASE}/store/pledge/browse/extras/standalone-ships?sort=weight&direction=desc"
RSI_SHIPS_URL = f"{RSI_STORE_BASE}/store/pledge/browse/extras/standalone-ships?sort=weight&direction=desc"
RSI_UPGRADES_URL = f"{RSI_STORE_BASE}/store/pledge/browse/extras/ship-upgrades?sort=weight&direction=desc"

RSI_GRAPHQL_URL = "https://robertsspaceindustries.com/graphql"

RSI_CATEGORIES = {
    76: "Ship Upgrades",    # CCU
    72: "Standalone Ships",
    289: "Gear",
    45: "Package",
    270: "Packs",
    3: "Add-Ons",
}

# Category display order
CATEGORY_ORDER = ["Ship Upgrades", "Gear", "Standalone Ships", "Package", "Packs", "Add-Ons"]

# Chinese category name mapping
CATEGORY_ZH = {
    "Ship Upgrades": "CCU",
    "Standalone Ships": "独立飞船",
    "Package": "游戏�?,
    "Gear": "装备",
    "Packs": "组合�?,
    "Add-Ons": "附加物品",
}

# Manufacturer English to Chinese mapping (official from global.ini)
MANUFACTURER_ZH = {
    "Aegis": "艾吉�?,
    "Anvil": "安维�?,
    "Argo": "阿尔�?,
    "Banu": "巴努",
    "Consolidated Outland": "联合外星",
    "Crusader": "十字�?,
    "Drake": "德雷�?,
    "Esperia": "艾斯佩里�?,
    "Greycat": "灰猫",
    "Kruger": "克鲁�?,
    "MISC": "MISC",
    "Origin": "起源",
    "RSI": "RSI",
    "Tumbril": "坦布里尔",
    "Xi'an": "西安",
    "Gatac": "加塔�?,
    "Vanduul": "范杜�?,
}


def _build_query(category_id: int, page: int = 1, limit: int = 50) -> list:
    return [{
        "operationName": "CatalogItemsWidgetViewQuery",
        "variables": {
            "query": {
                "skus": {"products": [str(category_id)]},
                "page": page,
                "limit": limit
            },
            "storeFront": "pledge"
        },
        "query": """query CatalogItemsWidgetViewQuery($query: SearchQuery, $storeFront: String = \"pledge\") {
            store(name: $storeFront, browse: true) {
                search(query: $query) {
                    count
                    totalCount
                    resources {
                        id
                        slug
                        name
                        title
                        type
                        url
                        price { amount discounted }
                        nativePrice { amount discounted discountDescription }
                        ... on TySku { isWarbond isPackage label }
                        ... on TyBundle { isVip }
                    }
                }
            }
        }"""
    }]


# Chinese name mapping for Star Citizen ships - based on official global.ini translations
SHIP_NAME_ZH = {
    # ========== RSI ==========
    "Aurora": "RSI 极光",
    "Aurora ES": "RSI 极光 ES",
    "Aurora MR": "RSI 极光 MR",
    "Aurora CL": "RSI 极光 CL",
    "Aurora LX": "RSI 极光 LX",
    "Aurora Mk II": "RSI 极光 Mk II",
    "Aurora Mk II plus Combat Module": "RSI 极光 Mk II + 战斗模块",
    "Constellation Andromeda": "RSI 仙女�?,
    "Constellation Aquila": "RSI 天鹰�?,
    "Constellation Phoenix": "RSI 凤凰�?,
    "Constellation Taurus": "RSI 金牛�?,
    "Mantis": "RSI 螳螂",
    "Polaris": "RSI 北极�?,
    "Perseus": "RSI 英仙�?,
    "Scorpius": "RSI 天蝎�?,
    "Ursa Rover": "RSI 天鹅座探测车",
    "Zeus Mk II ES": "RSI 宙斯 Mk II ES",
    "Zeus Mk II CL": "RSI 宙斯 Mk II CL",
    "Apollo": "RSI 阿波�?,

    # ========== Aegis (艾吉�? ==========
    "Avenger": "艾吉�?复仇�?,
    "Avenger Stalker": "艾吉�?复仇�?追踪�?,
    "Avenger Titan": "艾吉�?复仇�?泰坦",
    "Avenger Warlock": "艾吉�?复仇�?战争�?,
    "Avenger Renegade": "艾吉�?复仇�?叛逆�?,
    "Eclipse": "艾吉�?日蚀",
    "Gladius": "艾吉�?格拉迪乌�?,
    "Gladius Valiant": "艾吉�?格拉迪乌�?勇士",
    "Hammerhead": "艾吉�?锤头�?,
    "Idris": "艾吉�?伊德里斯",
    "Javelin": "艾吉�?标枪",
    "Nautilus": "艾吉�?鹦鹉�?,
    "Reclaimer": "艾吉�?回收�?,
    "Redeemer": "艾吉�?救赎�?,
    "Retaliator": "艾吉�?报复�?,
    "Retaliator Bomber": "艾吉�?报复�?轰炸�?,
    "Sabre": "艾吉�?军刀",
    "Sabre Comet": "艾吉�?军刀 彗星",
    "Sabre Raven": "艾吉�?军刀 渡鸦",
    "Vanguard Warden": "艾吉�?先锋 守望�?,
    "Vanguard Harbinger": "艾吉�?先锋 先驱�?,
    "Vanguard Hoplite": "艾吉�?先锋 重装�?,
    "Vanguard Sentinel": "艾吉�?先锋 哨兵",
    "Vulcan": "艾吉�?伏尔�?,
    "Carrack": "艾吉�?卡拉�?,

    # ========== Anvil (安维�? ==========
    "Arrow": "安维�?箭矢",
    "Ballista": "安维�?弩炮",
    "Ballista Dunestalker": "安维�?弩炮 沙丘猎手",
    "Ballista Snowblind": "安维�?弩炮 雪盲",
    "C8 Pisces": "安维�?C8 双鱼�?,
    "C8X Pisces Expedition": "安维�?C8X 双鱼�?远征�?,
    "Crucible": "安维�?坩埚",
    "Gladiator": "安维�?角斗�?,
    "Hawk": "安维�?�?,
    "Hornet": "安维�?F7C 大黄�?,
    "Hornet F7C": "安维�?F7C 大黄�?,
    "Hornet F7C Wildfire": "安维�?F7C 大黄�?野火",
    "Hornet F7CM": "安维�?F7C-M 超级大黄�?,
    "Super Hornet": "安维�?F7C-M 超级大黄�?,
    "F7C Hornet": "安维�?F7C 大黄�?,
    "F7C-M Super Hornet": "安维�?F7C-M 超级大黄�?,
    "F7C-R Hornet Tracker": "安维�?F7C-R 大黄�?追踪�?,
    "F7C-S Hornet Ghost": "安维�?F7C-S 大黄�?幽灵",
    "F8 Lightning": "安维�?F8 闪电",
    "Hurricane": "安维�?飓风",
    "Liberator": "安维�?解放�?,
    "Spartan": "安维�?斯巴达人",
    "Terrapin": "安维�?陆龟",
    "Valkyrie": "安维�?女武�?,

    # ========== Argo (阿尔�?联合) ==========
    "MPUV Cargo": "阿尔�?MPUV 货运",
    "MPUV Personnel": "阿尔�?MPUV 人员",
    "MOLE": "阿尔�?蚂蚁",
    "MOLE Carbon": "阿尔�?蚂蚁 �?,
    "MOLE Talus": "阿尔�?蚂蚁 塔卢�?,
    "RAFT": "联合 RAFT",
    "SRV": "联合 SRV",

    # ========== Banu (巴努) ==========
    "Defender": "巴努 防御�?,
    "Merchantman": "巴努 商人",
    "Banu Merchantman": "巴努 商人",

    # ========== Consolidated Outland (联合外星) ==========
    "Mustang": "联合外星 野马",
    "Mustang Alpha": "联合外星 野马-阿尔�?,
    "Mustang Beta": "联合外星 野马-贝塔",
    "Mustang Delta": "联合外星 野马-德尔�?,
    "Mustang Gamma": "联合外星 野马-伽马",
    "Mustang Omega": "联合外星 野马-欧米�?,
    "Nomad": "联合外星 游牧�?,
    "Pioneer": "联合外星 先驱�?,

    # ========== Crusader (十字�? ==========
    "Mercury Star Runner": "十字�?水星 星际跑�?,
    "Ares Inferno": "十字�?阿瑞�?地狱�?战斗�?,
    "Ares Ion": "十字�?阿瑞�?离子 战斗�?,
    "C2 Hercules": "十字�?C2 大力�?运输�?,
    "M2 Hercules": "十字�?M2 大力�?运输�?,
    "A2 Hercules": "十字�?A2 大力�?运输�?,
    "C2": "十字�?C2 大力�?运输�?,
    "M2": "十字�?M2 大力�?运输�?,
    "A2": "十字�?A2 大力�?运输�?,
    "Genesis": "十字�?创世�?客运�?,
    "Genesis Starliner": "十字�?创世�?客运�?,

    # ========== Drake (德雷�? ==========
    "Buccaneer": "德雷�?海盗",
    "Caterpillar": "德雷�?毛虫",
    "Corsair": "德雷�?海盗�?,
    "Cutlass": "德雷�?短剑",
    "Cutlass Black": "德雷�?短剑 黑色",
    "Cutlass Blue": "德雷�?短剑 蓝色",
    "Cutlass Red": "德雷�?短剑 红色",
    "Dragonfly": "德雷�?蜻蜓",
    "Herald": "德雷�?先驱",
    "Kraken": "德雷�?克拉�?,
    "Vulture": "德雷�?秃鹫",
    "Clipper": "德雷�?剪刀",
    "Ironclad": "德雷�?铁甲",
    "Ironclad Assault": "德雷�?铁甲 突击",

    # ========== Esperia (艾斯佩里�? ==========
    "Prowler": "艾斯佩里�?潜行�?,
    "Talon": "艾斯佩里�?利爪",
    "Talon Shrike": "艾斯佩里�?利爪 啼鸟",
    "Blade": "艾斯佩里�?刀�?,
    "Glaive": "艾斯佩里�?长矛",

    # ========== Vanduul (范杜�? ==========
    "Scythe": "范杜�?镰刀",

    # ========== Greycat (灰猫) ==========
    "PTV": "灰猫 PTV",
    "ROC": "灰猫 ROC",
    "ROC-DS": "灰猫 ROC-DS",

    # ========== Kruger (克鲁�? ==========
    "Merlin": "克鲁�?P-52 梅林",
    "P-52 Merlin": "克鲁�?P-52 梅林",
    "Archimedes": "克鲁�?P-72 阿基米德",
    "P-72 Archimedes": "克鲁�?P-72 阿基米德",

    # ========== MISC (MISC) ==========
    "Freelancer": "MISC 自由枪骑�?,
    "Freelancer MAX": "MISC 自由枪骑�?MAX",
    "Freelancer DUR": "MISC 自由枪骑�?DUR",
    "Freelancer MIS": "MISC 自由枪骑�?MIS",
    "Hull A": "MISC 船体 A",
    "Hull B": "MISC 船体 B",
    "Hull C": "MISC 船体 C",
    "Hull D": "MISC 船体 D",
    "Hull E": "MISC 船体 E",
    "Prospector": "MISC 探矿�?,
    "Razor": "MISC 剃刀",
    "Razor EX": "MISC 剃刀 EX",
    "Razor LX": "MISC 剃刀 LX",
    "Reliant": "MISC 依赖",
    "Reliant Mako": "MISC 依赖 真鲨",
    "Reliant Sen": "MISC 依赖 �?,
    "Reliant Tana": "MISC 依赖 塔纳",
    "Starfarer": "MISC 星际矿工",
    "Starfarer Gemini": "MISC 星际矿工 双子�?,
    "Endeavor": "MISC 奋进�?,
    "Odyssey": "MISC 奥德�?,

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
    "600i Explorer": "起源 600i 探索�?,
    "85X": "起源 85X",
    "890 Jump": "起源 890 跃动",
    "M50": "起源 M50 竞速�?,

    # ========== Tumbril (坦布里尔) ==========
    "Cyclone": "坦布里尔 旋风",
    "Cyclone AA": "坦布里尔 旋风 AA",
    "Cyclone MT": "坦布里尔 旋风 MT",
    "Cyclone RC": "坦布里尔 旋风 RC",
    "Cyclone RN": "坦布里尔 旋风 RN",
    "Cyclone TR": "坦布里尔 旋风 TR",
    "Nova": "坦布里尔 新星",
    "Ranger TR": "坦布里尔 游侠 TR",

    # ========== Xi'an / Gatac (西安 / 加塔�? ==========
    "Nox": "西安 Nox",
    "Nox Kue": "西安 Nox Kue",
    "Khartu-Al": "西安 卡尔�?阿尔",
    "Railen": "西安 拉伊�?,
    "X1": "西安 X1",

    # ========== Combo items (manufacturer + ship + kit) ==========
    "Drake Buccaneer plus Flight Blades Kit": "德雷�?海盗 + 飞行刀片套�?,
    "Drake Clipper plus Flight Blades Kit": "德雷�?剪刀 + 飞行刀片套�?,
    "Anvil Gladiator plus S5 Bomb Rack Weapon Kit": "安维�?角斗�?+ S5 炸弹架武器套�?,
    "Kruger L-21 Wolf plus Flight Blades Kit": "克鲁�?L-21 �?+ 飞行刀片套�?,

    # ========== Concept / New ships not yet in global.ini ==========
    "M80": "M80",
    "Tiburon": "锥鲨",
    "Pitbull": "斗牛�?,
    "Starlite": "星光",
    "Zeus Mk II": "RSI 宙斯 Mk II",
    "Nyx": "RSI 尼克�?,

    # ========== Game / Package items ==========
    "Squadron 42": "42中队",
    "Star Citizen": "星际公民",
    "Game Package": "游戏�?,
    "Starter Package": "新手�?,

    # ========== Paint / Skin ==========
    "Paint": "涂装",
    "Skin": "皮肤",

    # ========== Equipment ==========
    "Weapon": "武器",
    "Shield": "护盾",
    "Power Plant": "发电�?,
    "Cooler": "冷却�?,
    "Quantum Drive": "量子驱动�?,
    "Engine": "引擎",
    "Missile": "导弹",
    "Gun": "火炮",
    "Turret": "炮塔",

    # ========== 新增 Warbond 商品翻译 ==========
    "Shiv": "希夫",
    "Shiv Bodykit Collection": "希夫 车身套件合集",
    "Shiv Barebones Bodykit": "希夫 基础车身套件",
    "Shiv Slasher Bodykit": "希夫 斩击者车身套�?,
    "Shiv Lunatic Bodykit": "希夫 狂人车身套件",
    "Xy'kara": "希卡�?,
    "Xy'kara Bundle": "希卡�?捆绑�?,
    "Pitbull Duo Pack": "斗牛�?双人�?,
    "Ironclad Assault Carrier Pack": "德雷�?铁甲 突击航母�?,
    "Ironclad": "德雷�?铁甲",
    "Ironclad Assault": "德雷�?铁甲 突击",
    "Tiburon": "锥鲨",
    "Pitbull": "斗牛�?,
    "Starlite": "星光",
    "M80": "M80",
}

# RSI media CDN image URL pattern
# Correct format: https://media.robertsspaceindustries.com/{media_slug}/heap_infobox.jpg
# The media_slug is a RSI-internal ID (e.g. "asbrpwjjho1z0" for Gladius), NOT the ship name.
# Mapping sourced from RSI Ship Matrix API (https://robertsspaceindustries.com/ship-matrix/index)
SHIP_MEDIA_SLUG = {
    "100i": "ofxowq9rhbyvc",
    "125a": "e0a0pfimgv34k",
    "135c": "ftaf8t452ad1o",
    "300i": "3oo06l2jgo08b",
    "315p": "tclw2w16unsyq",
    "325a": "splsb5xdivrxj",
    "350r": "ni0d3xiv2wcid",
    "400i": "x4tbq6bz7kgkg",
    "600i Explorer": "nsl0zel8gmfxl",
    "600i Touring": "68f2og2gz2mdq",
    "85X": "sm8ti6o025fm3",
    "890 Jump": "t2bky2nbdg0ms",
    "A1 Spirit": "nsqe4f3nl1mqn",
    "A2 Hercules": "a14ekvttpyy6w",
    "ATLS": "99ljbpzzczrae",
    "ATLS GEO": "rbkutfuffvdy7",
    "Anvil Ballista Dunestalker": "7lh198t7qfugb",
    "Anvil Ballista Snowblind": "8anej6j9umet3",
    "Apollo Medivac": "s7p0pxsph50es",
    "Apollo Triage": "1mu5e6wdygvl1",
    "Ares Inferno": "txyuxxqtu8otc",
    "Ares Ion": "a2g2ta0lq0uq5",
    "Argo Mole Carbon Edition": "ugpy6i9pbgbax",
    "Argo Mole Talus Edition": "ghac95q2ncobp",
    "Arrastra": "s77g3dj3gwes9",
    "Arrow": "je860sn8tg87z",
    "Asgard": "hojtsnh3dom15",
    "Aurora Mk I CL": "ycbkp9msgs8lm",
    "Aurora Mk I ES": "e1i4i2ixe6ouo",
    "Aurora Mk I LN": "dh60iu47yqqpj",
    "Aurora Mk I LX": "28jsrvn7jb54w",
    "Aurora Mk I MR": "kinuf02r7s4oq",
    "Aurora Mk I SE": "ungxvqb17gtre",
    "Aurora Mk II": "rh3zjmon4w468",
    "Avenger Stalker": "9tfhza1twrczn",
    "Avenger Titan": "dogyaf0p2eup4",
    "Avenger Titan Renegade": "oc8p2v3n7c0e0",
    "Avenger Warlock": "l8znbwwoh2o8u",
    "Ballista": "fgwmyqm1gd658",
    "Blade": "0s9bslimticmx",
    "Buccaneer": "9930le6zi5mn3",
    "C1 Spirit": "ly51mm0p1vs6w",
    "C2 Hercules": "y9nxh2pyic772",
    "C8 Pisces": "9y6uxd82fw0ne",
    "C8R Pisces": "k4znei4d8qkrt",
    "C8X Pisces Expedition": "kj7oh12zn2f1l",
    "CSV-SM": "xeksf2azf23mm",
    "Carrack": "bau5bdotm8te8",
    "Carrack Expedition": "gpfapokelyewn",
    "Carrack Expedition w/C8X": "1k5nfi962y4pp",
    "Carrack w/C8X": "twlkwwqy2mmk2",
    "Caterpillar": "0ffxba4wywl0j",
    "Centurion": "ve7olk5it3ybn",
    "Clipper": "w71mw7k361seg",
    "Constellation Andromeda": "x1aflxx72d3xs",
    "Constellation Aquila": "u1qyvf0i8m0gv",
    "Constellation Phoenix": "jkyny550a90um",
    "Constellation Phoenix Emerald": "c6k45uuhq41ow",
    "Constellation Taurus": "mw5k52yzgo7fd",
    "Corsair": "9y19hajivybqc",
    "Crucible": "q81gvelwf2usv",
    "Cutlass Black": "56iszc92bl9oi",
    "Cutlass Blue": "2hllaegtpmzyy",
    "Cutlass Red": "wqa6lfco4amc0",
    "Cutlass Steel": "mhuiu912ca4d1",
    "Cutter": "f1g97yucvp6np",
    "Cutter Rambler": "7xwtmjrvqlyee",
    "Cutter Scout": "997gomyxfeg86",
    "Cyclone": "vfwgefk6w5o9d",
    "Cyclone AA": "9sdm1joxg6l5w",
    "Cyclone MT": "vypszjy7ij306",
    "Cyclone RC": "7w2fu56gep0vr",
    "Cyclone RN": "9e7okmkqgc38d",
    "Cyclone TR": "hf23s59lyp47o",
    "Defender": "nnb2oofnrlni9",
    "Dragonfly Black": "ts98rchnhox11",
    "Dragonfly Yellowjacket": "olbkpbmk1sb8u",
    "E1 Spirit": "mijopoh0bk9pb",
    "Eclipse": "ej552bji5plg4",
    "Endeavor": "ymfdp7ow9lm5c",
    "Expanse": "wphusii1dnmxt",
    "F7A Hornet Mk I": "xbj9vlcjp8xl3",
    "F7A Hornet Mk II": "fbn41urx9yszc",
    "F7C Hornet Mk I": "tcpakf2m1h1hx",
    "F7C Hornet Mk II": "hvfpdcaqeeehk",
    "F7C Hornet Wildfire Mk I": "0uqzw1kqnfvxy",
    "F7C-M Super Hornet Heartseeker Mk I": "6ewzke6o3llh6",
    "F7C-M Super Hornet Mk I": "pjudaw3yj3odo",
    "F7C-M Super Hornet Mk II": "5aqjv141a62is",
    "F7C-R Hornet Tracker Mk I": "biy2mmvcz6eb2",
    "F7C-R Hornet Tracker Mk II": "76dfngh2320kc",
    "F7C-S Hornet Ghost Mk I": "nbwncbo1436rs",
    "F7C-S Hornet Ghost Mk II": "thvu42fxnagbh",
    "F8C Lightning": "j6rvfrkux5nrm",
    "F8C Lightning Executive Edition": "ekto72z81x9kn",
    "Fortune": "y7rppq3nl8o1e",
    "Freelancer": "z3mllk6zi0x7r",
    "Freelancer DUR": "hjhbs9pvw36jc",
    "Freelancer MAX": "myp4kfzlh11jb",
    "Freelancer MIS": "ybkygputhkx0g",
    "Fury": "icoxi8ahyr0i9",
    "Fury LX": "c63hvy3xb308p",
    "Fury MX": "afdx1cof4p8rb",
    "G12": "brmi1ci9rthmu",
    "G12a": "2btmuamt8zv4g",
    "G12r": "ou0nkzhocb2bd",
    "Galaxy": "b2bx2kl8ewqej",
    "Genesis": "gpdjd9p1jnxj4",
    "Gladiator": "sonytrzapzugz",
    "Gladius": "asbrpwjjho1z0",
    "Gladius Pirate Edition": "9cwz2utclixvt",
    "Gladius Valiant": "hubxawbeqj9u7",
    "Glaive": "msy0lud5dd4eg",
    "Golem": "yzx7t45a965dk",
    "Golem OX": "zkl62hbt39ood",
    "Guardian": "ihc934ai7vvyj",
    "Guardian MX": "e92jsru2uvimx",
    "Guardian QI": "efsw63dokhn35",
    "Hammerhead": "zuxffe2ckazbk",
    "Hawk": "yshd7vv3i1ds0",
    "Herald": "eqjgd53qha550",
    "Hermes": "lx84u9f3zauov",
    "HoverQuad": "yz04lei9pkqob",
    "Hull A": "3u3x96w5ixj37",
    "Hull B": "k65brbo8a8wtc",
    "Hull C": "0qokljtlegt4r",
    "Hull D": "1j6650dnbblli",
    "Hull E": "k6fla3wync6cr",
    "Hurricane": "s4dhqqb1cug2k",
    "Idris-M": "59wd4xwt2qms4",
    "Idris-P": "yfj9hnf0hrali",
    "Intrepid": "3vk6dnvwcm0rk",
    "Ironclad Assault": "b1ahi2h8tnmsa",
    "Ironclad": "gtz4uouxebp3u",
    "Javelin": "oc89p5ksizcla",
    "Khartu-Al": "zd5doe8h0xemz",
    "Kraken": "nnpwaac1eqp4p",
    "Kraken Privateer": "nnu9953me3vod",
    "L-21 Wolf": "eq3u8zmal8k32",
    "L-22 Alpha Wolf": "dc1sfdhjkdhgr",
    "Legionnaire": "qxgdodjdhuvsr",
    "Liberator": "k2zu1md2ulfxn",
    "Lynx": "m6ikrk16sokre",
    "M2 Hercules": "3s79isis6qti3",
    "M50": "l7p21pakfkth2",
    "M80": "bx6y8k2s5y0cx",
    "MDC": "td5w87d85m3j7",
    "MOLE": "wgai60tvwa3vs",
    "MOTH": "e6qe6d6cyguo3",
    "MPUV Cargo": "yah6nttyhb9rv",
    "MPUV Personnel": "ee5eljtb2gs4b",
    "MPUV Tractor": "yld5zspxuczza",
    "MTC": "mbsnp3745enyi",
    "Mantis": "ohk97bvmweor0",
    "Merchantman": "gmtme5pca7eis",
    "Mercury": "219rro1mjtov6",
    "Meteor": "y0r5156e7qcf7",
    "Mule": "kl5rmiujift5l",
    "Mustang Alpha": "g0lupo5x3wp8u",
    "Mustang Alpha Vindicator": "iohmvf24h4rsz",
    "Mustang Beta": "h5us6lo3z1iwb",
    "Mustang Delta": "7gb75f5yivup7",
    "Mustang Gamma": "0awy4emw400yy",
    "Mustang Omega": "udupgv9cpj76b",
    "Nautilus": "c6t6mr400hgx6",
    "Nautilus Solstice Edition": "mp9p2pzrvdxw9",
    "Nomad": "inqdpb67v815c",
    "Nova": "698j1tw6sqq4t",
    "Nox": "945jxtrweugj1",
    "Nox Kue": "wluwxxxf8vyel",
    "Odin": "dygjbkb1e28bz",
    "Odyssey": "xpz8d5rv7fl2n",
    "Orion": "b3nwvt5ye3zj0",
    "P-52 Merlin": "dpsn2y1j9wy6w",
    "P-72 Archimedes": "8p4kt5rzv0t39",
    "P-72 Archimedes Emerald": "mib6i79az3zcr",
    "PTV": "6h1t0fw20lxv8",
    "Paladin": "5hz1jf9dkrfhc",
    "Perseus": "1zli0ngsh3vk7",
    "Pioneer": "vtodzxlks918l",
    "Pitbull": "v3m7y5x4jqnkp",
    "Polaris": "oe0wikh6g3ltm",
    "Prospector": "7rfmcpg9qcpmm",
    "Prowler": "iaps0ps9oo83s",
    "Prowler Utility": "ixg2xt4sauv1x",
    "Pulse": "undl2onw5a826",
    "Pulse LX": "4a24kqwjx1x4a",
    "RAFT": "x4b15hx3vui08",
    "ROC": "kuw6hsllahest",
    "ROC-DS": "9ozbp8j2455mw",
    "Railen": "i3aybjtr4j7fq",
    "Ranger CV": "1pe4mpq4m650v",
    "Ranger RC": "86p4ac1l3rmra",
    "Ranger TR": "eehhr9ql9y04w",
    "Razor": "ryf59d1orpnzh",
    "Razor EX": "7ryipnsxv61xe",
    "Razor LX": "k8vf8c6y16gcp",
    "Reclaimer": "mp4b03l05po17",
    "Redeemer": "fi748d6hqv9jj",
    "Reliant Kore": "0ofjqpjk23gqz",
    "Reliant Mako": "4f25lfzd4vaqr",
    "Reliant Sen": "dhvoh5wvqe5wi",
    "Reliant Tana": "z0qh46jnljtuf",
    "Retaliator": "29xzv1mq4fgt7",
    "SRV": "zni3y3co999z9",
    "STV": "ryfsd44qh96d9",
    "Sabre": "5ahkbuex0r8wm",
    "Sabre Comet": "6uravr46xw6qf",
    "Sabre Firebird": "jf3l706gczrz9",
    "Sabre Peregrine": "9hyc1w8drlprn",
    "Sabre Raven": "x1a8n7to5l1rp",
    "Salvation": "7u3ybzv7nbyg9",
    "San'tok.yai": "4s0zrs2svm1n9",
    "Scorpius": "7u4jmdb7ev4h7",
    "Scorpius Antares": "ib2pmees0vrq3",
    "Scythe": "kysobeqkurqyd",
    "Shiv": "wzn84c0qyz4ib",
    "Spartan": "edmbk733mir8t",
    "Starfarer": "wcxbs18v57gxv",
    "Starfarer Gemini": "c6423etmvm52z",
    "Starlancer MAX": "c59t62rz5xud9",
    "Starlancer TAC": "emx6dhzo9kbox",
    "Starlite": "6cdv5u7nvigrn",
    "Stinger": "90r0njd8ob87b",
    "Storm": "kwrokktl2sfx0",
    "Storm AA": "x42epibkm0264",
    "Syulen": "8xho65s0f1emp",
    "Talon": "5ldm3z0l75na6",
    "Talon Shrike": "tfej2rg70irt2",
    "Terrapin": "c59bnvpymcqr9",
    "Terrapin Medic": "hj0gxtjk6wd4h",
    "Tiburon": "yqgidk6parmtz",
    "UTV": "szj2zc8m5hair",
    "Ursa": "22yuqerzgide5",
    "Ursa Fortuna": "g62q7c3956cu1",
    "Ursa Medivac": "opl9wsa1a3tvu",
    "Valkyrie": "yjh17ca5zprfr",
    "Valkyrie Liberator Edition": "c67fpurhnm5jz",
    "Vanguard Harbinger": "enygi6572pnkl",
    "Vanguard Hoplite": "t0y17e7z9qq4o",
    "Vanguard Sentinel": "u7jflg98ld4d9",
    "Vanguard Warden": "xd9clc660apc3",
    "Vulcan": "6q50bb3oy5q8b",
    "Vulture": "ryxb5u7q09x06",
    "X1": "dfby6tstm2ddk",
    "X1 Force": "8gw5uoifiylxq",
    "X1 Velocity": "cz8otyln1w1tp",
    "Zeus Mk II CL": "bkvyglm2hgmzd",
    "Zeus Mk II ES": "dzqbjbxnpfjha",
    "Zeus Mk II MR": "pj51owg973q4h",
}

# Also map common alias names used in warbond data to their canonical RSI ship matrix names
_SHIP_NAME_ALIASES = {
    "Aurora ES": "Aurora Mk I ES",
    "Aurora MR": "Aurora Mk I MR",
    "Aurora CL": "Aurora Mk I CL",
    "Aurora LX": "Aurora Mk I LX",
    "Aurora LN": "Aurora Mk I LN",
    "Aurora Mk II plus Combat Module": "Aurora Mk II",
    "Hornet F7C": "F7C Hornet Mk I",
    "Hornet F7C Wildfire": "F7C Hornet Wildfire Mk I",
    "Hornet F7CM": "F7C-M Super Hornet Mk I",
    "Super Hornet": "F7C-M Super Hornet Mk I",
    "F7C Hornet": "F7C Hornet Mk I",
    "F7C-M Super Hornet": "F7C-M Super Hornet Mk I",
    "F7C-R Hornet Tracker": "F7C-R Hornet Tracker Mk I",
    "F7C-S Hornet Ghost": "F7C-S Hornet Ghost Mk I",
    "F8 Lightning": "F8C Lightning",
    "C2": "C2 Hercules",
    "M2": "M2 Hercules",
    "A2": "A2 Hercules",
    "Ares Inferno": "Ares Inferno",
    "Ballista Dunestalker": "Anvil Ballista Dunestalker",
    "Ballista Snowblind": "Anvil Ballista Snowblind",
    "Dragonfly": "Dragonfly Black",
    "MOLE Carbon": "Argo Mole Carbon Edition",
    "MOLE Talus": "Argo Mole Talus Edition",
    "Mercury Star Runner": "Mercury",
    "Reliant": "Reliant Kore",
    "Razor": "Razor",
    "Ursa Rover": "Ursa",
    "600i": "600i Touring",
    "Apollo": "Apollo Triage",
    "Nautilus": "Nautilus",
    "Lynx": "Lynx",
    "Cutlass": "Cutlass Black",
    "Avenger": "Avenger Titan",
    "Mustang": "Mustang Alpha",
    "Buccaneer": "Buccaneer",
}


def _get_name_zh(name: str) -> str:
    """Get Chinese name for a ship/item. ParaTranz first, then hardcoded fallback.

    Matching priority:
    1. ParaTranz translate() (single authoritative source)
    2. Exact match in SHIP_NAME_ZH
    3. Prefix match
    4. Strip manufacturer prefix and match base name
    """
    from services.paratranz_service import paratranz

    # 1. ParaTranz (single source of truth)
    ptz = paratranz.translate(name)
    if ptz:
        return ptz

    # 2. Exact match
    if name in SHIP_NAME_ZH:
        return SHIP_NAME_ZH[name]

    # 3. Prefix match (handles suffixes like " Warbond Edition", etc.)
    for eng, zh in sorted(SHIP_NAME_ZH.items(), key=lambda x: -len(x[0])):
        if name.startswith(eng):
            return zh + name[len(eng):]

    # 4. Strip manufacturer prefix and try matching base name
    for mfr_en, mfr_zh in MANUFACTURER_ZH.items():
        prefix = mfr_en + " "
        if name.startswith(prefix):
            base = name[len(prefix):]
            # Try ParaTranz on base name
            ptz_base = paratranz.translate(base)
            if ptz_base:
                return ptz_base
            # Exact match on base name
            if base in SHIP_NAME_ZH:
                return SHIP_NAME_ZH[base]
            # Prefix match on base name
            for eng, zh in sorted(SHIP_NAME_ZH.items(), key=lambda x: -len(x[0])):
                if base.startswith(eng):
                    return zh + base[len(eng):]
            # No match on base, return original name
            return name

    return name


def _get_image_url(name: str, rsi_slug: str = "") -> str:
    """Generate RSI media image URL for a ship/item using media slug lookup.

    URL format: https://media.robertsspaceindustries.com/{media_slug}/heap_infobox.jpg
    The media_slug is a RSI-internal ID mapped from the ship matrix API.

    Args:
        name: Ship/item name for fallback lookups.
        rsi_slug: GraphQL slug from RSI store (NOT a media slug, ignored).
    """
    # NOTE: rsi_slug from GraphQL is a store slug, NOT a media slug.
    # Store slugs don't work on media.robertsspaceindustries.com (404).
    # We only use SHIP_MEDIA_SLUG dictionary for correct media slugs.

    # 1. Direct lookup in SHIP_MEDIA_SLUG
    slug = SHIP_MEDIA_SLUG.get(name)
    if slug:
        return f"https://media.robertsspaceindustries.com/{slug}/heap_infobox.jpg"

    # 2. Try alias mapping (e.g. "Hornet F7C" -> "F7C Hornet Mk I")
    alias = _SHIP_NAME_ALIASES.get(name)
    if alias:
        slug = SHIP_MEDIA_SLUG.get(alias)
        if slug:
            return f"https://media.robertsspaceindustries.com/{slug}/heap_infobox.jpg"

    # 3. Prefix match in SHIP_MEDIA_SLUG (handles suffixes like " Warbond Edition")
    for key, slug_val in sorted(SHIP_MEDIA_SLUG.items(), key=lambda x: -len(x[0])):
        if name.startswith(key):
            return f"https://media.robertsspaceindustries.com/{slug_val}/heap_infobox.jpg"

    # 4. Strip manufacturer prefix and try again
    for mfr in MANUFACTURER_ZH:
        prefix = mfr + " "
        if name.startswith(prefix):
            base = name[len(prefix):]
            slug = SHIP_MEDIA_SLUG.get(base)
            if slug:
                return f"https://media.robertsspaceindustries.com/{slug}/heap_infobox.jpg"
            # Prefix match on base name
            for key, slug_val in sorted(SHIP_MEDIA_SLUG.items(), key=lambda x: -len(x[0])):
                if base.startswith(key):
                    return f"https://media.robertsspaceindustries.com/{slug_val}/heap_infobox.jpg"
            # Alias on base name
            alias = _SHIP_NAME_ALIASES.get(base)
            if alias:
                slug = SHIP_MEDIA_SLUG.get(alias)
                if slug:
                    return f"https://media.robertsspaceindustries.com/{slug}/heap_infobox.jpg"

    # 5. No match found - return empty string (frontend will show fallback icon)
    return ""


def _http_get(url: str, timeout: int = 15) -> str:
    """HTTP GET using urllib.request (no curl dependency).
    Equivalent to curl -s -k --tlsv1.2.
    """
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE

    req = urllib.request.Request(url, headers={
        "Accept": "text/html,application/json",
        "User-Agent": "UEX-Trade-Navigator/3.18.0",
    })
    with urllib.request.urlopen(req, timeout=timeout, context=_ssl_ctx) as resp:
        return resp.read().decode("utf-8")


def _http_post_json(url, data, timeout=30):
    import json as json_mod
    _ssl_ctx = ssl.create_default_context()
    _ssl_ctx.check_hostname = False
    _ssl_ctx.verify_mode = ssl.CERT_NONE
    body = json_mod.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers={
        "Content-Type": "application/json",
        "Accept": "application/json",
        "User-Agent": "UEX-Trade-Navigator/3.22.0",
    })
    with urllib.request.urlopen(req, timeout=timeout, context=_ssl_ctx) as resp:
        return json_mod.loads(resp.read().decode("utf-8"))


def _fetch_from_starnotifier() -> list:
    """Fetch warbond items from starnotifier.com as fallback."""
    html = _http_get("https://starnotifier.com/daily-warbonds")
    if not html:
        raise Exception("Empty response from starnotifier")

    items = []

    # Parse CCU items
    ccu_section = re.search(r"<h2>Today's CCU Warbonds</h2>(.*?)<h2>", html, re.DOTALL)
    if ccu_section:
        ccu_html = ccu_section.group(1)
        ccu_items = re.findall(r'<li>\s*<b>(.*?)</b>.*?(\d+)\$.*?(\d+)\$', ccu_html, re.DOTALL)
        for name, warbond_price, standard_price in ccu_items:
            items.append({
                "name": name.strip(),
                "name_zh": _get_name_zh(name.strip()),
                "category": "Ship Upgrades",
                "category_id": 76,
                "warbond_price": int(warbond_price) * 100,
                "standard_price": int(standard_price) * 100,
                "url": "https://robertsspaceindustries.com/store/pledge/browse/extras/ship-upgrades",
                "image_url": _get_image_url(name.strip(), ""),
                "is_limited": False,
                "label": "Warbond",
            })

    # Parse Standalone Ships items
    standalone_section = re.search(r"<h2>Today's (?:Extra \(standalone ships\) )?Warbonds</h2>(.*?)$", html, re.DOTALL)
    if standalone_section:
        standalone_html = standalone_section.group(1)
        standalone_items = re.findall(r'<li>\s*<b>(.*?)</b>.*?(\d+)\$.*?(\d+)\$', standalone_html, re.DOTALL)
        for name, warbond_price, standard_price in standalone_items:
            items.append({
                "name": name.strip(),
                "name_zh": _get_name_zh(name.strip()),
                "category": "Standalone Ships",
                "category_id": 72,
                "warbond_price": int(warbond_price) * 100,
                "standard_price": int(standard_price) * 100,
                "url": "https://robertsspaceindustries.com/store/pledge/browse/extras/standalone-ships",
                "image_url": _get_image_url(name.strip(), ""),
                "is_limited": False,
                "label": "Warbond",
            })

    return items


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
    """Classify an item into a category."""
    if is_ccu:
        return "ccu", CATEGORY_ZH.get("Ship Upgrades", "CCU")
    if is_standalone:
        return "standalone_ship", CATEGORY_ZH.get("Standalone Ships", "独立飞船")
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


def fetch_warbonds(refresh: bool = False) -> dict:
    """Fetch current warbond items. Uses centralized TTL cache."""
    if not refresh:
        cached = warbond_cache.get()
        if cached is not None:
            return cached

    try:
        all_items = []

        # 1. Try RSI GraphQL API (per-category, so one failure doesn't kill all)
        for category_id, category_name in RSI_CATEGORIES.items():
            try:
                page = 1
                while True:
                    query = _build_query(category_id, page=page, limit=50)
                    resp_data = _http_post_json(RSI_GRAPHQL_URL, query)
                    store_data = resp_data[0]["data"]["store"]["search"]
                    resources = store_data["resources"]
                    total = store_data["totalCount"]
                    for item in resources:
                        if item.get("isWarbond"):
                            native = item.get("nativePrice") or {}
                            price = item.get("price") or {}
                            all_items.append({
                                "name": item["name"],
                                "name_zh": _get_name_zh(item["name"]),
                                "category": category_name,
                                "category_id": category_id,
                                "warbond_price": native.get("amount") or price.get("amount"),
                                "standard_price": price.get("amount"),
                                "url": f"https://robertsspaceindustries.com{item['url']}" if item.get("url") else "",
                                "image_url": _get_image_url(item["name"], item.get("slug", "")),
                                "is_limited": item.get("isVip", False),
                                "label": item.get("label", ""),
                            })
                    if page * 50 >= total:
                        break
                    page += 1
            except Exception as e:
                print(f"RSI GraphQL API failed for category {category_name} ({category_id}): {e}")

        # 2. Fallback to starnotifier.com if no CCU items found
        has_ccu = any(i["category"] == "Ship Upgrades" for i in all_items)
        if not has_ccu:
            try:
                starnotifier_items = _fetch_from_starnotifier()
                existing_names = {item["name"] for item in all_items}
                for item in starnotifier_items:
                    if item["name"] not in existing_names:
                        all_items.append(item)
                        existing_names.add(item["name"])
            except Exception as e:
                print(f"starnotifier.com fallback failed: {e}")

        # 3. Build result
        result = {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "rsi_store_url": "https://robertsspaceindustries.com/store/pledge/browse",
            "categories": {},
            "category_order": CATEGORY_ORDER,
            "category_names_zh": CATEGORY_ZH,
        }
        for cat_name in CATEGORY_ORDER:
            cat_items = [i for i in all_items if i["category"] == cat_name]
            if cat_items:
                result["categories"][cat_name] = cat_items

        if all_items:
            warbond_cache.set(result)
        return result
    except Exception as e:
        if warbond_cache.data is not None:
            r = warbond_cache.data
            r["status"] = "degraded"
            return r
        return {
            "status": "degraded",
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "rsi_store_url": "https://robertsspaceindustries.com/store/pledge/browse",
            "categories": {},
            "error": str(e),
        }
