// HomePage.jsx - Optimized Homepage
import { useState } from 'react';
import { Box, Typography, Chip } from '@mui/material';
import { ShoppingCart, Link, MilitaryTech, Build, GpsFixed, SwapHoriz, Rocket, RocketLaunch } from '@mui/icons-material';
import HangarTimer from './HangarTimer';
import { useSfx } from '../hooks/useSfx';

const FEATURES = [
  {
    icon: <SwapHoriz sx={{ fontSize: 28 }} />,
    title: '清仓路线',
    desc: '输入出发地和货物，规划最优卖出路线',
    tab: 'sell',
    color: '#c9a227',
    gradient: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(8, 14, 28, 0.94) 100%)',
    accentBorder: 'rgba(201, 162, 39, 0.25)',
  },
  {
    icon: <ShoppingCart sx={{ fontSize: 28 }} />,
    title: '进货路线',
    desc: '找到最便宜的购买地点',
    tab: 'buy',
    color: '#44aaff',
    gradient: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 12, 22, 0.94) 100%)',
    accentBorder: 'rgba(68, 170, 255, 0.25)',
  },
  {
    icon: <Link sx={{ fontSize: 28 }} />,
    title: '链式交易',
    desc: '自动规划多段连续交易，最大化利润',
    tab: 'chain',
    color: '#00ddaa',
    gradient: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 14, 22, 0.94) 100%)',
    accentBorder: 'rgba(0, 221, 170, 0.25)',
  },
  {
    icon: <Build sx={{ fontSize: 28 }} />,
    title: '飞船组件',
    desc: '护盾、发电机、量子引擎等组件查询',
    tab: 'ship_components',
    color: '#66bbff',
    gradient: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 12, 24, 0.94) 100%)',
    accentBorder: 'rgba(102, 187, 255, 0.25)',
  },
  {
    icon: <MilitaryTech sx={{ fontSize: 28 }} />,
    title: '飞船武器',
    desc: '火炮、导弹、炮塔等武器数据库',
    tab: 'ship_weapons',
    color: '#ff6644',
    gradient: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(12, 8, 18, 0.94) 100%)',
    accentBorder: 'rgba(255, 102, 68, 0.25)',
  },
  {
    icon: <GpsFixed sx={{ fontSize: 28 }} />,
    title: 'Warbond',
    desc: 'CCU升级包和独立飞船优惠',
    tab: 'warbond',
    color: '#d4760a',
    gradient: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(10, 8, 20, 0.94) 100%)',
    accentBorder: 'rgba(212, 118, 10, 0.25)',
  },
];

