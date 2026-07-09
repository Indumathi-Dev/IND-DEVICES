/**
 * registerApps.js
 *
 * Mirrors DTIAS registerApps.ts:70-118 (startRegisteringApps).
 *
 * Pattern replicated from the reference:
 *   - LOADER enum: SPA (SystemJS) | MODULE_FEDERATION (webpack MF)
 *   - APP_REGISTRY: static equivalent of /gui/api/getsidenavigationlink response
 *   - registerLocalApp()  → Module Federation  (LOADER.MODULE_FEDERATION path)
 *   - registerRemoteApp() → SystemJS import    (LOADER.SPA path)
 *   - startRegisteringApps() → exported entry called by root-config
 *
 * In DTIAS, startRegisteringApps() fetches nav config from the server.
 * Here we use a static registry (same shape) since we don't have a
 * permission-driven menu endpoint. The rest of the logic is identical.
 */

import { registerApplication } from 'single-spa'
import { loadMFModule } from './loadMFModule.js'

// ── LOADER enum — mirrors DTIAS LOADER constant ───────────────────────────────
export const LOADER = {
  SPA:               'spa',              // loaded via SystemJS import map
  MODULE_FEDERATION: 'module_federation', // loaded via webpack Module Federation
}

// ── Session helpers (duplicated here — root-config boots before MFEs) ─────────
const SESSION_KEY = 'ind-devices:session'

function isAuthenticated() {
  try {
    const s = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null')
    return Boolean(s && (!s.expiresAt || Date.now() <= s.expiresAt))
  } catch {
    return false
  }
}

// ── APP_REGISTRY — mirrors sidebarMenuConfig.ts + rolesAndPermisions.ts ──────
//
// Each entry mirrors a registered app in DTIAS:
//   name             → registerApplication name (must be unique)
//   loader           → LOADER.SPA | LOADER.MODULE_FEDERATION
//   activeWhen       → URL predicate (same as activeUrl in DTIAS)
//   moduleFederationProps → { url, scope, module } for LOADER.MODULE_FEDERATION
//   spaProps         → { spaUrl }                 for LOADER.SPA
//
// `moduleFederationProps.url` would point to CDN/PVC in production.
// In development it points to each webpack-dev-server.
const APP_REGISTRY = [
  {
    name: '@ind-devices/login',
    loader: LOADER.MODULE_FEDERATION,
    activeWhen: () => !isAuthenticated(),
    moduleFederationProps: {
      url:    'http://localhost:8081/login_remote_entry.js',
      scope:  'login',
      module: './bootstrap',
    },
  },
  {
    name: '@ind-devices/dashboard',
    loader: LOADER.MODULE_FEDERATION,
    activeWhen: (loc) =>
      isAuthenticated() &&
      (loc.pathname === '/' || loc.pathname.startsWith('/dashboard')),
    moduleFederationProps: {
      url:    'http://localhost:8082/dashboard_remote_entry.js',
      scope:  'dashboard',
      module: './bootstrap',
    },
  },
  {
    name: '@ind-devices/devices',
    loader: LOADER.MODULE_FEDERATION,
    activeWhen: (loc) =>
      isAuthenticated() && loc.pathname.startsWith('/devices'),
    moduleFederationProps: {
      url:    'http://localhost:8083/devices_remote_entry.js',
      scope:  'devices',
      module: './bootstrap',
    },
  },
]

// ── registerLocalApp — LOADER.MODULE_FEDERATION ───────────────────────────────
//
// Mirrors DTIAS registerLocalApp() which uses moduleFederationProps to
// construct a dynamic import that single-spa calls lazily on first activation.
//
// Two strategies are wired in:
//   A. Static webpack remote (declared in root-config mf.config.js remotes{})
//      → fastest; webpack resolves at build time
//   B. Dynamic runtime load via loadMFModule()
//      → flexible; URL can change per environment without rebuilding root-config
//
// Strategy A is tried first (import(scope/module)); if that throws because
// the scope isn't in the static remotes config, Strategy B kicks in.
function registerLocalApp(appConfig) {
  const { name, activeWhen, moduleFederationProps } = appConfig
  const { url, scope, module } = moduleFederationProps

  registerApplication({
    name,
    activeWhen,

    /**
     * app() is called lazily by single-spa on first activation.
     *
     * Strategy A — static MF import (scope declared in root-config mf.config.js).
     * This is the normal path in development and CI builds.
     */
    app: () => {
      try {
        // Dynamic import through the statically-declared MF remote.
        // e.g. import('login/bootstrap') — webpack resolves this via
        // the `remotes: { login: '...' }` entry in root-config/mf.config.js.
        switch (scope) {
          case 'login':     return import('login/bootstrap')
          case 'dashboard': return import('dashboard/bootstrap')
          case 'devices':   return import('devices/bootstrap')
          default:
            // Strategy B — dynamic runtime loader (production CDN/PVC path)
            return loadMFModule(url, scope, module)
        }
      } catch {
        // Strategy B fallback — runtime load from `url`
        return loadMFModule(url, scope, module)
      }
    },
  })
}

// ── registerRemoteApp — LOADER.SPA ───────────────────────────────────────────
// Mirrors DTIAS registerRemoteApp() which calls System.import(spaProps.spaUrl).
// Kept for backward compatibility with any SPA-loader MFEs.
function registerRemoteApp(appConfig) {
  const { name, activeWhen, spaProps } = appConfig
  registerApplication({
    name,
    activeWhen,
    app: () => {
      if (typeof System === 'undefined') {
        return Promise.reject(
          new Error(`[registerRemoteApp] SystemJS not found for app "${name}"`)
        )
      }
      return System.import(spaProps.spaUrl)
    },
  })
}

// ── startRegisteringApps — exported entry point ───────────────────────────────
// Called by ind-devices-root-config.js after single-spa is ready.
// Mirrors the exported startRegisteringApps() from DTIAS registerApps.ts.
export function startRegisteringApps() {
  APP_REGISTRY.forEach((app) => {
    if (app.loader === LOADER.MODULE_FEDERATION) {
      registerLocalApp(app)
    } else {
      registerRemoteApp(app)
    }
  })
  console.log(
    `[registerApps] Registered ${APP_REGISTRY.length} applications ` +
    `(${APP_REGISTRY.filter(a => a.loader === LOADER.MODULE_FEDERATION).length} MF, ` +
    `${APP_REGISTRY.filter(a => a.loader === LOADER.SPA).length} SPA)`
  )
}
