import { useState } from 'react';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import Layout from './components/Layout';
import SellPanel from './components/SellPanel';
import BuyPanel from './components/BuyPanel';
import PricePanel from './components/PricePanel';
import RouteResult from './components/RouteResult';
import LoadingOverlay from './components/LoadingOverlay';

function App() {
  const [activeTab, setActiveTab] = useState('sell');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const handleResult = (data) => {
    setResult(data);
    if (data.warnings && data.warnings.length > 0) {
      setToast({ open: true, message: data.warnings[0], severity: 'warning' });
    }
  };

  // Price panel is self-contained, no result state needed
  if (activeTab === 'price') {
    return (
      <>
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
          <PricePanel />
        </Layout>
        <Snackbar
          open={toast.open}
          autoHideDuration={6000}
          onClose={() => setToast({ ...toast, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

  return (
    <>
      {loading && <LoadingOverlay />}

      <Layout activeTab={activeTab} onTabChange={setActiveTab}>
        <Box sx={{ display: 'flex', gap: 3, minHeight: 'calc(100vh - 100px)' }}>
          {/* Left panel */}
          <Box sx={{ width: 380, flexShrink: 0 }}>
            {activeTab === 'sell' ? (
              <SellPanel onResult={handleResult} />
            ) : (
              <BuyPanel />
            )}
          </Box>

          {/* Right result area */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {result ? (
              <RouteResult data={result} />
            ) : (
              <Box sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.5,
              }}>
                {/* Decorative ship icon */}
                <Box sx={{
                  width: 100, height: 100, borderRadius: '50%',
                  background: 'rgba(0, 212, 255, 0.05)',
                  border: '1px solid rgba(0, 212, 255, 0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  mb: 3,
                }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00d4ff" strokeWidth="1.5">
                    <path d="M12 2L15 9L12 7L9 9Z" />
                    <path d="M4 14L12 9L20 14L12 22Z" />
                    <circle cx="12" cy="6" r="1" fill="#00d4ff" />
                  </svg>
                </Box>
                <Typography variant="h6" sx={{
                  fontFamily: '"Orbitron", sans-serif',
                  color: 'primary.main',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  mb: 1,
                }}>
                  等待航线计算
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center' }}>
                  选择出发地并添加货物后<br/>点击"规划路线"开始计算
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Layout>

      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={() => setToast({ ...toast, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
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

export default App;
