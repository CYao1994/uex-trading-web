import os, re

base = r'C:\Users\GUNDA\uex-trading-web-main\frontend\src\components'
count = 0

for fname in os.listdir(base):
    if not fname.endswith('.jsx'):
        continue
    fpath = os.path.join(base, fname)
    with open(fpath, encoding='utf-8') as f:
        content = f.read()
    original = content
    
    # Remove "import React from 'react'" (React 19 auto-import)
    content = re.sub(r"import React from 'react';\n", "", content)
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        count += 1
        print(f"  Fixed: {fname}")

print(f"\nRemoved unused React imports from {count} files")
