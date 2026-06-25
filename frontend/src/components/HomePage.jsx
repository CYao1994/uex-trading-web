// HomePage.jsx - Optimized Homepage with all modules
import { useState, useEffect, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import { useSfx } from '../hooks/useSfx';
import HomePageTitle from './HomePageTitle';
import LaunchButton from './LaunchButton';
import SearchBox from './SearchBox';
import FeatureCardGroups from './FeatureCardGroups';
import FleetSidebar from './FleetSidebar';
import WikiStats from './WikiStats';

const WEAPON_SECTIONS = new Set(['Vehicle Weapons']);

function HomePage({ onTabChange }) {
  const sfx = useSfx();
  const [launched, setLaunched] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [allItems, setAllItems] = useState([]);
  const searchRef = useRef(null);
  const searchTimerRef = useRef(null);

  useEffect(() => {
    setItemsLoading(true);
    fetch('/data/items-catalog.json')
      .then(r => r.ok ? r.json() : null)
      .then(catalog => {
        if (!catalog) return [];
        const catMap = {};
        (catalog.categories || []).forEach(c => { catMap[c.id] = c; });
        const items = [];
        if (catalog.items) {
          for (const [catId, catItems] of Object.entries(catalog.items)) {
            const cat = catMap[catId];
            if (!cat) continue;
            const isWeapon = WEAPON_SECTIONS.has(cat.section);
            for (const item of catItems) {
              items.push({
                ...item,
                tab: isWeapon ? 'ship_weapons' : 'ship_components',
                type_label: isWeapon ? '武器' : '组件',
              });
            }
          }
        }
        return items;
      })
      .then(items => {
        setAllItems(items);
        setItemsLoading(false);
      })
      .catch(() => setItemsLoading(false));

    fetch('https://api.uexcorp.space/2.0/vehicles')
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data?.data) return;
        const ships = data.data
          .filter(v => v.is_spaceship === 1 && !v.is_addon)
          .map(v => ({
            id: v.id,
            name: v.name_full || v.name,
            name_zh: v.name_full || v.name,
            tab: 'ships',
            type_label: '舰船',
            slug: v.url_name,
          }));
        setAllItems(prev => [...prev, ...ships]);
      })
      .catch(() => console.warn('Failed to load vehicles'));

    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  const handleSearch = (q) => {
    setSearchQuery(q);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      const lower = q.toLowerCase().trim();
      const matched = allItems.filter(item => {
        const name = (item.name || '').toLowerCase();
        const nameZh = (item.name_zh || '').toLowerCase();
        const slug = (item.slug || '').toLowerCase();
        return name.includes(lower) || nameZh.includes(lower) || slug.includes(lower);
      }).slice(0, 12);
      setSearchResults(matched);
    }, 150);
  };

  const handleResultClick = (item) => {
    setSearchQuery('');
    setSearchResults([]);
    onTabChange(item.tab);
  };
  return (
    <Box sx={{
      minHeight: '100%',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      py: { xs: 2, md: 4 },
      px: { xs: 1, md: 2 },
    }}>
      <HomePageTitle />

      {!launched && (
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          gap: { xs: 2, sm: 3 },
          alignItems: { xs: 'stretch', sm: 'flex-start' },
          mb: 2,
          animation: 'fadeInUp 0.6s ease-out',
          animationDelay: '0.2s',
        }}>
          <WikiStats />
          <LaunchButton onLaunch={() => setLaunched(true)} sfx={sfx} />
        </Box>
      )}

      {launched && (
        <Box sx={{
          display: 'flex',
          flexDirection: { xs: 'column', lg: 'row' },
          gap: { xs: 2, md: 3 },
          maxWidth: 1100,
          width: '100%',
          animation: 'fadeInUp 0.6s ease-out',
        }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <SearchBox
              searchQuery={searchQuery}
              searchResults={searchResults}
              itemsLoading={itemsLoading}
              onSearch={handleSearch}
              onResultClick={handleResultClick}
              searchRef={searchRef}
            />
            <FeatureCardGroups onTabChange={onTabChange} sfx={sfx} />
          </Box>

          <FleetSidebar />
        </Box>
      )}

      <Typography sx={{
        mt: 4,
        fontFamily: '"Rajdhani", sans-serif',
        fontSize: '0.6rem',
        color: 'rgba(201, 162, 39, 0.2)',
      }}>
        数据来源: UEXCORP & 游戏文件 · 作者: CYao1994
      </Typography>
    </Box>
  );
}

export default HomePage;
