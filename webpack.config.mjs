import path from "path";
import { fileURLToPath } from "url";
import CopyPlugin from "copy-webpack-plugin";
import { CleanWebpackPlugin } from "clean-webpack-plugin";

// ESM에서 __dirname 대체
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 모든 스크립트를 일반 JavaScript로 빌드 (ES 모듈 사용하지 않음)
export default {
  mode: "development",
  devtool: "cheap-module-source-map",
  entry: {
    background: "./src/scripts/commons/background.js",
    authorize: "./src/scripts/commons/authorize.js",
    baekjoon: "./src/scripts/baekjoon/baekjoon.js",
    programmers: "./src/scripts/programmers/programmers.js",
    swexpertacademy: "./src/scripts/swexpertacademy/swexpertacademy.js",
    goormlevel: "./src/scripts/goormlevel/goormlevel.js",
    oauth2: "./src/scripts/commons/oauth2.js",
    popup: "./src/popup.jsx",
    settings: "./src/settings.jsx",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
  },
  optimization: {
    splitChunks: false,
    runtimeChunk: false,
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyPlugin({
      patterns: [
        { from: "./src/manifest.json", to: "./" },
        { from: "./src/rules.json", to: "./" },
        { from: "./src/assets", to: "./assets" },
        { from: "./src/css", to: "./css" },
        { from: "./src/popup.html", to: "./" },
        { from: "./src/settings.html", to: "./" },
      ],
    }),
  ],
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', {
                targets: {
                  chrome: "88"
                }
              }],
              ['@babel/preset-react', {
                runtime: 'automatic',
                development: false,
                importSource: 'react'
              }]
            ]
          }
        }
      }
    ]
  },
  resolve: {
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    alias: {
      sha1: "js-sha1",
      filesaver: "file-saver",
      "@": path.resolve(__dirname, "src"),
      "@components": path.resolve(__dirname, "src/components"),
      "@scripts": path.resolve(__dirname, "src/scripts"),
    },
  },
};