import { Box, Typography, Button } from '@mui/material';
import { Engineering, Refresh, CloudOff } from '@mui/icons-material';
import { useBackendStatus } from '../contexts/BackendStatus';

function MaintenanceOverlay() {
  const { showMaintenance, showBackendError, retryCheck, lastChecked } = useBackendStatus();

  if (!showMaintenance && !showBackendError) return null;

  const isMaintenance = showMaintenance;

  return (
    <Box sx={{
      position: 'fixed',
      inset: 0,
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at center, rgba(2, 8, 16, 0.97) 0%, rgba(2, 6, 12, 0.99) 100%)',
      animation: 'fadeIn 0.5s ease-out',
      '@keyframes fadeIn': {
        '0%': { opacity: 0 },
        '100%': { opacity: 1 },
      },
      pointerEvents: 'auto',
    }}>
      <Box sx={{
        textAlign: 'center',
        maxWidth: 460,
        p: 4,
        position: 'relative',
        // HUD frame
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          border: '1px solid rgba(0, 180, 255, 0.12)',
          clipPath: 'polygon(20px 0, calc(100% - 20px) 0, 100% 20px, 100% calc(100% - 20px), calc(100% - 20px) 100%, 20px 100%, 0 calc(100% - 20px), 0 20px)',
        },
        '&::after': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: '1px',
          background: isMaintenance
            ? 'linear-gradient(90deg, transparent 0%, rgba(255, 170, 0, 0.5) 30%, rgba(255, 170, 0, 0.5) 70%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(255, 68, 102, 0.5) 30%, rgba(255, 68, 102, 0.5) 70%, transparent 100%)',
        },
      }}>
        {/* Icon */}
        <Box sx={{
          width: 72, height: 72,
          mx: 'auto',
          mb: 3,
          background: isMaintenance
            ? 'linear-gradient(135deg, rgba(255, 170, 0, 0.1), rgba(200, 100, 0, 0.05))'
            : 'linear-gradient(135deg, rgba(255, 68, 102, 0.1), rgba(200, 30, 60, 0.05))',
          border: isMaintenance
            ? '1px solid rgba(255, 170, 0, 0.2)'
            : '1px solid rgba(255, 68, 102, 0.2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
        }}>
          {isMaintenance ? (
            <Engineering sx={{ fontSize: 36, color: '#ffaa00' }} />
          ) : (
            <CloudOff sx={{ fontSize: 36, color: '#ff4466' }} />
          )}
        </Box>

        {/* Title */}
        <Typography sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 700,
          fontSize: '1.1rem',
          color: isMaintenance ? '#ffaa00' : '#ff4466',
          mb: 1.5,
          letterSpacing: '0.08em',
        }}>
          {isMaintenance ? '系统维护中' : '服务暂不可用'}
        </Typography>

        {/* Description */}
        <Typography sx={{
          color: 'rgba(200, 220, 255, 0.5)',
          fontSize: '0.85rem',
          lineHeight: 1.8,
          mb: 2.5,
          fontFamily: '"Noto Sans SC", sans-serif',
        }}>
          {isMaintenance ? (
            <>
              当前为系统维护时段（每日 02:00 - 10:00 北京时间）
              <br />
              后端服务已暂停以节省资源配额
              <br />
              <Typography component="span" sx={{ color: 'rgba(0, 200, 255, 0.4)', fontSize: '0.75rem' }}>
                服务将于 10:00 自动恢复
              </Typography>
            </>
          ) : (
            <>
              后端服务暂时无法连接
              <br />
              请稍后再试或检查网络连接
            </>
          )}
        </Typography>

        {/* Time indicator (maintenance only) */}
        {isMaintenance && (
          <Box sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 1,
            px: 2,
            py: 0.75,
            mb: 2.5,
            background: 'rgba(255, 170, 0, 0.04)',
            border: '1px solid rgba(255, 170, 0, 0.1)',
            borderRadius: '2px',
          }}>
            <Box sx={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: '#ffaa00',
              animation: 'maintPulse 2s ease-in-out infinite',
              '@keyframes maintPulse': {
                '0%, 100%': { opacity: 0.3 },
                '50%': { opacity: 1 },
              },
            }} />
            <Typography sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontSize: '0.65rem',
              color: 'rgba(255, 170, 0, 0.5)',
              letterSpacing: '0.1em',
            }}>
              MAINTENANCE WINDOW ACTIVE
            </Typography>
          </Box>
        )}

        {/* Retry button */}
        <Box>
          <Button
            onClick={retryCheck}
            startIcon={<Refresh />}
            sx={{
              color: isMaintenance ? '#ffaa00' : '#ff4466',
              borderColor: isMaintenance ? 'rgba(255, 170, 0, 0.25)' : 'rgba(255, 68, 102, 0.25)',
              fontSize: '0.8rem',
              fontFamily: '"Noto Sans SC", sans-serif',
              '&:hover': {
                borderColor: isMaintenance ? '#ffaa00' : '#ff4466',
                background: isMaintenance ? 'rgba(255, 170, 0, 0.05)' : 'rgba(255, 68, 102, 0.05)',
              },
            }}
            variant="outlined"
            size="small"
          >
            重新检测
          </Button>
        </Box>

        {/* Last checked */}
        {lastChecked && (
          <Typography sx={{
            mt: 2,
            color: 'rgba(200, 220, 255, 0.15)',
            fontSize: '0.6rem',
            fontFamily: '"Rajdhani", sans-serif',
          }}>
            上次检测: {lastChecked.toLocaleTimeString('zh-CN')}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

export default MaintenanceOverlay;
