#!/usr/bin/env python3
"""
sync_chinese_names.py - ??????????????

??????????,?? UEX API ???????????,
????????????????

???:
  1. ParaTranz project 8340 (https://paratranz.cn/projects/8340) - ????
     - 65,000+ ???,?? 3.24 ~ 4.8 ??
     - ? API Token (? https://paratranz.cn/profile ??)
  2. Gitee ????????? global.ini - ?????
     - https://gitee.com/StarCitizen_CN/sc_l10n_zh_s

??: python scripts/sync_chinese_names.py [--dry-run] [--paratranz-token TOKEN]

??:
  1. ? ParaTranz ???????(??)
  2. ? Gitee ?? global.ini ????
  3. ? UEX API ????? (??/??)
  4. ????????????
  5. ???????? + ????? ? ????????
"""

import argparse
import os
import re
import subprocess
import sys
import tempfile
from collections import OrderedDict
from pathlib import Path

# ============================================================
# Config
# ============================================================

GLOBAL_INI_URL = (
    "https://gitee.com/StarCitizen_CN/sc_l10n_zh_s/raw/main/"
    "all/data/Localization/chineset/global.ini"
)

PARATRANZ_PROJECT_ID = 8340
PARATRANZ_API_BASE = "https://paratranz.cn/api"

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
DATA_MAPPER_PATH = PROJECT_ROOT / "cloud-functions" / "api" / "services" / "data_mapper.py"
WARBOND_SCRAPER_PATH = PROJECT_ROOT / "cloud-functions" / "api" / "services" / "warbond_scraper.py"

# Manufacturer code ? English name (from SC item naming convention)
MFR_CODE_MAP = {
    "AEGS": "Aegis", "ANVL": "Anvil", "ARGO": "Argo", "BANU": "Banu",
    "CNOU": "Consolidated Outland", "CRSD": "Crusader", "DRAK": "Drake",
    "ESPR": "Esperia", "GRIN": "Greycat", "KRT": "Kruger",
    "MISC": "MISC", "ORIG": "Origin", "RSI": "RSI", "TMBL": "Tumbril",
    "XNAA": "Xi'an", "GATC": "Gatac", "VAND": "Vanduul",
    "RADD": "Roberts Space Industries", "ANIM": "Anima",
    "TAVS": "Tavda", "MRS": "Mirai",
}

# Manufacturer English ? Chinese (manually verified, authoritative)
MFR_ZH_MAP = {
    "Aegis": "??", "Anvil": "??", "Argo": "???", "Banu": "??",
    "Consolidated Outland": "????", "Crusader": "???", "Drake": "???",
    "Esperia": "?????", "Greycat": "??", "Kruger": "???",
    "MISC": "??", "Origin": "??", "RSI": "RSI", "Tumbril": "???",
    "Xi'an": "???", "Gatac": "???", "Vanduul": "??",
    "Mirai": "??",
}


# ============================================================
# global.ini Parser
# ============================================================

