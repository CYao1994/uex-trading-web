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

  const checkBackend = useCallback(async () => {
    try {
      await api.get('/version', { timeout: 8000 });
      failCountRef.current = 0;
      setIsBackendUp(true);
      setLastChecked(new Date());
    } catch (err) {
      failCountRef.current += 1;
      // Require 2 consecutive failures before declaring backend down
      // This prevents flickering from transient network hiccups
      if (failCountRef.current >= 2) {
        setIsBackendUp(false);
      }
      setLastChecked(new Date());
    }
  }, []);

  // Initial check (run twice quickly to establish state)
  useEffect(() => {
    checkBackend();
    const timer = setTimeout(checkBackend, 3000);
    return () => clearTimeout(timer);
  }, [checkBackend]);

  // Periodic check every 60 seconds
  useEffect(() => {
    const interval = setInterval(checkBackend, 60000);
    return () => clearInterval(interval);
  }, [checkBackend]);

  // Update maintenance time status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setIsMaintenance(isMaintenanceTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const showMaintenance = isBackendUp === false && isMaintenance;
  const showBackendError = isBackendUp === false && !isMaintenance;

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
