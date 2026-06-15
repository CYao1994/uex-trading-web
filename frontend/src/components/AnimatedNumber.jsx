import { useState, useEffect, useRef } from 'react';

/**
 * AnimatedNumber - count-up animation for numerical values.
 * Uses easeOutExpo easing for natural deceleration, like a starship
 * speed indicator winding down to its final reading.
 *
 * @param {number} target - The final value to animate to
 * @param {number} duration - Animation duration in ms (default 800)
 * @param {function} formatter - Value ? display string (default: toLocaleString)
 * @param {string} prefix - String to prepend (e.g., "+")
 * @param {string} suffix - String to append (e.g., " aUEC")
 * @param {function} onComplete - Callback when animation finishes
 */
function easeOutExpo(t) {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

function AnimatedNumber({
  target = 0,
  duration = 800,
  formatter = (v) => Math.round(v).toLocaleString(),
  prefix = '',
  suffix = '',
  onComplete,
  ...rest
}) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef(null);
  const startTimeRef = useRef(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    // Skip first render - start from 0 on mount
    if (!mountedRef.current) {
      mountedRef.current = true;
      // Start animation from 0 to target
      if (target > 0) {
        const animate = (timestamp) => {
          if (!startTimeRef.current) startTimeRef.current = timestamp;
          const elapsed = timestamp - startTimeRef.current;
          const progress = Math.min(elapsed / duration, 1);
          const eased = easeOutExpo(progress);
          const value = target * eased;
          setCurrent(value);
          if (progress < 1) {
            rafRef.current = requestAnimationFrame(animate);
          } else {
            setCurrent(target);
          }
        };
        rafRef.current = requestAnimationFrame(animate);
      }
      return;
    }

    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const startValue = current;
    const diff = target - startValue;

    // No meaningful change - skip
    if (Math.abs(diff) < 0.5) {
      if (onComplete) onComplete();
      return;
    }

    const animate = (timestamp) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutExpo(progress);
      const value = startValue + diff * eased;

      setCurrent(value);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        setCurrent(target);
        startTimeRef.current = null;
        if (onComplete) onComplete();
      }
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  return (
    <span {...rest}>
      {prefix}{formatter(current)}{suffix}
    </span>
  );
}

export default AnimatedNumber;
