import { useState, useEffect } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { MilitaryTech, OpenInNew, Refresh, Upgrade, DirectionsBoat, Inventory2 } from '@mui/icons-material';
import { getWarbonds } from '../api/client';

function formatPrice(cents) {
  if (!cents) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDiscount(wbPrice, stdPrice) {
  if (!wbPrice || !stdPrice) return null;
  const diff = stdPrice - wbPrice;
  if (diff <= 0) return null;
  return `-${(diff / 100).toFixed(2)}`;
}

function WarbondCategorySection({ title, icon, items, accentColor, emptyText }) {
  if (!items || items.length === 0) {
    if (!emptyText) return null;
    return (
      <Box sx={{ mb: 3 }}>
        <Typography sx={{
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 700,
          fontSize: '0.85rem',
          color: accentColor,
          mb: 1.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          letterSpacing: '0.05em',
        }}>
          {icon}
          {title}
        </Typography>
        <Typography sx={{
          color: 'rgba(200, 220, 255, 0.3)',
          fontSize: '0.8rem',
          fontStyle: 'italic',
          pl: 1,
        }}>
          {emptyText}
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* Section title */}
      <Typography sx={{
        fontFamily: '"Orbitron", sans-serif',
        fontWeight: 700,
        fontSize: '0.85rem',
        color: accentColor,
        mb: 1.5,
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        letterSpacing: '0.05em',
      }}>
        {icon}
        {title}
        <Typography component="span" sx={{
          color: `${accentColor}55`,
          fontSize: '0.7rem',
          ml: 'auto',
          fontFamily: '"Rajdhani", sans-serif',
          fontWeight: 400,
        }}>
          {items.length} 项
        </Typography>
      </Typography>

      {/* Items grid */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 1.5,
      }}>
        {items.map((item, idx) => {
          const discount = formatDiscount(item.warbond_price, item.standard_price);
          return (
            <Box
              key={idx}
              sx={{
                p: 2,
                background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.7) 0%, rgba(2, 8, 18, 0.8) 100%)',
                border: '1px solid rgba(0, 180, 255, 0.08)',
                borderRadius: '3px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.25s',
                '&:hover': {
                  border: `1px solid ${accentColor}33`,
                  boxShadow: `0 0 15px ${accentColor}11`,
                  transform: 'translateY(-1px)',
                },
                // Top edge glow
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '1px',
                  background: `linear-gradient(90deg, transparent 0%, ${accentColor}35 30%, ${accentColor}35 70%, transparent 100%)`,
                },
              }}
            >
              {/* Item name */}
              <Typography sx={{
                color: 'rgba(220, 235, 255, 0.9)',
                fontWeight: 600,
                fontSize: '0.85rem',
                mb: 1,
                fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
              }}>
                {item.name}
              </Typography>

              {/* Price row */}
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mb: 1 }}>
                {item.warbond_price && (
                  <Typography sx={{
                    color: accentColor,
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    fontFamily: '"Orbitron", "Rajdhani", sans-serif',
                    letterSpacing: '0.03em',
                  }}>
                    {formatPrice(item.warbond_price)}
                  </Typography>
                )}
                {item.standard_price && item.warbond_price && (
                  <Typography sx={{
                    color: 'rgba(200, 220, 255, 0.35)',
                    fontSize: '0.75rem',
                    textDecoration: 'line-through',
                    fontFamily: '"Rajdhani", sans-serif',
                  }}>
                    {formatPrice(item.standard_price)}
                  </Typography>
                )}
                {discount && (
                  <Box sx={{
                    px: 0.75,
                    py: 0.1,
                    background: 'rgba(0, 255, 136, 0.1)',
                    border: '1px solid rgba(0, 255, 136, 0.2)',
                    borderRadius: '2px',
                    color: '#00ff88',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    fontFamily: '"Rajdhani", sans-serif',
                  }}>
                    {discount}
                  </Box>
                )}
              </Box>

              {/* Category tag + Link */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{
                  px: 0.75,
                  py: 0.15,
                  background: `${accentColor}0A`,
                  border: `1px solid ${accentColor}22`,
                  borderRadius: '2px',
                  color: `${accentColor}88`,
                  fontSize: '0.65rem',
                  fontWeight: 600,
                  fontFamily: '"Noto Sans SC", sans-serif',
                }}>
                  {item.category_zh}
                </Box>

                {item.rsi_url && (
                  <Box
                    component="a"
                    href={item.rsi_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: `${accentColor}66`,
                      fontSize: '0.7rem',
                      textDecoration: 'none',
                      fontFamily: '"Rajdhani", sans-serif',
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: accentColor,
                      },
                    }}
                  >
                    RSI商店
                    <OpenInNew sx={{ fontSize: 12 }} />
                  </Box>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}

function WarbondPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getWarbonds();
      setData(res.data);
      setLastUpdated(res.data.last_updated || '');
    } catch (e) {
      setError(e.response?.data?.detail || e.message || '获取战争债券数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const formatLastUpdated = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: 2,
      }}>
        <CircularProgress size={36} sx={{ color: '#ffaa00' }} />
        <Typography sx={{
          color: 'rgba(255, 170, 0, 0.5)',
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
        }}>
          LOADING WARBOND DATA
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{
        p: 4,
        textAlign: 'center',
      }}>
        <Typography sx={{ color: '#ff4466', mb: 2, fontWeight: 600 }}>
          {error}
        </Typography>
        <Button
          onClick={fetchData}
          startIcon={<Refresh />}
          sx={{
            color: '#ffaa00',
            borderColor: 'rgba(255, 170, 0, 0.3)',
            '&:hover': {
              borderColor: '#ffaa00',
              background: 'rgba(255, 170, 0, 0.05)',
            },
          }}
          variant="outlined"
        >
          重试
        </Button>
      </Box>
    );
  }

  const totalItems = (data?.ccu_items?.length || 0) +
    (data?.standalone_ships?.length || 0) +
    (data?.package_items?.length || 0) +
    (data?.other_items?.length || 0);

  return (
    <Box sx={{
      p: 2.5,
      background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.88) 0%, rgba(2, 8, 18, 0.92) 100%)',
      border: '1px solid rgba(0, 180, 255, 0.1)',
      backdropFilter: 'blur(12px)',
      borderRadius: '4px',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 170, 0, 0.35) 30%, rgba(255, 170, 0, 0.35) 70%, transparent 100%)',
      },
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 32, height: 32,
            background: 'linear-gradient(135deg, rgba(255, 170, 0, 0.15), rgba(200, 100, 0, 0.1))',
            border: '1px solid rgba(255, 170, 0, 0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            clipPath: 'polygon(3px 0, calc(100% - 3px) 0, 100% 3px, 100% calc(100% - 3px), calc(100% - 3px) 100%, 3px 100%, 0 calc(100% - 3px), 0 3px)',
          }}>
            <MilitaryTech sx={{ color: '#ffaa00', fontSize: 18 }} />
          </Box>
          <Box>
            <Typography variant="h6" sx={{
              fontFamily: '"Orbitron", sans-serif',
              fontWeight: 700, fontSize: '0.95rem',
              color: '#ffaa00',
              letterSpacing: '0.05em',
            }}>
              战争债券
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 170, 0, 0.35)', fontSize: '0.65rem', letterSpacing: '0.03em' }}>
              RSI STORE · WARBOND ITEMS
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {lastUpdated && (
            <Typography sx={{
              color: 'rgba(255, 170, 0, 0.25)',
              fontSize: '0.6rem',
              fontFamily: '"Rajdhani", sans-serif',
            }}>
              更新于 {formatLastUpdated(lastUpdated)}
            </Typography>
          )}
          <Box
            onClick={fetchData}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              px: 1.5,
              py: 0.5,
              cursor: 'pointer',
              color: 'rgba(255, 170, 0, 0.4)',
              border: '1px solid rgba(255, 170, 0, 0.15)',
              borderRadius: '2px',
              transition: 'all 0.2s',
              '&:hover': {
                color: '#ffaa00',
                borderColor: 'rgba(255, 170, 0, 0.4)',
                background: 'rgba(255, 170, 0, 0.05)',
              },
            }}
          >
            <Refresh sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: '0.7rem', fontFamily: '"Rajdhani", sans-serif', fontWeight: 600 }}>
              刷新
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary */}
      <Box sx={{
        display: 'flex',
        gap: 2,
        mb: 3,
        p: 1.5,
        background: 'rgba(255, 170, 0, 0.03)',
        border: '1px solid rgba(255, 170, 0, 0.08)',
        borderRadius: '3px',
      }}>
        <Typography sx={{
          color: 'rgba(255, 170, 0, 0.6)',
          fontSize: '0.75rem',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}>
          当前在售 <strong style={{ color: '#ffaa00' }}>{totalItems}</strong> 项战争债券商品
        </Typography>
        <Typography sx={{
          color: 'rgba(255, 170, 0, 0.25)',
          fontSize: '0.7rem',
          ml: 'auto',
          fontFamily: '"Noto Sans SC", sans-serif',
        }}>
          战争债券仅支持新资金购买，不可使用商店信用
        </Typography>
      </Box>

      {/* CCU Upgrades */}
      <WarbondCategorySection
        title="升级包 (CCU)"
        icon={<Upgrade sx={{ fontSize: 18 }} />}
        items={data?.ccu_items}
        accentColor="#ffaa00"
        emptyText="暂无升级包类战争债券"
      />

      {/* Standalone Ships */}
      <WarbondCategorySection
        title="单船 (STANDALONE)"
        icon={<DirectionsBoat sx={{ fontSize: 18 }} />}
        items={data?.standalone_ships}
        accentColor="#00c8ff"
        emptyText="暂无单船类战争债券"
      />

      {/* Packages */}
      <WarbondCategorySection
        title="游戏包 (PACKAGE)"
        icon={<Inventory2 sx={{ fontSize: 18 }} />}
        items={data?.package_items}
        accentColor="#00ff88"
        emptyText="暂无游戏包类战争债券"
      />

      {/* Other items */}
      {data?.other_items?.length > 0 && (
        <WarbondCategorySection
          title="其他"
          icon={<MilitaryTech sx={{ fontSize: 18 }} />}
          items={data?.other_items}
          accentColor="#aa88ff"
        />
      )}

      {/* Footer info */}
      <Box sx={{
        mt: 3,
        pt: 2,
        borderTop: '1px solid rgba(255, 170, 0, 0.06)',
        display: 'flex',
        justifyContent: 'center',
        gap: 2,
        flexWrap: 'wrap',
      }}>
        <Typography sx={{
          color: 'rgba(255, 170, 0, 0.2)',
          fontSize: '0.6rem',
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '0.05em',
        }}>
          DATA FROM STARNOTIFIER.COM + RSI
        </Typography>
      </Box>
    </Box>
  );
}

export default WarbondPanel;
