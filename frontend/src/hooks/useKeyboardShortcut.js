import { useEffect } from 'react';

/**
 * Hook: Register a global keyboard shortcut.
 *
 * @param {string} key - The key to listen for (e.g. 'k', '/')
 * @param {function} callback - Action to fire
 * @param {object} [options] - { ctrl?: boolean, meta?: boolean, allowInInput?: boolean }
 */
export function useKeyboardShortcut(key, callback, options = {}) {
  const { ctrl = false, meta = false, allowInInput = false } = options;

  useEffect(() => {
    const handler = (e) => {
      // Skip if focus is in an input/textarea (unless explicitly allowed)
      if (!allowInInput && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
        return;
      }

      const ctrlMatch = ctrl ? e.ctrlKey : !e.ctrlKey;
      const metaMatch = meta ? e.metaKey : !e.metaKey;

      if (e.key === key && ctrlMatch && metaMatch) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [key, callback, ctrl, meta, allowInInput]);
}
