const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
module.exports = (env = {}, argv = {}) => ({
  entry: path.resolve(__dirname, 'src/ind-devices-root-config.js'),
  mode: argv.mode === 'production' ? 'production' : 'development',
  output: { filename: 'ind-devices-root-config.js', library: { type: 'system' }, clean: true },
  devServer: { port: 9000, historyApiFallback: true },
  plugins: [new HtmlWebpackPlugin({ inject: false, template: path.resolve(__dirname, 'src/index.ejs'), templateParameters: { isLocal: true } })],
});
