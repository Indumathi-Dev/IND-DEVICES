/**
 * packages/ind-shared/mf.config.js
 *
 * Mirrors the ui-common Module Federation config from DTIAS:
 *   remotes: { 'ui-common': 'ui_common@package/ui-common/ui_common_remote_entry.js' }
 *
 * Exposes every service and component so consuming MFEs can import at runtime:
 *   import { login }    from 'ind_shared/authService'
 *   import AppShell     from 'ind_shared/AppShell'
 *   import { useWcagAudit } from 'ind_shared/useWcagAudit'
 */

const { ModuleFederationPlugin } = require('webpack').container
const { dependencies } = require('./package.json')

// MF name must be a valid JS identifier — replace @ / - with _
const MF_NAME = 'ind_shared'

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: MF_NAME,
      filename: `${MF_NAME}_remote_entry.js`,

      // ind-shared has no upstream remotes it consumes at this level
      remotes: {},

      exposes: {
        './authService':   './src/services/authService.js',
        './navigation':    './src/services/navigation.js',
        './devicesApi':    './src/services/devicesApi.js',
        './dashboardApi':  './src/services/dashboardApi.js',
        './useWcagAudit':  './src/hooks/useWcagAudit.js',
        './WcagAuditPanel':'./src/components/WcagAuditPanel.jsx',
        './AppShell':      './src/components/AppShell.jsx',
      },

      shared: {
        react: {
          singleton: true,
          requiredVersion: dependencies['react'],
        },
        'react-dom': {
          singleton: true,
          requiredVersion: dependencies['react-dom'],
        },
        '@chakra-ui/react': {
          singleton: true,
          requiredVersion: dependencies['@chakra-ui/react'],
        },
        '@emotion/react': {
          singleton: true,
          requiredVersion: dependencies['@emotion/react'],
        },
        '@emotion/styled': {
          singleton: true,
          requiredVersion: dependencies['@emotion/styled'],
        },
        'framer-motion': {
          singleton: true,
          requiredVersion: dependencies['framer-motion'],
        },
      },
    }),
  ],
}
