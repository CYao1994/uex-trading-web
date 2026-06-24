import { createContext, useState, useEffect, useCallback, useRef } from 'react';

const BackendStatusContext = createContext(null);

// Configuration constants
const FAIL_THRESHOLD = 8;           // Consecutive failures before marking backend as down
const HEALTH_TIMEOUT_MS = 30000;    // 30s timeout for health check
const INITIAL_POLL_INTERVAL = 300000; // 5 minutes initial polling
const MAX_POLL_INTERVAL = 300000;   // 5 minutes max polling
const BACKOFF_MULTIPLIER = 2;       // Exponential backoff multiplier


export function BackendStatusProvider({ children }) {
  const [isBackendUp, setIsBackendUp] = useState(true); // Optimistic render
  const lastCheckedRef = useRef(null);
  const failCountRef = useRef(0);
  const pollIntervalRef = useRef(INITIAL_POLL_INTERVAL);
  const stableTimerRef = useRef(null);

  const checkBackend = useCallback(async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    try {
      const res = await fetch('/api/health', {
        signal: controller.signal,
        headers: { 'Cache-Control': 'no-cache' },
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' || data.status === 'degraded') {
          // Success - reset fail count and poll interval
          failCountRef.current = 0;
          pollIntervalRef.current = INITIAL_POLL_INTERVAL;
          setIsBackendUp(true);
        }
      } else {
        failCountRef.current += 1;
        applyBackoff();
      }
      lastCheckedRef.current = new Date();
    } catch {
      clearTimeout(timer);
      failCountRef.current += 1;
      applyBackoff();
      lastCheckedRef.current = new Date();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply exponential backoff on failure
  const applyBackoff = useCallback(() => {
    if (failCountRef.current >= FAIL_THRESHOLD) {
      setIsBackendUp(false);
    }
    // Increase poll interval with backoff (up to max)
    pollIntervalRef.current = Math.min(
      pollIntervalRef.current * BACKOFF_MULTIPLIER,
      MAX_POLL_INTERVAL
    );
  }, []);

  // Initial check
  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  // Periodic check with adaptive interval
  useEffect(() => {
    const interval = setInterval(checkBackend, pollIntervalRef.current);
    return () => clearInterval(interval);
  }, [checkBackend]);

  // Listen for "backend:alive" events
  useEffect(() => {
    const handler = () => {
      if (failCountRef.current > 0) {
        failCountRef.current = 0;
        pollIntervalRef.current = INITIAL_POLL_INTERVAL;
        setIsBackendUp(true);
      }
    };
    window.addEventListener('backend:alive', handler);
    return () => window.removeEventListener('backend:alive', handler);
  }, []);

  // Debounced overlay
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

  const showBackendError = showOverlay && isBackendUp === false;
  const isChecking = false;

  return (
    <BackendStatusContext.Provider value={{
      isBackendUp,
      showBackendError,
      isChecking,
      lastChecked: lastCheckedRef.current,
      retryCheck: checkBackend,
    }}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export default BackendStatusContext;
