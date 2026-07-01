import { useState, useEffect, useMemo, useRef } from 'react';
import {
  Box, Typography, TextField, InputAdornment, Chip, CircularProgress, Link,
  Dialog, DialogTitle, DialogContent, IconButton, Divider, useMediaQuery, useTheme,
} from '@mui/material';
import { Search, Science, Timer, History as HistoryIcon, Close, OpenInNew } from '@mui/icons-material';
import { useSearchHistory } from '../hooks/useSearchHistory';
import BlueprintCard from './BlueprintCard';
import BlueprintRecipeSection from './BlueprintRecipeSection';
import BlueprintAcquisitionSection from './BlueprintAcquisitionSection';
import BlueprintDismantleSection from './BlueprintDismantleSection';

function formatCraftTime(seconds) {
  if (!seconds || seconds <= 0) return '0秒';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return m > 0 ? `${h}时 ${m}分` : `${h}时`;
  if (m > 0) return s > 0 ? `${m}分 ${s}秒` : `${m}分`;
  return `${s}秒`;
}

const TYPE_COLORS = {
  WeaponGun: '#ff6644',
  Cooler: '#00ddaa',
  PowerPlant: '#ffaa00',
  QuantumDrive: '#aa66ff',
  Shield: '#44bbff',
  Radar: '#77bbff',
  MiningLaser: '#ff6644',
  TractorBeam: '#66ddff',
  Salvage: '#cc88aa',
  Ammo: '#ff8844',
  Char_Armor_Helmet: '#88aacc',
  Char_Armor_Torso: '#88aacc',
  Char_Armor_Arms: '#88aacc',
  Char_Armor_Legs: '#88aacc',
  Char_Armor_Backpack: '#88aacc',
  Char_Armor_Undersuit: '#88aacc',
  WeaponPersonal: '#ff8866',
  WeaponAttachment: '#ff9966',
  WeaponMining: '#ff6644',
  DockingCollar: '#aacc44',
  SalvageModifier: '#cc88aa',
  SalvageHead: '#cc88aa',
  Misc: '#999999',
};

const TYPE_LABELS = {
  WeaponGun: '舰船武器',
  Cooler: '冷却器',
  PowerPlant: '发电机',
  QuantumDrive: '量子驱动',
  Shield: '护盾',
  Radar: '雷达',
  MiningLaser: '采矿激光',
  TractorBeam: '牵引光束',
  Salvage: '打捞',
  Ammo: '弹药',
  Char_Armor_Helmet: '头盔',
  Char_Armor_Torso: '胸甲',
  Char_Armor_Arms: '臂甲',
  Char_Armor_Legs: '腿甲',
  Char_Armor_Backpack: '背包',
  Char_Armor_Undersuit: '基底服',
  WeaponPersonal: '个人武器',
  WeaponAttachment: '武器附件',
  WeaponMining: '采矿激光器',
  DockingCollar: '对接环',
  SalvageModifier: '打捞模块',
  SalvageHead: '打捞头',
  Misc: '其他',
};

