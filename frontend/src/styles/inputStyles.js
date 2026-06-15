/**
 * Shared input styles for the sci-fi glow effect.
 *
 * Usage:
 *   import { focusGlowSx } from '../styles/inputStyles';
 *   <TextField sx={focusGlowSx} />
 *
 * Or with a custom accent color:
 *   <TextField sx={focusGlowSx('#ff6b35')} />
 */

/**
 * Generate the "focus glow" sx style object for MUI TextField.
 * @param {string} [accentColor='#c9a227'] - Accent color for focus/hover states
 * @returns {object} sx prop value
 */
export function focusGlowSx(accentColor = '#c9a227') {
  const alpha = (hex, a) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  return {
    '& .MuiOutlinedInput-root': {
      '& fieldset': {
        borderColor: alpha(accentColor, 0.3),
      },
      '&:hover fieldset': {
        borderColor: accentColor,
      },
      '&.Mui-focused fieldset': {
        borderColor: accentColor,
        borderWidth: '2px',
        boxShadow: `0 0 12px ${alpha(accentColor, 0.2)}`,
      },
    },
  };
}

/**
 * Pre-built instances for common accent colors (avoid re-creating on each render).
 */
export const GLOW_AMBER = focusGlowSx('#c9a227');
export const GLOW_ORANGE = focusGlowSx('#ff6b35');
export const GLOW_GREEN = focusGlowSx('#00ff88');
export const GLOW_PURPLE = focusGlowSx('#a855f7');
