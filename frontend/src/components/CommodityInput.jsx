// CommodityInput.jsx - 商品搜索（含历史记录）
import { useState, useRef, useEffect } from 'react';
import { TextField, Box, Typography, Paper, Chip, CircularProgress, IconButton, Button } from '@mui/material';
import { Add as AddIcon, Remove as RemoveIcon, Close as CloseIcon, Inventory2, Check as CheckIcon, DeleteSweep, History } from '@mui/icons-material';
import { searchCommodities } from '../api/client';
import { useSearchHistory } from '../hooks/useSearchHistory';

function EditableScuChip({ item, onQuantityChange, onRemove, index }) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(String(item.quantity));
  const [removing, setRemoving] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleConfirm = () => {
    const qty = parseInt(editValue) || 1;
    if (qty < 1) {
      setEditValue('1');
      onQuantityChange(item.name, 1);
    } else {
      onQuantityChange(item.name, qty);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleConfirm();
    else if (e.key === 'Escape') {
      setEditValue(String(item.quantity));
      setEditing(false);
    }
  };

  const handleRemove = () => {
    setRemoving(true);
    setTimeout(() => onRemove(item.name), 180);
  };

  const handleIncrement = (e) => {
    e.stopPropagation();
    onQuantityChange(item.name, item.quantity + 1);
  };

  const handleDecrement = (e) => {
    e.stopPropagation();
    if (item.quantity > 1) {
      onQuantityChange(item.name, item.quantity - 1);
    }
  };

  if (removing) {
    return (
      <Chip
        icon={<Inventory2 sx={{ fontSize: 16 }} />}
        label={`${item.name_zh} × ${item.quantity} SCU`}
        className="chip-pop-out"
        sx={{
          background: 'rgba(255, 51, 102, 0.08)',
          border: '1px solid rgba(255, 51, 102, 0.25)',
          color: '#ff3366',
          fontWeight: 600,
        }}
      />
    );
  }

  if (editing) {
    return (
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1,
          py: 0.3,
          background: 'rgba(201, 162, 39, 0.12)',
          border: '1px solid rgba(201, 162, 39, 0.4)',
          borderRadius: '16px',
          boxShadow: '0 0 8px rgba(201, 162, 39, 0.15)',
        }}
      >
        <Inventory2 sx={{ fontSize: 16, color: '#c9a227' }} />
        <Typography sx={{
          color: '#c9a227',
          fontWeight: 600,
          fontSize: '0.8rem',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}>
          {item.name_zh}
        </Typography>
        <Typography sx={{ color: 'rgba(201, 162, 39, 0.5)', fontSize: '0.75rem', mx: 0.2 }}>
          ×
        </Typography>
        <input
          ref={inputRef}
          type="number"
          min="1"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleConfirm}
          style={{
            width: 48,
            background: 'rgba(201, 162, 39, 0.08)',
            border: '1px solid rgba(201, 162, 39, 0.3)',
            borderRadius: '3px',
            color: '#c9a227',
            fontSize: '0.8rem',
            fontWeight: 700,
            textAlign: 'center',
            padding: '1px 4px',
            outline: 'none',
            fontFamily: '"Orbitron", "Rajdhani", sans-serif',
          }}
        />
        <Typography sx={{ color: 'rgba(201, 162, 39, 0.5)', fontSize: '0.7rem' }}>
          SCU
        </Typography>
        <Box
          component="span"
          onClick={handleConfirm}
          sx={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            color: '#00ff88',
            ml: 0.3,
            '&:hover': { transform: 'scale(1.1)' },
            transition: 'transform 0.15s',
          }}
        >
          <CheckIcon sx={{ fontSize: 16 }} />
        </Box>
      </Box>
    );
  }

  // 正常显示模式：名称 × SCU [-][+][×]
  return (
    <Box
      className="chip-pop-in"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.3,
        px: 1.2,
        py: 0.5,
        background: 'rgba(201, 162, 39, 0.08)',
        border: '1px solid rgba(201, 162, 39, 0.25)',
        borderRadius: '16px',
        cursor: 'pointer',
        animationDelay: `${(index || 0) * 0.06}s`,
        transition: 'all 0.2s',
        '&:hover': {
          background: 'rgba(201, 162, 39, 0.15)',
          border: '1px solid rgba(201, 162, 39, 0.4)',
          boxShadow: '0 0 8px rgba(201, 162, 39, 0.1)',
        },
      }}
      onClick={() => setEditing(true)}
    >
      <Inventory2 sx={{ fontSize: 16, color: '#c9a227' }} />
      <Typography sx={{
        color: '#c9a227',
        fontWeight: 600,
        fontSize: '0.8rem',
        fontFamily: '"Noto Sans SC", sans-serif',
      }}>
        {item.name_zh}
      </Typography>
      <Typography sx={{ color: 'rgba(201, 162, 39, 0.5)', fontSize: '0.75rem', mx: 0.2 }}>
        ×
      </Typography>
      <Typography sx={{
        color: '#c9a227',
        fontWeight: 700,
        fontSize: '0.8rem',
        fontFamily: '"Orbitron", "Rajdhani", sans-serif',
      }}>
        {item.quantity}
      </Typography>
      <Typography sx={{ color: 'rgba(201, 162, 39, 0.5)', fontSize: '0.7rem', mr: 0.3 }}>
        SCU
      </Typography>
      {/* - 按钮 */}
      <IconButton
        size="small"
        onClick={handleDecrement}
        disabled={item.quantity <= 1}
        sx={{
          width: 20,
          height: 20,
          p: 0,
          borderRadius: '4px',
          background: 'rgba(201, 162, 39, 0.1)',
          border: '1px solid rgba(201, 162, 39, 0.2)',
          color: item.quantity <= 1 ? 'rgba(201, 162, 39, 0.2)' : 'rgba(201, 162, 39, 0.6)',
          '&:hover': {
            background: 'rgba(201, 162, 39, 0.2)',
            color: '#c9a227',
          },
          '&.Mui-disabled': {
            background: 'rgba(201, 162, 39, 0.03)',
            color: 'rgba(201, 162, 39, 0.15)',
          },
          transition: 'all 0.15s',
        }}
      >
        <RemoveIcon sx={{ fontSize: 12 }} />
      </IconButton>
      {/* + 按钮 */}
      <IconButton
        size="small"
        onClick={handleIncrement}
        sx={{
          width: 20,
          height: 20,
          p: 0,
          borderRadius: '4px',
          background: 'rgba(201, 162, 39, 0.1)',
          border: '1px solid rgba(201, 162, 39, 0.2)',
          color: 'rgba(201, 162, 39, 0.6)',
          '&:hover': {
            background: 'rgba(201, 162, 39, 0.2)',
            color: '#c9a227',
          },
          transition: 'all 0.15s',
        }}
      >
        <AddIcon sx={{ fontSize: 12 }} />
      </IconButton>
      {/* × 删除按钮 */}
      <IconButton
        size="small"
        onClick={(e) => { e.stopPropagation(); handleRemove(); }}
        sx={{
          width: 20,
          height: 20,
          p: 0,
          borderRadius: '4px',
          background: 'rgba(255, 51, 102, 0.06)',
          border: '1px solid rgba(255, 51, 102, 0.15)',
          color: 'rgba(255, 51, 102, 0.5)',
          '&:hover': {
            background: 'rgba(255, 51, 102, 0.15)',
            color: '#ff3366',
          },
          transition: 'all 0.15s',
        }}
      >
        <CloseIcon sx={{ fontSize: 11 }} />
      </IconButton>
    </Box>
  );
}