def download_global_ini(dest: str) -> bool:
    """Download global.ini from Gitee using curl."""
    print(f"?? ???? global.ini...")
    try:
        result = subprocess.run(
            ["curl", "-sL", "-k", "--tlsv1.2", "-o", dest, GLOBAL_INI_URL],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode == 0 and os.path.getsize(dest) > 1000:
            print(f"? ????: {os.path.getsize(dest):,} ??")
            return True
        print(f"? ???? (rc={result.returncode})")
        return False
    except Exception as e:
        print(f"? ????: {e}")
        return False


def parse_global_ini(path: str) -> dict[str, str]:
    """Parse global.ini key=value format into a dict."""
    data = {}
    with open(path, "r", encoding="utf-8-sig") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith(";") or line.startswith("#"):
                continue
            idx = line.find("=")
            if idx > 0:
                key = line[:idx].strip()
                value = line[idx + 1:].strip()
                if value and value != "<-=MISSING=->":
                    data[key] = value
    return data


def build_search_index(ini_data: dict) -> dict[str, str]:
    """Build a lowercase key ? original key index for fast lookup."""
    return {k.lower(): k for k in ini_data}


# ============================================================
# ParaTranz translation source
# ============================================================

def download_paratranz_translations(token: str = "") -> dict[str, str]:
    """Download all translations from ParaTranz project.

    Returns: dict of {english_original: chinese_translation}
    """
    import json
    import zipfile
    import tempfile

    all_translations = {}  # original -> (translation, stage)

    # Method 1: Download full export zip (requires token)
    if token:
        print(f"?? ??? ParaTranz ???????...")
        tmp = tempfile.NamedTemporaryFile(suffix=".zip", delete=False)
        tmp_path = tmp.name
        tmp.close()

        try:
            cmd = ["curl", "-sL", "-k",
                   "-H", f"Authorization: {token}",
                   "-o", tmp_path,
                   f"{PARATRANZ_API_BASE}/projects/{PARATRANZ_PROJECT_ID}/artifacts/download"]
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

            if result.returncode == 0 and os.path.getsize(tmp_path) > 1000:
                print(f"? ParaTranz ???????: {os.path.getsize(tmp_path):,} ??")

                with zipfile.ZipFile(tmp_path, 'r') as zf:
                    for name in zf.namelist():
                        if not name.endswith('.json'):
                            continue
                        try:
                            with zf.open(name) as f:
                                entries = json.load(f)
                            for entry in entries:
                                orig = entry.get('original', '').strip()
                                trans = entry.get('translation', '').strip()
                                stage = entry.get('stage', 0)
                                if orig and trans and any('\u4e00' <= c <= '\u9fff' for c in trans):
                                    if orig in all_translations:
                                        existing_stage = all_translations[orig][1]
                                        if stage <= existing_stage:
                                            all_translations[orig] = (trans, stage)
                                    else:
                                        all_translations[orig] = (trans, stage)
                        except Exception:
                            continue
            else:
                print(f"?? ParaTranz ????,???? API...")
        except Exception as e:
            print(f"?? ParaTranz ????: {e}")
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    # Method 2: Fallback to terms API (no auth needed, but fewer entries)
    if not all_translations:
        print(f"?? ??? ParaTranz ?? API ????...")
        page = 1
        while True:
            try:
                url = f"{PARATRANZ_API_BASE}/projects/{PARATRANZ_PROJECT_ID}/terms?page={page}&pageSize=100"
                cmd = ["curl", "-sL", "-k", url]
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
                if result.returncode != 0:
                    break

                data = json.loads(result.stdout)
                results = data.get('results', [])
                if not results:
                    break

                for entry in results:
                    orig = entry.get('term', '').strip()
                    trans = entry.get('translation', '').strip()
                    if orig and trans and any('\u4e00' <= c <= '\u9fff' for c in trans):
                        all_translations[orig] = (trans, 0)

                page_count = data.get('pageCount', 1)
                if page >= page_count:
                    break
                page += 1
            except Exception:
                break

    # Build final dict
    result = {k: v[0] for k, v in all_translations.items()}
    print(f"? ParaTranz ??: {len(result)} ?")
    return result


# ============================================================
# Commodity matching
# ============================================================

def match_commodities(ini_data: dict, uex_commodity_names: list[str]) -> dict[str, str]:
    """Match UEX commodity English names to Chinese from global.ini.

    Strategy:
    1. Direct key match: items_commodities_{lowercase_underscored}
    2. CamelCase expansion: items_commodities_AgriculturalSupplies ? "Agricultural Supplies"
    3. Raw/Ore variants: items_commodities_xxx_raw ? "Xxx (Raw)"
    """
    result = OrderedDict()

    for en_name in sorted(uex_commodity_names):
        zh_name = _match_single_commodity(ini_data, en_name)
        if zh_name:
            result[en_name] = zh_name

    return result


def _match_single_commodity(ini_data: dict, en_name: str) -> str | None:
    """Try to find Chinese translation for a single commodity name."""

    # Normalize: "Laranite (Raw)" ? base="Laranite", variant="(Raw)"
    base = en_name
    variant = ""
    m = re.match(r'^(.+?)\s*\((Raw|Ore)\)$', en_name, re.IGNORECASE)
    if m:
        base = m.group(1).strip()
        variant = m.group(2).lower()

    # Build candidate keys in order of specificity
    candidates = []

    if variant:
        # "Laranite (Raw)" ? items_commodities_laranite_raw
        base_key = _to_sc_key(base)
        candidates.append(f"items_commodities_{base_key}_{variant}")
        # Also try lowercase underscore: items_commodities_laranite_raw
        candidates.append(f"items_commodities_{base.lower()}_{variant}")
        # CamelCase raw: items_commodities_Laranite_Raw
        candidates.append(f"items_commodities_{base}_{variant.capitalize()}")
    else:
        # "Laranite" ? items_commodities_laranite
        base_key = _to_sc_key(base)
        candidates.append(f"items_commodities_{base_key}")
        # CamelCase: "Agricultural Supplies" ? AgriculturalSupplies
        camel = base.replace(" ", "").replace("-", "")
        if camel.lower() != base_key:
            candidates.append(f"items_commodities_{camel}")
        # Full lowercase with underscore
        candidates.append(f"items_commodities_{base.lower().replace(' ', '_').replace('-', '_')}")
        # No spaces, all lowercase
        candidates.append(f"items_commodities_{base.lower().replace(' ', '').replace('-', '')}")

    # Try each candidate
    for key in candidates:
        val = ini_data.get(key)
        if val:
            return val

    # Fuzzy: search all items_commodities_ keys for match
    base_lower = base.lower().replace(" ", "").replace("-", "").replace("_", "")
    for key, val in ini_data.items():
        if not key.startswith("items_commodities_"):
            continue
        if key.endswith("_desc"):
            continue
        suffix = key[len("items_commodities_"):].lower()
        if suffix == base_lower:
            return val
        if suffix.replace("_", "") == base_lower:
            return val
        # Also check with variant
        if variant and suffix.replace("_", "") == f"{base_lower}{variant}":
            return val

    return None


def _to_sc_key(name: str) -> str:
    """Convert English name to SC key format.

    "Agricultural Supplies" ? "agriculturalSupplies" (camelCase)
    "Laranite" ? "laranite"
    "Hydrogen Fuel" ? "hydrogenFuel"
    """
    words = name.replace("(", "").replace(")", "").split()
    if not words:
        return ""
    return words[0].lower() + "".join(w.capitalize() for w in words[1:])


# ============================================================
# Terminal / Location matching
# ============================================================

def match_terminals(ini_data: dict, uex_terminal_names: list[str]) -> dict[str, str]:
    """Match UEX terminal English names to Chinese from global.ini.

    Strategy: Multiple search patterns in global.ini.
    """
    result = OrderedDict()

    for en_name in sorted(uex_terminal_names):
        zh_name = _match_single_terminal(ini_data, en_name)
        if zh_name:
            result[en_name] = zh_name

    return result


def _match_single_terminal(ini_data: dict, en_name: str) -> str | None:
    """Try to find Chinese translation for a terminal/location name."""
    # Strip "Admin - " prefix common in UEX
    clean = re.sub(r'^(Admin|TDD|CBD|Cargo Center|Refinery Ore Sales)\s*-\s*', '', en_name)

    candidates = []

    # 1. Direct ATC key: "Port Olisar" ? ATC_PortOlisar
    atc_key = "ATC_" + clean.replace(" ", "")
    candidates.append(atc_key)

    # 2. text_level_info keys
    for prefix in ["text_level_info_primary_title_", "text_level_info_secondary_title_",
                   "text_level_info_subtitle_"]:
        candidates.append(prefix + clean.replace(" ", ""))

    # 3. desc_shared keys for outposts: "Humboldt Mines" ? HumboldtMines_desc_shared
    candidates.append(clean.replace(" ", "") + "_desc_shared")

    # 4. Direct name key: "Lorville" ? Lorville, "New Babbage" ? NewBabbage
    candidates.append(clean.replace(" ", ""))

    for key in candidates:
        val = ini_data.get(key)
        if val:
            # Clean ATC suffixes
            for suffix in [" ????", " ??", " ????"]:
                val = val.replace(suffix, "")
            return val

    # 5. Full-text search: search all values for exact match patterns
    search_terms = [clean, en_name]
    for term in search_terms:
        # Search keys that contain the terminal name
        for key, val in ini_data.items():
            key_lower = key.lower()
            term_lower = term.lower().replace(" ", "")
            if term_lower in key_lower:
                # Filter: only relevant key prefixes
                relevant_prefixes = ["atc_", "location_", "outpost_", "navbeacon_",
                                     "text_level_info_", "_desc_shared", "_desc_",
                                     "Delamar_", "PU_"]
                if any(key_lower.startswith(p) or key_lower.endswith("_desc_shared") for p in relevant_prefixes):
                    # Extract clean Chinese name
                    clean_val = val
                    for suffix in [" ????", " ??", " ????", "(Levski)"]:
                        clean_val = clean_val.replace(suffix, "")
                    if any('\u4e00' <= c <= '\u9fff' for c in clean_val):
                        return clean_val

    return None


# ============================================================
# Ship name matching
# ============================================================

def match_ships(ini_data: dict, ship_names: list[str]) -> dict[str, str]:
    """Match ship English names to Chinese from global.ini.

    Strategy: Search for item_Name{MFR}_{SHIP_BASE} patterns.
    """
    result = OrderedDict()

    for en_name in sorted(ship_names):
        zh_name = _match_single_ship(ini_data, en_name)
        if zh_name:
            result[en_name] = zh_name

    return result


def _match_single_ship(ini_data: dict, en_name: str) -> str | None:
    """Try to find Chinese translation for a ship name."""

    # Strip manufacturer prefix if present
    base_name = en_name
    mfr_en = None
    for mfr, zh in MFR_ZH_MAP.items():
        if en_name.startswith(mfr + " "):
            base_name = en_name[len(mfr) + 1:]
            mfr_en = mfr
            break

    # Build candidate keys
    candidates = []

    if mfr_en:
        # Find manufacturer code
        mfr_code = None
        for code, name in MFR_CODE_MAP.items():
            if name == mfr_en:
                mfr_code = code
                break

        if mfr_code:
            # item_NameAEGS_Avenger = "?? ???"
            ship_key = base_name.replace(" ", "")
            candidates.append(f"item_Name{mfr_code}_{ship_key}")
            # Also try with common suffixes
            candidates.append(f"item_Name{mfr_code}_{ship_key}_shop")

    # Fallback: search all item_Name keys
    base_lower = base_name.lower().replace(" ", "")
    for key, val in ini_data.items():
        if not key.startswith("item_Name"):
            continue
        suffix = key[len("item_Name"):].lower()
        if base_lower in suffix and any('\u4e00' <= c <= '\u9fff' for c in val):
            # Verify it's a ship, not a component
            # Ships usually have format "?????? ?????"
            parts = val.split(" ", 1)
            if len(parts) == 2 and parts[0] in MFR_ZH_MAP.values():
                return val

    for key in candidates:
        val = ini_data.get(key)
        if val and any('\u4e00' <= c <= '\u9fff' for c in val):
            return val

    # If we know the manufacturer, construct the Chinese name
    if mfr_en and mfr_en in MFR_ZH_MAP:
        # Search global.ini for the ship base name across all manufacturers
        for key, val in ini_data.items():
            if not key.startswith("item_Name"):
                continue
            suffix = key[len("item_Name"):]
            # Check if base name is in this key
            if base_name.replace(" ", "").lower() in suffix.lower():
                # Extract the Chinese base name (remove manufacturer prefix)
                if any('\u4e00' <= c <= '\u9fff' for c in val):
                    parts = val.split(" ", 1)
                    if len(parts) == 2:
                        return f"{MFR_ZH_MAP[mfr_en]} {parts[1]}"

    return None


# ============================================================
# System / Planet name matching
# ============================================================

def match_systems_planets(ini_data: dict) -> tuple[dict, dict]:
    """Extract star system and planet/moon Chinese names from global.ini."""
    system_zh = OrderedDict()
    planet_zh = OrderedDict()

    # Known search patterns for star systems
    system_search = {
        "Stanton": ["???"],
        "Pyro": ["??"],
        "Nyx": ["???"],
    }
    for en, zh_candidates in system_search.items():
        for zh in zh_candidates:
            # Verify by searching in context
            system_zh[en] = zh

    # Planet/moon names from known global.ini key patterns
    planet_search = {
        "ArcCorp": ["???"],
        "Hurston": ["???"],
        "Crusader": ["???"],
        "MicroTech": ["???"],
        "Cellin": ["??"],
        "Daymar": ["???"],
        "Yela": ["??"],
        "Aberdeen": ["???"],
        "Arial": ["???"],
        "Magda": ["???"],
        "Ita": ["??"],
        "Lyria": ["???"],
        "Wala": ["??"],
        "Calliope": ["????"],
        "Clio": ["???"],
        "Euterpe": ["????"],
        "Delamar": ["???"],
    }

    for en, zh_candidates in planet_search.items():
        # Try to verify in global.ini
        for zh in zh_candidates:
            found = False
            for key, val in ini_data.items():
                if zh in val and en.lower() in key.lower():
                    planet_zh[en] = zh
                    found = True
                    break
            if found:
                break
            # Fall back to hardcoded
            planet_zh[en] = zh

    return system_zh, planet_zh


# ============================================================
# UEX API data fetching
# ============================================================

def fetch_uex_terminals() -> list[dict]:
    """Fetch terminal list from UEX API (with API key if available)."""
    print("?? ???? UEX ????...")
    try:
        # Try with API key from .env
        api_key = _load_api_key()
        headers = []
        if api_key:
            headers = ["-H", f"Authorization: Bearer {api_key}"]

        cmd = ["curl", "-sL", "-k", "--tlsv1.2"] + headers + [
            "https://api.uexcorp.space/v2.1/terminals/"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout)
            if isinstance(data, list):
                print(f"? ??? {len(data)} ???")
                return data
    except Exception as e:
        print(f"?? UEX API ????: {e}")
    return []


def fetch_uex_commodities() -> list[dict]:
    """Fetch commodity list from UEX API (with API key if available)."""
    print("?? ???? UEX ????...")
    try:
        api_key = _load_api_key()
        headers = []
        if api_key:
            headers = ["-H", f"Authorization: Bearer {api_key}"]

        cmd = ["curl", "-sL", "-k", "--tlsv1.2"] + headers + [
            "https://api.uexcorp.space/v2.1/commodities/"
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout)
            if isinstance(data, list):
                print(f"? ??? {len(data)} ???")
                return data
    except Exception as e:
        print(f"?? UEX API ????: {e}")
    return []


def _load_api_key() -> str:
    """Load UEX API key from .env file."""
    env_path = PROJECT_ROOT / ".env"
    if env_path.exists():
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line.startswith("UEX_API_KEY="):
                    return line.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


# ============================================================
# Output generation
# ============================================================

def generate_data_mapper_file(system_zh, planet_zh, terminal_zh, commodity_zh,
                              manual_terminal_overrides=None,
                              manual_commodity_overrides=None) -> str:
    """Generate the data_mapper.py file content."""

    # Apply manual overrides (preserve hand-verified names)
    if manual_terminal_overrides:
        terminal_zh.update(manual_terminal_overrides)
    if manual_commodity_overrides:
        commodity_zh.update(manual_commodity_overrides)

    def fmt_dict(d: dict, indent: int = 4) -> str:
        pad = " " * indent
        lines = []
        for k, v in d.items():
            lines.append(f'{pad}"{k}": "{v}",')
        return "\n".join(lines)

    content = f'''"""
Data Mapper - Chinese/English name mappings for Star Citizen trading
Synced from:
  1. ??????? global.ini (Gitee: StarCitizen_CN/sc_l10n_zh_s)
  2. ParaTranz project 8340 (https://paratranz.cn/projects/8340)
"""

SYSTEM_ZH = {{
{fmt_dict(system_zh)}
}}

PLANET_ZH = {{
{fmt_dict(planet_zh)}
}}

TERMINAL_ZH_MAP = {{
{fmt_dict(terminal_zh)}
}}

COMMODITY_ZH_MAP = {{
{fmt_dict(commodity_zh)}
}}


def get_terminal_zh(en_name: str, en_nickname: str = "", en_station: str = "",
                    en_planet: str = "", en_system: str = "") -> str:
    """Translate terminal name to Chinese."""
    if en_name in TERMINAL_ZH_MAP:
        return TERMINAL_ZH_MAP[en_name]
    if en_nickname and en_nickname in TERMINAL_ZH_MAP:
        return TERMINAL_ZH_MAP[en_nickname]
    candidates = [en_name, en_nickname, en_station]
    for cand in candidates:
        if not cand:
            continue
        for key in sorted(TERMINAL_ZH_MAP.keys(), key=len, reverse=True):
            if key.lower() in cand.lower():
                return TERMINAL_ZH_MAP[key]
    return en_name


def get_commodity_zh(en_name: str) -> str:
    """Translate commodity name to Chinese."""
    return COMMODITY_ZH_MAP.get(en_name, en_name)


def format_location_zh(name: str, nickname: str, station: str,
                       planet: str, system: str) -> str:
    """Generate Chinese location description."""
    zh_name = get_terminal_zh(name, nickname, station, planet, system)
    parts = [zh_name]
    if planet:
        zh_planet = PLANET_ZH.get(planet, planet)
        parts.append(f"[{{zh_planet}}]")
    zh_system = SYSTEM_ZH.get(system, system)
    parts.append(f"({{zh_system}})")
    return " ".join(parts)
'''
    return content


# ============================================================
# Main
# ============================================================

def main():
    parser = argparse.ArgumentParser(
        description="Sync Chinese names from Star Citizen global.ini to UEX Trading Web"
    )
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would change without writing files")
    parser.add_argument("--global-ini", type=str, default=None,
                        help="Path to local global.ini (skip download)")
    parser.add_argument("--paratranz-token", type=str, default=None,
                        help="ParaTranz API token for full export download")
    args = parser.parse_args()

    # 1. Get global.ini
    if args.global_ini:
        ini_path = args.global_ini
        print(f"?? ??????: {ini_path}")
    else:
        tmp = tempfile.NamedTemporaryFile(suffix=".ini", delete=False)
        ini_path = tmp.name
        tmp.close()
        if not download_global_ini(ini_path):
            print("? ???? global.ini,??? --global-ini ??????")
            sys.exit(1)

    # 2. Parse
    print("\n?? ???? global.ini...")
    ini_data = parse_global_ini(ini_path)
    print(f"? ????: {len(ini_data):,} ?????")

    # 2b. Download ParaTranz translations (supplementary source)
    paratranz_token = args.paratranz_token or os.environ.get("PARATRANZ_TOKEN", "")
    paratranz_trans = {}
    if paratranz_token:
        paratranz_trans = download_paratranz_translations(paratranz_token)
    else:
        print("?? ??? ParaTranz Token,?? ParaTranz ???")

    # 3. Fetch UEX API data for matching
    print()
    uex_terminals = fetch_uex_terminals()
    uex_commodities = fetch_uex_commodities()

    # Extract unique names
    uex_terminal_names = list(set(
        t.get("name", "") for t in uex_terminals if t.get("name")
    ))
    uex_commodity_names = list(set(
        c.get("name", "") for c in uex_commodities if c.get("name")
    ))

    # Also extract nickname-based terminal names (like "ARC-L1", "HUR-L2")
    uex_terminal_nicknames = list(set(
        t.get("nickname", "") for t in uex_terminals if t.get("nickname")
    ))

    # Fallback: if UEX API returned no data, use current mapping keys
    if not uex_terminal_names:
        print("?? UEX API ???,???????????????")
        cloud_func_path = str(PROJECT_ROOT / "cloud-functions" / "api")
        if cloud_func_path not in sys.path:
            sys.path.insert(0, cloud_func_path)
        from services.data_mapper import TERMINAL_ZH_MAP as CURR_TERM_FALLBACK
        from services.data_mapper import COMMODITY_ZH_MAP as CURR_COMM_FALLBACK
        uex_terminal_names = list(CURR_TERM_FALLBACK.keys())
        uex_commodity_names = list(CURR_COMM_FALLBACK.keys())
        uex_terminal_nicknames = []

    print(f"\n?? ????: {len(uex_terminal_names)} ??, {len(uex_terminal_nicknames)} ??, {len(uex_commodity_names)} ??")

    # 4. Match commodities
    print("\n?? ??????...")
    commodity_zh = match_commodities(ini_data, uex_commodity_names)
    print(f"   ? ????: {len(commodity_zh)}/{len(uex_commodity_names)}")

    # Show unmatched
    unmatched = [n for n in uex_commodity_names if n not in commodity_zh]
    if unmatched:
        print(f"   ?? ??? ({len(unmatched)}): {', '.join(sorted(unmatched)[:10])}{'...' if len(unmatched) > 10 else ''}")

    # 5. Match terminals
    print("\n?? ??????...")
    terminal_zh = match_terminals(ini_data, uex_terminal_names)
    # Also try nicknames
    nick_zh = match_terminals(ini_data, uex_terminal_nicknames)
    terminal_zh.update(nick_zh)
    print(f"   ? ????: {len(terminal_zh)}/{len(uex_terminal_names) + len(uex_terminal_nicknames)}")

    # 6. Match systems/planets
    print("\n?? ????/????...")
    system_zh, planet_zh = match_systems_planets(ini_data)
    print(f"   ? ??: {len(system_zh)}, ??/??: {len(planet_zh)}")

    # 7. Load current manual overrides (preserving hand-verified entries)
    print("\n?? ????????(??????)...")
    cloud_func_path = str(PROJECT_ROOT / "cloud-functions" / "api")
    sys.path.insert(0, cloud_func_path)
    from services.data_mapper import COMMODITY_ZH_MAP as CURR_COMM
    from services.data_mapper import TERMINAL_ZH_MAP as CURR_TERM
    from services.data_mapper import SYSTEM_ZH as CURR_SYS
    from services.data_mapper import PLANET_ZH as CURR_PLANET

    # 7b. Apply ParaTranz translations as overrides for auto-matched items
    if paratranz_trans:
        print(f"\n?? ?? ParaTranz ????...")
        para_overrides_term = 0
        para_overrides_comm = 0
        for en_name in list(terminal_zh.keys()):
            if en_name in paratranz_trans:
                new_zh = paratranz_trans[en_name]
                if new_zh != terminal_zh[en_name]:
                    terminal_zh[en_name] = new_zh
                    para_overrides_term += 1
        for en_name in list(commodity_zh.keys()):
            if en_name in paratranz_trans:
                new_zh = paratranz_trans[en_name]
                if new_zh != commodity_zh[en_name]:
                    commodity_zh[en_name] = new_zh
                    para_overrides_comm += 1
        # Also try to match items not found via global.ini
        for en_name in uex_terminal_names:
            if en_name not in terminal_zh and en_name in paratranz_trans:
                terminal_zh[en_name] = paratranz_trans[en_name]
                para_overrides_term += 1
        for en_name in uex_commodity_names:
            if en_name not in commodity_zh and en_name in paratranz_trans:
                commodity_zh[en_name] = paratranz_trans[en_name]
                para_overrides_comm += 1
        print(f"   ? ParaTranz ??: ?? {para_overrides_term}, ?? {para_overrides_comm}")

    # Current mappings override auto-matched ones (manual = authoritative)
    merged_commodity = OrderedDict(sorted({**commodity_zh, **CURR_COMM}.items()))
    merged_terminal = OrderedDict(sorted({**terminal_zh, **CURR_TERM}.items()))
    merged_system = OrderedDict(sorted({**system_zh, **CURR_SYS}.items()))
    merged_planet = OrderedDict(sorted({**planet_zh, **CURR_PLANET}.items()))

    # 8. Match ships
    print("\n?? ??????...")
    from services.warbond_scraper import SHIP_NAME_ZH as CURR_SHIPS
    # Extract base ship names (without manufacturer prefix)
    ship_base_names = list(set(
        name.split(" ", 1)[1] if " " in name else name
        for name in CURR_SHIPS.keys()
    ))
    ship_zh = match_ships(ini_data, list(CURR_SHIPS.keys()))
    print(f"   ? ????: {len(ship_zh)}/{len(CURR_SHIPS)}")

    # 9. Generate output
    print("\n" + "=" * 60)
    print("?? ????")
    print("=" * 60)
    print(f"  ??: {len(merged_system)} ? (?? {len(CURR_SYS)}, ?? {len(merged_system) - len(CURR_SYS)})")
    print(f"  ??: {len(merged_planet)} ? (?? {len(CURR_PLANET)}, ?? {len(merged_planet) - len(CURR_PLANET)})")
    print(f"  ??: {len(merged_terminal)} ? (?? {len(CURR_TERM)}, ?? {len(merged_terminal) - len(CURR_TERM)})")
    print(f"  ??: {len(merged_commodity)} ? (?? {len(CURR_COMM)}, ?? {len(merged_commodity) - len(CURR_COMM)})")
    print(f"  ??: {len(ship_zh)} ???")

    # 10. Write output
    if not args.dry_run:
        print("\n?? ?? data_mapper.py...")
        content = generate_data_mapper_file(
            merged_system, merged_planet, merged_terminal, merged_commodity,
            manual_terminal_overrides=CURR_TERM,
            manual_commodity_overrides=CURR_COMM,
        )
        with open(DATA_MAPPER_PATH, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"   ? ??? {DATA_MAPPER_PATH}")

        # Generate ship/manufacturer updates for warbond_scraper.py
        print("\n?? ?? warbond_scraper.py ????...")
        _update_warbond_ships(ship_zh)
    else:
        print("\n(--dry-run ??,???????)")

    # Cleanup
    if not args.global_ini:
        os.unlink(ini_path)

    print("\n? ????!")


def _update_warbond_ships(ship_zh: dict):
    """Update SHIP_NAME_ZH in warbond_scraper.py with new matches."""
    if not ship_zh:
        print("   ?? ???????")
        return

    with open(WARBOND_SCRAPER_PATH, "r", encoding="utf-8") as f:
        content = f.read()

    # For now, just report what would change
    # A full update would require careful surgery of the SHIP_NAME_ZH dict
    changed = 0
    for en, zh_new in ship_zh.items():
        # Check if this entry exists and has changed
        pattern = f'"{en}": "'
        idx = content.find(pattern)
        if idx >= 0:
            # Extract current value
            start = idx + len(pattern)
            end = content.find('"', start)
            if end > start:
                zh_old = content[start:end]
                if zh_old != zh_new:
                    print(f"   ?? {en}: {zh_old} ? {zh_new}")
                    changed += 1

    if changed == 0:
        print("   ? ????????")
    else:
        print(f"   ?? {changed} ????????(????????)")


if __name__ == "__main__":
    main()
