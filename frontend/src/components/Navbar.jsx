import { Box, Typography } from '@mui/material';
import { SwapHoriz, ShoppingCart, MilitaryTech, Link } from '@mui/icons-material';
import { useState, useEffect, lazy, Suspense } from 'react';
import api from '../api/client';

// Lazy-load ChangelogDialog — rarely used dialog, no need in initial bundle
const ChangelogDialog = lazy(() => import('./ChangelogDialog'));

function Navbar({ activeTab, onTabChange }) {
  const [version, setVersion] = useState('');
  const [changelogOpen, setChangelogOpen] = useState(false);

  useEffect(() => {
    api.get('/version')
      .then(res => setVersion(res.data.version || ''))
      .catch(() => {});
  }, []);

  const tabs = [
    { key: 'sell', label: '清仓路线', icon: <SwapHoriz sx={{ fontSize: 16 }} /> },
    { key: 'buy', label: '进货路线', icon: <ShoppingCart sx={{ fontSize: 16 }} /> },
    { key: 'chain', label: '链式跑商', icon: <Link sx={{ fontSize: 16 }} /> },
    { key: 'warbond', label: '战争债券', icon: <MilitaryTech sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 1,
        background: 'linear-gradient(180deg, rgba(3, 10, 22, 0.97) 0%, rgba(2, 8, 16, 0.95) 100%)',
        borderBottom: '1px solid rgba(0, 180, 255, 0.1)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 200, 255, 0.5) 30%, rgba(0, 200, 255, 0.5) 70%, transparent 100%)',
        },
      }}
    >
      {/* Logo + Org */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 34, height: 34,
          borderRadius: '4px',
          background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.15), rgba(0, 100, 200, 0.1))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(0, 200, 255, 0.25)',
          overflow: 'hidden',
          boxShadow: '0 0 10px rgba(0, 200, 255, 0.1)',
        }}>
          <img
            src="/sus2025-logo.jpg"
            alt="SUS2025"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700,
              fontSize: '1rem',
              color: '#00c8ff',
              lineHeight: 1.2,
              letterSpacing: '0.05em',
            }}
          >
            UEX TRADE
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'rgba(0, 200, 255, 0.35)', fontSize: '0.6rem', letterSpacing: '0.2em', fontFamily: '"Orbitron", sans-serif' }}
          >
            NAVIGATOR
          </Typography>
        </Box>
        {/* Org Badge */}
        <Box
          component="a"
          href="https://robertsspaceindustries.com/en/orgs/SUS2025"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            ml: 0.5,
            pl: 1.25,
            borderLeft: '1px solid rgba(0, 180, 255, 0.12)',
            textDecoration: 'none',
            cursor: 'pointer',
            '&:hover .org-name': {
              color: '#00c8ff',
            },
          }}
        >
          <Box
            component="img"
            src="/sus2025-logo.jpg"
            alt="SUS2025"
            sx={{
              width: 20,
              height: 20,
              borderRadius: '2px',
              border: '1px solid rgba(0, 180, 255, 0.2)',
            }}
          />
          <Box>
            <Typography
              className="org-name"
              sx={{
                color: 'rgba(0, 200, 255, 0.6)',
                fontSize: '0.68rem',
                fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
                fontWeight: 600,
                lineHeight: 1.2,
                transition: 'color 0.2s',
                letterSpacing: '0.02em',
              }}
            >
              斯坦顿外域探索协会
            </Typography>
            <Typography
              sx={{
                color: 'rgba(0, 200, 255, 0.25)',
                fontSize: '0.5rem',
                fontFamily: '"Orbitron", sans-serif',
                letterSpacing: '0.1em',
                lineHeight: 1.2,
              }}
            >
              SUS2025
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Tab switcher */}
      <Box sx={{
        display: 'flex',
        gap: 0.5,
        background: 'rgba(0, 10, 20, 0.4)',
        border: '1px solid rgba(0, 180, 255, 0.08)',
        borderRadius: '2px',
        p: 0.3,
      }}>
        {tabs.map(({ key, label, icon }) => {
          const isActive = activeTab === key;
          const accentColor = key === 'warbond' ? '#ffaa00' : '#00c8ff';

          return (
            <Box
              key={key}
              onClick={() => onTabChange(key)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 2,
                py: 0.75,
                cursor: 'pointer',
                fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                fontWeight: 600,
                fontSize: '0.82rem',
                letterSpacing: '0.03em',
                transition: 'color 0.25s, background 0.25s',
                position: 'relative',
                ...(isActive ? {
                  color: '#020810',
                  background: key === 'warbond'
                    ? 'linear-gradient(135deg, #ffaa00, #ff7b00)'
                    : 'linear-gradient(135deg, #00c8ff, #0088dd)',
                  boxShadow: `0 0 12px ${accentColor}44`,
                  clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
                } : {
                  color: `${accentColor}99`,
                  '&:hover': {
                    color: accentColor,
                    background: `${accentColor}0A`,
                  },
                }),
              }}
            >
              {icon}
              {label}
            </Box>
          );
        })}
      </Box>

      {/* Status + Author */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{
            width: 5, height: 5, borderRadius: '50%',
            backgroundColor: '#00ff88',
            boxShadow: '0 0 6px #00ff88',
            animation: 'pulse 2s ease-in-out infinite',
          }} />
          <Typography variant="caption" sx={{ color: 'rgba(0, 200, 255, 0.4)', fontSize: '0.65rem', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.08em' }}>
            UEX ONLINE
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(0, 200, 255, 0.3)',
            fontSize: '0.6rem',
            fontFamily: '"Orbitron", sans-serif',
            letterSpacing: '0.06em',
            borderLeft: '1px solid rgba(0, 180, 255, 0.1)',
            pl: 1.25,
          }}
        >
          BY CYao1994
        </Typography>
        {version && (
          <Typography
            variant="caption"
            onClick={() => setChangelogOpen(true)}
            sx={{
              color: 'rgba(0, 200, 255, 0.3)',
              fontSize: '0.55rem',
              fontFamily: '"Orbitron", sans-serif',
              letterSpacing: '0.05em',
              borderLeft: '1px solid rgba(0, 180, 255, 0.08)',
              pl: 1.25,
              cursor: 'pointer',
              transition: 'color 0.2s',
              '&:hover': {
                color: '#00c8ff',
              },
            }}
          >
            v{version}
          </Typography>
        )}
      </Box>

      <Suspense fallback={null}>
        <ChangelogDialog open={changelogOpen} onClose={() => setChangelogOpen(false)} />
      </Suspense>
    </Box>
  );
}

export default Navbar;
