import { Box, Typography, Chip } from '@mui/material';
import { Timer } from '@mui/icons-material';

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

function BlueprintCard({ blueprint, onClick, getAcquisitionLabel }) {
  const bp = blueprint;
  const typeColor = TYPE_COLORS[bp.type] || '#c9a227';

  return (
    <Box
      onClick={() => onClick(bp)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(bp); } }}
      tabIndex={0}
      role="button"
      aria-label={`查看${bp.name_zh || bp.name}蓝图详情`}
      sx={{
        p: 1.5,
        minHeight: 130,
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.9) 0%, rgba(2, 8, 18, 0.95) 100%)',
        border: '1px solid rgba(201, 162, 39, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${typeColor}40 50%, transparent 100%)`,
        },
        '&:hover': {
          background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.95) 0%, rgba(3, 10, 22, 0.98) 100%)',
          border: '1px solid rgba(201, 162, 39, 0.25)',
        },
        '&:focus': {
          outline: '2px solid rgba(201, 162, 39, 0.4)',
          outlineOffset: '2px',
        },
      }}
    >
      <Chip
        label={TYPE_LABELS[bp.type] || bp.type}
        size="small"
        sx={{
          background: `${typeColor}15`,
          border: `1px solid ${typeColor}33`,
          color: typeColor,
          fontSize: '0.6rem',
          fontFamily: '"Noto Sans SC",sans-serif',
          height: 18,
        }}
      />

      <Typography sx={{
        color: 'rgba(255,255,255,0.9)',
        fontSize: '0.8rem',
        fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
        fontWeight: 600, lineHeight: 1.2, mb: 0.3,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {bp.name_zh || bp.name}
      </Typography>

      <Box sx={{ display: 'flex', gap: 1, mt: 'auto', alignItems: 'center' }}>
        {bp.grade && (
          <Chip
            label={`Lv.${bp.grade}`}
            size="small"
            sx={{
              fontFamily: '"Orbitron",sans-serif',
              fontSize: '0.55rem', height: 16,
              background: 'rgba(201,162,39,0.1)',
              border: '1px solid rgba(201,162,39,0.2)',
              color: '#c9a227',
            }}
          />
        )}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
          <Timer sx={{ fontSize: 12, color: '#00ddaa' }} />
          <Typography sx={{
            color: '#00ddaa', fontSize: '0.7rem',
            fontFamily: '"Orbitron",sans-serif', fontWeight: 600,
          }}>
            {bp.craft_time_label || formatCraftTime(bp.craft_time)}
          </Typography>
        </Box>
      </Box>

      <Typography sx={{
        color: bp.acquisition === 'default' ? '#00ddaa' : bp.acquisition === 'mission' ? '#c9a227' : 'rgba(255,255,255,0.25)',
        fontSize: '0.6rem',
        fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
        mt: 0.5,
      }}>
        {getAcquisitionLabel(bp)}
      </Typography>
    </Box>
  );
}

export default BlueprintCard;
