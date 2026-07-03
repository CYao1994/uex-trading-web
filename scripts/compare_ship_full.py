import urllib.request, json

# Load ALL local vehicles
local_all = {}
for i in range(1, 5):
    try:
        d = json.load(open(f'C:/Users/GUNDA/uex-trading-web-main/frontend/public/data/wiki-vehicles-{i}.json', 'r', encoding='utf-8'))
        local_all.update(d.get('vehicles', {}))
    except: pass

print(f'Local total: {len(local_all)} vehicles')

# Fetch Wiki API pages 1-6
api_ships = []
for page in range(1, 7):
    url = f'https://api.star-citizen.wiki/api/vehicles?page[size]=50&page[number]={page}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
    resp = urllib.request.urlopen(req, timeout=15)
    d = json.loads(resp.read())
    api_ships.extend(d.get('data', []))

api_slugs = set()
for item in api_ships:
    attrs = item.get('attributes', item)
    api_slugs.add(attrs.get('slug', ''))

print(f'Wiki API total: {len(api_ships)} vehicles ({len(api_slugs)} unique slugs)')

# Find Wiki ships not in local
local_slugs = set(local_all.keys())
missing_local = api_slugs - local_slugs
print(f'\nIn Wiki API but NOT in local: {len(missing_local)}')
for s in sorted(missing_local)[:20]:
    print(f'  {s}')

# Find local ships not in Wiki API
extra_local = local_slugs - api_slugs
print(f'\nIn local but NOT in Wiki API: {len(extra_local)}')
for s in sorted(extra_local)[:20]:
    print(f'  {s}')

# Compare quantum_fuel values for all matching ships
qf_mismatches = []
for item in api_ships:
    attrs = item.get('attributes', item)
    slug = attrs.get('slug', '')
    if slug not in local_all:
        continue
    
    # Wiki quantum_fuel
    qf_wiki = attrs.get('quantum_fuel') or attrs.get('raw', {}).get('quantum_fuel')
    qr_wiki = attrs.get('quantum_range') or attrs.get('raw', {}).get('quantum_range')
    
    # Local quantum_fuel
    ls = local_all[slug]
    qf_local = ls.get('quantum_fuel')
    qr_local = ls.get('quantum_range')
    
    if qf_wiki is not None and qf_local is not None and float(qf_wiki) != float(qf_local):
        qf_mismatches.append(f'{slug}: API qf={qf_wiki} local qf={qf_local}')
    if qr_wiki is not None and qr_local is not None and float(qr_wiki) != float(qr_local):
        qf_mismatches.append(f'{slug}: API qr={qr_wiki} local qr={qr_local}')

print(f'\nQuantum fuel/range mismatches: {len(qf_mismatches)}')
for m in qf_mismatches[:20]:
    print(f'  {m}')
