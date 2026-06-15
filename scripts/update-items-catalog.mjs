#!/usr/bin/env node
/**
 * update-items-catalog.mjs - Pre-build items catalog from UEX API + Chinese localization
 *
 * Follows FSD-item-finder's approach: pre-build a static JSON catalog
 * of all ship-related items, attributes, and category definitions.
 * Only prices need to be fetched at runtime.
 *
 * Chinese name source: ??????? global.ini (Gitee: StarCitizen_CN/sc_l10n_zh_s)
 *
 * Usage: node scripts/update-items-catalog.mjs [--skip-l10n]
 * Output: frontend/public/data/items-catalog.json
 */

import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'https://api.uexcorp.space/2.0';
const OUTPUT_PATH = path.join(__dirname, '..', 'frontend', 'public', 'data', 'items-catalog.json');

// Ship-related category sections to include
const RELEVANT_SECTIONS = ['Systems', 'Vehicle Weapons', 'Utility', 'Avionics', 'Propulsion'];

// Category ID to Chinese name mapping
const CATEGORY_ZH = {
  19: '冷却器',
  21: '发电机',
  22: '量子引擎',
  23: '护盾发生器',
  25: '对接环',
  26: '油箱',
  29: '采矿激光器',
  30: '采矿设备',
  31: '打捞光束',
  32: '火炮',
  33: '导弹架',
  34: '导弹',
  35: '炮塔',
  67: '牵引光束',
  70: '炸弹',
  79: '点防御炮',
  82: '飞行模块',
  83: '雷达',
  86: '跳跃模块',
  110: '打捞光束',
  109: '制造机',
  64: '容器',
};

// Section to Chinese name
const SECTION_ZH = {
  'Systems': '系统',
  'Vehicle Weapons': '武器',
  'Utility': '工具',
  'Avionics': '航空电子',
  'Propulsion': '推进',
};

// Item Type to Chinese (for weapons and items with Item Type attribute)
const ITEM_TYPE_ZH = {
  // Guns
  'Laser Cannon': '激光加农炮',
  'Laser Repeater': '激光连射炮',
  'Laser Scattergun': '激光散射枪',
  'Ballistic Cannon': '弹道加农炮',
  'Ballistic Repeater': '弹道连射炮',
  'Ballistic Gatling': '弹道加特林',
  'Ballistic Scattergun': '弹道散射枪',
  'Distortion Cannon': '扭曲加农炮',
  'Distortion Repeater': '扭曲连射炮',
  'Distortion Scattergun': '扭曲散射枪',
  'Neutron Cannon': '中子加农炮',
  'Neutron Repeater': '中子连射炮',
  'Plasma Cannon': '等离子加农炮',
  'Plasma Scattergun': '等离子散射枪',
  'Mass Driver Cannon': '质量驱动加农炮',
  'Tachyon Cannon': '超光速加农炮',
  'Rocket Pod': '火箭巢',
  // Mining
  'Active': '主动',
  'Passive': '被动',
  // Utility
  'Fuel Nozzle': '燃料喷嘴',
  'Fuel Pod': '燃料舱',
  'Gadget': '装置',
  // Missile types
  'Cross Section': '截面',
  'Electromagnetic': '电磁',
  'Infrared': '红外',
  'Dumbfire': '无制导',
  'Heat Seeking': '热追踪',
  // Radar types
  'Combat': '战斗',
  'Exploration': '探索',
  'Stealth': '隐形',
  // QD types
  'Civilian': '民用',
  'Military': '军用',
  'Industrial': '工业',
  'Competition': '竞赛',
};

// Item Type to Weapon Category (for weapon sub-type filter)
const ITEM_TYPE_WEAPON_CATEGORY = {
  'Laser Cannon': '能量',
  'Laser Repeater': '能量',
  'Laser Scattergun': '能量',
  'Ballistic Cannon': '弹道',
  'Ballistic Repeater': '弹道',
  'Ballistic Gatling': '弹道',
  'Ballistic Scattergun': '弹道',
  'Distortion Cannon': '扭曲',
  'Distortion Repeater': '扭曲',
  'Distortion Scattergun': '扭曲',
  'Neutron Cannon': '中子',
  'Neutron Repeater': '中子',
  'Plasma Cannon': '等离子',
  'Plasma Scattergun': '等离子',
  'Mass Driver Cannon': '质量驱动',
  'Tachyon Cannon': '超光速',
  'Rocket Pod': '火箭',
  // Missile guidance types
  'Cross Section': '截面制导',
  'Electromagnetic': '电磁制导',
  'Infrared': '红外制导',
  'Dumbfire': '无制导',
  'Heat Seeking': '热追踪',
};

// Class to Chinese (for ship components)
const CLASS_ZH = {
  'Military': '军用',
  'Civilian': '民用',
  'Industrial': '工业',
  'Competition': '竞赛',
  'Stealth': '隐形',
  'Unknown': '未知',
};

// ============================================================
// Chinese Location Mappings (synced from data_mapper.py)
// ============================================================

const SYSTEM_ZH = {
  'Stanton': '斯坦顿',
  'Pyro': '派罗',
  'Nyx': '尼克斯',
};

const PLANET_ZH = {
  'ArcCorp': '弧光星',
  'Hurston': '赫斯顿',
  'Crusader': '十字军',
  'MicroTech': '微科公司',
  'Cellin': '赛琳',
  'Daymar': '戴玛尔',
  'Yela': '耶拉',
  'Aberdeen': '阿伯丁',
  'Arial': '艾瑞尔',
  'Magda': '玛格达',
  'Ita': '依塔',
  'Lyria': '莉瑞雅',
  'Wala': '瓦菈',
  'Calliope': '卡利俄佩',
  'Clio': '克利俄',
  'Euterpe': '欧忒耳佩',
  'Delamar': '德拉玛',
  'Bloom': '盛放星',
  'Monox': '莫诺克斯',
  'Terminus': '端点星',
  'Pyro IV': '派罗 IV',
  'Pyro V': '派罗 V',
  'Pyro VI': '派罗 VI',
};

