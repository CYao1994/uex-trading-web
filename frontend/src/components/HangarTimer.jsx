// HangarTimer.jsx - Executive Hangar Timer
import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { Lock, LockOpen, OpenInNew } from '@mui/icons-material';

// Hangar cycle parameters
const CYCLE_DRIFT_MS = 266;
const DESIGN_ONLINE_MIN = 65;
const DESIGN_OFFLINE_MIN = 120;
const DESIGN_CYCLE_MIN = DESIGN_ONLINE_MIN + DESIGN_OFFLINE_MIN;
const DESIGN_ONLINE_MS = DESIGN_ONLINE_MIN * 60 * 1000;
const DESIGN_CYCLE_MS = DESIGN_CYCLE_MIN * 60 * 1000;
const CYCLE_DURATION = DESIGN_CYCLE_MS + CYCLE_DRIFT_MS;
const OPEN_DURATION = Math.round(CYCLE_DURATION * DESIGN_ONLINE_MS / DESIGN_CYCLE_MS);
const CLOSE_DURATION = CYCLE_DURATION - OPEN_DURATION;
const INITIAL_OPEN_TIME = new Date('2026-07-01T09:42:31.076-04:00');

// Reference URL for calibration
const REFERENCE_URL = 'https://exec.xyxyll.com/';

function getNextStatusChange(currentTime) {
  let elapsedTimeSinceInitialOpen = currentTime - INITIAL_OPEN_TIME;
  let timeInCurrentCycle = elapsedTimeSinceInitialOpen % CYCLE_DURATION;

  if (timeInCurrentCycle < OPEN_DURATION) {
    return {
      status: 'ONLINE',
      nextChangeTime: new Date(currentTime.getTime() + (OPEN_DURATION - timeInCurrentCycle))
    };
  } else {
    let remainingCloseDuration = timeInCurrentCycle - OPEN_DURATION;
    return {
      status: 'OFFLINE',
      nextChangeTime: new Date(currentTime.getTime() + (CLOSE_DURATION - remainingCloseDuration))
    };
  }
}

function getIndicatorColors(currentTime) {
  let elapsedTimeSinceInitialOpen = currentTime - INITIAL_OPEN_TIME;
  let timeInCurrentCycle = elapsedTimeSinceInitialOpen % CYCLE_DURATION;

  if (timeInCurrentCycle < OPEN_DURATION) {
    const progress = timeInCurrentCycle / OPEN_DURATION;
    if (progress < 0.2) return ['green', 'green', 'green', 'green', 'green'];
    if (progress < 0.4) return ['green', 'green', 'green', 'green', 'empty'];
    if (progress < 0.6) return ['green', 'green', 'green', 'empty', 'empty'];
    if (progress < 0.8) return ['green', 'green', 'empty', 'empty', 'empty'];
    if (progress < 0.95) return ['green', 'empty', 'empty', 'empty', 'empty'];
    return ['empty', 'empty', 'empty', 'empty', 'empty'];
  } else {
    const progress = (timeInCurrentCycle - OPEN_DURATION) / CLOSE_DURATION;
    if (progress < 0.2) return ['red', 'red', 'red', 'red', 'red'];
    if (progress < 0.4) return ['green', 'red', 'red', 'red', 'red'];
    if (progress < 0.6) return ['green', 'green', 'red', 'red', 'red'];
    if (progress < 0.8) return ['green', 'green', 'green', 'red', 'red'];
    return ['green', 'green', 'green', 'green', 'red'];
  }
}

