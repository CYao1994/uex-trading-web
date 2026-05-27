import React from 'react';
import { Box, Typography, Alert } from '@mui/material';
import { TrendingUp, AccountBalance, Link, ArrowDownward } from '@mui/icons-material';

function ChainResult({ data }) {
  if (!data) return null;

  const {
    legs,
    total_profit,
    final_capital,
    total_legs,
    early_stop_reason,
    warnings,
  } = data;

  // No legs — show empty state
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
          background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.05), rgba(0, 100, 200, 0.03))',
          border: '1px solid rgba(0, 200, 255, 0.12)',
          clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mb: 3,
        }}>
          <Link sx={{ color: '#00c8ff', fontSize: 36, opacity: 0.5 }} />
        </Box>
        <Typography variant="h6" sx={{
          fontFamily: '"Orbitron", sans-serif',
          color: '#00c8ff',
          fontWeight: 600,
          fontSize: '0.85rem',
          mb: 1,
          letterSpacing: '0.08em',
        }}>
          无可用路线
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(0, 200, 255, 0.5)', textAlign: 'center', fontSize: '0.85rem' }}>
          {early_stop_reason || '未找到盈利路线，请调整参数后重试'}
        </Typography>

        {warnings && warnings.length > 0 && (
          <Box sx={{ mt: 3, width: '100%', maxWidth: 400 }}>
            {warnings.map((w, i) => (
              <Alert key={i} severity="warning" sx={{ mb: 1, '& .MuiAlert-message': { fontSize: '0.8rem' } }}>
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
  const initialCapital = final_capital - total_profit;

  return (
    <Box>
      {/* Summary Panel */}
      <Box sx={{
        p: 2.5,
        mb: 3,
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)',
        border: '1px solid rgba(0, 180, 255, 0.1)',
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
              {isProfitPositive ? '+' : ''}{Number(total_profit).toLocaleString(undefined, { maximumFractionDigits: 0 })} aUEC
            </Typography>
          </Box>

          {/* Final Capital */}
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <AccountBalance sx={{ color: '#00d4ff', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: '#00d4ff', fontWeight: 700, fontFamily: '"Orbitron", sans-serif', fontSize: '0.75rem' }}>
                最终资金
              </Typography>
            </Box>
            <Typography variant="h4" sx={{
              color: '#00d4ff',
              fontWeight: 700,
              fontFamily: '"Rajdhani", sans-serif',
              lineHeight: 1.2,
            }}>
              {Number(final_capital).toLocaleString(undefined, { maximumFractionDigits: 0 })} aUEC
            </Typography>
            <Typography variant="caption" sx={{ color: 'rgba(0, 200, 255, 0.35)' }}>
              初始: {Number(initialCapital).toLocaleString(undefined, { maximumFractionDigits: 0 })} aUEC
            </Typography>
          </Box>

          {/* Legs Count */}
          <Box sx={{ flex: '0 0 auto' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Link sx={{ color: 'rgba(0, 200, 255, 0.5)', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: 'rgba(0, 200, 255, 0.5)', fontWeight: 700, fontFamily: '"Orbitron", sans-serif', fontSize: '0.75rem' }}>
                跑商段数
              </Typography>
            </Box>
            <Typography variant="h4" sx={{
              color: 'rgba(0, 200, 255, 0.7)',
              fontWeight: 700,
              fontFamily: '"Rajdhani", sans-serif',
              lineHeight: 1.2,
            }}>
              {total_legs}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Chain Timeline */}
      <Box sx={{
        background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.9) 0%, rgba(2, 8, 18, 0.92) 100%)',
        border: '1px solid rgba(0, 180, 255, 0.06)',
        p: 2.5,
      }}>
        <Typography variant="h6" sx={{
          color: '#00c8ff',
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

          return (
            <React.Fragment key={idx}>
              {/* Leg Card */}
              <Box sx={{
                p: 2,
                mb: idx < legs.length - 1 ? 0 : 0,
                background: 'rgba(0, 10, 20, 0.4)',
                border: '1px solid rgba(0, 180, 255, 0.08)',
                position: 'relative',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0, left: 0,
                  width: '3px', height: '100%',
                  background: `linear-gradient(180deg, ${legProfitColor}88, ${legProfitColor}22)`,
                },
              }}>
                {/* Leg Header */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography sx={{
                    fontFamily: '"Orbitron", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.8rem',
                    color: '#00c8ff',
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
                    {legProfitPositive ? '+' : ''}{Number(leg.profit).toLocaleString(undefined, { maximumFractionDigits: 0 })} aUEC
                  </Typography>
                </Box>

                {/* Route: Origin → Commodity → Destination */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
                  <Box sx={{
                    px: 1.5, py: 0.5,
                    background: 'rgba(0, 200, 255, 0.06)',
                    border: '1px solid rgba(0, 180, 255, 0.12)',
                  }}>
                    <Typography sx={{ color: '#00d4ff', fontSize: '0.8rem', fontWeight: 600, fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif' }}>
                      {leg.origin_name_zh}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: 'rgba(0, 200, 255, 0.3)' }}>
                    <Box sx={{ width: 16, height: '1px', background: 'rgba(0, 200, 255, 0.2)' }} />
                    <Typography sx={{ fontSize: '0.7rem', color: '#ffaa00', fontWeight: 600, fontFamily: '"Noto Sans SC", sans-serif', whiteSpace: 'nowrap' }}>
                      {leg.commodity_name_zh}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(0, 200, 255, 0.4)', fontFamily: '"Rajdhani", sans-serif' }}>
                      ×{leg.volume_scu}SCU
                    </Typography>
                    <Box sx={{ width: 16, height: '1px', background: 'rgba(0, 200, 255, 0.2)' }} />
                  </Box>

                  <Box sx={{
                    px: 1.5, py: 0.5,
                    background: 'rgba(0, 200, 255, 0.06)',
                    border: '1px solid rgba(0, 180, 255, 0.12)',
                  }}>
                    <Typography sx={{ color: '#00d4ff', fontSize: '0.8rem', fontWeight: 600, fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif' }}>
                      {leg.destination_name_zh}
                    </Typography>
                  </Box>

                  {leg.destination_system_zh && (
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(0, 200, 255, 0.25)', fontFamily: '"Noto Sans SC", sans-serif' }}>
                      {leg.destination_planet_zh && `${leg.destination_planet_zh} · `}{leg.destination_system_zh}
                    </Typography>
                  )}
                </Box>

                {/* Price Details */}
                <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(0, 200, 255, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em' }}>
                      买入价
                    </Typography>
                    <Typography sx={{ color: '#ff8844', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                      {Number(leg.price_buy).toLocaleString()} /SCU
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(0, 200, 255, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em' }}>
                      卖出价
                    </Typography>
                    <Typography sx={{ color: '#00ff88', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                      {Number(leg.price_sell).toLocaleString()} /SCU
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(0, 200, 255, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em' }}>
                      成本
                    </Typography>
                    <Typography sx={{ color: 'rgba(0, 200, 255, 0.7)', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                      {Number(leg.total_cost).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography sx={{ fontSize: '0.65rem', color: 'rgba(0, 200, 255, 0.3)', fontFamily: '"Orbitron", sans-serif', letterSpacing: '0.05em' }}>
                      收入
                    </Typography>
                    <Typography sx={{ color: 'rgba(0, 200, 255, 0.7)', fontWeight: 600, fontSize: '0.85rem', fontFamily: '"Rajdhani", sans-serif' }}>
                      {Number(leg.total_revenue).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>
              </Box>

              {/* Arrow connector between legs */}
              {idx < legs.length - 1 && (
                <Box sx={{
                  display: 'flex',
                  justifyContent: 'center',
                  py: 0.5,
                }}>
                  <ArrowDownward sx={{
                    fontSize: 16,
                    color: 'rgba(0, 200, 255, 0.15)',
                  }} />
                </Box>
              )}
            </React.Fragment>
          );
        })}
      </Box>

      {/* Early stop reason */}
      {early_stop_reason && (
        <Box sx={{ mt: 2 }}>
          <Alert severity="info" sx={{
            '& .MuiAlert-message': { fontSize: '0.8rem' },
            background: 'rgba(0, 100, 200, 0.08)',
            border: '1px solid rgba(0, 150, 255, 0.15)',
            borderRadius: '2px',
            color: '#66bbff',
          }}>
            {early_stop_reason}
          </Alert>
        </Box>
      )}

      {/* Data source */}
      <Box sx={{
        mt: 2,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <Typography sx={{
          color: 'rgba(0, 200, 255, 0.15)',
          fontSize: '0.55rem',
          fontFamily: '"Orbitron", sans-serif',
          letterSpacing: '0.05em',
        }}>
          DATA FROM UEXCORP.SPACE
        </Typography>
      </Box>

      {/* Warnings */}
      {warnings && warnings.length > 0 && (
        <Box sx={{ mt: 2 }}>
          {warnings.map((w, i) => (
            <Alert key={i} severity="warning" sx={{ mb: 1, '& .MuiAlert-message': { fontSize: '0.85rem' } }}>
              {w}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default ChainResult;
