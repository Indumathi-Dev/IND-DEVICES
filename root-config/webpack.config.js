const path              = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const mfConfig          = require('./mf.config.js');

/**
 * root-config/webpack.config.js
 * Merges mf.config.js (ModuleFederationPlugin) with the base config.
 * bootstrap.js entry creates the async MF boundary before single-spa starts.
 */
module.exports = (env, argv) => {
  argv = argv || {};
  return {
    entry: path.resolve(__dirname, 'src/bootstrap.js'),
    mode:  argv.mode === 'production' ? 'production' : 'development',
    devtool: 'source-map',
    output: {
      filename:   'ind-devices-root-config.js',
      publicPath: 'http://localhost:9000/',
      clean: true,
    },
    plugins: [
      ...mfConfig.plugins,
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/index.html'),
        filename: 'index.html',
      }),
    ],
    devServer: {
      port: 9000,
      historyApiFallback: true,
    },
  };
};
