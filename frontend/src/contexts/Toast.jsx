import { useState, useCallback } from 'react';
import { Box, Snackbar } from '@mui/material';
import { ToastContext } from '../hooks/useToast';

/**
 * Toast Provider - wrap your app to enable `useToast()` anywhere.
 * Note: useToast hook is in hooks/useToast.js (separate file for Fast Refresh compatibility).
 */
export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ open: false, message: '', severity: 'info' });

  const showToast = useCallback((message, severity = 'info') => {
    setToast({ open: true, message, severity });
  }, []);

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <Snackbar
        open={toast.open}
        autoHideDuration={6000}
        onClose={hideToast}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          '& .MuiPaper-root': {
            animation: 'toastSlideIn 0.35s ease-out',
          },
        }}
      >
        <Box
          onClick={hideToast}
          sx={{
            px: 2, py: 1.25,
            cursor: 'pointer',
            borderRadius: '2px',
            fontFamily: '"Rajdhani", "Noto Sans SC", sans-serif',
            fontSize: '0.85rem',
            fontWeight: 600,
            background: toast.severity === 'success'
              ? 'linear-gradient(135deg, rgba(0, 255, 136, 0.12), rgba(0, 200, 100, 0.06))'
              : toast.severity === 'warning'
                ? 'linear-gradient(135deg, rgba(255, 170, 0, 0.12), rgba(200, 130, 0, 0.06))'
                : 'linear-gradient(135deg, rgba(201, 162, 39, 0.12), rgba(154, 122, 26, 0.06))',
            border: `1px solid ${
              toast.severity === 'success' ? 'rgba(0, 255, 136, 0.25)'
              : toast.severity === 'warning' ? 'rgba(255, 170, 0, 0.25)'
              : 'rgba(201, 162, 39, 0.2)'
            }`,
            color: toast.severity === 'success' ? '#00ff88'
              : toast.severity === 'warning' ? '#ffaa00'
              : '#c9a227',
            backdropFilter: 'blur(12px)',
            boxShadow: toast.severity === 'success'
              ? '0 0 20px rgba(0, 255, 136, 0.2)'
              : '0 4px 16px rgba(0, 0, 0, 0.3)',
          }}
        >
          {toast.message}
        </Box>
      </Snackbar>
    </ToastContext.Provider>
  );
}
