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
      {/* HUD Quantum Jump Effect — all @keyframes defined globally in index.css */}
      <Box sx={{ position: 'relative', width: 130, height: 130, mb: 3 }}>
        {/* Outer hex ring */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          border: '2px solid rgba(0, 200, 255, 0.2)',
          animation: 'quantumPulse 2.5s ease-in-out infinite',
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
        }}>
          <RocketLaunch sx={{ fontSize: 32, color: '#00c8ff' }} />
        </Box>
        {/* Scanning particles — use global @keyframes particle0-7 */}
        {[...Array(8)].map((_, i) => (
          <Box key={i} sx={{
            position: 'absolute', top: '50%', left: '50%',
            width: 2, height: 2, borderRadius: '50%',
            background: i % 2 === 0 ? '#00c8ff' : '#0088dd',
            boxShadow: '0 0 4px rgba(0, 200, 255, 0.5)',
            animation: `particle${i} 2.5s linear infinite`,
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
