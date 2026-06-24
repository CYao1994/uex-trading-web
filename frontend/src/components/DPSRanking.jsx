import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress } from '@mui/material';
import { Search, TrendingUp } from '@mui/icons-material';
import WeaponDetailDialog from './WeaponDetailDialog';

const DMG_TYPE_ZH = { physical: '物理', energy: '能量', distortion: '扭曲', thermal: '热能' };
const DMG_TYPE_COLORS = { physical: '#ff6644', energy: '#44aaff', distortion: '#aa66ff', thermal: '#ff8844' };

function DPSRanking({ wikiWeapons = [] }) {
  const [ammoData, setAmmoData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [dmgTypeFilter, setDmgTypeFilter] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailItem, setDetailItem] = useState(null);

  useEffect(() => {
    fetch('/data/ammo-params.json')
      .then(r => r.json())
      .then(data => {
        const active = (data.ammo || []).filter(a => a.status === 'active');
        active.sort((a, b) => b.total_damage - a.total_damage);
        setAmmoData(active);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const top50 = useMemo(() => {
    let result = ammoData.slice(0, 50);
    if (search) {
      const q = search.toLowerCase();
      result = ammoData.filter(a => a.weapon_name.toLowerCase().includes(q));
    }
    if (sizeFilter) {
      result = result.filter(a => String(a.size) === sizeFilter);
    }
    if (dmgTypeFilter) {
      result = result.filter(a => {
        const d = a.damage || {};
        if (dmgTypeFilter === 'physical') return d.physical > 0;
        if (dmgTypeFilter === 'energy') return d.energy > 0;
        if (dmgTypeFilter === 'distortion') return d.distortion > 0;
        return true;
      });
    }
    return result.slice(0, 50);
  }, [ammoData, search, sizeFilter, dmgTypeFilter]);

  const sizes = useMemo(() => [...new Set(ammoData.map(a => String(a.size)).filter(Boolean))].sort(), [ammoData]);

  const getDmgType = (d) => {
    if (d.physical > 0) return 'physical';
    if (d.energy > 0) return 'energy';
    if (d.distortion > 0) return 'distortion';
    return 'unknown';
  };

  if (loading) return <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress sx={{ color: '#c9a227' }} /></Box>;

  return (
    <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TrendingUp sx={{ color: '#c9a227', fontSize: 22 }} />
        <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontSize: '0.9rem', color: '#c9a227', fontWeight: 700 }}>
          DPS 排行
        </Typography>
        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201,162,39,0.4)' }}>
          Top {top50.length} / {ammoData.length}
        </Typography>
      </Box>

      {/* Filters */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <TextField size="small" placeholder="搜索武器..." value={search} onChange={e => setSearch(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(201,162,39,0.4)', fontSize: 16 }} /></InputAdornment> }}
          sx={{ flex: 1, maxWidth: 200, '& .MuiOutlinedInput-root': { color: 'rgba(255,255,255,0.8)', fontSize: '0.8rem', height: 32 } }} />
        <Chip label="全部尺寸" size="small" onClick={() => setSizeFilter('')}
          sx={{ background: !sizeFilter ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,162,39,0.2)', color: !sizeFilter ? '#c9a227' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }} />
        {sizes.map(s => (
          <Chip key={s} label={'S' + s} size="small" onClick={() => setSizeFilter(sizeFilter === s ? '' : s)}
            sx={{ background: sizeFilter === s ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${sizeFilter === s ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`, color: sizeFilter === s ? '#c9a227' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }} />
        ))}
        <Chip label="全部类型" size="small" onClick={() => setDmgTypeFilter('')}
          sx={{ background: !dmgTypeFilter ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,162,39,0.2)', color: !dmgTypeFilter ? '#c9a227' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }} />
        {['physical', 'energy', 'distortion'].map(t => (
          <Chip key={t} label={DMG_TYPE_ZH[t]} size="small" onClick={() => setDmgTypeFilter(dmgTypeFilter === t ? '' : t)}
            sx={{ background: dmgTypeFilter === t ? `${DMG_TYPE_COLORS[t]}20` : 'rgba(255,255,255,0.05)', border: `1px solid ${dmgTypeFilter === t ? DMG_TYPE_COLORS[t] : 'rgba(255,255,255,0.08)'}`, color: dmgTypeFilter === t ? DMG_TYPE_COLORS[t] : 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }} />
        ))}
      </Box>

      {/* Table */}
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'collapse' }}>
          <Box component="thead">
            <Box component="tr">
              {['排名', '武器名称', 'Size', '伤害类型', '单发伤害', '弹速', '每秒伤害(DPS)'].map(h => (
                <Box key={h} component="th" sx={{ textAlign: 'left', p: '8px 12px', borderBottom: '2px solid rgba(201,162,39,0.2)', color: '#c9a227', fontSize: '0.7rem', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {h}
                </Box>
              ))}
            </Box>
          </Box>
          <Box component="tbody">
            {top50.map((a, i) => {
              const dt = getDmgType(a.damage);
              const dtColor = DMG_TYPE_COLORS[dt] || '#888';
              return (
                <Box key={a.weapon_name} component="tr" onClick={() => {
                  setDetailItem({
                    name: a.weapon_name,
                    name_zh: a.weapon_name,
                    size: String(a.size || ''),
                    slug: (a.weapon_name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
                    best_price_buy: 0,
                    buy_location_zh: '',
                    item_class_zh: '',
                  });
                  setDetailOpen(true);
                }}
                  sx={{
                  cursor: 'pointer',
                  '&:hover': { background: 'rgba(201,162,39,0.06)' },
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  transition: 'background 0.15s',
                }}>
                  <Box component="td" sx={{ p: '8px 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>{i + 1}</Box>
                  <Box component="td" sx={{ p: '8px 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.85)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>{a.weapon_name}</Box>
                  <Box component="td" sx={{ p: '8px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Orbitron",sans-serif' }}>S{a.size}</Box>
                  <Box component="td" sx={{ p: '8px 12px', fontSize: '0.75rem', color: dtColor, fontFamily: '"Noto Sans SC",sans-serif', fontWeight: 500 }}>{DMG_TYPE_ZH[dt] || dt}</Box>
                  <Box component="td" sx={{ p: '8px 12px', fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontFamily: '"Orbitron",sans-serif' }}>{a.total_damage.toLocaleString()}</Box>
                  <Box component="td" sx={{ p: '8px 12px', fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Orbitron",sans-serif' }}>{a.speed}</Box>
                  <Box component="td" sx={{ p: '8px 12px', fontSize: '0.8rem', color: i < 3 ? '#c9a227' : 'rgba(255,255,255,0.7)', fontFamily: '"Orbitron",sans-serif', fontWeight: i < 3 ? 700 : 400 }}>{(a.lifetime > 0 ? Math.round(a.total_damage / (a.lifetime / 1000)) : a.total_damage).toLocaleString()}</Box>
                </Box>
              );
            })}
          </Box>
        </Box>
      </Box>
      {/* 武器详情弹窗 */}
      <WeaponDetailDialog
        open={detailOpen}
        onClose={() => { setDetailOpen(false); setDetailItem(null); }}
        catalogItem={detailItem}
        wikiWeapons={wikiWeapons}
      />
    </Box>
  );
}

export default DPSRanking;
