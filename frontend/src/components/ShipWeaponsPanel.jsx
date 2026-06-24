// ShipWeaponsPanel.jsx - 飞船武器数据库面板（含 DPS 排行）
import { useState, useEffect } from 'react';
import { Box, Button } from '@mui/material';
import { TrendingUp, FormatListBulleted } from '@mui/icons-material';
import ShipItemsPanel from './ShipItemsPanel';
import DPSRanking from './DPSRanking';

const WEAPON_CATEGORIES = [
  { id: 32, label: '火炮', color: '#ff6644' },
  { id: 34, label: '导弹', color: '#ffaa44' },
  { id: 33, label: '导弹架', color: '#ff8844' },
  { id: 35, label: '炮塔', color: '#ff4466' },
  { id: 70, label: '炸弹', color: '#ff4444' },
  { id: 79, label: '点防御炮', color: '#ff6688' },
];

const WEAPON_FILTER_CONFIG = {
  enableSizeFilter: true,
  enableWeaponTypeFilter: true,
  enableClassFilter: false,
  enableGradeFilter: false,
};

export default function ShipWeaponsPanel() {
  const [view, setView] = useState('list');
  const [wikiWeapons, setWikiWeapons] = useState([]);

  useEffect(() => {
    fetch('/data/wiki-weapons.json')
      .then(r => r.ok ? r.json() : { weapons: [] })
      .then(data => setWikiWeapons(data.weapons || []))
      .catch(() => console.warn('Failed to load wiki weapons'));
  }, []);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* View toggle */}
      <Box sx={{ display: 'flex', gap: 0.5, px: 1.5, pt: 1.5 }}>
        <Button size="small" startIcon={<FormatListBulleted sx={{ fontSize: 14 }} />}
          onClick={() => setView('list')}
          sx={{
            fontSize: '0.7rem', fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
            color: view === 'list' ? '#c9a227' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${view === 'list' ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`,
            background: view === 'list' ? 'rgba(201,162,39,0.1)' : 'transparent',
          }}>
          列表
        </Button>
        <Button size="small" startIcon={<TrendingUp sx={{ fontSize: 14 }} />}
          onClick={() => setView('dps')}
          sx={{
            fontSize: '0.7rem', fontFamily: '"Orbitron","Noto Sans SC",sans-serif',
            color: view === 'dps' ? '#c9a227' : 'rgba(255,255,255,0.5)',
            border: `1px solid ${view === 'dps' ? 'rgba(201,162,39,0.3)' : 'rgba(255,255,255,0.08)'}`,
            background: view === 'dps' ? 'rgba(201,162,39,0.1)' : 'transparent',
          }}>
          DPS 排行
        </Button>
      </Box>

      {view === 'list' ? (
        <ShipItemsPanel
          categories={WEAPON_CATEGORIES}
          itemTypeLabel="武器"
          accentColor="#8b2500"
          filterConfig={WEAPON_FILTER_CONFIG}
          wikiWeapons={wikiWeapons}
        />
      ) : (
        <DPSRanking wikiWeapons={wikiWeapons} />
      )}
    </Box>
  );
}
