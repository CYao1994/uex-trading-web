import { Box, Typography, CircularProgress } from '@mui/material';
import { RocketLaunch } from '@mui/icons-material';

function LoadingOverlay({ message = '量子跃迁中...' }) {
  return (
    <Box sx={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(6, 10, 19, 0.85)',
      backdropFilter: 'blur(5px)',
      zIndex: 9999,
    }}>
      {/* Quantum jump effect */}
      <Box sx={{ position: 'relative', width: 120, height: 120, mb: 3 }}>
        {/* Outer ring */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          borderRadius: '50%',
          border: '2px solid rgba(0, 212, 255, 0.3)',
          animation: 'quantumPulse 2s ease-in-out infinite',
          '@keyframes quantumPulse': {
            '0%': { transform: 'scale(0.8)', opacity: 0.5 },
            '50%': { transform: 'scale(1.1)', opacity: 1 },
            '100%': { transform: 'scale(0.8)', opacity: 0.5 },
          },
        }} />
        {/* Inner ring */}
        <Box sx={{
          position: 'absolute', top: '20%', left: '20%', width: '60%', height: '60%',
          borderRadius: '50%',
          border: '2px solid rgba(0, 212, 255, 0.6)',
          animation: 'quantumPulse 2s ease-in-out 0.5s infinite',
        }} />
        {/* Center ship */}
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
        }}>
          <RocketLaunch sx={{ fontSize: 36, color: '#00d4ff' }} />
        </Box>
        {/* Particles */}
        {[...Array(6)].map((_, i) => (
          <Box key={i} sx={{
            position: 'absolute', top: '50%', left: '50%',
            width: 3, height: 3, borderRadius: '50%',
            background: '#00d4ff',
            animation: `particle${i} 2s linear infinite`,
            [`@keyframes particle${i}`]: {
              '0%': { transform: 'rotate(0deg) translateX(30px)', opacity: 1 },
              '100%': { transform: `rotate(${60 * i + 360}deg) translateX(60px)`, opacity: 0 },
            },
          }} />
        ))}
      </Box>

      <Typography variant="h5" sx={{
        fontFamily: '"Orbitron", sans-serif',
        color: '#00d4ff',
        fontWeight: 600,
        letterSpacing: '0.1em',
        textShadow: '0 0 20px rgba(0, 212, 255, 0.5)',
      }}>
        {message}
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
        正在查询 UEX 数据库...
      </Typography>
    </Box>
  );
}

export default LoadingOverlay;