const TERMINAL_ZH_MAP = {
  // Rest stops
  'ARC-L1': '弧-L1 广袤森林站',
  'ARC-L2': '弧-L2 活力小径站',
  'ARC-L3': '弧-L3 摩登快车站',
  'ARC-L4': '弧-L4 黯淡幽谷站',
  'ARC-L5': '弧-L5 黄色核心站',
  'CRU-L1': '十-L1 雄心伟梦站',
  'CRU-L4': '十-L4 轻浅田野站',
  'CRU-L5': '十-L5 美丽峡谷站',
  'HUR-L1': '赫-L1 绿色林地站',
  'HUR-L2': '赫-L2 坚贞梦想站',
  'HUR-L3': '赫-L3 雷霆快车站',
  'HUR-L4': '赫-L4 旋律领域站',
  'HUR-L5': '赫-L5 高速路线站',
  'MIC-L1': '微-L1 浅边站',
  'MIC-L2': '微-L2 长林站',
  'MIC-L3': '微-L3 无尽奇幻旅程站',
  'MIC-L4': '微-L4 红色十字路口站',
  'MIC-L5': '微-L5 现代伊卡洛斯站',
  // Major landing zones
  'Area 18': '18区', 'Area18': '18区',
  'Lorville': '罗威尔',
  'New Babbage': '新巴贝奇',
  'Orison': '奥里森',
  'Levski': '列夫斯基',
  'Port Olisar': '奥丽莎港',
  'Grim Hex': '六角湾', 'GrimHEX': '六角湾',
  // Space stations
  'Baijini Point': '拜基尼太空站',
  'Everus Harbor': '埃弗勒斯港',
  'Port Tressler': '特雷斯勒太空站',
  'Seraphim Station': '炽天使空间站', 'Seraphim': '炽天使空间站',
  'UEX Station': '利夫斯登车站',
  // Gateways
  'Nyx Gateway': '尼克斯星门',
  'Pyro Gateway': '派罗星门',
  'Stanton Gateway': '斯坦顿星门',
  'Terra Gateway': '泰拉星门',
  // PSS
  "People's Service Station Alpha": '人民服务空间站 阿尔法',
  "People's Service Station Delta": '人民服务空间站 德尔塔',
  "People's Service Station Lambda": '人民服务空间站 拉姆达',
  "People's Service Station Theta": '人民服务空间站 西塔',
  'PSS Alpha': '人民服务空间站 阿尔法',
  'PSS Delta': '人民服务空间站 德尔塔',
  'PSS Lambda': '人民服务空间站 拉姆达',
  'PSS Theta': '人民服务空间站 西塔',
  // HDMS
  'HDMS-Anderson': 'HDMS-安德森站',
  'HDMS-Bezdek': 'HDMS-贝兹德克站',
  'HDMS-Edmond': 'HDMS-埃得蒙德站',
  'HDMS-Hadley': 'HDMS-哈德利站',
  'HDMS-Hahn': 'HDMS-哈恩站',
  'HDMS-Lathan': 'HDMS-莱森站',
  'HDMS-Norgaard': 'HDMS-诺加德站',
  'HDMS-Oparei': 'HDMS-奥派雷站',
  'HDMS-Perlman': 'HDMS-佩尔曼站',
  'HDMS-Pinewood': 'HDMS-派恩伍德站',
  'HDMS-Ryder': 'HDMS-莱德站',
  'HDMS-Stanhope': 'HDMS-斯坦霍普站',
  'HDMS-Thedus': 'HDMS-赛达斯站',
  'HDMS-Woodruff': 'HDMS-伍德拉夫站',
  // Shubin
  'Shubin Mining Facility SAL-2': '舒宾矿业设施 SAL-2',
  'Shubin Mining Facility SAL-5': '舒宾矿业设施 SAL-5',
  'Shubin Mining Facility SCD-1': '舒宾采矿设施 SCD-1',
  'Shubin Mining Facility SM0-10': '舒宾矿业设施 SM0-10',
  'Shubin Mining Facility SM0-13': '舒宾矿业设施 SM0-13',
  'Shubin Mining Facility SM0-18': '舒宾矿业设施 SM0-18',
  'Shubin Mining Facility SM0-22': '舒宾矿业设施 SM0-22',
  'Shubin Mining Facility SMCa-6': '舒宾加工设施 SMCa-6',
  'Shubin Mining Facility SMCa-8': '舒宾加工设施 SMCa-8',
  // ArcCorp Mining
  'ArcCorp Mining Area 045': '弧光045采矿区',
  'ArcCorp Mining Area 048': '弧光048采矿区',
  'ArcCorp Mining Area 056': '弧光056采矿区',
  'ArcCorp Mining Area 061': '弧光061采矿区',
  'ArcCorp Mining Area 141': '弧光141采矿区',
  'ArcCorp Mining Area 157': '弧光157采矿区',
  // Shops
  'Platinum Bay': '白金湾', 'PlatinumBay': '白金湾',
  'Casaba Outlet': '卡萨巴奥特莱斯',
  "Dumper's Depot": '达珀仓库',
  'Cubby Blast': '卡比爆破',
  'Live Fire Weapons': '实弹武器店',
  'CenterMass': '中心质量',
  'Buy and Fly': '即买即飞',
  'TDD': '贸易发展部',
  'Trade and Development': '贸易发展部',
  'Refinery Ore Sales': '精炼矿石销售',
  'Refinery Shop': '精炼商店',
  'Conscientious Objects': '自觉之物',
  'Guns': '枪械',
  'Armor': '护甲',
  'Ship Weapons': '舰船武器',
  'Ship Parts': '舰船配件',
  // Other
  'Spark': '火花站',
  'Verne': '凡尔纳',
  'Wikelo': '维克洛',
  'Rustville': '锈镇',
  'Jumptown': '跃动小镇',
  'Deakins Research': '迪金斯科研前哨站',
  'Hickes Research': '希克斯研究站',
  'Green Imperial Housing Exchange': '六角湾',
  'Benson Mining Outpost': '本森采矿前哨站',
  'Bountiful Harvest Hydroponics': '丰收水培种植站',
  'Bud\'s Growery': '巴德种植园',
  'Humboldt Mines': '洪保德矿站',
  'Kudre Ore': '库德雷矿井',
  'Loveridge Mineral Reserve': '洛维里奇矿站',
  'Nuen Waste Management': '努恩废物管理中心',
  'Terra Mills Hydrofarm': '泰拉磨坊水培种植站',
  'Tram & Myers Mining': '泰姆&迈尔斯矿站',
  'Samson & Son\'s Salvage Center': '参孙父子回收站',
  'Devlin Scrap and Salvage': '德夫林废品回收站',
  'Gallete Family Farms': '加莱特家庭种植站',
  'Orbituary': '轨道讣闻站',
  'Ruin Station': '报废空间站',
  'Checkmate': '将死空间站',
  'Patch City': '补丁城',
  'Rat\'s Nest': '鼠巢空间站',
  'Dudley & Daughters': '达德利父女空间站',
  'Endgame': '残局空间站',
  'Gaslight': '煤气灯空间站',
  'Megumi Refueling': '惠加油空间站',
  'Rod\'s Fuel \'N Supplies': '罗德燃料补给站',
  'Starlight Service Station': '星光服务站',
  'Starlight Service': '星光服务站',
  'Blackrock Exchange': '黑岩交易所',
  'Covalex Distribution Centre S4DC05': '科瓦莱克斯配送中心 S4DC05',
  'INS Jericho': 'INS 杰里科军港',
  // Lorville / Orison / New Babbage areas
  'CBD': '中央商务区',
  'Aspire Grand': '志远大厦',
  'The Commons': '市民广场',
  'Providence Platform': '普罗维登斯平台',
  'Orison Municipal Services': '奥里森市政服务',
  'Crusader Discovery Center': '十字军探索中心',
  'MicroTech Planetary Services': '微科星球公务部',
  'Shubin Interstellar': '舒宾星际',
  'Hurston Dynamics Showcase': '赫斯顿动力展示厅',
  'Maria Pure of Heart': '玛利亚纯洁之心',
  'NBIS': 'NBIS航站楼',
  'Refinement Center': '精炼中心',
  'Refinement Processing': '精炼加工',
  'Cargo Center': '货运中心',
  'Crusader Showroom': '十字军展厅',
  'Astro Armada': '星际舰队',
  'Tammany and Sons': '塔马尼父子',
  'Cousin Crow\'s': '鸦兄',
  'Traveler Rentals': '旅行者租赁',
  'Vantage Rentals': '优势租赁',
  'Regal Luxury Rentals': '豪华租赁',
  'New Deal': '新交易',
  'Ellroy\'s': '埃罗伊',
  'Aloprats': '阿洛普拉斯',
  'Garcia\'s Greens': '加西亚蔬果',
  'Brentworth Pharmacy': '布伦特沃斯药房',
  'Kel-To': '凯尔托',
  'Providence Surplus': '普罗维登斯剩余物资',
  'Covalex': '科瓦莱克斯',
  'Fresh Food': '新鲜食品',
  'Processed Food': '加工食品',
  'Medical Supplies': '医疗用品',
  'Distilled Spirits': '蒸馏酒精',
  'Construction Materials': '建筑材料',
  'Souvenirs': '纪念品',
  'Party Favors': '聚会礼品',
  'Fireworks': '烟花',
};

// Manufacturer code ? English name (SC naming convention)
// Includes ship manufacturers, component/weapon manufacturers, and missile manufacturers
const MFR_CODE_MAP = {
  // Ship manufacturers
  'AEGS': 'Aegis', 'ANVL': 'Anvil', 'ARGO': 'Argo', 'BANU': 'Banu',
  'CNOU': 'Consolidated Outland', 'CRSD': 'Crusader', 'DRAK': 'Drake',
  'ESPR': 'Esperia', 'GRIN': 'Greycat', 'KRT': 'Kruger',
  'MISC': 'MISC', 'ORIG': 'Origin', 'RSI': 'RSI', 'TMBL': 'Tumbril',
  "XNAA": "Xi'an", 'GATC': 'Gatac', 'VAND': 'Vanduul',
  'RADD': 'Roberts Space Industries', 'ANIM': 'Anima',
  'TAVS': 'Tavda', 'MRS': 'Mirai',
  // Component manufacturers (from global.ini component-style keys)
  'APAR': 'Apocalypse Arms',
  'BHEN': 'Behring Applied Technology',  // Note: BHEN not used; BEHR is used for weapons
  'WENC': 'Wen-Cassel Propulsion',
  'JSPN': 'J-Span',
  'LPLT': 'Lightning Power Ltd.',
  'GORG': 'Gorgon Defender Industries',
  'GODI': 'Gorgon Defender Industries',  // Alternate code for shields
  'ASAS': 'Ascension Astro',
  'ACOM': 'ACOM',
  'HRST': 'Hurston Dynamics',
  'KDRI': 'Kriskin Dynamics',
  'KDFA': 'KraftMann Dynamics',
  'NSKO': 'NovaSpace Korea',
  'AMSH': 'Amsha',
  'JBLT': 'Jupiter Blues',
  'IDKS': 'Iceden Kinetics',
  'ALPH': 'AstroArms',
  'SWKS': 'Sakura Sun',
  'RSSL': 'Razio Systems',
  'TBLR': 'Tobler',
  'FCTY': 'Futuramic',
  'GDWG': 'GoldWing',
  'ASGN': 'Ascent',
  'VNCL': 'Vincent Arms',
  'BBFI': 'BlackBail',
  'FBPL': 'Firebird',
  'THRN': 'Thermin',
  'WASU': 'Wasu',
  'PBRK': 'Pinecone',
  'AMRS': 'Armscor',
  'SWKR': 'Shirow',
  'HARL': 'Harlequin',
  'CFRT': 'Seigler',
  'CSTS': 'Custer',
  'VLGT': 'Volt',
  'DRSN': 'Dragonfly',
  'WTCT': 'Wei-Tek',
  'TARS': 'Tarsus',
  'ARCC': 'ArcCorp',
  'YACL': 'Yamorik Arrowclaw',
  'ESYA': 'Esperia',
  'FDJK': 'Faulcon DeLacy',
  'MTPC': 'MicroTech',
  'CLDS': 'Cloudsmiths',
  'CCGS': 'CCL',
  'ALBX': 'Alibaba',
  'CIVL': 'Civilian',
  'KRGR': 'Kriger',
  'JRGU': 'Jorg',
  'BAKJ': 'Bakermann-Jones',
  'SASR': 'Sasori',
  'TGGT': 'Tange',
  'NKBL': 'Niko',
  'SNKS': 'Snokes',
  'LVKA': 'Lukas',
  'KRSM': 'Korisma',
  'ZPT': 'Zap',
  'ISPD': 'Intercept',
  // Ship weapon manufacturers (uppercase codes in global.ini)
  'BEHR': 'Behring Applied Technology',
  'KLWE': 'Klaus & Werner',
  'GATS': 'Gallenson Tactical Systems',
  'MXOX': 'MaxOx',
  'KRIG': 'Kruger Intergalactic',
  'JOKR': 'Joker Engineering',
  'PRAR': 'Preacher Armament',
  'ASAD': 'Associated Sciences & Development',
  'KBAR': 'KnightBridge Arms',
  'KRON': 'Kroneg',
  'TRAS': 'Hurston Dynamics',
  'APAR': 'Apocalypse Arms',  // global.ini uses APAR for Apocalypse weapons (??, ??, etc.)
  'AMBX': 'Apocalypse Arms',  // Alternate code for ammo boxes
  'AMRS': 'Armscor',          // ???? (AirTaker) weapons
  'VNCL': 'Vanduul Clans',    // Also used for Vanduul weapons in global.ini
  // Shield manufacturers
  'BASL': 'Basilisk',
  'SECO': 'Seal Corporation',
  'YORM': 'Yorm',
  // Missile manufacturers
  'FSKI': 'FireStorm Kinetics',
  'THCN': 'Thermyte Concern',
  'TALN': 'Talon Weapons Systems',
  'NOVP': 'Nova Pyrotechnica',
  // QD manufacturers
  'ACAS': 'Accelerated Mass Design',
  'JUST': 'Julian Aerospace Industries',
  'RACO': 'Racer Dynamics',
  'WETK': 'Wei-Tek',
  // Radar manufacturers
  'WLOP': 'WillsOp',
  'CHMR': 'Chimera Communications',
  'NVSE': 'Nav-E7 Gadgets',
  'BLTR': 'Blue Triangle Inc.',
  'GNPM': 'Groupe Nouveau Paradigme',
};

