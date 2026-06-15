// BuyPanel.jsx - 进货+路线规划功能
import { useState } from 'react';
import { Box, Typography, Button, Divider, Alert, CircularProgress } from '@mui/material';
import { ShoppingCart, RocketLaunch, Refresh, Replay } from '@mui/icons-material';
import TerminalSearch from './TerminalSearch';
import CommodityInput from './CommodityInput';
import { buyRoute } from '../api/client';
import { useSfx } from '../hooks/useSfx';

function BuyPanel({ onResult }) {
  const [origin, setOrigin] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sfx = useSfx();

  const handleSearch = async (refresh = false) => {
    if (!origin) {
      setError('请选择出发地');
      return;
    }
    if (items.length === 0) {
      setError('请至少添加一件商品');
      return;
    }

    setLoading(true);
    setError('');
    sfx('route_calculate');

    try {
      const res = await buyRoute(
        origin.name || origin.name_zh,
        items.map(i => ({ name: i.name, quantity: i.quantity })),
        refresh,
        origin.id
      );
      sfx('route_found');
      onResult(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || '查询失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{
      p: { xs: 1.5, md: 2.5 },
      background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)',
      border: '1px solid rgba(201, 162, 39, 0.1)',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',


      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.35) 30%, rgba(201, 162, 39, 0.35) 70%, transparent 100%)',
      },
    }}>
      {/* Title */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Box sx={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.15), rgba(154, 122, 26, 0.1))',
          border: '1px solid rgba(201, 162, 39, 0.25)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
        }}>
          <ShoppingCart sx={{ color: '#c9a227', fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700, fontSize: '0.95rem',
            color: '#c9a227',
            letterSpacing: '0.05em',
          }}>
            进货路线
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.35)', fontSize: '0.65rem', letterSpacing: '0.03em' }}>
            输入出发地，规划最优进货路线
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

      <Divider sx={{ borderColor: 'rgba(201, 162, 39, 0.06)', mb: 2.5 }} />

      {/* Commodity list */}
      <Box sx={{ mb: 2.5, flex: 1 }}>
        <Typography variant="subtitle2" sx={{ color: 'rgba(201, 162, 39, 0.5)', mb: 1.5, fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', fontFamily: '"Orbitron", sans-serif' }}>
          货物清单
        </Typography>
        <CommodityInput items={items} onItemsChange={setItems} />
      </Box>

      {/* Data source */}
      <Typography sx={{
        color: 'rgba(201, 162, 39, 0.2)',
        fontSize: '0.6rem',
        fontFamily: '"Orbitron", sans-serif',
        letterSpacing: '0.05em',
        mb: 2,
        textAlign: 'center',
      }}>
        DATA FROM UEXCORP.SPACE
      </Typography>

      {/* Error with retry button */}
      {error && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              onClick={() => handleSearch(false)}
              startIcon={<Replay />}
              sx={{
                fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                fontWeight: 600,
                fontSize: '0.75rem',
              }}
            >
              重试
            </Button>
          }
          sx={{
            mb: 2,
            '& .MuiAlert-message': { fontSize: '0.8rem' },
            borderRadius: '2px',
          }}
        >
          查询出错，请检查输入后重试
        </Alert>
      )}

      {/* Search buttons - HUD style */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => handleSearch(false)}
          disabled={loading || !origin || items.length === 0}
          startIcon={loading ? <CircularProgress size={18} sx={{ color: '#555' }} /> : <RocketLaunch />}
          sx={{
            py: 1.2,
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '0.85rem',
            letterSpacing: '0.08em',
            borderRadius: '2px',
            clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
            background: loading
              ? 'rgba(201, 162, 39, 0.08)'
              : 'linear-gradient(135deg, #c9a227 0%, #9a7a1a 100%)',
            color: loading ? '#555' : '#020810',
            fontWeight: 700,
            border: loading ? '1px solid rgba(201, 162, 39, 0.15)' : '1px solid transparent',
            transition: 'background 0.3s, box-shadow 0.3s',
            '&:hover': {
              boxShadow: '0 0 20px rgba(201, 162, 39, 0.4), 0 0 40px rgba(154, 122, 26, 0.15)',
              background: loading
                ? 'rgba(201, 162, 39, 0.08)'
                : 'linear-gradient(135deg, #d4ad30 0%, #a8861c 100%)',
            },
            '&.Mui-disabled': {
              background: 'rgba(201, 162, 39, 0.05)',
              color: '#333',
              border: '1px solid rgba(201, 162, 39, 0.08)',
            },
          }}
        >
          {loading ? '正在规划路线...' : '规划路线'}
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => handleSearch(true)}
          disabled={loading || !origin || items.length === 0}
          sx={{
            minWidth: 44,
            px: 1,
            borderRadius: '2px',
            borderColor: 'rgba(201, 162, 39, 0.2)',
            color: 'rgba(201, 162, 39, 0.5)',
            '&:hover': {
              borderColor: 'rgba(201, 162, 39, 0.5)',
              background: 'rgba(201, 162, 39, 0.05)',
              color: '#c9a227',
            },
            '&.Mui-disabled': {
              borderColor: 'rgba(201, 162, 39, 0.08)',
              color: 'rgba(201, 162, 39, 0.15)',
            },
          }}
          title="强制刷新数据(绕过缓存)"
        >
          <Refresh sx={{ fontSize: 18 }} />
        </Button>
      </Box>
    </Box>
  );
}

export default BuyPanel;
