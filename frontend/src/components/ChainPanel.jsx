// ChainPanel.jsx - 功能：链式跑商规划(loading状态+路线结果展示)+ 输入框focus管理
import { useState, useCallback } from 'react';
import { Box, Typography, Button, Divider, Alert, Autocomplete, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { Link, RocketLaunch, Refresh, DirectionsCar, Replay } from '@mui/icons-material';
import { searchLocations, searchVehicles, tradeChain } from '../api/client';
import { useSfx } from '../hooks/useSfx';

function ChainPanel({ onResult }) {
  const [origin, setOrigin] = useState(null);
  const [vehicle, setVehicle] = useState(null);
  const [customScu, setCustomScu] = useState('');
  const [useCustomScu, setUseCustomScu] = useState(false);
  const [capital, setCapital] = useState('100000');
  const [maxLegs, setMaxLegs] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const sfx = useSfx();

  // Location search
  const [locationOptions, setLocationOptions] = useState([]);
  const [locationInput, setLocationInput] = useState('');

  // Vehicle search
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [vehicleInput, setVehicleInput] = useState('');

  const handleLocationSearch = useCallback(async (query) => {
    setLocationInput(query);
    if (!query || query.length < 1) {
      setLocationOptions([]);
      return;
    }
    try {
      const res = await searchLocations(query);
      setLocationOptions(res.data || []);
    } catch {
      setLocationOptions([]);
    }
  }, []);

  const handleVehicleSearch = useCallback(async (query) => {
    setVehicleInput(query);
    if (!query || query.length < 1) {
      setVehicleOptions([]);
      return;
    }
    try {
      const res = await searchVehicles(query);
      setVehicleOptions(res.data || []);
    } catch {
      setVehicleOptions([]);
    }
  }, []);

  const handleSearch = async (refresh = false) => {
    if (!origin) {
      setError('请选择出发地');
      return;
    }
    if (!capital || Number(capital) <= 0) {
      setError('请输入有效的本金金额');
      return;
    }

    setLoading(true);
    setError('');
    sfx('route_calculate');

    try {
      const params = {
        capital: Number(capital),
        max_legs: maxLegs,
        origin_location_id: origin.location_id,
        origin_location_name: origin.location_name,
      };

      if (useCustomScu && customScu && Number(customScu) > 0) {
        params.scu_override = Number(customScu);
      } else if (vehicle) {
        params.vehicle_id = vehicle.id;
      }

      const res = await tradeChain(params, refresh);
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
          <Link sx={{ color: '#c9a227', fontSize: 18 }} />
        </Box>
        <Box>
          <Typography variant="h6" sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700, fontSize: '0.95rem',
            color: '#c9a227',
            letterSpacing: '0.05em',
          }}>
            链式跑商
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.35)', fontSize: '0.65rem', letterSpacing: '0.03em' }}>
            自动规划连续贸易，最大化利润
          </Typography>
        </Box>
      </Box>

      {/* Vehicle Selection */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'rgba(201, 162, 39, 0.5)', mb: 1, fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', fontFamily: '"Orbitron", sans-serif' }}>
          选择飞船
        </Typography>
        <Autocomplete
          size="small"
          options={vehicleOptions}
          getOptionLabel={(opt) => `${opt.name} (${opt.name_zh}) - ${opt.scu} SCU`}
          isOptionEqualToValue={(opt, val) => opt.id === val.id}
          inputValue={vehicleInput}
          onInputChange={(_, val) => handleVehicleSearch(val)}
          onChange={(_, val) => {
            setVehicle(val);
            if (val && !useCustomScu) {
              // Show selected vehicle's SCU in custom field as reference
            }
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="搜索飞船..."
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#c9a227',
                  fontSize: '0.85rem',
                  fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                  '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.15)' },
                  '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
                  '&.Mui-focused': { boxShadow: '0 0 8px rgba(201, 162, 39, 0.3)' },
                },
                '& .MuiInputAdornment-root': { color: 'rgba(201, 162, 39, 0.3)' },
              }}
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    <DirectionsCar sx={{ fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
          )}
          sx={{
            '& .MuiAutocomplete-popupIndicator': { color: 'rgba(201, 162, 39, 0.3)' },
            '& .MuiAutocomplete-clearIndicator': { color: 'rgba(201, 162, 39, 0.3)' },
            '& .MuiAutocomplete-paper': {
              background: 'rgba(3, 12, 25, 0.97)',
              border: '1px solid rgba(201, 162, 39, 0.15)',
            },
            '& .MuiAutocomplete-option': {
              color: '#c9a227',
              fontSize: '0.8rem',
              '&:hover': { background: 'rgba(201, 162, 39, 0.08)' },
              '&.Mui-focused': { background: 'rgba(201, 162, 39, 0.12)' },
            },
          }}
        />

        {/* Custom SCU toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
          <Box
            onClick={() => setUseCustomScu(!useCustomScu)}
            sx={{
              width: 16, height: 16,
              border: `1px solid ${useCustomScu ? '#c9a227' : 'rgba(201, 162, 39, 0.2)'}`,
              borderRadius: '2px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              background: useCustomScu ? 'rgba(201, 162, 39, 0.15)' : 'transparent',
              transition: 'all 0.2s',
            }}
          >
            {useCustomScu && (
              <Box sx={{ width: 8, height: 8, background: '#c9a227', borderRadius: '1px' }} />
            )}
          </Box>
          <Typography
            onClick={() => setUseCustomScu(!useCustomScu)}
            sx={{
              color: useCustomScu ? '#c9a227' : 'rgba(201, 162, 39, 0.4)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
            }}
          >
            自定义货仓容量
          </Typography>
          {useCustomScu && (
            <TextField
              size="small"
              type="number"
              value={customScu}
              onChange={(e) => setCustomScu(e.target.value)}
              placeholder="SCU"
              sx={{
                width: 90,
                '& .MuiOutlinedInput-root': {
                  color: '#c9a227',
                  fontSize: '0.8rem',
                  py: 0.3,
                  '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.15)' },
                  '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
                  '&.Mui-focused': { boxShadow: '0 0 8px rgba(201, 162, 39, 0.3)' },
                },
              }}
              inputProps={{ min: 1, max: 100000 }}
            />
          )}
          {vehicle && !useCustomScu && (
            <Typography sx={{ color: 'rgba(201, 162, 39, 0.4)', fontSize: '0.7rem', ml: 'auto' }}>
              {vehicle.scu} SCU
            </Typography>
          )}
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(201, 162, 39, 0.06)', mb: 2.5 }} />

      {/* Origin Location */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'rgba(201, 162, 39, 0.5)', mb: 1, fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', fontFamily: '"Orbitron", sans-serif' }}>
          出发地
        </Typography>
        <Autocomplete
          size="small"
          options={locationOptions}
          getOptionLabel={(opt) => {
            const parts = [opt.location_name_zh || opt.location_name];
            if (opt.planet_zh) parts.push(opt.planet_zh);
            if (opt.system_zh) parts.push(`(${opt.system_zh})`);
            return parts.join(' ');
          }}
          isOptionEqualToValue={(opt, val) => opt.location_id === val.location_id}
          inputValue={locationInput}
          onInputChange={(_, val) => handleLocationSearch(val)}
          onChange={(_, val) => setOrigin(val)}
          renderOption={(props, opt) => (
            <Box {...props} sx={{ ...props.sx, px: 2, py: 1 }}>
              <Typography variant="body2" sx={{ color: '#c9a227', fontWeight: 600, fontSize: '0.85rem' }}>
                {opt.location_name_zh || opt.location_name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.4)', fontSize: '0.7rem' }}>
                {opt.location_name} · {opt.system_zh || opt.system}
              </Typography>
            </Box>
          )}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="搜索地点（中英文均可）"
              sx={{
                '& .MuiOutlinedInput-root': {
                  color: '#c9a227',
                  fontSize: '0.85rem',
                  fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                  '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.15)' },
                  '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.3)' },
                  '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
                  '&.Mui-focused': { boxShadow: '0 0 8px rgba(201, 162, 39, 0.3)' },
                },
              }}
            />
          )}
          sx={{
            '& .MuiAutocomplete-popupIndicator': { color: 'rgba(201, 162, 39, 0.3)' },
            '& .MuiAutocomplete-clearIndicator': { color: 'rgba(201, 162, 39, 0.3)' },
            '& .MuiAutocomplete-paper': {
              background: 'rgba(13, 19, 33, 0.98)',
              border: '1px solid rgba(201, 162, 39, 0.2)',
              backdropFilter: 'blur(10px)',
            },
            '& .MuiAutocomplete-option': {
              padding: 0,
              '&:hover': { background: 'rgba(201, 162, 39, 0.08)' },
              '&.Mui-focused': { background: 'rgba(201, 162, 39, 0.12)' },
            },
          }}
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(201, 162, 39, 0.06)', mb: 2.5 }} />

      {/* Capital Input */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="subtitle2" sx={{ color: 'rgba(201, 162, 39, 0.5)', mb: 1, fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', fontFamily: '"Orbitron", sans-serif' }}>
          本金
        </Typography>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={capital}
          onChange={(e) => setCapital(e.target.value)}
          InputProps={{
            endAdornment: <InputAdornment position="end" sx={{ color: 'rgba(201, 162, 39, 0.3)', fontSize: '0.75rem' }}>aUEC</InputAdornment>,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#c9a227',
              fontSize: '0.9rem',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              fontWeight: 600,
              '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.3)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
              '&.Mui-focused': { boxShadow: '0 0 8px rgba(201, 162, 39, 0.3)' },
            },
          }}
          inputProps={{ min: 1, max: 999999999 }}
        />
      </Box>

      {/* Max Legs */}
      <Box sx={{ mb: 2.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: 'rgba(201, 162, 39, 0.5)', fontWeight: 600, fontSize: '0.75rem', letterSpacing: '0.1em', fontFamily: '"Orbitron", sans-serif' }}>
            最大段数
          </Typography>
        </Box>
        <TextField
          fullWidth
          size="small"
          type="number"
          value={maxLegs}
          onChange={(e) => {
            const val = Number(e.target.value);
            if (val >= 1 && val <= 10) setMaxLegs(val);
          }}
          helperText="          有效范围:1 - 10（自动附加一段清仓路线）"
          InputProps={{
            startAdornment: <InputAdornment position="start" sx={{ color: 'rgba(201, 162, 39, 0.3)' }}><Link sx={{ fontSize: 16 }} /></InputAdornment>,
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: '#c9a227',
              fontSize: '0.9rem',
              fontFamily: '"Rajdhani", sans-serif',
              fontWeight: 600,
              '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.15)' },
              '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.3)' },
              '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
              '&.Mui-focused': { boxShadow: '0 0 8px rgba(201, 162, 39, 0.3)' },
            },
            '& .MuiFormHelperText-root': {
              color: 'rgba(201, 162, 39, 0.25)',
              fontSize: '0.65rem',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              ml: 1,
              mt: 0.5,
            },
          }}
          inputProps={{ min: 1, max: 10 }}
        />
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

      {/* Search buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={() => handleSearch(false)}
          disabled={loading || !origin || !capital}
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
          {loading ? '正在规划链式路线...' : '开始链式'}
        </Button>
        <Button
          variant="outlined"
          size="large"
          onClick={() => handleSearch(true)}
          disabled={loading || !origin || !capital}
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

      {/* Tip */}
      <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.3)', fontSize: '0.65rem', display: 'block', textAlign: 'center', mt: -1, lineHeight: 1.4 }}>
        路线支持货物跨段携带 | 末尾自动附加清仓段
      </Typography>
    </Box>
  );
}

export default ChainPanel;
