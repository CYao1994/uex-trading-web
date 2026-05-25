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
  const [lastChecked, setLastChecked] = useState(null);
  const failCountRef = useRef(0);
  const stableTimerRef = useRef(null);

  const checkBackend = useCallback(async () => {
    try {
      // Use /api/health which also checks if UEX data is loaded
      const res = await api.get('/health', { timeout: 15000 });
      if (res.data?.status === 'ok' || res.data?.status === 'degraded') {
        failCountRef.current = 0;
        setIsBackendUp(true);
      }
      setLastChecked(new Date());
    } catch (err) {
      failCountRef.current += 1;
      // Require 3 consecutive failures before declaring backend down
      if (failCountRef.current >= 3) {
        setIsBackendUp(false);
      }
      setLastChecked(new Date());
    }
  }, []);

  // Initial check - only one attempt, don't spam
  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // Periodic check every 90 seconds (reduced frequency to prevent flickering)
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
  // Only show overlay when backend has been down for at least 5 seconds
  const [showOverlay, setShowOverlay] = useState(false);

  useEffect(() => {
    if (isBackendUp === false) {
      // Wait 5 seconds before showing overlay (prevents flicker)
      stableTimerRef.current = setTimeout(() => {
        setShowOverlay(true);
      }, 5000);
    } else {
      // Immediately hide overlay when backend comes back
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
      lastChecked,
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
