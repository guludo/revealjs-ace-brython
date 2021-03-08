const path = require('path')

module.exports = {
  entry: './src/index.js',
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist'),
    library: 'RevealAceBrython',
    libraryExport: 'default',
    libraryTarget: 'umd',
  },
  devtool: 'eval-source-map',
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: 'html-loader',
      },
      {
        test: /\.svg$/i,
        type: 'asset/inline',
      },
      {
        test: /\/runner\.py$/,
        type: 'asset/source',
      },
    ],
  },
}
