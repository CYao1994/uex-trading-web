// MiningGuidePanel.jsx - 采矿矿物数据库面板
import { useState, useEffect, useMemo, useRef } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress } from '@mui/material';
import { Search, Science, ArrowUpward, ArrowDownward, AttachMoney, Place, Warning, History as HistoryIcon } from '@mui/icons-material';
import { useDataFreshness } from '../hooks/useDataFreshness';
import { useSearchHistory } from '../hooks/useSearchHistory';
import MineralDetailDialog from './MineralDetailDialog';
import { rawNameToLocationKey } from '../utils/mineralKeys';

const FIELD_LABELS = {
  elementInstability: '不稳定性',
  elementResistance: '阻力',
  elementOptimalWindowMidpoint: '最佳窗口中点',
  elementOptimalWindowThinness: '最佳窗口厚度',
  elementExplosionMultiplier: '爆炸倍率',
  elementClusterFactor: '聚簇系数',
};

const SORT_OPTIONS = [
  { key: 'name', label: '名称' },
  { key: 'price', label: '价格' },
  { key: 'elementInstability', label: '不稳定性' },
  { key: 'elementResistance', label: '阻力' },
  { key: 'elementOptimalWindowMidpoint', label: '最佳窗口中点' },
  { key: 'elementExplosionMultiplier', label: '爆炸倍率' },
  { key: 'elementClusterFactor', label: '聚簇系数' },
];

const STANTON_MINING_BASES = [
  'Mining Base #001', 'Mining Base #002', 'Mining Base #003', 'Mining Base #004',
  'Mining Base #005', 'Mining Base #006', 'Mining Base #007', 'Mining Base #008',
  'Mining Base #009', 'Mining Base #010', 'Mining Base #011', 'Mining Base #012',
];

const MINERAL_SYSTEM_MAP = {
  // Ship minerals
  'Ore_Agricium': [' Stanton ', ' Pyro '],
  'Ore_Aluminum': [' Stanton ', ' Pyro ', ' Nyx '],
  'Ore_Borase': [' Stanton ', ' Pyro ', ' Nyx '],
  'Ore_Copper': [' Stanton ', ' Pyro '],
  'Ore_Gold': [' Stanton ', ' Pyro ', ' Nyx '],
  'Ore_Iron': [' Stanton ', ' Pyro ', ' Nyx '],
  'Ore_Lindinium': [' Pyro ', ' Nyx '],
  'Ore_Riccite': [' Pyro '],
  'Ore_Savrilium': [' Pyro ', ' Nyx '],
  'Ore_Stileron': [' Pyro '],
  'Ore_Tin': [' Stanton ', ' Pyro '],
  'Ore_Titanium': [' Stanton ', ' Pyro '],
  'Ore_Torite': [' Pyro ', ' Nyx '],
  'Ore_Tungsten': [' Stanton ', ' Pyro ', ' Nyx '],
  'Raw_Aslarite': [' Stanton ', ' Pyro '],
  'Raw_Beryl': [' Stanton '],
  'Raw_Bexalite': [' Stanton ', ' Pyro ', ' Nyx '],
  'Raw_Corundum': [' Stanton ', ' Pyro ', ' Nyx '],
  'Raw_Hephaestanite': [' Stanton ', ' Pyro '],
  'Raw_Ice': [' Stanton ', ' Pyro ', ' Nyx '],
  'Raw_Laranite': [' Stanton ', ' Pyro '],
  'Raw_Quantainium': [' Stanton '],
  'Raw_Quartz': [' Stanton ', ' Pyro '],
  'Raw_Taranite': [' Stanton ', ' Pyro '],
  'RawOuratite': [' Stanton '],
  'RawSilicon': [' Stanton ', ' Pyro '],
  // FPS minerals
  'Aphorite': [' Stanton '],
  'Dolivine': [' Stanton '],
  'Hadanite': [' Stanton '],
  'Janalite': [' Stanton '],
  // Ground vehicle minerals
  'Beradom': [' Pyro '],
  'Feynmaline': [' Pyro '],
  'Glacosite': [' Pyro '],
};

