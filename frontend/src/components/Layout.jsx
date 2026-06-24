// Layout.jsx — 修改：全局返回顶部按钮 + MobileBottomBar + FeedbackDialog
import { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Zoom } from '@mui/material';
import { KeyboardArrowUp } from '@mui/icons-material';
import Navbar from './Navbar';
import StarBackground from './StarBackground';
import MobileBottomBar from './MobileBottomBar';
import FeedbackDialog from './FeedbackDialog';

function Layout({ children, activeTab, onTabChange }) {
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <StarBackground />
      <Navbar
        activeTab={activeTab}
        onTabChange={onTabChange}
        onFeedbackOpen={() => setFeedbackOpen(true)}
      />
      <Box sx={{
        flex: 1,
        p: { xs: 2, md: 3 },
        maxWidth: 1400,
        mx: 'auto',
        width: '100%',
        // Leave space for MobileBottomBar on mobile
        pb: { xs: 'calc(56px + env(safe-area-inset-bottom, 0px) + 16px)', md: 3 },
      }}>
        {children}
      </Box>
      {/* Footer - HUD style */}
      <Box sx={{
        py: 1.2,
        px: 3,
        textAlign: 'center',
        borderTop: '1px solid rgba(201, 162, 39, 0.06)',
        background: 'linear-gradient(180deg, rgba(2, 8, 16, 0.9) 0%, rgba(2, 6, 12, 0.95) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        flexWrap: 'wrap',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.15) 30%, rgba(201, 162, 39, 0.15) 70%, transparent 100%)',
        },
      }}>
        <Box
          component="a"
          href="https://robertsspaceindustries.com/en/orgs/LANCEOF12"
          target="_blank"
          rel="noopener noreferrer"
          sx={{ display: 'flex', alignItems: 'center', gap: 0.75, textDecoration: 'none' }}
        >
          <Box
            component="img"
            src="https://theverse.robertsspaceindustries.com/hrrhhi4hjpy6p/logo.jpg"
            alt="LANCEOF12"
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '1px solid rgba(201, 162, 39, 0.2)',
            }}
          />
          <Typography variant="caption" sx={{
            color: 'rgba(201, 162, 39, 0.5)',
            fontSize: '0.65rem',
            fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
            fontWeight: 500,
            letterSpacing: '0.02em',
          }}>
            Astral Lance 星槊 [LANCEOF12]
          </Typography>
        </Box>
        <Typography variant="caption" sx={{
          color: 'rgba(201, 162, 39, 0.2)',
          fontSize: '0.5rem',
        }}>
          |
        </Typography>
        <Typography variant="caption" sx={{
          color: 'rgba(201, 162, 39, 0.3)',
          fontSize: '0.65rem',
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '0.1em',
        }}>
          星槊 · 数据来源: UEXCORP · 作者: CYao1994
        </Typography>
      </Box>

      {/* Data source disclaimer */}
      <Box sx={{
        py: 0.6,
        px: 3,
        textAlign: 'center',
        background: 'rgba(2, 6, 12, 0.95)',
      }}>
        <Typography variant="caption" sx={{
          color: 'rgba(201, 162, 39, 0.18)',
          fontSize: '0.55rem',
          fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
          letterSpacing: '0.02em',
          lineHeight: 1.5,
          display: 'block',
        }}>
          数据来源: Star Citizen Wiki · UEXCorp · 舰船图片 © Cloud Imperium Games
        </Typography>
        <Typography variant="caption" sx={{
          color: 'rgba(201, 162, 39, 0.13)',
          fontSize: '0.5rem',
          fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
          letterSpacing: '0.02em',
        }}>
          ASTRAL LANCE — 社区工具 · 非商业用途 · 数据仅供参考
        </Typography>
      </Box>

      {/* Scroll-to-top button — shift up on mobile to avoid bottom bar */}
      <Zoom in={showScrollTop}>
        <IconButton
          onClick={scrollToTop}
          sx={{
            position: 'fixed',
            bottom: { xs: 72, md: 24 },
            right: 24,
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.2), rgba(154, 122, 26, 0.15))',
            border: '1px solid rgba(201, 162, 39, 0.35)',
            color: '#c9a227',
            boxShadow: '0 0 12px rgba(201, 162, 39, 0.15)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            transition: 'all 0.3s',
            '&:hover': {
              background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.35), rgba(154, 122, 26, 0.25))',
              boxShadow: '0 0 20px rgba(201, 162, 39, 0.3)',
              transform: 'scale(1.08)',
            },
          }}
          aria-label="返回顶部"
        >
          <KeyboardArrowUp sx={{ fontSize: 24 }} />
        </IconButton>
      </Zoom>

      {/* Mobile Bottom Navigation Bar */}
      <MobileBottomBar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Feedback Dialog */}
      <FeedbackDialog open={feedbackOpen} onClose={() => setFeedbackOpen(false)} activeTab={activeTab} />
    </Box>
  );
}

export default Layout;