function BlueprintDetailDialog({ open, onClose, blueprint }) {
  const fullScreen = useMediaQuery('(max-width:600px)');

  if (!blueprint) return null;

  const typeColor = TYPE_COLORS[blueprint.type] || '#c9a227';

  const getAcquisitionLabel = (bp) => {
    if (bp.acquisition === 'mission' && bp.missions && bp.missions.length > 0) {
      const factions = [...new Set(bp.missions.map(m => m.faction_zh || m.faction).filter(Boolean))];
      return factions.length > 0 ? factions.join(', ') : '任务获取';
    }
    if (bp.acquisition === 'default') return '默认可用';
    return '待解锁';
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={fullScreen}
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.97) 0%, rgba(2, 8, 18, 0.99) 100%)',
          border: '1px solid rgba(201, 162, 39, 0.2)',
          borderRadius: '8px',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
        pb: 1.5, gap: 2,
      }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
            color: '#c9a227', fontWeight: 700, fontSize: '1.05rem', lineHeight: 1.2,
          }}>
            {blueprint.name_zh || blueprint.name}
          </Typography>
          {blueprint.name_zh && (
            <Typography sx={{ fontFamily: '"Rajdhani",sans-serif', color: 'rgba(201,162,39,0.35)', fontSize: '0.75rem', mt: 0.25 }}>
              {blueprint.name}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip
              label={TYPE_LABELS[blueprint.type] || blueprint.type}
              size="small"
              sx={{
                fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                fontSize: '0.7rem', height: 22,
                background: `${typeColor}15`,
                border: `1px solid ${typeColor}33`,
                color: typeColor,
              }}
            />
            {blueprint.grade && (
              <Chip
                label={`Lv.${blueprint.grade}`}
                size="small"
                sx={{
                  fontFamily: '"Orbitron",sans-serif',
                  fontSize: '0.65rem', height: 22,
                  background: 'rgba(201,162,39,0.1)',
                  border: '1px solid rgba(201,162,39,0.25)',
                  color: '#c9a227',
                }}
              />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
              <Timer sx={{ fontSize: 14, color: '#00ddaa' }} />
              <Typography sx={{
                color: '#00ddaa', fontSize: '0.8rem',
                fontFamily: '"Orbitron",sans-serif', fontWeight: 600,
              }}>
                {blueprint.craft_time_label || formatCraftTime(blueprint.craft_time)}
              </Typography>
            </Box>
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <BlueprintRecipeSection blueprint={blueprint} />

        <Divider sx={{ borderColor: 'rgba(201,162,39,0.08)', mb: 2 }} />

        <BlueprintAcquisitionSection blueprint={blueprint} getAcquisitionLabel={getAcquisitionLabel} />

        <Divider sx={{ borderColor: 'rgba(201,162,39,0.08)', mb: 2 }} />

        <BlueprintDismantleSection blueprint={blueprint} />

        {/* Wiki 链接 */}
        {blueprint.web_url && (
          <Link
            href={blueprint.web_url}
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              display: 'inline-flex', alignItems: 'center', gap: 0.5,
              fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
              fontSize: '0.78rem', color: 'rgba(201,162,39,0.6)',
              textDecoration: 'none',
              '&:hover': { color: '#c9a227' },
            }}
          >
            <OpenInNew sx={{ fontSize: 14 }} />
            查看 Wiki 页面
          </Link>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function BlueprintPanel() {
  const theme = useTheme();
  const _isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [blueprints, setBlueprints] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeType, setActiveType] = useState('all');
  const [selectedBlueprint, setSelectedBlueprint] = useState(null);
  const { history: bpSearchHistory, addToHistory: addBpHistory } = useSearchHistory('blueprint-search-history');
  const [bpHistoryOpen, setBpHistoryOpen] = useState(false);
  const bpSearchBoxRef = useRef(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/data/wiki-blueprints.json', { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const list = Object.values(data.blueprints || {});
        setBlueprints(list);
        setLoading(false);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => ctrl.abort();
  }, []);

  const types = useMemo(() => {
    const map = {};
    for (const bp of blueprints) {
      const t = bp.type || 'Unknown';
      if (!map[t]) map[t] = { key: t, count: 0 };
      map[t].count++;
    }
    return Object.values(map).sort((a, b) => b.count - a.count);
  }, [blueprints]);

  const filteredBlueprints = useMemo(() => {
    let result = blueprints;
    if (activeType !== 'all') {
      result = result.filter(bp => bp.type === activeType);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(bp =>
        (bp.name && bp.name.toLowerCase().includes(q)) ||
        (bp.name_zh && bp.name_zh.toLowerCase().includes(q)) ||
        (bp.slug && bp.slug.toLowerCase().includes(q))
      );
    }
    return result;
  }, [blueprints, activeType, searchQuery]);

  const getAcquisitionLabel = (bp) => {
    if (bp.acquisition === 'mission' && bp.missions && bp.missions.length > 0) {
      const factions = [...new Set(bp.missions.map(m => m.faction_zh || m.faction).filter(Boolean))];
      return factions.length > 0 ? factions.join(', ') : '任务获取';
    }
    if (bp.acquisition === 'default') return '默认可用';
    return '待解锁';
  };

  const handleBlueprintClick = (bp) => {
    setSelectedBlueprint(bp);
  };

  if (loading) {
    return (
      <Box sx={{
        p: { xs: 1.5, md: 2.5 },
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)',
        border: '1px solid rgba(201, 162, 39, 0.1)',
        height: '100%',
        display: 'flex', flexDirection: 'column',
        position: 'relative', overflow: 'hidden', minHeight: '100%',
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
          <CircularProgress size={28} sx={{ color: '#c9a227' }} />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{
        p: { xs: 1.5, md: 2.5 },
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)',
        border: '1px solid rgba(201, 162, 39, 0.1)',
        height: '100%',
        display: 'flex', flexDirection: 'column', minHeight: '100%',
      }}>
        <Typography sx={{ color: '#ff6666', textAlign: 'center', py: 4 }}>
          加载失败: {error}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{
      p: { xs: 1.5, md: 2.5 },
      background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)',
      border: '1px solid rgba(201, 162, 39, 0.1)',
      height: '100%',
      display: 'flex', flexDirection: 'column',
      position: 'relative', overflow: 'hidden', minHeight: '100%',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.35) 30%, rgba(201, 162, 39, 0.35) 70%, transparent 100%)',
      },
    }}>
      {/* 标题 */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))',
          border: '1px solid rgba(201, 162, 39, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
        }}>
          <Science sx={{ color: '#c9a227', fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700, fontSize: '0.95rem', color: '#c9a227',
            letterSpacing: '0.05em',
          }}>
            制造蓝图数据库
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.35)', fontSize: '0.65rem', letterSpacing: '0.03em' }}>
            搜索蓝图名称、材料需求、制造时间
          </Typography>
        </Box>
      </Box>

      {/* 搜索框 */}
      <Box ref={bpSearchBoxRef} sx={{ position: 'relative', mb: 1.5, width: '100%' }}>
        <TextField
          size="small"
          placeholder="搜索蓝图名称、中文名、slug..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onFocus={() => setBpHistoryOpen(true)}
          onBlur={() => { if (searchQuery.trim()) addBpHistory({ id: searchQuery.trim(), keyword: searchQuery.trim() }); setTimeout(() => setBpHistoryOpen(false), 150); }}
          sx={{
            width: '100%',
            '& .MuiOutlinedInput-root': {
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.8)',
              background: 'rgba(0, 10, 20, 0.5)',
              '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.2)' },
              '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.35)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
            },
          }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'rgba(201, 162, 39, 0.5)' }} /></InputAdornment>,
          }}
        />
        {bpHistoryOpen && !searchQuery && bpSearchHistory.length > 0 && (
          <Box sx={{ position: 'absolute', top: '100%', left: 0, right: 0, mt: 0.5, background: 'rgba(3,12,25,0.98)', border: '1px solid rgba(201,162,39,0.2)', borderRadius: '4px', zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.5)' }}>
            {bpSearchHistory.slice(0, 5).map(h => (
              <Box key={h.id} onClick={() => { setSearchQuery(h.keyword); setBpHistoryOpen(false); }}
                sx={{ px: 1.5, py: 0.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.03)', '&:hover': { background: 'rgba(201,162,39,0.08)' } }}>
                <HistoryIcon sx={{ fontSize: 12, color: 'rgba(201,162,39,0.3)' }} />
                <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)' }}>{h.keyword}</Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* 类型标签 */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2 }}>
        <Chip
          label={`全部 (${blueprints.length})`}
          size="small"
          onClick={() => setActiveType('all')}
          sx={{
            fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
            fontWeight: activeType === 'all' ? 700 : 500,
            fontSize: '0.8rem',
            background: activeType === 'all'
              ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))'
              : 'rgba(255,255,255,0.04)',
            border: `1px solid ${activeType === 'all' ? 'rgba(201, 162, 39, 0.35)' : 'rgba(255,255,255,0.08)'}`,
            color: activeType === 'all' ? '#c9a227' : 'rgba(255,255,255,0.5)',
            clipPath: activeType === 'all' ? 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)' : 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.2), rgba(154, 122, 26, 0.15))',
              borderColor: 'rgba(201, 162, 39, 0.4)',
            },
          }}
        />
        {types.map(t => {
          const color = TYPE_COLORS[t.key] || '#c9a227';
          return (
            <Chip
              key={t.key}
              label={`${TYPE_LABELS[t.key] || t.key} (${t.count})`}
              size="small"
              onClick={() => setActiveType(activeType === t.key ? 'all' : t.key)}
              sx={{
                fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                fontWeight: activeType === t.key ? 700 : 500,
                fontSize: '0.8rem',
                background: activeType === t.key ? `${color}20` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeType === t.key ? `${color}55` : 'rgba(255,255,255,0.08)'}`,
                color: activeType === t.key ? color : 'rgba(255,255,255,0.5)',
                '&:hover': {
                  background: `${color}25`,
                  borderColor: `${color}66`,
                },
              }}
            />
          );
        })}
      </Box>

      {/* 统计信息 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
        <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem', fontFamily: '"Rajdhani", sans-serif' }}>
          共 {filteredBlueprints.length} 个蓝图
        </Typography>
      </Box>

      {/* 蓝图列表 - 全宽 */}
      <Box sx={{
        flex: 1,
        overflow: 'auto',
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
        gap: 1.5,
        alignContent: 'start',
      }}>
        {filteredBlueprints.length === 0 ? (
          <Box sx={{ gridColumn: '1 / -1', textAlign: 'center', py: 6 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem', fontFamily: '"Rajdhani","Noto Sans SC",sans-serif' }}>
              未找到匹配的蓝图
            </Typography>
          </Box>
        ) : (
          filteredBlueprints.map(bp => (
            <BlueprintCard
              key={bp.uuid}
              blueprint={bp}
              onClick={handleBlueprintClick}
              getAcquisitionLabel={getAcquisitionLabel}
            />
          ))
        )}
      </Box>

      {/* 详情 Dialog */}
      <BlueprintDetailDialog
        open={!!selectedBlueprint}
        onClose={() => setSelectedBlueprint(null)}
        blueprint={selectedBlueprint}
      />
    </Box>
  );
}
