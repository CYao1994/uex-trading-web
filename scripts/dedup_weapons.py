import json

path = 'C:/Users/GUNDA/uex-trading-web-main/frontend/public/data/wiki-weapons.json'
with open(path, 'r', encoding='utf-8') as f:
    data = json.load(f)

weapons = data['weapons']
print(f'Before: {len(weapons)} weapons')

seen = {}
dupes = []
for w in weapons:
    slug = w.get('slug', '')
    if slug in seen:
        dupes.append(slug)
    else:
        seen[slug] = w

data['weapons'] = list(seen.values())
data['total_weapons'] = len(data['weapons'])

print(f'After: {len(data["weapons"])} weapons')
print(f'Removed {len(dupes)} duplicates: {dupes}')

with open(path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
print('Saved.')
