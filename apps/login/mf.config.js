/**
 * apps/login/mf.config.js
 *
 * Follows the reference mf.config.js.ts pattern exactly:
 *   const { ModuleFederationPlugin } = require('webpack').container
 *   const { dependencies, name } = require('./package.json')
 *
 * remotes:
 *   ind_shared  ← mirrors 'ui-common' in the reference (shared library remote)
 *
 * exposes:
 *   ./App        ← root React component (mirrors ./App: './src/App.tsx' in reference)
 *   ./bootstrap  ← single-spa lifecycle entry (unique to SPA integration)
 *
 * shared:
 *   react, react-dom, @chakra-ui/react, @emotion/*, framer-motion, single-spa-react
 *   all declared as singletons — one copy loaded across the entire shell
 */

const { ModuleFederationPlugin } = require('webpack').container
const { dependencies, name } = require('./package.json')

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name,  // 'login'  ← valid JS identifier, taken directly from package.json
      filename: `${name}_remote_entry.js`,  // login_remote_entry.js

      remotes: {
        // Mirrors: 'ui-common': 'ui_common@package/ui-common/ui_common_remote_entry.js'
        ind_shared: 'ind_shared@http://localhost:8080/ind_shared_remote_entry.js',
      },

      exposes: {
        // Mirrors: './App': './src/App.tsx'
        './App':       './src/App.jsx',

        // Single-spa lifecycle functions — consumed by root-config via
        //   registerApplication({ app: () => import('login/bootstrap') })
        './bootstrap': './src/ind-devices-login.js',
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
        'single-spa-react': {
          singleton: true,
          requiredVersion: dependencies['single-spa-react'],
        },
      },
    }),
  ],
}
