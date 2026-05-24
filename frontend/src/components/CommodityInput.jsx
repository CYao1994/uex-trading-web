import { useState, useRef, useEffect } from 'react';
import { TextField, Box, Typography, Paper, IconButton, Chip, CircularProgress } from '@mui/material';
import { Add as AddIcon, Close as CloseIcon, Inventory2 } from '@mui/icons-material';
import { searchCommodities } from '../api/client';

function CommodityInput({ items, onItemsChange }) {
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    setError('');
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!val.trim()) {
      setOptions([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchCommodities(val);
        setOptions(res.data);
        if (res.data.length === 0) {
          setError('未找到匹配商品');
        }
        setShowDropdown(true);
      } catch (e) {
        setOptions([]);
        setError('搜索失败，后端服务可能未启动');
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleAdd = (commodity) => {
    const qty = parseInt(quantity) || 1;
    const existing = items.find(i => i.name === commodity.name);
    if (existing) {
      onItemsChange(items.map(i =>
        i.name === commodity.name ? { ...i, quantity: i.quantity + qty } : i
      ));
    } else {
      onItemsChange([...items, {
        name: commodity.name,
        name_zh: commodity.name_zh,
        quantity: qty,
      }]);
    }
    setQuery('');
    setQuantity('');
    setShowDropdown(false);
    setError('');
  };

  const handleRemove = (name) => {
    onItemsChange(items.filter(i => i.name !== name));
  };

  return (
    <Box>
      {/* Added items */}
      {items.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {items.map((item) => (
            <Chip
              key={item.name}
              icon={<Inventory2 sx={{ fontSize: 16 }} />}
              label={`${item.name_zh} × ${item.quantity} SCU`}
              onDelete={() => handleRemove(item.name)}
              deleteIcon={<CloseIcon />}
              sx={{
                background: 'rgba(0, 212, 255, 0.08)',
                border: '1px solid rgba(0, 212, 255, 0.25)',
                color: '#00d4ff',
                fontWeight: 600,
                '& .MuiChip-deleteIcon': { color: 'rgba(0, 212, 255, 0.5)', '&:hover': { color: '#ff3366' } },
              }}
            />
          ))}
        </Box>
      )}

      {/* Search + quantity input */}
      <Box sx={{ display: 'flex', gap: 1, position: 'relative' }}>
        <TextField
          inputRef={inputRef}
          size="small"
          placeholder="搜索商品（中英文均可）"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => { if (options.length > 0) setShowDropdown(true); }}
          InputProps={{
            startAdornment: <Inventory2 sx={{ color: 'primary.main', mr: 1, fontSize: 18 }} />,
            endAdornment: loading ? <CircularProgress size={14} /> : null,
          }}
          sx={{ flex: 1 }}
        />
        <TextField
          size="small"
          type="number"
          placeholder="SCU"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          sx={{ width: 100 }}
          inputProps={{ min: 1, style: { textAlign: 'center' } }}
        />

        {/* Dropdown */}
        {showDropdown && options.length > 0 && (
          <Paper
            ref={dropdownRef}
            sx={{
              position: 'absolute', top: '100%', left: 0, right: 100,
              zIndex: 1000, maxHeight: 200, overflow: 'auto',
              mt: 0.5,
              background: 'rgba(13, 19, 33, 0.98)',
              border: '1px solid rgba(0, 212, 255, 0.2)',
            }}
          >
            {options.map((opt) => (
              <Box
                key={opt.id}
                onClick={() => handleAdd(opt)}
                sx={{
                  px: 2, py: 1,
                  cursor: 'pointer',
                  '&:hover': { background: 'rgba(0, 212, 255, 0.08)' },
                }}
              >
                <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                  {opt.name_zh}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {opt.name}
                </Typography>
              </Box>
            ))}
          </Paper>
        )}
      </Box>

      {error && !showDropdown && (
        <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block', pl: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default CommodityInput;