function formatTime(ms) {
  let minutes = Math.floor(ms / 1000 / 60);
  let seconds = Math.floor((ms / 1000) % 60);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function formatDateTime(date) {
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function IndicatorLight({ color, index: _index }) {
  const getColor = () => {
    switch (color) {
      case 'green': return '#4CAF50';
      case 'red': return '#f44336';
      default: return 'rgba(255,255,255,0.1)';
    }
  };

  return (
    <Box
      sx={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: getColor(),
        border: `2px solid ${color === 'empty' ? 'rgba(255,255,255,0.2)' : getColor()}`,
        boxShadow: color !== 'empty' ? `0 0 8px ${getColor()}40` : 'none',
        transition: 'all 0.5s ease',
      }}
    />
  );
}

function HangarTimer() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Daily calibration check
  useEffect(() => {
    const checkCalibration = async () => {
      const today = new Date().toDateString();
      const stored = localStorage.getItem('hangar_calibration_date');
      
      if (stored !== today) {
        try {
          await fetch(REFERENCE_URL, { mode: 'no-cors' });
          localStorage.setItem('hangar_calibration_date', today);
        } catch {
          // Silently fail
        }
      }
    };
    
    checkCalibration();
    // Check every hour
    const interval = setInterval(checkCalibration, 3600000);
    return () => clearInterval(interval);
  }, []);

  const { status, nextChangeTime } = useMemo(() => {
    return getNextStatusChange(currentTime);
  }, [currentTime]);

  const indicatorColors = useMemo(() => {
    return getIndicatorColors(currentTime);
  }, [currentTime]);

  const remainingTime = useMemo(() => {
    return Math.max(0, nextChangeTime - currentTime);
  }, [currentTime, nextChangeTime]);

  const upcomingSchedule = useMemo(() => {
    const openEvents = [];
    const closeEvents = [];
    let tempTime = new Date(currentTime);

    for (let i = 0; i < 10 && (openEvents.length < 2 || closeEvents.length < 2); i++) {
      const { status: nextStatus, nextChangeTime: nextChange } = getNextStatusChange(tempTime);

      if (nextStatus === 'ONLINE' && closeEvents.length < 2) {
        closeEvents.push({ type: 'CLOSED', time: nextChange, isOnline: false });
      } else if (nextStatus === 'OFFLINE' && openEvents.length < 2) {
        openEvents.push({ type: 'OPEN', time: nextChange, isOnline: true });
      }

      tempTime = new Date(nextChange.getTime() + 1000);
    }

    const allEvents = [...openEvents, ...closeEvents];
    allEvents.sort((a, b) => a.time - b.time);
    return allEvents;
  }, [currentTime]);

  return (
    <Box sx={{
      background: 'rgba(3, 12, 25, 0.92)',
      border: '1px solid rgba(201, 162, 39, 0.12)',
      borderRadius: '4px',
      p: 2,
      position: 'relative',
      overflow: 'hidden',
      backdropFilter: 'blur(8px)',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.4) 30%, rgba(201, 162, 39, 0.4) 70%, transparent 100%)',
      },
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
        <Box sx={{
          width: 28, height: 28,
          background: status === 'ONLINE' 
            ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.15), rgba(0, 200, 100, 0.1))'
            : 'linear-gradient(135deg, rgba(255, 67, 54, 0.15), rgba(200, 50, 40, 0.1))',
          border: `1px solid ${status === 'ONLINE' ? 'rgba(0, 255, 136, 0.25)' : 'rgba(255, 67, 54, 0.25)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
        }}>
          {status === 'ONLINE' 
            ? <LockOpen sx={{ color: '#4CAF50', fontSize: 16 }} />
            : <Lock sx={{ color: '#f44336', fontSize: 16 }} />
          }
        </Box>
        <Box>
          <Typography sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontWeight: 700,
            fontSize: '0.85rem',
            color: '#c9a227',
            letterSpacing: '0.05em',
          }}>
            行政机库
          </Typography>
          <Typography sx={{
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSize: '0.65rem',
            color: 'rgba(201, 162, 39, 0.4)',
          }}>
            行政机库
          </Typography>
        </Box>
        <Chip
          label={status === 'ONLINE' ? '开放中' : '已关闭'}
          size="small"
          sx={{
            ml: 'auto',
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '0.6rem',
            fontWeight: 600,
            background: status === 'ONLINE' ? 'rgba(0, 255, 136, 0.15)' : 'rgba(255, 67, 54, 0.15)',
            border: `1px solid ${status === 'ONLINE' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 67, 54, 0.3)'}`,
            color: status === 'ONLINE' ? '#4CAF50' : '#f44336',
          }}
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 1, mb: 2, justifyContent: 'center' }}>
        {indicatorColors.map((color, i) => (
          <IndicatorLight key={i} color={color} index={i} />
        ))}
      </Box>

      <Box sx={{ textAlign: 'center', mb: 2 }}>
        <Typography sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: { xs: '1.4rem', md: '1.8rem' },
          fontWeight: 700,
          color: status === 'ONLINE' ? '#4CAF50' : '#f44336',
          letterSpacing: '0.05em',
          textShadow: `0 0 20px ${status === 'ONLINE' ? 'rgba(0, 255, 136, 0.3)' : 'rgba(255, 67, 54, 0.3)'}`,
        }}>
          {formatTime(remainingTime)}
        </Typography>
        <Typography sx={{
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: '0.7rem',
          color: 'rgba(201, 162, 39, 0.5)',
          mt: 0.5,
        }}>
          {status === 'ONLINE' ? '距离关闭' : '距离开启'}
        </Typography>
      </Box>

      <Box sx={{
        height: 4,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: '2px',
        overflow: 'hidden',
        mb: 2,
      }}>
        <Box sx={{
          height: '100%',
          background: status === 'ONLINE' 
            ? 'linear-gradient(90deg, #4CAF50, #66BB6A)'
            : 'linear-gradient(90deg, #f44336, #ef5350)',
          width: `${(remainingTime / (status === 'ONLINE' ? OPEN_DURATION : CLOSE_DURATION)) * 100}%`,
          transition: 'width 1s linear',
        }} />
      </Box>

      <Box sx={{
        borderTop: '1px solid rgba(201, 162, 39, 0.1)',
        pt: 1.5,
      }}>
        <Typography sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.65rem',
          color: 'rgba(201, 162, 39, 0.5)',
          mb: 1,
          letterSpacing: '0.05em',
        }}>
          即将到来
        </Typography>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {upcomingSchedule.map((event, i) => (
            <Box
              key={i}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                py: 0.5,
                px: 1,
                background: 'rgba(0, 10, 20, 0.3)',
                border: '1px solid rgba(201, 162, 39, 0.05)',
                clipPath: 'polygon(4px 0, calc(100% - 4px) 0, 100% 4px, 100% calc(100% - 4px), calc(100% - 4px) 100%, 4px 100%, 0 calc(100% - 4px), 0 4px)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: event.isOnline ? '#4CAF50' : '#f44336',
                }} />
                <Typography sx={{
                  fontFamily: '"Noto Sans SC", sans-serif',
                  fontSize: '0.7rem',
                  color: 'rgba(255,255,255,0.7)',
                }}>
                  {event.type === 'OPEN' ? '开启' : '关闭'}
                </Typography>
              </Box>
              <Typography sx={{
                fontFamily: '"Orbitron", sans-serif',
                fontSize: '0.7rem',
                color: event.isOnline ? '#4CAF50' : '#f44336',
              }}>
                {formatDateTime(event.time)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* Algorithm source and reference link */}
      <Box sx={{
        borderTop: '1px solid rgba(201, 162, 39, 0.05)',
        mt: 1.5,
        pt: 1,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <Typography sx={{
          fontFamily: '"Rajdhani", sans-serif',
          fontSize: '0.55rem',
          color: 'rgba(201, 162, 39, 0.25)',
        }}>
          算法来源: Xyxyll's Executive Hangar Tracker
        </Typography>
        <Box
          component="a"
          href={REFERENCE_URL}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.3,
            color: 'rgba(201, 162, 39, 0.4)',
            textDecoration: 'none',
            fontSize: '0.55rem',
            fontFamily: '"Rajdhani", sans-serif',
            transition: 'color 0.2s',
            '&:hover': {
              color: '#c9a227',
            },
          }}
        >
          来源
          <OpenInNew sx={{ fontSize: 10 }} />
        </Box>
      </Box>
    </Box>
  );
}

export default HangarTimer;