// Manufacturer English name ? Chinese (from sync_chinese_names.py)
const MFR_ZH_MAP = {
  'Aegis': '??', 'Anvil': '??', 'Argo': '???', 'Banu': '??',
  'Consolidated Outland': '????', 'Crusader': '???', 'Drake': '???',
  'Esperia': '艾斯佩里亚', 'Greycat': '灰猫', 'Kruger': '克鲁格',
  'MISC': 'MISC', 'Origin': '起源', 'RSI': 'RSI', 'Tumbril': '坦布里尔',
  "Xi'an": '西安', 'Gatac': '加塔克', 'Vanduul': '范杜尔',
  'Mirai': '未来',
  'Ace Astrogation': '王牌导航',
  // Ship manufacturers (full names as they appear in UEX API company_name)
  'Aegis Dynamics': '艾吉斯动力',
  'Anvil Aerospace': '安维尔航天',
  'Argo Astronautics': '阿尔戈航天',
  'Aopoa': '奥波亚',
  'ArcCorp': '弧光公司',
  'Banu Souli': '巴努苏利',
  'Broad & Rabiee': '布罗德和拉比',
  'Drake Interplanetary': '德雷克星际',
  'Esperia Incorporation': '艾斯佩里亚公司',
  'Flashfire Systems': '闪火系统',
  "Grey's Market": '格雷市场',
  "Grey&apos;s Market": '格雷市场',
  'Greycat Industrial': '灰猫工业',
  'Juno Starwerk': '朱诺星工',
  'KE Group': 'KE集团',
  'Musashi Industrial and Starflight Concern': '武藏工业与星际飞行',
  'Origin Jumpworks': '起源跳跃工坊',
  'RAMP Corporation': 'RAMP公司',
  'Roberts Space Industries': '罗伯茨空间工业',
  'Shubin Interstellar': '舒宾星际',
  'Stor-All': '储存一切',
  'Tarsus': '塔尔苏斯',
  'Tyler Design & Tech': '泰勒设计与技术',
  'Vanduul Clans': '范杜尔氏族',
  // Component/weapon manufacturers
  'Amon & Reese Co.': '艾蒙和里斯', 'Behring Applied Technology': '贝林应用技术',
  'Wen-Cassel Propulsion': '温-卡塞尔推进', 'J-Span': 'J-Span',
  'Lightning Power Ltd.': '闪电动力', 'Gorgon Defender Industries': '戈尔贡防御工业',
  'Ascension Astro': '升天航天', 'ACOM': 'ACOM',
  'Hurston Dynamics': '赫斯顿动力',
  'Kriskin Dynamics': '克里斯金动力',
  'Sakura Sun': '樱花太阳',
  'Futuramic': '未来主义',
  'Firebird': '火鸟',
  // Ship weapon manufacturers
  'Klaus & Werner': '克劳斯和沃纳',
  'Gallenson Tactical Systems': '加伦森战术系统',
  'MaxOx': '马克士氧化',
  'Kruger Intergalactic': '克鲁格星际',
  'Joker Engineering': '小丑工程',
  'Preacher Armament': '传教士军备',
  'Associated Sciences & Development': '联合科学与开发',
  'KnightBridge Arms': '骑士桥军备',
  'Kroneg': '克罗内格',
  'Apocalypse Arms': '天启军备',
  'Armscor': '军械公司',
  // Shield manufacturers
  'Basilisk': '巴西利斯克',
  'Seal Corporation': '海豹公司',
  'Yorm': '约姆',
  // Missile manufacturers
  'FireStorm Kinetics': '火风暴动力学',
  'Thermyte Concern': '热能公司',
  'Talon Weapons Systems': '利爪武器系统',
  'Nova Pyrotechnica': '新星烟火',
  // QD manufacturers
  'Accelerated Mass Design': '加速质量设计',
  'Julian Aerospace Industries': '朱利安航天工业',
  'Racer Dynamics': '赛车动力学',
  'Wei-Tek': '魏技术',
  // Radar manufacturers
  'WillsOp': '威尔斯操作',
  'Chimera Communications': '奇美拉通信',
  'Nav-E7 Gadgets': 'Nav-E7装置',
  'Blue Triangle Inc.': '蓝三角公司',
  'Groupe Nouveau Paradigme': '新范式集团',
};

// ============================================================
// Attribute name ? Chinese
// ============================================================

const ATTR_ZH = {
  'Size': '尺寸', 'Damage': '伤害', 'Rate Of Fire': '射速', 'Range': '射程',
  'Speed': '速度', 'Spread': '散布', 'Heat Per Shot': '每发热量', 'Power Draw': '功耗',
  'Shield Health': '护盾血量', 'Regen Rate': '再生速率', 'Downed Regen Rate': '倒地再生速率',
  'Damaged Regen Rate': '受损再生速率', 'Max Shield Face': '最大护盾面',
  'Cooldown Rate': '冷却速率', 'Cooldown Time': '冷却时间', 'Spin Up Time': '预热时间',
  'Capacity': '容量', 'Fuel Capacity': '燃料容量',
  'Quantum Fuel Requirement': '量子燃料需求', 'Jump Fuel Requirement': '跳跃燃料需求',
  'Calibration Rate': '校准速率', 'Sensitivity': '灵敏度', 'Signature': '信号特征',
  'EMP Resistance': 'EMP抗性', 'Distortion Resistance': '扭曲抗性',
  'Thermal Energy': '热能', 'Thermal Rate': '热能速率', 'Item Count': '物品数量',
  'Durability': '耐久度', 'Class': '分类', 'Grade': '品级', 'Weapon Class': '武器分类',
  'Type': '类型', 'Attachment Barrel': '枪管附件', 'Attachment Optics': '瞄准镜附件',
  'Attachment Underbarrel': '下挂附件', 'Armor Class': '护甲等级', 'Weight': '重量',
  'Penetration': '穿透力', 'Absorption': '吸收率', 'Port Count': '端口数量',
  'Inventory Count': '库存数量', 'Cargo Capacity': '货物容量', 'Volume': '体积',
  'Mass': '质量', 'Health': '血量', 'Lifetime': '寿命', 'Ammunition': '弹药',
  'Missile Count': '导弹数量', 'Max Missiles': '最大导弹数', 'Detection Range': '探测范围',
  'Tracking Range': '追踪范围', 'FOV': '视野', 'Pitch Rate': '俯仰速率',
  'Yaw Rate': '偏航速率', 'Roll Rate': '滚转速率', 'Max Speed': '最高速度',
  'Afterburner Speed': '加力燃烧速度', 'Scatter': '散布', 'Fire Rate': '开火速率',
  'Pellet Count': '弹丸数量', 'Charge Time': '充能时间', 'Charged Damage': '充能伤害',
  'Distortion Damage': '扭曲伤害', 'Physical Damage': '物理伤害', 'Energy Damage': '能量伤害',
  'Stun Duration': '眩晕时间', 'Mine Count': '地雷数量', 'Mine Duration': '地雷持续时间',
  'Arm Time': '启动时间', 'Explosion Radius': '爆炸半径', 'Lock Time': '锁定时间',
  'Lock Range': '锁定范围',
  'Extraction Laser Power': '提取激光功率', 'Extraction Speed': '提取速度',
  'Extraction Throughput': '提取吞吐量', 'Extraction Efficiency': '提取效率',
  'Mining Laser Power': '采矿激光功率', 'Optimal Charge Rate': '最佳充能速率',
  'Optimal Charge Window Rate': '最佳充能窗口速率',
  'Optimal Charge Window Size': '最佳充能窗口大小',
  'Catastrophic Charge Rate': '灾难性充能速率', 'Safe Flow Rate': '安全流速',
  'Optimal Range': '最佳射程', 'Max Range': '最大射程', 'Maximum Range': '最大射程',
  'Maximum Speed': '最大速度', 'Minimum Lock Distance': '最小锁定距离',
  'Maximum Lock Distance': '最大锁定距离', 'Module Slots': '模块槽位',
  'SCU': 'SCU容量', 'Inert Material Level': '惰性材料等级',
  'Laser Instability': '激光不稳定性', 'Instability': '不稳定性',
  'Shatter Damage': '碎裂伤害', 'Resistance': '抗性', 'Gather Radius': '采集半径',
  'Collection Point Radius': '收集点半径', 'Collection Throughput': '收集吞吐量',
  'Flow Rate': '流速', 'Full Strength Distance': '全强度距离', 'Max Angle': '最大角度',
  'Radius': '半径', 'Duration': '持续时间', 'Uses': '使用次数', 'Missiles': '导弹',
  'Power Transfer': '功率传输', 'Hydrogen Flow Modifier': '氢气流量调节器',
  'Hydrogen Flow Speed': '氢气流速', 'Quantum Flow Modifier': '量子流量调节器',
  'Quantum Flow Speed': '量子流速', 'Cluster Modifier': '集群调节器',
  'Tracking Signal': '追踪信号', 'Throttle min': '最小油门', 'Max. Integrity': '最大完整性',
  'Item Type': '物品类型', 'Grade Letter': '品级字母', 'Grade Numeric': '品级数字',
};

