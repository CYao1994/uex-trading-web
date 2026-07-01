import { Box, Typography } from '@mui/material';
import { SearchOff } from '@mui/icons-material';

function EmptyState({ icon, message = '暂无数据', sub = '' }) {
  return (
    <Box sx={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      py: 4, opacity: 0.6,
    }}>
      {icon || <SearchOff sx={{ fontSize: 36, color: 'rgba(201,162,39,0.3)', mb: 1 }} />}
      <Typography sx={{
        fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
        fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)',
      }}>
        {message}
      </Typography>
      {sub && (
        <Typography sx={{
          fontFamily: '"Rajdhani",sans-serif',
          fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', mt: 0.5,
        }}>
          {sub}
        </Typography>
      )}
    </Box>
  );
}

export default EmptyState;
