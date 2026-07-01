import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { AttachMoney, Group } from '@mui/icons-material';

function AnimatedNumber({ value, prefix = '', suffix = '' }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!value) return;
    const duration = 1200;
    const start = performance.now();
    const from = 0;
    const animate = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (progress < 1) ref.current = requestAnimationFrame(animate);
    };
    ref.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);

  return <span>{prefix}{display.toLocaleString()}{suffix}</span>;
}

function WikiStats() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('https://api.star-citizen.wiki/api/stats', { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.data?.[0]) setStats(data.data[0]);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, []);

  if (!stats) return null;

  const funds = parseFloat(stats.funds) || 0;
  const fleet = parseInt(String(stats.fleet).replace(/\s/g, '')) || 0;
  const updated = stats.timestamp || '';

  return (
    <Box sx={{
      background: 'rgba(3, 12, 25, 0.92)',
      border: '1px solid rgba(201, 162, 39, 0.1)',
      borderRadius: '4px',
      p: 1.5,
    }}>
      <Typography sx={{
        fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
        fontSize: '0.6rem',
        color: 'rgba(201, 162, 39, 0.7)',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        mb: 1,
      }}>
        RSI 统计
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {/* Crowdfunding */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          py: 0.75, px: 1,
          background: 'rgba(201, 162, 39, 0.04)',
          border: '1px solid rgba(201, 162, 39, 0.08)',
          borderRadius: '3px',
        }}>
          <AttachMoney sx={{ fontSize: 16, color: '#00ddaa' }} />
          <Box>
            <Typography sx={{
              fontFamily: '"Orbitron",sans-serif',
              fontSize: '0.85rem',
              color: '#00ddaa',
              fontWeight: 700,
              lineHeight: 1.2,
            }}>
              <AnimatedNumber value={Math.round(funds)} prefix="$" />
            </Typography>
            <Typography sx={{
              fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
              fontSize: '0.55rem',
              color: 'rgba(255,255,255,0.7)',
            }}>
              众筹总额
            </Typography>
          </Box>
        </Box>

        {/* Fleet */}
        <Box sx={{
          display: 'flex', alignItems: 'center', gap: 1,
          py: 0.75, px: 1,
          background: 'rgba(201, 162, 39, 0.04)',
          border: '1px solid rgba(201, 162, 39, 0.08)',
          borderRadius: '3px',
        }}>
          <Group sx={{ fontSize: 16, color: '#44aaff' }} />
          <Box>
            <Typography sx={{
              fontFamily: '"Orbitron",sans-serif',
              fontSize: '0.85rem',
              color: '#44aaff',
              fontWeight: 700,
              lineHeight: 1.2,
            }}>
              <AnimatedNumber value={fleet} />
            </Typography>
            <Typography sx={{
              fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
              fontSize: '0.55rem',
              color: 'rgba(255,255,255,0.7)',
            }}>
              注册飞行员
            </Typography>
          </Box>
        </Box>
      </Box>

      {updated && (
        <Typography sx={{
          fontFamily: '"Rajdhani",sans-serif',
          fontSize: '0.5rem',
          color: 'rgba(255,255,255,0.6)',
          mt: 0.75,
          textAlign: 'right',
        }}>
          {new Date(updated).toLocaleDateString('zh-CN')}
        </Typography>
      )}
    </Box>
  );
}

export default WikiStats;
