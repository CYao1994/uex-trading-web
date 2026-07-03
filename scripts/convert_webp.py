import os
from PIL import Image

ships_dir = 'C:/Users/GUNDA/uex-trading-web-main/frontend/public/ships'
webp_dir = 'C:/Users/GUNDA/uex-trading-web-main/frontend/public/ships-webp'

os.makedirs(webp_dir, exist_ok=True)

files = [f for f in os.listdir(ships_dir) if f.lower().endswith(('.jpg', '.png'))]
total_before = 0
total_after = 0
converted = 0

for fname in files:
    src = os.path.join(ships_dir, fname)
    dst_name = os.path.splitext(fname)[0] + '.webp'
    dst = os.path.join(webp_dir, dst_name)

    src_size = os.path.getsize(src)
    total_before += src_size

    try:
        img = Image.open(src)
        img.save(dst, 'WEBP', quality=80, method=6)
        dst_size = os.path.getsize(dst)
        total_after += dst_size
        converted += 1
    except Exception as e:
        print(f'  SKIP {fname}: {e}')
        total_after += src_size

print(f'Converted: {converted}/{len(files)}')
print(f'Before: {total_before / 1024 / 1024:.1f} MB')
print(f'After:  {total_after / 1024 / 1024:.1f} MB')
print(f'Saved:  {(total_before - total_after) / 1024 / 1024:.1f} MB ({(1 - total_after/total_before)*100:.0f}%)')
