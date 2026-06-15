import { useMemo } from 'react';
import { Box, Typography } from '@mui/material';
import { RocketLaunch } from '@mui/icons-material';

// Star Citizen flavored loading messages
const LOADING_MESSAGES = [
  '正在量子跃迁...',
  '正在扫描星图...',
  '正在计算最优航线...',
  '正在分析市场价格...',
  '正在查询终端数据...',
  '正在规划贸易路线...',
  '正在连接UEX数据库...',
  '正在优化路径算法...',
  '正在加载商品信息...',
  '正在同步价格数据...',
  '正在构建距离矩阵...',
  '正在验证路线可行性...',
  '正在计算预期收益...',
  '正在与AI副驾驶协调...',
  '正在准备量子引擎...',
];

const LOADING_DETAILS = [
  '正在查询 UEX 星际数据库...',
  '正在分析各终端收购价格...',
  '正在计算站点间量子距离...',
  '正在优化多商品配送路线...',
  '正在评估库存和需求量...',
  '正在比较最短距离和最高利润...',
  '正在生成详细的路线报告...',
  '正在准备可视化路线图...',
];

function LoadingOverlay({ message }) {
  // Pick a random message per mount - stays consistent during loading
  const displayMessage = useMemo(() => {
    // Use provided message or pick random
    if (message) return message;
    return LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
  }, [message]);

  const displayDetail = useMemo(() => {
    return LOADING_DETAILS[Math.floor(Math.random() * LOADING_DETAILS.length)];
  }, []);

  return (
    <Box sx={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(2, 8, 16, 0.92)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
    }}>
      {/* HUD Quantum Jump Effect */}
      <Box sx={{ position: 'relative', width: 130, height: 130, mb: 3 }}>
        {/* Outer hex ring */}
        <Box sx={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          border: '2px solid rgba(201, 162, 39, 0.2)',
          animation: 'quantumPulse 2.5s ease-in-out infinite',
        }} />
        {/* Inner ring */}
        <Box sx={{
          position: 'absolute', top: '18%', left: '18%', width: '64%', height: '64%',
          clipPath: 'polygon(50% 0%, 93% 25%, 93% 75%, 50% 100%, 7% 75%, 7% 25%)',
          border: '1.5px solid rgba(201, 162, 39, 0.35)',
          animation: 'quantumPulse 2.5s ease-in-out 0.4s infinite reverse',
        }} />
        {/* Center ship */}
        <Box sx={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          animation: 'quantumFlicker 1.5s ease-in-out infinite',
        }}>
          <RocketLaunch sx={{ fontSize: 32, color: '#c9a227' }} />
        </Box>
        {/* Scanning particles */}
        {[...Array(8)].map((_, i) => (
          <Box key={i} sx={{
            position: 'absolute', top: '50%', left: '50%',
            width: 2, height: 2, borderRadius: '50%',
            background: i % 2 === 0 ? '#c9a227' : '#9a7a1a',
            boxShadow: '0 0 4px rgba(201, 162, 39, 0.5)',
            animation: `particle${i} 2.5s linear infinite`,
          }} />
        ))}
      </Box>

      <Typography variant="h5" sx={{
        fontFamily: '"Orbitron", sans-serif',
        color: '#c9a227',
        fontWeight: 600,
        letterSpacing: '0.12em',
        fontSize: '1.2rem',
        textShadow: '0 0 15px rgba(201, 162, 39, 0.4), 0 0 30px rgba(154, 122, 26, 0.2)',
        animation: 'hudFlicker 4s ease-in-out infinite',
      }}>
        {displayMessage}
      </Typography>
      <Typography variant="body2" sx={{
        color: 'rgba(201, 162, 39, 0.35)', mt: 1,
        fontSize: '0.8rem', letterSpacing: '0.05em',
      }}>
        {displayDetail}
      </Typography>
    </Box>
  );
}

export default LoadingOverlay;
