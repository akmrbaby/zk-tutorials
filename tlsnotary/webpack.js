var webpack = require("webpack"),
  path = require("path"),
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  HtmlWebpackPlugin = require("html-webpack-plugin");

const ASSET_PATH = process.env.ASSET_PATH || "/";

var alias = {};

var options = {
  ignoreWarnings: [
    /Circular dependency between chunks with runtime/,
    /ResizeObserver loop completed with undelivered notifications/,
  ],
  mode: "development",
  entry: {
    app: path.join(__dirname, "app.tsx"),
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "build"),
    clean: true,
    publicPath: ASSET_PATH,
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "source-map-loader",
          },
          {
            loader: require.resolve("ts-loader"),
          },
        ],
      },
      {
        test: /\.(js|jsx)$/,
        use: [
          {
            loader: "source-map-loader",
          },
          {
            loader: require.resolve("babel-loader"),
          },
        ],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    alias: alias,
    extensions: [".js", ".jsx", ".ts", ".tsx", ".css"],
    fallback: {
      crypto: require.resolve("crypto-browserify"),
      stream: require.resolve("stream-browserify"),
      vm: require.resolve("vm-browserify"),
    },
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "node_modules/tlsn-js/build",
          to: path.join(__dirname, "build"),
          force: true,
        },
      ],
    }),
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "index.ejs"),
      filename: "index.html",
      cache: false,
    }),
    new webpack.ProvidePlugin({
      process: "process/browser",
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"],
    }),
  ].filter(Boolean),

  devServer: {
    port: 8080,
    host: "localhost",
    hot: true,
    headers: {
      "Cross-Origin-Embedder-Policy": "require-corp",
      "Cross-Origin-Opener-Policy": "same-origin",
    },
    client: {
      overlay: false,
    },
  },
};

module.exports = options;
