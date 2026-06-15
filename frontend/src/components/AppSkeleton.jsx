// AppSkeleton.jsx - 全局加载骨架屏
import { Box, Typography } from '@mui/material';

function AppSkeleton() {
  return (
    <Box sx={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
      gap: 3,
    }}>
      {/* 加载动画 */}
      <Box sx={{
        width: 60,
        height: 60,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Box sx={{
          width: 50,
          height: 50,
          border: '2px solid rgba(201, 162, 39, 0.1)',
          borderTop: '2px solid rgba(201, 162, 39, 0.6)',
          borderRadius: '50%',
          animation: 'loadingSpin 1s linear infinite',
        }} />
        <Box sx={{
          position: 'absolute',
          width: 30,
          height: 30,
          border: '2px solid rgba(201, 162, 39, 0.05)',
          borderBottom: '2px solid rgba(201, 162, 39, 0.4)',
          borderRadius: '50%',
          animation: 'loadingSpin 1.5s linear infinite reverse',
        }} />
      </Box>

      {/* 加载文字 */}
      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontSize: '0.75rem',
        color: 'rgba(201, 162, 39, 0.5)',
        letterSpacing: '0.1em',
      }}>
        LOADING
      </Typography>

      {/* 进度条 */}
      <Box sx={{
        width: 200,
        height: 2,
        background: 'rgba(201, 162, 39, 0.1)',
        borderRadius: '1px',
        overflow: 'hidden',
      }}>
        <Box sx={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(201, 162, 39, 0.5), transparent)',
          animation: 'shimmer 1.5s ease-in-out infinite',
        }} />
      </Box>
    </Box>
  );
}

export default AppSkeleton;
