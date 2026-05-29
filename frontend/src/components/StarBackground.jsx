import { useMemo, memo } from 'react';
import { Box } from '@mui/material';

const STAR_COUNT = 120;

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
        willChange: 'transform',
        transform: 'translateZ(0)',
        // Deep space base with nebula coloring
        background: `
          radial-gradient(ellipse at 15% 20%, rgba(0, 40, 80, 0.4) 0%, transparent 50%),
          radial-gradient(ellipse at 85% 80%, rgba(10, 0, 50, 0.3) 0%, transparent 50%),
          radial-gradient(ellipse at 50% 50%, rgba(0, 20, 40, 0.2) 0%, transparent 70%),
          linear-gradient(180deg, #020810 0%, #050d18 30%, #030a14 60%, #010408 100%)
        `,
      }}
    >
      {/* Large nebula cloud - upper left */}
      <Box sx={{
        position: 'absolute', top: '-10%', left: '-5%',
        width: '60%', height: '60%',
        background: `
          radial-gradient(ellipse at 40% 50%, rgba(0, 100, 200, 0.06) 0%, transparent 60%),
          radial-gradient(ellipse at 60% 40%, rgba(0, 60, 150, 0.04) 0%, transparent 50%)
        `,
        borderRadius: '50%',
        filter: 'blur(30px)',
      }} />

      {/* Nebula accent - lower right */}
      <Box sx={{
        position: 'absolute', bottom: '-5%', right: '-10%',
        width: '50%', height: '50%',
        background: `
          radial-gradient(ellipse at 50% 50%, rgba(30, 0, 80, 0.08) 0%, transparent 55%),
          radial-gradient(ellipse at 30% 60%, rgba(0, 50, 120, 0.04) 0%, transparent 40%)
        `,
        borderRadius: '50%',
        filter: 'blur(25px)',
      }} />

      {/* Distant star clusters */}
      <Box sx={{
        position: 'absolute', top: '25%', right: '15%',
        width: '20%', height: '20%',
        background: 'radial-gradient(circle, rgba(100, 150, 255, 0.03) 0%, transparent 70%)',
        borderRadius: '50%',
      }} />

      {/* Star field — uses global @keyframes starTwinkle from index.css */}
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
            backgroundColor: star.size > 1.8
              ? '#a0c8ff'
              : star.size > 1.2
                ? '#c0d8ff'
                : '#ffffff',
            opacity: star.opacity,
            boxShadow: star.size > 1.5
              ? `0 0 ${star.size * 2}px rgba(160, 200, 255, ${star.opacity * 0.5})`
              : 'none',
            animation: `starTwinkle ${star.animationDuration}s ease-in-out ${star.animationDelay}s infinite`,
            transformOrigin: 'center center',
          }}
        />
      ))}

      {/* HUD Grid - bottom layer */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        backgroundImage: `
          linear-gradient(rgba(0, 180, 255, 0.015) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 180, 255, 0.015) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        maskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)',
        WebkitMaskImage: 'radial-gradient(ellipse at 50% 50%, black 30%, transparent 80%)',
      }} />

      {/* Scan line effect */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0, 180, 255, 0.008) 2px, rgba(0, 180, 255, 0.008) 4px)',
        pointerEvents: 'none',
      }} />

      {/* Animated scan sweep — uses global @keyframes scanSweep from index.css */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '3px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(0, 200, 255, 0.15) 40%, rgba(0, 200, 255, 0.3) 50%, rgba(0, 200, 255, 0.15) 60%, transparent 100%)',
        animation: 'scanSweep 8s linear infinite',
        boxShadow: '0 0 15px rgba(0, 200, 255, 0.2), 0 0 30px rgba(0, 200, 255, 0.1)',
      }} />

      {/* Vignette overlay */}
      <Box sx={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.4) 100%)',
        pointerEvents: 'none',
      }} />
    </Box>
  );
}

export default memo(StarBackground);
