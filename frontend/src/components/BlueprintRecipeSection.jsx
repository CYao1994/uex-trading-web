import { Box, Typography, Chip } from '@mui/material';
import { ArrowForward, Timer } from '@mui/icons-material';

const TYPE_COLORS = {
  WeaponGun: '#ff6644', Cooler: '#00ddaa', PowerPlant: '#ffaa00',
  QuantumDrive: '#aa66ff', Shield: '#44bbff', Radar: '#77bbff',
  MiningLaser: '#ff6644', TractorBeam: '#66ddff', Salvage: '#cc88aa',
  Ammo: '#ff8844', Char_Armor_Helmet: '#88aacc', Char_Armor_Torso: '#88aacc',
  Char_Armor_Arms: '#88aacc', Char_Armor_Legs: '#88aacc',
  Char_Armor_Backpack: '#88aacc', Char_Armor_Undersuit: '#88aacc',
  WeaponPersonal: '#ff8866', WeaponAttachment: '#ff9966', WeaponMining: '#ff6644',
  DockingCollar: '#aacc44', SalvageModifier: '#cc88aa', SalvageHead: '#cc88aa',
  Misc: '#999999',
};

const TYPE_LABELS = {
  WeaponGun: '舰船武器', Cooler: '冷却器', PowerPlant: '发电机',
  QuantumDrive: '量子驱动', Shield: '护盾', Radar: '雷达',
  MiningLaser: '采矿激光', TractorBeam: '牵引光束', Salvage: '打捞',
  Ammo: '弹药', Char_Armor_Helmet: '头盔', Char_Armor_Torso: '胸甲',
  Char_Armor_Arms: '臂甲', Char_Armor_Legs: '腿甲',
  Char_Armor_Backpack: '背包', Char_Armor_Undersuit: '基底服',
  WeaponPersonal: '个人武器', WeaponAttachment: '武器附件',
  WeaponMining: '采矿激光器', DockingCollar: '对接环',
  SalvageModifier: '打捞模块', SalvageHead: '打捞头', Misc: '其他',
};

function formatCraftTime(seconds) {
  if (!seconds || seconds <= 0) return '0秒';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return m > 0 ? `${h}时 ${m}分` : `${h}时`;
  if (m > 0) return s > 0 ? `${m}分 ${s}秒` : `${m}分`;
  return `${s}秒`;
}

function BlueprintRecipeSection({ blueprint }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{
        color: '#c9a227', fontSize: '0.8rem',
        fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
        fontWeight: 600, mb: 1.5, letterSpacing: '0.05em',
      }}>
        制造配方
      </Typography>

      <Box sx={{
        display: 'flex', alignItems: 'stretch', gap: 1.5,
        p: 1.5,
        background: 'rgba(0, 10, 20, 0.4)',
        border: '1px solid rgba(201, 162, 39, 0.1)',
        borderRadius: '4px',
      }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{
            fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)',
            fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
            mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            所需材料
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {(blueprint.ingredients || []).map((ing, i) => {
              const qty = ing.quantity_scu != null ? `${ing.quantity_scu} SCU` : `x${ing.quantity}`;
              const kindColor = ing.kind === 'resource' ? '#ffaa00' : '#44bbff';
              const kindLabel = ing.kind === 'resource' ? '矿物' : '组件';
              return (
                <Box key={i} sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  py: 0.5, px: 0.75,
                  background: 'rgba(201,162,39,0.04)',
                  border: '1px solid rgba(201,162,39,0.08)',
                  borderRadius: '3px',
                }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography sx={{
                        fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)',
                        fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {ing.name_zh || ing.name}
                      </Typography>
                      <Chip
                        label={kindLabel}
                        size="small"
                        sx={{
                          height: 14, fontSize: '0.5rem',
                          fontFamily: '"Noto Sans SC",sans-serif',
                          background: `${kindColor}15`,
                          border: `1px solid ${kindColor}33`,
                          color: kindColor,
                        }}
                      />
                    </Box>
                    {ing.name_zh && ing.name && (
                      <Typography sx={{
                        fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)',
                        fontFamily: '"Rajdhani",sans-serif', mt: 0.1,
                      }}>
                        {ing.name}
                      </Typography>
                    )}
                    {ing.slot && (
                      <Typography sx={{
                        fontSize: '0.5rem', color: 'rgba(201,162,39,0.4)',
                        fontFamily: '"Rajdhani",sans-serif', mt: 0.05,
                      }}>
                        {ing.slot}
                      </Typography>
                    )}
                  </Box>
                  <Typography sx={{
                    fontSize: '0.7rem', color: '#c9a227',
                    fontFamily: '"Orbitron",sans-serif', fontWeight: 600, flexShrink: 0, ml: 1,
                  }}>
                    {qty}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minWidth: 60, gap: 0.5 }}>
          <ArrowForward sx={{ color: '#c9a227', fontSize: 24 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
            <Timer sx={{ fontSize: 10, color: '#00ddaa' }} />
            <Typography sx={{ fontSize: '0.6rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
              {blueprint.craft_time_label || formatCraftTime(blueprint.craft_time)}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ flex: '0 0 160px', minWidth: 0 }}>
          <Typography sx={{
            fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)',
            fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
            mb: 1, textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            产出
          </Typography>
          <Box sx={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            py: 2, px: 1.5,
            background: 'rgba(0,221,170,0.06)',
            border: '1px solid rgba(0,221,170,0.15)',
            borderRadius: '4px', minHeight: 80,
          }}>
            <Typography sx={{
              fontSize: '0.8rem', color: '#00ddaa',
              fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
              fontWeight: 600, textAlign: 'center', lineHeight: 1.3,
            }}>
              {blueprint.yield?.name || blueprint.name_zh || blueprint.name}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap', justifyContent: 'center' }}>
              {blueprint.yield?.type && (
                <Chip
                  label={TYPE_LABELS[blueprint.yield.type] || blueprint.yield.type}
                  size="small"
                  sx={{
                    height: 16, fontSize: '0.5rem',
                    fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
                    background: `${TYPE_COLORS[blueprint.yield.type] || '#c9a227'}15`,
                    border: `1px solid ${TYPE_COLORS[blueprint.yield.type] || '#c9a227'}33`,
                    color: TYPE_COLORS[blueprint.yield.type] || '#c9a227',
                  }}
                />
              )}
              {blueprint.yield?.grade && (
                <Chip
                  label={`Lv.${blueprint.yield.grade}`}
                  size="small"
                  sx={{
                    height: 16, fontSize: '0.5rem',
                    fontFamily: '"Orbitron",sans-serif',
                    background: 'rgba(201,162,39,0.1)',
                    border: '1px solid rgba(201,162,39,0.2)',
                    color: '#c9a227',
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default BlueprintRecipeSection;
