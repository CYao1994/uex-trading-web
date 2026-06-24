// ItemDetailDialog.jsx — 优化版物品详情弹窗
// 参照 FSD-item-finder，添加位置树视图和价格渐变
import { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, IconButton, Chip, CircularProgress, Tabs, Tab, Divider } from '@mui/material';
import { Close, TrendingUp, TrendingDown, AccountTree, List } from '@mui/icons-material';
import { getPriceColor } from '../utils/format';
import { useSfx } from '../hooks/useSfx';

// 从物品属性中提取尺寸
function extractSizeFromAttrs(item, attrs) {
  if (item?.size) return item.size;
  if (!attrs) return null;
  for (const attr of attrs) {
    const name = (attr.attribute_name_zh || attr.attribute_name || '').toLowerCase();
    if (name === '尺寸' || name === 'size') {
      const val = String(attr.value || '').trim();
      if (val) return val;
    }
  }
  return null;
}

// 构建位置树 - 星系/星球/站点/终端层级
function buildLocationTree(prices) {
  const tree = {};

  for (const p of prices) {
    if (!p.price_buy) continue;

    const system = p.star_system_name_zh || p.star_system_name || '未知星系';
    const planet = p.planet_name_zh || p.planet_name || '';
    
    // 确定显示的地点名称（优先级：空间站中文 > 城市中文 > 前哨站中文 > 终端中文）
    const locationName = p.space_station_name_zh 
      || p.city_name_zh 
      || p.outpost_name_zh 
      || p.terminal_name_zh
      || p.space_station_name
      || p.city_name
      || p.outpost_name
      || p.terminal_name
      || '未知地点';

    if (!tree[system]) tree[system] = {};
    if (planet) {
      if (!tree[system][planet]) tree[system][planet] = [];
      tree[system][planet].push({ ...p, locationName });
    } else {
      if (!tree[system]['_direct']) tree[system]['_direct'] = [];
      tree[system]['_direct'].push({ ...p, locationName });
    }
  }

  return tree;
}

// 位置树组件
function LocationTree({ prices, accentColor: _accentColor, priceRange }) {
  const tree = useMemo(() => buildLocationTree(prices), [prices]);

  return (
    <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
      {Object.entries(tree).map(([system, planets]) => (
        <Box key={system} sx={{ mb: 1.5 }}>
          {/* 星系 */}
          <Typography sx={{
            color: '#c9a227',
            fontSize: '0.8rem',
            fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
            fontWeight: 600,
            mb: 0.5,
            pl: 1,
          }}>
            ▸ {system}
          </Typography>

          {Object.entries(planets).map(([planet, locations]) => (
            <Box key={planet} sx={{ ml: 2, mb: 0.5 }}>
              {/* 星球 */}
              {planet !== '_direct' && (
                <Typography sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.75rem',
                  fontFamily: '"Noto Sans SC",sans-serif',
                  mb: 0.25,
                  pl: 1,
                }}>
                  ▸ {planet}
                </Typography>
              )}

              {/* 地点列表 */}
              {locations.map((loc, i) => {
                const priceColor = getPriceColor(loc.price_buy, priceRange.min, priceRange.max);
                return (
                  <Box
                    key={i}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 0.5,
                      px: 1,
                      ml: planet !== '_direct' ? 2 : 0,
                      background: 'rgba(0, 10, 20, 0.3)',
                      border: '1px solid rgba(201, 162, 39, 0.05)',
                      clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                      mb: 0.5,
                      '&:hover': { background: 'rgba(0, 10, 20, 0.5)', border: '1px solid rgba(201, 162, 39, 0.15)' },
                    }}
                  >
                    <Typography sx={{
                      color: 'rgba(255,255,255,0.7)',
                      fontSize: '0.75rem',
                      fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                    }}>
                      {loc.locationName}
                    </Typography>
                    <Typography sx={{
                      color: priceColor,
                      fontSize: '0.8rem',
                      fontFamily: '"Orbitron",sans-serif',
                      fontWeight: 500,
                    }}>
                      {loc.price_buy?.toLocaleString()} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>aUEC</span>
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          ))}
        </Box>
      ))}
    </Box>
  );
}

