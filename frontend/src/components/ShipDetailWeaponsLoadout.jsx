import { Box, Typography } from '@mui/material';
import { Extension } from '@mui/icons-material';

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

function ShipDetailWeaponsLoadout({ weaponMounts, turretsList, missileRacks, getItemZh }) {
  const pilotWeapons = weaponMounts.filter(w => !w.port_name?.includes('turret'));
  const turretWeapons = weaponMounts.filter(w => w.port_name?.includes('turret'));

  if (pilotWeapons.length === 0 && turretWeapons.length === 0 && turretsList.length === 0 && missileRacks.length === 0) {
    return null;
  }

  return (
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
  );
}

export default ShipDetailWeaponsLoadout;
