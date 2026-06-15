import { useContext, createContext } from 'react';

const ToastContext = createContext(null);

/**
 * Hook: Access the toast API from any component inside ToastProvider.
 * @returns {{ showToast: (message: string, severity?: string) => void, hideToast: () => void }}
 */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export { ToastContext };
