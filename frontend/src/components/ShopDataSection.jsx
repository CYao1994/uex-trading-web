import { Box, Typography } from '@mui/material';

function ShopDataSection({ shopData }) {
  return (
    <Box sx={{ mt: 2, borderTop: '1px solid rgba(201,162,39,0.08)', pt: 2 }}>
      <Typography sx={{
        fontSize: '0.75rem', fontWeight: 600, color: '#00ddaa',
        fontFamily: '"Orbitron",sans-serif', mb: 1, letterSpacing: '0.05em',
      }}>
        游戏商店数据
        <Typography component="span" sx={{ fontSize: '0.55rem', color: 'rgba(0,221,170,0.4)', ml: 1, fontFamily: '"Rajdhani",sans-serif' }}>
          来源: 解包文件
        </Typography>
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {[...new Set(shopData.map(s => s.location))].map(location => {
          const items = shopData.filter(s => s.location === location);
          const bestBuy = Math.min(...items.map(i => i.buy_price).filter(p => p > 0));
          return (
            <Box key={location} sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              py: 0.5, px: 1, background: 'rgba(0,221,170,0.04)', borderRadius: '2px',
            }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontFamily: '"Noto Sans SC",sans-serif' }}>
                {location}
              </Typography>
              <Typography sx={{ fontSize: '0.75rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                {bestBuy > 0 ? `${bestBuy.toLocaleString()} aUEC` : '-'}
              </Typography>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

export default ShopDataSection;
