import urllib.request, json

all_fc = []
for page in range(1, 6):
    url = f'https://api.star-citizen.wiki/api/items?filter[type]=FlightController&page[size]=50&page[number]={page}'
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    resp = urllib.request.urlopen(req, timeout=15)
    d = json.loads(resp.read())
    all_fc.extend(d.get('data', []))

slugs = []
for item in all_fc:
    attrs = item.get('attributes', item)
    slug = attrs.get('slug', '')
    slugs.append(slug)

unique = set(slugs)
dupes = len(slugs) - len(unique)
print(f'Total: {len(slugs)}, unique: {len(unique)}, dupes: {dupes}')

# Find duplicate slugs
from collections import Counter
c = Counter(slugs)
for slug, cnt in c.items():
    if cnt > 1:
        print(f'  Dupe: {slug} x{cnt}')
