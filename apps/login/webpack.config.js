const path = require('path');
module.exports = (env, argv) => {
  argv = argv || {};
  return {
    entry: path.resolve(__dirname, 'src/ind-devices-login.js'),
    mode: argv.mode === 'production' ? 'production' : 'development',
    devtool: 'source-map',
    output: { filename: 'ind-devices-login.js', library: { type: 'system' }, clean: true },
    module: { rules: [
      { test: /\.jsx?$/, exclude: /node_modules/, use: 'babel-loader' },
      { test: /\.css$/i, use: ['style-loader', 'css-loader'] },
    ]},
    resolve: { extensions: ['.js', '.jsx'] },
    devServer: { port: 8081, headers: { 'Access-Control-Allow-Origin': '*' }, historyApiFallback: true },
  };
};
