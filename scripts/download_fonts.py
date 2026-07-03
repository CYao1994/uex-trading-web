import os, urllib.request

fonts_dir = 'C:/Users/GUNDA/uex-trading-web-main/frontend/public/fonts'
os.makedirs(fonts_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Referer': 'https://fonts.loli.net/',
}

fonts = {
    'Orbitron-latin.woff2': 'https://gstatic.loli.net/s/orbitron/v35/yMJRMIlzdpvBhQQL_Qq7dy0.woff2',
    'Rajdhani-400-latin.woff2': 'https://gstatic.loli.net/s/rajdhani/v17/LDIxapCSOBg7S-QT7p4HM-Y.woff2',
    'Rajdhani-500-latin.woff2': 'https://gstatic.loli.net/s/rajdhani/v17/LDI2apCSOBg7S-QT7pb0EPOreec.woff2',
    'Rajdhani-600-latin.woff2': 'https://gstatic.loli.net/s/rajdhani/v17/LDI2apCSOBg7S-QT7pbYF_Oreec.woff2',
    'Rajdhani-700-latin.woff2': 'https://gstatic.loli.net/s/rajdhani/v17/LDI2apCSOBg7S-QT7pa8FvOreec.woff2',
}

for name, url in fonts.items():
    dst = os.path.join(fonts_dir, name)
    try:
        req = urllib.request.Request(url, headers=headers)
        resp = urllib.request.urlopen(req, timeout=15)
        data = resp.read()
        with open(dst, 'wb') as f:
            f.write(data)
        print(f'{name}: {len(data)} bytes')
    except Exception as e:
        print(f'Failed {name}: {e}')
