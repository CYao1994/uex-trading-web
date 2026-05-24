import { useState, useRef, useEffect } from 'react';
import { TextField, Box, Typography, Paper, CircularProgress } from '@mui/material';
import { LocationOn } from '@mui/icons-material';
import { searchTerminals } from '../api/client';

function TerminalSearch({ value, onChange, label = '出发地' }) {
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
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
        const res = await searchTerminals(val);
        setOptions(res.data);
        if (res.data.length === 0) {
          setError('未找到匹配终端');
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

  const handleSelect = (option) => {
    setQuery(option.name_zh);
    setShowDropdown(false);
    setError('');
    onChange(option);
  };

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        label={label}
        placeholder="搜索终端名称（中英文均可）"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={() => { if (options.length > 0) setShowDropdown(true); }}
        InputProps={{
          startAdornment: <LocationOn sx={{ color: 'primary.main', mr: 1, fontSize: 20 }} />,
          endAdornment: loading ? <CircularProgress size={16} /> : null,
        }}
        sx={{
          '& .MuiInputLabel-root': { color: 'text.secondary' },
          '& .MuiInputBase-input': { color: 'text.primary' },
        }}
      />

      {showDropdown && options.length > 0 && (
        <Paper
          ref={dropdownRef}
          sx={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            zIndex: 1000, maxHeight: 240, overflow: 'auto',
            mt: 0.5, p: 0,
            background: 'rgba(13, 19, 33, 0.98)',
            border: '1px solid rgba(0, 212, 255, 0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {options.map((opt) => (
            <Box
              key={opt.id}
              onClick={() => handleSelect(opt)}
              sx={{
                px: 2, py: 1.2,
                cursor: 'pointer',
                borderBottom: '1px solid rgba(0, 212, 255, 0.05)',
                '&:hover': {
                  background: 'rgba(0, 212, 255, 0.08)',
                },
                transition: 'background 0.15s',
              }}
            >
              <Typography variant="body2" sx={{ color: 'primary.main', fontWeight: 600 }}>
                {opt.name_zh}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {opt.name} · {opt.system_zh}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      {error && !showDropdown && (
        <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, display: 'block', pl: 2 }}>
          {error}
        </Typography>
      )}
    </Box>
  );
}

export default TerminalSearch;
