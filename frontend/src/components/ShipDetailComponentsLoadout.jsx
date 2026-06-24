import { Box, Typography } from '@mui/material';
import { Tune } from '@mui/icons-material';

const PORT_LABEL_ZH = {
  Controllers: '控制器', WeaponGun: '武器', Cooler: '冷却器',
  PowerPlant: '发电机', Radar: '雷达', QuantumDrive: '量子驱动',
  Shield: '护盾', 'Missile & Bomb Racks': '导弹与炸弹架',
  'Counter Measures': '干扰弹', Weapons: '武器', Missiles: '导弹',
  Components: '组件', Turrets: '炮塔',
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

function ShipDetailComponentsLoadout({ componentGroups, getItemZh }) {
  if (Object.keys(componentGroups).length === 0) return null;

  return (
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
  );
}

export default ShipDetailComponentsLoadout;
