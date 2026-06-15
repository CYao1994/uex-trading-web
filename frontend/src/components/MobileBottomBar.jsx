// MobileBottomBar.jsx - 移动端底部导航栏（优化版）
import { useState } from 'react';
import { BottomNavigation, BottomNavigationAction, Paper, Box, Typography } from '@mui/material';
import { Home, SwapHoriz, ShoppingCart, Link, Build, GpsFixed, MilitaryTech, MoreHoriz } from '@mui/icons-material';

// 主要导航项（始终显示）
const MAIN_TABS = [
  { key: 'home', label: '首页', icon: <Home sx={{ fontSize: 20 }} /> },
  { key: 'sell', label: '清仓', icon: <SwapHoriz sx={{ fontSize: 20 }} /> },
  { key: 'buy', label: '进货', icon: <ShoppingCart sx={{ fontSize: 20 }} /> },
];

// 更多导航项（点击"更多"展开）
const MORE_TABS = [
  { key: 'chain', label: '链式交易', icon: <Link sx={{ fontSize: 18 }} /> },
  { key: 'ship_components', label: '飞船组件', icon: <Build sx={{ fontSize: 18 }} /> },
  { key: 'ship_weapons', label: '飞船武器', icon: <GpsFixed sx={{ fontSize: 18 }} /> },
  { key: 'warbond', label: 'Warbond', icon: <MilitaryTech sx={{ fontSize: 18 }} /> },
];

function MobileBottomBar({ activeTab, onTabChange }) {
  const [showMore, setShowMore] = useState(false);

  // 检查当前tab是否在主要导航中
  const isMainTab = MAIN_TABS.some(t => t.key === activeTab);
  const currentIndex = isMainTab ? MAIN_TABS.findIndex(t => t.key === activeTab) : -1;

  const handleMainChange = (_, newValue) => {
    if (newValue === 3) {
      // 点击"更多"
      setShowMore(!showMore);
    } else if (MAIN_TABS[newValue]) {
      onTabChange(MAIN_TABS[newValue].key);
      setShowMore(false);
    }
  };

  const handleMoreSelect = (key) => {
    onTabChange(key);
    setShowMore(false);
  };

  return (
    <>
      {/* 展开的更多菜单 */}
      {showMore && (
        <Box sx={{
          position: 'fixed',
          bottom: 64,
          left: 0,
          right: 0,
          background: 'linear-gradient(180deg, rgba(3, 10, 22, 0.98) 0%, rgba(2, 8, 16, 0.99) 100%)',
          borderTop: '1px solid rgba(201, 162, 39, 0.15)',
          borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
          zIndex: 1099,
          py: 1,
          animation: 'fadeInUp 0.2s ease-out',
        }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, px: 1 }}>
            {MORE_TABS.map((tab) => (
              <Box
                key={tab.key}
                onClick={() => handleMoreSelect(tab.key)}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 0.5,
                  py: 1,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  background: activeTab === tab.key ? 'rgba(201, 162, 39, 0.1)' : 'transparent',
                  border: `1px solid ${activeTab === tab.key ? 'rgba(201, 162, 39, 0.2)' : 'transparent'}`,
                  transition: 'all 0.2s',
                  '&:hover': {
                    background: 'rgba(201, 162, 39, 0.08)',
                  },
                }}
              >
                <Box sx={{ color: activeTab === tab.key ? '#c9a227' : 'rgba(201, 162, 39, 0.4)' }}>
                  {tab.icon}
                </Box>
                <Typography sx={{
                  fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                  fontSize: '0.6rem',
                  color: activeTab === tab.key ? '#c9a227' : 'rgba(201, 162, 39, 0.4)',
                }}>
                  {tab.label}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* 主导航栏 */}
      <Paper
        elevation={0}
        sx={{
          display: { xs: 'block', md: 'none' },
          position: 'fixed',
          bottom: 'env(safe-area-inset-bottom, 0px)',
          left: 0,
          right: 0,
          zIndex: 1100,
          background: 'linear-gradient(180deg, rgba(3, 10, 22, 0.95) 0%, rgba(2, 8, 16, 0.98) 100%)',
          borderTop: '1px solid rgba(201, 162, 39, 0.12)',
          backdropFilter: 'blur(12px)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '1px',
            background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.3) 30%, rgba(201, 162, 39, 0.3) 70%, transparent 100%)',
          },
        }}
      >
        <BottomNavigation
          value={currentIndex >= 0 ? currentIndex : 3}
          onChange={handleMainChange}
          showLabels
          sx={{
            background: 'transparent',
            minHeight: 56,
            '& .MuiBottomNavigationAction-root': {
              color: 'rgba(201, 162, 39, 0.35)',
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              fontSize: '0.6rem',
              minWidth: 'auto',
              px: 1,
              transition: 'all 0.2s',
              '&.Mui-selected': {
                color: '#c9a227',
                transform: 'translateY(-2px)',
              },
            },
            '& .MuiBottomNavigationAction-label': {
              fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
              fontSize: '0.6rem',
              mt: 0.3,
              '&.Mui-selected': {
                fontSize: '0.65rem',
                fontWeight: 600,
              },
            },
            '& .MuiBottomNavigationAction-icon': {
              fontSize: '1.1rem',
              mb: -0.2,
            },
          }}
        >
          {MAIN_TABS.map(({ key, label, icon }) => (
            <BottomNavigationAction key={key} label={label} icon={icon} />
          ))}
          <BottomNavigationAction
            label="更多"
            icon={<MoreHoriz sx={{ fontSize: 20 }} />}
            sx={{
              color: showMore ? '#c9a227' : undefined,
            }}
          />
        </BottomNavigation>
      </Paper>
    </>
  );
}

export default MobileBottomBar;
