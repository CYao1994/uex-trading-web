import { useState } from 'react';
import { Box, Typography, Snackbar, Alert } from '@mui/material';
import Layout from './components/Layout';
import SellPanel from './components/SellPanel';
import WarbondPanel from './components/WarbondPanel';
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

  // Warbond panel is self-contained
  if (activeTab === 'warbond') {
    return (
      <>
        <Layout activeTab={activeTab} onTabChange={setActiveTab}>
          <WarbondPanel />
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
            <SellPanel onResult={handleResult} />
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
                opacity: 0.6,
              }}>
                {/* HUD Ship icon */}
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
                    <circle cx="12" cy="6" r="1" fill="#00c8ff" opacity="0.5" />
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
                  等待航线计算
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(0, 200, 255, 0.35)', textAlign: 'center', fontSize: '0.8rem' }}>
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
