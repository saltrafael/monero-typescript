"use strict";

import path from "path";
import configBase from "./webpack.base.js";

export default Object.assign({}, configBase, {
  name: "Browser tests config",
  entry: "./src/test/browser/tests.js",
  output: {
    path: path.resolve(__dirname, "browser_build"),
    filename: "monero-javascript-tests.js",
  },
});
