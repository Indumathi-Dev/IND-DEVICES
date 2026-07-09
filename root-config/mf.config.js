/**
 * root-config/mf.config.js
 *
 * The orchestrator's Module Federation config.
 *
 * Mirrors the DTIAS registerApps.ts pattern where root-config
 * holds references to all MFE remotes and dynamically imports
 * them via LOADER.MODULE_FEDERATION in registerLocalApp().
 *
 * All MFE remote entry URLs point to each app's webpack-dev-server.
 * In production, these would point to CDN or PVC paths
 * (e.g. apps/login/login_remote_entry.js on the nginx server).
 */

const { ModuleFederationPlugin } = require('webpack').container
const { dependencies } = require('./package.json')

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'root_config',
      filename: 'root_config_remote_entry.js',

      // ── Remotes: all MFEs registered here ─────────────────────────────────
      // Mirrors: registerLocalApp({ moduleFederationProps: { mfImport: () => import('login/bootstrap') } })
      remotes: {
        login:      'login@http://localhost:8081/login_remote_entry.js',
        dashboard:  'dashboard@http://localhost:8082/dashboard_remote_entry.js',
        devices:    'devices@http://localhost:8083/devices_remote_entry.js',

        // Shared library — mirrors 'ui-common' in the reference inventory config
        ind_shared: 'ind_shared@http://localhost:8080/ind_shared_remote_entry.js',
      },

      // root-config does not expose anything — it only consumes
      exposes: {},

      shared: {
        'single-spa': {
          singleton: true,
          requiredVersion: dependencies['single-spa'],
        },
        react: {
          singleton: true,
          eager: true,           // root-config eagerly loads React so it's
          requiredVersion: '^18.3.1', // available before any MFE initialises
        },
        'react-dom': {
          singleton: true,
          eager: true,
          requiredVersion: '^18.3.1',
        },
      },
    }),
  ],
}
