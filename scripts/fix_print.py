import re

files = [
    'C:/Users/GUNDA/uex-trading-web-main/cloud-functions/backend/services/uex_api.py',
    'C:/Users/GUNDA/uex-trading-web-main/cloud-functions/backend/services/warbond_scraper.py',
    'C:/Users/GUNDA/uex-trading-web-main/cloud-functions/backend/services/cache.py',
]

replacements = {
    'print(f"[PricesCache]': 'logging.info(f"[PricesCache]',
    'print(f"[{name}Cache]': 'logging.info(f"[{name}Cache]',
    'print(f"RSI GraphQL API failed': 'logging.warning(f"RSI GraphQL API failed',
    'print(f"Merged ': 'logging.info(f"Merged ',
    'print(f"starnotifier.com merge failed': 'logging.warning(f"starnotifier.com merge failed',
    'print(f"Upgrade API: ': 'logging.info(f"Upgrade API: ',
    'print(f"Upgrade API image fetch failed': 'logging.warning(f"Upgrade API image fetch failed',
    'print(f"[DistanceCache] Loaded': 'logging.info(f"[DistanceCache] Loaded',
    'print(f"[DistanceCache] Failed': 'logging.warning(f"[DistanceCache] Failed',
}

for path in files:
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    for old, new in replacements.items():
        content = content.replace(old, new)
    
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        count = sum(1 for old in replacements if old in original)
        print(f'Fixed {count} in {path.split("/")[-1]}')
    else:
        print(f'No changes: {path.split("/")[-1]}')
