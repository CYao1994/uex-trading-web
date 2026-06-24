// ShipPanel.jsx - 舰船数据库面板 (Wiki-primary)
import React, { useState, useEffect, useMemo, useCallback, Component } from 'react';
import { Box, Typography, CircularProgress, Button, Tooltip, Dialog, IconButton, Chip } from '@mui/material';
import { DirectionsBoat, OpenInNew, People, Inventory2, Close, CheckBoxOutlineBlank, CheckBox } from '@mui/icons-material';
import ShipFilterBar from './ShipFilterBar';
import ShipCompareDialog from './ShipCompareDialog';
import ShipDetailWeaponsLoadout from './ShipDetailWeaponsLoadout';
import ShipDetailComponentsLoadout from './ShipDetailComponentsLoadout';
import ShipDetailPricing from './ShipDetailPricing';

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

      <ShipFilterBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        roles={roles}
        sizeFilter={sizeFilter}
        onSizeFilterChange={setSizeFilter}
        mfrFilter={mfrFilter}
        onMfrFilterChange={setMfrFilter}
        manufacturers={manufacturers}
        sortBy={sortBy}
        onSortChange={setSortBy}
        compareMode={compareMode}
        onCompareModeToggle={toggleCompareMode}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 1.5 }}>
        {filtered.map(ship => (
          <WikiShipCard key={ship.slug} ship={ship} zhName={getZhName(ship)}
            compareMode={compareMode} isSelected={compareShips.some(s => s.slug === ship.slug)}
            onCompareClick={() => handleCompareShipClick(ship)}
            onClick={() => compareMode ? handleCompareShipClick(ship) : setSelectedShip(ship)} />
        ))}
      </Box>

      <ShipCompareDialog
        compareMode={compareMode}
        compareShips={compareShips}
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        onOpen={() => setCompareDialogOpen(true)}
        getZhName={getZhName}
      />

      {selectedShip && (
        <ErrorBoundary fallback={<Box sx={{ p: 2, color: '#ff6666', textAlign: 'center' }}>页面渲染出现异常，请重试</Box>}>
          <ShipDetailDialog ship={selectedShip} zhName={getZhName(selectedShip)} translations={translations} onClose={() => setSelectedShip(null)} />
        </ErrorBoundary>
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

        <ShipDetailWeaponsLoadout
          weaponMounts={weaponMounts}
          turretsList={turretsList}
          missileRacks={missileRacks}
          getItemZh={getItemZh}
        />

        <ShipDetailComponentsLoadout
          componentGroups={componentGroups}
          getItemZh={getItemZh}
        />

        <ShipDetailPricing
          ship={ship}
          purchaseData={purchaseData}
          rentalData={rentalData}
        />

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
