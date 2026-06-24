// shipImageUtils.js - Multi-source ship image fallback
// Sources: UEX API url_photo → Wiki image_url → RSI media CDN → SVG placeholder

let _wikiData = null;
let _wikiPromise = null;

function loadWikiData() {
  if (_wikiData) return Promise.resolve(_wikiData);
  if (_wikiPromise) return _wikiPromise;
  _wikiPromise = (async () => {
    const all = {};
    for (let i = 1; i <= 4; i++) {
      try {
        const chunk = await fetch(`/data/wiki-vehicles-${i}.json`).then(r => r.ok ? r.json() : null);
        if (chunk?.vehicles) Object.assign(all, chunk.vehicles);
      } catch { /* skip */ }
    }
    _wikiData = all;
    return _wikiData;
  })();
  return _wikiPromise;
}

function getWikiImageUrl(slug) {
  if (!slug || !_wikiData) return null;
  const v = _wikiData[slug];
  return v?.image_url || null;
}

function getWikiShipData(slug) {
  if (!slug || !_wikiData) return null;
  return _wikiData[slug] || null;
}

// Generate RSI media URL from ship slug
function getRsiImageUrl(slug) {
  if (!slug) return null;
  return `https://media.robertsspaceindustries.com/${slug}/store_page_large.jpg`;
}

// Generate a placeholder SVG with ship name
function getPlaceholderSvg(name, company) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const color = '#c9a227';
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
    <rect width="200" height="120" fill="#0a1520"/>
    <text x="100" y="50" text-anchor="middle" fill="${color}" font-size="28" font-family="sans-serif" opacity="0.6">${initials}</text>
    <text x="100" y="75" text-anchor="middle" fill="rgba(255,255,255,0.3)" font-size="11" font-family="sans-serif">${(name || '').slice(0, 20)}</text>
    <text x="100" y="95" text-anchor="middle" fill="rgba(255,255,255,0.15)" font-size="9" font-family="sans-serif">${(company || '').slice(0, 20)}</text>
  </svg>`)}`;
}

export { loadWikiData, getWikiImageUrl, getWikiShipData, getRsiImageUrl, getPlaceholderSvg };