// ============================================================
// Weapon Type mapping: UEX item_type ? global.ini WeaponType code
// Used for structured key matching: item_Name{MFR}_{WeaponType}_{Size}
// ============================================================

const WEAPON_TYPE_CODE = {
  'Laser Cannon': 'LaserCannon',
  'Laser Repeater': 'LaserRepeater',
  'Laser Scattergun': 'LaserScattergun',
  'Ballistic Cannon': 'BallisticCannon',
  'Ballistic Repeater': 'BallisticRepeater',
  'Ballistic Gatling': 'BallisticGatling',
  'Ballistic Scattergun': 'BallisticScattergun',
  'Distortion Cannon': 'DistortionCannon',
  'Distortion Repeater': 'DistortionRepeater',
  'Distortion Scattergun': 'DistortionScatterGun',
  'Neutron Cannon': 'NeutronCannon',
  'Neutron Repeater': 'NeutronRepeater',
  'Plasma Cannon': 'PlasmaCannon',
  'Plasma Scattergun': 'PlasmaScattergun',
  'Mass Driver Cannon': 'MassDriver',
  'Tachyon Cannon': 'TachyonCannon',
  'Rocket Pod': 'RocketPod',
  'Laser Beam': 'LaserBeam',
};

// Missile guidance type ? global.ini code
const MISSILE_GUIDANCE_CODE = {
  'Cross Section': 'CS',
  'Electromagnetic': 'EM',
  'Infrared': 'IR',
  'Dumbfire': 'DF',
  'Heat Seeking': 'IR',  // Heat Seeking maps to IR in global.ini
};

// UEX company_name ? global.ini MFR code (reverse lookup)
// Built from MFR_CODE_MAP + additional aliases
const COMPANY_TO_MFR = {};
for (const [code, name] of Object.entries(MFR_CODE_MAP)) {
  // Use first word for matching (handles "Behring Applied Technology" ? BEHR)
  const key = name.toLowerCase();
  if (!COMPANY_TO_MFR[key]) {
    COMPANY_TO_MFR[key] = code;
  }
}
// Additional aliases for common company name variations
Object.assign(COMPANY_TO_MFR, {
  'behring applied technology': 'BEHR',
  'behring': 'BEHR',
  'klaus & werner': 'KLWE',
  'klaus and werner': 'KLWE',
  'gallenson tactical systems': 'GATS',
  'gallenson': 'GATS',
  'maxox': 'MXOX',
  'kruger intergalactic': 'KRIG',
  'joker engineering': 'JOKR',
  'preacher armament': 'PRAR',
  'associated sciences & development': 'ASAD',
  'associated sciences and development': 'ASAD',
  'knightbridge arms': 'KBAR',
  'kroneg': 'KRON',
  'hurston dynamics': 'TRAS',  // HRST for components, TRAS for weapons
  'apocalypse arms': 'APAR',  // global.ini uses APAR for Apocalypse weapons
  'amon & reese co.': 'AMRS',  // Amon & Reese is NOT in global.ini; fallback to AMRS won't help but prevents wrong match
  'amon and reese co.': 'AMRS',
  'gorgon defender industries': 'GODI',
  'ascension astro': 'ASAS',
  'basilisk': 'BASL',
  'seal corporation': 'SECO',
  'yorm': 'YORM',
  'firestorm kinetics': 'FSKI',
  'thermyte concern': 'THCN',
  'talon weapons systems': 'TALN',
  'nova pyrotechnica': 'NOVP',
  'accelerated mass design': 'ACAS',
  'julian aerospace industries': 'JUST',
  'racer dynamics': 'RACO',
  'wei-tek': 'WETK',
  'wen-cassel propulsion': 'WENC',
  'j-span': 'JSPN',
  'sakura sun': 'SWKS',
  'lightning power ltd.': 'LPLT',
  'aegis dynamics': 'AEGS',
  'anvil aerospace': 'ANVL',
  'argo astronautics': 'ARGO',
  'aopoa': 'XNAA',
  'arccorp': 'ARCC',
  'banu souli': 'BANU',
  'broad & rabiee': 'BANU',
  'drake interplanetary': 'DRAK',
  'esperia incorporation': 'ESPR',
  'flashfire systems': 'FSKI',
  "grey's market": 'GATS',
  "grey&apos;s market": 'GATS',
  'greycat industrial': 'GRIN',
  'juno starwerk': 'JSWR',
  'ke group': 'KEGR',
  'musashi industrial and starflight concern': 'MISC',
  'origin jumpworks': 'ORIG',
  'ramp corporation': 'RAMP',
  'roberts space industries': 'RSI',
  'shubin interstellar': 'SHBN',
  'stor-all': 'SALL',
  'tarsus': 'TARS',
  'tyler design & tech': 'TYLR',
  'vanduul clans': 'VNCL',
  'nav-e7 gadgets': 'NVSE',
  'willsop': 'WLOP',
  'chimera communications': 'CHMR',
  'blue triangle inc.': 'BLTR',
  'groupe nouveau paradigme': 'GNPM',
});

