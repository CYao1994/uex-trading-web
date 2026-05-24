import { useState } from 'react';
import { Box, Paper, Typography, Button, Divider, Alert } from '@mui/material';
import { SwapHoriz, RocketLaunch } from '@mui/icons-material';
import TerminalSearch from './TerminalSearch';
import CommodityInput from './CommodityInput';
import { sellRoute } from '../api/client';

function SellPanel({ onResult }) {
  const [origin, setOrigin] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    if (!origin) {
      setError('请选择出发地');
      return;
    }
    if (items.length === 0) {
      setError('请添加至少一种商品');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await sellRoute(
        origin.name || origin.name_zh,
        items.map(i => ({ name: i.name, quantity: i.quantity }))
      );
      onResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || '查询失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{
      p: 3,
      background: 'rgba(13, 19, 33, 0.7)',
      border: '1px solid rgba(0, 212, 255, 0.1)',
      backdropFilter: 'blur(10px)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: 2,
          background: 'linear-gradient(135deg, #00d4ff, #0066ff)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 15px rgba(0, 212, 255, 0.3)',
        }}>
          <SwapHoriz sx={{ color: '#0a0e17', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700, fontSize: '1rem',
            color: 'primary.main',
          }}>
            清仓路线
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            输入货物，规划最佳销售路线
          </Typography>
        </Box>
      </Box>

      {/* Origin terminal */}
      <Box sx={{ mb: 3 }}>
        <TerminalSearch
          value={origin?.name_zh || ''}
          onChange={setOrigin}
          label="出发地"
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(0, 212, 255, 0.08)', mb: 3 }} />

      {/* Commodity list */}
      <Box sx={{ mb: 3, flex: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'text.secondary', mb: 1.5, fontWeight: 600 }}>
          货物清单
        </Typography>
        <CommodityInput items={items} onItemsChange={setItems} />
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, '& .MuiAlert-message': { fontSize: '0.85rem' } }}>
          {error}
        </Alert>
      )}

      {/* Search button */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={handleSearch}
        disabled={loading || !origin || items.length === 0}
        startIcon={<RocketLaunch />}
        sx={{
          py: 1.5,
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.9rem',
          background: loading
            ? 'rgba(0, 212, 255, 0.2)'
            : 'linear-gradient(135deg, #00d4ff 0%, #0066ff 100%)',
          color: loading ? '#666' : '#0a0e17',
          '&:hover': {
            boxShadow: '0 0 25px rgba(0, 212, 255, 0.5)',
          },
          '&.Mui-disabled': {
            background: 'rgba(0, 212, 255, 0.1)',
            color: '#444',
          },
        }}
      >
        {loading ? '计算中...' : '规划路线'}
      </Button>
    </Paper>
  );
}

export default SellPanel;
