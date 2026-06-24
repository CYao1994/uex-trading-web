import { Box, Typography, Button } from '@mui/material';
import { OpenInNew } from '@mui/icons-material';

function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString();
}

function ShipDetailPricing({ ship, purchaseData, rentalData }) {
  return (
    <>
      {(ship.msrp > 0 || ship.auec_price > 0) && (
        <Box sx={{ background: 'rgba(0,20,10,0.3)', border: '1px solid rgba(0,221,170,0.15)', borderRadius: '4px', p: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#c9a227', fontFamily: '"Orbitron",sans-serif', fontWeight: 700, mb: 1 }}>
            价格
          </Typography>
          {ship.msrp > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>官方现金价格</Typography>
              <Typography sx={{ fontSize: '1rem', color: '#c9a227', fontFamily: '"Orbitron",sans-serif', fontWeight: 700 }}>
                ${ship.msrp} USD
              </Typography>
              {ship.pledge_url && (
                <Button size="small" href={ship.pledge_url} target="_blank" rel="noopener" startIcon={<OpenInNew sx={{ fontSize: 12 }} />}
                  sx={{ color: '#c9a227', fontSize: '0.65rem', mt: 0.3, textTransform: 'none' }}>
                  前往 RSI 认购商店
                </Button>
              )}
            </Box>
          )}
          {ship.auec_price > 0 && (
            <Box sx={{ mb: 1 }}>
              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>游戏内购买价格</Typography>
              <Typography sx={{ fontSize: '1rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 700 }}>
                {formatNumber(ship.auec_price)} <span style={{ fontSize: '0.7rem', opacity: 0.6 }}>aUEC</span>
              </Typography>
              {ship.purchase_locations && ship.purchase_locations.length > 0 && (
                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', mt: 0.3 }}>
                  购买地点: {ship.purchase_locations.join(' / ')}
                </Typography>
              )}
            </Box>
          )}
          {ship.has_rental && ship.rental_locations && ship.rental_locations.length > 0 && (
            <Box>
              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)' }}>游戏内租赁</Typography>
              <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,200,0,0.7)', fontFamily: '"Orbitron",sans-serif', fontWeight: 600, mt: 0.3 }}>
                可租赁
              </Typography>
              <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', mt: 0.3 }}>
                租赁地点: {ship.rental_locations.join(' / ')}
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {purchaseData.length > 0 && (
        <Box sx={{ background: 'rgba(10,20,30,0.4)', border: '1px solid rgba(0,180,255,0.15)', borderRadius: '4px', p: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#44bbff', fontFamily: '"Orbitron",sans-serif', fontWeight: 700, mb: 1 }}>
            UEX 购买终端
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {purchaseData.map((p, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', px: 1, py: 0.5, borderRadius: '2px' }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                  {p.terminal_name || p.terminal_code}
                  {p.location && <span style={{ color: 'rgba(255,255,255,0.35)' }}> ({p.location})</span>}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                  {p.price_buy ? `${formatNumber(p.price_buy)} aUEC` : '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {rentalData.length > 0 && (
        <Box sx={{ background: 'rgba(20,15,5,0.4)', border: '1px solid rgba(255,200,0,0.15)', borderRadius: '4px', p: 1.5, mb: 2 }}>
          <Typography sx={{ fontSize: '0.65rem', color: '#ffaa00', fontFamily: '"Orbitron",sans-serif', fontWeight: 700, mb: 1 }}>
            UEX 租赁终端
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {rentalData.map((r, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', px: 1, py: 0.5, borderRadius: '2px' }}>
                <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)' }}>
                  {r.terminal_name || r.terminal_code}
                  {r.location && <span style={{ color: 'rgba(255,255,255,0.35)' }}> ({r.location})</span>}
                </Typography>
                <Typography sx={{ fontSize: '0.7rem', color: '#ffaa00', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                  {r.price_rent ? `${formatNumber(r.price_rent)} aUEC/天` : '—'}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}
    </>
  );
}

export default ShipDetailPricing;