function ItemDetailDialog({ item, prices, pricesLoading, attrs, attributeDefs, shopData, open, onClose, accentColor, wikiItems = {}, wikiWeapons = [] }) {
  const [tabValue, setTabValue] = useState(0);
  const sfx = useSfx();

  useEffect(() => {
    if (open) sfx('detail_open');
  }, [open, sfx]);

  const displaySize = extractSizeFromAttrs(item, attrs);

  // Find matching wiki item by slug or exact name
  const wikiItem = useMemo(() => {
    if (!item) return null;
    const slug = (item.slug || '').toLowerCase();
    const name = item.name;
    // Search wiki items (object keyed by slug)
    for (const [_key, wi] of Object.entries(wikiItems)) {
      if (slug && wi.slug && wi.slug.toLowerCase() === slug) return wi;
    }
    for (const [_key, wi] of Object.entries(wikiItems)) {
      if (name && wi.name === name) return wi;
    }
    return null;
  }, [item, wikiItems]);

  // Find matching wiki weapon for weapon items
  const wikiWeapon = useMemo(() => {
    if (!item || !wikiWeapons?.length) return null;
    const slug = (item.slug || '').toLowerCase();
    const name = item.name;
    for (const w of wikiWeapons) {
      if (slug && w.slug && w.slug.toLowerCase() === slug) return w;
    }
    for (const w of wikiWeapons) {
      if (name && w.name === name) return w;
    }
    return null;
  }, [item, wikiWeapons]);

  // 构建 attributeDef lookup
  const defMap = useMemo(() => {
    const map = new Map();
    for (const def of (attributeDefs || [])) {
      map.set(def.name, def);
    }
    return map;
  }, [attributeDefs]);

  // 排序价格
  const sortedPrices = useMemo(() => {
    return [...(prices || [])].sort((a, b) => {
      const pa = a.price_buy ?? Infinity;
      const pb = b.price_buy ?? Infinity;
      return pa - pb;
    });
  }, [prices]);

  // 计算价格范围
  const priceRange = useMemo(() => {
    const priceValues = sortedPrices
      .filter(p => p.price_buy && p.price_buy > 0)
      .map(p => p.price_buy);
    if (priceValues.length === 0) return { min: 0, max: 0 };
    return { min: Math.min(...priceValues), max: Math.max(...priceValues) };
  }, [sortedPrices]);

  if (!item) return null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.95) 0%, rgba(2, 8, 18, 0.98) 100%)',
          border: '1px solid rgba(201, 162, 39, 0.15)',
          clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.4) 30%, rgba(201, 162, 39, 0.4) 70%, transparent 100%)',
          },
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
        pb: 1,
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))',
            border: '1px solid rgba(201, 162, 39, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
          }}>
            <Typography sx={{ color: '#c9a227', fontSize: '0.9rem', fontFamily: '"Orbitron",sans-serif' }}>
              {item.name_zh ? item.name_zh.charAt(0) : item.name.charAt(0)}
            </Typography>
          </Box>
          <Box>
            <Typography sx={{ fontFamily: '"Noto Sans SC","Orbitron",sans-serif', color: '#c9a227', fontWeight: 600, fontSize: '1rem' }}>
              {item.name_zh || item.name}
            </Typography>
          {item.name_zh && (
            <Typography sx={{ fontFamily: '"Rajdhani",sans-serif', color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', mt: 0.15 }}>
              {item.name}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap', mt: 0.25 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>
              {item.category_zh}{item.item_type_zh ? ` · ${item.item_type_zh}` : ''}{displaySize ? ` · S${displaySize}` : ''} · {item.company_name_zh || item.company_name}
            </Typography>
            {item.item_class_zh && (
              <Chip label={item.item_class_zh} size="small" sx={{
                fontFamily: '"Noto Sans SC",sans-serif', fontSize: '0.6rem', height: 18,
                background: `${item.item_class_zh === '军用' ? '#ff4444' : item.item_class_zh === '民用' ? '#44aaff' : item.item_class_zh === '工业' ? '#ffaa00' : item.item_class_zh === '竞赛' ? '#aa66ff' : '#66ddaa'}15`,
                border: `1px solid ${item.item_class_zh === '军用' ? '#ff4444' : item.item_class_zh === '民用' ? '#44aaff' : item.item_class_zh === '工业' ? '#ffaa00' : item.item_class_zh === '竞赛' ? '#aa66ff' : '#66ddaa'}33`,
                color: item.item_class_zh === '军用' ? '#ff4444' : item.item_class_zh === '民用' ? '#44aaff' : item.item_class_zh === '工业' ? '#ffaa00' : item.item_class_zh === '竞赛' ? '#aa66ff' : '#66ddaa',
              }} />
            )}
            {item.grade && (
              <Chip label={`${item.grade}级`} size="small" sx={{
                fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontSize: '0.55rem', height: 18,
                background: `${item.grade === 'A' ? '#00ddaa' : item.grade === 'B' ? '#44aaff' : item.grade === 'C' ? '#ffaa00' : '#ff6644'}15`,
                border: `1px solid ${item.grade === 'A' ? '#00ddaa' : item.grade === 'B' ? '#44aaff' : item.grade === 'C' ? '#ffaa00' : '#ff6644'}33`,
                color: item.grade === 'A' ? '#00ddaa' : item.grade === 'B' ? '#44aaff' : item.grade === 'C' ? '#ffaa00' : '#ff6644',
              }} />
            )}
          </Box>
        </Box>
        </Box>
        <IconButton onClick={() => { sfx('detail_close'); onClose(); }} sx={{ color: 'rgba(255,255,255,0.5)' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Wiki 物品图片 */}
        {(wikiItem?.image_url || wikiWeapon?.image_url) && (
          <Box sx={{
            width: '100%', maxHeight: 200, mb: 2,
            borderRadius: '4px', overflow: 'hidden',
            border: `1px solid ${accentColor}22`,
            background: 'rgba(0,0,0,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Box
              component="img"
              src={wikiWeapon?.image_url || wikiItem?.image_url}
              alt={wikiWeapon?.name || wikiItem?.name}
              sx={{ maxWidth: '100%', maxHeight: 200, objectFit: 'contain' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </Box>
        )}

        {/* Wiki 物品详细数据 */}
        {wikiItem && (
          <Box sx={{ mb: 2 }}>
            <Typography sx={{ color: accentColor, fontSize: '0.75rem', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', mb: 1, letterSpacing: '0.05em', fontWeight: 600 }}>
              Wiki 数据
            </Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.75 }}>
              {[
                { label: '尺寸', value: wikiItem.size ? `S${wikiItem.size}` : '-' },
                { label: '品级', value: wikiItem.grade ? `${wikiItem.grade}级` : '-' },
                { label: '分类', value: wikiItem.class || '-' },
                { label: '厂商', value: wikiItem.manufacturer?.name || '-' },
                { label: '质量', value: wikiItem.mass ? `${wikiItem.mass} kg` : '-' },
                { label: '生命值', value: wikiItem.durability?.health || '-' },
              ].filter(s => s.value !== '-').map((stat) => (
                <Box key={stat.label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5, px: 1, background: 'rgba(0,10,20,0.3)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: '2px' }}>
                  <Typography sx={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Rajdhani","Noto Sans SC",sans-serif' }}>
                    {stat.label}
                  </Typography>
                  <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', fontWeight: 500 }}>
                    {stat.value}
                  </Typography>
                </Box>
              ))}
            </Box>

            {/* 类型特定数据 */}
            {wikiItem.resource_network?.generation && (() => {
              const gen = wikiItem.resource_network.generation;
              const entries = Object.entries(gen).filter(([, v]) => v != null && v > 0);
              if (entries.length === 0) return null;
              return (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: `${accentColor}99`, fontFamily: '"Rajdhani",sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                    生成数据
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {entries.map(([res, val]) => (
                      <Chip key={res} label={`${res === 'power' ? '电力' : res === 'coolant' ? '冷却液' : res}: ${val}`} size="small"
                        sx={{ fontFamily: '"Rajdhani","Noto Sans SC",sans-serif', fontSize: '0.7rem', background: 'rgba(0,221,170,0.08)', border: '1px solid rgba(0,221,170,0.2)', color: '#00ddaa' }} />
                    ))}
                  </Box>
                </Box>
              );
            })()}

            {wikiItem.resource_network?.usage && (() => {
              const usage = wikiItem.resource_network.usage;
              const entries = Object.entries(usage).filter(([, v]) => v && (v.min > 0 || v.max > 0));
              if (entries.length === 0) return null;
              return (
                <Box sx={{ mt: 1 }}>
                  <Typography sx={{ fontSize: '0.65rem', color: `${accentColor}99`, fontFamily: '"Rajdhani",sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                    消耗数据
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {entries.map(([res, v]) => (
                      <Chip key={res} label={`${res === 'power' ? '电力' : res === 'coolant' ? '冷却液' : res}: ${v.min === v.max ? v.min : `${v.min}~${v.max}`}`} size="small"
                        sx={{ fontFamily: '"Rajdhani","Noto Sans SC",sans-serif', fontSize: '0.7rem', background: 'rgba(255,170,0,0.08)', border: '1px solid rgba(255,170,0,0.2)', color: '#ffaa00' }} />
                    ))}
                  </Box>
                </Box>
              );
            })()}

            {/* Wiki 武器数据 */}
            {wikiWeapon && (
              <Box sx={{ mt: 1 }}>
                <Typography sx={{ fontSize: '0.65rem', color: '#ff6644', fontFamily: '"Rajdhani",sans-serif', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
                  武器数据
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 0.5 }}>
                  {wikiWeapon.rpm > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4, px: 0.75, background: 'rgba(255,102,68,0.05)', border: '1px solid rgba(255,102,68,0.1)', borderRadius: '2px' }}>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Rajdhani",sans-serif' }}>RPM</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#ff6644', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>{wikiWeapon.rpm}</Typography>
                    </Box>
                  )}
                  {wikiWeapon.speed > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4, px: 0.75, background: 'rgba(255,102,68,0.05)', border: '1px solid rgba(255,102,68,0.1)', borderRadius: '2px' }}>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Rajdhani",sans-serif' }}>弹速</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#ff6644', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>{wikiWeapon.speed} m/s</Typography>
                    </Box>
                  )}
                  {wikiWeapon.range > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4, px: 0.75, background: 'rgba(255,102,68,0.05)', border: '1px solid rgba(255,102,68,0.1)', borderRadius: '2px' }}>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Rajdhani",sans-serif' }}>射程</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#ff6644', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>{wikiWeapon.range} m</Typography>
                    </Box>
                  )}
                  {wikiWeapon.damage?.alpha > 0 && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.4, px: 0.75, background: 'rgba(255,102,68,0.05)', border: '1px solid rgba(255,102,68,0.1)', borderRadius: '2px' }}>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Rajdhani",sans-serif' }}>单发伤害</Typography>
                      <Typography sx={{ fontSize: '0.7rem', color: '#ff6644', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>{wikiWeapon.damage.alpha}</Typography>
                    </Box>
                  )}
                </Box>
                {/* DPS 分布 */}
                {wikiWeapon.damage?.dps && (
                  <Box sx={{ mt: 0.75, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {Object.entries(wikiWeapon.damage.dps).filter(([, v]) => v > 0).map(([type, val]) => (
                      <Chip key={type} size="small" label={`${type === 'physical' ? '物理' : type === 'energy' ? '能量' : type === 'distortion' ? '扭曲' : type}: ${val.toFixed(1)}`}
                        sx={{ fontSize: '0.6rem', height: 18, fontFamily: '"Rajdhani",sans-serif', background: type === 'physical' ? 'rgba(255,102,68,0.1)' : type === 'energy' ? 'rgba(68,170,255,0.1)' : 'rgba(170,102,255,0.1)', border: `1px solid ${type === 'physical' ? 'rgba(255,102,68,0.25)' : type === 'energy' ? 'rgba(68,170,255,0.25)' : 'rgba(170,102,255,0.25)'}`, color: type === 'physical' ? '#ff6644' : type === 'energy' ? '#44aaff' : '#aa66ff' }} />
                    ))}
                  </Box>
                )}
              </Box>
            )}

            <Divider sx={{ borderColor: `${accentColor}15`, mt: 1.5, mb: 0.5 }} />
          </Box>
        )}

        {/* 属性 */}
        {attrs.length > 0 && (
          <Box sx={{ mb: 2.5 }}>
            <Typography sx={{ color: `${accentColor}b3`, fontSize: '0.8rem', fontFamily: '"Orbitron",sans-serif', mb: 1, letterSpacing: '0.05em' }}>
              属性
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {attrs.map((attr, i) => {
                const def = defMap.get(attr.attribute_name);
                const isLowerBetter = def?.is_lower_better ?? null;
                let icon = null;
                let iconColor = 'rgba(255,255,255,0.2)';
                if (isLowerBetter === true) {
                  icon = <TrendingDown sx={{ fontSize: 14 }} />;
                  iconColor = '#00ddaa';
                } else if (isLowerBetter === false) {
                  icon = <TrendingUp sx={{ fontSize: 14 }} />;
                  iconColor = '#00ddaa';
                }

                return (
                  <Chip
                    key={i}
                    icon={icon}
                    label={`${attr.attribute_name_zh || attr.attribute_name}: ${attr.value}${attr.unit ? ' ' + attr.unit : ''}`}
                    size="small"
                    sx={{
                      fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                      fontSize: '0.75rem',
                      background: 'rgba(0, 10, 20, 0.5)',
                      border: '1px solid rgba(201, 162, 39, 0.15)',
                      color: 'rgba(255,255,255,0.75)',
                      clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                      '& .MuiChip-icon': { color: iconColor },
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* 价格数据 */}
        {pricesLoading ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 2 }}>
            <CircularProgress size={18} sx={{ color: accentColor }} />
            <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              价格数据加载中...
            </Typography>
          </Box>
        ) : sortedPrices.length > 0 ? (
          <Box>
            {/* 视图切换标签 */}
            <Tabs
              value={tabValue}
              onChange={(_, v) => setTabValue(v)}
              sx={{
                mb: 1.5,
                '& .MuiTab-root': {
                  minHeight: 32,
                  fontSize: '0.75rem',
                  fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                  color: 'rgba(255,255,255,0.6)',
                  '&.Mui-selected': { color: accentColor },
                },
                '& .MuiTabs-indicator': { background: accentColor },
              }}
            >
              <Tab icon={<AccountTree sx={{ fontSize: 16 }} />} iconPosition="start" label="位置视图" />
              <Tab icon={<List sx={{ fontSize: 16 }} />} iconPosition="start" label="列表视图" />
            </Tabs>

            {/* 价格统计 */}
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <Typography sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.7rem', fontFamily: '"Rajdhani", sans-serif' }}>
                共 {sortedPrices.length} 个站点
              </Typography>
              {priceRange.min > 0 && (
                <Typography sx={{ color: '#44aaff', fontSize: '0.7rem', fontFamily: '"Orbitron", sans-serif' }}>
                  最低: {priceRange.min.toLocaleString()} aUEC
                </Typography>
              )}
              {priceRange.max > 0 && priceRange.max !== priceRange.min && (
                <Typography sx={{ color: '#ff6644', fontSize: '0.7rem', fontFamily: '"Orbitron", sans-serif' }}>
                  最高: {priceRange.max.toLocaleString()} aUEC
                </Typography>
              )}
            </Box>

            {/* 视图内容 */}
            {tabValue === 0 ? (
              <LocationTree prices={sortedPrices} accentColor={accentColor} priceRange={priceRange} />
            ) : (
              <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
                {sortedPrices.map((p, i) => {
                  const isBest = i === 0 && p.price_buy != null;
                  const priceColor = getPriceColor(p.price_buy, priceRange.min, priceRange.max);
                  const locationName = p.space_station_name_zh || p.space_station_name
                    || p.city_name_zh || p.city_name
                    || p.outpost_name_zh || p.outpost_name
                    || '';
                  const planetSystem = [
                    p.planet_name_zh || p.planet_name,
                    p.star_system_name_zh || p.star_system_name
                  ].filter(Boolean).join(' · ');

                  return (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 1,
                        px: 1.5,
                        background: isBest ? 'linear-gradient(135deg, rgba(201, 162, 39, 0.08), rgba(154, 122, 26, 0.05))' : 'rgba(0, 10, 20, 0.3)',
                        border: '1px solid rgba(201, 162, 39, 0.05)',
                        borderLeft: isBest ? '3px solid rgba(201, 162, 39, 0.6)' : '3px solid transparent',
                        clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                        mb: 0.5,
                        '&:hover': { background: 'rgba(0, 10, 20, 0.5)', border: '1px solid rgba(201, 162, 39, 0.15)' },
                      }}
                    >
                      <Box>
                        <Typography sx={{
                          color: isBest ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
                          fontSize: '0.8rem',
                          fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                          fontWeight: isBest ? 600 : 400,
                        }}>
                          {locationName || '-'}
                          {isBest && (
                            <Typography component="span" sx={{ color: `${accentColor}99`, fontSize: '0.65rem', ml: 1, fontFamily: '"Rajdhani",sans-serif' }}>
                              最低
                            </Typography>
                          )}
                        </Typography>
                        <Typography sx={{
                          color: 'rgba(255,255,255,0.35)',
                          fontSize: '0.65rem',
                          fontFamily: '"Noto Sans SC",sans-serif',
                        }}>
                          {planetSystem || '-'}
                        </Typography>
                      </Box>
                      <Typography sx={{
                        color: priceColor,
                        fontSize: '0.85rem',
                        fontFamily: '"Orbitron",sans-serif',
                        fontWeight: isBest ? 700 : 400,
                      }}>
                        {p.price_buy ? `${p.price_buy.toLocaleString()} aUEC` : '-'}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        ) : (
          <Typography sx={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem', fontStyle: 'italic' }}>
            暂无价格数据
          </Typography>
        )}

        {/* 解包商店数据（补充来源） */}
        {shopData && shopData.length > 0 && (
          <Box sx={{ mt: 2, borderTop: '1px solid rgba(201,162,39,0.08)', pt: 2 }}>
            <Typography sx={{
              fontSize: '0.75rem', fontWeight: 600, color: '#00ddaa',
              fontFamily: '"Orbitron",sans-serif', mb: 1, letterSpacing: '0.05em',
            }}>
              游戏商店数据
              <Typography component="span" sx={{ fontSize: '0.55rem', color: 'rgba(0,221,170,0.4)', ml: 1, fontFamily: '"Rajdhani",sans-serif' }}>
                来源: 解包文件
              </Typography>
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {[...new Set(shopData.map(s => s.location))].map(location => {
                const items = shopData.filter(s => s.location === location);
                const bestBuy = Math.min(...items.map(i => i.buy_price).filter(p => p > 0));
                return (
                  <Box key={location} sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    py: 0.5, px: 1, background: 'rgba(0,221,170,0.04)', borderRadius: '2px',
                  }}>
                    <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', fontFamily: '"Noto Sans SC",sans-serif' }}>
                      {location}
                    </Typography>
                    <Typography sx={{ fontSize: '0.75rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                      {bestBuy > 0 ? `${bestBuy.toLocaleString()} aUEC` : '-'}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </Box>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default ItemDetailDialog;
