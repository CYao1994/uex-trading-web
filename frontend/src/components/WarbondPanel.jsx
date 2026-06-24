import { useState, useEffect, useRef } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { MilitaryTech, OpenInNew, Refresh, DirectionsBoat, Inventory2, Settings, Extension, CardGiftcard } from '@mui/icons-material';
import { getWarbonds } from '../api/client';

function formatPrice(cents) {
  if (!cents) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDiscount(wbPrice, stdPrice) {
  if (!wbPrice || !stdPrice) return null;
  const diff = stdPrice - wbPrice;
  if (diff <= 0) return null;
  return `-$${(diff / 100).toFixed(2)}`;
}

const CATEGORY_ZH = {
  "Gear": "配件",
  "Packs": "组合包",
  "Add-Ons": "附加件",
  "Standalone Ships": "单船",
  "Package": "游戏包",
};

const CATEGORY_STYLES = {
  "Gear": { icon: Settings, color: '#00ccff' },
  "Packs": { icon: Inventory2, color: '#ff6644' },
  "Add-Ons": { icon: Extension, color: '#aa66ff' },
  "Standalone Ships": { icon: DirectionsBoat, color: '#c9a227' },
  "Package": { icon: CardGiftcard, color: '#00ff88' },
};

function WarbondCard({ item, accentColor = '#c9a227', index }) {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = item.image_url && item.image_url.length > 0;
  const discount = formatDiscount(item.warbond_price, item.standard_price);

  return (
    <Box
      className="card-stagger"
      sx={{
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.85) 0%, rgba(2, 8, 18, 0.9) 100%)',
        border: '1px solid rgba(201, 162, 39, 0.08)',
        borderRadius: '4px',
        overflow: 'hidden',
        position: 'relative',
        animationDelay: `${index * 0.08}s`,
        transition: 'border-color 0.3s, box-shadow 0.3s, transform 0.3s',
        '&:hover': {
          borderColor: `${accentColor}30`,
          boxShadow: `0 0 20px ${accentColor}15`,
          transform: 'translateY(-2px)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${accentColor}30 30%, ${accentColor}30 70%, transparent 100%)`,
          zIndex: 1,
        },
      }}
    >
      <Box sx={{
        width: '100%',
        height: 180,
        background: 'linear-gradient(180deg, rgba(80, 65, 13, 0.6) 0%, rgba(0, 10, 20, 0.8) 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden', position: 'relative',
      }}>
        {(!hasImage || imgFailed) ? (
          <Box sx={{ width: 80, height: 80, opacity: 0.15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke={accentColor} strokeWidth="0.5" opacity="0.6">
              <path d="M12 2L15 9L12 7L9 9Z" />
              <path d="M4 14L12 9L20 14L12 22Z" />
              <circle cx="12" cy="6" r="1" fill={accentColor} opacity="0.8" />
            </svg>
          </Box>
        ) : (
          <img
            src={item.image_url}
            alt={item.name_zh || item.name}
            onError={() => setImgFailed(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
            style={{
              width: '100%', height: '100%',
              objectFit: 'contain', padding: '8px 16px',
              transition: 'transform 0.4s ease-out',
            }}
            onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
            onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
          />
        )}
        {discount && (
          <Box sx={{
            position: 'absolute', top: 8, right: 8,
            px: 1, py: 0.25,
            background: 'rgba(0, 255, 136, 0.15)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            borderRadius: '2px',
            color: '#00ff88',
            fontSize: '0.7rem', fontWeight: 700,
            fontFamily: '"Rajdhani", sans-serif',
            animation: 'pulse 3s ease-in-out infinite',
          }}>
            {discount}
          </Box>
        )}
      </Box>

      <Box sx={{ p: 2 }}>
        <Typography sx={{
          color: 'rgba(220, 235, 255, 0.95)',
          fontWeight: 600, fontSize: '1rem', mb: 0.25,
          fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.name_zh || item.name}
        </Typography>
        {item.name_zh && item.name_zh !== item.name && (
          <Typography sx={{
            color: 'rgba(200, 220, 255, 0.3)',
            fontSize: '0.65rem', mb: 1,
            fontFamily: '"Rajdhani", sans-serif',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {item.name}
          </Typography>
        )}
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1.5, mt: 1 }}>
          {item.warbond_price && (
            <Typography sx={{
              color: accentColor, fontWeight: 700, fontSize: '1.2rem',
              fontFamily: '"Orbitron", "Rajdhani", sans-serif',
              letterSpacing: '0.03em',
            }}>
              {formatPrice(item.warbond_price)}
            </Typography>
          )}
          {item.standard_price && item.warbond_price && (
            <Typography sx={{
              color: 'rgba(200, 220, 255, 0.3)',
              fontSize: '0.75rem', textDecoration: 'line-through',
              fontFamily: '"Rajdhani", sans-serif',
            }}>
              {formatPrice(item.standard_price)}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

function WarbondPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const panelRef = useRef(null);

  const fetchData = async (refresh = false) => {
    setLoading(true);
    setError('');
    try {
      const res = await getWarbonds(refresh);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.detail || e.message || '获取战争债券数据失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <Box sx={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '60vh', gap: 2,
      }}>
        <CircularProgress size={36} sx={{ color: '#ffaa00' }} />
        <Typography sx={{
          color: 'rgba(255, 170, 0, 0.5)',
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.75rem',
          letterSpacing: '0.1em',
        }}>
          正在加载战争债券数据...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography sx={{ color: '#ff4466', mb: 2, fontWeight: 600 }}>{error}</Typography>
        <Button onClick={fetchData} startIcon={<Refresh />}
          sx={{
            color: '#ffaa00', borderColor: 'rgba(255, 170, 0, 0.3)',
            '&:hover': { borderColor: '#ffaa00', background: 'rgba(255, 170, 0, 0.05)' },
          }}
          variant="outlined">重试</Button>
      </Box>
    );
  }

  const categories = data?.categories || {};
  const allItems = Object.values(categories).flat();
  const totalItems = allItems.length;

  return (
    <Box ref={panelRef} sx={{
      p: { xs: 1.5, md: 2.5 },
      background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)',
      border: '1px solid rgba(201, 162, 39, 0.1)',
      borderRadius: '4px',
      position: 'relative',
      '&::before': {
        content: '""',
        position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
        background: 'linear-gradient(90deg, transparent 0%, rgba(255, 170, 0, 0.35) 30%, rgba(255, 170, 0, 0.35) 70%, transparent 100%)',
      },
    }}>
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
              fontFamily: '"Orbitron", sans-serif', fontWeight: 700, fontSize: '0.95rem',
              color: '#ffaa00', letterSpacing: '0.05em',
            }}>
              战争债券
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(255, 170, 0, 0.35)', fontSize: '0.65rem', letterSpacing: '0.03em' }}>
              RSI STORE · WARBOND ITEMS
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {data?.last_updated && (
            <Typography sx={{ color: 'rgba(255, 170, 0, 0.25)', fontSize: '0.6rem', fontFamily: '"Rajdhani", sans-serif' }}>
              更新于 {new Date(data.last_updated).toLocaleString('zh-CN', {
                month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
              })}
            </Typography>
          )}
          <Box
            component="a"
            href={data?.rsi_store_url || 'https://robertsspaceindustries.com/store/pledge/browse/extras/standalone-ships?sort=weight&direction=desc'}
            target="_blank" rel="noopener noreferrer"
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1.5, py: 1,
              color: 'rgba(201, 162, 39, 0.5)',
              border: '1px solid rgba(201, 162, 39, 0.2)',
              borderRadius: '2px', textDecoration: 'none',
              transition: 'color 0.2s, border-color 0.2s',
              '&:hover': { color: '#c9a227', borderColor: 'rgba(201, 162, 39, 0.5)' },
            }}
          >
            <OpenInNew sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: '0.7rem', fontFamily: '"Rajdhani", sans-serif', fontWeight: 600 }}>RSI商店</Typography>
          </Box>
          <Box
            onClick={() => fetchData(true)}
            sx={{
              display: 'flex', alignItems: 'center', gap: 0.5,
              px: 1.5, py: 1, cursor: 'pointer',
              color: 'rgba(255, 170, 0, 0.4)',
              border: '1px solid rgba(255, 170, 0, 0.15)',
              borderRadius: '2px',
              transition: 'color 0.2s, border-color 0.2s',
              '&:hover': { color: '#ffaa00', borderColor: 'rgba(255, 170, 0, 0.4)' },
            }}
          >
            <Refresh sx={{ fontSize: 14 }} />
            <Typography sx={{ fontSize: '0.7rem', fontFamily: '"Rajdhani", sans-serif', fontWeight: 600 }}>刷新</Typography>
          </Box>
        </Box>
      </Box>

      <Box sx={{
        display: 'flex', gap: 2, mb: 3, p: 1.5,
        background: 'rgba(255, 170, 0, 0.03)',
        border: '1px solid rgba(255, 170, 0, 0.08)',
        borderRadius: '3px',
        alignItems: 'center', flexWrap: 'wrap',
      }}>
        <Typography sx={{ color: 'rgba(255, 170, 0, 0.6)', fontSize: '0.75rem', fontFamily: '"Noto Sans SC", sans-serif' }}>
          当前在售 <strong style={{ color: '#ffaa00' }}>{totalItems}</strong> 项战争债券商品
        </Typography>
        <Typography sx={{
          color: 'rgba(255, 170, 0, 0.25)', fontSize: '0.7rem',
          ml: 'auto', fontFamily: '"Noto Sans SC", sans-serif',
        }}>
          战争债券仅支持新资金购买，不可使用商店信用
        </Typography>
      </Box>

      {Object.entries(categories).map(([catName, catItems]) => {
        if (catItems.length === 0) return null;
        const style = CATEGORY_STYLES[catName] || { icon: MilitaryTech, color: '#c9a227' };
        const Icon = style.icon;
        return (
          <Box key={catName} sx={{ mb: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Icon sx={{ fontSize: 20, color: style.color }} />
              <Typography sx={{
                fontFamily: '"Orbitron", sans-serif', fontWeight: 700, fontSize: '0.9rem',
                color: style.color, letterSpacing: '0.05em',
              }}>
                {CATEGORY_ZH[catName] || catName} ({catName})
              </Typography>
              <Typography component="span" sx={{
                color: `${style.color}50`, fontSize: '0.7rem',
                ml: 'auto', fontFamily: '"Rajdhani", sans-serif',
              }}>
                {catItems.length} 项
              </Typography>
            </Box>
            <Box sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' },
              gap: 2,
            }}>
              {catItems.map((item, idx) => (
                <WarbondCard key={idx} item={item} index={idx} accentColor={style.color} />
              ))}
            </Box>
          </Box>
        );
      })}

      {totalItems === 0 && (
        <Box sx={{ py: 6, textAlign: 'center' }}>
          <Typography sx={{ color: 'rgba(255, 170, 0, 0.3)', fontFamily: '"Orbitron", sans-serif', fontSize: '0.8rem' }}>
            暂无战争债券数据
          </Typography>
        </Box>
      )}

      <Box sx={{
        mt: 2, pt: 2,
        borderTop: '1px solid rgba(255, 170, 0, 0.06)',
        display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap',
      }}>
        <Typography sx={{
          color: 'rgba(255, 170, 0, 0.2)', fontSize: '0.6rem',
          fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em',
        }}>
          数据来源: STARNOTIFIER.COM + RSI
        </Typography>
      </Box>
    </Box>
  );
}

export default WarbondPanel;
