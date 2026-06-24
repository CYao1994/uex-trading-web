import os, re, sys
sys.stdout.reconfigure(encoding='utf-8')

base = r'C:\Users\GUNDA\uex-trading-web-main\frontend\src\components'
count = 0

for fname in os.listdir(base):
    if not fname.endswith('.jsx'):
        continue
    fpath = os.path.join(base, fname)
    with open(fpath, encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Only replace in 'color:' context, not in border/background
    # Pattern: color: 'rgba(255,255,255,0.3)' -> 'rgba(255,255,255,0.5)'
    # Pattern: color: 'rgba(255,255,255,0.4)' -> 'rgba(255,255,255,0.6)'
    content = re.sub(r"color:\s*'rgba\(255,255,255,0\.3\)'", "color: 'rgba(255,255,255,0.5)'", content)
    content = re.sub(r"color:\s*'rgba\(255,255,255,0\.4\)'", "color: 'rgba(255,255,255,0.6)'", content)
    # SVG fill attribute
    content = re.sub(r"fill=\"rgba\(255,255,255,0\.3\)\"", 'fill="rgba(255,255,255,0.5)"', content)
    
    if content != original:
        with open(fpath, 'w', encoding='utf-8') as f:
            f.write(content)
        changes = content.count("rgba(255,255,255,0.5)") - original.count("rgba(255,255,255,0.5)")
        count += 1
        print(f"  {fname}: {changes} color fixes")

print(f"\nTotal: {count} files modified")
