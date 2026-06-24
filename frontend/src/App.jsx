// App.jsx - Main application shell
// Modules are hidden via CSS (display:none) instead of unmounting,
// so all state is preserved across tab switches.
import { useState, useEffect, lazy, Suspense, useCallback, useRef } from 'react';
import { Box, Typography } from '@mui/material';
import Layout from './components/Layout';
import SellPanel from './components/SellPanel';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import AppSkeleton from './components/AppSkeleton';
import ErrorBoundary from './components/ErrorBoundary';
import { BackendStatusProvider } from './contexts/BackendStatus';
import { ToastProvider } from './contexts/Toast';
import { useToast } from './hooks/useToast';
import { useKonamiCode } from './hooks/useKonamiCode';
import { useKeyboardShortcut } from './hooks/useKeyboardShortcut';

// Lazy-loaded non-critical components (code splitting for faster FCP)
const BuyPanel = lazy(() => import('./components/BuyPanel'));
const WarbondPanel = lazy(() => import('./components/WarbondPanel'));
const ChainPanel = lazy(() => import('./components/ChainPanel'));
const ChainResult = lazy(() => import('./components/ChainResult'));
const RouteResult = lazy(() => import('./components/RouteResult'));
const ShipComponentsPanel = lazy(() => import('./components/ShipComponentsPanel'));
const ShipWeaponsPanel = lazy(() => import('./components/ShipWeaponsPanel'));
const BlueprintPanel = lazy(() => import('./components/BlueprintPanel'));
const ShipPanel = lazy(() => import('./components/ShipPanel'));
const MiningGuidePanel = lazy(() => import('./components/MiningGuidePanel'));
const HomePage = lazy(() => import('./components/HomePage'));


