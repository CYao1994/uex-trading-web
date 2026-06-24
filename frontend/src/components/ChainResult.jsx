import React from 'react';
import { Box, Typography, Alert, Button } from '@mui/material';
import { TrendingUp, AccountBalance, Link, ArrowDownward, Refresh, Navigation } from '@mui/icons-material';
import AnimatedNumber from './AnimatedNumber';

/**
 * Render a single commodity row within a leg's commodity list.
 * Primary commodities get a gold label, supplements get a blue label.
 */
function CommodityRow({ item }) {
  const isPrimary = item.is_primary !== false;
  const labelColor = isPrimary ? '#ffaa00' : '#c9a227';
  const labelBg = isPrimary
    ? 'rgba(255, 170, 0, 0.1)'
    : 'rgba(201, 162, 39, 0.08)';
  const labelBorder = isPrimary
    ? '1px solid rgba(255, 170, 0, 0.25)'
    : '1px solid rgba(201, 162, 39, 0.2)';
  const labelText = isPrimary ? '主选' : '补充';

  return (
    <Box sx={{
      display: 'flex',
      alignItems: 'center',
      gap: 1.5,
      py: 0.75,
      px: 1.5,
      background: isPrimary ? 'rgba(255, 170, 0, 0.03)' : 'rgba(201, 162, 39, 0.02)',
      borderLeft: `2px solid ${isPrimary ? 'rgba(255, 170, 0, 0.3)' : 'rgba(201, 162, 39, 0.15)'}`,
      mb: 0.5,
    }}>
      {/* Tag */}
      <Box sx={{
        px: 0.75,
        py: 0.15,
        background: labelBg,
        border: labelBorder,
        borderRadius: '1px',
        flexShrink: 0,
      }}>
        <Typography sx={{
          fontSize: '0.6rem',
          fontFamily: '"Orbitron", sans-serif',
          fontWeight: 700,
          color: labelColor,
          letterSpacing: '0.06em',
          lineHeight: 1.4,
        }}>
          {labelText}
        </Typography>
      </Box>

      {/* Commodity name */}
      <Typography sx={{
        fontSize: '0.8rem',
        fontWeight: 600,
        fontFamily: '"Noto Sans SC", "Rajdhani", sans-serif',
        color: '#e0e8f0',
        flex: '0 0 auto',
      }}>
        {item.commodity_name_zh || item.commodity_name}
      </Typography>

      {/* Volume */}
      <Typography sx={{
        fontSize: '0.7rem',
        color: 'rgba(201, 162, 39, 0.5)',
        fontFamily: '"Rajdhani", sans-serif',
      }}>
        ×{item.volume_scu}SCU
      </Typography>

      {/* Price info */}
      <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255, 136, 68, 0.6)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.04em' }}>
            买
          </Typography>
          <Typography sx={{ color: '#ff8844', fontWeight: 600, fontSize: '0.8rem', fontFamily: '"Rajdhani", sans-serif' }}>
            {Number(item.price_buy || 0).toLocaleString()}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', color: 'rgba(0, 255, 136, 0.6)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.04em' }}>
            卖
          </Typography>
          <Typography sx={{ color: '#00ff88', fontWeight: 600, fontSize: '0.8rem', fontFamily: '"Rajdhani", sans-serif' }}>
            {Number(item.price_sell || 0).toLocaleString()}
          </Typography>
        </Box>
        <Box>
          <Typography sx={{ fontSize: '0.6rem', color: 'rgba(201, 162, 39, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.04em' }}>
            利润
          </Typography>
          <Typography sx={{
            color: item.profit > 0 ? '#00ff88' : '#ff4455',
            fontWeight: 600,
            fontSize: '0.8rem',
            fontFamily: '"Rajdhani", sans-serif',
          }}>
            {item.profit > 0 ? '+' : ''}{Number(item.profit || 0).toLocaleString()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

function ChainResult({ data, onRefresh }) {
  if (!data) return null;

  const {
    legs,
    total_profit,
    final_capital,
    total_legs,
    early_stop_reason,
    warnings,
  } = data;

  const totalDistance = legs ? legs.reduce((sum, leg) => sum + (leg.distance || 0), 0) : 0;

  if (!legs || legs.length === 0) {
    return (
      <Box sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.85,
      }}>
        <Box sx={{
          width: 90, height: 90,
          background: 'linear-gradient(135deg, rgba(201, 162, 39, 0.05), rgba(154, 122, 26, 0.03))',
          border: '1px solid rgba(201, 162, 39, 0.12)',
          clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mb: 3,
        }}>
          <Link sx={{ color: '#c9a227', fontSize: 36, opacity: 0.5 }} />
        </Box>
        <Typography variant="h6" sx={{
          fontFamily: '"Orbitron", sans-serif',
          color: '#c9a227',
          fontWeight: 600,
          fontSize: '0.85rem',
          mb: 1,
          letterSpacing: '0.08em',
        }}>
          无可用路线
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(201, 162, 39, 0.5)', textAlign: 'center', fontSize: '0.85rem' }}>
          {early_stop_reason || '未找到盈利路线，请调整参数后重试'}
        </Typography>

        {warnings && warnings.length > 0 && (
          <Box sx={{ mt: 3, width: '100%', maxWidth: 400 }}>
            {warnings.map((w, i) => (
              <Alert
                key={i}
                severity="warning"
                action={
                  onRefresh ? (
                    <Button
                      color="inherit"
                      size="small"
                      onClick={onRefresh}
                      startIcon={<Refresh sx={{ fontSize: 14 }} />}
                      sx={{
                        fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                        fontWeight: 600, fontSize: '0.72rem',
                      }}
                    >
                      刷新数据
                    </Button>
                  ) : undefined
                }
                sx={{ mb: 1, background: 'rgba(255, 170, 0, 0.06)', border: '1px solid rgba(255, 170, 0, 0.15)', '& .MuiAlert-message': { fontSize: '0.8rem' } }}
              >
                {w}
              </Alert>
            ))}
          </Box>
        )}
      </Box>
    );
  }

  const isProfitPositive = total_profit > 0;
  const profitColor = isProfitPositive ? '#00ff88' : '#ff4455';
  const initialCapital = Math.round((final_capital || 0) - (total_profit || 0));

  /**
   * Check if a leg has multi-commodity data.
   * Backward compatible: if commodities field is missing or has only 1 entry,
   * fall back to the original single-commodity display.
   */
  const hasMultiCommodities = (leg) => {
    return leg.commodities && Array.isArray(leg.commodities) && leg.commodities.length > 1;
  };

  /**
   * Build the route arrow label for multi-commodity legs.
   * Shows "主商品名 + N补充" format.
   */
  const getArrowLabel = (leg) => {
    if (!hasMultiCommodities(leg)) return null;
    const primary = leg.commodities.find(c => c.is_primary) || leg.commodities[0];
    const supplementCount = leg.commodities.filter(c => !c.is_primary).length;
    if (supplementCount === 0) return primary.commodity_name_zh || primary.commodity_name;
    return `${primary.commodity_name_zh || primary.commodity_name}+${supplementCount}补充`;
  };

  return (
    <Box>
      {/* Summary Panel */}
      <Box className="celebrate-glow" sx={{
        p: { xs: 1.5, md: 2.5 },
        mb: 3,
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)',
        border: '1px solid rgba(201, 162, 39, 0.1)',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          height: '1px',
          background: `linear-gradient(90deg, transparent 0%, ${profitColor}66 30%, ${profitColor}66 70%, transparent 100%)`,
        },
      }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          {/* Total Profit */}
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp sx={{ color: profitColor, fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: profitColor, fontWeight: 700, fontFamily: '"Orbitron", sans-serif', fontSize: '0.75rem' }}>
                总利润
              </Typography>
            </Box>
            <Typography variant="h4" sx={{
              color: profitColor,
              fontWeight: 700,
              fontFamily: '"Rajdhani", sans-serif',
              lineHeight: 1.2,
            }}>
              {isProfitPositive ? '+' : ''}
              <AnimatedNumber
                target={Number(total_profit)}
                duration={1000}
                prefix=""
                suffix=" aUEC"
                formatter={(v) => Math.round(v).toLocaleString()}
              />
            </Typography>
          </Box>

          {/* Final Capital */}
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccountBalance sx={{ color: '#c9a227', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: '#c9a227', fontWeight: 700, fontFamily: '"Orbitron", sans-serif', fontSize: '0.75rem' }}>
                最终资金
              </Typography>
            </Box>
            <Typography variant="h4" sx={{
              color: '#c9a227',
              fontWeight: 700,
              fontFamily: '"Rajdhani", sans-serif',
              lineHeight: 1.2,
            }}>
              <AnimatedNumber
                target={Number(final_capital)}
                duration={1000}
                suffix=" aUEC"
                formatter={(v) => Math.round(v).toLocaleString()}
              />
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(201, 162, 39, 0.35)' }}>
              初始: {Number(initialCapital).toLocaleString()} aUEC
            </Typography>
          </Box>

          {/* Legs Count */}
          <Box sx={{ flex: '0 0 auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Link sx={{ color: 'rgba(201, 162, 39, 0.5)', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: 'rgba(201, 162, 39, 0.5)', fontWeight: 700, fontFamily: '"Orbitron", sans-serif', fontSize: '0.75rem' }}>
                跑商段数
              </Typography>
            </Box>
            <Typography variant="h4" sx={{
              color: 'rgba(201, 162, 39, 0.7)',
              fontWeight: 700,
              fontFamily: '"Rajdhani", sans-serif',
              lineHeight: 1.2,
            }}>
              <AnimatedNumber target={total_legs} duration={400} formatter={(v) => Math.round(v).toString()} />
            </Typography>
          </Box>

          {/* Total Distance */}
          {totalDistance > 0 && (
            <Box sx={{ flex: '0 0 auto' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Navigation sx={{ color: 'rgba(201, 162, 39, 0.5)', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ color: 'rgba(201, 162, 39, 0.5)', fontWeight: 700, fontFamily: '"Orbitron", sans-serif', fontSize: '0.75rem' }}>
                  总距离
                </Typography>
              </Box>
              <Typography variant="h4" sx={{
                color: 'rgba(201, 162, 39, 0.7)',
                fontWeight: 700,
                fontFamily: '"Rajdhani", sans-serif',
                lineHeight: 1.2,
              }}>
                {totalDistance} <Typography component="span" sx={{ fontSize: '0.7rem', color: 'rgba(201, 162, 39, 0.4)' }}>AU</Typography>
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      {/* Chain Timeline */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.9) 0%, rgba(2, 8, 18, 0.92) 100%)',
        border: '1px solid rgba(201, 162, 39, 0.06)',
        p: { xs: 1.5, md: 2.5 },
      }}>
        <Typography variant="h6" sx={{
          color: '#c9a227',
          mb: 2.5,
          fontWeight: 700,
          fontFamily: '"Orbitron", sans-serif',
          fontSize: '0.85rem',
          letterSpacing: '0.05em',
        }}>
          路线详情
        </Typography>

        {legs.map((leg, idx) => {
          const legProfitPositive = leg.profit > 0;
          const legProfitColor = legProfitPositive ? '#00ff88' : '#ff4455';
          const isMulti = hasMultiCommodities(leg);
          const arrowLabel = getArrowLabel(leg);

          return (
            <React.Fragment key={idx}>
              <Box sx={{
                p: 2,
                mb: 0,
                background: 'rgba(0, 10, 20, 0.4)',
                border: '1px solid rgba(201, 162, 39, 0.08)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '3px', height: '100%',
                  background: `linear-gradient(180deg, ${legProfitColor}88, ${legProfitColor}22)`,
                },
              }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{
                    fontFamily: '"Orbitron", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    color: '#c9a227',
                    letterSpacing: '0.08em',
                  }}>
                    第 {leg.leg_index} 段
                  </Typography>
                  <Typography sx={{
                    color: legProfitColor,
                    fontWeight: 700,
                    fontSize: '1rem',
                    fontFamily: '"Rajdhani", sans-serif',
                  }}>
                    {legProfitPositive ? '+' : ''}
                    <AnimatedNumber
                      target={Number(leg.profit)}
                      duration={600}
                      suffix=" aUEC"
                      formatter={(v) => Math.round(v).toLocaleString()}
                    />
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  <Box sx={{
                    px: 1.5, py: 0.5,
                    background: 'rgba(201, 162, 39, 0.06)',
                    border: '1px solid rgba(201, 162, 39, 0.12)',
                  }}>
                    <Typography sx={{ color: '#c9a227', fontSize: '0.8rem', fontWeight: 600, fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif' }}>
                      {leg.origin_name_zh}
                      {leg.origin_name && leg.origin_name !== leg.origin_name_zh && (
                        <Typography component="span" sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.4)', fontWeight: 400, ml: 0.5 }}>
                          {leg.origin_name}
                        </Typography>
                      )}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(201, 162, 39, 0.3)' }}>
                    <Box sx={{ width: 16, height: '1px', background: 'rgba(201, 162, 39, 0.2)' }} />
                    <Typography sx={{ fontSize: '0.7rem', color: '#ffaa00', fontWeight: 600, fontFamily: '"Noto Sans SC", sans-serif', whiteSpace: 'nowrap' }}>
                      {arrowLabel || leg.commodity_name_zh}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.4)', fontFamily: '"Rajdhani", sans-serif' }}>
                      ×{leg.volume_scu}SCU
                    </Typography>
                    <Box sx={{ width: 16, height: '1px', background: 'rgba(201, 162, 39, 0.2)' }} />
                  </Box>

                  <Box sx={{
                    px: 1.5, py: 0.5,
                    background: 'rgba(201, 162, 39, 0.06)',
                    border: '1px solid rgba(201, 162, 39, 0.12)',
                  }}>
                    <Typography sx={{ color: '#c9a227', fontSize: '0.8rem', fontWeight: 600, fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif' }}>
                      {leg.destination_name_zh}
                      {leg.destination_name && leg.destination_name !== leg.destination_name_zh && (
                        <Typography component="span" sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.4)', fontWeight: 400, ml: 0.5 }}>
                          {leg.destination_name}
                        </Typography>
                      )}
                    </Typography>
                  </Box>

                  {leg.destination_system_zh && (
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.25)', fontFamily: '"Noto Sans SC", sans-serif' }}>
                      {leg.destination_planet_zh && `${leg.destination_planet_zh} · `}{leg.destination_system_zh}
                    </Typography>
                  )}
                  {leg.distance != null && leg.distance > 0 && (
                    <Typography sx={{ fontSize: '0.6rem', color: 'rgba(201, 162, 39, 0.2)', fontFamily: '"Orbitron", sans-serif', mt: 0.3 }}>
                      {leg.distance} AU
                    </Typography>
                  )}
                </Box>

                {/* Multi-commodity detail list */}
                {isMulti ? (
                  <Box sx={{ mb: 1 }}>
                    {leg.commodities.map((c, ci) => (
                      <CommodityRow key={ci} item={c} />
                    ))}
                    {/* Summary row */}
                    <Box sx={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 3,
                      pt: 1,
                      mt: 0.5,
                      borderTop: '1px dashed rgba(201, 162, 39, 0.08)',
                    }}>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.6rem', color: 'rgba(201, 162, 39, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.04em' }}>
                          总成本
                        </Typography>
                        <Typography sx={{ color: 'rgba(201, 162, 39, 0.7)', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                          {Number(leg.total_cost || 0).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontSize: '0.6rem', color: 'rgba(201, 162, 39, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.04em' }}>
                          总收入
                        </Typography>
                        <Typography sx={{ color: 'rgba(201, 162, 39, 0.7)', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                          {Number(leg.total_revenue || 0).toLocaleString()}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ) : (
                  /* Original single-commodity detail row */
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em' }}>
                        买入价
                      </Typography>
                      <Typography sx={{ color: '#ff8844', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                        {Number(leg.price_buy || 0).toLocaleString()} /SCU
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em' }}>
                        卖出价
                      </Typography>
                      <Typography sx={{ color: '#00ff88', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                        {Number(leg.price_sell || 0).toLocaleString()} /SCU
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em' }}>
                        成本
                      </Typography>
                      <Typography sx={{ color: 'rgba(201, 162, 39, 0.7)', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                        {Number(leg.total_cost || 0).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography sx={{ fontSize: '0.65rem', color: 'rgba(201, 162, 39, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em' }}>
                        收入
                      </Typography>
                      <Typography sx={{ color: 'rgba(201, 162, 39, 0.7)', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                        {Number(leg.total_revenue || 0).toLocaleString()}
                      </Typography>
                    </Box>
                  </Box>
                )}
              </Box>

              {idx < legs.length - 1 && (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  py: 0.5,
                }}>
                  <ArrowDownward sx={{
                    fontSize: 16,
                    color: 'rgba(201, 162, 39, 0.15)',
                  }} />
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </Box>

      {early_stop_reason && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{
            '& .MuiAlert-message': { fontSize: '0.8rem' },
            background: 'rgba(154, 122, 26, 0.08)',
            border: '1px solid rgba(154, 122, 26, 0.15)',
            borderRadius: '2px',
            color: '#66bbff',
          }}>
            {early_stop_reason}
          </Alert>
        </Box>
      )}

      <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
        <Typography sx={{
          color: 'rgba(201, 162, 39, 0.15)',
          fontSize: '0.55rem',
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '0.05em',
        }}>
          数据来源: UEXCORP.SPACE
        </Typography>
      </Box>

      {warnings && warnings.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {warnings.map((w, i) => (
            <Alert
              key={i}
              severity="warning"
              action={
                onRefresh ? (
                  <Button
                    color="inherit"
                    size="small"
                    onClick={onRefresh}
                    startIcon={<Refresh sx={{ fontSize: 14 }} />}
                    sx={{
                      fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
                      fontWeight: 600, fontSize: '0.72rem',
                    }}
                  >
                    刷新数据
                  </Button>
                ) : undefined
              }
              sx={{ mb: 1, background: 'rgba(255, 170, 0, 0.06)', border: '1px solid rgba(255, 170, 0, 0.15)', '& .MuiAlert-message': { fontSize: '0.85rem' } }}
            >
              {w}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default ChainResult;
