// TerminalSearch.jsx - 终端搜索（含历史记录�?import { useState, useRef, useEffect } from 'react';
import { TextField, Box, Typography, Paper, CircularProgress, IconButton } from '@mui/material';
import { LocationOn, History, Close, DeleteSweep } from '@mui/icons-material';
import { loadAllTerminals } from '../api/client';
import { useSearchHistory } from '../hooks/useSearchHistory';

function TerminalSearch({ value, onChange, label = '出发�? }) {
  const [query, setQuery] = useState(value || '');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const debounceRef = useRef(null);

  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory('terminal_search_history');

  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          inputRef.current && !inputRef.current.contains(event.target)) {
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
        const allTerminals = await loadAllTerminals();
        const q = val.toLowerCase().trim();
        const filtered = q ? allTerminals.filter(t => {
          const name = (t.name || '').toLowerCase();
          const zh = (t.name_zh || '').toLowerCase();
          const sys = (t.system || '').toLowerCase();
          const sysZh = (t.system_zh || '').toLowerCase();
          return name.includes(q) || zh.includes(q) || sys.includes(q) || sysZh.includes(q);
        }).slice(0, 20) : allTerminals.slice(0, 20);
        setOptions(filtered);
        if (filtered.length === 0) {
          setError('未找到匹配终�?);
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
          if (status >= 500) msg = `服务暂时不可�?(${status})，请稍后重试`;
          else if (status === 404) msg = '搜索服务异常，请联系开发�?;
          else if (status >= 400) msg = `请求错误 (${status})`;
        }
        setError(msg);
        setShowDropdown(false);
      } finally {
        setLoading(false);
      }
    }, 300);
  };

  const handleSelect = (option) => {
    setQuery(option.name_zh);
    setShowDropdown(false);
    setShowHistory(false);
    setError('');
    // 添加到历史记�?    addToHistory({
      id: option.id,
      name: option.name,
      name_zh: option.name_zh,
      system_zh: option.system_zh,
    });
    onChange(option);
  };

  const handleHistoryClick = (item) => {
    setQuery(item.name_zh);
    setShowHistory(false);
    setShowDropdown(false);
    // 模拟选择
    onChange({
      id: item.id,
      name: item.name,
      name_zh: item.name_zh,
      system_zh: item.system_zh,
    });
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
    <Box sx={{ position: 'relative', width: '100%' }}>
      <TextField
        inputRef={inputRef}
        fullWidth
        label={label}
        placeholder="搜索终端名称（中英文均可�?
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        onFocus={handleFocus}
        InputProps={{
          startAdornment: <LocationOn sx={{ color: 'rgba(201, 162, 39, 0.3)', mr: 1, fontSize: 18 }} />,
          endAdornment: loading ? <CircularProgress size={16} /> : null,
        }}
        sx={{
          '& .MuiInputLabel-root': { color: 'rgba(201, 162, 39, 0.5)' },
          '& .MuiInputBase-input': { color: '#c9a227', fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif', fontSize: '0.85rem' },
          '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.15)' }, '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.3)' },
            '&.Mui-focused': {
              boxShadow: '0 0 8px rgba(201, 162, 39, 0.3)',
            },
            '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)',
            },
          },
        }}
      />

      {/* 搜索结果下拉 */}
      {showDropdown && options.length > 0 && (
        <Paper
          ref={dropdownRef}
          sx={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            zIndex: 1000, maxHeight: 240, overflow: 'auto',
            mt: 0.5, p: 0,
            background: 'rgba(13, 19, 33, 0.98)',
            border: '1px solid rgba(201, 162, 39, 0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {options.map((opt, idx) => (
            <Box
              key={opt.id}
              onClick={() => handleSelect(opt)}
              className="stagger-item"
              sx={{
                px: 2, py: 1.2,
                cursor: 'pointer',
                borderBottom: '1px solid rgba(201, 162, 39, 0.05)',
                animationDelay: `${idx * 0.04}s`,
                '&:hover': {
                  background: 'rgba(201, 162, 39, 0.08)',
                },
                transition: 'background 0.15s',
              }}
            >
              <Typography variant="body2" sx={{ color: '#c9a227', fontWeight: 600 }}>
                {opt.name_zh}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.5)' }}>
                {opt.name} · {opt.system_zh}
              </Typography>
            </Box>
          ))}
        </Paper>
      )}

      {/* 历史记录下拉 */}
      {showHistory && history.length > 0 && !query.trim() && (
        <Paper
          ref={dropdownRef}
          sx={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            zIndex: 1000, maxHeight: 280, overflow: 'auto',
            mt: 0.5,
            background: 'rgba(13, 19, 33, 0.98)',
            border: '1px solid rgba(201, 162, 39, 0.2)',
            backdropFilter: 'blur(10px)',
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
              fontSize: '0.7rem',
              fontFamily: '"Orbitron", sans-serif',
              letterSpacing: '0.05em',
            }}>
              <History sx={{ fontSize: 12, mr: 0.5, verticalAlign: 'middle' }} />
              最近搜�?            </Typography>
            <IconButton 
              size="small" 
              onClick={(e) => { e.stopPropagation(); clearHistory(); setShowHistory(false); }}
              sx={{ color: 'rgba(201, 162, 39, 0.4)', '&:hover': { color: '#c9a227' } }}
            >
              <DeleteSweep sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
          {history.map((item, _idx) => (
            <Box
              key={item.id}
              onClick={() => handleHistoryClick(item)}
              sx={{
                px: 2, py: 1.2,
                cursor: 'pointer',
                borderBottom: '1px solid rgba(201, 162, 39, 0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                '&:hover': {
                  background: 'rgba(201, 162, 39, 0.08)',
                },
                transition: 'background 0.15s',
              }}
            >
              <Box>
                <Typography variant="body2" sx={{ color: 'rgba(201, 162, 39, 0.8)', fontWeight: 500 }}>
                  {item.name_zh}
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.35)' }}>
                  {item.system_zh}
                </Typography>
              </Box>
              <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); removeFromHistory(item.id); }}
                sx={{ color: 'rgba(201, 162, 39, 0.3)', '&:hover': { color: '#ff6666' } }}
              >
                <Close sx={{ fontSize: 12 }} />
              </IconButton>
            </Box>
          ))}
        </Paper>
      )}

      {/* 空搜索结�?*/}
      {showDropdown && options.length === 0 && !loading && query.trim() && (
        <Paper
          ref={dropdownRef}
          sx={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            zIndex: 1000, mt: 0.5, p: 2.5, textAlign: 'center',
            background: 'rgba(13, 19, 33, 0.98)',
            border: '1px solid rgba(201, 162, 39, 0.2)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Typography sx={{ color: 'rgba(201, 162, 39, 0.4)', fontSize: '0.8rem', mb: 0.5 }}>
            星图中未找到匹配的终�?          </Typography>
          <Typography sx={{ color: 'rgba(201, 162, 39, 0.2)', fontSize: '0.65rem' }}>
            试试换一个关键词�?          </Typography>
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
