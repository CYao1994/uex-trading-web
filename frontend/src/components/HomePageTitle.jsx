import { Box, Typography, Chip } from '@mui/material';

function HomePageTitle() {
  return (
    <Box sx={{
      textAlign: 'center',
      mb: { xs: 3, md: 4 },
      animation: 'fadeInUp 0.6s ease-out',
    }}>
      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: { xs: '1.5rem', md: '2rem' },
        fontWeight: 700,
        color: '#c9a227',
        letterSpacing: '0.15em',
        textShadow: '0 0 30px rgba(201, 162, 39, 0.3)',
      }}>
        ASTRAL LANCE
      </Typography>
      <Typography sx={{
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: { xs: '0.9rem', md: '1.1rem' },
        color: 'rgba(201, 162, 39, 0.6)',
        letterSpacing: '0.3em',
        mt: 0.5,
      }}>
        星槊
      </Typography>
      <Chip
        label="LANCEOF12"
        size="small"
        sx={{
          mt: 1.5,
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.55rem',
          background: 'rgba(201, 162, 39, 0.08)',
          border: '1px solid rgba(201, 162, 39, 0.15)',
          color: 'rgba(201, 162, 39, 0.5)',
          letterSpacing: '0.12em',
        }}
      />
      <Typography sx={{
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '0.8rem',
        color: 'rgba(255, 255, 255, 0.4)',
        mt: 2,
      }}>
        星际公民交易路线规划工具
      </Typography>
    </Box>
  );
}

export default HomePageTitle;
