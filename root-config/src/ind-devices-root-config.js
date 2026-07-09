/**
 * ind-devices-root-config.js
 *
 * single-spa orchestrator — loaded via bootstrap.js async MF boundary.
 * Delegates app registration to registerApps.js which mirrors
 * registerApps.ts:70-118 (LOADER.SPA | LOADER.MODULE_FEDERATION).
 */
import { start } from 'single-spa'
import { startRegisteringApps } from './registerApps.js'

// Register all MFEs (LOADER.MODULE_FEDERATION path)
startRegisteringApps()

// Re-evaluate activity functions on auth state change without URL change.
// Mirrors DTIAS custom event-bus approach for cross-MFE session propagation.
window.addEventListener('ind-devices:session-changed', () => {
  window.dispatchEvent(new PopStateEvent('popstate'))
})

start({ urlRerouteOnly: true })
