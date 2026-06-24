// Navbar.jsx - 功能：顶部导航栏 + 功能Tab切换
import { Box, Typography, Drawer, IconButton, List, ListItem, ListItemIcon, ListItemText, Tooltip, TextField, InputAdornment, Chip } from '@mui/material';
import { SwapHoriz, ShoppingCart, MilitaryTech, Link, Build, GpsFixed, Menu as MenuIcon, Close as CloseIcon, Feedback, RocketLaunch, VolumeUp, VolumeOff, PrecisionManufacturing, DirectionsBoat, Science, Search, History as HistoryIcon } from '@mui/icons-material';
import { useState, useEffect, useRef, useMemo } from 'react';
import api from '../api/client';
import { useSfx } from '../hooks/useSfx';
import soundManager from '../utils/soundManager';
import { useSearchHistory } from '../hooks/useSearchHistory';

function Navbar({ activeTab, onTabChange, onFeedbackOpen }) {
  const [version, setVersion] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sfxOn, setSfxOn] = useState(soundManager.enabled);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [searchData, setSearchData] = useState(null);
  const sfx = useSfx();
  const searchRef = useRef(null);
  const searchInputRef = useRef(null);
  const { history: globalSearchHistory, addToHistory: addGlobalHistory } = useSearchHistory('global-search-history');
  const [globalHistoryOpen, setGlobalHistoryOpen] = useState(false);

  useEffect(() => {
    api.get('/version')
      .then(res => setVersion(res.data.version || ''))
      .catch(() => {});
  }, []);

  useEffect(() => {
    Promise.all([
      fetch('/data/items-catalog.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/data/ship-prices.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/data/blueprints-catalog.json').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch('/data/shop-inventory-summary.json').then(r => r.ok ? r.json() : null).catch(() => null),
    ]).then(([items, ships, blueprints, shops]) => {
      setSearchData({ items, ships, blueprints, shops });
    });
  }, []);

  useEffect(() => {
    if (!searchOpen) return;
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [searchOpen]);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) searchInputRef.current.focus();
  }, [searchOpen]);

  const searchResults = useMemo(() => {
    if (!searchInput.trim() || !searchData) return [];
    const lower = searchInput.toLowerCase().trim();
    const results = [];
    const MAX = 20;

    if (searchData.items?.items) {
      const catMap = {};
      (searchData.items.categories || []).forEach(c => { catMap[c.id] = c; });
      for (const [catId, catItems] of Object.entries(searchData.items.items)) {
        const cat = catMap[catId];
        for (const item of catItems) {
          if (results.length >= MAX) break;
          const name = (item.name || '').toLowerCase();
          const nameZh = (item.name_zh || '').toLowerCase();
          if (name.includes(lower) || nameZh.includes(lower)) {
            results.push({ type: 'item', name: item.name_zh || item.name, sub: cat?.name_zh || '', tab: 'ship_components' });
          }
        }
        if (results.length >= MAX) break;
      }
    }

    if (searchData.ships?.ships) {
      for (const ship of Object.values(searchData.ships.ships)) {
        if (results.length >= MAX) break;
        const name = (ship.name || '').toLowerCase();
        const nameFull = (ship.name_full || '').toLowerCase();
        if (name.includes(lower) || nameFull.includes(lower)) {
          results.push({ type: 'ship', name: ship.name_full || ship.name, sub: '舰船', tab: 'ships' });
        }
      }
    }

    if (searchData.blueprints?.blueprints) {
      for (const bp of searchData.blueprints.blueprints) {
        if (results.length >= MAX) break;
        const name = (bp.name || '').toLowerCase();
        const nameZh = (bp.name_zh || '').toLowerCase();
        if (name.includes(lower) || nameZh.includes(lower)) {
          results.push({ type: 'blueprint', name: bp.name_zh || bp.name, sub: bp.category_zh || '蓝图', tab: 'blueprint' });
        }
      }
    }

    if (searchData.shops?.profiles) {
      const matchedLocs = new Set();
      for (const p of searchData.shops.profiles) {
        if (results.length >= MAX) break;
        const pName = p.name.toLowerCase();
        const pType = p.shop_type.toLowerCase();
        const pLoc = p.location.toLowerCase();
        if (pName.includes(lower) || pType.includes(lower) || pLoc.includes(lower)) {
          if (!matchedLocs.has(p.name)) {
            matchedLocs.add(p.name);
          }
        }
      }
    }

    return results;
  }, [searchInput, searchData]);

  const tabs = [
    { key: 'home', label: '首页', icon: <RocketLaunch sx={{ fontSize: 16 }} /> },
    { key: 'sell', label: '清仓', icon: <SwapHoriz sx={{ fontSize: 16 }} /> },
    { key: 'buy', label: '进货', icon: <ShoppingCart sx={{ fontSize: 16 }} /> },
    { key: 'chain', label: '链式', icon: <Link sx={{ fontSize: 16 }} /> },
    { key: 'ship_components', label: '组件', icon: <Build sx={{ fontSize: 16 }} /> },
    { key: 'ship_weapons', label: '武器', icon: <GpsFixed sx={{ fontSize: 16 }} /> },
    { key: 'blueprint', label: '蓝图', icon: <PrecisionManufacturing sx={{ fontSize: 16 }} /> },
    { key: 'ships', label: '舰船', icon: <DirectionsBoat sx={{ fontSize: 16 }} /> },
    { key: 'mining_guide', label: '采矿指南', icon: <Science sx={{ fontSize: 16 }} /> },
    { key: 'warbond', label: '战争债券', icon: <MilitaryTech sx={{ fontSize: 16 }} /> },
  ];

  const handleTabChange = (key) => {
    sfx('nav_click');
    onTabChange(key);
    setMobileOpen(false);
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, md: 3 },
        py: 1,
        background: 'linear-gradient(180deg, rgba(3, 10, 22, 0.97) 0%, rgba(2, 8, 16, 0.95) 100%)',
        borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.5) 30%, rgba(201, 162, 39, 0.5) 70%, transparent 100%)',
        },
      }}
    >
      {/* Logo + Org */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 34, height: 34,
          borderRadius: '4px',
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(201, 162, 39, 0.25)',
          overflow: 'hidden',
          boxShadow: '0 0 10px rgba(201, 162, 39, 0.1)',
        }}>
          <img
            src="https://theverse.robertsspaceindustries.com/hrrhhi4hjpy6p/logo.jpg"
            alt="LANCEOF12"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </Box>
        <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700,
              fontSize: '0.9rem',
              color: '#c9a227',
              lineHeight: 1.2,
              letterSpacing: '0.05em',
            }}
          >
            ASTRAL LANCE
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(201, 162, 39, 0.35)', fontSize: '0.55rem', letterSpacing: '0.15em', fontFamily: '"Noto Sans SC", sans-serif' }}
          >
            星槊 · LANCEOF12
          </Typography>
        </Box>
      </Box>

      {/* Desktop Tab switcher (hidden on mobile, hidden when on homepage) */}
      <Box role="tablist" aria-label="功能模块切换" sx={{
        display: { xs: 'none', md: activeTab === 'home' ? 'none' : 'flex' },
        gap: 0.5,
        background: 'rgba(0, 10, 20, 0.4)',
        border: '1px solid rgba(201, 162, 39, 0.08)',
        borderRadius: '2px',
        p: 0.3,
        position: 'relative',
      }}>
        {tabs.map(({ key, label, icon }) => {
          const isActive = activeTab === key;
          const accentColor = key === 'warbond' ? '#ffaa00' : key === 'ship_weapons' ? '#ff6644' : key === 'ship_components' ? '#44bbff' : '#c9a227';

          return (
            <Box
              key={key}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => handleTabChange(key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 0.75,
                cursor: 'pointer',
                fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                fontWeight: 600,
                fontSize: '0.82rem',
                letterSpacing: '0.03em',
                transition: 'color 0.25s, background 0.25s, transform 0.15s',
                position: 'relative',
                zIndex: 1,
                '&:active': {
                  transform: 'scale(0.97)',
                },
                ...(isActive ? {
                  color: '#020810',
                  background: key === 'warbond'
                    ? 'linear-gradient(135deg, #d4760a, #a85c08)'
                    : key === 'ship_weapons'
                      ? 'linear-gradient(135deg, #8b2500, #5c1a00)'
                      : 'linear-gradient(135deg, #c9a227, #9a7a1a)',
                  boxShadow: `0 0 12px ${accentColor}44`,
                  clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                } : {
                  color: `${accentColor}99`,
                  '&:hover': {
                    color: accentColor,
                    background: `${accentColor}0A`,
                  },
                }),
              }}
            >
              {icon}
              {label}
            </Box>
          );
        })}
      </Box>

      {/* Mobile hamburger button (visible on mobile only) */}
      <IconButton
        aria-label="打开菜单"
        onClick={() => setMobileOpen(true)}
        sx={{
          display: { xs: 'flex', md: 'none' },
          color: 'rgba(201, 162, 39, 0.6)',
          '&:hover': { color: '#c9a227', background: 'rgba(201, 162, 39, 0.08)' },
        }}
      >
        <MenuIcon />
      </IconButton>

      {/* Mobile Drawer */}
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 240,
            background: 'rgba(3, 10, 22, 0.98)',
            borderLeft: '1px solid rgba(201, 162, 39, 0.15)',
            backdropFilter: 'blur(12px)',
          },
        }}
        BackdropProps={{
          sx: {
            background: 'rgba(0, 0, 0, 0.6)',
            backdropFilter: 'blur(4px)',
          },
        }}
      >
        {/* Drawer header */}
        <Box sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 2,
          py: 1.5,
          borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
        }}>
          <Typography sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: '#c9a227',
            letterSpacing: '0.05em',
          }}>
            导航
          </Typography>
          <IconButton
            onClick={() => setMobileOpen(false)}
            sx={{ color: 'rgba(201, 162, 39, 0.5)', '&:hover': { color: '#c9a227' } }}
          >
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Drawer tab list */}
        <List sx={{ py: 1 }}>
          {tabs.map(({ key, label, icon }) => {
            const isActive = activeTab === key;
          const accentColor = key === 'warbond' ? '#d4760a' : key === 'ship_weapons' ? '#8b2500' : key === 'ship_components' ? '#44bbff' : '#c9a227';

            return (
              <ListItem
                key={key}
                onClick={() => handleTabChange(key)}
                sx={{
                  cursor: 'pointer',
                  py: 1.5,
                  px: 2,
                  borderLeft: isActive ? `3px solid ${accentColor}` : '3px solid transparent',
                  background: isActive ? `${accentColor}15` : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: isActive ? `${accentColor}15` : `${accentColor}08`,
                  },
                }}
              >
                <ListItemIcon sx={{
                  minWidth: 36,
                  color: isActive ? accentColor : `${accentColor}80`,
                }}>
                  {icon}
                </ListItemIcon>
                <ListItemText
                  primary={label}
                  primaryTypographyProps={{
                    sx: {
                      fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                      fontWeight: isActive ? 700 : 500,
                      fontSize: '0.9rem',
                      color: isActive ? accentColor : `${accentColor}99`,
                      letterSpacing: '0.02em',
                    },
                  }}
                />
              </ListItem>
            );
          })}
        </List>
        {/* Feedback item in mobile Drawer */}
        <Box sx={{ borderTop: '1px solid rgba(201, 162, 39, 0.08)', mt: 1, pt: 1 }}>
          <ListItem
            onClick={() => { setMobileOpen(false); onFeedbackOpen?.(); }}
            sx={{
              cursor: 'pointer',
              py: 1.5,
              px: 2,
              minHeight: 44,
              transition: 'all 0.2s',
              '&:hover': {
                background: 'rgba(201, 162, 39, 0.08)',
              },
            }}
          >
            <ListItemIcon sx={{
              minWidth: 36,
              color: 'rgba(201, 162, 39, 0.6)',
            }}>
              <Feedback sx={{ fontSize: 16 }} />
            </ListItemIcon>
            <ListItemText
              primary="反馈"
              primaryTypographyProps={{
                sx: {
                  fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                  fontWeight: 500,
                  fontSize: '0.9rem',
                  color: 'rgba(201, 162, 39, 0.7)',
                  letterSpacing: '0.02em',
                },
              }}
            />
          </ListItem>
        </Box>
      </Drawer>

      {/* Status + Author (desktop) */}
      <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1.5 }}>
        <Box ref={searchRef} sx={{ position: 'relative' }}>
          <Tooltip title="全局搜索 (Ctrl+K)">
            <IconButton onClick={() => setSearchOpen(!searchOpen)} sx={{ color: searchOpen ? '#c9a227' : 'rgba(201, 162, 39, 0.5)', '&:hover': { color: '#c9a227' } }}>
              <Search sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
          {searchOpen && (
            <Box sx={{
              position: 'absolute',
              top: '100%',
              right: 0,
              width: 420,
              mt: 1,
              background: 'rgba(3, 12, 25, 0.98)',
              border: '1px solid rgba(201, 162, 39, 0.2)',
              borderRadius: '2px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 2000,
              animation: 'fadeInUp 0.2s ease-out',
            }}>
              <Box sx={{ p: 1.5, borderBottom: '1px solid rgba(201, 162, 39, 0.1)' }}>
                <TextField
                  inputRef={searchInputRef}
                  size="small"
                  fullWidth
                  placeholder="搜索物品、舰船、蓝图、商店..."
                  value={searchInput}
                  onChange={e => setSearchInput(e.target.value)}
                  onFocus={() => setGlobalHistoryOpen(true)}
                  onBlur={() => { if (searchInput.trim()) addGlobalHistory({ id: searchInput.trim(), keyword: searchInput.trim() }); setTimeout(() => setGlobalHistoryOpen(false), 150); }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                      fontSize: '0.82rem',
                      color: 'rgba(255,255,255,0.8)',
                      background: 'rgba(0, 10, 20, 0.5)',
                      '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.2)' },
                      '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.35)' },
                      '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
                    },
                  }}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 16, color: 'rgba(201, 162, 39, 0.4)' }} /></InputAdornment>,
                  }}
                />
              </Box>
              {globalHistoryOpen && !searchInput && globalSearchHistory.length > 0 && (
                <Box sx={{ maxHeight: 180, overflowY: 'auto' }}>
                  {globalSearchHistory.slice(0, 5).map(h => (
                    <Box key={h.id} onClick={() => { setSearchInput(h.keyword); setGlobalHistoryOpen(false); searchInputRef.current?.focus(); }}
                      sx={{ px: 1.5, py: 0.75, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s', '&:hover': { background: 'rgba(201, 162, 39, 0.08)' } }}>
                      <HistoryIcon sx={{ fontSize: 12, color: 'rgba(201, 162, 39, 0.3)' }} />
                      <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif' }}>{h.keyword}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
              <Box sx={{ maxHeight: 360, overflowY: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { background: 'rgba(201, 162, 39, 0.15)', borderRadius: 2 } }}>
                {searchResults.length > 0 ? (
                  (() => {
                    const grouped = {};
                    const typeLabels = { item: '组件/武器', ship: '舰船', blueprint: '蓝图', shop: '商店' };
                    const typeColors = { item: '#44bbff', ship: '#c9a227', blueprint: '#aa66ff', shop: '#00cc88' };
                    searchResults.forEach(r => {
                      if (!grouped[r.type]) grouped[r.type] = [];
                      grouped[r.type].push(r);
                    });
                    return Object.entries(grouped).map(([type, items]) => (
                      <Box key={type}>
                        <Box sx={{ px: 1.5, py: 0.5, background: 'rgba(201, 162, 39, 0.04)' }}>
                          <Typography sx={{ fontSize: '0.6rem', fontFamily: '"Orbitron", sans-serif', color: typeColors[type] || '#c9a227', letterSpacing: '0.1em', fontWeight: 600 }}>
                            {typeLabels[type] || type}
                          </Typography>
                        </Box>
                        {items.map((r, i) => (
                          <Box
                            key={`${type}-${i}`}
                            onClick={() => { onTabChange(r.tab); setSearchOpen(false); setSearchInput(''); }}
                            sx={{
                              px: 1.5, py: 0.75,
                              cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 1,
                              borderBottom: '1px solid rgba(255,255,255,0.03)',
                              transition: 'background 0.15s',
                              '&:hover': { background: 'rgba(201, 162, 39, 0.08)' },
                            }}
                          >
                            <Chip label={typeLabels[type]} size="small" sx={{
                              height: 16, fontSize: '0.5rem', background: `${typeColors[type]}15`,
                              color: typeColors[type], border: `1px solid ${typeColors[type]}30`,
                              '& .MuiChip-label': { px: 0.5 },
                            }} />
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)', fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {r.name}
                              </Typography>
                              <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Rajdhani", sans-serif' }}>
                                {r.sub}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    ));
                  })()
                ) : searchInput.trim() ? (
                  <Box sx={{ py: 3, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(201, 162, 39, 0.3)', fontFamily: '"Noto Sans SC", sans-serif' }}>
                      无搜索结果
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ py: 2, textAlign: 'center' }}>
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.25)', fontFamily: '"Noto Sans SC", sans-serif' }}>
                      输入关键词搜索物品、舰船、蓝图或商店
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Box>
        <Tooltip title={sfxOn ? '关闭音效' : '开启音效'}>
          <IconButton aria-label={sfxOn ? '关闭音效' : '开启音效'} onClick={() => { const next = soundManager.toggle(); setSfxOn(next); if (next) sfx('toggle_on'); }} sx={{ color: sfxOn ? '#c9a227' : 'rgba(255,255,255,0.3)' }}>
            {sfxOn ? <VolumeUp sx={{ fontSize: 18 }} /> : <VolumeOff sx={{ fontSize: 18 }} />}
          </IconButton>
        </Tooltip>
        <IconButton aria-label="反馈建议" onClick={onFeedbackOpen} sx={{ color: 'rgba(201, 162, 39, 0.5)', '&:hover': { color: '#c9a227' } }}>
          <Feedback sx={{ fontSize: 18 }} />
        </IconButton>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{
            width: 5, height: 5, borderRadius: '50%',
            backgroundColor: '#00ff88',
            boxShadow: '0 0 6px #00ff88',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.4)', fontSize: '0.65rem', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.08em' }}>
            UEX 在线
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(201, 162, 39, 0.3)',
            fontSize: '0.6rem',
            fontFamily: '"Orbitron", sans-serif',
            letterSpacing: '0.06em',
            borderLeft: '1px solid rgba(201, 162, 39, 0.1)',
            pl: 1.25,
          }}
        >
          作者 CYao1994
        </Typography>
        {version && (
          <Typography
            variant="caption"
            onClick={() => {}}
            sx={{
              color: 'rgba(201, 162, 39, 0.3)',
              fontSize: '0.55rem',
              fontFamily: '"Orbitron", sans-serif',
              letterSpacing: '0.05em',
              borderLeft: '1px solid rgba(201, 162, 39, 0.08)',
              pl: 1.25,
              cursor: 'pointer',
              transition: 'color 0.2s',
              '&:hover': {
                color: '#c9a227',
              },
            }}
          >
            v{version}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default Navbar;
