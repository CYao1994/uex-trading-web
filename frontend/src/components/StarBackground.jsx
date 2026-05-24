import { useMemo } from 'react';
import { Box } from '@mui/material';

const STAR_COUNT = 200;

function StarBackground() {
  const stars = useMemo(() => {
    return Array.from({ length: STAR_COUNT }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
      animationDelay: Math.random() * 5,
      animationDuration: Math.random() * 3 + 2,
    }));
  }, []);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        overflow: 'hidden',
        background: 'radial-gradient(ellipse at 20% 50%, #0d1b2a 0%, #060a13 50%, #020408 100%)',
      }}
    >
      {/* Nebula glow effects */}
      <Box sx={{
        position: 'absolute', top: '10%', left: '5%',
        width: '40%', height: '40%',
        background: 'radial-gradient(circle, rgba(0, 102, 255, 0.05) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />
      <Box sx={{
        position: 'absolute', bottom: '10%', right: '10%',
        width: '35%', height: '35%',
        background: 'radial-gradient(circle, rgba(0, 212, 255, 0.03) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />

      {/* Stars */}
      {stars.map((star) => (
        <Box
          key={star.id}
          sx={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            borderRadius: '50%',
            backgroundColor: star.size > 1.5 ? '#b0d4ff' : '#ffffff',
            opacity: star.opacity,
            animation: `twinkle ${star.animationDuration}s ease-in-out ${star.animationDelay}s infinite`,
            '@keyframes twinkle': {
              '0%, 100%': { opacity: star.opacity * 0.3 },
              '50%': { opacity: star.opacity },
            },
          }}
        />
      ))}

      {/* Grid lines */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        backgroundImage: `
          linear-gradient(rgba(0, 212, 255, 0.02) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 255, 0.02) 1px, transparent 1px)
        `,
        backgroundSize: '80px 80px',
      }} />
    </Box>
  );
}

export default StarBackground;
