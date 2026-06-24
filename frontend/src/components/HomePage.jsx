// HomePage.jsx - Optimized Homepage with all modules
import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Chip, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { ShoppingCart, Link, MilitaryTech, Build, GpsFixed, SwapHoriz, Rocket, RocketLaunch, PrecisionManufacturing, DirectionsBoat, Search, Science } from '@mui/icons-material';
import HangarTimer from './HangarTimer';
import { useSfx } from '../hooks/useSfx';

const FEATURES = [
  // 交易路线
  {
    icon: <SwapHoriz sx={{ fontSize: 26 }} />,
    title: '清仓路线',
    desc: '规划最优卖出路线',
    tab: 'sell',
    color: '#c9a227',
    group: 'trade',
  },
  {
    icon: <ShoppingCart sx={{ fontSize: 26 }} />,
    title: '进货路线',
    desc: '找到最便宜的购买地点',
    tab: 'buy',
    color: '#44aaff',
    group: 'trade',
  },
  {
    icon: <Link sx={{ fontSize: 26 }} />,
    title: '链式交易',
    desc: '自动规划多段连续交易',
    tab: 'chain',
    color: '#00ddaa',
    group: 'trade',
  },
  // 数据库
  {
    icon: <DirectionsBoat sx={{ fontSize: 26 }} />,
    title: '舰船数据库',
    desc: '飞船参数、价格与出厂配置',
    tab: 'ships',
    color: '#c9a227',
    group: 'data',
  },
  {
    icon: <Build sx={{ fontSize: 26 }} />,
    title: '飞船组件',
    desc: '护盾、发电机、量子引擎',
    tab: 'ship_components',
    color: '#66bbff',
    group: 'data',
  },
  {
    icon: <GpsFixed sx={{ fontSize: 26 }} />,
    title: '飞船武器',
    desc: '火炮、导弹、炮塔数据库',
    tab: 'ship_weapons',
    color: '#ff6644',
    group: 'data',
  },
  {
    icon: <PrecisionManufacturing sx={{ fontSize: 26 }} />,
    title: '制造蓝图',
    desc: '配方、材料与获取途径',
    tab: 'blueprint',
    color: '#aa66ff',
    group: 'data',
  },
  {
    icon: <Science sx={{ fontSize: 26 }} />,
    title: '采矿指南',
    desc: '矿物属性与开采难度',
    tab: 'mining_guide',
    color: '#c9a227',
    group: 'data',
  },
  // 信息
  {
    icon: <MilitaryTech sx={{ fontSize: 26 }} />,
    title: '战争债券',
    desc: 'CCU升级包和飞船优惠',
    tab: 'warbond',
    color: '#d4760a',
    group: 'info',
  },
];

const GROUP_LABELS = {
  trade: '交易路线',
  data: '数据库',
  info: '信息',
};

const WEAPON_SECTIONS = new Set(['Vehicle Weapons']);

