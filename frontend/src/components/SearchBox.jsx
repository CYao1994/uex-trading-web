import { Box, Typography, TextField, InputAdornment, CircularProgress } from '@mui/material';
import { Search } from '@mui/icons-material';

function SearchBox({ searchQuery, searchResults, itemsLoading, onSearch, onResultClick, searchRef }) {
  return (
    <Box ref={searchRef} sx={{ position: 'relative', mb: 2 }}>
      <TextField
        size="small"
        fullWidth
        placeholder="搜索物品、组件、武器、舰船..."
        value={searchQuery}
        onChange={e => onSearch(e.target.value)}
        sx={{
          '& .MuiOutlinedInput-root': {
            fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
            fontSize: '0.85rem',
            color: 'rgba(255,255,255,0.8)',
            background: 'rgba(0, 10, 20, 0.5)',
            '& fieldset': { borderColor: 'rgba(201, 162, 39, 0.2)' },
            '&:hover fieldset': { borderColor: 'rgba(201, 162, 39, 0.35)' },
            '&.Mui-focused fieldset': { borderColor: 'rgba(201, 162, 39, 0.5)' },
          },
        }}
        InputProps={{
          startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18, color: 'rgba(201, 162, 39, 0.5)' }} /></InputAdornment>,
          endAdornment: itemsLoading ? <InputAdornment position="end"><CircularProgress size={16} sx={{ color: '#c9a227' }} /></InputAdornment> : null,
        }}
      />
      {searchResults.length > 0 && (
        <Box sx={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          zIndex: 10,
          mt: 0.5,
          background: 'rgba(3, 12, 25, 0.97)',
          border: '1px solid rgba(201, 162, 39, 0.2)',
          maxHeight: 360,
          overflow: 'auto',
          '&::-webkit-scrollbar': { width: 4 },
          '&::-webkit-scrollbar-thumb': { background: 'rgba(201, 162, 39, 0.2)', borderRadius: 2 },
        }}>
          {searchResults.map((item, idx) => (
            <Box
              key={`${item.tab}-${item.id || idx}`}
              onClick={() => onResultClick(item)}
              sx={{
                px: 2, py: 1,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.15s ease',
                '&:hover': {
                  background: 'rgba(201, 162, 39, 0.08)',
                },
              }}
            >
              <Box sx={{
                px: 0.75,
                py: 0.25,
                borderRadius: '2px',
                background: item.tab === 'ships' ? 'rgba(201, 162, 39, 0.12)' : item.tab === 'ship_weapons' ? 'rgba(255, 102, 68, 0.12)' : 'rgba(68, 187, 255, 0.12)',
                border: `1px solid ${item.tab === 'ships' ? 'rgba(201, 162, 39, 0.25)' : item.tab === 'ship_weapons' ? 'rgba(255, 102, 68, 0.25)' : 'rgba(68, 187, 255, 0.25)'}`,
                flexShrink: 0,
              }}>
                <Typography sx={{
                  fontSize: '0.55rem',
                  fontFamily: '"Noto Sans SC", sans-serif',
                  color: item.tab === 'ships' ? '#c9a227' : item.tab === 'ship_weapons' ? '#ff6644' : '#44bbff',
                  fontWeight: 600,
                }}>
                  {item.type_label}
                </Typography>
              </Box>
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography sx={{
                  fontSize: '0.8rem',
                  fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
                  color: 'rgba(255,255,255,0.85)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {item.name_zh || item.name}
                </Typography>
                {item.name_zh && item.name && item.name_zh !== item.name && (
                  <Typography sx={{
                    fontSize: '0.65rem',
                    fontFamily: '"Rajdhani", sans-serif',
                    color: 'rgba(255,255,255,0.5)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {item.name}
                  </Typography>
                )}
              </Box>
              <Typography sx={{
                fontSize: '0.55rem',
                fontFamily: '"Rajdhani", sans-serif',
                color: 'rgba(201, 162, 39, 0.35)',
                flexShrink: 0,
              }}>
                {item.tab === 'ships' ? '舰船' : item.tab === 'ship_weapons' ? '武器' : '组件'}
              </Typography>
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default SearchBox;
