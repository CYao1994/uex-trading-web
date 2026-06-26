import { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Dialog, DialogTitle, DialogContent, IconButton, Chip, Divider } from '@mui/material';
import { Close, Place } from '@mui/icons-material';
import { rawNameToLocationKey } from '../utils/mineralKeys';

const FIELD_LABELS = {
  elementInstability: '\u4e0d\u7a33\u5b9a\u6027',
  elementResistance: '\u963b\u529b',
  elementOptimalWindowMidpoint: '\u6700\u4f73\u7a97\u53e3\u4e2d\u70b9',
  elementOptimalWindowThinness: '\u6700\u4f73\u7a97\u53e3\u539a\u5ea6',
  elementExplosionMultiplier: '\u7206\u70b8\u500d\u7387',
  elementClusterFactor: '\u805a\u7c07\u7cfb\u6570',
};

const SYSTEM_COLORS = {
  Stanton: { main: '#00ddaa', bg: 'rgba(0,221,170,0.08)', border: 'rgba(0,221,170,0.2)' },
  Pyro: { main: '#ff6644', bg: 'rgba(255,102,68,0.08)', border: 'rgba(255,102,68,0.2)' },
  Nyx: { main: '#aa66ff', bg: 'rgba(170,102,255,0.08)', border: 'rgba(170,102,255,0.2)' },
};

function getSystemColor(system) {
  return SYSTEM_COLORS[system] || SYSTEM_COLORS.Stanton;
}

function getDifficulty(instability, resistance) {
  const score = (instability / 700) * 0.6 + Math.max(0, resistance) * 0.4;
  if (score < 0.3) return { label: '\u7b80\u5355', color: '#00ddaa' };
  if (score < 0.6) return { label: '\u4e2d\u7b49', color: '#c9a227' };
  return { label: '\u56f0\u96be', color: '#ff6644' };
}

function getProbabilityColor(prob) {
  if (prob >= 20) return '#00ddaa';
  if (prob >= 5) return '#c9a227';
  return '#ff6644';
}

function StatRow({ label, value, bar }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.55)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif', minWidth: 72, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
        {bar && (
          <Box sx={{ width: `${bar.pct}%`, height: '100%', background: bar.color, borderRadius: 2, transition: 'width 0.3s' }} />
        )}
      </Box>
      <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Orbitron",sans-serif', minWidth: 32, textAlign: 'right' }}>
        {value}
      </Typography>
    </Box>
  );
}

function LocationCard({ loc, system }) {
  const probColor = getProbabilityColor(loc.probability);
  const probPct = Math.min(100, loc.probability);
  const qualMin = loc.quality_range?.[0] || 0;
  const qualMax = loc.quality_range?.[1] || 1000;
  const sysColor = getSystemColor(system);

  return (
    <Box sx={{
      background: sysColor.bg,
      border: `1px solid ${sysColor.border}`,
      borderRadius: '4px',
      p: 1,
      mb: 0.5,
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: 'rgba(255,255,255,0.9)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
            {loc.location_zh || loc.location}
          </Typography>
          <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Rajdhani",sans-serif' }}>
            {loc.parent} / {loc.type}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Chip label={system} size="small" sx={{
            height: 18, fontSize: '0.5rem',
            background: sysColor.bg, border: `1px solid ${sysColor.border}`,
            color: sysColor.main,
          }} />
          {loc.tier && (
            <Chip label={loc.tier} size="small" sx={{
              height: 18, fontSize: '0.5rem',
              background: 'rgba(201,162,39,0.1)', border: '1px solid rgba(201,162,39,0.2)',
              color: '#c9a227',
            }} />
          )}
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.3 }}>
        <Typography sx={{ fontSize: '0.55rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Noto Sans SC",sans-serif', minWidth: 28 }}>
          \u6982\u7387
        </Typography>
        <Box sx={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ width: `${probPct}%`, height: '100%', background: probColor, borderRadius: 2 }} />
        </Box>
        <Typography sx={{ fontSize: '0.55rem', color: probColor, fontFamily: '"Orbitron",sans-serif', minWidth: 36, textAlign: 'right' }}>
          {loc.probability.toFixed(1)}%
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
        <Typography sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
          \u542b\u91cf {qualMin.toFixed(0)}-{qualMax.toFixed(0)}
        </Typography>
        <Typography sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
          \u963b\u529b {loc.resistance}
        </Typography>
        <Typography sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
          \u4e0d\u7a33\u5b9a\u6027 {loc.instability}
        </Typography>
        {loc.signature > 0 && (
          <Typography sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
            \u4fe1\u53f7 {loc.signature}
          </Typography>
        )}
      </Box>
    </Box>
  );
}