function HomePage({ onTabChange }) {
  const sfx = useSfx();
  const [launched, setLaunched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    setItemsLoading(true);
    fetch('/data/items-catalog.json')
      .then(r => r.ok ? r.json() : null)
      .then(catalog => {
        if (!catalog) return [];
        const catMap = {};
        (catalog.categories || []).forEach(c => { catMap[c.id] = c; });
        const items = [];
        if (catalog.items) {
          for (const [catId, catItems] of Object.entries(catalog.items)) {
            const cat = catMap[catId];
            if (!cat) continue;
            const isWeapon = WEAPON_SECTIONS.has(cat.section);
            for (const item of catItems) {
              items.push({
                ...item,
                tab: isWeapon ? 'ship_weapons' : 'ship_components',
                type_label: isWeapon ? '武器' : '组件',
              });
            }
          }
        }
        return items;
      })
      .then(items => {
        setAllItems(items);
        setItemsLoading(false);
      })
      .catch(() => setItemsLoading(false));

    fetch('https://api.uexcorp.space/2.0/vehicles')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.data) return;
        const ships = data.data
          .filter(v => v.is_spaceship === 1 && !v.is_addon)
          .map(v => ({
            id: v.id,
            name: v.name_full || v.name,
            name_zh: v.name_full || v.name,
            tab: 'ships',
            type_label: '舰船',
            slug: v.url_name,
          }));
        setAllItems(prev => [...prev, ...ships]);
      })
      .catch(() => {});

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      const lower = q.toLowerCase().trim();
      const matched = allItems.filter(item => {
        const name = (item.name || '').toLowerCase();
        const nameZh = (item.name_zh || '').toLowerCase();
        const slug = (item.slug || '').toLowerCase();
        return name.includes(lower) || nameZh.includes(lower) || slug.includes(lower);
      }).slice(0, 12);
      setSearchResults(matched);
    }, 150);
  };

  const handleResultClick = (item) => {
    setSearchQuery('');
    setSearchResults([]);
    onTabChange(item.tab);
  };
  return (
    <Box sx={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 2, md: 4 },
      px: { xs: 1, md: 2 },
    }}>
      {/* Title Section */}
      <Box sx={{
        textAlign: 'center',
        mb: { xs: 3, md: 4 },
        animation: 'fadeInUp 0.6s ease-out',
      }}>
        <Typography sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: { xs: '1.5rem', md: '2rem' },
          fontWeight: 700,
          color: '#c9a227',
          letterSpacing: '0.15em',
          textShadow: '0 0 30px rgba(201, 162, 39, 0.3)',
        }}>
          ASTRAL LANCE
        </Typography>
        <Typography sx={{
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: { xs: '0.9rem', md: '1.1rem' },
          color: 'rgba(201, 162, 39, 0.6)',
          letterSpacing: '0.3em',
          mt: 0.5,
        }}>
          星槊
        </Typography>
        <Chip
          label="LANCEOF12"
          size="small"
          sx={{
            mt: 1.5,
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '0.55rem',
            background: 'rgba(201, 162, 39, 0.08)',
            border: '1px solid rgba(201, 162, 39, 0.15)',
            color: 'rgba(201, 162, 39, 0.5)',
            letterSpacing: '0.12em',
          }}
        />
        <Typography sx={{
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.4)',
          mt: 2,
        }}>
          星际公民交易路线规划工具
        </Typography>
      </Box>

      {!launched && (
        <Box
          onClick={() => { sfx('toggle_on'); setLaunched(true); }}
          sx={{
            mt: 2,
            mb: 4,
            px: 6,
            py: 2.5,
            cursor: 'pointer',
            position: 'relative',
            background: 'rgba(201, 162, 39, 0.06)',
            border: '1px solid rgba(201, 162, 39, 0.2)',
            clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
            transition: 'all 0.3s ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '1px',
              background: 'rgba(201, 162, 39, 0.5)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: '10%',
              right: '10%',
              height: '1px',
              background: 'rgba(201, 162, 39, 0.3)',
              animation: 'pulse 3s infinite',
            },
            '&:hover': {
              background: 'rgba(201, 162, 39, 0.12)',
              border: '1px solid rgba(201, 162, 39, 0.4)',
              boxShadow: '0 0 30px rgba(201, 162, 39, 0.2)',
              transform: 'scale(1.02)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            }
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              mx: 'auto',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(201, 162, 39, 0.08)',
              border: '1px solid rgba(201, 162, 39, 0.3)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          >
            <RocketLaunch sx={{ color: '#c9a227', fontSize: 24 }} />
          </Box>
          <Typography sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#c9a227',
            letterSpacing: '0.1em',
            textAlign: 'center',
          }}>
            启动系统
          </Typography>
          <Typography sx={{
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSize: '0.65rem',
            color: 'rgba(201, 162, 39, 0.6)',
            letterSpacing: '0.2em',
            textAlign: 'center',
            mt: 0.5,
          }}>
            启动星槊系统
          </Typography>
        </Box>
      )}

      {launched && (
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, md: 3 },
          maxWidth: 1100,
          width: '100%',
          animation: 'fadeInUp 0.6s ease-out',
        }}>
          {/* Main Content - Feature Cards */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Search Box */}
            <Box ref={searchRef} sx={{ position: 'relative', mb: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="搜索物品、组件、武器、舰船..."
                value={searchQuery}
                onChange={e => handleSearch(e.target.value)}
                sx={{
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
                  endAdornment: itemsLoading ? <InputAdornment position="end"><CircularProgress size={16} sx={{ color: '#c9a227' }} /></InputAdornment> : null,
                }}
              />
              {searchResults.length > 0 && (
                <Box sx={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  zIndex: 10,
                  mt: 0.5,
                  background: 'rgba(3, 12, 25, 0.97)',
                  border: '1px solid rgba(201, 162, 39, 0.2)',
                  maxHeight: 360,
                  overflow: 'auto',
                  '&::-webkit-scrollbar': { width: 4 },
                  '&::-webkit-scrollbar-thumb': { background: 'rgba(201, 162, 39, 0.2)', borderRadius: 2 },
                }}>
                  {searchResults.map((item, idx) => (
                    <Box
                      key={`${item.tab}-${item.id || idx}`}
                      onClick={() => handleResultClick(item)}
                      sx={{
                        px: 2, py: 1,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                        transition: 'background 0.15s ease',
                        '&:hover': {
                          background: 'rgba(201, 162, 39, 0.08)',
                        },
                      }}
                    >
                      <Box sx={{
                        px: 0.75,
                        py: 0.25,
                        borderRadius: '2px',
                        background: item.tab === 'ships' ? 'rgba(201, 162, 39, 0.12)' : item.tab === 'ship_weapons' ? 'rgba(255, 102, 68, 0.12)' : 'rgba(68, 187, 255, 0.12)',
                        border: `1px solid ${item.tab === 'ships' ? 'rgba(201, 162, 39, 0.25)' : item.tab === 'ship_weapons' ? 'rgba(255, 102, 68, 0.25)' : 'rgba(68, 187, 255, 0.25)'}`,
                        flexShrink: 0,
                      }}>
                        <Typography sx={{
                          fontSize: '0.55rem',
                          fontFamily: '"Noto Sans SC", sans-serif',
                          color: item.tab === 'ships' ? '#c9a227' : item.tab === 'ship_weapons' ? '#ff6644' : '#44bbff',
                          fontWeight: 600,
                        }}>
                          {item.type_label}
                        </Typography>
                      </Box>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography sx={{
                          fontSize: '0.8rem',
                          fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
                          color: 'rgba(255,255,255,0.85)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}>
                          {item.name_zh || item.name}
                        </Typography>
                        {item.name_zh && item.name && item.name_zh !== item.name && (
                          <Typography sx={{
                            fontSize: '0.65rem',
                            fontFamily: '"Rajdhani", sans-serif',
                            color: 'rgba(255,255,255,0.5)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {item.name}
                          </Typography>
                        )}
                      </Box>
                      <Typography sx={{
                        fontSize: '0.55rem',
                        fontFamily: '"Rajdhani", sans-serif',
                        color: 'rgba(201, 162, 39, 0.35)',
                        flexShrink: 0,
                      }}>
                        {item.tab === 'ships' ? '舰船' : item.tab === 'ship_weapons' ? '武器' : '组件'}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
            {/* Group: 交易路线 */}
            <Typography sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '0.6rem',
              color: 'rgba(201, 162, 39, 0.35)',
              letterSpacing: '0.15em',
              mb: 1,
              ml: 0.5,
            }}>
              {GROUP_LABELS.trade}
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(3, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 1.2,
              mb: 2.5,
            }}>
              {FEATURES.filter(f => f.group === 'trade').map((feature, index) => (
                <FeatureCard key={feature.tab} feature={feature} index={index} onTabChange={onTabChange} sfx={sfx} />
              ))}
            </Box>

            {/* Group: 数据库 */}
            <Typography sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '0.6rem',
              color: 'rgba(201, 162, 39, 0.35)',
              letterSpacing: '0.15em',
              mb: 1,
              ml: 0.5,
            }}>
              {GROUP_LABELS.data}
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
              gap: 1.2,
              mb: 2.5,
            }}>
              {FEATURES.filter(f => f.group === 'data').map((feature, index) => (
                <FeatureCard key={feature.tab} feature={feature} index={index + 3} onTabChange={onTabChange} sfx={sfx} />
              ))}
            </Box>

            {/* Group: 信息 */}
            <Typography sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '0.6rem',
              color: 'rgba(201, 162, 39, 0.35)',
              letterSpacing: '0.15em',
              mb: 1,
              ml: 0.5,
            }}>
              {GROUP_LABELS.info}
            </Typography>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)' },
              gap: 1.2,
            }}>
              {FEATURES.filter(f => f.group === 'info').map((feature, index) => (
                <FeatureCard key={feature.tab} feature={feature} index={index + 7} onTabChange={onTabChange} sfx={sfx} />
              ))}
            </Box>
          </Box>

          {/* Right Sidebar - Hangar Timer + Fleet Link */}
          <Box sx={{
            width: { xs: '100%', lg: 280 },
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            <HangarTimer />

            {/* Fleet Link */}
            <Box
              component="a"
              href="https://robertsspaceindustries.com/en/orgs/LANCEOF12"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 1,
                px: 2,
                py: 1,
                background: 'rgba(3, 12, 25, 0.92)',
                border: '1px solid rgba(201, 162, 39, 0.1)',
                borderRadius: '4px',
                textDecoration: 'none',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'rgba(201, 162, 39, 0.08)',
                  transform: 'translateY(-1px)',
                },
              }}
            >
              <Rocket sx={{ fontSize: 14, color: '#c9a227' }} />
              <Typography sx={{
                fontFamily: '"Noto Sans SC", sans-serif',
                fontSize: '0.7rem',
                color: 'rgba(201, 162, 39, 0.6)',
              }}>
                访问舰队主页
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Footer */}
      <Typography sx={{
        mt: 4,
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '0.6rem',
        color: 'rgba(201, 162, 39, 0.2)',
      }}>
        数据来源: UEXCORP & 游戏文件 · 作者: CYao1994
      </Typography>
    </Box>
  );
}