function HomePage({ onTabChange }) {
  const sfx = useSfx();
  const [launched, setLaunched] = useState(false);
  return (
    <Box sx={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 2, md: 4 },
    }}>
      {/* Title Section */}
      <Box sx={{
        textAlign: 'center',
        mb: 4,
        animation: 'fadeInUp 0.6s ease-out',
      }}>
        <Typography sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontSize: { xs: '1.5rem', md: '2rem' },
          fontWeight: 700,
          color: '#c9a227',
          letterSpacing: '0.15em',
          textShadow: '0 0 30px rgba(201, 162, 39, 0.3)',
        }}>
          ASTRAL LANCE
        </Typography>
        <Typography sx={{
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: { xs: '0.9rem', md: '1.1rem' },
          color: 'rgba(201, 162, 39, 0.6)',
          letterSpacing: '0.3em',
          mt: 0.5,
        }}>
          星槊
        </Typography>
        <Chip
          label="LANCEOF12"
          size="small"
          sx={{
            mt: 1.5,
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '0.55rem',
            background: 'rgba(201, 162, 39, 0.08)',
            border: '1px solid rgba(201, 162, 39, 0.15)',
            color: 'rgba(201, 162, 39, 0.5)',
            letterSpacing: '0.12em',
          }}
        />
        <Typography sx={{
          fontFamily: '"Noto Sans SC", sans-serif',
          fontSize: '0.8rem',
          color: 'rgba(255, 255, 255, 0.4)',
          mt: 2,
        }}>
          星际公民交易路线规划工具
        </Typography>
      </Box>

      {!launched && (
        <Box
          onClick={() => { sfx('toggle_on'); setLaunched(true); }}
          sx={{
            mt: 2,
            mb: 4,
            px: 6,
            py: 2.5,
            cursor: 'pointer',
            position: 'relative',
            background: 'rgba(201, 162, 39, 0.06)',
            border: '1px solid rgba(201, 162, 39, 0.2)',
            clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 12px, 100% calc(100% - 12px), calc(100% - 12px) 100%, 12px 100%, 0 calc(100% - 12px), 0 12px)',
            transition: 'all 0.3s ease',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '20%',
              right: '20%',
              height: '1px',
              background: 'rgba(201, 162, 39, 0.5)',
            },
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: '10%',
              right: '10%',
              height: '1px',
              background: 'rgba(201, 162, 39, 0.3)',
              animation: 'pulse 3s infinite',
            },
            '&:hover': {
              background: 'rgba(201, 162, 39, 0.12)',
              border: '1px solid rgba(201, 162, 39, 0.4)',
              boxShadow: '0 0 30px rgba(201, 162, 39, 0.2)',
              transform: 'scale(1.02)',
            },
            '&:active': {
              transform: 'scale(0.98)',
            }
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              mx: 'auto',
              mb: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(201, 162, 39, 0.08)',
              border: '1px solid rgba(201, 162, 39, 0.3)',
              clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
            }}
          >
            <RocketLaunch sx={{ color: '#c9a227', fontSize: 24 }} />
          </Box>
          <Typography sx={{
            fontFamily: '"Orbitron", sans-serif',
            fontSize: '0.85rem',
            fontWeight: 700,
            color: '#c9a227',
            letterSpacing: '0.1em',
            textAlign: 'center',
          }}>
            INITIATE LAUNCH
          </Typography>
          <Typography sx={{
            fontFamily: '"Noto Sans SC", sans-serif',
            fontSize: '0.65rem',
            color: 'rgba(201, 162, 39, 0.6)',
            letterSpacing: '0.2em',
            textAlign: 'center',
            mt: 0.5,
          }}>
            启动星槊系统
          </Typography>
        </Box>
      )}

      {launched && (
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 2,
          maxWidth: 900,
          width: '100%',
          animation: 'fadeInUp 0.6s ease-out',
        }}>
          {/* Left - Feature Cards */}
          <Box sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(2, 1fr)' },
            gap: 1.5,
            flex: 1,
          }}>
            {FEATURES.map((feature, index) => (
              <Box
                key={feature.tab}
                onClick={() => { sfx('page_transition'); onTabChange(feature.tab); }}
                onMouseEnter={() => sfx('button_hover')}
                sx={{
                  p: 2,
                  background: feature.gradient,
                  border: `1px solid ${feature.accentBorder}`,
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: 0,
                  animation: 'fadeInUp 0.5s ease-out forwards',
                  animationDelay: `${index * 0.08}s`,
                  clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: `linear-gradient(90deg, transparent, ${feature.color}50, transparent)`,
                  },
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    border: `1px solid ${feature.color}80`,
                    boxShadow: `0 4px 20px ${feature.color}33, 0 0 40px ${feature.color}15`,
                    '& .feature-icon': {
                      transform: 'scale(1.08)',
                      background: `${feature.color}20`,
                      borderColor: `${feature.color}50`,
                    },
                  },
                }}
              >
              <Box
                className="feature-icon"
                sx={{
                  width: 40,
                  height: 40,
                  background: 'rgba(201, 162, 39, 0.06)',
                  border: '1px solid rgba(201, 162, 39, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 1.5,
                  transition: 'all 0.3s ease',
                }}
              >
                <Box sx={{ color: feature.color }}>
                  {feature.icon}
                </Box>
              </Box>
              <Typography sx={{
                fontFamily: '"Orbitron", sans-serif',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: feature.color,
                mb: 0.3,
              }}>
                {feature.title}
              </Typography>
              <Typography sx={{
                fontFamily: '"Noto Sans SC", sans-serif',
                fontSize: '0.7rem',
                color: 'rgba(255, 255, 255, 0.35)',
                lineHeight: 1.4,
              }}>
                {feature.desc}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Right - Hangar Timer */}
        <Box sx={{
          width: { xs: '100%', md: 300 },
          flexShrink: 0,
        }}>
          <HangarTimer />
        </Box>
      </Box>
      )}

      {/* Fleet Page Link */}
      <Box
        component="a"
        href="https://robertsspaceindustries.com/en/orgs/LANCEOF12"
        target="_blank"
        rel="noopener noreferrer"
        sx={{
          mt: 4,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          px: 3,
          py: 1.2,
          background: 'rgba(201, 162, 39, 0.06)',
          border: '1px solid rgba(201, 162, 39, 0.1)',
          borderRadius: '4px',
          textDecoration: 'none',
          transition: 'all 0.3s ease',
          '&:hover': {
            background: 'rgba(201, 162, 39, 0.12)',
            transform: 'translateY(-2px)',
          },
        }}
      >
        <Rocket sx={{ fontSize: 16, color: '#c9a227' }} />
        <Typography sx={{
          fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
          fontSize: '0.75rem',
          color: 'rgba(201, 162, 39, 0.7)',
          fontWeight: 500,
        }}>
          访问舰队主页
        </Typography>
      </Box>

      {/* Footer */}
      <Typography sx={{
        mt: 3,
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '0.6rem',
        color: 'rgba(201, 162, 39, 0.2)',
      }}>
        DATA FROM UEXCORP - MADE BY CYao1994
      </Typography>
    </Box>
  );
}

export default HomePage;
