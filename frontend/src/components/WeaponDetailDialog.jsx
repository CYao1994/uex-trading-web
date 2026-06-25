import { useMemo } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, IconButton, Chip, Divider } from '@mui/material';
import { Close, ShoppingCart, Speed, Straighten, FlashOn } from '@mui/icons-material';

const DMG_COLORS = { physical: '#ff6644', energy: '#44aaff', distortion: '#aa66ff', thermal: '#ff8844' };
const DMG_LABELS = { physical: '物理', energy: '能量', distortion: '扭曲', thermal: '热能' };

function findWikiWeapon(weapons, catalogItem) {
  if (!weapons || !catalogItem) return null;
  const slug = (catalogItem.slug || '').toLowerCase();
  const name = catalogItem.name;
  for (const w of weapons) {
    if (slug && w.slug && w.slug.toLowerCase() === slug) return w;
  }
  for (const w of weapons) {
    if (name && w.name === name) return w;
  }
  return null;
}

function WeaponDetailDialog({ open, onClose, catalogItem, wikiWeapons, wikiItems = {} }) {
  const wikiWeapon = useMemo(
    () => findWikiWeapon(wikiWeapons, catalogItem),
    [wikiWeapons, catalogItem]
  );

  const wikiItem = useMemo(() => {
    if (!catalogItem || !wikiItems) return null;
    const slug = (catalogItem.slug || '').toLowerCase();
    for (const [key, val] of Object.entries(wikiItems)) {
      if (key.toLowerCase() === slug) return val;
    }
    return null;
  }, [catalogItem, wikiItems]);

  if (!catalogItem) return null;

  const dps = wikiWeapon?.damage?.dps || {};

  const purchaseLocations = [];
  const uexPurchases = wikiItem?.uex_prices?.purchase || [];
  if (uexPurchases.length > 0) {
    for (const p of uexPurchases) {
      const sm = p.starmap_location || {};
      purchaseLocations.push({
        terminal: p.terminal_name || '',
        location: sm.name || '',
        planet: sm.parent_name || '',
        system: sm.star_system_name || '',
        price: p.price_buy || 0,
      });
    }
  } else if (catalogItem.buy_location_zh) {
    purchaseLocations.push({
      terminal: '',
      location: catalogItem.buy_location_zh,
      planet: '',
      system: '',
      price: catalogItem.best_price_buy,
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.97) 0%, rgba(2, 8, 18, 0.99) 100%)',
          border: '1px solid rgba(255, 102, 68, 0.2)',
          borderRadius: '8px',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        borderBottom: '1px solid rgba(255, 102, 68, 0.1)',
        pb: 1.5, gap: 2,
      }}>
        <Box sx={{ display: 'flex', gap: 1.5, flex: 1, minWidth: 0 }}>
          {wikiWeapon?.image_url && (
            <Box sx={{
              width: 80, height: 80, flexShrink: 0,
              borderRadius: '4px',
              overflow: 'hidden',
              border: '1px solid rgba(255,102,68,0.15)',
              background: 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Box
                component="img"
                src={wikiWeapon.image_url}
                alt={wikiWeapon.name}
                sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </Box>
          )}
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontFamily: '"Noto Sans SC","Orbitron",sans-serif', color: '#ff6644', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              {catalogItem.name_zh || catalogItem.name}
            </Typography>
            <Typography sx={{ fontFamily: '"Rajdhani",sans-serif', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', mt: 0.25 }}>
              {catalogItem.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
              {catalogItem.size && (
                <Chip label={`S${catalogItem.size}`} size="small" sx={{ fontFamily: '"Orbitron",sans-serif', fontSize: '0.6rem', height: 18, background: 'rgba(255,102,68,0.1)', border: '1px solid rgba(255,102,68,0.25)', color: '#ff6644' }} />
              )}
              {wikiWeapon?.grade && (
                <Chip label={`${wikiWeapon.grade}级`} size="small" sx={{ fontFamily: '"Orbitron",sans-serif', fontSize: '0.55rem', height: 18, background: `${wikiWeapon.grade === 'A' ? '#00ddaa' : wikiWeapon.grade === 'B' ? '#44aaff' : wikiWeapon.grade === 'C' ? '#ffaa00' : '#ff6644'}15`, border: `1px solid ${wikiWeapon.grade === 'A' ? '#00ddaa' : wikiWeapon.grade === 'B' ? '#44aaff' : wikiWeapon.grade === 'C' ? '#ffaa00' : '#ff6644'}33`, color: wikiWeapon.grade === 'A' ? '#00ddaa' : wikiWeapon.grade === 'B' ? '#44aaff' : wikiWeapon.grade === 'C' ? '#ffaa00' : '#ff6644' }} />
              )}
              {catalogItem.item_class_zh && (
                <Chip label={catalogItem.item_class_zh} size="small" sx={{ fontFamily: '"Noto Sans SC",sans-serif', fontSize: '0.6rem', height: 18, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.6)' }} />
              )}
            </Box>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* 武器规格 */}
        {wikiWeapon && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: '#ff6644', fontSize: '0.75rem', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', mb: 1, letterSpacing: '0.05em', fontWeight: 600 }}>
              武器数据
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {[
                { label: 'RPM', value: wikiWeapon.rpm, icon: <Speed sx={{ fontSize: 14 }} /> },
                { label: '弹速', value: wikiWeapon.speed ? `${wikiWeapon.speed} m/s` : '-', icon: <Speed sx={{ fontSize: 14 }} /> },
                { label: '射程', value: wikiWeapon.range ? `${wikiWeapon.range} m` : '-', icon: <Straighten sx={{ fontSize: 14 }} /> },
                { label: '单发伤害', value: wikiWeapon.damage?.alpha?.toLocaleString() || '-', icon: <FlashOn sx={{ fontSize: 14 }} /> },
              ].map((stat) => (
                <Box key={stat.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, py: 0.75, px: 1, background: 'rgba(0,10,20,0.4)', border: '1px solid rgba(255,102,68,0.08)', borderRadius: '3px' }}>
                  <Box sx={{ color: 'rgba(255,102,68,0.5)' }}>{stat.icon}</Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Rajdhani",sans-serif', textTransform: 'uppercase' }}>{stat.label}</Typography>
                    <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>{stat.value}</Typography>
                  </Box>
                </Box>
              ))}
            </Box>

            {/* DPS 分布 */}
            <Typography sx={{ color: 'rgba(255,102,68,0.6)', fontSize: '0.65rem', fontFamily: '"Rajdhani",sans-serif', mt: 1.5, mb: 0.75, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              DPS 分布
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {Object.entries(dps).filter(([, v]) => v > 0).map(([type, value]) => {
                const totalDps = Object.values(dps).reduce((a, b) => a + (b || 0), 0);
                const pct = totalDps > 0 ? (value / totalDps * 100) : 0;
                return (
                  <Box key={type} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography sx={{ fontSize: '0.7rem', color: DMG_COLORS[type] || '#888', fontFamily: '"Noto Sans SC",sans-serif', width: 36, flexShrink: 0 }}>
                      {DMG_LABELS[type] || type}
                    </Typography>
                    <Box sx={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <Box sx={{ width: `${pct}%`, height: '100%', background: DMG_COLORS[type] || '#888', borderRadius: 3 }} />
                    </Box>
                    <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', fontFamily: '"Orbitron",sans-serif', width: 60, textAlign: 'right' }}>
                      {value.toFixed(1)}
                    </Typography>
                  </Box>
                );
              })}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5, pt: 0.5, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Typography sx={{ fontSize: '0.7rem', color: '#c9a227', fontFamily: '"Noto Sans SC",sans-serif', width: 36, flexShrink: 0, fontWeight: 600 }}>
                  总计
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: '#c9a227', fontFamily: '"Orbitron",sans-serif', fontWeight: 700 }}>
                  {Object.values(dps).reduce((a, b) => a + (b || 0), 0).toFixed(1)}
                </Typography>
              </Box>
            </Box>

            {/* 制造商 */}
            {wikiWeapon.manufacturer?.name && (
              <Box sx={{ mt: 1.5 }}>
                <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontFamily: '"Rajdhani",sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  制造商
                </Typography>
                <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif', mt: 0.25 }}>
                  {catalogItem.company_name_zh || wikiWeapon.manufacturer.name}
                  {catalogItem.company_name_zh && catalogItem.company_name !== wikiWeapon.manufacturer.name && (
                    <Typography component="span" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.35)', ml: 0.5 }}>
                      ({wikiWeapon.manufacturer.name})
                    </Typography>
                  )}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {!wikiWeapon && (
          <Box sx={{ mb: 2, py: 2, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '4px' }}>
            <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Rajdhani","Noto Sans SC",sans-serif' }}>
              暂无 Wiki 详细数据
            </Typography>
          </Box>
        )}

        <Divider sx={{ borderColor: 'rgba(255,102,68,0.08)', mb: 1.5 }} />

        {/* 购买地点 */}
        <Typography sx={{ color: '#c9a227', fontSize: '0.75rem', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', mb: 1, letterSpacing: '0.05em', fontWeight: 600 }}>
          <ShoppingCart sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
          购买地点 {purchaseLocations.length > 0 && <span style={{ fontSize: '0.65rem', color: 'rgba(201,162,39,0.5)', fontFamily: '"Rajdhani",sans-serif', ml: 0.5 }}>({purchaseLocations.length}个站点)</span>}
        </Typography>
        {purchaseLocations.length > 0 ? (() => {
          const tree = {};
          for (const loc of purchaseLocations) {
            const sys = loc.system || '未知星系';
            const planet = loc.planet || '未知星球';
            if (!tree[sys]) tree[sys] = {};
            if (!tree[sys][planet]) tree[sys][planet] = [];
            tree[sys][planet].push(loc);
          }
          const sortedSystems = Object.keys(tree).sort();
          const systemColors = { Stanton: '#44aaff', Pyro: '#ff6644', Nyx: '#aa66ff' };
          return (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
              {sortedSystems.map(sys => (
                <Box key={sys} sx={{ borderLeft: `2px solid ${systemColors[sys] || 'rgba(255,255,255,0.15)'}`, pl: 1 }}>
                  <Typography sx={{ fontSize: '0.75rem', color: systemColors[sys] || 'rgba(255,255,255,0.7)', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontWeight: 600, mb: 0.25 }}>
                    {sys}
                  </Typography>
                  {Object.keys(tree[sys]).sort().map(planet => (
                    <Box key={planet} sx={{ ml: 1, mb: 0.25 }}>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Noto Sans SC",sans-serif', mb: 0.15 }}>
                        {planet}
                      </Typography>
                      {tree[sys][planet].map((loc, i) => (
                        <Box key={i} sx={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          py: 0.5, px: 0.75, ml: 0.5, background: 'rgba(0,10,20,0.3)',
                          border: '1px solid rgba(201,162,39,0.05)', borderRadius: '2px', mb: 0.25,
                        }}>
                          <Box>
                            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
                              {loc.location || '-'}
                            </Typography>
                            {loc.terminal && (
                              <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.35)', fontFamily: '"Rajdhani",sans-serif' }}>
                                {loc.terminal}
                              </Typography>
                            )}
                          </Box>
                          {loc.price > 0 && (
                            <Typography sx={{ fontSize: '0.75rem', color: '#c9a227', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                              {loc.price.toLocaleString()} <span style={{ fontSize: '0.5rem', opacity: 0.7 }}>aUEC</span>
                            </Typography>
                          )}
                        </Box>
                      ))}
                    </Box>
                  ))}
                </Box>
              ))}
            </Box>
          );
        })() : (
          <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }}>
            暂无购买地点数据
          </Typography>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default WeaponDetailDialog;
