/**
 * root-config/src/bootstrap.js
 *
 * Async MF boundary for the root-config orchestrator.
 * The dynamic import creates a webpack chunk boundary so Module Federation
 * can fully initialise shared singletons (React, Chakra, etc.) BEFORE
 * single-spa's registerApplication() calls fire.
 *
 * Pattern mirrors each MFE's bootstrap.js — every participant in the MF
 * graph needs this boundary to avoid "Shared module is not available for
 * eager consumption" runtime errors.
 */
import('./ind-devices-root-config.js').catch((err) =>
  console.error('[root-config] bootstrap failed:', err)
)
