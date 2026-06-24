// ShipPanel.jsx - 舰船数据库面板 (Wiki-primary)
import React, { useState, useEffect, useMemo, useCallback, Component } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress, Button, Tooltip, Dialog, IconButton, Select, MenuItem, FormControl } from '@mui/material';
import { Search, DirectionsBoat, OpenInNew, People, Inventory2, Extension, CompareArrows, Close, CheckBoxOutlineBlank, CheckBox, SortByAlpha, AttachMoney, Tune } from '@mui/icons-material';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback || null;
    }
    return this.props.children;
  }
}

function getPlaceholderSvg(name) {
  const initials = (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120">
    <rect width="200" height="120" fill="#0a1520"/>
    <text x="100" y="50" text-anchor="middle" fill="#c9a227" font-size="28" font-family="sans-serif" opacity="0.6">${initials}</text>
    <text x="100" y="75" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="11" font-family="sans-serif">${(name || '').slice(0, 20)}</text>
  </svg>`)}`;
}

const ROLE_ZH = {
  'Heavy Fighter': '重型战斗机', 'Light Fighter': '轻型战斗机', 'Medium Fighter': '中型战斗机',
  'Heavy Freight': '重型运输', 'Medium Freight': '中型运输', 'Light Freight': '轻型运输',
  'Expedition': '探索', 'Pathfinder': '探路者', 'Racing': '竞速',
  'Medical': '医疗', 'Interdiction': '截击', 'Stealth Fighter': '隐形战斗机',
  'Dropship': '运输舰', 'Heavy Gunship': '重型炮艇', 'Gunship': '炮艇',
  'Frigate': '护卫舰', 'Luxury Touring': '豪华巡游', 'Snub Fighter': '子战斗机',
  'Light Salvage': '轻型打捞', 'Heavy Salvage': '重型打捞',
  'Interceptor': '拦截机', 'Stealth Bomber': '隐形轰炸', 'Bomber': '轰炸机',
  'Heavy Bomber': '重型轰炸', 'Starter': '入门', 'Modular': '模块化',
  'Light Mining': '轻型采矿', 'Medium Mining': '中型采矿',
  'Medium Salvage': '中型打捞', 'Passenger': '客运', 'Recovery': '救援',
  'Generalist': '多用途', 'Transport': '运输', 'Medium Data': '中型数据',
  'Heavy Dropship': '重型运输舰', 'Carrier': '航母', 'Reporting': '侦察',
  'Light Science': '轻型科研', 'Light Refueling': '轻型加油',
  'Heavy Refueling': '重型加油', 'Touring': '巡游', 'Corvette': '驱逐舰',
  'Destroyer': '歼灭舰',
};

const PRODUCTION_STATUS_ZH = {
  'in-concept': '概念阶段',
  'concept': '概念阶段',
  'hangar': '机库展示',
  'in-production': '生产中',
  'flight-ready': '可飞行',
  'flyable': '可飞行',
  'flight-ready (in game)': '可飞行(游戏中)',
};

const COMPONENT_TYPE_ZH = {
  'Cooler': '冷却器',
  'PowerPlant': '发电厂',
  'ShieldGenerator': '护盾发生器',
  'QuantumDrive': '量子引擎',
  'Radar': '雷达',
  'LifeSupportGenerator': '生命维持',
  'Computers': '计算机',
  'FuelIntake': '燃料采集',
  'FuelTank': '燃料箱',
  'Communication': '通讯',
};

const PORT_TYPE_ZH = {
  WeaponGun: '舰船武器', Cooler: '冷却器', PowerPlant: '发电机',
  Radar: '雷达', QuantumDrive: '量子驱动', Shield: '护盾',
  MissileLauncher: '导弹架', Turret: '炮塔', Bomb: '炸弹',
  Missile: '导弹', CounterMeasure: '干扰弹', WeaponController: '武器控制器',
  FlightController: '飞行控制器', ShieldController: '护盾控制器',
  JumpDrive: '跳跃驱动', SalvageModifier: '打捞模块', WeaponMining: '采矿激光',
  TractorBeam: '牵引光束', DockingCollar: '对接环', SelfDestruct: '自毁装置',
  Armor: '装甲', Paints: '涂装',
  WeaponLauncher: '发射挂点',
  MissileRack: '导弹架',
  CounterMeasureLauncher: '干扰弹',
};

const PORT_LABEL_ZH = {
  Controllers: '控制器', WeaponGun: '武器', Cooler: '冷却器',
  PowerPlant: '发电机', Radar: '雷达', QuantumDrive: '量子驱动',
  Shield: '护盾', 'Missile & Bomb Racks': '导弹与炸弹架',
  'Counter Measures': '干扰弹', Weapons: '武器', Missiles: '导弹',
  Components: '组件', Turrets: '炮塔',
};

function normalizeRole(role) {
  if (!role) return '';
  return role.split(' / ')[0].trim();
}

function formatNumber(n) {
  if (n == null) return '—';
  return n.toLocaleString();
}

function ShipPanel() {
  const [wikiData, setWikiData] = useState({});
  const [translations, setTranslations] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [mfrFilter, setMfrFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [selectedShip, setSelectedShip] = useState(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareShips, setCompareShips] = useState([]);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  useEffect(() => {
    const loadWiki = async () => {
      const allVehicles = {};
      for (let i = 1; i <= 4; i++) {
        try {
          const chunk = await fetch(`/data/wiki-vehicles-${i}.json`).then(r => r.json());
          Object.assign(allVehicles, chunk.vehicles || {});
        } catch { /* skip failed chunk */ }
      }
      return allVehicles;
    };
    Promise.all([
      loadWiki(),
      fetch('/data/paratranz-cache.json').then(r => r.json()).catch(() => ({})),
    ]).then(([wiki, paratranz]) => {
      setWikiData(wiki);
      setTranslations(paratranz || {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const allShips = useMemo(() => Object.values(wikiData), [wikiData]);

  const getZhName = useCallback((ship) => {
    const name = ship?.name || '';
    const mfrCode = ship?.manufacturer?.code || '';
    const mfrName = ship?.manufacturer?.name || ship?.manufacturer || '';
    const lowerName = name.toLowerCase();

    const patterns = [lowerName];
    if (mfrName) patterns.push(`${mfrName} ${name}`.toLowerCase());
    if (mfrCode) patterns.push(`${mfrCode.toLowerCase()} ${lowerName}`);
    if (mfrName.includes(' ')) {
      const parts = mfrName.split(' ');
      for (let i = 1; i <= parts.length; i++) {
        const prefix = parts.slice(0, i).join(' ');
        const key = `${prefix} ${name}`.toLowerCase();
        if (!patterns.includes(key)) patterns.push(key);
      }
    }

    for (const p of patterns) {
      const entry = translations[p];
      if (Array.isArray(entry)) return entry[1];
    }
    return null;
  }, [translations]);

  const manufacturers = useMemo(() => {
    const counts = {};
    for (const ship of allShips) {
      const mfr = ship.manufacturer?.name || ship.manufacturer || '';
      if (mfr) {
        counts[mfr] = (counts[mfr] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allShips]);

  const roles = useMemo(() => {
    const counts = {};
    for (const ship of allShips) {
      const normalized = normalizeRole(ship.role);
      if (normalized) {
        counts[normalized] = (counts[normalized] || 0) + 1;
      }
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [allShips]);

  const filtered = useMemo(() => {
    let result = allShips;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => {
        const name = (s.name || '').toLowerCase();
        const zhName = (getZhName(s) || '').toLowerCase();
        const mfr = (s.manufacturer?.name || s.manufacturer || '').toLowerCase();
        return name.includes(q) || zhName.includes(q) || mfr.includes(q);
      });
    }

    if (mfrFilter) {
      result = result.filter(s => (s.manufacturer?.name || s.manufacturer || '') === mfrFilter);
    }

    if (roleFilter) {
      result = result.filter(s => normalizeRole(s.role) === roleFilter);
    }

    if (sizeFilter) {
      if (sizeFilter === 'small') result = result.filter(s => (s.size_class || 0) <= 2);
      else if (sizeFilter === 'medium') result = result.filter(s => (s.size_class || 0) === 3);
      else if (sizeFilter === 'large') result = result.filter(s => (s.size_class || 0) >= 4);
    }

    result = [...result];
    if (sortBy === 'name') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'scu') {
      result.sort((a, b) => (b.cargo_capacity || 0) - (a.cargo_capacity || 0));
    } else if (sortBy === 'price') {
      result.sort((a, b) => (b.auec_price || b.msrp || 0) - (a.auec_price || a.msrp || 0));
    }

    return result;
  }, [allShips, searchQuery, mfrFilter, roleFilter, sizeFilter, sortBy, getZhName]);

  const toggleCompareMode = useCallback(() => {
    setCompareMode(prev => !prev);
    setCompareShips([]);
  }, []);

  const handleCompareShipClick = useCallback((ship) => {
    setCompareShips(prev => {
      const isSelected = prev.some(s => s.slug === ship.slug);
      if (isSelected) return prev.filter(s => s.slug !== ship.slug);
      if (prev.length >= 3) return prev;
      return [...prev, ship];
    });
  }, []);

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
        <DirectionsBoat sx={{ color: '#c9a227', fontSize: 24 }} />
        <Box>
          <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '1rem', color: '#c9a227' }}>
            舰船数据库
          </Typography>
          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201,162,39,0.4)' }}>
            {filtered.length} / {allShips.length} 艘飞船
          </Typography>
        </Box>
      </Box>

      <TextField
        fullWidth size="small" placeholder="搜索飞船名称（中/英）、制造商..."
        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ color: 'rgba(201,162,39,0.4)' }} /></InputAdornment>,
        }}
        sx={{ '& .MuiOutlinedInput-root': { color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem' } }}
      />

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        <Chip label="全部" size="small" onClick={() => setRoleFilter('')}
          sx={{ background: !roleFilter ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(201,162,39,0.2)', color: !roleFilter ? '#c9a227' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem' }} />
        {roles.map(([label, count]) => (
          <Chip key={label} label={`${ROLE_ZH[label] || label} (${count})`} size="small"
            onClick={() => setRoleFilter(roleFilter === label ? '' : label)}
            sx={{
              background: roleFilter === label ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${roleFilter === label ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: roleFilter === label ? '#c9a227' : 'rgba(255,255,255,0.5)',
              fontSize: '0.65rem',
            }} />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {[
            { key: '', label: '全部尺寸' },
            { key: 'small', label: '小型 (S1-S2)' },
            { key: 'medium', label: '中型 (S3)' },
            { key: 'large', label: '大型 (S4+)' },
          ].map(s => (
            <Chip key={s.key} label={s.label} size="small"
              onClick={() => setSizeFilter(sizeFilter === s.key ? '' : s.key)}
              sx={{
                background: sizeFilter === s.key ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${sizeFilter === s.key ? 'rgba(0,221,170,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: sizeFilter === s.key ? '#00ddaa' : 'rgba(255,255,255,0.5)',
                fontSize: '0.65rem',
              }} />
          ))}
        </Box>

        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select value={mfrFilter} onChange={e => setMfrFilter(e.target.value)}
            displayEmpty
            sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(201,162,39,0.3)' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(201,162,39,0.5)' } }}>
            <MenuItem value="" sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)' }}>全部制造商</MenuItem>
            {manufacturers.map(([name, count]) => (
              <MenuItem key={name} value={name} sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>{name} ({count})</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Chip icon={<SortByAlpha sx={{ fontSize: 12 }} />} label="名称" size="small" onClick={() => setSortBy('name')}
            sx={{ background: sortBy === 'name' ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${sortBy === 'name' ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`, color: sortBy === 'name' ? '#c9a227' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', '& .MuiChip-icon': { color: 'inherit' } }} />
          <Chip icon={<Inventory2 sx={{ fontSize: 12 }} />} label="SCU" size="small" onClick={() => setSortBy('scu')}
            sx={{ background: sortBy === 'scu' ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${sortBy === 'scu' ? 'rgba(0,221,170,0.3)' : 'rgba(255,255,255,0.08)'}`, color: sortBy === 'scu' ? '#00ddaa' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', '& .MuiChip-icon': { color: 'inherit' } }} />
          <Chip icon={<AttachMoney sx={{ fontSize: 12 }} />} label="价格" size="small" onClick={() => setSortBy('price')}
            sx={{ background: sortBy === 'price' ? 'rgba(255,170,0,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${sortBy === 'price' ? 'rgba(255,170,0,0.3)' : 'rgba(255,255,255,0.08)'}`, color: sortBy === 'price' ? '#ffaa00' : 'rgba(255,255,255,0.5)', fontSize: '0.65rem', '& .MuiChip-icon': { color: 'inherit' } }} />
        </Box>

        <Chip
          icon={<CompareArrows sx={{ fontSize: 14 }} />}
          label="对比模式"
          size="small"
          onClick={toggleCompareMode}
          sx={{
            background: compareMode ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${compareMode ? 'rgba(0,221,170,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: compareMode ? '#00ddaa' : 'rgba(255,255,255,0.5)',
            fontSize: '0.65rem',
            '& .MuiChip-icon': { color: 'inherit' },
          }}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {filtered.map(ship => (
          <WikiShipCard key={ship.slug} ship={ship} zhName={getZhName(ship)}
            compareMode={compareMode} isSelected={compareShips.some(s => s.slug === ship.slug)}
            onCompareClick={() => handleCompareShipClick(ship)}
            onClick={() => compareMode ? handleCompareShipClick(ship) : setSelectedShip(ship)} />
        ))}
      </Box>

      {compareMode && compareShips.length >= 2 && (
        <Box sx={{ position: 'sticky', bottom: 16, display: 'flex', justifyContent: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <Chip
            icon={<CompareArrows sx={{ fontSize: 16 }} />}
            label={`对比 (${compareShips.length})`}
            onClick={() => setCompareDialogOpen(true)}
            sx={{ pointerEvents: 'auto', fontWeight: 700, fontSize: '0.85rem', height: 36, background: 'linear-gradient(135deg, rgba(0,221,170,0.2), rgba(0,180,140,0.15))', border: '1px solid rgba(0,221,170,0.5)', color: '#00ddaa', boxShadow: '0 4px 20px rgba(0,221,170,0.3)', '&:hover': { background: 'linear-gradient(135deg, rgba(0,221,170,0.3), rgba(0,180,140,0.2))' }, '& .MuiChip-icon': { color: '#00ddaa' } }}
          />
        </Box>
      )}

      {selectedShip && (
        <ErrorBoundary fallback={<Box sx={{ p: 2, color: '#ff6666', textAlign: 'center' }}>页面渲染出现异常，请重试</Box>}>
          <ShipDetailDialog ship={selectedShip} zhName={getZhName(selectedShip)} translations={translations} onClose={() => setSelectedShip(null)} />
        </ErrorBoundary>
      )}

      {compareShips.length >= 2 && (
        <Dialog
          open={compareDialogOpen}
          onClose={() => setCompareDialogOpen(false)}
          maxWidth="lg" fullWidth
          PaperProps={{ sx: { background: 'linear-gradient(135deg, rgba(3,12,25,0.98) 0%, rgba(2,8,18,0.99) 100%)', border: '1px solid rgba(0,221,170,0.3)', borderRadius: '8px', maxHeight: '80vh' } }}
        >
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(0,221,170,0.15)' }}>
            <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontWeight: 700, fontSize: '1rem', color: '#00ddaa' }}>
              舰船对比
            </Typography>
            <IconButton onClick={() => setCompareDialogOpen(false)} sx={{ color: 'rgba(255,255,255,0.5)' }}>
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
    </Box>
  );
}

const WikiShipCard = React.memo(function WikiShipCard({ ship, zhName, compareMode, isSelected, onCompareClick: _onCompareClick, onClick }) {
  const [imgError, setImgError] = useState(0);
  const localImgJpg = `/ships/${ship.slug}.jpg`;
  const localImgPng = `/ships/${ship.slug}.png`;
  const localImgWebp = `/ships/${ship.slug}.webp`;
  const wikiImgUrl = ship.image_url || '';
  const placeholderSrc = getPlaceholderSvg(ship.name_zh || ship.name, ship.manufacturer?.name);
  const imgSrc = imgError === 0 ? localImgJpg : imgError === 1 ? localImgPng : imgError === 2 ? localImgWebp : imgError === 3 ? wikiImgUrl : placeholderSrc;
  const mfrName = ship.manufacturer?.name || ship.manufacturer || '';
  const crewStr = ship.crew?.min && ship.crew?.max ? (ship.crew.min === ship.crew.max ? `${ship.crew.min}` : `${ship.crew.min}-${ship.crew.max}`) : '—';
  const normalizedRole = normalizeRole(ship.role);

  return (
    <Box onClick={onClick} sx={{
      background: 'rgba(3, 12, 25, 0.9)',
      border: `1px solid ${isSelected ? 'rgba(0,221,170,0.4)' : 'rgba(201, 162, 39, 0.08)'}`,
      borderRadius: '4px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.2s',
      '&:hover': { borderColor: isSelected ? 'rgba(0,221,170,0.6)' : 'rgba(201, 162, 39, 0.3)', boxShadow: `0 0 12px ${isSelected ? 'rgba(0,221,170,0.15)' : 'rgba(201, 162, 39, 0.1)'}` },
    }}>
      <Box sx={{ height: 120, background: 'rgba(0,10,20,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
        <Box component="img" src={imgSrc} alt={ship.name}
          referrerPolicy="no-referrer"
          onError={() => setImgError(prev => prev + 1)}
          sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {compareMode && (
          <Box sx={{
            position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: '3px',
            background: isSelected ? 'rgba(0,221,170,0.9)' : 'rgba(0,0,0,0.5)',
            border: `1px solid ${isSelected ? '#00ddaa' : 'rgba(255,255,255,0.3)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {isSelected ? <CheckBox sx={{ fontSize: 16, color: '#000' }} /> : <CheckBoxOutlineBlank sx={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }} />}
          </Box>
        )}
        {ship.production_status && ship.production_status !== 'flight-ready' && (
          <Box sx={{ position: 'absolute', top: 6, left: 6, background: 'rgba(255,170,0,0.9)', px: 0.5, borderRadius: '2px' }}>
            <Typography sx={{ fontSize: '0.5rem', color: '#000', fontWeight: 700 }}>
              {PRODUCTION_STATUS_ZH[ship.production_status] || ship.production_status}
            </Typography>
          </Box>
        )}
      </Box>

      <Box sx={{ p: 1.2 }}>
        <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Rajdhani",sans-serif', mb: 0.2 }}>
          {mfrName}
        </Typography>
        {zhName && (
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#c9a227', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif', mb: 0.1, lineHeight: 1.2 }}>
            {zhName}
          </Typography>
        )}
        <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: '"Rajdhani",sans-serif', mb: 0.5, lineHeight: 1.2 }}>
          {ship.name}
        </Typography>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 0.5 }}>
          {(ship.cargo_capacity || 0) > 0 && (
            <Tooltip title="货舱容量">
              <Typography sx={{ fontSize: '0.6rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif' }}>
                <Inventory2 sx={{ fontSize: 10, mr: 0.3, verticalAlign: 'middle' }} />{ship.cargo_capacity} SCU
              </Typography>
            </Tooltip>
          )}
          <Tooltip title="船员">
            <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Orbitron",sans-serif' }}>
              <People sx={{ fontSize: 10, mr: 0.3, verticalAlign: 'middle' }} />{crewStr}
            </Typography>
          </Tooltip>
          {normalizedRole && (
            <Typography sx={{ fontSize: '0.55rem', color: 'rgba(201,162,39,0.6)', background: 'rgba(201,162,39,0.08)', px: 0.5, borderRadius: '2px' }}>
              {ROLE_ZH[normalizedRole] || normalizedRole}
            </Typography>
          )}
        </Box>

        {ship.auec_price > 0 && (
          <Typography sx={{ fontSize: '0.7rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 600, mt: 0.5 }}>
            {formatNumber(ship.auec_price)} <span style={{ fontSize: '0.55rem', opacity: 0.6 }}>aUEC</span>
          </Typography>
        )}
        {ship.msrp > 0 && (
          <Typography sx={{ fontSize: '0.6rem', color: 'rgba(201,162,39,0.6)', fontFamily: '"Orbitron",sans-serif', mt: 0.3 }}>
            ${ship.msrp} USD
          </Typography>
        )}
      </Box>
    </Box>
  );
});

function ShipDetailDialog({ ship, zhName, onClose, translations }) {
  const [detailImgError, setDetailImgError] = useState(0);

  const ptLower = useMemo(() => {
    const map = {};
    if (translations) {
      for (const [k, v] of Object.entries(translations)) {
        map[k.toLowerCase()] = v;
      }
    }
    return map;
  }, [translations]);

  const getItemZh = useCallback((name) => {
    if (!name) return null;
    const entry = ptLower[name.toLowerCase()];
    if (Array.isArray(entry)) return entry[1];
    return null;
  }, [ptLower]);

  if (!ship) return null;

  const mfrName = ship.manufacturer?.name || ship.manufacturer || '';
  const mfrCode = ship.manufacturer?.code || '';
  const crewStr = ship.crew?.min && ship.crew?.max ? (ship.crew.min === ship.crew.max ? `${ship.crew.min}` : `${ship.crew.min}-${ship.crew.max}`) : '—';
  const dims = ship.sizes || {};
  const dimsStr = dims.length && dims.beam && dims.height ? `${dims.length}×${dims.beam}×${dims.height}m` : '—';
  const pilotDps = ship.weaponry?.pilot_dps?.toFixed(0) || ship.weaponry_enriched?.pilot_dps?.toFixed(0) || '—';
  const turretDps = ship.weaponry?.turret_dps?.toFixed(0) || ship.weaponry_enriched?.turret_dps?.toFixed(0) || null;
  const normalizedRole = normalizeRole(ship.role);
  const localDetailImgJpg = `/ships/${ship.slug}.jpg`;
  const localDetailImgPng = `/ships/${ship.slug}.png`;
  const localDetailImgWebp = `/ships/${ship.slug}.webp`;
  const wikiImg = ship.image_url || '';
  const detailImgSrc = detailImgError === 0 ? localDetailImgJpg : detailImgError === 1 ? localDetailImgPng : detailImgError === 2 ? localDetailImgWebp : detailImgError === 3 ? wikiImg : getPlaceholderSvg(ship.name_zh || ship.name, mfrName);

  const purchaseData = ship.uex_prices?.purchase || [];
  const rentalData = ship.uex_prices?.rental || [];

  const productionZh = ship.production_status_enriched?.zh || PRODUCTION_STATUS_ZH[ship.production_status] || ship.production_status || '';
  const quantumSpeed = ship.quantum_speed || ship.quantum_enriched?.quantum_speed;
  const quantumFuel = ship.quantum_fuel || ship.quantum_enriched?.quantum_fuel_capacity;
  const quantumRange = ship.quantum_enriched?.quantum_range;
  const shieldHp = ship.shield_hp || ship.shield_enriched?.hp;
  const shieldRegen = ship.shield_enriched?.regeneration;
  const shieldFace = ship.shield_enriched?.face_type;
  const mass = ship.mass || ship.mass_enriched?.total;
  const speedScm = ship.speed?.scm || ship.speed_enriched?.scm;
  const speedMax = ship.speed?.max || ship.speed_enriched?.max;

  const specs = [
    { label: 'SCU 货舱', value: (ship.cargo_capacity || 0) > 0 ? `${ship.cargo_capacity} SCU` : '—' },
    { label: '船员', value: crewStr },
    { label: '尺寸', value: dimsStr },
    { label: '质量', value: mass ? `${(mass / 1000).toFixed(1)}t` : '—' },
    { label: 'SCM 速度', value: speedScm ? `${speedScm} m/s` : '—' },
    { label: '最高速度', value: speedMax ? `${speedMax} m/s` : '—', color: '#00ddaa' },
    { label: '护盾 HP', value: shieldHp ? formatNumber(shieldHp) : '—', color: '#44bbff' },
    { label: '护盾类型', value: shieldFace || '—' },
    { label: '护盾回盾', value: shieldRegen ? `${shieldRegen}/s` : '—', color: '#44bbff' },
    { label: '船体 HP', value: ship.health ? formatNumber(ship.health) : '—', color: '#ff6644' },
    { label: '飞行员DPS', value: pilotDps, color: '#ff6644' },
    ...(turretDps ? [{ label: '炮塔DPS', value: turretDps, color: '#ffaa00' }] : []),
    { label: '量子速度', value: quantumSpeed ? `${(quantumSpeed / 1000).toFixed(0)} km/s` : '—' },
    { label: '量子燃料', value: quantumFuel ? `${quantumFuel.toFixed(1)} SCU` : '—' },
    ...(quantumRange ? [{ label: '量子航程', value: `${(quantumRange / 1000000).toFixed(0)}M km` }] : []),
    { label: '尺寸等级', value: ship.size_class ? `S${ship.size_class}` : '—' },
    ...(ship.agility ? [{ label: '机动性', value: `P${ship.agility.pitch} Y${ship.agility.yaw} R${ship.agility.roll}` }] : []),
    ...(ship.max_medical_tier ? [{ label: '医疗等级', value: `T${ship.max_medical_tier}` }] : []),
  ];

  const loadout = ship.loadout || {};
  const weaponMounts = loadout.weapons || [];
  const components = loadout.components || [];
  const missileRacks = loadout.missile_racks || [];
  const turretsList = loadout.turrets || [];

  const pilotWeapons = weaponMounts.filter(w => !w.port_name?.includes('turret'));
  const turretWeapons = weaponMounts.filter(w => w.port_name?.includes('turret'));

  const componentGroups = {};
  for (const c of components) {
    const type = c.port_type || c.port_label || '其他';
    if (!componentGroups[type]) componentGroups[type] = [];
    componentGroups[type].push(c);
  }

  return (
    <Dialog
      open={true}
      onClose={onClose}
      maxWidth="md" fullWidth
      PaperProps={{ sx: { background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.98) 0%, rgba(2, 8, 18, 0.99) 100%)', border: '1px solid rgba(201, 162, 39, 0.2)', borderRadius: '6px', maxHeight: '90vh' } }}
    >
      <Box sx={{ position: 'relative' }}>
        <Box sx={{ height: 220, background: 'rgba(0,10,20,0.5)', position: 'relative', overflow: 'hidden' }}>
          <Box component="img"
            src={detailImgSrc}
            alt={ship.name}
            referrerPolicy="no-referrer"
            onError={() => setDetailImgError(prev => prev + 1)}
            sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2.5, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
            <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Rajdhani",sans-serif', mb: 0.2 }}>
              {mfrCode && <span style={{ color: 'rgba(201,162,39,0.5)' }}>[{mfrCode}] </span>}
              {mfrName}
            </Typography>
            {zhName && (
              <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#c9a227', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
                {zhName}
              </Typography>
            )}
            <Typography sx={{ fontFamily: '"Orbitron",sans-serif', fontSize: '1.2rem', fontWeight: 700, color: '#fff' }}>
              {ship.name}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, color: 'rgba(255,255,255,0.7)', background: 'rgba(0,0,0,0.5)' }}>
          <Close />
        </IconButton>
      </Box>

      <Box sx={{ p: 2.5, overflowY: 'auto', maxHeight: 'calc(90vh - 220px)' }}>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
          {normalizedRole && <Chip label={ROLE_ZH[normalizedRole] || normalizedRole} size="small" sx={{ background: 'rgba(201,162,39,0.08)', border: '1px solid rgba(201,162,39,0.15)', color: 'rgba(201,162,39,0.7)', fontSize: '0.65rem' }} />}
          {ship.size_class && <Chip label={`S${ship.size_class}`} size="small" sx={{ background: 'rgba(0,221,170,0.08)', border: '1px solid rgba(0,221,170,0.15)', color: 'rgba(0,221,170,0.7)', fontSize: '0.65rem' }} />}
          {productionZh && <Chip label={productionZh} size="small" sx={{ background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.15)', color: 'rgba(255,170,0,0.7)', fontSize: '0.65rem' }} />}
        </Box>

        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1, mb: 2.5 }}>
          {specs.filter(s => s.value !== '—').map(s => (
            <Box key={s.label} sx={{ background: 'rgba(0,10,20,0.4)', border: '1px solid rgba(201,162,39,0.06)', borderRadius: '2px', p: 1 }}>
              <Typography sx={{ fontSize: '0.6rem', color: 'rgba(201,162,39,0.4)', fontFamily: '"Rajdhani",sans-serif', mb: 0.3 }}>
                {s.label}
              </Typography>
              <Typography sx={{ fontSize: '0.85rem', color: s.color || 'rgba(255,255,255,0.9)', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                {s.value}
              </Typography>
            </Box>
          ))}
        </Box>

        {(pilotWeapons.length > 0 || turretWeapons.length > 0 || turretsList.length > 0 || missileRacks.length > 0) && (
          <Box sx={{ background: 'rgba(25,5,5,0.3)', border: '1px solid rgba(255,100,68,0.15)', borderRadius: '4px', p: 1.5, mb: 2 }}>
            <Typography sx={{ fontSize: '0.65rem', color: '#ff6644', fontFamily: '"Orbitron",sans-serif', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Extension sx={{ fontSize: 14 }} /> 初始配置 - 武器
            </Typography>

            {pilotWeapons.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,100,68,0.6)', mb: 0.5, fontFamily: '"Rajdhani",sans-serif' }}>
                  驾驶员武器 ({pilotWeapons.filter(w => w.equipped).length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {pilotWeapons.filter(w => w.equipped).map((w, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', px: 1, py: 0.5, borderRadius: '2px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1 }}>
                        <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Orbitron",sans-serif', minWidth: 30 }}>
                          S{w.mount_size || '?'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                          {getItemZh(w.equipped.name) || w.equipped.name}
                        </Typography>
                        {w.equipped.class && (
                          <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.05)', px: 0.4, borderRadius: '1px' }}>
                            {getItemZh(w.equipped.class) || w.equipped.class}
                          </Typography>
                        )}
                      </Box>
                      {w.equipped.dps != null && (
                        <Typography sx={{ fontSize: '0.65rem', color: '#ff6644', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                          {w.equipped.dps.toFixed(0)} DPS
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {turretWeapons.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,170,0,0.6)', mb: 0.5, fontFamily: '"Rajdhani",sans-serif' }}>
                  炮塔武器 ({turretWeapons.filter(w => w.equipped).length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {turretWeapons.filter(w => w.equipped).map((w, i) => (
                    <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.2)', px: 1, py: 0.5, borderRadius: '2px' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1 }}>
                        <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Orbitron",sans-serif', minWidth: 30 }}>
                          S{w.mount_size || '?'}
                        </Typography>
                        <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                          {getItemZh(w.equipped.name) || w.equipped.name}
                        </Typography>
                      </Box>
                      {w.equipped.dps != null && (
                        <Typography sx={{ fontSize: '0.65rem', color: '#ffaa00', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                          {w.equipped.dps.toFixed(0)} DPS
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {turretsList.length > 0 && (
              <Box sx={{ mb: 1 }}>
                <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,170,0,0.6)', mb: 0.5, fontFamily: '"Rajdhani",sans-serif' }}>
                  炮塔
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {turretsList.map((t, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, background: 'rgba(0,0,0,0.2)', px: 1, py: 0.5, borderRadius: '2px' }}>
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                        {getItemZh(t.name) || t.name || getItemZh(t.type) || t.type}
                      </Typography>
                      {t.size && (
                        <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)' }}>
                          S{t.size}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            )}

            {missileRacks.length > 0 && (
              <Box>
                <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,200,0,0.6)', mb: 0.5, fontFamily: '"Rajdhani",sans-serif' }}>
                  导弹/干扰弹 ({missileRacks.length})
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  {missileRacks.map((m, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 0.8, background: 'rgba(0,0,0,0.2)', px: 1, py: 0.5, borderRadius: '2px' }}>
                      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Orbitron",sans-serif', minWidth: 30 }}>
                        S{m.mount_size || '?'}
                      </Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.8)' }}>
                        {getItemZh(m.equipped?.name) || m.equipped?.name || PORT_LABEL_ZH[m.port_label] || PORT_TYPE_ZH[m.port_type] || m.port_type}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </Box>
        )}

        {Object.keys(componentGroups).length > 0 && (
          <Box sx={{ background: 'rgba(5,15,30,0.3)', border: '1px solid rgba(0,180,255,0.15)', borderRadius: '4px', p: 1.5, mb: 2 }}>
            <Typography sx={{ fontSize: '0.65rem', color: '#44bbff', fontFamily: '"Orbitron",sans-serif', fontWeight: 700, mb: 1, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Tune sx={{ fontSize: 14 }} /> 初始配置 - 组件
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 1 }}>
              {Object.entries(componentGroups).map(([type, items]) => (
                <Box key={type} sx={{ background: 'rgba(0,0,0,0.15)', borderRadius: '2px', p: 1 }}>
                  <Typography sx={{ fontSize: '0.6rem', color: 'rgba(0,180,255,0.6)', mb: 0.5, fontFamily: '"Rajdhani",sans-serif', fontWeight: 600 }}>
                    {PORT_LABEL_ZH[type] || COMPONENT_TYPE_ZH[type] || type} ({items.length})
                  </Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                    {items.filter(c => c.equipped).map((c, i) => (
                      <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Orbitron",sans-serif' }}>
                            S{c.mount_size || c.equipped?.size || '?'}
                          </Typography>
                          <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)' }}>
                            {getItemZh(c.equipped.name) || c.equipped.name}
                          </Typography>
                        </Box>
                        {c.equipped.manufacturer && (
                          <Typography sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)' }}>
                            {c.equipped.manufacturer}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

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

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
          {ship.pledge_url && (
            <Button size="small" href={ship.pledge_url} target="_blank" rel="noopener" startIcon={<OpenInNew sx={{ fontSize: 14 }} />}
              sx={{ color: '#c9a227', fontSize: '0.7rem', border: '1px solid rgba(201,162,39,0.2)', '&:hover': { borderColor: '#c9a227' } }}>
              RSI 商店
            </Button>
          )}
          {ship.wiki_url && (
            <Button size="small" href={ship.wiki_url} target="_blank" rel="noopener" startIcon={<OpenInNew sx={{ fontSize: 14 }} />}
              sx={{ color: '#00ddaa', fontSize: '0.7rem', border: '1px solid rgba(0,221,170,0.2)', '&:hover': { borderColor: '#00ddaa' } }}>
              Wiki 详情
            </Button>
          )}
          <Button size="small" href={'https://hardpoint.io/#/'} target="_blank" rel="noopener" startIcon={<OpenInNew sx={{ fontSize: 14 }} />}
            sx={{ color: '#aa66ff', fontSize: '0.7rem', border: '1px solid rgba(170,102,255,0.2)', '&:hover': { borderColor: '#aa66ff' } }}>
            Hardpoint.io
          </Button>
        </Box>

        <Button fullWidth onClick={onClose} sx={{ mt: 1, color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>
          关闭
        </Button>
      </Box>
    </Dialog>
  );
}

export default ShipPanel;
