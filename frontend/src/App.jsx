import { useState, lazy, Suspense } from 'react';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import Layout from './components/Layout';
import SellPanel from './components/SellPanel';
import LoadingOverlay from './components/LoadingOverlay';
import MaintenanceOverlay from './components/MaintenanceOverlay';
import AppSkeleton from './components/AppSkeleton';
import { BackendStatusProvider, useBackendStatus } from './contexts/BackendStatus';

// Lazy-loaded non-critical components (code splitting for faster FCP)
const BuyPanel = lazy(() => import('./components/BuyPanel'));
const WarbondPanel = lazy(() => import('./components/WarbondPanel'));
const ChainPanel = lazy(() => import('./components/ChainPanel'));
const ChainResult = lazy(() => import('./components/ChainResult'));
const RouteResult = lazy(() => import('./components/RouteResult'));

function AppContent() {
  const [activeTab, setActiveTab] = useState('sell');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });
  const { isBackendUp } = useBackendStatus();

  const handleResult = (data) => {
    setResult(data);
    if (data.warnings && data.warnings.length > 0) {
      setToast({ open: true, message: data.warnings[0], severity: 'warning' });
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setResult(null); // Clear results when switching tabs
  };

  // Warbond panel is self-contained (no route results)
  const isWarbond = activeTab === 'warbond';
  const isChain = activeTab === 'chain';

  return (
    <>
      {loading && <LoadingOverlay />}

      {/* Maintenance overlay on top — does NOT unmount the app */}
      {isBackendUp === false && <MaintenanceOverlay />}

      <Layout activeTab={activeTab} onTabChange={handleTabChange}>
        <Suspense fallback={<AppSkeleton />}>
          {isWarbond ? (
            <WarbondPanel />
          ) : (
            <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 100px)' }}>
              {/* Left panel */}
              <Box sx={{ width: { xs: '100%', md: 380, lg: 420, xl: 480 }, flexShrink: 0, maxWidth: 480 }}>
                {isChain ? (
                  <ChainPanel onResult={handleResult} />
                ) : activeTab === 'buy' ? (
                  <BuyPanel onResult={handleResult} />
                ) : (
                  <SellPanel onResult={handleResult} />
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
                      background: 'linear-gradient(135deg, rgba(0, 200, 255, 0.05), rgba(0, 100, 200, 0.03))',
                      border: '1px solid rgba(0, 200, 255, 0.12)',
                      clipPath: 'polygon(10px 0, calc(100% - 10px) 0, 100% 10px, 100% calc(100% - 10px), calc(100% - 10px) 100%, 10px 100%, 0 calc(100% - 10px), 0 10px)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      mb: 3,
                      position: 'relative',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: '3px',
                        border: '1px solid rgba(0, 200, 255, 0.06)',
                        clipPath: 'polygon(8px 0, calc(100% - 8px) 0, 100% 8px, 100% calc(100% - 8px), calc(100% - 8px) 100%, 8px 100%, 0 calc(100% - 8px), 0 8px)',
                      },
                    }}>
                      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#00c8ff" strokeWidth="1" opacity="0.6">
                        <path d="M12 2L15 9L12 7L9 9Z" />
                        <path d="M4 14L12 9L20 14L12 22Z" />
                        <circle cx="12" cy="6" r="1" fill="#00c8ff" opacity="0.8" />
                      </svg>
                    </Box>
                    <Typography variant="h6" sx={{
                      fontFamily: '"Orbitron", sans-serif',
                      color: '#00c8ff',
                      fontWeight: 600,
                      fontSize: '0.85rem',
                      mb: 1,
                      letterSpacing: '0.08em',
                    }}>
                      {isChain ? '等待链式路线计算' : '等待航线计算'}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(0, 200, 255, 0.9)', textAlign: 'center', fontSize: '0.85rem' }}>
                      {isChain ? (
                        <>
                          选择出发地、飞船和本金后
                          <br />
                          点击"规划链式路线"开始计算
                        </>
                      ) : (
                        <>
                          {activeTab === 'buy' ? '选择出发地并添加进货商品后' : '选择出发地并添加货物后'}
                          <br />
                          点击"规划路线"开始计算
                        </>
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}
        </Suspense>
      </Layout>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setToast({ ...toast, open: false })}
          severity={toast.severity}
          sx={{ width: '100%' }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
}

function App() {
  return (
    <BackendStatusProvider>
      <AppContent />
    </BackendStatusProvider>
  );
}

export default App;