function CommodityInput({ items, onItemsChange }) {
  const [query, setQuery] = useState('');
  const [quantity, setQuantity] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory('commodity_search_history');

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
        setShowHistory(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (val) => {
    setQuery(val);
    setError('');
    setShowHistory(false);
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
        let msg = '搜索失败，请稍后重试';
        if (e.code === 'ERR_NETWORK' || e.code === 'ERR_CONNECTION_REFUSED') {
          const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
          msg = isLocal ? '后端服务未启动，请先运行后端' : '网络连接失败，请检查网络后重试';
        } else if (e.code === 'ECONNABORTED' || (e.message && e.message.includes('timeout'))) {
          msg = '搜索超时，请稍后重试';
        } else if (e.response) {
          const status = e.response.status;
          if (status >= 500) msg = `服务暂时不可用 (${status})，请稍后重试`;
          else if (status === 404) msg = '搜索服务异常，请联系开发者';
          else if (status >= 400) msg = `请求错误 (${status})`;
        }
        setError(msg);
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
    // 添加到历史记录
    addToHistory({
      id: commodity.id,
      name: commodity.name,
      name_zh: commodity.name_zh,
    });
    setQuery('');
    setQuantity('');
    setShowDropdown(false);
    setError('');
  };

  const handleRemove = (name) => {
    onItemsChange(items.filter(i => i.name !== name));
  };

  const handleQuantityChange = (name, newQty) => {
    onItemsChange(items.map(i =>
      i.name === name ? { ...i, quantity: newQty } : i
    ));
  };

  const handleClearAll = () => {
    onItemsChange([]);
  };

  const handleHistoryClick = (item) => {
    handleSearch(item.name_zh);
  };

  const handleFocus = () => {
    if (query.trim()) {
      if (options.length > 0) {
        setShowDropdown(true);
      }
    } else if (history.length > 0) {
      setShowHistory(true);
    }
  };

  return (
    <Box>
      {/* Hint */}
      {items.length > 0 && (
        <Typography sx={{
          color: 'rgba(201, 162, 39, 0.25)',
          fontSize: '0.65rem',
          mb: 1,
          fontFamily: '"Noto Sans SC", sans-serif',
          letterSpacing: '0.02em',
        }}>
          💡 点击货物名称可编辑SCU数量 · 点击 +/- 调整数量
        </Typography>
      )}

      {/* Added items */}
      {items.length > 0 && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          {items.map((item, idx) => (
            <EditableScuChip
              key={item.name}
              item={item}
              index={idx}
              onQuantityChange={handleQuantityChange}
              onRemove={handleRemove}
            />
          ))}
        </Box>
      )}

      {/* Clear all button */}
      {items.length > 0 && (
        <Button
          size="small"
          onClick={handleClearAll}
          startIcon={<DeleteSweep sx={{ fontSize: 14 }} />}
          sx={{
            mb: 2,
            fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'rgba(255, 51, 102, 0.5)',
            borderColor: 'rgba(255, 51, 102, 0.2)',
            textTransform: 'none',
            '&:hover': {
              color: '#ff3366',
              borderColor: 'rgba(255, 51, 102, 0.4)',
              background: 'rgba(255, 51, 102, 0.06)',
            },
            transition: 'all 0.2s',
          }}
          variant="outlined"
        >
          清空清单
        </Button>
      )}

      {/* Search + quantity input */}
      <Box sx={{ display: 'flex', gap: 1, position: 'relative' }}>
        <TextField
          inputRef={inputRef}
          size="small"
          placeholder="搜索商品（中英文均可）"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={handleFocus}
          InputProps={{
            startAdornment: <Inventory2 sx={{ color: 'primary.main', mr: 1, fontSize: 18 }} />,
            endAdornment: loading ? <CircularProgress size={14} /> : null,
          }}
          sx={{ flex: 1 }}
        />
        <Button
          variant="outlined"
          size="small"
          disabled={!query.trim() || options.length === 0}
          onClick={() => handleAdd(options[0])}
          sx={{
            minWidth: 44,
            px: 1,
            borderColor: query.trim() && options.length > 0 ? '#00ddaa' : 'grey.500',
            color: query.trim() && options.length > 0 ? '#00ddaa' : 'grey.500',
            '&.Mui-disabled': {
              borderColor: 'grey.500',
              color: 'grey.500',
            },
            '&:hover': {
              borderColor: '#00ddaa',
              background: 'rgba(0, 221, 170, 0.08)',
            },
          }}
        >
          <AddIcon sx={{ fontSize: 18 }} />
        </Button>
        <TextField
          size="small"
          type="number"
          placeholder="SCU"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          sx={{ width: 100 }}
          inputProps={{ min: 1, style: { textAlign: 'center' } }}
        />

        {/* 历史记录下拉 */}
        {showHistory && history.length > 0 && !query.trim() && (
          <Paper
            ref={dropdownRef}
            sx={{
              position: 'absolute', top: '100%', left: 0, right: '110px',
              zIndex: 1000, maxHeight: 200, overflow: 'auto',
              mt: 0.5,
              background: 'rgba(13, 19, 33, 0.98)',
              border: '1px solid rgba(201, 162, 39, 0.2)',
            }}
          >
            <Box sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              px: 2, py: 1,
              borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
            }}>
              <Typography sx={{ 
                color: 'rgba(201, 162, 39, 0.6)', 
                fontSize: '0.65rem',
                fontFamily: '"Orbitron", sans-serif',
                letterSpacing: '0.05em',
              }}>
                <History sx={{ fontSize: 11, mr: 0.5, verticalAlign: 'middle' }} />
                最近搜索
              </Typography>
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); clearHistory(); setShowHistory(false); }}
                sx={{ color: 'rgba(201, 162, 39, 0.4)', '&:hover': { color: '#c9a227' } }}
              >
                <DeleteSweep sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
            {history.map((item) => (
              <Box
                key={item.id}
                onClick={() => handleHistoryClick(item)}
                sx={{
                  px: 2, py: 1,
                  cursor: 'pointer',
                  borderBottom: '1px solid rgba(201, 162, 39, 0.05)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  '&:hover': { background: 'rgba(201, 162, 39, 0.08)' },
                }}
              >
                <Typography variant="body2" sx={{ color: 'rgba(201, 162, 39, 0.8)', fontWeight: 500 }}>
                  {item.name_zh}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={(e) => { e.stopPropagation(); removeFromHistory(item.id); }}
                  sx={{ color: 'rgba(201, 162, 39, 0.3)', '&:hover': { color: '#ff6666' } }}
                >
                  <CloseIcon sx={{ fontSize: 12 }} />
                </IconButton>
              </Box>
            ))}
          </Paper>
        )}

        {/* Dropdown with stagger */}
        {showDropdown && options.length > 0 && (
          <Paper
            ref={dropdownRef}
            sx={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              zIndex: 1000, maxHeight: 200, overflow: 'auto',
              mt: 0.5,
              background: 'rgba(13, 19, 33, 0.98)',
              border: '1px solid rgba(201, 162, 39, 0.2)',
            }}
          >
            {options.map((opt, idx) => (
              <Box
                key={opt.id}
                className="stagger-item"
                sx={{
                  px: 2, py: 1,
                  animationDelay: `${idx * 0.04}s`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  '&:hover': { background: 'rgba(201, 162, 39, 0.08)' },
                }}
              >
                <Box 
                  onClick={() => handleAdd(opt)}
                  sx={{ flex: 1, cursor: 'pointer' }}
                >
                  <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                    {opt.name_zh}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {opt.name}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); handleAdd(opt); }}
                  sx={{ 
                    color: 'rgba(0, 221, 170, 0.6)',
                    '&:hover': { 
                      color: '#00ddaa',
                      background: 'rgba(0, 221, 170, 0.1)',
                    }
                  }}
                >
                  <AddIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </Box>
            ))}
          </Paper>
        )}

        {/* Playful empty search result */}
        {showDropdown && options.length === 0 && !loading && query.trim() && (
          <Paper
            ref={dropdownRef}
            sx={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              zIndex: 1000, mt: 0.5, p: 2, textAlign: 'center',
              background: 'rgba(13, 19, 33, 0.98)',
              border: '1px solid rgba(201, 162, 39, 0.2)',
            }}
          >
            <Typography sx={{ color: 'rgba(201, 162, 39, 0.4)', fontSize: '0.75rem' }}>
              📦 货舱里没找到这个商品
            </Typography>
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