function AppContent() {
  const [activeTab, setActiveTab] = useState('home');
  const [result, setResult] = useState(null);
  const { showToast } = useToast();

  // Track which tabs have been visited — only mount a tab's component
  // after the user first navigates to it (lazy mounting).
  // Once visited, the tab stays mounted (hidden via CSS) to preserve state.
  const [visitedTabs, setVisitedTabs] = useState(() => new Set(['home']));

  // Per-tab result storage
  const resultsRef = useRef({});

  const handleResult = useCallback((data) => {
    setResult(data);
    resultsRef.current[activeTab] = data;
    if (data.warnings && data.warnings.length > 0) {
      showToast(data.warnings[0], 'warning');
    }
  }, [activeTab, showToast]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setVisitedTabs(prev => {
      if (prev.has(tab)) return prev;
      const next = new Set(prev);
      next.add(tab);
      return next;
    });
    // Restore previous result for this tab (if any)
    setResult(resultsRef.current[tab] || null);
  }, []);

  // === Konami Code Easter Egg ===
  const [showRainbow, setShowRainbow] = useState(false);
  
  const triggerKonami = useCallback(() => {
    setShowRainbow(true);
    showToast('🚀 量子彩虹跃迁已启动！所有航线利润翻倍 - 好吧，其实只是视觉效果！', 'success');
    setTimeout(() => setShowRainbow(false), 4200);
  }, [showToast]);
  
  // Apply rainbow mode to body
  useEffect(() => {
    if (showRainbow) {
      document.body.classList.add('rainbow-mode', 'hyperspace-zoom');
    } else {
      document.body.classList.remove('rainbow-mode', 'hyperspace-zoom');
    }
  }, [showRainbow]);

  useKonamiCode(triggerKonami);

  // === Global Keyboard Shortcuts ===
  const focusSearch = useCallback(() => {
    const firstInput = document.querySelector('input[type="text"]');
    if (firstInput) firstInput.focus();
  }, []);

  useKeyboardShortcut('k', focusSearch, { ctrl: true });
  useKeyboardShortcut('/', focusSearch);

  const isHome = activeTab === 'home';
  const isSell = activeTab === 'sell';
  const isBuy = activeTab === 'buy';
  const isChain = activeTab === 'chain';
  const isWarbond = activeTab === 'warbond';
  const isShipComponents = activeTab === 'ship_components';
  const isShipWeapons = activeTab === 'ship_weapons';
  const isBlueprint = activeTab === 'blueprint';
  const isShips = activeTab === 'ships';
  const isMiningGuide = activeTab === 'mining_guide';

  const hide = { display: 'none' };

  return (
    <>
      <MaintenanceOverlay />
      {showRainbow && <Box className="rainbow-flash" sx={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none', background: 'radial-gradient(circle, rgba(255,255,255,0.15), transparent 70%)', animation: 'rainbowFlash 1s ease-out forwards' }} />}

      <Layout activeTab={activeTab} onTabChange={handleTabChange}>
        <ErrorBoundary>
        <Suspense fallback={<AppSkeleton />}>
          {/* Home */}
          <ErrorBoundary>
          <Box key="home" sx={isHome ? {} : hide} className={isHome ? 'content-fade-enter' : ''}>
            {visitedTabs.has('home') && <HomePage onTabChange={handleTabChange} />}
          </Box>
          </ErrorBoundary>

          {/* Warbond */}
          <ErrorBoundary>
          <Box key="warbond" sx={isWarbond ? {} : hide} className={isWarbond ? 'content-fade-enter' : ''}>
            {visitedTabs.has('warbond') && <WarbondPanel />}
          </Box>
          </ErrorBoundary>

          {/* Ship Components */}
          <ErrorBoundary>
          <Box key="ship_components" sx={isShipComponents ? {} : hide} className={isShipComponents ? 'content-fade-enter' : ''}>
            {visitedTabs.has('ship_components') && <ShipComponentsPanel />}
          </Box>
          </ErrorBoundary>

          {/* Ship Weapons */}
          <ErrorBoundary>
          <Box key="ship_weapons" sx={isShipWeapons ? {} : hide} className={isShipWeapons ? 'content-fade-enter' : ''}>
            {visitedTabs.has('ship_weapons') && <ShipWeaponsPanel />}
          </Box>
          </ErrorBoundary>

          {/* Blueprint */}
          <ErrorBoundary>
          <Box key="blueprint" sx={isBlueprint ? {} : hide} className={isBlueprint ? 'content-fade-enter' : ''}>
            {visitedTabs.has('blueprint') && <BlueprintPanel onTabChange={handleTabChange} />}
          </Box>
          </ErrorBoundary>

          {/* Ships */}
          <ErrorBoundary>
          <Box key="ships" sx={isShips ? {} : hide} className={isShips ? 'content-fade-enter' : ''}>
            {visitedTabs.has('ships') && <ShipPanel />}
          </Box>
          </ErrorBoundary>

          {/* Mining Guide */}
          <ErrorBoundary>
          <Box key="mining_guide" sx={isMiningGuide ? {} : hide} className={isMiningGuide ? 'content-fade-enter' : ''}>
            {visitedTabs.has('mining_guide') && <MiningGuidePanel />}
          </Box>
          </ErrorBoundary>

          {/* Sell / Buy / Chain */}
          <ErrorBoundary>
          <Box
            key="routes"
            sx={{
              ...(isSell || isBuy || isChain ? {} : hide),
              display: (isSell || isBuy || isChain) ? 'flex' : 'none',
              flexDirection: { xs: 'column', md: 'row' },
              gap: { xs: 2, md: 3 },
              minHeight: 'calc(100vh - 100px)',
            }}
            className={isSell || isBuy || isChain ? 'content-fade-enter' : ''}
          >
            {/* Left panel */}
            <Box sx={{ width: { xs: '100%', md: 380, lg: 420, xl: 480 }, flexShrink: 0, maxWidth: 480 }}>
              {(isSell || isBuy || isChain) && (
                isChain ? (
                  <ChainPanel onResult={handleResult} />
                ) : isBuy ? (
                  <BuyPanel onResult={handleResult} />
                ) : (
                  <SellPanel onResult={handleResult} />
                )
              )}
            </Box>

            {/* Right result area */}
            <Box sx={{ flex: 1, minWidth: 0 }}>
              {result ? (
                isChain ? (
                  <ChainResult data={result} />
                ) : (
                  <RouteResult data={result} mode={activeTab} />
                )
              ) : (
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
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      inset: '3px',
                      border: '1px solid rgba(201, 162, 39, 0.06)',
                      clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                    },
                  }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#c9a227" strokeWidth="1" opacity="0.6">
                      <path d="M12 2L15 9L12 7L9 9Z" />
                      <path d="M4 14L12 9L20 14L12 22Z" />
                      <circle cx="12" cy="6" r="1" fill="#c9a227" opacity="0.8" />
                    </svg>
                  </Box>
                  <Typography variant="h6" sx={{
                    fontFamily: '"Orbitron", sans-serif',
                    color: '#c9a227',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    mb: 1,
                    letterSpacing: '0.08em',
                  }}>
                    {isChain || isBuy ? '选择出发地开始规划' : '选择出发地开始规划'}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(201, 162, 39, 0.5)', textAlign: 'center', fontSize: '0.85rem' }}>
                    {isChain ? (
                      <>
                        选择飞船和出发地
                        <br />
                        点击"开始链式"即可规划
                      </>
                    ) : isBuy ? (
                      <>
                        选择出发地和货物
                        <br />
                        点击"规划路线"即可查询
                      </>
                    ) : (
                      <>
                        选择出发地和货物
                        <br />
                        点击"规划路线"即可查询
                      </>
                    )}
                  </Typography>
                  <Typography sx={{
                    color: 'rgba(201, 162, 39, 0.15)',
                    fontSize: '0.6rem',
                    mt: 3,
                    fontFamily: '"Orbitron", sans-serif',
                  }}>
                    / 快捷键
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
          </ErrorBoundary>
        </Suspense>
        </ErrorBoundary>
      </Layout>
    </>
  );
}

function App() {
  return (
    <BackendStatusProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </BackendStatusProvider>
  );
}

export default App;
