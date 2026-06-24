import { Box, Typography, Dialog, IconButton, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { Close } from '@mui/icons-material';
import { getPriceColor } from '../utils/format';

function CompareDialog({ open, onClose, compareItems, getWeaponStats, priceRange }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.98) 0%, rgba(2, 8, 18, 0.99) 100%)',
          border: '1px solid rgba(0, 221, 170, 0.3)',
          borderRadius: '8px',
          maxHeight: '80vh',
        }
      }}
    >
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0, 221, 170, 0.15)' }}>
        <Typography sx={{ fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontWeight: 700, fontSize: '1rem', color: '#00ddaa' }}>
          物品对比
        </Typography>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <Close />
        </IconButton>
      </Box>
      <TableContainer sx={{ maxHeight: 'calc(80vh - 64px)' }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell sx={{
                background: 'rgba(0, 221, 170, 0.08)',
                color: 'rgba(255,255,255,0.5)',
                fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                fontSize: '0.75rem',
                borderBottom: '1px solid rgba(0, 221, 170, 0.2)',
                minWidth: 100,
              }}>
                属性
              </TableCell>
              {compareItems.map(item => (
                <TableCell key={item.id} sx={{
                  background: 'rgba(0, 221, 170, 0.08)',
                  color: '#00ddaa',
                  fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  borderBottom: '1px solid rgba(0, 221, 170, 0.2)',
                  textAlign: 'center',
                  minWidth: 150,
                }}>
                  {item.name_zh || item.name}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {[
              { label: '尺寸', key: 'size', format: v => v ? `S${v}` : '-' },
              { label: '分类', key: 'item_class_zh', format: v => v || '-' },
              { label: '品级', key: 'grade', format: v => v ? `${v}级` : '-' },
              { label: '物品类型', key: 'item_type', format: v => v || '-' },
              { label: '质量', key: 'mass', format: v => v ? `${v} kg` : '-' },
              { label: '体积', key: 'volume', format: v => v ? `${v} m³` : '-' },
              { label: '厂商', key: 'company_name_zh', fallback: 'company_name', format: v => v || '-' },
            ].map(row => {
              const values = compareItems.map(item => {
                const val = item[row.key] ?? item[row.fallback];
                return row.format(val);
              });
              const numericValues = compareItems.map(item => {
                const val = item[row.key] ?? item[row.fallback];
                return parseFloat(val) || 0;
              });
              const maxVal = Math.max(...numericValues);
              return (
                <TableRow key={row.key}>
                  <TableCell sx={{
                    color: 'rgba(255,255,255,0.6)',
                    fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                    fontSize: '0.75rem',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {row.label}
                  </TableCell>
                  {compareItems.map((item, i) => (
                    <TableCell key={item.id} sx={{
                      color: maxVal > 0 && numericValues[i] === maxVal && numericValues.filter(v => v === maxVal).length === 1
                        ? '#00ddaa'
                        : 'rgba(255,255,255,0.8)',
                      fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                      fontSize: '0.8rem',
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      fontWeight: maxVal > 0 && numericValues[i] === maxVal && numericValues.filter(v => v === maxVal).length === 1 ? 700 : 400,
                    }}>
                      {values[i]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
            {compareItems.some(item => {
              const ws = getWeaponStats(item.item_type, item.size);
              return ws && ws.dps_max > 0;
            }) && (
              <>
                <TableRow>
                  <TableCell colSpan={compareItems.length + 1} sx={{
                    color: '#ff6644',
                    fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    background: 'rgba(255, 102, 68, 0.08)',
                    borderBottom: '1px solid rgba(255, 102, 68, 0.15)',
                    letterSpacing: '0.1em',
                  }}>
                    武器数据
                  </TableCell>
                </TableRow>
                {[
                  {
                    label: 'DPS',
                    getValue: (item) => {
                      const ws = getWeaponStats(item.item_type, item.size);
                      return ws?.dps_max || 0;
                    },
                    format: (item) => {
                      const ws = getWeaponStats(item.item_type, item.size);
                      if (!ws || ws.dps_max === 0) return '-';
                      return ws.dps_min === ws.dps_max
                        ? ws.dps_max.toLocaleString()
                        : `${ws.dps_min.toLocaleString()}~${ws.dps_max.toLocaleString()}`;
                    },
                  },
                  {
                    label: '伤害',
                    getValue: (item) => {
                      const ws = getWeaponStats(item.item_type, item.size);
                      return ws?.damage_max || 0;
                    },
                    format: (item) => {
                      const ws = getWeaponStats(item.item_type, item.size);
                      if (!ws || ws.damage_max === 0) return '-';
                      return ws.damage_min === ws.damage_max
                        ? ws.damage_max.toLocaleString()
                        : `${ws.damage_min.toLocaleString()}~${ws.damage_max.toLocaleString()}`;
                    },
                  },
                  {
                    label: '射速 (RPM)',
                    getValue: (item) => {
                      const ws = getWeaponStats(item.item_type, item.size);
                      return ws?.rpm || 0;
                    },
                    format: (item) => {
                      const ws = getWeaponStats(item.item_type, item.size);
                      return ws?.rpm ? ws.rpm.toLocaleString() : '-';
                    },
                  },
                  {
                    label: '弹速',
                    getValue: (item) => {
                      const ws = getWeaponStats(item.item_type, item.size);
                      return ws?.speed || 0;
                    },
                    format: (item) => {
                      const ws = getWeaponStats(item.item_type, item.size);
                      return ws?.speed ? `${ws.speed.toLocaleString()} m/s` : '-';
                    },
                  },
                ].map(row => {
                  const values = compareItems.map(item => row.getValue(item));
                  const formatted = compareItems.map(item => row.format(item));
                  const maxVal = Math.max(...values);
                  return (
                    <TableRow key={row.label}>
                      <TableCell sx={{
                        color: 'rgba(255,255,255,0.6)',
                        fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                        fontSize: '0.75rem',
                        borderBottom: '1px solid rgba(255,255,255,0.06)',
                      }}>
                        {row.label}
                      </TableCell>
                      {compareItems.map((item, i) => (
                        <TableCell key={item.id} sx={{
                          color: maxVal > 0 && values[i] === maxVal && values.filter(v => v === maxVal).length === 1
                            ? '#00ddaa'
                            : 'rgba(255,255,255,0.8)',
                          fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                          fontSize: '0.8rem',
                          textAlign: 'center',
                          borderBottom: '1px solid rgba(255,255,255,0.06)',
                          fontWeight: maxVal > 0 && values[i] === maxVal && values.filter(v => v === maxVal).length === 1 ? 700 : 400,
                        }}>
                          {formatted[i]}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </>
            )}
            {compareItems.some(item => item.can_buy && item.best_price_buy > 0) && (
              <TableRow>
                <TableCell sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                  fontSize: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  价格
                </TableCell>
                {compareItems.map(item => {
                  const price = item.can_buy ? item.best_price_buy : 0;
                  return (
                    <TableCell key={item.id} sx={{
                      color: price > 0 ? getPriceColor(price, priceRange.min, priceRange.max) : 'rgba(255,255,255,0.3)',
                      fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      textAlign: 'center',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {price > 0 ? `${price.toLocaleString()} aUEC` : '-'}
                    </TableCell>
                  );
                })}
              </TableRow>
            )}
            {compareItems.some(item => item.buy_location_zh || item.buy_location) && (
              <TableRow>
                <TableCell sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                  fontSize: '0.75rem',
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  购买地点
                </TableCell>
                {compareItems.map(item => (
                  <TableCell key={item.id} sx={{
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: '"Noto Sans SC",sans-serif',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    {item.buy_location_zh || item.buy_location || '-'}
                  </TableCell>
                ))}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Dialog>
  );
}

export default CompareDialog;
