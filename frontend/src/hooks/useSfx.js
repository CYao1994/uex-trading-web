import { useCallback } from 'react';
import soundManager from '../utils/soundManager';

export function useSfx() {
  return useCallback((name) => {
    soundManager.play(name);
  }, []);
}
