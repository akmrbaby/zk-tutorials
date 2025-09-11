var webpack = require("webpack"),
  path = require("path"),
  CopyWebpackPlugin = require("copy-webpack-plugin"),
  HtmlWebpackPlugin = require("html-webpack-plugin");

var options = {
  mode: "development",
  entry: {
    app: path.join(__dirname, "app.tsx"),
  },
  output: {
    filename: "[name].bundle.js",
    path: path.resolve(__dirname, "build"),
    clean: true,
    publicPath: "/",
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
    ],
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx"],
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
      templateContent: () =>
        `
        <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />
              <title>TLSNotary Demo</title>
              <meta name="viewport" content="width=device-width,initial-scale=1" />
            </head>
            <body>
              <div id="root"></div>
            </body>
          </html>
      `.trim(),
    }),
    new webpack.ProvidePlugin({ Buffer: ["buffer", "Buffer"] }),
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
