import { useContext } from 'react';
import BackendStatusContext from '../contexts/BackendStatus';

/**
 * Hook: Access backend status from any component inside BackendStatusProvider.
 * @returns {{ isBackendUp: boolean, showBackendError: boolean, isChecking: boolean, lastChecked: number|null, retryCheck: () => void }}
 */
export function useBackendStatus() {
  const ctx = useContext(BackendStatusContext);
  if (!ctx) throw new Error('useBackendStatus must be used within BackendStatusProvider');
  return ctx;
}
