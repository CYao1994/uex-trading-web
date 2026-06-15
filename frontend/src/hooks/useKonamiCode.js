import { useEffect } from 'react';

// Default Konami Code sequence
const DEFAULT_KONAMI = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a'
];

/**
 * Hook: Listen for the Konami Code sequence and fire a callback.
 *
 * @param {function} onActivate - Callback when the full sequence is entered
 * @param {string[]} [sequence=DEFAULT_KONAMI] - Key sequence to listen for
 */
export function useKonamiCode(onActivate, sequence = DEFAULT_KONAMI) {
  useEffect(() => {
    let index = 0;

    const handler = (e) => {
      if (e.key === sequence[index]) {
        index++;
        if (index === sequence.length) {
          index = 0;
          onActivate();
        }
      } else if (e.key === sequence[0]) {
        index = 1;
      } else {
        index = 0;
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onActivate, sequence]);
}
