import { Box, Typography, Chip, Divider } from '@mui/material';

function WikiDataSection({ wikiItem, wikiWeapon, accentColor }) {
  return (
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
  );
}

export default WikiDataSection;
