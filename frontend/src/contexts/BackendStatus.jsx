import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api/client';

const BackendStatusContext = createContext(null);

// Maintenance hours: 2:00-10:00 Beijing time (UTC+8)
const MAINTENANCE_START_HOUR = 2;
const MAINTENANCE_END_HOUR = 10;

function isMaintenanceTime() {
  const now = new Date();
  const beijingHour = (now.getUTCHours() + 8) % 24;
  return beijingHour >= MAINTENANCE_START_HOUR && beijingHour < MAINTENANCE_END_HOUR;
}

export function BackendStatusProvider({ children }) {
  const [isBackendUp, setIsBackendUp] = useState(null); // null = checking, true = up, false = down
  const [isMaintenance, setIsMaintenance] = useState(isMaintenanceTime());
  // Use ref for lastChecked to avoid re-renders on every check
  const lastCheckedRef = useRef(null);
  const failCountRef = useRef(0);
  const stableTimerRef = useRef(null);

  const checkBackend = useCallback(async () => {
    try {
      const res = await api.get('/health', { timeout: 15000 });
      if (res.data?.status === 'ok' || res.data?.status === 'degraded') {
        failCountRef.current = 0;
        setIsBackendUp(true);
      }
      lastCheckedRef.current = new Date();
    } catch (err) {
      failCountRef.current += 1;
      if (failCountRef.current >= 3) {
        setIsBackendUp(false);
      }
      lastCheckedRef.current = new Date();
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // Periodic check every 90 seconds
  useEffect(() => {
    const interval = setInterval(checkBackend, 90000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  // Update maintenance time status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setIsMaintenance(isMaintenanceTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Debounced overlay: don't show/hide maintenance overlay for brief outages
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isBackendUp === false) {
      stableTimerRef.current = setTimeout(() => {
        setShowOverlay(true);
      }, 5000);
    } else {
      clearTimeout(stableTimerRef.current);
      setShowOverlay(false);
    }
    return () => clearTimeout(stableTimerRef.current);
  }, [isBackendUp]);

  const showMaintenance = showOverlay && isBackendUp === false && isMaintenance;
  const showBackendError = showOverlay && isBackendUp === false && !isMaintenance;

  return (
    <BackendStatusContext.Provider value={{
      isBackendUp,
      showMaintenance,
      showBackendError,
      isMaintenance,
      lastChecked: lastCheckedRef.current,
      retryCheck: checkBackend,
    }}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatus() {
  const ctx = useContext(BackendStatusContext);
  if (!ctx) throw new Error('useBackendStatus must be used within BackendStatusProvider');
  return ctx;
}

export default BackendStatusContext;
