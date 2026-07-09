/**
 * apps/dashboard/mf.config.js  —  Module Federation config
 *
 * Mirrors reference mf.config.js.ts pattern exactly.
 * name + dependencies sourced from package.json (same as inventory example).
 *
 * remotes:  ind_shared (ui-common equivalent)
 * exposes:  ./App (root component), ./bootstrap (single-spa lifecycles)
 * shared:   all heavy deps declared singleton — one copy across the shell
 */

const { ModuleFederationPlugin } = require('webpack').container
const { dependencies, name } = require('./package.json')

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name,                                     // 'dashboard'
      filename: `${name}_remote_entry.js`,    // dashboard_remote_entry.js

      remotes: {
        // mirrors: 'ui-common': 'ui_common@package/ui-common/...'
        ind_shared: 'ind_shared@http://localhost:8080/ind_shared_remote_entry.js',
      },

      exposes: {
        // mirrors: './App': './src/App.tsx'
        './App':       './src/App.jsx',
        './bootstrap': './src/ind-devices-dashboard.js',
      },

      shared: {
        react:             { singleton: true, requiredVersion: dependencies['react']             },
        'react-dom':       { singleton: true, requiredVersion: dependencies['react-dom']         },
        '@chakra-ui/react':{ singleton: true, requiredVersion: dependencies['@chakra-ui/react']  },
        '@emotion/react':  { singleton: true, requiredVersion: dependencies['@emotion/react']    },
        '@emotion/styled': { singleton: true, requiredVersion: dependencies['@emotion/styled']   },
        'framer-motion':   { singleton: true, requiredVersion: dependencies['framer-motion']     },
        'single-spa-react':{ singleton: true, requiredVersion: dependencies['single-spa-react']  },
      },
    }),
  ],
}
