import { Box, Typography } from '@mui/material';
import { Rocket } from '@mui/icons-material';
import HangarTimer from './HangarTimer';
import WikiStats from './WikiStats';

function FleetSidebar() {
  return (
    <Box sx={{
      width: { xs: '100%', lg: 280 },
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: 2,
    }}>
      <WikiStats />
      <HangarTimer />

      <Box
        component="a"
        href="https://robertsspaceindustries.com/en/orgs/LANCEOF12"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          px: 2,
          py: 1,
          background: 'rgba(3, 12, 25, 0.92)',
          border: '1px solid rgba(201, 162, 39, 0.1)',
          borderRadius: '4px',
          textDecoration: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'rgba(201, 162, 39, 0.08)',
            transform: 'translateY(-1px)',
          },
        }}
      >
        <Rocket sx={{ fontSize: 14, color: '#c9a227' }} />
        <Typography sx={{
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: '0.7rem',
          color: 'rgba(201, 162, 39, 0.6)',
        }}>
          访问舰队主页
        </Typography>
      </Box>
    </Box>
  );
}

export default FleetSidebar;
