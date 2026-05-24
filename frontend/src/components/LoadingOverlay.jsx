import { Box, Typography } from '@mui/material';
import { RocketLaunch } from '@mui/icons-material';

function LoadingOverlay({ message = '量子跃迁中...' }) {
  return (
    <Box sx={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2, 8, 16, 0.92)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
    }}>
      {/* HUD Quantum Jump Effect */}
      <Box sx={{ position: 'relative', width: 130, height: 130, mb: 3 }}>
        {/* Outer hex ring */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          border: '2px solid rgba(0, 200, 255, 0.2)',
          animation: 'quantumPulse 2.5s ease-in-out infinite',
          '@keyframes quantumPulse': {
            '0%': { transform: 'scale(0.85) rotate(0deg)', opacity: 0.4 },
            '50%': { transform: 'scale(1.05) rotate(30deg)', opacity: 1 },
            '100%': { transform: 'scale(0.85) rotate(60deg)', opacity: 0.4 },
          },
        }} />
        {/* Inner ring */}
        <Box sx={{
          position: 'absolute', top: '18%', left: '18%', width: '64%', height: '64%',
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          border: '1.5px solid rgba(0, 200, 255, 0.35)',
          animation: 'quantumPulse 2.5s ease-in-out 0.4s infinite reverse',
        }} />
        {/* Center ship */}
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'quantumFlicker 1.5s ease-in-out infinite',
          '@keyframes quantumFlicker': {
            '0%, 100%': { opacity: 0.7, filter: 'brightness(1)' },
            '50%': { opacity: 1, filter: 'brightness(1.3)' },
            '75%': { opacity: 0.85, filter: 'brightness(0.9)' },
          },
        }}>
          <RocketLaunch sx={{ fontSize: 32, color: '#00c8ff' }} />
        </Box>
        {/* Scanning particles */}
        {[...Array(8)].map((_, i) => (
          <Box key={i} sx={{
            position: 'absolute', top: '50%', left: '50%',
            width: 2, height: 2, borderRadius: '50%',
            background: i % 2 === 0 ? '#00c8ff' : '#0088dd',
            boxShadow: '0 0 4px rgba(0, 200, 255, 0.5)',
            animation: `particle${i} 2.5s linear infinite`,
            [`@keyframes particle${i}`]: {
              '0%': { transform: `rotate(${45 * i}deg) translateX(25px)`, opacity: 0.8 },
              '100%': { transform: `rotate(${45 * i + 360}deg) translateX(65px)`, opacity: 0 },
            },
          }} />
        ))}
      </Box>

      <Typography variant="h5" sx={{
        fontFamily: '"Orbitron", sans-serif',
        color: '#00c8ff',
        fontWeight: 600,
        letterSpacing: '0.12em',
        fontSize: '1.2rem',
        textShadow: '0 0 15px rgba(0, 200, 255, 0.4), 0 0 30px rgba(0, 100, 200, 0.2)',
        animation: 'hudFlicker 4s ease-in-out infinite',
        '@keyframes hudFlicker': {
          '0%, 100%': { opacity: 1 },
          '92%': { opacity: 1 },
          '93%': { opacity: 0.8 },
          '94%': { opacity: 1 },
          '96%': { opacity: 0.9 },
          '97%': { opacity: 1 },
        },
      }}>
        {message}
      </Typography>
      <Typography variant="body2" sx={{ color: 'rgba(0, 200, 255, 0.35)', mt: 1, fontSize: '0.8rem', letterSpacing: '0.05em' }}>
        正在查询 UEX 数据库...
      </Typography>
    </Box>
  );
}

export default LoadingOverlay;