// ============================================================
// HTTP utilities
// ============================================================

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'UEX-Trade-Navigator/3.24.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.status === 'ok') {
            resolve(parsed.data);
          } else {
            reject(new Error(`API returned status: ${parsed.status}`));
          }
        } catch (e) {
          reject(new Error(`JSON parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.get(url, { headers: { 'User-Agent': 'UEX-Trade-Navigator/3.24.0' } }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return fetchText(res.headers.location).then(resolve, reject);
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // Remove UTF-8 BOM if present (EF BB BF)
        let start = 0;
        if (buffer.length >= 3 && buffer[0] === 0xEF && buffer[1] === 0xBB && buffer[2] === 0xBF) {
          start = 3;
        }
        // Decode as UTF-8 (the global.ini file is UTF-8 encoded)
        const text = buffer.slice(start).toString('utf-8');
        resolve(text);
      });
    });
    req.on('error', reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================
// global.ini download & parse
// ============================================================

const GLOBAL_INI_URL = 'https://gitee.com/StarCitizen_CN/sc_l10n_zh_s/raw/main/all/data/Localization/chineset/global.ini';

async function downloadGlobalIni() {
  console.log('   Downloading global.ini from ???????...');
  try {
    const text = await fetchText(GLOBAL_INI_URL);
    console.log(`   Downloaded: ${(text.length / 1024).toFixed(0)} KB`);
    return text;
  } catch (e) {
    console.warn(`   Failed to download global.ini: ${e.message}`);
    console.warn('   Continuing without Chinese item names from global.ini');
    return null;
  }
}

function parseGlobalIni(text) {
  const data = {};
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.substring(0, idx).trim();
      const value = trimmed.substring(idx + 1).trim();
      if (value && value !== '<-=MISSING=->') {
        data[key] = value;
      }
    }
  }
  return data;
}

/**
 * Build item name matching index from global.ini
 * Handles TWO key formats:
 *   Weapon style:   item_Name{CODE}_{BaseName}  (e.g., item_NameAPAR_OmniskyIII)
 *   Component style: item_Name{TYPE}_{MFR}_{SIZE}_{Model}  (e.g., item_NameCOOL_JSPN_S01_CryoStar)
 */
function buildItemNameIndex(iniData) {
  // Index 1: full key ? Chinese name
  const itemNameEntries = {};  // full key ? Chinese name
  // Index 2: Normalized base name (lowercase, no spaces) ? [{code, zhName}]
  const baseNameIndex = {};

  // Component type codes for detection
  const COMPONENT_TYPES = new Set([
    'COOL', 'SHLD', 'POWR', 'QDRV', 'RAWR', 'QIMA', 'WPN', 'GUN',
    'MSLA', 'MSSL', 'MRAK', 'TURR', 'MINE', 'BNMB', 'BEAM', 'TKBE',
    'QENG', 'MODU', 'CONT', 'FUEL', 'DOCK', 'EXPD', 'GIMB', 'ARMR',
  ]);

  for (const [key, value] of Object.entries(iniData)) {
    if (!key.startsWith('item_Name')) continue;
    if (!value) continue;  // Include even non-Chinese values for matching
    // Only include entries with Chinese chars for final name, but keep model-number-only for matching
    const hasChinese = /[\u4e00-\u9fff]/.test(value);

    itemNameEntries[key] = value;

    const suffix = key.substring('item_Name'.length);

    // Detect format by checking if the first segment is a component type code
    // Component style: {TYPE}_{MFR}_{SIZE}_{Model} - TYPE is 4 uppercase letters from COMPONENT_TYPES
    // Weapon style: {CODE}_{BaseName} - CODE is 4 uppercase letters NOT in COMPONENT_TYPES

    const firstUnderscore = suffix.indexOf('_');
    if (firstUnderscore <= 0) continue;

    const firstSegment = suffix.substring(0, firstUnderscore);

    // Handle leading underscore (e.g., item_Name_SHLD_BEHR_S01_6SA)
    let effectiveSuffix = suffix;
    if (firstSegment === '' && suffix.length > firstUnderscore + 1) {
      effectiveSuffix = suffix.substring(1);
    }

    const segments = effectiveSuffix.split('_');

    if (COMPONENT_TYPES.has(segments[0]) && segments.length >= 4) {
      // Component style: TYPE_MFR_SIZE_MODEL[_...]
      const type = segments[0];
      const mfr = segments[1];
      const size = segments[2];
      const modelParts = segments.slice(3);
      // Remove _SCItem suffix if present
      const cleanModelParts = modelParts.filter(p => p !== 'SCItem');
      const modelBase = cleanModelParts.join('');
      const normalizedModel = modelBase.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normalizedModel.length >= 2) {
        if (!baseNameIndex[normalizedModel]) baseNameIndex[normalizedModel] = [];
        baseNameIndex[normalizedModel].push({
          code: mfr, type, size, baseName: modelBase, zhName: value, fullKey: key,
        });
      }
    } else {
      // Weapon style: CODE_BaseName
      const code = segments[0];
      const baseName = segments.slice(1).join('');
      const normalizedBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');

      if (normalizedBase.length >= 2) {
        if (!baseNameIndex[normalizedBase]) baseNameIndex[normalizedBase] = [];
        baseNameIndex[normalizedBase].push({ code, baseName, zhName: value, fullKey: key });
      }
    }
  }

  return { itemNameEntries, baseNameIndex };
}

/**
 * Structured key lookup: Use company + item_type + size to directly look up
 * the global.ini key. This is the PRIMARY matching strategy for ship weapons,
 * missiles, QDs, and shields.
 *
 * Key formats in global.ini:
 *   Ship weapons:  item_Name{MFR}_{WeaponType}_{Size}       e.g. item_NameKLWE_LaserRepeater_S1
 *   Missiles:      item_NameMISL_S{size}_{Guide}_{MFR}_{Model}  e.g. item_NameMISL_S01_IR_BEHR_Marksman
 *   QD:            item_NameQDRV_{MFR}_S{size}_{Model}[_SCItem]  e.g. item_NameQDRV_TARS_S01_Expedition
 *   Shields:       item_NameSHLD_{MFR}_S{size}_{Model}          e.g. item_NameSHLD_BEHR_S01_6SA
 *                  item_Name_SHLD_{MFR}_S{size}_{Model}         e.g. item_Name_SHLD_BEHR_S02_6MA
 *   Coolers/Power: item_Name{TYPE}_{MFR}_S{size}_{Model}       (already handled by baseNameIndex)
 */
/**
 * Extract the REAL weapon size from the item name when UEX's size field is wrong.
 * UEX API returns size='1' for Behring AD4B/AD5B/AD6B/SF7B, but these are
 * actually S4/S5/S6/S7 weapons (the size is embedded in the name).
 *
 * Known patterns:
 *   AD4B ? 4, AD5B ? 5, AD6B ? 6, SF7B ? 7
 *   C-788 ? UEX size is correct (4), don't override
 */
function extractGunSizeFromName(itemName, uexSize) {
  // Behring ADx series: AD4B, AD5B, AD6B - the digit before B is the size
  let m = itemName.match(/AD(\d+)B/i);
  if (m) return m[1];

  // Behring SFxB series: SF7B - the digit before B is the size
  m = itemName.match(/SF(\d+)B/i);
  if (m) return m[1];

  // Fall back to UEX size
  return uexSize;
}

/**
 * Infer item_type from the item name when UEX API leaves it blank.
 * For Guns category, the weapon type is often embedded in the name
 * (e.g., "NV57 Ballistic Gatling" ? "Ballistic Gatling").
 * Returns the inferred item_type string, or '' if nothing matches.
 */
function inferItemTypeFromName(itemName, category) {
  if (category !== 'Guns') return '';
  const name = itemName.toLowerCase();

  // Check each known weapon type in order (longer strings first to avoid partial matches)
  const WEAPON_TYPE_PATTERNS = [
    ['Ballistic Gatling', 'ballistic gatling'],
    ['Ballistic Scattergun', 'ballistic scattergun'],
    ['Ballistic Repeater', 'ballistic repeater'],
    ['Ballistic Cannon', 'ballistic cannon'],
    ['Laser Scattergun', 'laser scattergun'],
    ['Laser Repeater', 'laser repeater'],
    ['Laser Cannon', 'laser cannon'],
    ['Distortion Scattergun', 'distortion scattergun'],
    ['Distortion Repeater', 'distortion repeater'],
    ['Distortion Cannon', 'distortion cannon'],
    ['Neutron Repeater', 'neutron repeater'],
    ['Neutron Cannon', 'neutron cannon'],
    ['Plasma Scattergun', 'plasma scattergun'],
    ['Plasma Cannon', 'plasma cannon'],
    ['Mass Driver Cannon', 'mass driver cannon'],
    ['Tachyon Cannon', 'tachyon cannon'],
    ['Rocket Pod', 'rocket pod'],
    ['Laser Beam', 'laser beam'],
  ];

  for (const [itemType, pattern] of WEAPON_TYPE_PATTERNS) {
    if (name.includes(pattern)) return itemType;
  }
  return '';
}

function structuredKeyLookup(itemName, companyName, itemType, size, category, iniData) {
  if (!iniData) return '';

  // Resolve manufacturer code from company name
  const mfrCode = resolveMfrCode(companyName);
  if (!mfrCode) return '';

  // Global.ini size format:
  //   Ship weapons: S1, S2, S3... (no zero-padding)
  //   Shields/QD/Missiles: S01, S02, S03... (zero-padded to 2 digits)
  // IMPORTANT: UEX API's `size` field is sometimes wrong for weapons
  //   (e.g. AD4B has size=1 but is actually S4). Extract real size from name.
  const weaponSize = extractGunSizeFromName(itemName, size);
  const sizeNum = parseInt(weaponSize) || 0;
  const sizeStrWeapons = `S${sizeNum}`;           // S1, S2, S3...
  const sizeStrComponents = `S${String(sizeNum).padStart(2, '0')}`;  // S01, S02, S03...

  // === 1. Ship Weapons (Guns) ===
  if (category === 'Guns' && itemType) {
    const weaponTypeCode = WEAPON_TYPE_CODE[itemType];
    if (weaponTypeCode) {
      const keyPrefix = `item_Name${mfrCode}_${weaponTypeCode}_`;
      const itemModelPrefix = itemName.toUpperCase().split(/\s+/)[0]; // e.g. "BRVS", "SW16BR2"

      // Try variant keys first (e.g. item_NameBEHR_BallisticRepeater_VNG_S2 = "BRVS ?????")
      // Some weapons (BRVS, CVSA, EVSD, etc.) have non-standard _VNG_ or other variant suffixes.
      // Match by value prefix for accuracy: value must start with "MODEL " (model + space/Chinese).
      // Also validate with isValidNameMatch to prevent cross-model contamination.
      for (const [k, v] of Object.entries(iniData)) {
        if (k.startsWith(keyPrefix) && /[\u4e00-\u9fff]/.test(v)) {
          // Value must start exactly with item model prefix followed by space or Chinese
          const vUpper = v.toUpperCase();
          const afterPrefix = vUpper.substring(itemModelPrefix.length);
          if (vUpper.startsWith(itemModelPrefix) && (afterPrefix.startsWith(' ') || afterPrefix.startsWith('\u0020') || afterPrefix === '' || /^[\u4e00-\u9fff]/.test(v.substring(itemModelPrefix.length)))) {
            if (isValidNameMatch(itemName, v)) return v;
          }
        }
      }

      // Fall back to standard size-based key: item_Name{MFR}_{WeaponType}_{Size}
      const key = `item_Name${mfrCode}_${weaponTypeCode}_${sizeStrWeapons}`;
      const val = iniData[key];
      if (val && /[\u4e00-\u9fff]/.test(val) && isValidNameMatch(itemName, val)) return val;

      // Try with _short suffix
      const keyShort = `item_Name${mfrCode}_${weaponTypeCode}_${sizeStrWeapons}_short`;
      const valShort = iniData[keyShort];
      if (valShort && /[\u4e00-\u9fff]/.test(valShort) && isValidNameMatch(itemName, valShort)) return valShort;
    }
  }

  // === 2. Missiles ===
  if (category === 'Missiles') {
    // Extract size from item name: "Pioneer I Missile" ? size 1, "Arrester III" ? size 3
    // Also extract model name for direct lookup
    const missileMatch = itemName.match(/(\w+)\s+([IVX]+)(?:\s*-?\s*(G|CS|EM|IR))?/i);
    const missileSize = extractMissileSize(itemName);
    const missileModel = extractMissileModelName(itemName);

    if (missileModel) {
      // Try all guidance types for this missile
      const guidanceTypes = ['CS', 'EM', 'IR', 'DF'];
      for (const guide of guidanceTypes) {
        const key = `item_NameMISL_S${String(missileSize).padStart(2, '0')}_${guide}_${mfrCode}_${missileModel}`;
        const val = iniData[key];
        if (val && /[\u4e00-\u9fff]/.test(val)) return val;
      }
    }
  }

  // === 3. Shield Generators ===
  if (category === 'Shield Generators') {
    // Extract model name from UEX item name: "6SA 'Arbiter'" ? model = "6SA"
    const shieldModel = extractShieldModel(itemName);

    if (shieldModel) {
      // Try: item_NameSHLD_{MFR}_S{size}_{Model}
      const key1 = `item_NameSHLD_${mfrCode}_${sizeStrComponents}_${shieldModel}`;
      const val1 = iniData[key1];
      if (val1 && /[\u4e00-\u9fff]/.test(val1)) return val1;

      // Try: item_Name_SHLD_{MFR}_S{size}_{Model} (with leading underscore)
      const key2 = `item_Name_SHLD_${mfrCode}_${sizeStrComponents}_${shieldModel}`;
      const val2 = iniData[key2];
      if (val2 && /[\u4e00-\u9fff]/.test(val2)) return val2;

      // Try lowercase model variants (e.g., 7sa vs 7SA)
      const key3 = `item_NameSHLD_${mfrCode}_${sizeStrComponents}_${shieldModel.toLowerCase()}`;
      const val3 = iniData[key3];
      if (val3 && /[\u4e00-\u9fff]/.test(val3)) return val3;
    }

    // Also try just matching by company + size (for shields like "Glacis", "RS-Barrier")
    // These might be under item_NameSHLD_ORIG_S03_Glacis or item_Name_SHLD_AEGS_S03_RSBarrier
    const normalizedName = itemName.replace(/[^a-zA-Z0-9]/g, '');
    // Try both key formats
    for (const prefix of [`item_NameSHLD_${mfrCode}_${sizeStrComponents}_`, `item_Name_SHLD_${mfrCode}_${sizeStrComponents}_`]) {
      for (const [key, val] of Object.entries(iniData)) {
        if (key.startsWith(prefix) && /[\u4e00-\u9fff]/.test(val) && !key.endsWith('_SCItem')) {
          const keyModel = key.substring(prefix.length).replace(/[^a-zA-Z0-9]/g, '');
          if (keyModel.toLowerCase() === normalizedName.toLowerCase()) return val;
        }
      }
    }
  }

  // === 4. Quantum Drives ===
  if (category === 'Quantum Drives') {
    const normalizedName = itemName.replace(/[^a-zA-Z0-9]/g, '');
    // Try: item_NameQDRV_{MFR}_S{size}_{Model} and item_NameQDRV_{MFR}_S{size}_{Model}_SCItem
    const prefix = `item_NameQDRV_${mfrCode}_${sizeStrComponents}_`;
    for (const [key, val] of Object.entries(iniData)) {
      if (key.startsWith(prefix) && /[\u4e00-\u9fff]/.test(val)) {
        const keyModel = key.substring(prefix.length).replace(/_SCItem$/, '').replace(/[^a-zA-Z0-9]/g, '');
        if (keyModel.toLowerCase() === normalizedName.toLowerCase()) return val;
      }
    }
  }

  return '';
}

/**
 * Resolve UEX company_name ? global.ini manufacturer code
 */
function resolveMfrCode(companyName) {
  if (!companyName) return '';
  const lower = companyName.toLowerCase().trim();

  // Direct lookup
  if (COMPANY_TO_MFR[lower]) return COMPANY_TO_MFR[lower];

  // Partial match: try matching company name against MFR_CODE_MAP values
  for (const [code, name] of Object.entries(MFR_CODE_MAP)) {
    if (lower.includes(name.toLowerCase().split(' ')[0]) && name.split(' ')[0].length >= 3) {
      return code;
    }
  }

  return '';
}

/**
 * Extract missile size from UEX item name
 * e.g., "Pioneer I Missile" ? 1, "Arrester III Missile" ? 3, "Seeker IX Torpedo" ? 9
 */
function extractMissileSize(itemName) {
  const romanMap = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10, XI: 11, XII: 12 };
  const match = itemName.match(/\b([IVX]+)\b/);
  if (match && romanMap[match[1]]) return romanMap[match[1]];
  return 0;
}

/**
 * Extract missile model name from UEX item name
 * e.g., "Pioneer I Missile" ? "Pioneer", "Arrester III Missile" ? "Arrester"
 * "EX-T10-CS 'Executor' Torpedo" ? "Executor"
 * "PX-T12 'Apex'" ? "Apex"
 */
function extractMissileModelName(itemName) {
  // Try to extract quoted nickname first: 6MA 'Kozane' ? Kozane, PX-T12 "Apex" ? Apex
  const quoteMatch = itemName.match(/['"'"']([^'"'"']+)['"'"']/);
  if (quoteMatch) return quoteMatch[1];

  // Extract the first word(s) before the roman numeral
  const match = itemName.match(/^([A-Za-z]+)/);
  return match ? match[1] : '';
}

/**
 * Extract shield model name from UEX item name
 * e.g., "6SA 'Arbiter'" ? "6SA", "FR-66" ? "FR66", "AllStop" ? "AllStop"
 */
function extractShieldModel(itemName) {
  // Extract the model code before the quote: "6SA 'Arbiter'" ? "6SA"
  const match = itemName.match(/^([A-Za-z0-9-]+)/);
  if (match) return match[1].replace(/-/g, '');
  return '';
}

/**
 * Check if a Chinese name match is likely valid by comparing model identifiers.
 * Rejects matches where the zh name contains an alphanumeric model ID (like "AD4B",
 * "T-19P", "GT-215") that doesn't appear anywhere in the English item name.
 */
function isValidNameMatch(enName, zhName) {
  if (!zhName || !enName) return true; // Empty is not "wrong"
  const enUpper = enName.toUpperCase();
  // Find all model-like identifiers in the zh name.
  // Extended pattern to capture complex model IDs like:
  //   Simple: AD4B, M5A, SF7B
  //   Complex: SW16BR2, GT-215, T-19P, EX-T10-CS
  // Pattern: one or more letters, optional digit-letter alternations/hyphens, must contain at least one digit
  const zhModels = zhName.match(/\b[A-Z][A-Z0-9]*\d[A-Z0-9]*(?:-[A-Z0-9]+)*\b/g) || [];
  for (const model of zhModels) {
    if (!enUpper.includes(model.toUpperCase())) {
      return false; // zh name contains a foreign model ID
    }
  }
  return true;
}

/**
 * Match a UEX item name to its Chinese name from global.ini
 */
function matchItemNameZh(itemName, company, slug, itemIndex, iniData, itemType, size, category) {
  if (!itemName || !itemIndex) return '';

  // === Strategy 0: Structured key lookup (highest priority) ===
  // For ship weapons, missiles, shields, QDs - use company+type+size for direct key lookup
  // Always try this first as it's more accurate than fuzzy matching
  const structuredResult = structuredKeyLookup(itemName, company, itemType, size, category, iniData);
  if (structuredResult) return structuredResult;

  const { baseNameIndex, itemNameEntries } = itemIndex;

  // Normalize the UEX item name for matching
  // Remove quotes, apostrophes, and special characters
  const normalizedItem = itemName.toLowerCase()
    .replace(/[''"'`]/g, '')       // Remove all quote types
    .replace(/[^a-z0-9\s]/g, '')   // Remove special chars
    .replace(/\s+/g, '')           // Remove spaces
    ;

  // Also normalize the slug (already fairly clean)
  const normalizedSlug = (slug || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  // Strategy 1: Direct normalized name match
  let matches = baseNameIndex[normalizedItem];
  if (matches && matches.length > 0) {
    const zhName = pickBestMatch(matches, company);
    if (zhName) return zhName;
  }

  // Strategy 1b: Try slug-based match
  if (normalizedSlug && normalizedSlug !== normalizedItem) {
    matches = baseNameIndex[normalizedSlug];
    if (matches && matches.length > 0) {
      const zhName = pickBestMatch(matches, company);
      if (zhName) return zhName;
    }
  }

  // Strategy 2: Remove known suffixes and try again
  const suffixes = ['Cannon', 'Repeater', 'Scattergun', 'Gatling', 'Laser',
    'Shield', 'Cooler', 'PowerPlant', 'QuantumDrive', 'Radar', 'Computer',
    'Missile', 'Rack', 'Turret', 'Pod', 'Beam', 'Module', 'Tank',
    'Bomb', 'Mine', 'Launcher'];
  let baseNameTry = normalizedItem;
  for (const suffix of suffixes.map(s => s.toLowerCase())) {
    if (baseNameTry.endsWith(suffix) && baseNameTry.length > suffix.length + 2) {
      baseNameTry = baseNameTry.substring(0, baseNameTry.length - suffix.length);
      matches = baseNameIndex[baseNameTry];
      if (matches && matches.length > 0) {
        const zhName = pickBestMatch(matches, company);
        if (zhName) return zhName;
      }
    }
  }

  // Strategy 3: Try parts of the name (split by spaces and special chars)
  const nameParts = itemName.replace(/[''"'`]/g, '').replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(p => p.length >= 3);
  for (const part of nameParts) {
    const normPart = part.toLowerCase();
    matches = baseNameIndex[normPart];
    if (matches && matches.length > 0 && !matches[0].fuzzy) {
      const zhName = pickBestMatch(matches, company);
      if (zhName) return zhName;
    }
  }

  // Strategy 4: Use slug parts (slug is usually "omnisky-iii-cannon" format)
  if (slug) {
    const slugParts = slug.split('-').filter(p => p.length >= 3);
    for (const part of slugParts) {
      const normPart = part.toLowerCase();
      matches = baseNameIndex[normPart];
      if (matches && matches.length > 0 && !matches[0].fuzzy) {
        const zhName = pickBestMatch(matches, company);
        if (zhName) return zhName;
      }
    }
  }

  // Strategy 5: Try combining slug parts (e.g., "6sa" + "arbiter" ? "6saarbiter")
  if (slug) {
    const fullSlugNorm = slug.replace(/[^a-z0-9]/gi, '').toLowerCase();
    matches = baseNameIndex[fullSlugNorm];
    if (matches && matches.length > 0) {
      const zhName = pickBestMatch(matches, company);
      if (zhName) return zhName;
    }
  }

  // Strategy 6: Search ALL item_Name keys for partial match (most thorough)
  // Try to find the item by matching its key suffix against the normalized item name
  const bestMatch = { key: '', zhName: '', score: 0 };
  for (const [key, value] of Object.entries(itemNameEntries)) {
    // Extract the base name from the key (after item_NameCODE_)
    const suffix = key.substring('item_Name'.length);
    const underscoreIdx = suffix.indexOf('_');
    if (underscoreIdx < 0) continue;
    const code = suffix.substring(0, underscoreIdx);
    const baseName = suffix.substring(underscoreIdx + 1);
    const normBase = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');

    // Calculate match score
    let score = 0;

    // Check if normalized item name contains or is contained in the base name
    if (normBase === normalizedItem || normBase === normalizedSlug) {
      score = 100; // Perfect match
    } else if (normBase.length >= 4 && normalizedItem.includes(normBase)) {
      score = 80; // Item name contains base name
    } else if (normBase.length >= 4 && normBase.includes(normalizedItem)) {
      score = 70; // Base name contains item name
    } else if (normalizedSlug && normBase.length >= 4 && normalizedSlug.includes(normBase)) {
      score = 75; // Slug contains base name
    } else if (normalizedSlug && normBase.length >= 4 && normBase.includes(normalizedSlug)) {
      score = 65; // Base name contains slug
    } else {
      // Try matching each significant part
      const itemParts = normalizedItem.replace(/[^a-z0-9]/g, '').split(/(?=[0-9])|(?<=[0-9])/);
      let partMatch = 0;
      for (const part of itemParts) {
        if (part.length >= 3 && normBase.includes(part)) {
          partMatch += part.length;
        }
      }
      if (partMatch >= 3) score = partMatch * 5;
    }

    // Bonus: manufacturer code matches
    if (score > 0 && company) {
      const mfrName = MFR_CODE_MAP[code];
      if (mfrName && company.toLowerCase().includes(mfrName.toLowerCase().split(' ')[0])) {
        score += 20;
      }
    }

    if (score > bestMatch.score && score >= 30) {
      bestMatch.key = key;
      bestMatch.zhName = value;
      bestMatch.score = score;
    }
  }

  if (bestMatch.score >= 50) {
    return bestMatch.zhName;
  }

  return '';
}

function pickBestMatch(matches, company) {
  if (matches.length === 1) return matches[0].zhName;

  // Prefer matches with Chinese characters
  const chineseMatches = matches.filter(m => /[\u4e00-\u9fff]/.test(m.zhName));
  const candidatePool = chineseMatches.length > 0 ? chineseMatches : matches;

  if (candidatePool.length === 1) return candidatePool[0].zhName;

  // Try to match by manufacturer code
  if (company) {
    for (const m of candidatePool) {
      const mfrName = MFR_CODE_MAP[m.code];
      if (mfrName && company.toLowerCase().includes(mfrName.toLowerCase().split(' ')[0])) {
        return m.zhName;
      }
    }
  }

  // Return first from candidate pool
  return candidatePool[0].zhName;
}

// ============================================================
// Location translation helper
// ============================================================

function translateTerminalName(name) {
  if (!name) return '';
  // Direct lookup
  if (TERMINAL_ZH_MAP[name]) return TERMINAL_ZH_MAP[name];
  // Partial match (longest key first)
  for (const [key, zh] of Object.entries(TERMINAL_ZH_MAP).sort((a, b) => b[0].length - a[0].length)) {
    if (key.length >= 4 && name.toLowerCase().includes(key.toLowerCase())) {
      return zh;
    }
  }
  return name;
}

function translatePlanetName(name) {
  return PLANET_ZH[name] || name;
}

function translateSystemName(name) {
  return SYSTEM_ZH[name] || name;
}

// ============================================================
// Main
// ============================================================

async function main() {
  const skipL10n = process.argv.includes('--skip-l10n');
  console.log('?? Building items catalog from UEX API...');
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`   Chinese localization: ${skipL10n ? 'SKIP' : 'ENABLED'}`);

  // Step 0: Download global.ini for Chinese item names
  let iniData = null;
  let itemIndex = null;
  if (!skipL10n) {
    console.log('\n?? Downloading Chinese localization data...');
    const iniText = await downloadGlobalIni();
    if (iniText) {
      console.log('   Parsing global.ini...');
      iniData = parseGlobalIni(iniText);
      console.log(`   Parsed: ${Object.keys(iniData).length.toLocaleString()} entries`);
      itemIndex = buildItemNameIndex(iniData);
      console.log(`   item_Name* entries: ${Object.keys(itemIndex.itemNameEntries).length}`);
    }
  }

  // Step 1: Fetch all item categories
  console.log('\n?? Fetching categories...');
  const allCategories = await fetchJSON(`${BASE_URL}/categories/?type=item`);
  const relevantCategories = allCategories.filter(c =>
    c.is_game_related && RELEVANT_SECTIONS.includes(c.section)
  );
  console.log(`   Found ${relevantCategories.length} relevant categories:`);
  relevantCategories.forEach(c => console.log(`     - [${c.id}] ${c.section} / ${c.name}`));

  // Step 2: Fetch items for each category
  console.log('\n?? Fetching items for each category...');
  const itemsByCategory = {};
  let totalItems = 0;

  for (const cat of relevantCategories) {
    try {
      const items = await fetchJSON(`${BASE_URL}/items/?id_category=${cat.id}`);
      itemsByCategory[cat.id] = items;
      totalItems += items.length;
      console.log(`   [${cat.id}] ${cat.name}: ${items.length} items`);
      await sleep(300);
    } catch (e) {
      console.warn(`   [${cat.id}] ${cat.name}: FAILED - ${e.message}`);
      itemsByCategory[cat.id] = [];
    }
  }
  console.log(`   Total: ${totalItems} items`);

  // Step 3: Fetch attributes for each category
  console.log('\n?? Fetching attributes for each category...');
  const attrsByCategory = {};

  for (const cat of relevantCategories) {
    try {
      const attrs = await fetchJSON(`${BASE_URL}/items_attributes/?id_category=${cat.id}`);
      attrsByCategory[cat.id] = attrs;
      console.log(`   [${cat.id}] ${cat.name}: ${attrs.length} attribute entries`);
      await sleep(300);
    } catch (e) {
      console.warn(`   [${cat.id}] ${cat.name}: FAILED - ${e.message}`);
      attrsByCategory[cat.id] = [];
    }
  }

  // Step 4: Fetch all category attribute definitions
  console.log('\n?? Fetching category attribute definitions...');
  let allCategoryAttrs = [];
  try {
    allCategoryAttrs = await fetchJSON(`${BASE_URL}/categories_attributes/`);
    console.log(`   Found ${allCategoryAttrs.length} attribute definitions`);
  } catch (e) {
    console.warn(`   Failed: ${e.message}`);
  }

  // Step 4.5: Fetch all item prices to determine buyability
  console.log('\n?? Fetching item prices for buyability info...');
  let allItemPrices = [];
  for (const cat of relevantCategories) {
    try {
      const prices = await fetchJSON(`${BASE_URL}/items_prices/?id_category=${cat.id}`);
      allItemPrices.push(...prices);
      const buyable = prices.filter(p => (p.price_buy || 0) > 0).length;
      console.log(`   [${cat.id}] ${cat.name}: ${prices.length} price entries, ${buyable} buyable`);
      await sleep(300);
    } catch (e) {
      console.warn(`   [${cat.id}] ${cat.name}: FAILED - ${e.message}`);
    }
  }
  console.log(`   Total price entries: ${allItemPrices.length}`);

  // Build itemId ? best buy info (cheapest price_buy > 0 + location)
  const itemBuyInfo = {};
  for (const p of allItemPrices) {
    if ((p.price_buy || 0) <= 0) continue;
    const itemId = p.id_item;
    if (!itemId) continue;
    if (!itemBuyInfo[itemId] || p.price_buy < itemBuyInfo[itemId].price_buy) {
      itemBuyInfo[itemId] = {
        price_buy: p.price_buy,
        terminal_name: p.terminal_name || '',
        city_name: p.city_name || '',
        space_station_name: p.space_station_name || '',
        outpost_name: p.outpost_name || '',
        planet_name: p.planet_name || '',
        star_system_name: p.star_system_name || '',
      };
    }
  }
  console.log(`   Items with buy availability: ${Object.keys(itemBuyInfo).length}`);

  // Step 5: Build the catalog
  console.log('\n???  Building catalog...');

  const catalog = {
    version: new Date().toISOString().split('T')[0],
    generated_at: new Date().toISOString(),
    categories: relevantCategories.map(c => ({
      id: c.id,
      section: c.section,
      section_zh: SECTION_ZH[c.section] || c.section,
      name: c.name,
      name_zh: CATEGORY_ZH[c.id] || c.name,
      is_game_related: c.is_game_related,
      item_count: (itemsByCategory[c.id] || []).length,
    })),
    items: {},
    attributes: {},
    category_attribute_defs: {},
  };

  // Match Chinese names for all items
  let nameZhMatched = 0;
  let nameZhTotal = 0;
  let nameZhRejected = 0;

  // Populate items with Chinese names + extract item_type/class/grade from attributes
  for (const cat of relevantCategories) {
    const items = itemsByCategory[cat.id] || [];
    const catAttrs = attrsByCategory[cat.id] || [];

    // Build itemId ? attributes lookup for this category
    const itemAttrsLookup = {};
    for (const a of catAttrs) {
      const itemId = a.id_item;
      if (!itemAttrsLookup[itemId]) itemAttrsLookup[itemId] = [];
      itemAttrsLookup[itemId].push(a);
    }

    catalog.items[cat.id] = items.map(item => {
      const attrs = itemAttrsLookup[item.id] || [];
      let itemType = '';
      let itemTypeZh = '';
      let weaponCategory = '';
      let itemClass = '';
      let itemClassZh = '';
      let grade = '';

      for (const a of attrs) {
        if (a.attribute_name === 'Item Type') {
          itemType = String(a.value || '');
          itemTypeZh = ITEM_TYPE_ZH[itemType] || itemType;
          weaponCategory = ITEM_TYPE_WEAPON_CATEGORY[itemType] || '';
        }
        if (a.attribute_name === 'Class') {
          itemClass = String(a.value || '');
          itemClassZh = CLASS_ZH[itemClass] || itemClass;
        }
        if (a.attribute_name === 'Grade') {
          grade = String(a.value || '');
        }
      }

      // If item_type is blank (UEX API gap), infer it from the item name
      // e.g. "NV57 Ballistic Gatling" ? itemType = "Ballistic Gatling"
      if (!itemType && cat.name === 'Guns') {
        const inferred = inferItemTypeFromName(item.name, cat.name);
        if (inferred) {
          itemType = inferred;
          itemTypeZh = ITEM_TYPE_ZH[itemType] || itemType;
          weaponCategory = ITEM_TYPE_WEAPON_CATEGORY[itemType] || '';
        }
      }

      // Match Chinese item name from global.ini
      let nameZh = '';
      if (itemIndex) {
        nameZhTotal++;
        nameZh = matchItemNameZh(item.name, item.company_name, item.slug, itemIndex, iniData, itemType, item.size, cat.name);
        // Reject clearly wrong matches (e.g. NV57 ? "AD4B ?????")
        if (nameZh && !isValidNameMatch(item.name, nameZh)) {
          nameZhRejected++;
          nameZh = '';
        }
        if (nameZh) nameZhMatched++;
      }

      // Buy availability info with Chinese translations
      const buyInfo = itemBuyInfo[item.id];
      const buyLocation = buyInfo
        ? (buyInfo.city_name || buyInfo.space_station_name || buyInfo.outpost_name || '')
        : '';
      const buyPlanet = buyInfo ? (buyInfo.planet_name || '') : '';
      const buySystem = buyInfo ? (buyInfo.star_system_name || '') : '';

      return {
        id: item.id,
        name: item.name,
        name_zh: nameZh || '',
        section: item.section,
        section_zh: SECTION_ZH[item.section] || item.section,
        category: item.category,
        category_zh: CATEGORY_ZH[item.id_category] || item.category,
        company_name: item.company_name || '',
        company_name_zh: MFR_ZH_MAP[item.company_name] || '',
        size: extractGunSizeFromName(item.name, item.size || ''),
        // Item type (e.g. "Laser Cannon" ? "?????")
        item_type: itemType,
        item_type_zh: itemTypeZh,
        weapon_category: weaponCategory,
        // Class (e.g. "Military" ? "??")
        item_class: itemClass,
        item_class_zh: itemClassZh,
        // Grade (e.g. "A", "B", "C", "D")
        grade: grade,
        // Purchase info (with Chinese translations)
        can_buy: !!buyInfo,
        best_price_buy: buyInfo ? buyInfo.price_buy : null,
        buy_location: buyLocation,
        buy_location_zh: translateTerminalName(buyLocation),
        buy_planet: buyPlanet,
        buy_planet_zh: translatePlanetName(buyPlanet),
        buy_system: buySystem,
        buy_system_zh: translateSystemName(buySystem),
        slug: item.slug || '',
        uuid: item.uuid || '',
      };
    });
  }

  if (nameZhTotal > 0) {
    const nameZhEffective = nameZhMatched;
    console.log(`   Chinese names matched: ${nameZhEffective}/${nameZhTotal} (${(nameZhEffective/nameZhTotal*100).toFixed(1)}%)  rejected: ${nameZhRejected}`);
  }

  // Populate attributes by item
  for (const cat of relevantCategories) {
    const attrs = attrsByCategory[cat.id] || [];
    const itemAttrsMap = {};
    for (const a of attrs) {
      const itemId = a.id_item;
      if (!itemAttrsMap[itemId]) {
        itemAttrsMap[itemId] = [];
      }
      itemAttrsMap[itemId].push({
        attribute_name: a.attribute_name,
        attribute_name_zh: ATTR_ZH[a.attribute_name] || a.attribute_name,
        value: String(a.value || ''),
        unit: a.unit || '',
      });
    }
    catalog.attributes[cat.id] = itemAttrsMap;
  }

  // Populate category attribute definitions
  for (const cat of relevantCategories) {
    const catId = cat.id;
    const defs = allCategoryAttrs.filter(a => a.id_category === catId);
    catalog.category_attribute_defs[catId] = defs.map(d => ({
      id: d.id,
      name: d.name,
      name_zh: ATTR_ZH[d.name] || d.name,
      category_name: d.category_name,
      is_lower_better: d.is_lower_better || false,
      description: d.description || '',
    }));
  }

  // Step 6: Write to file
  const outputPath = path.resolve(OUTPUT_PATH);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(catalog, null, 2));

  const sizeKB = (fs.statSync(outputPath).size / 1024).toFixed(1);
  console.log(`\n? Catalog saved to ${outputPath}`);
  console.log(`   File size: ${sizeKB} KB`);
  console.log(`   Categories: ${catalog.categories.length}`);
  console.log(`   Total items: ${Object.values(catalog.items).reduce((sum, items) => sum + items.length, 0)}`);
  console.log(`   Attribute entries: ${Object.values(catalog.attributes).reduce((sum, map) => sum + Object.keys(map).length, 0)}`);

  // Print unmatched item names for manual review
  if (nameZhTotal > 0 && nameZhMatched < nameZhTotal) {
    console.log(`\n??  Items without Chinese name (${nameZhTotal - nameZhMatched}):`);
    const unmatched = [];
    for (const [catId, items] of Object.entries(catalog.items)) {
      for (const item of items) {
        if (!item.name_zh) {
          unmatched.push(`  ${item.name} (${item.company_name || '?'}) [cat:${catId}]`);
        }
      }
    }
    // Print first 30
    unmatched.slice(0, 30).forEach(s => console.log(s));
    if (unmatched.length > 30) console.log(`  ... and ${unmatched.length - 30} more`);
  }
}

main().catch(err => {
  console.error('? Fatal error:', err);
  process.exit(1);
});
