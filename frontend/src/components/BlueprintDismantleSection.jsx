import { Box, Typography } from '@mui/material';

function BlueprintDismantleSection({ blueprint }) {
  if (!blueprint.dismantle_returns || blueprint.dismantle_returns.length === 0) return null;

  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{
        color: '#c9a227', fontSize: '0.75rem',
        fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
        fontWeight: 600, mb: 1, letterSpacing: '0.05em',
      }}>
        拆解返还
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {blueprint.dismantle_returns.map((r, i) => (
          <Box key={i} sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            py: 0.5, px: 0.75,
            background: 'rgba(0,221,170,0.04)',
            border: '1px solid rgba(0,221,170,0.1)',
            borderRadius: '3px',
          }}>
            <Typography sx={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
              {r.name_zh || r.name}
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
              {r.quantity_scu != null ? `${r.quantity_scu} SCU` : r.quantity != null ? `x${r.quantity}` : '-'}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default BlueprintDismantleSection;
