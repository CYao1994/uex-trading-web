import { useState } from 'react';
import { Box, Typography, CircularProgress, Tabs, Tab } from '@mui/material';
import { AccountTree, List } from '@mui/icons-material';
import { getPriceColor } from '../utils/format';
import LocationTree from './LocationTree';

function PriceDataSection({ sortedPrices, priceRange, pricesLoading, accentColor }) {
  const [tabValue, setTabValue] = useState(0);

  if (pricesLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
        <CircularProgress size={18} sx={{ color: accentColor }} />
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontStyle: 'italic' }}>
          价格数据加载中...
        </Typography>
      </Box>
    );
  }

  if (sortedPrices.length === 0) {
    return (
      <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontStyle: 'italic' }}>
        暂无价格数据
      </Typography>
    );
  }

  return (
    <Box>
      <Tabs
        value={tabValue}
        onChange={(_, v) => setTabValue(v)}
        sx={{
          mb: 1.5,
          '& .MuiTab-root': {
            minHeight: 32,
            fontSize: '0.75rem',
            fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
            color: 'rgba(255,255,255,0.6)',
            '&.Mui-selected': { color: accentColor },
          },
          '& .MuiTabs-indicator': { background: accentColor },
        }}
      >
        <Tab icon={<AccountTree sx={{ fontSize: 16 }} />} iconPosition="start" label="位置视图" />
        <Tab icon={<List sx={{ fontSize: 16 }} />} iconPosition="start" label="列表视图" />
      </Tabs>

      <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontFamily: '"Rajdhani", sans-serif' }}>
          共 {sortedPrices.length} 个站点
        </Typography>
        {priceRange.min > 0 && (
          <Typography sx={{ color: '#44aaff', fontSize: '0.7rem', fontFamily: '"Orbitron", sans-serif' }}>
            最低: {priceRange.min.toLocaleString()} aUEC
          </Typography>
        )}
        {priceRange.max > 0 && priceRange.max !== priceRange.min && (
          <Typography sx={{ color: '#ff6644', fontSize: '0.7rem', fontFamily: '"Orbitron", sans-serif' }}>
            最高: {priceRange.max.toLocaleString()} aUEC
          </Typography>
        )}
      </Box>

      {tabValue === 0 ? (
        <LocationTree prices={sortedPrices} accentColor={accentColor} priceRange={priceRange} />
      ) : (
        <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
          {sortedPrices.map((p, i) => {
            const isBest = i === 0 && p.price_buy != null;
            const priceColor = getPriceColor(p.price_buy, priceRange.min, priceRange.max);
            const locationName = p.space_station_name_zh || p.space_station_name
              || p.city_name_zh || p.city_name
              || p.outpost_name_zh || p.outpost_name
              || '';
            const planetSystem = [
              p.planet_name_zh || p.planet_name,
              p.star_system_name_zh || p.star_system_name
            ].filter(Boolean).join(' · ');

            return (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  py: 1,
                  px: 1.5,
                  background: isBest ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.08), rgba(154, 122, 26, 0.05))' : 'rgba(0, 10, 20, 0.3)',
                  border: '1px solid rgba(201, 162, 39, 0.05)',
                  borderLeft: isBest ? '3px solid rgba(201, 162, 39, 0.6)' : '3px solid transparent',
                  clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                  mb: 0.5,
                  '&:hover': { background: 'rgba(0, 10, 20, 0.5)', border: '1px solid rgba(201, 162, 39, 0.15)' },
                }}
              >
                <Box>
                  <Typography sx={{
                    color: isBest ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                    fontSize: '0.8rem',
                    fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                    fontWeight: isBest ? 600 : 400,
                  }}>
                    {locationName || '-'}
                    {isBest && (
                      <Typography component="span" sx={{ color: `${accentColor}99`, fontSize: '0.65rem', ml: 1, fontFamily: '"Rajdhani",sans-serif' }}>
                        最低
                      </Typography>
                    )}
                  </Typography>
                  <Typography sx={{
                    color: 'rgba(255,255,255,0.35)',
                    fontSize: '0.65rem',
                    fontFamily: '"Noto Sans SC",sans-serif',
                  }}>
                    {planetSystem || '-'}
                  </Typography>
                </Box>
                <Typography sx={{
                  color: priceColor,
                  fontSize: '0.85rem',
                  fontFamily: '"Orbitron",sans-serif',
                  fontWeight: isBest ? 700 : 400,
                }}>
                  {p.price_buy ? `${p.price_buy.toLocaleString()} aUEC` : '-'}
                </Typography>
              </Box>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export default PriceDataSection;
