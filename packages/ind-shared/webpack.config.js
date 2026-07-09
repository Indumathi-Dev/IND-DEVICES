/**
 * packages/ind-shared/webpack.config.js
 *
 * Builds ind-shared as a standalone Module Federation remote.
 * Runs on port 8080 — mirrors the 'ui-common' remote in the reference:
 *   'ui-common': 'ui_common@package/ui-common/ui_common_remote_entry.js'
 *
 * MFEs import at runtime:
 *   import AppShell      from 'ind_shared/AppShell'
 *   import { login }     from 'ind_shared/authService'
 *   import { useWcagAudit } from 'ind_shared/useWcagAudit'
 *
 * The entry file (src/index.js) is a no-op bootstrap — the actual content
 * is accessed only via the MF remote entry (ind_shared_remote_entry.js).
 */
const path    = require('path')
const mfConfig = require('./mf.config.js')

module.exports = (env, argv) => {
  argv = argv || {}
  return {
    // Minimal entry — ind-shared is accessed via MF exposes, not its main bundle
    entry: path.resolve(__dirname, 'src/index.js'),

    mode:    argv.mode === 'production' ? 'production' : 'development',
    devtool: 'source-map',

    output: {
      filename:   'ind-shared.js',
      publicPath: 'http://localhost:8080/',
      clean: true,
      crossOriginLoading: 'anonymous',
    },

    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', { targets: { browsers: ['last 2 Chrome versions'] } }],
                ['@babel/preset-react', { runtime: 'automatic' }],
              ],
            },
          },
        },
        { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
      ],
    },

    resolve: {
      extensions: ['.js', '.jsx'],
    },

    // ── Spread ModuleFederationPlugin from mf.config.js ──────────────────────
    plugins: [...mfConfig.plugins],

    devServer: {
      port: 8080,
      headers: { 'Access-Control-Allow-Origin': '*' },
      historyApiFallback: true,
    },
  }
}
