import { Box, Paper, Typography, Button, Alert } from '@mui/material';
import { RocketLaunch, Info } from '@mui/icons-material';
import TerminalSearch from './TerminalSearch';

function BuyPanel() {
  return (
    <Paper sx={{
      p: 3,
      background: 'rgba(13, 19, 33, 0.7)',
      border: '1px solid rgba(0, 212, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <Box sx={{
        width: 64, height: 64, borderRadius: '50%',
        background: 'rgba(0, 212, 255, 0.08)',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        mb: 2,
      }}>
        <RocketLaunch sx={{ fontSize: 32, color: 'primary.main', opacity: 0.5 }} />
      </Box>
      <Typography variant="h6" sx={{
        fontFamily: '"Orbitron", sans-serif',
        color: 'primary.main', mb: 1, fontWeight: 700,
      }}>
        进货路线
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 2 }}>
        从指定地点出发，查询利润最高的进货→卖出路线
      </Typography>
      <Alert severity="info" sx={{
        '& .MuiAlert-message': { fontSize: '0.85rem' },
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.1)',
      }}>
        此功能正在开发中，敬请期待！
      </Alert>
    </Paper>
  );
}

export default BuyPanel;