function FeatureCard({ feature, index, onTabChange, sfx }) {
  return (
    <Box
      onClick={() => { sfx('page_transition'); onTabChange(feature.tab); }}
      onMouseEnter={() => sfx('button_hover')}
      sx={{
        p: { xs: 1.5, sm: 2 },
        background: `linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(5, 10, 20, 0.95) 100%)`,
        border: `1px solid ${feature.color}20`,
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        overflow: 'hidden',
        opacity: 0,
        animation: 'fadeInUp 0.5s ease-out forwards',
        animationDelay: `${index * 0.06}s`,
        clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent, ${feature.color}50, transparent)`,
        },
        '&:hover': {
          transform: 'translateY(-2px)',
          border: `1px solid ${feature.color}60`,
          boxShadow: `0 4px 16px ${feature.color}25`,
          '& .feature-icon': {
            transform: 'scale(1.05)',
            background: `${feature.color}15`,
            borderColor: `${feature.color}40`,
          },
        },
      }}
    >
      <Box
        className="feature-icon"
        sx={{
          width: 36,
          height: 36,
          background: 'rgba(201, 162, 39, 0.05)',
          border: '1px solid rgba(201, 162, 39, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mb: 1,
          transition: 'all 0.3s ease',
        }}
      >
        <Box sx={{ color: feature.color }}>
          {feature.icon}
        </Box>
      </Box>
      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: { xs: '0.65rem', sm: '0.7rem' },
        fontWeight: 600,
        color: feature.color,
        mb: 0.2,
        lineHeight: 1.2,
      }}>
        {feature.title}
      </Typography>
      <Typography sx={{
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: { xs: '0.6rem', sm: '0.65rem' },
        color: 'rgba(255, 255, 255, 0.3)',
        lineHeight: 1.3,
      }}>
        {feature.desc}
      </Typography>
    </Box>
  );
}

export default HomePage;
