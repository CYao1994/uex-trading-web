"""
Warbond Scraper Service
Fetches current warbond items from starnotifier.com and RSI store API.
Uses centralized TTL cache from cache.py.
"""

import subprocess
import json
import re
import time
from datetime import datetime, timezone

from services.cache import warbond_cache

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
    "Ironclad": "g948zfjuiznu4",
    "Ironclad Assault": "llaw71tcvmgmy",
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
    "M80": "nledgsyyzmjov",
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
    "Pitbull": "9jazkmawt8ggi",
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
    """Generate RSI media image URL for a ship/item using media slug lookup.

    URL format: https://media.robertsspaceindustries.com/{media_slug}/heap_infobox.jpg
    The media_slug is a RSI-internal ID mapped from the ship matrix API.
    """
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
                    return f"https://media.robertsspaceindustries.com/{slug_val}/heap_infobox.jpg"

    # 5. No match found - return empty string (frontend will show fallback icon)
    return ""


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


def fetch_warbonds(refresh: bool = False) -> dict:
    """Fetch current warbond items. Uses centralized TTL cache."""
    # Return cache if fresh
    if not refresh:
        cached = warbond_cache.get()
        if cached is not None:
            return cached

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
        warbond_cache.set(response)

        return response

    except Exception as e:
        # Return stale cache if available, otherwise empty
        if warbond_cache.data is not None:
            return warbond_cache.data
        return {
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "rsi_store_url": RSI_WARBOND_STORE_URL,
            "ccu_items": [],
            "standalone_ships": [],
            "error": str(e),
        }
