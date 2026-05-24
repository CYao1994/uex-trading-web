import { Box, Typography, Chip } from '@mui/material';
import { RocketLaunch, SwapHoriz, AttachMoney } from '@mui/icons-material';

function Navbar({ activeTab, onTabChange }) {
  const tabs = [
    { key: 'sell', label: '清仓路线', icon: <SwapHoriz sx={{ fontSize: 16 }} /> },
    { key: 'price', label: '价格查询', icon: <AttachMoney sx={{ fontSize: 16 }} /> },
    { key: 'buy', label: '进货路线', icon: <RocketLaunch sx={{ fontSize: 16 }} /> },
  ];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 3,
        py: 1.5,
        background: 'linear-gradient(180deg, rgba(13, 19, 33, 0.95) 0%, rgba(13, 19, 33, 0.8) 100%)',
        borderBottom: '1px solid rgba(0, 212, 255, 0.15)',
        backdropFilter: 'blur(10px)',
      }}
    >
      {/* Logo */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box sx={{
          width: 36, height: 36,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00d4ff, #0066ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
        }}>
          <RocketLaunch sx={{ fontSize: 20, color: '#0a0e17' }} />
        </Box>
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700,
              fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #00d4ff, #66e5ff)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.2,
            }}
          >
            UEX TRADE
          </Typography>
          <Typography
            variant="caption"
            sx={{ color: 'text.secondary', fontSize: '0.65rem', letterSpacing: '0.15em' }}
          >
            NAVIGATOR
          </Typography>
        </Box>
      </Box>

      {/* Tab switcher */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        {tabs.map(({ key, label, icon }) => {
          const isActive = activeTab === key;
          // Special accent color for price tab
          const accentColor = key === 'price' ? '#ffaa00' : '#00d4ff';
          const gradientBg = key === 'price'
            ? 'linear-gradient(135deg, #ffaa00, #ff6b35)'
            : 'linear-gradient(135deg, #00d4ff, #0066ff)';

          return (
            <Chip
              key={key}
              icon={icon}
              label={label}
              onClick={() => onTabChange(key)}
              variant={isActive ? 'filled' : 'outlined'}
              sx={{
                fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                fontWeight: 600,
                ...(isActive
                  ? {
                      background: gradientBg,
                      color: '#0a0e17',
                      boxShadow: `0 0 15px ${accentColor}44`,
                    }
                  : {
                      borderColor: `${accentColor}4D`,
                      color: accentColor,
                      '&:hover': { borderColor: accentColor },
                    }),
              }}
            />
          );
        })}
      </Box>

      {/* Status indicator + Author */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{
            width: 6, height: 6, borderRadius: '50%',
            backgroundColor: '#00ff88',
            boxShadow: '0 0 6px #00ff88',
            animation: 'pulse 2s ease-in-out infinite',
            '@keyframes pulse': {
              '0%, 100%': { opacity: 0.4 },
              '50%': { opacity: 1 },
            },
          }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>
            UEX ONLINE
          </Typography>
        </Box>
        <Typography
          variant="caption"
          sx={{
            color: 'rgba(0, 212, 255, 0.4)',
            fontSize: '0.65rem',
            fontFamily: '"Orbitron", sans-serif',
            letterSpacing: '0.08em',
            borderLeft: '1px solid rgba(0, 212, 255, 0.15)',
            pl: 1.5,
          }}
        >
          BY CYao1994
        </Typography>
      </Box>
    </Box>
  );
}

export default Navbar;
