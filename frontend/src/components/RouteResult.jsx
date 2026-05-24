import React, { useState } from 'react';
import { Box, Typography, Paper, Tabs, Tab, Alert } from '@mui/material';
import RouteTimeline from './RouteTimeline';
import { TrendingUp, Speed } from '@mui/icons-material';

function RouteResult({ data }) {
  if (!data) return null;

  const [tab, setTab] = useState(0);

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

  // Distance savings
  const distSaved = max_profit_route_total_distance && shortest_route_total_distance
    ? max_profit_route_total_distance - shortest_route_total_distance
    : 0;
  const distSavedPct = max_profit_route_total_distance
    ? Math.round((distSaved / max_profit_route_total_distance) * 100)
    : 0;

  // Revenue diff
  const revDiff = max_profit_route_total_revenue - shortest_route_total_revenue;
  const revDiffPct = max_profit_route_total_revenue
    ? Math.round((revDiff / max_profit_route_total_revenue) * 100)
    : 0;

  return (
    <Box>
      {/* Commodity Summary */}
      <Box sx={{ p: 2.5, mb: 3, background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.88) 0%, rgba(2, 8, 18, 0.92) 100%)', border: '1px solid rgba(0, 180, 255, 0.1)', position: 'relative', '&::before': { content: '""', position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent 0%, rgba(0, 200, 255, 0.3) 30%, rgba(0, 200, 255, 0.3) 70%, transparent 100%)' } }}>
        <Typography variant="h6" sx={{
          color: 'primary.main', mb: 2, fontWeight: 700,
          fontFamily: '"Orbitron", sans-serif', fontSize: '0.9rem',
        }}>
          各商品最高收购价
        </Typography>
        {commodity_summary.map((c, i) => (
          <Box key={i} sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            py: 1, px: 1.5,
            borderBottom: '1px solid rgba(0, 212, 255, 0.05)',
            '&:last-child': { borderBottom: 'none' },
          }}>
            <Box>
              <Typography variant="body1" sx={{ color: '#00d4ff', fontWeight: 600 }}>
                {c.name_zh}
                <Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 1 }}>
                  {c.name}
                </Typography>
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {c.quantity} SCU @ {c.best_terminal}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body1" sx={{ color: '#00ff88', fontWeight: 700 }}>
                {c.best_revenue.toLocaleString()} aUEC
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {c.best_price.toLocaleString()} / SCU
              </Typography>
            </Box>
          </Box>
        ))}
      </Box>

      {/* Comparison summary */}
      <Box sx={{ p: 2, mb: 3, background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.88) 0%, rgba(2, 8, 18, 0.92) 100%)', border: '1px solid rgba(0, 180, 255, 0.08)' }}>
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Speed sx={{ color: '#00d4ff', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: '#00d4ff', fontWeight: 700 }}>
                最短距离路线
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#00d4ff', fontWeight: 700, fontFamily: '"Rajdhani", sans-serif' }}>
              {(shortest_route_total_revenue || 0).toLocaleString()} aUEC
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              总距离: {shortest_route_total_distance} AU · {shortest_route.length} 站
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <TrendingUp sx={{ color: '#ff6b35', fontSize: 20 }} />
              <Typography variant="subtitle2" sx={{ color: '#ff6b35', fontWeight: 700 }}>
                最高利润路线
              </Typography>
            </Box>
            <Typography variant="h5" sx={{ color: '#ff6b35', fontWeight: 700, fontFamily: '"Rajdhani", sans-serif' }}>
              {(max_profit_route_total_revenue || 0).toLocaleString()} aUEC
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              总距离: {max_profit_route_total_distance || '—'} AU · {max_profit_route.length} 站
            </Typography>
          </Box>
        </Box>

        {distSaved > 0 && (
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid rgba(0, 212, 255, 0.1)' }}>
            <Typography variant="body2" sx={{ color: '#00ff88' }}>
              选择最短路线可节省 <strong>{distSaved} AU</strong> 距离（{distSavedPct}% 更短），
              仅少赚 <strong>{revDiff.toLocaleString()} aUEC</strong>（{revDiffPct}% 差额）
            </Typography>
          </Box>
        )}
      </Box>

      {/* Route detail tabs */}
      <Box sx={{ background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.8) 0%, rgba(2, 8, 18, 0.85) 100%)', border: '1px solid rgba(0, 180, 255, 0.06)' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid rgba(0, 212, 255, 0.1)',
            '& .MuiTab-root': { fontFamily: '"Orbitron", sans-serif', fontSize: '0.8rem' },
            '& .Mui-selected': { color: tab === 0 ? '#00d4ff' : '#ff6b35' },
            '& .MuiTabs-indicator': {
              background: tab === 0 ? '#00d4ff' : '#ff6b35',
            },
          }}
        >
          <Tab icon={<Speed sx={{ fontSize: 18 }} />} iconPosition="start" label="最短距离" />
          <Tab icon={<TrendingUp sx={{ fontSize: 18 }} />} iconPosition="start" label="最高利润" />
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          {tab === 0 && (
            <RouteTimeline
              route={shortest_route}
              title="最短距离清仓路线"
              totalDistance={shortest_route_total_distance}
              totalRevenue={shortest_route_total_revenue}
              color="#00d4ff"
            />
          )}
          {tab === 1 && (
            <RouteTimeline
              route={max_profit_route}
              title="最高利润清仓路线"
              totalDistance={max_profit_route_total_distance || 0}
              totalRevenue={max_profit_route_total_revenue}
              color="#ff6b35"
            />
          )}
        </Box>
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

export default RouteResult;
