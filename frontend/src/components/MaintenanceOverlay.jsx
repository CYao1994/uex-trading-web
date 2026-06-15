import { useState } from 'react';
import { Box, Typography, Button, IconButton } from '@mui/material';
import { CloudOff, Refresh, Close } from '@mui/icons-material';
import { useBackendStatus } from '../hooks/useBackendStatus';

function MaintenanceOverlay() {
  const { showBackendError, retryCheck } = useBackendStatus();
  const [dismissed, setDismissed] = useState(false);

  if (!showBackendError || dismissed) return null;

  return (
    <Box sx={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 1.5,
      px: 2,
      py: 0.8,
      background: 'rgba(255, 68, 102, 0.12)',
      borderBottom: '1px solid rgba(255, 68, 102, 0.25)',
      backdropFilter: 'blur(8px)',
      animation: 'slideDown 0.3s ease-out',
    }}>
      <CloudOff sx={{ fontSize: 18, color: '#ff4466' }} />
      <Typography sx={{
        color: 'rgba(255, 100, 130, 0.9)',
        fontSize: '0.8rem',
        fontFamily: '"Noto Sans SC", sans-serif',
      }}>
        后端服务暂不可用，请稍后重试
      </Typography>
      <Button
        onClick={retryCheck}
        startIcon={<Refresh sx={{ fontSize: 14 }} />}
        size="small"
        sx={{
          color: '#ff4466',
          borderColor: 'rgba(255, 68, 102, 0.3)',
          fontSize: '0.7rem',
          py: 0.2,
          '&:hover': { borderColor: '#ff4466', background: 'rgba(255, 68, 102, 0.08)' },
        }}
        variant="outlined"
      >
        重试
      </Button>
      <IconButton
        onClick={() => setDismissed(true)}
        size="small"
        sx={{ color: 'rgba(255, 100, 130, 0.5)', ml: 0.5, '&:hover': { color: '#ff4466' } }}
      >
        <Close sx={{ fontSize: 16 }} />
      </IconButton>
    </Box>
  );
}

export default MaintenanceOverlay;
