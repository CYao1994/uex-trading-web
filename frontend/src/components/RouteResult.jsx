import { useState } from 'react';
import { Box, Typography, Tabs, Tab, Alert } from '@mui/material';
import RouteTimeline from './RouteTimeline';
import AnimatedNumber from './AnimatedNumber';
import { TrendingUp, Speed, ShoppingCart, Storefront } from '@mui/icons-material';

function RouteResult({ data, mode = 'sell' }) {
  const [tab, setTab] = useState(0);

  if (!data) return null;

  const isBuyMode = mode === 'buy';

  const {
    commodity_summary,
    shortest_route,
    shortest_route_total_distance,
    shortest_route_total_revenue,
    max_profit_route,
    max_profit_route_total_distance,
    max_profit_route_total_revenue,
    warnings,
  } = data;

  const summaryTitle = isBuyMode ? '各商品最低进货价' : '各商品最高收购价';
  const shortestLabel = isBuyMode ? '最短距离进货路线' : '最短距离清仓路线';
  const maxProfitLabel = isBuyMode ? '最省钱进货路线' : '最高利润清仓路线';

  const routesIdentical = shortest_route.length > 0 &&
    shortest_route.length === max_profit_route.length &&
    shortest_route.every((stop, i) => stop.terminal_id === max_profit_route[i].terminal_id);

  const distSaved = max_profit_route_total_distance && shortest_route_total_distance
    ? max_profit_route_total_distance - shortest_route_total_distance : 0;
  const distSavedPct = max_profit_route_total_distance
    ? Math.round((distSaved / max_profit_route_total_distance) * 100) : 0;

  const revDiff = max_profit_route_total_revenue - shortest_route_total_revenue;
  const revDiffPct = max_profit_route_total_revenue
    ? Math.round((revDiff / max_profit_route_total_revenue) * 100) : 0;

  const items = commodity_summary || [];

  return (
    <Box>
      {/* Commodity Summary */}
      <Box sx={{ p: { xs: 1.5, md: 2.5 }, mb: 3, background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)', border: '1px solid rgba(201, 162, 39, 0.1)', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(201, 162, 39, 0.3) 30%, rgba(201, 162, 39, 0.3) 70%, transparent 100%)' } }}>
        <Typography variant="h6" sx={{
          color: 'primary.main', mb: 2, fontWeight: 700,
          fontFamily: '"Orbitron", sans-serif', fontSize: '0.9rem',
        }}>
          {summaryTitle}
        </Typography>
        {items.length > 0 && items.map((c, i) => {
          const scuAvailable = isBuyMode ? c.scu_sell : c.scu_buy;
          const hasStockWarning = scuAvailable > 0 && scuAvailable < c.quantity;

          return (
            <Box key={i} sx={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              py: 1, px: 1.5,
              borderBottom: '1px solid rgba(201, 162, 39, 0.05)',
              '&:last-child': { borderBottom: 'none' },
            }}>
              <Box>
                <Typography variant="body1" sx={{ color: '#c9a227', fontWeight: 600 }}>
                  {c.name_zh}
                  <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                    {c.name}
                  </Typography>
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {c.quantity} SCU @ {c.best_terminal}
                  {scuAvailable > 0 && (
                    <Box component="span" sx={{ ml: 1, color: hasStockWarning ? '#ffc832' : 'text.secondary' }}>
                      {isBuyMode ? (
                        <><Storefront sx={{ fontSize: 11, verticalAlign: 'middle', mr: 0.3 }} />库存{scuAvailable.toLocaleString()}</>
                      ) : (
                        <><ShoppingCart sx={{ fontSize: 11, verticalAlign: 'middle', mr: 0.3 }} />收购{scuAvailable.toLocaleString()}</>
                      )}
                    </Box>
                  )}
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body1" sx={{ color: isBuyMode ? '#ff8844' : '#00ff88', fontWeight: 700 }}>
                  <AnimatedNumber target={c.best_revenue || 0} duration={600} suffix=" aUEC" />
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {c.best_price.toLocaleString()} / SCU
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      {/* Comparison summary */}
      <Box sx={{ p: { xs: 1.5, md: 2 }, mb: 3, background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.92) 0%, rgba(2, 8, 18, 0.95) 100%)', border: '1px solid rgba(201, 162, 39, 0.08)' }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Speed sx={{ color: '#c9a227', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: '#c9a227', fontWeight: 700 }}>
                最短距离路线
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#c9a227', fontWeight: 700, fontFamily: '"Rajdhani", sans-serif' }}>
              <AnimatedNumber target={shortest_route_total_revenue || 0} duration={700} suffix=" aUEC" />
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              总距离: {shortest_route_total_distance} AU · {shortest_route.length} 站
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp sx={{ color: '#ff6b35', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: '#ff6b35', fontWeight: 700 }}>
                {isBuyMode ? '最省钱路线' : '最高利润路线'}
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#ff6b35', fontWeight: 700, fontFamily: '"Rajdhani", sans-serif' }}>
              <AnimatedNumber target={max_profit_route_total_revenue || 0} duration={700} suffix=" aUEC" />
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              总距离: {max_profit_route_total_distance || '—'} AU · {max_profit_route.length} 站
            </Typography>
          </Box>
        </Box>

        {routesIdentical && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(201, 162, 39, 0.1)' }}>
            <Typography variant="body2" sx={{ color: 'rgba(201, 162, 39, 0.7)' }}>
              💡 当前{isBuyMode ? '最省钱路线' : '最高利润路线'}与最短距离路线一致，附近站点价格最优
            </Typography>
          </Box>
        )}

        {distSaved > 0 && !routesIdentical && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(201, 162, 39, 0.1)' }}>
            <Typography variant="body2" sx={{ color: '#00ff88' }}>
              选择最短路线可节省 <strong>{distSaved} AU</strong> 距离（{distSavedPct}% 更短），
              {isBuyMode
                ? <>仅多花费 <strong>{revDiff.toLocaleString()} aUEC</strong>（{revDiffPct}% 差额）</>
                : <>仅少赚 <strong>{revDiff.toLocaleString()} aUEC</strong>（{revDiffPct}% 差额）</>
              }
            </Typography>
          </Box>
        )}
      </Box>

      {/* Route detail tabs */}
      <Box sx={{ background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.9) 0%, rgba(2, 8, 18, 0.92) 100%)', border: '1px solid rgba(201, 162, 39, 0.06)' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
            '& .MuiTab-root': { fontFamily: '"Orbitron", sans-serif', fontSize: '0.8rem' },
            '& .Mui-selected': { color: tab === 0 ? '#c9a227' : '#ff6b35' },
            '& .MuiTabs-indicator': {
              background: tab === 0 ? '#c9a227' : '#ff6b35',
              transition: 'left 0.3s ease-out !important',
            },
          }}
        >
          <Tab icon={<Speed sx={{ fontSize: 18 }} />} iconPosition="start" label="最短距离" />
          <Tab icon={<TrendingUp sx={{ fontSize: 18 }} />} iconPosition="start" label={isBuyMode ? '最省钱' : '最高利润'} />
        </Tabs>

        <Box sx={{ p: { xs: 1.5, md: 2.5 } }}>
          {tab === 0 && (
            <RouteTimeline
              route={shortest_route}
              title={shortestLabel}
              totalDistance={shortest_route_total_distance}
              totalRevenue={shortest_route_total_revenue}
              color="#c9a227"
              mode={mode}
            />
          )}
          {tab === 1 && (
            <RouteTimeline
              route={max_profit_route}
              title={maxProfitLabel}
              totalDistance={max_profit_route_total_distance || 0}
              totalRevenue={max_profit_route_total_revenue}
              color="#ff6b35"
              mode={mode}
            />
          )}
        </Box>
      </Box>

      {/* Data source */}
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
            <Alert key={i} severity="warning" sx={{ mb: 1, '& .MuiAlert-message': { fontSize: '0.85rem' } }}>
              {w}
            </Alert>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default RouteResult;
