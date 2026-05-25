import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const checkBackend = useCallback(async () => {
    try {
      await api.get('/version', { timeout: 8000 });
      setIsBackendUp(true);
      setLastChecked(new Date());
    } catch (err) {
      setIsBackendUp(false);
      setLastChecked(new Date());
    }
  }, []);

  // Initial check
  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // Periodic check every 60 seconds when backend is down
  useEffect(() => {
    if (isBackendUp === false) {
      const interval = setInterval(checkBackend, 60000);
      return () => clearInterval(interval);
    }
  }, [isBackendUp, checkBackend]);

  // Update maintenance time status every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setIsMaintenance(isMaintenanceTime());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // If backend goes down and we're in maintenance window, no need to keep checking
  // If backend goes down outside maintenance window, something is wrong
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
