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
    <Box sx={{
      p: 2.5,
      background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.88) 0%, rgba(2, 8, 18, 0.92) 100%)',
      border: '1px solid rgba(0, 180, 255, 0.1)',
      backdropFilter: 'blur(12px)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      // Top edge highlight
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(0, 200, 255, 0.35) 30%, rgba(0, 200, 255, 0.35) 70%, transparent 100%)',
      },
    }}>
      {/* Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box sx={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.15), rgba(0, 100, 200, 0.1))',
          border: '1px solid rgba(0, 200, 255, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
        }}>
          <SwapHoriz sx={{ color: '#00c8ff', fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700, fontSize: '0.95rem',
            color: '#00c8ff',
            letterSpacing: '0.05em',
          }}>
            清仓路线
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(0, 200, 255, 0.35)', fontSize: '0.65rem', letterSpacing: '0.03em' }}>
            输入货物，规划最佳销售路线
          </Typography>
        </Box>
      </Box>

      {/* Origin terminal */}
      <Box sx={{ mb: 2.5 }}>
        <TerminalSearch
          value={origin?.name_zh || ''}
          onChange={setOrigin}
          label="出发地"
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(0, 180, 255, 0.06)', mb: 2.5 }} />

      {/* Commodity list */}
      <Box sx={{ mb: 2.5, flex: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'rgba(0, 200, 255, 0.5)', mb: 1.5, fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', fontFamily: '"Orbitron", sans-serif' }}>
          货物清单
        </Typography>
        <CommodityInput items={items} onItemsChange={setItems} />
      </Box>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 2, '& .MuiAlert-message': { fontSize: '0.8rem' }, borderRadius: '2px' }}>
          {error}
        </Alert>
      )}

      {/* Search button - HUD style */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        onClick={handleSearch}
        disabled={loading || !origin || items.length === 0}
        startIcon={<RocketLaunch />}
        sx={{
          py: 1.2,
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.85rem',
          letterSpacing: '0.08em',
          borderRadius: '2px',
          clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
          background: loading
            ? 'rgba(0, 180, 255, 0.08)'
            : 'linear-gradient(135deg, #00c8ff 0%, #0080dd 100%)',
          color: loading ? '#555' : '#020810',
          fontWeight: 700,
          border: loading ? '1px solid rgba(0, 180, 255, 0.15)' : '1px solid transparent',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 0 20px rgba(0, 200, 255, 0.4), 0 0 40px rgba(0, 150, 255, 0.15)',
            background: loading
              ? 'rgba(0, 180, 255, 0.08)'
              : 'linear-gradient(135deg, #00ddff 0%, #0099ee 100%)',
          },
          '&.Mui-disabled': {
            background: 'rgba(0, 180, 255, 0.05)',
            color: '#333',
            border: '1px solid rgba(0, 180, 255, 0.08)',
          },
        }}
      >
        {loading ? '计算中...' : '规划路线'}
      </Button>
    </Box>
  );
}

export default SellPanel;
