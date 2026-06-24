import { Box, Typography, Dialog, IconButton, Chip } from '@mui/material';
import { CompareArrows, Close } from '@mui/icons-material';

function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString();
}

function ShipCompareDialog({ compareMode, compareShips, open, onClose, onOpen, getZhName }) {
  return (
    <>
      {compareMode && compareShips.length >= 2 && (
        <Box sx={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <Chip
            icon={<CompareArrows sx={{ fontSize: 16 }} />}
            label={`对比 (${compareShips.length})`}
            onClick={onOpen}
            sx={{ pointerEvents: 'auto', fontWeight: 700, fontSize: '0.85rem', height: 36, background: 'linear-gradient(135deg, rgba(0,221,170,0.2), rgba(0,180,140,0.15))', border: '1px solid rgba(0,221,170,0.5)', color: '#00ddaa', boxShadow: '0 4px 20px rgba(0,221,170,0.3)', '&:hover': { background: 'linear-gradient(135deg, rgba(0,221,170,0.3), rgba(0,180,140,0.2))' }, '& .MuiChip-icon': { color: '#00ddaa' } }}
          />
        </Box>
      )}

      {compareShips.length >= 2 && (
        <Dialog
          open={open}
          onClose={onClose}
          maxWidth="lg" fullWidth
          PaperProps={{ sx: { background: 'linear-gradient(135deg, rgba(3,12,25,0.98) 0%, rgba(2,8,18,0.99) 100%)', border: '1px solid rgba(0,221,170,0.3)', borderRadius: '8px', maxHeight: '80vh' } }}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,221,170,0.15)' }}>
            <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '1rem', color: '#00ddaa' }}>
              舰船对比
            </Typography>
            <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
              <Close />
            </IconButton>
          </Box>
          <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
            <Box component="thead">
              <Box component="tr">
                <Box component="th" sx={{ textAlign: 'left', p: '10px 12px', borderBottom: '1px solid rgba(0,221,170,0.15)', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', fontWeight: 600, background: 'rgba(0,221,170,0.08)' }}>
                  属性
                </Box>
                {compareShips.map(s => (
                  <Box component="th" key={s.slug} sx={{ textAlign: 'center', p: '10px 12px', borderBottom: '1px solid rgba(0,221,170,0.15)', color: '#00ddaa', fontSize: '0.8rem', fontWeight: 700, background: 'rgba(0,221,170,0.08)' }}>
                    {getZhName(s) || s.name}
                  </Box>
                ))}
              </Box>
            </Box>
            <Box component="tbody">
              {[
                { label: 'SCU 货舱', getValue: s => (s.cargo_capacity || 0) > 0 ? `${s.cargo_capacity} SCU` : '—', getNum: s => s.cargo_capacity || 0, best: 'max' },
                { label: '船员', getValue: s => s.crew?.min && s.crew?.max ? (s.crew.min === s.crew.max ? `${s.crew.min}` : `${s.crew.min}-${s.crew.max}`) : '—' },
                { label: '尺寸等级', getValue: s => s.size_class ? `S${s.size_class}` : '—', getNum: s => s.size_class || 0, best: 'max' },
                { label: 'SCM 速度', getValue: s => s.speed?.scm ? `${s.speed.scm} m/s` : '—', getNum: s => s.speed?.scm || 0, best: 'max' },
                { label: '最高速度', getValue: s => s.speed?.max ? `${s.speed.max} m/s` : '—', getNum: s => s.speed?.max || 0, best: 'max' },
                { label: '护盾 HP', getValue: s => s.shield_hp ? formatNumber(s.shield_hp) : '—', getNum: s => s.shield_hp || 0, best: 'max' },
                { label: '船体 HP', getValue: s => s.health ? formatNumber(s.health) : '—', getNum: s => s.health || 0, best: 'max' },
                { label: '飞行员DPS', getValue: s => s.weaponry?.pilot_dps ? s.weaponry.pilot_dps.toFixed(0) : '—', getNum: s => s.weaponry?.pilot_dps || 0, best: 'max' },
                { label: 'aUEC 价格', getValue: s => s.auec_price ? `${formatNumber(s.auec_price)} aUEC` : '—', getNum: s => s.auec_price || 0, best: 'min' },
                { label: 'USD 价格', getValue: s => s.msrp ? `$${s.msrp}` : '—', getNum: s => s.msrp || 0, best: 'min' },
              ].map(row => {
                const values = compareShips.map(s => row.getNum ? row.getNum(s) : 0);
                const bestVal = row.best === 'max' ? Math.max(...values) : row.best === 'min' ? Math.min(...values.filter(v => v > 0)) : 0;
                return (
                  <Box component="tr" key={row.label} sx={{ '&:hover': { background: 'rgba(0,221,170,0.03)' } }}>
                    <Box component="td" sx={{ p: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontWeight: 600 }}>
                      {row.label}
                    </Box>
                    {compareShips.map((s, i) => {
                      const isBest = row.best && bestVal > 0 && values[i] === bestVal;
                      return (
                        <Box component="td" key={s.slug} sx={{ p: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', color: isBest ? '#00ddaa' : 'rgba(255,255,255,0.8)', fontSize: '0.8rem', textAlign: 'center', fontWeight: isBest ? 700 : 400 }}>
                          {row.getValue(s)}
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          </Box>
        </Dialog>
      )}
    </>
  );
}

export default ShipCompareDialog;
