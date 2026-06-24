// ItemDetailDialog.jsx — 优化版物品详情弹窗
import { useMemo, useEffect } from 'react';
import { Box, Typography, Dialog, DialogContent, Chip } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';
import { useSfx } from '../hooks/useSfx';
import ItemDetailHeader from './ItemDetailHeader';
import WikiDataSection from './WikiDataSection';
import PriceDataSection from './PriceDataSection';
import ShopDataSection from './ShopDataSection';

function extractSizeFromAttrs(item, attrs) {
  if (item?.size) return item.size;
  if (!attrs) return null;
  for (const attr of attrs) {
    const name = (attr.attribute_name_zh || attr.attribute_name || '').toLowerCase();
    if (name === '尺寸' || name === 'size') {
      const val = String(attr.value || '').trim();
      if (val) return val;
    }
  }
  return null;
}

function ItemDetailDialog({ item, prices, pricesLoading, attrs, attributeDefs, shopData, open, onClose, accentColor, wikiItems = {}, wikiWeapons = [] }) {
  const sfx = useSfx();

  useEffect(() => {
    if (open) sfx('detail_open');
  }, [open, sfx]);

  const displaySize = extractSizeFromAttrs(item, attrs);

  const wikiItem = useMemo(() => {
    if (!item) return null;
    const slug = (item.slug || '').toLowerCase();
    const name = item.name;
    for (const [_key, wi] of Object.entries(wikiItems)) {
      if (slug && wi.slug && wi.slug.toLowerCase() === slug) return wi;
    }
    for (const [_key, wi] of Object.entries(wikiItems)) {
      if (name && wi.name === name) return wi;
    }
    return null;
  }, [item, wikiItems]);

  const wikiWeapon = useMemo(() => {
    if (!item || !wikiWeapons?.length) return null;
    const slug = (item.slug || '').toLowerCase();
    const name = item.name;
    for (const w of wikiWeapons) {
      if (slug && w.slug && w.slug.toLowerCase() === slug) return w;
    }
    for (const w of wikiWeapons) {
      if (name && w.name === name) return w;
    }
    return null;
  }, [item, wikiWeapons]);

  const defMap = useMemo(() => {
    const map = new Map();
    for (const def of (attributeDefs || [])) {
      map.set(def.name, def);
    }
    return map;
  }, [attributeDefs]);

  const sortedPrices = useMemo(() => {
    return [...(prices || [])].sort((a, b) => {
      const pa = a.price_buy ?? Infinity;
      const pb = b.price_buy ?? Infinity;
      return pa - pb;
    });
  }, [prices]);

  const priceRange = useMemo(() => {
    const priceValues = sortedPrices
      .filter(p => p.price_buy && p.price_buy > 0)
      .map(p => p.price_buy);
    if (priceValues.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...priceValues), max: Math.max(...priceValues) };
  }, [sortedPrices]);

  if (!item) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.95) 0%, rgba(2, 8, 18, 0.98) 100%)',
          border: '1px solid rgba(201, 162, 39, 0.15)',
          clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.4) 30%, rgba(201, 162, 39, 0.4) 70%, transparent 100%)',
          },
        },
      }}
    >
      <ItemDetailHeader item={item} displaySize={displaySize} onClose={onClose} sfx={sfx} />

      <DialogContent sx={{ pt: 2 }}>
        {(wikiItem?.image_url || wikiWeapon?.image_url) && (
          <Box sx={{
            width: '100%', maxHeight: 200, mb: 2,
            borderRadius: '4px', overflow: 'hidden',
            border: `1px solid ${accentColor}22`,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box
              component="img"
              src={wikiWeapon?.image_url || wikiItem?.image_url}
              alt={wikiWeapon?.name || wikiItem?.name}
              sx={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </Box>
        )}

        {wikiItem && (
          <WikiDataSection wikiItem={wikiItem} wikiWeapon={wikiWeapon} accentColor={accentColor} />
        )}

        {attrs.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ color: `${accentColor}b3`, fontSize: '0.8rem', fontFamily: '"Orbitron",sans-serif', mb: 1, letterSpacing: '0.05em' }}>
              属性
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {attrs.map((attr, i) => {
                const def = defMap.get(attr.attribute_name);
                const isLowerBetter = def?.is_lower_better ?? null;
                let icon = null;
                let iconColor = 'rgba(255,255,255,0.2)';
                if (isLowerBetter === true) {
                  icon = <TrendingDown sx={{ fontSize: 14 }} />;
                  iconColor = '#00ddaa';
                } else if (isLowerBetter === false) {
                  icon = <TrendingUp sx={{ fontSize: 14 }} />;
                  iconColor = '#00ddaa';
                }

                return (
                  <Chip
                    key={i}
                    icon={icon}
                    label={`${attr.attribute_name_zh || attr.attribute_name}: ${attr.value}${attr.unit ? ' ' + attr.unit : ''}`}
                    size="small"
                    sx={{
                      fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                      fontSize: '0.75rem',
                      background: 'rgba(0, 10, 20, 0.5)',
                      border: '1px solid rgba(201, 162, 39, 0.15)',
                      color: 'rgba(255,255,255,0.75)',
                      clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                      '& .MuiChip-icon': { color: iconColor },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        <PriceDataSection
          sortedPrices={sortedPrices}
          priceRange={priceRange}
          pricesLoading={pricesLoading}
          accentColor={accentColor}
        />

        {shopData && shopData.length > 0 && (
          <ShopDataSection shopData={shopData} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ItemDetailDialog;
