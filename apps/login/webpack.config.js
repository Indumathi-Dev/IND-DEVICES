/**
 * apps/login/webpack.config.js
 *
 * Merges mf.config.js (ModuleFederationPlugin) into the base webpack config.
 * Mirrors DTIAS pattern: each app extends a shared base config and spreads
 * mfConfig.plugins — identical to how inventory/dashboard/etc. extend
 * configs/react-webpack/webpack.config.js in the reference codebase.
 *
 * Key MF-specific changes vs a plain SPA bundle:
 *   output.publicPath = 'auto'       → MF infers chunk URLs from the script tag
 *   NO library.type = 'system'       → MF uses its own chunk loader, not SystemJS
 *   entry = src/bootstrap.js         → async boundary ensures MF shared scope
 *                                       is initialised before app code runs
 *   resolve.alias @ind-devices/shared → points to local source so MF singleton
 *                                       shared[] deduplicates it across all MFEs
 */
const path     = require('path')
const mfConfig = require('./mf.config.js')

module.exports = (env, argv) => {
  argv = argv || {}
  return {
    // Async bootstrap entry — creates the MF initialisation boundary
    entry: path.resolve(__dirname, 'src/bootstrap.js'),

    mode:    argv.mode === 'production' ? 'production' : 'development',
    devtool: 'source-map',

    output: {
      filename: 'ind-devices-login.js',
      // 'auto' lets MF infer the public URL from the script tag that loaded it.
      // Same build works at localhost AND on a CDN / PVC path without rebuilding.
      publicPath: 'auto',
      clean: true,
    },

    module: {
      rules: [
        { test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' },
        { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
      ],
    },

    resolve: {
      extensions: ['.js', '.jsx'],
      // Resolve @ind-devices/shared to the local source directory so webpack
      // treats the workspace package as a singleton that MF can deduplicate.
      alias: {
        '@ind-devices/shared': path.resolve(__dirname, '../../packages/ind-shared/src'),
      },
    },

    // ── Spread mf.config.js plugins (ModuleFederationPlugin) ─────────────────
    plugins: [
      ...mfConfig.plugins,
    ],

    devServer: {
      port: 8081,
      headers: { 'Access-Control-Allow-Origin': '*' },
      historyApiFallback: true,
    },
  }
}
