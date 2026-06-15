// useVisualViewport.js - ??????????
import { useState, useEffect } from 'react';

/**
 * Detects whether the virtual keyboard is open on mobile devices.
 * Monitors visualViewport.resize events and compares the viewport height
 * against the window inner height. Only active on mobile (<768px).
 *
 * @returns {{ keyboardOpen: boolean, viewportHeight: number }}
 */
export default function useVisualViewport() {
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(
    typeof window !== 'undefined' ? window.innerHeight : 0
  );

  useEffect(() => {
    // Only run on mobile devices
    if (window.innerWidth >= 768) {
      return;
    }

    const vv = window.visualViewport;
    if (!vv) {
      return;
    }

    const handleResize = () => {
      const currentHeight = vv.height;
      setViewportHeight(currentHeight);

      // Consider keyboard open if viewport is less than 75% of window height
      const threshold = window.innerHeight * 0.75;
      setKeyboardOpen(currentHeight < threshold);
    };

    handleResize();
    vv.addEventListener('resize', handleResize);

    return () => {
      vv.removeEventListener('resize', handleResize);
    };
  }, []);

  return { keyboardOpen, viewportHeight };
}
