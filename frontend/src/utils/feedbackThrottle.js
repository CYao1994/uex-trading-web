// feedbackThrottle.js - ?? localStorage ?????????
// 5 ?????,??????

const STORAGE_KEY = 'uex_feedback_last_submit';
const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Check if the user is allowed to submit feedback (not in cooldown period).
 * @returns {boolean} true if submission is allowed, false if in cooldown
 */
export function canSubmit() {
  try {
    const lastSubmit = localStorage.getItem(STORAGE_KEY);
    if (!lastSubmit) return true;

    const elapsed = Date.now() - Number(lastSubmit);
    return elapsed >= COOLDOWN_MS;
  } catch {
    // localStorage unavailable - allow by default
    return true;
  }
}

/**
 * Record a successful feedback submission timestamp.
 */
export function recordSubmit() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()));
  } catch {
    // Silently fail if localStorage is unavailable
  }
}

/**
 * Get the remaining cooldown time in milliseconds.
 * @returns {number} Remaining cooldown time (0 if allowed)
 */
export function getRemainingCooldown() {
  try {
    const lastSubmit = localStorage.getItem(STORAGE_KEY);
    if (!lastSubmit) return 0;

    const elapsed = Date.now() - Number(lastSubmit);
    const remaining = COOLDOWN_MS - elapsed;
    return remaining > 0 ? remaining : 0;
  } catch {
    return 0;
  }
}
