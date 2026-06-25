import urllib.request, json

types = ['ShieldGenerator', 'Shield', 'ShieldGen', 'shield_gen', 'shieldgenerator']
for t in types:
    try:
        url = 'https://api.star-citizen.wiki/api/items?filter[type]=' + t + '&page[size]=1'
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=10)
        d = json.loads(resp.read())
        total = d.get('meta', {}).get('total', '?')
        print(f'{t}: total={total}')
    except Exception as e:
        print(f'{t}: error={e}')