function MineralDetailDialog({ open, mineral, price, onClose }) {
  const [locationData, setLocationData] = useState(null);
  const [systemFilter, setSystemFilter] = useState('');

  useEffect(() => {
    if (!open || !mineral) {
      setSystemFilter('');
      return;
    }
    fetch('/data/mining-locations.json')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.minerals) {
          const locKey = rawNameToLocationKey(mineral.rawName);
          setLocationData(data.minerals[locKey] || data.minerals[mineral.rawName] || null);
        }
      })
      .catch(() => setLocationData(null));
  }, [open, mineral]);

  const locations = useMemo(() => {
    if (!locationData?.locations) return [];
    return locationData.locations;
  }, [locationData]);

  const availableSystems = useMemo(() => {
    const systems = new Set();
    for (const loc of locations) {
      if (loc.parent) systems.add(loc.parent);
    }
    return Array.from(systems).sort();
  }, [locations]);

  const filteredLocations = useMemo(() => {
    if (!systemFilter) return locations;
    return locations.filter(loc => loc.parent === systemFilter);
  }, [locations, systemFilter]);

  const groupedByType = useMemo(() => {
    const groups = {};
    for (const loc of filteredLocations) {
      const type = loc.mining_type || 'Unknown';
      if (!groups[type]) groups[type] = [];
      groups[type].push(loc);
    }
    return groups;
  }, [filteredLocations]);

  const systemCounts = useMemo(() => {
    const counts = {};
    for (const loc of locations) {
      const sys = loc.parent || 'Unknown';
      counts[sys] = (counts[sys] || 0) + 1;
    }
    return counts;
  }, [locations]);

  if (!mineral) return null;

  const diff = getDifficulty(mineral.elementInstability, mineral.elementResistance);

  const midpointBar = { pct: Math.min(100, (mineral.elementOptimalWindowMidpoint || 0) * 100), color: '#c9a227' };
  const thinnessBar = { pct: Math.min(100, (mineral.elementOptimalWindowThinness || 0) * 50), color: '#c9a227' };
  const explosionBar = { pct: Math.min(100, (mineral.elementExplosionMultiplier || 0) / 10 * 100), color: '#c9a227' };
  const clusterBar = { pct: (mineral.elementClusterFactor || 0) * 100, color: '#c9a227' };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, rgba(3, 12, 25, 0.97) 0%, rgba(2, 8, 18, 0.99) 100%)',
          border: '1px solid rgba(201, 162, 39, 0.2)',
          borderRadius: '8px',
          maxHeight: '85vh',
        },
      }}
    >
      <DialogTitle sx={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        borderBottom: '1px solid rgba(201, 162, 39, 0.1)',
        pb: 1.5, gap: 2,
      }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontFamily: '"Noto Sans SC","Orbitron",sans-serif', color: '#c9a227', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              {mineral.name_zh || mineral.name}
            </Typography>
            <Chip label={diff.label} size="small" sx={{
              height: 18, fontSize: '0.55rem',
              background: `${diff.color}15`, border: `1px solid ${diff.color}30`, color: diff.color,
            }} />
          </Box>
          <Typography sx={{ fontFamily: '"Rajdhani",sans-serif', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', mt: 0.25 }}>
            {mineral.name}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
              \u4e0d\u7a33\u5b9a\u6027: {mineral.elementInstability}
            </Typography>
            <Typography sx={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Noto Sans SC","Rajdhani",sans-serif' }}>
              \u963b\u529b: {mineral.elementResistance}
            </Typography>
            {price > 0 && (
              <Typography sx={{ fontSize: '0.65rem', color: '#00ddaa', fontFamily: '"Orbitron",sans-serif', fontWeight: 600 }}>
                ~{price.toLocaleString()} aUEC/SCU
              </Typography>
            )}
          </Box>
        </Box>
        <IconButton onClick={onClose} sx={{ color: 'rgba(255,255,255,0.6)' }}>
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Box sx={{ mb: 2 }}>
          <Typography sx={{ color: '#c9a227', fontSize: '0.75rem', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', mb: 1, letterSpacing: '0.05em', fontWeight: 600 }}>
            \u91c7\u77ff\u53c2\u6570
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <StatRow label={FIELD_LABELS.elementOptimalWindowMidpoint} value={mineral.elementOptimalWindowMidpoint} bar={midpointBar} />
            <StatRow label={FIELD_LABELS.elementOptimalWindowThinness} value={mineral.elementOptimalWindowThinness} bar={thinnessBar} />
            <StatRow label={FIELD_LABELS.elementExplosionMultiplier} value={mineral.elementExplosionMultiplier} bar={explosionBar} />
            <StatRow label={FIELD_LABELS.elementClusterFactor} value={mineral.elementClusterFactor} bar={clusterBar} />
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(201,162,39,0.08)', mb: 1.5 }} />

        <Box sx={{ mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
            <Place sx={{ fontSize: 14, color: '#c9a227' }} />
            <Typography sx={{ color: '#c9a227', fontSize: '0.75rem', fontFamily: '"Orbitron","Noto Sans SC",sans-serif', letterSpacing: '0.05em', fontWeight: 600 }}>
              \u5237\u65b0\u5730\u70b9
            </Typography>
            <Typography sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)', fontFamily: '"Rajdhani",sans-serif' }}>
              {filteredLocations.length} / {locations.length} \u4e2a\u5730\u70b9
            </Typography>
          </Box>

          {availableSystems.length > 1 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              <Chip label="\u5168\u90e8\u661f\u7cfb" size="small" onClick={() => setSystemFilter('')}
                sx={{
                  height: 32,
                  background: !systemFilter ? 'rgba(201,162,39,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${!systemFilter ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  color: !systemFilter ? '#c9a227' : 'rgba(255,255,255,0.7)',
                  fontSize: '0.65rem',
                }} />
              {availableSystems.map(sys => {
                const sc = getSystemColor(sys);
                const count = systemCounts[sys] || 0;
                return (
                  <Chip key={sys} label={`${sys} (${count})`} size="small"
                    onClick={() => setSystemFilter(systemFilter === sys ? '' : sys)}
                    sx={{
                      height: 32,
                      background: systemFilter === sys ? sc.bg : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${systemFilter === sys ? sc.border : 'rgba(255,255,255,0.08)'}`,
                      color: systemFilter === sys ? sc.main : 'rgba(255,255,255,0.7)',
                      fontSize: '0.65rem',
                    }} />
                );
              })}
            </Box>
          )}

          {filteredLocations.length === 0 ? (
            <Box sx={{ py: 2, textAlign: 'center', border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '4px' }}>
              <Typography sx={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', fontFamily: '"Rajdhani","Noto Sans SC",sans-serif' }}>
                \u6682\u65e0\u5237\u65b0\u5730\u70b9\u6570\u636e
              </Typography>
            </Box>
          ) : (
            Object.entries(groupedByType).map(([type, locs]) => (
              <Box key={type} sx={{ mb: 1.5 }}>
                <Chip
                  label={locs[0]?.mining_type_zh || type}
                  size="small"
                  sx={{
                    height: 18, fontSize: '0.55rem', mb: 0.5,
                    background: 'rgba(0,221,170,0.1)', border: '1px solid rgba(0,221,170,0.2)',
                    color: '#00ddaa',
                  }}
                />
                {locs.map((loc, i) => (
                  <LocationCard key={i} loc={loc} system={loc.parent || 'Unknown'} />
                ))}
              </Box>
            ))
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}

export default MineralDetailDialog;
