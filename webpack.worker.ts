"use strict";

import path from "path";
import configBase from "./webpack.base";

export default Object.assign({}, configBase, {
  name: "Monero web worker config",
  entry: "./src/main/js/common/MoneroWebWorker.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "monero_web_worker.js",
  },
});
