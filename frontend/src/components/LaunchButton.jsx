import { Box, Typography } from '@mui/material';
import { RocketLaunch } from '@mui/icons-material';

function LaunchButton({ onLaunch, sfx }) {
  return (
    <Box
      onClick={() => { sfx('toggle_on'); onLaunch(); }}
      sx={{
        mt: 2,
        mb: 4,
        px: 6,
        py: 2.5,
        cursor: 'pointer',
        position: 'relative',
        background: 'rgba(201, 162, 39, 0.06)',
        border: '1px solid rgba(201, 162, 39, 0.2)',
        clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
        transition: 'all 0.3s ease',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '20%',
          right: '20%',
          height: '1px',
          background: 'rgba(201, 162, 39, 0.5)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: 'rgba(201, 162, 39, 0.3)',
          animation: 'pulse 3s infinite',
        },
        '&:hover': {
          background: 'rgba(201, 162, 39, 0.12)',
          border: '1px solid rgba(201, 162, 39, 0.4)',
          boxShadow: '0 0 30px rgba(201, 162, 39, 0.2)',
          transform: 'scale(1.02)',
        },
        '&:active': {
          transform: 'scale(0.98)',
        }
      }}
    >
      <Box
        sx={{
          width: 40,
          height: 40,
          mx: 'auto',
          mb: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(201, 162, 39, 0.08)',
          border: '1px solid rgba(201, 162, 39, 0.3)',
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
        }}
      >
        <RocketLaunch sx={{ color: '#c9a227', fontSize: 24 }} />
      </Box>
      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: '0.85rem',
        fontWeight: 700,
        color: '#c9a227',
        letterSpacing: '0.1em',
        textAlign: 'center',
      }}>
        启动系统
      </Typography>
      <Typography sx={{
        fontFamily: '"Noto Sans SC", sans-serif',
        fontSize: '0.65rem',
        color: 'rgba(201, 162, 39, 0.6)',
        letterSpacing: '0.2em',
        textAlign: 'center',
        mt: 0.5,
      }}>
        启动星槊系统
      </Typography>
    </Box>
  );
}

export default LaunchButton;
