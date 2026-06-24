import { Box, Typography, Chip } from '@mui/material';

function BlueprintAcquisitionSection({ blueprint, getAcquisitionLabel }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Typography sx={{
        color: '#c9a227', fontSize: '0.75rem',
        fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
        fontWeight: 600, mb: 1, letterSpacing: '0.05em',
      }}>
        获取途径
      </Typography>
      <Typography sx={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.8)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
        {getAcquisitionLabel(blueprint)}
      </Typography>
      {blueprint.missions && blueprint.missions.length > 0 && (
        <Box sx={{ mt: 0.75, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {blueprint.missions.map((m, i) => (
            <Chip
              key={i}
              label={`${m.mission_title_zh || m.mission_title}${m.illegal ? ' (非法)' : ''}`}
              size="small"
              sx={{
                fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
                fontSize: '0.65rem', height: 20,
                background: m.illegal ? 'rgba(255,68,102,0.1)' : 'rgba(68,187,255,0.1)',
                border: `1px solid ${m.illegal ? 'rgba(255,68,102,0.25)' : 'rgba(68,187,255,0.25)'}`,
                color: m.illegal ? '#ff4466' : '#44bbff',
              }}
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

export default BlueprintAcquisitionSection;
