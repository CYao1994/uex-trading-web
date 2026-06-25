import json

for fn, lk in [('wiki-weapons.json','weapons'), ('wiki-items.json','items')]:
    with open(f'C:/Users/GUNDA/uex-trading-web-main/frontend/public/data/{fn}', encoding='utf-8') as f:
        d = json.load(f)
    items_raw = d.get(lk, [])
    if isinstance(items_raw, dict):
        items = list(items_raw.values())
    else:
        items = items_raw
    total = len(items)
    has_img = sum(1 for w in items if isinstance(w, dict) and w.get('image_url'))
    print(f'{fn}: {total} total, {has_img} with image ({has_img*100//max(total,1)}%)')
    for w in items[:2]:
        if isinstance(w, dict):
            img = w.get('image_url', 'NONE')
            print(f'  {w.get("name","?")}: img={str(img)[:80]}')
