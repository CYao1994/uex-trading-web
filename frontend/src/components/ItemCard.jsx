import { Box, Typography, Chip } from '@mui/material';
import { CheckCircle } from '@mui/icons-material';
import { getPriceColor } from '../utils/format';

function ItemCard({ item, compareMode, isSelected, priceRange, activeCategory, classColorMap, gradeColorMap, shopMap, accentColor, onClick, getWeaponStats }) {
  const classColor = classColorMap[item.item_class_zh] || accentColor;
  const gradeColor = gradeColorMap[item.grade] || 'rgba(255,255,255,0.5)';
  const priceColor = item.can_buy && item.best_price_buy
    ? getPriceColor(item.best_price_buy, priceRange.min, priceRange.max)
    : 'rgba(255,255,255,0.2)';

  return (
    <Box
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      tabIndex={0}
      role="button"
      aria-label={compareMode ? `${isSelected ? '取消选择' : '选择'}${item.name_zh || item.name}进行对比` : `查看${item.name_zh || item.name}详情`}
      sx={{
        p: 1.5,
        minHeight: 160,
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.9) 0%, rgba(2, 8, 18, 0.95) 100%)',
        border: isSelected
          ? '1px solid rgba(0, 221, 170, 0.5)'
          : '1px solid rgba(201, 162, 39, 0.1)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        clipPath: 'polygon(6px 0, calc(100% - 6px) 0, 100% 6px, 100% calc(100% - 6px), calc(100% - 6px) 100%, 6px 100%, 0 calc(100% - 6px), 0 6px)',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: isSelected
            ? 'linear-gradient(90deg, transparent 0%, rgba(0, 221, 170, 0.4) 50%, transparent 100%)'
            : 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.25) 50%, transparent 100%)',
        },
        '&:hover': {
          background: 'linear-gradient(135deg, rgba(5, 15, 30, 0.95) 0%, rgba(3, 10, 22, 0.98) 100%)',
          border: isSelected
            ? '1px solid rgba(0, 221, 170, 0.6)'
            : '1px solid rgba(201, 162, 39, 0.25)',
        },
        '&:focus': {
          outline: isSelected
            ? '2px solid rgba(0, 221, 170, 0.5)'
            : '2px solid rgba(201, 162, 39, 0.4)',
          outlineOffset: '2px',
        },
      }}
    >
      {compareMode && (
        <Box sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          zIndex: 1,
        }}>
          <CheckCircle
            sx={{
              fontSize: 18,
              color: isSelected ? '#00ddaa' : 'rgba(255,255,255,0.2)',
              filter: isSelected ? 'drop-shadow(0 0 4px rgba(0,221,170,0.5))' : 'none',
            }}
          />
        </Box>
      )}

      <Typography sx={{
        color: 'rgba(255,255,255,0.9)',
        fontSize: '0.85rem',
        fontFamily: '"Noto Sans SC","Rajdhani",sans-serif',
        lineHeight: 1.2,
        mb: 0.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {item.name_zh || item.name}
      </Typography>
      {item.name_zh && (
        <Typography sx={{
          color: 'rgba(255,255,255,0.35)',
          fontSize: '0.65rem',
          fontFamily: '"Rajdhani",sans-serif',
          lineHeight: 1.2,
          mb: 0.75,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {item.name}
        </Typography>
      )}

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 0.75 }}>
        {item.size && (
          <Chip
            label={`S${item.size}`}
            size="small"
            sx={{
              fontFamily: '"Orbitron",sans-serif',
              fontSize: '0.6rem',
              height: 18,
              background: `${activeCategory.color}15`,
              border: `1px solid ${activeCategory.color}33`,
              color: activeCategory.color,
            }}
          />
        )}
        {item.item_class_zh && (
          <Chip
            label={item.item_class_zh}
            size="small"
            sx={{
              fontFamily: '"Noto Sans SC",sans-serif',
              fontSize: '0.6rem',
              height: 18,
              background: `${classColor}15`,
              border: `1px solid ${classColor}33`,
              color: classColor,
            }}
          />
        )}
        {item.grade && (
          <Chip
            label={`${item.grade}级`}
            size="small"
            sx={{
              fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
              fontSize: '0.55rem',
              height: 18,
              background: `${gradeColor}15`,
              border: `1px solid ${gradeColor}33`,
              color: gradeColor,
            }}
          />
        )}
      </Box>

      <Typography sx={{
        color: 'rgba(255,255,255,0.35)',
        fontSize: '0.65rem',
        fontFamily: '"Rajdhani","Noto Sans SC",sans-serif',
        mb: 0.5,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
      }}>
        {item.company_name_zh || item.company_name}
      </Typography>

      {(() => {
        const ws = getWeaponStats(item.item_type, item.size);
        if (!ws || ws.dps_max === 0) return null;
        const dpsDisplay = ws.dps_min === ws.dps_max
          ? ws.dps_max.toLocaleString()
          : ws.dps_min.toLocaleString() + '~' + ws.dps_max.toLocaleString();
        const dmgDisplay = ws.damage_min === ws.damage_max
          ? ws.damage_max.toLocaleString()
          : ws.damage_min.toLocaleString() + '~' + ws.damage_max.toLocaleString();
        return (
          <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '0.6rem', fontFamily: '"Orbitron",sans-serif', color: '#ff6644', fontWeight: 700 }}>
              DPS {dpsDisplay}
            </Typography>
            <Typography sx={{ fontSize: '0.55rem', fontFamily: '"Orbitron",sans-serif', color: 'rgba(255,102,68,0.5)' }}>
              {dmgDisplay} DMG
            </Typography>
            {ws.rpm > 0 && (
              <Typography sx={{ fontSize: '0.55rem', fontFamily: '"Orbitron",sans-serif', color: 'rgba(0,221,170,0.5)' }}>
                {ws.rpm} RPM
              </Typography>
            )}
          </Box>
        );
      })()}

      {(() => {
        const uuid = item.uuid?.toLowerCase();
        const shopData = uuid && shopMap[uuid];
        const hasUexPrice = item.can_buy && item.best_price_buy;
        const hasShopData = shopData && shopData.length > 0;
        
        if (hasUexPrice || hasShopData) {
          const shopLocations = hasShopData
            ? [...new Set(shopData.map(s => s.location))].join(' / ')
            : '';
          const shopPrice = hasShopData ? Math.min(...shopData.map(s => s.buy_price).filter(p => p > 0)) : 0;
          const displayPrice = hasUexPrice ? item.best_price_buy : shopPrice;
          
          return (
            <Box sx={{ mt: 'auto' }}>
              {displayPrice > 0 && (
                <Typography sx={{
                  color: priceColor,
                  fontSize: '0.85rem',
                  fontFamily: '"Orbitron",sans-serif',
                  fontWeight: 600,
                }}>
                  {displayPrice.toLocaleString()} <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>aUEC</span>
                </Typography>
              )}
              {(item.buy_location_zh || item.buy_location || shopLocations) && (
                <Typography sx={{
                  color: 'rgba(255,255,255,0.6)',
                  fontSize: '0.6rem',
                  fontFamily: '"Noto Sans SC",sans-serif',
                  lineHeight: 1.2,
                }}>
                  {item.buy_location_zh || item.buy_location || shopLocations}
                </Typography>
              )}
              {hasShopData && !hasUexPrice && (
                <Typography sx={{
                  color: 'rgba(0,221,170,0.3)',
                  fontSize: '0.5rem',
                  fontFamily: '"Rajdhani",sans-serif',
                }}>
                  解包数据
                </Typography>
              )}
            </Box>
          );
        }
        return (
          <Typography sx={{ color: 'rgba(255,255,255,0.15)', fontSize: '0.7rem', mt: 'auto' }}>
            不可购买
          </Typography>
        );
      })()}
    </Box>
  );
}

export default ItemCard;
