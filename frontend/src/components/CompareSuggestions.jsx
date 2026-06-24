import { Box, Typography, Chip } from '@mui/material';

function CompareSuggestions({ suggestedItems, compareItems, onCompareItemClick }) {
  return (
    <Box sx={{ mb: 1.5, p: 1, background: 'rgba(0,221,170,0.04)', border: '1px solid rgba(0,221,170,0.12)', borderRadius: '4px' }}>
      <Typography sx={{ fontSize: '0.65rem', color: '#00ddaa', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', mb: 0.5 }}>
        同类推荐 ({suggestedItems.length})
      </Typography>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {suggestedItems.map(item => {
          const isSel = compareItems.some(i => i.id === item.id);
          return (
            <Chip key={item.id} size="small"
              label={item.name_zh || item.name}
              onClick={() => onCompareItemClick(item)}
              sx={{
                background: isSel ? 'rgba(0,221,170,0.15)' : 'rgba(255,255,255,0.05)',
                border: `1px solid ${isSel ? 'rgba(0,221,170,0.4)' : 'rgba(255,255,255,0.08)'}`,
                color: isSel ? '#00ddaa' : 'rgba(255,255,255,0.6)',
                fontSize: '0.6rem', cursor: 'pointer',
              }} />
          );
        })}
      </Box>
    </Box>
  );
}

export default CompareSuggestions;
