import { Box, Typography } from '@mui/material';
import Navbar from './Navbar';
import StarBackground from './StarBackground';

function Layout({ children, activeTab, onTabChange }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <StarBackground />
      <Navbar activeTab={activeTab} onTabChange={onTabChange} />
      <Box sx={{ flex: 1, p: { xs: 2, md: 3 }, maxWidth: 1400, mx: 'auto', width: '100%', willChange: 'transform', transform: 'translateZ(0)' }}>
        {children}
      </Box>
      {/* Footer - HUD style */}
      <Box sx={{
        py: 1.2,
        px: 3,
        textAlign: 'center',
        borderTop: '1px solid rgba(0, 180, 255, 0.06)',
        background: 'linear-gradient(180deg, rgba(2, 8, 16, 0.9) 0%, rgba(2, 6, 12, 0.95) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flexWrap: 'wrap',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(0, 200, 255, 0.15) 30%, rgba(0, 200, 255, 0.15) 70%, transparent 100%)',
        },
      }}>
        <Box
          component="a"
          href="https://robertsspaceindustries.com/en/orgs/SUS2025"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, textDecoration: 'none' }}
        >
          <Box
            component="img"
            src="/sus2025-logo.jpg"
            alt="SUS2025"
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}
          />
          <Typography variant="caption" sx={{
            color: 'rgba(0, 212, 255, 0.5)',
            fontSize: '0.65rem',
            fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}>
            斯坦顿外域探索协会 [SUS2025]
          </Typography>
        </Box>
        <Typography variant="caption" sx={{
          color: 'rgba(0, 212, 255, 0.2)',
          fontSize: '0.5rem',
        }}>
          |
        </Typography>
        <Typography variant="caption" sx={{
          color: 'rgba(0, 212, 255, 0.3)',
          fontSize: '0.65rem',
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '0.1em',
        }}>
          UEX TRADE NAVIGATOR · DATA FROM UEXCORP · MADE BY CYao1994
        </Typography>
      </Box>
    </Box>
  );
}

export default Layout;
