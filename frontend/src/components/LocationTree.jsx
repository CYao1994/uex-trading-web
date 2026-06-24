import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { getPriceColor } from '../utils/format';

function buildLocationTree(prices) {
  const tree = {};

  for (const p of prices) {
    if (!p.price_buy) continue;

    const system = p.star_system_name_zh || p.star_system_name || '未知星系';
    const planet = p.planet_name_zh || p.planet_name || '';

    const locationName = p.space_station_name_zh
      || p.city_name_zh
      || p.outpost_name_zh
      || p.terminal_name_zh
      || p.space_station_name
      || p.city_name
      || p.outpost_name
      || p.terminal_name
      || '未知地点';

    if (!tree[system]) tree[system] = {};
    if (planet) {
      if (!tree[system][planet]) tree[system][planet] = [];
      tree[system][planet].push({ ...p, locationName });
    } else {
      if (!tree[system]['_direct']) tree[system]['_direct'] = [];
      tree[system]['_direct'].push({ ...p, locationName });
    }
  }

  return tree;
}

function LocationTree({ prices, accentColor: _accentColor, priceRange }) {
  const tree = useMemo(() => buildLocationTree(prices), [prices]);

  return (
    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
      {Object.entries(tree).map(([system, planets]) => (
        <Box key={system} sx={{ mb: 1.5 }}>
          <Typography sx={{
            color: '#c9a227',
            fontSize: '0.8rem',
            fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
            fontWeight: 600,
            mb: 0.5,
            pl: 1,
          }}>
            ▸ {system}
          </Typography>

          {Object.entries(planets).map(([planet, locations]) => (
            <Box key={planet} sx={{ ml: 2, mb: 0.5 }}>
              {planet !== '_direct' && (
                <Typography sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.75rem',
                  fontFamily: '"Noto Sans SC",sans-serif',
                  mb: 0.25,
                  pl: 1,
                }}>
                  ▸ {planet}
                </Typography>
              )}

              {locations.map((loc, i) => {
                const priceColor = getPriceColor(loc.price_buy, priceRange.min, priceRange.max);
                return (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.5,
                      px: 1,
                      ml: planet !== '_direct' ? 2 : 0,
                      background: 'rgba(0, 10, 20, 0.3)',
                      border: '1px solid rgba(201, 162, 39, 0.05)',
                      clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                      mb: 0.5,
                      '&:hover': { background: 'rgba(0, 10, 20, 0.5)', border: '1px solid rgba(201, 162, 39, 0.15)' },
                    }}
                  >
                    <Typography sx={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.75rem',
                      fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                    }}>
                      {loc.locationName}
                    </Typography>
                    <Typography sx={{
                      color: priceColor,
                      fontSize: '0.8rem',
                      fontFamily: '"Orbitron",sans-serif',
                      fontWeight: 500,
                    }}>
                      {loc.price_buy?.toLocaleString()} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>aUEC</span>
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

export default LocationTree;
