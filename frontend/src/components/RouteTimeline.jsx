import { Box, Typography, Chip, Stack } from '@mui/material';
import { LocationOn, ArrowForward, Inventory2 } from '@mui/icons-material';

function RouteTimeline({ route, title, totalDistance, totalRevenue, color = '#00d4ff' }) {
  if (!route || route.length === 0) return null;

  return (
    <Box>
      {/* Header */}
      <Box sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        mb: 2, pb: 1,
        borderBottom: `1px solid ${color}33`,
      }}>
        <Typography variant="h6" sx={{ color, fontWeight: 700, fontFamily: '"Orbitron", sans-serif', fontSize: '0.95rem' }}>
          {title}
        </Typography>
        <Stack direction="row" spacing={2}>
          <Chip
            label={`${totalDistance} AU`}
            size="small"
            sx={{
              background: `${color}15`,
              border: `1px solid ${color}33`,
              color,
              fontWeight: 700,
              fontFamily: '"Rajdhani", sans-serif',
            }}
          />
          <Chip
            label={`${(totalRevenue || 0).toLocaleString()} aUEC`}
            size="small"
            sx={{
              background: 'rgba(0, 255, 136, 0.1)',
              border: '1px solid rgba(0, 255, 136, 0.25)',
              color: '#00ff88',
              fontWeight: 700,
              fontFamily: '"Rajdhani", sans-serif',
            }}
          />
        </Stack>
      </Box>

      {/* Timeline */}
      <Box sx={{ position: 'relative', pl: 3 }}>
        {/* Vertical line */}
        <Box sx={{
          position: 'absolute', left: 10, top: 8, bottom: 8,
          width: 2,
          background: `linear-gradient(180deg, ${color}, ${color}33)`,
          borderRadius: 1,
        }} />

        {route.map((stop, idx) => (
          <Box
            key={idx}
            className="animate-slide-in"
            sx={{
              position: 'relative',
              mb: 2.5,
              animationDelay: `${idx * 0.15}s`,
            }}
          >
            {/* Node dot */}
            <Box sx={{
              position: 'absolute',
              left: -22,
              top: 10,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: idx === 0 ? color : `${color}88`,
              border: `2px solid ${color}`,
              boxShadow: `0 0 10px ${color}44`,
            }} />

            {/* Stop card */}
            <Box sx={{
              p: 2,
              borderRadius: 2,
              background: 'rgba(13, 19, 33, 0.6)',
              border: `1px solid ${color}18`,
              '&:hover': {
                border: `1px solid ${color}33`,
                background: 'rgba(13, 19, 33, 0.8)',
              },
              transition: 'all 0.2s',
            }}>
              {/* Terminal name + distance */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="subtitle1" sx={{ color, fontWeight: 700, fontSize: '1rem' }}>
                    <LocationOn sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    {stop.terminal_name_zh}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {stop.terminal_name} · {stop.planet_zh ? `${stop.planet_zh} · ` : ''}{stop.system_zh}
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                    {idx === 0 ? '距出发' : '距上站'}
                  </Typography>
                  <Typography variant="body1" sx={{ color: color, fontWeight: 700 }}>
                    {stop.distance_from_prev != null ? `${stop.distance_from_prev} AU` : '—'}
                  </Typography>
                </Box>
              </Box>

              {/* Commodities sold */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {stop.commodities_sold.map((comm, ci) => (
                  <Box
                    key={ci}
                    sx={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      px: 1.5, py: 0.5,
                      borderRadius: 1,
                      background: 'rgba(0, 255, 136, 0.04)',
                      border: '1px solid rgba(0, 255, 136, 0.08)',
                    }}
                  >
                    <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 600 }}>
                      <Inventory2 sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                      {comm.name_zh} × {comm.quantity} SCU
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600 }}>
                      {comm.price_per_scu.toLocaleString()} × {comm.quantity} =
                      <Box component="span" sx={{ color: '#00ff88', ml: 0.5 }}>
                        {comm.revenue.toLocaleString()} aUEC
                      </Box>
                    </Typography>
                  </Box>
                ))}
              </Box>

              {/* Stop total */}
              <Box sx={{
                mt: 1, pt: 1,
                borderTop: `1px solid ${color}15`,
                display: 'flex', justifyContent: 'space-between',
              }}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  累计距离: {stop.cumulative_distance || 0} AU
                </Typography>
                <Typography variant="body2" sx={{ color: '#00ff88', fontWeight: 700 }}>
                  本站: {stop.stop_revenue.toLocaleString()} aUEC
                </Typography>
              </Box>
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default RouteTimeline;
