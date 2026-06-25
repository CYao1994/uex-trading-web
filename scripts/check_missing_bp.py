import json
from collections import Counter

d = json.load(open('C:/Users/GUNDA/uex-trading-web-main/frontend/public/data/wiki-blueprints.json', 'r', encoding='utf-8'))
bps = list(d['blueprints'].values())
missing = [b.get('name', '?') for b in bps if not b.get('name_zh')]
total = len(bps)
translated = sum(1 for b in bps if b.get('name_zh'))
print(f'Missing: {total - translated} of {total} ({translated*100//total}%)')

words = []
for n in missing:
    for w in n.split():
        w = w.lower().strip('"_-')
        if len(w) > 2:
            words.append(w)
c = Counter(words)
for word, cnt in c.most_common(20):
    print(f'  {word}: {cnt}')
