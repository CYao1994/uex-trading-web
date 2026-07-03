import urllib.request, json

# Fetch a sample of ships from Wiki API with detailed specs
url = 'https://api.star-citizen.wiki/api/vehicles?page[size]=50&page[number]=1'
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json'})
resp = urllib.request.urlopen(req, timeout=15)
d = json.loads(resp.read())

# Load local data
local = json.load(open('C:/Users/GUNDA/uex-trading-web-main/frontend/public/data/wiki-vehicles-1.json', 'r', encoding='utf-8'))
local_vehicles = local.get('vehicles', {})

print(f'Wiki API page 1: {len(d.get("data", []))} vehicles')
print(f'Local vehicles-1: {len(local_vehicles)} vehicles')
print()

# Compare specific fields for first 10 ships
api_data = d.get('data', [])
mismatches = []
for item in api_data[:15]:
    attrs = item.get('attributes', item)
    slug = attrs.get('slug', '')
    name = attrs.get('name', '')
    
    # Find in local
    local_ship = local_vehicles.get(slug, {})
    if not local_ship:
        # Try matching by name
        for ls in local_vehicles.values():
            if ls.get('name', '') == name:
                local_ship = ls
                break
    
    if not local_ship:
        print(f'{name} ({slug}): NOT IN LOCAL')
        continue
    
    # Compare key fields
    fields = {
        'quantum_fuel': ('quantum_fuel', 'quantum_fuel'),
        'quantum_range': ('quantum_range', 'quantum_range'),
        'scu': ('scu', 'scu'),
        'crew_min': ('crew_min', 'crew'),
        'crew_max': ('crew_max', 'crew'),
        'msrp': ('msrp', 'msrp'),
        'role': ('role', 'role'),
    }
    
    issues = []
    for api_key, (local_key, _) in fields.items():
        api_val = attrs.get(api_key) or attrs.get('raw', {}).get(api_key)
        if api_key == 'crew_min' or api_key == 'crew_max':
            crew = attrs.get('crew', {}) or attrs.get('raw', {}).get('crew', {})
            api_val = crew.get(api_key.replace('crew_', ''))
        if api_key == 'msrp':
            api_val = attrs.get('msrp') or attrs.get('raw', {}).get('msrp')
        
        local_val = local_ship.get(local_key)
        if local_key == 'crew':
            crew = local_ship.get('crew', {})
            local_val = crew.get(api_key.replace('crew_', '')) if isinstance(crew, dict) else crew
        
        if api_val is not None and local_val is not None and str(api_val) != str(local_val):
            issues.append(f'{api_key}: API={api_val} local={local_val}')
    
    if issues:
        print(f'{name} ({slug}):')
        for i in issues:
            print(f'  {i}')
        mismatches.append(name)
    else:
        print(f'{name}: OK')

print(f'\nTotal mismatches: {len(mismatches)}')