function getDifficulty(instability, resistance) {
  const score = (instability / 700) * 0.6 + Math.max(0, resistance) * 0.4;
  if (score < 0.3) return { label: '简单', color: '#00ddaa' };
  if (score < 0.6) return { label: '中等', color: '#c9a227' };
  return { label: '困难', color: '#ff6644' };
}

function getInstabilityBar(value) {
  const pct = Math.min(100, (value / 700) * 100);
  let color = '#00ddaa';
  if (pct > 60) color = '#c9a227';
  if (pct > 80) color = '#ff6644';
  return { pct, color };
}

function getExplosionBar(value) {
  const pct = Math.min(100, (value / 10) * 100);
  let color = '#00ddaa';
  if (pct > 50) color = '#c9a227';
  if (pct > 70) color = '#ff6644';
  return { pct, color };
}

function getMineralSystems(mineralName) {
  if (MINERAL_SYSTEM_MAP[mineralName]) return MINERAL_SYSTEM_MAP[mineralName];
  return [' Stanton '];
}

function MiningGuidePanel() {
  const [minerals, setMinerals] = useState([]);
  const [mineralPrices, setMineralPrices] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [systemFilter, setSystemFilter] = useState('');
  const [selectedMineral, setSelectedMineral] = useState(null);
  const [miningLocationPrices, setMiningLocationPrices] = useState({});
  const { date: miningDate, isStale: miningStale } = useDataFreshness('/data/mining-data.json');
  const { history: searchHistory, addToHistory } = useSearchHistory('mining-search-history');
  const [historyOpen, setHistoryOpen] = useState(false);
  const searchBoxRef = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/data/mining-data.json').then(r => r.ok ? r.json() : null),
      fetch('/data/shop-inventory-summary.json').then(r => r.ok ? r.json() : null),
      fetch('/data/mining-locations.json').then(r => r.ok ? r.json() : null),
    ]).then(([miningData, shopData, locationData]) => {
      if (miningData?.minerals) setMinerals(miningData.minerals);
      if (shopData?.profiles) {
        const priceMap = {};
        shopData.profiles.filter(p => p.category === 'mining').forEach(profile => {
          const avg = (profile.sell_price_min + profile.sell_price_max) / 2;
          if (avg > 0) {
            priceMap[profile.name] = {
              avgPrice: avg,
              location: profile.location,
              items: profile.total_items,
            };
          }
        });
        setMineralPrices(priceMap);
      }
      if (locationData?.minerals) {
        const priceMap = {};
        Object.entries(locationData.minerals).forEach(([key, data]) => {
          if (data.price_sell > 0) {
            priceMap[key] = data.price_sell;
          }
        });
        setMiningLocationPrices(priceMap);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const mineralPriceLookup = useMemo(() => {
    const lookup = {};
    minerals.forEach(m => {
      const locKey = rawNameToLocationKey(m.rawName);
      if (miningLocationPrices[locKey]) {
        lookup[m.rawName] = miningLocationPrices[locKey];
      } else {
        const shopKey = Object.keys(mineralPrices).find(k =>
          m.rawName.toLowerCase().includes(k.toLowerCase().split('_')[1] || '')
        );
        lookup[m.rawName] = shopKey ? mineralPrices[shopKey].avgPrice : 0;
      }
    });
    return lookup;
  }, [minerals, mineralPrices, miningLocationPrices]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(key === 'name' || key === 'price');
    }
  };

  const sorted = useMemo(() => {
    let result = [...minerals];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(m =>
        m.name.toLowerCase().includes(q) ||
        (m.name_zh || '').toLowerCase().includes(q)
      );
    }
    if (systemFilter) {
      result = result.filter(m => {
        const systems = getMineralSystems(m.rawName);
        return systems.some(s => s.trim() === systemFilter);
      });
    }
    result.sort((a, b) => {
      let va, vb;
      if (sortKey === 'price') {
        va = mineralPriceLookup[a.rawName] || 0;
        vb = mineralPriceLookup[b.rawName] || 0;
      } else {
        va = a[sortKey];
        vb = b[sortKey];
      }
      if (typeof va === 'string') {
        va = va.toLowerCase();
        vb = vb.toLowerCase();
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      }
      return sortAsc ? (va || 0) - (vb || 0) : (vb || 0) - (va || 0);
    });
    return result;
  }, [minerals, searchQuery, sortKey, sortAsc, systemFilter, mineralPriceLookup]);

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
        <CircularProgress sx={{ color: '#c9a227' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Science sx={{ color: '#c9a227', fontSize: 24 }} />
        <Box>
          <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '1rem', color: '#c9a227' }}>
            采矿指南
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201,162,39,0.4)' }}>
            {sorted.length} / {minerals.length} 种矿物
          </Typography>
        </Box>
      </Box>

      <Box ref={searchBoxRef} sx={{ position: 'relative' }}>
        <TextField
          fullWidth size="small" placeholder="搜索矿物名称..."
          value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setHistoryOpen(true)}
          onBlur={() => { if (searchQuery.trim()) addToHistory({ id: searchQuery.trim(), keyword: searchQuery.trim() }); setTimeout(() => setHistoryOpen(false), 150); }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(201,162,39,0.4)' }} /></InputAdornment>,
          }}
          sx={{ '& .MuiOutlinedInput-root': { color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' } }}
        />
        {historyOpen && !searchQuery && searchHistory.length > 0 && (
          <Box sx={{ position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, background: 'rgba(3,12,25,0.98)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: '4px', zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
            {searchHistory.slice(0, 5).map(h => (
              <Box key={h.id} onClick={() => { setSearchQuery(h.keyword); setHistoryOpen(false); }}
                sx={{ px: 1.5, py: 0.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { background: 'rgba(201,162,39,0.08)' } }}>
                <HistoryIcon sx={{ fontSize: 12, color: 'rgba(201,162,39,0.3)' }} />
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{h.keyword}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* System filter */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Chip label="全部星系" size="small" onClick={() => setSystemFilter('')}
          sx={{
            background: !systemFilter ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${!systemFilter ? 'rgba(0,221,170,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: !systemFilter ? '#00ddaa' : 'rgba(255,255,255,0.5)',
            fontSize: '0.65rem',
          }} />
        {['Stanton', 'Pyro', 'Nyx'].map(sys => (
          <Chip key={sys} label={sys} size="small"
            onClick={() => setSystemFilter(systemFilter === sys ? '' : sys)}
            sx={{
              background: systemFilter === sys ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${systemFilter === sys ? 'rgba(0,221,170,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: systemFilter === sys ? '#00ddaa' : 'rgba(255,255,255,0.5)',
              fontSize: '0.65rem',
            }} />
        ))}
      </Box>

      {/* Sort chips */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {SORT_OPTIONS.map(opt => (
          <Chip
            key={opt.key}
            label={opt.label}
            size="small"
            onClick={() => handleSort(opt.key)}
            icon={sortKey === opt.key ? (sortAsc ? <ArrowUpward sx={{ fontSize: 12 }} /> : <ArrowDownward sx={{ fontSize: 12 }} />) : undefined}
            sx={{
              background: sortKey === opt.key ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${sortKey === opt.key ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: sortKey === opt.key ? '#c9a227' : 'rgba(255,255,255,0.5)',
              fontSize: '0.65rem',
              '& .MuiChip-icon': { color: 'inherit' },
            }}
          />
        ))}
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {sorted.map(mineral => (
          <MineralCard key={mineral.rawName} mineral={mineral} price={mineralPriceLookup[mineral.rawName]}
            onClick={() => setSelectedMineral(mineral)} />
        ))}
      </Box>

      {miningDate && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, justifyContent: 'center', pt: 1, opacity: 0.5 }}>
          {miningStale && <Warning sx={{ fontSize: 12, color: '#ffaa00' }} />}
          <Typography sx={{ fontSize: '0.6rem', color: miningStale ? '#ffaa00' : 'rgba(255,255,255,0.3)', fontFamily: '"Rajdhani",sans-serif' }}>
            数据更新于 {miningDate.toISOString().slice(0, 10)}
          </Typography>
        </Box>
      )}

      <Typography sx={{ fontSize: '0.5rem', color: 'rgba(201,162,39,0.3)', textAlign: 'center', mt: 0.5 }}>
        点击查看刷新地点
      </Typography>

      <MineralDetailDialog
        open={!!selectedMineral}
        mineral={selectedMineral}
        price={selectedMineral ? mineralPriceLookup[selectedMineral.rawName] : 0}
        onClose={() => setSelectedMineral(null)}
      />
    </Box>
  );
}

function MineralCard({ mineral, price, onClick }) {
  const diff = getDifficulty(mineral.elementInstability, mineral.elementResistance);
  const instBar = getInstabilityBar(mineral.elementInstability);
  const explBar = getExplosionBar(mineral.elementExplosionMultiplier);
  const systems = getMineralSystems(mineral.rawName);

  return (
    <Box onClick={onClick} sx={{
      background: 'rgba(3, 12, 25, 0.9)',
      border: '1px solid rgba(201, 162, 39, 0.08)',
      borderRadius: '4px',
      overflow: 'hidden',
      transition: 'all 0.2s',
      cursor: 'pointer',
      '&:hover': { borderColor: 'rgba(201, 162, 39, 0.3)', boxShadow: '0 0 12px rgba(201,162,39,0.1)' },
    }}>
      <Box sx={{ p: 1.2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.8 }}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif', lineHeight: 1.2 }}>
            {mineral.name_zh || mineral.name}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {price > 0 && (
              <Typography sx={{ fontSize: '0.6rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                {price.toFixed(1)} <span style={{ fontSize: '0.5rem', opacity: 0.6 }}>aUEC/SCU</span>
              </Typography>
            )}
            <Chip label={diff.label} size="small" sx={{
              height: 18, fontSize: '0.55rem',
              background: `${diff.color}15`, border: `1px solid ${diff.color}30`, color: diff.color,
            }} />
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
          <StatRow label={FIELD_LABELS.elementInstability} value={mineral.elementInstability} bar={instBar} />
          <StatRow label={FIELD_LABELS.elementResistance} value={mineral.elementResistance} bar={null} />
          <StatRow label={FIELD_LABELS.elementOptimalWindowMidpoint} value={mineral.elementOptimalWindowMidpoint} bar={null} />
          <StatRow label={FIELD_LABELS.elementOptimalWindowThinness} value={mineral.elementOptimalWindowThinness} bar={null} />
          <StatRow label={FIELD_LABELS.elementExplosionMultiplier} value={mineral.elementExplosionMultiplier} bar={explBar} />
          <StatRow label={FIELD_LABELS.elementClusterFactor} value={mineral.elementClusterFactor} bar={null} />
        </Box>

        {/* Mining base locations */}
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid rgba(201,162,39,0.08)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
            <Place sx={{ fontSize: 12, color: 'rgba(201,162,39,0.4)' }} />
            <Typography sx={{ fontSize: '0.55rem', color: 'rgba(201,162,39,0.5)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif', fontWeight: 600 }}>
              采矿基地位置
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
            {systems.map(sys => {
              const trimmed = sys.trim();
              return (
                <Typography key={trimmed} sx={{
                  fontSize: '0.5rem', color: trimmed === 'Pyro' ? '#ff6644' : '#00ddaa',
                  background: trimmed === 'Pyro' ? 'rgba(255,102,68,0.08)' : 'rgba(0,221,170,0.08)',
                  px: 0.5, borderRadius: '2px', border: `1px solid ${trimmed === 'Pyro' ? 'rgba(255,102,68,0.15)' : 'rgba(0,221,170,0.15)'}`,
                }}>
                  {trimmed} 矿区
                </Typography>
              );
            })}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

function StatRow({ label, value, bar }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.35)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif', minWidth: 72, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        {bar && (
          <Box sx={{ width: `${bar.pct}%`, height: '100%', background: bar.color, borderRadius: 2, transition: 'width 0.3s' }} />
        )}
      </Box>
      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Orbitron",sans-serif', minWidth: 32, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default MiningGuidePanel;
