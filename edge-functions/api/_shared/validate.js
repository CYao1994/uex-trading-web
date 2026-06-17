/**
 * Input Validation Middleware for Edge Functions.
 * Provides schema-based validation for request parameters and body.
 */

/**
 * Validate an object against a simple schema.
 *
 * @param {object} params - The params object to validate
 * @param {object} schema - Schema definition: { key: { type, required, min, max, pattern } }
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateParams(params, schema) {
  const errors = [];

  for (const [key, rules] of Object.entries(schema)) {
    const value = params[key];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors.push(`${key} is required`);
      continue;
    }

    // Skip further checks if value is absent and not required
    if (value === undefined || value === null || value === '') continue;

    // Type check
    if (rules.type === 'number' || rules.type === 'integer') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`${key} must be a number`);
        continue;
      }
      if (rules.type === 'integer' && !Number.isInteger(num)) {
        errors.push(`${key} must be an integer`);
        continue;
      }
      if (rules.min !== undefined && num < rules.min) {
        errors.push(`${key} must be >= ${rules.min}`);
      }
      if (rules.max !== undefined && num > rules.max) {
        errors.push(`${key} must be <= ${rules.max}`);
      }
    }

    if (rules.type === 'string') {
      if (typeof value !== 'string') {
        errors.push(`${key} must be a string`);
        continue;
      }
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`${key} must be at least ${rules.minLength} characters`);
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`${key} must be at most ${rules.maxLength} characters`);
      }
    }

    if (rules.type === 'array') {
      if (!Array.isArray(value)) {
        errors.push(`${key} must be an array`);
        continue;
      }
      if (rules.minLength !== undefined && value.length < rules.minLength) {
        errors.push(`${key} must have at least ${rules.minLength} items`);
      }
      if (rules.maxLength !== undefined && value.length > rules.maxLength) {
        errors.push(`${key} must have at most ${rules.maxLength} items`);
      }
    }

    // Regex pattern
    if (rules.pattern && !rules.pattern.test(String(value))) {
      errors.push(`${key} has invalid format`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// Pre-defined schemas for common endpoints

export const SCHEMAS = {
  /** POST /api/sell-route, /api/buy-route - matches frontend SellPanel/BuyPanel */
  tradeRoute: {
    origin: { type: 'string', required: true, maxLength: 200 },
    items: { type: 'array', required: true },
    origin_id: { type: 'integer', required: false },
  },

  /** POST /api/trade-chain - matches frontend ChainPanel */
  tradeChain: {
    capital: { type: 'number', required: true, min: 0 },
    max_legs: { type: 'integer', required: false, min: 2, max: 10 },
    origin_location_id: { type: 'number', required: true },
    origin_location_name: { type: 'string', required: true, maxLength: 200 },
    vehicle_id: { type: 'integer', required: false },
    scu_override: { type: 'number', required: false, min: 1 },
  },

  /** POST /api/feedback */
  feedback: {
    type: { type: 'string', required: true, maxLength: 50 },
    description: { type: 'string', required: true, minLength: 10, maxLength: 5000 },
  },

  /** GET /api/items query params */
  itemsQuery: {
    q: { type: 'string', required: false, maxLength: 200 },
    id_category: { type: 'integer', required: false, min: 1 },
    limit: { type: 'integer', required: false, min: 1, max: 500 },
  },

  /** GET /api/commodities query params */
  commoditiesQuery: {
    q: { type: 'string', required: false, maxLength: 200 },
    limit: { type: 'integer', required: false, min: 1, max: 500 },
  },

  /** GET /api/items-prices-all, /api/items-attributes, /api/categories-attributes query params */
  categoryQuery: {
    id_category: { type: 'integer', required: false, min: 1 },
  },

  /** Search query params (terminals, locations, vehicles) */
  searchQuery: {
    q: { type: 'string', required: false, maxLength: 200 },
  },
};
