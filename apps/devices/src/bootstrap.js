/**
 * bootstrap.js — async MF boundary
 *
 * This dynamic import is the webpack "async boundary" required by
 * Module Federation so that shared singleton modules (React, Chakra, etc.)
 * declared in mf.config.js are initialised BEFORE the application code runs.
 *
 * Pattern: webpack entry -> import('./lifecycle') -> MF resolves shared deps
 */
import('./ind-devices-devices.js').catch((err) =>
  console.error('[devices] bootstrap failed:', err)
)
