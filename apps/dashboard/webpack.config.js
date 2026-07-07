const path = require('path');
module.exports = (env, argv) => {
  argv = argv || {};
  return {
    entry: path.resolve(__dirname, 'src/ind-devices-dashboard.js'),
    mode: argv.mode === 'production' ? 'production' : 'development',
    devtool: 'source-map',
    output: { filename: 'ind-devices-dashboard.js', library: { type: 'system' }, clean: true },
    module: { rules: [
      { test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
    ]},
    resolve: { extensions: ['.js', '.jsx'] },
    devServer: { port: 8082, headers: { 'Access-Control-Allow-Origin': '*' }, historyApiFallback: true },
  };
};
