import assert from "assert";
import GenUtils from "./GenUtils";
import MoneroError from "./MoneroError";
import ThreadPool from "./ThreadPool";
import path from "path";

/**
 * Collection of helper utilities for the library.
 *
 * @hideconstructor
 */
class LibraryUtils {
  private static _INSTANCE: LibraryUtils | null = null;
  LOG_LEVEL: number = 0;
  WORKER_DIST_PATH_DEFAULT: string;
  WORKER_DIST_PATH: string;
  WASM_MODULE: any;
  FULL_LOADED: boolean = false;
  REJECT_UNAUTHORIZED_FNS: any;
  WORKER: any;
  WORKER_POOL: any;
  WORKER_OBJECTS: any;

  private constructor() {
    const that = this;
    this.WORKER_DIST_PATH_DEFAULT = GenUtils.isBrowser()
      ? "/monero_web_worker.js"
      : (function () {
          return that._prefixWindowsPath(
            path.join(__dirname, "./MoneroWebWorker.js")
          );
        })();
    this.WORKER_DIST_PATH = this.WORKER_DIST_PATH_DEFAULT;
  }

  static get instance() {
    if (!LibraryUtils._INSTANCE) LibraryUtils._INSTANCE = new LibraryUtils();
    return LibraryUtils._INSTANCE;
  }

  /**
   * Log a message.
   *
   * @param {number} level - log level of the message
   * @param {string} msg - message to log
   */
  log(level: number, msg: string) {
    assert(
      level === parseInt(String(level), 10) && level >= 0,
      "Log level must be an integer >= 0"
    );
    if (this.LOG_LEVEL >= level) console.log(msg);
  }

  /**
   * Set the library's log level with 0 being least verbose.
   *
   * @param {string | number} level - the library's log level
   */
  async setLogLevel(level: string | number) {
    assert(
      level === parseInt(String(level), 10) && level >= 0,
      "Log level must be an integer >= 0"
    );

    this.LOG_LEVEL = level;
    if (this.WASM_MODULE) this.WASM_MODULE.set_log_level(level);
    if (this.WORKER)
      await this.invokeWorker(GenUtils.getUUID(), "setLogLevel", [level]);
  }

  /**
   * Get the total memory used by WebAssembly.
   *
   * @return {Promise<number>} the total memory used by WebAssembly
   */
  async getWasmMemoryUsed(): Promise<number> {
    let total = 0;
    if (this.WORKER)
      total += await this.invokeWorker(
        GenUtils.getUUID(),
        "getWasmMemoryUsed",
        []
      );
    if (this.WASM_MODULE && this.WASM_MODULE.HEAP8)
      total += this.WASM_MODULE.HEAP8.length;
    return total;
  }

  /**
   * Load the WebAssembly keys module with caching.
   */
  async loadKeysModule() {
    // use cache if suitable, full module supersedes keys module because it is superset
    if (this.WASM_MODULE) return this.WASM_MODULE;

    // load module
    delete this.WASM_MODULE;
    const that = this;

    return import("../../../../dist/monero_wallet_keys").then((module) => {
      that.WASM_MODULE = module;
      delete that.WASM_MODULE.then;
      that._initWasmModule(that.WASM_MODULE);
      return that.WASM_MODULE;
    });
  }

  /**
   * Load the WebAssembly full module with caching.
   *
   * The full module is a superset of the keys module and overrides it.
   *
   * TODO: this is separate static function from loadKeysModule() because webpack cannot bundle worker using runtime param for conditional import
   */
  async loadFullModule() {
    // use cache if suitable, full module supersedes keys module because it is superset
    if (this.WASM_MODULE && this.FULL_LOADED) return this.WASM_MODULE;

    // load module
    delete this.WASM_MODULE;
    const that = this;

    return import("../../../../dist/monero_wallet_keys").then((module) => {
      that.WASM_MODULE = module;
      delete that.WASM_MODULE.then;
      that.FULL_LOADED = true;
      that._initWasmModule(that.WASM_MODULE);
      return that.WASM_MODULE;
    });
  }

  /**
   * Register a function by id which informs if unauthorized requests (e.g.
   * self-signed certificates) should be rejected.
   *
   * @param {string} fnId - unique identifier for the function
   * @param {function} fn - function to inform if unauthorized requests should be rejected
   */
  public setRejectUnauthorizedFn(fnId: string, fn: () => boolean) {
    if (!this.REJECT_UNAUTHORIZED_FNS) this.REJECT_UNAUTHORIZED_FNS = [];
    if (fn === undefined) delete this.REJECT_UNAUTHORIZED_FNS[fnId];
    else this.REJECT_UNAUTHORIZED_FNS[fnId] = fn;
  }

  /**
   * Indicate if unauthorized requests should be rejected.
   *
   * @param {string} fnId - uniquely identifies the function
   */
  isRejectUnauthorized(fnId: string) {
    if (!this.REJECT_UNAUTHORIZED_FNS[fnId])
      throw new Error(
        "No function registered with id " +
          fnId +
          " to inform if unauthorized reqs should be rejected"
      );
    return this.REJECT_UNAUTHORIZED_FNS[fnId]();
  }

  /**
   * Set the path to load the worker. Defaults to "/monero_web_worker.js" in the browser
   * and "./MoneroWebWorker.js" in node.
   *
   * @param {string} workerDistPath - path to load the worker
   */
  setWorkerDistPath(workerDistPath: string) {
    const path = this._prefixWindowsPath(
      workerDistPath ? workerDistPath : this.WORKER_DIST_PATH_DEFAULT
    );
    if (path !== this.WORKER_DIST_PATH) delete this.WORKER;
    this.WORKER_DIST_PATH = path;
  }

  /**
   * Get a singleton instance of a worker to share.
   *
   * @return {Promise<Worker>} a worker to share among wallet instances
   */
  async getWorker(): Promise<Worker> {
    // one time initialization
    if (!this.WORKER) {
      this.WORKER = new Worker(this.WORKER_DIST_PATH);
      this.WORKER_OBJECTS = {}; // store per object running in the worker

      // receive worker errors
      this.WORKER.onerror = function (err: any) {
        console.error(
          "Error posting message to MoneroWebWorker.js; is it copied to the app's build directory (e.g. in the root)?"
        );
        console.log(err);
      };

      // receive worker messages
      this.WORKER.onmessage = function (e: any) {
        // lookup object id, callback function, and this arg
        let thisArg = null;
        let callbackFn = this.WORKER_OBJECTS[e.data[0]].callbacks[e.data[1]]; // look up by object id then by function name
        if (callbackFn === undefined)
          throw new Error(
            "No worker callback function defined for key '" + e.data[1] + "'"
          );
        if (callbackFn instanceof Array) {
          // this arg may be stored with callback function
          thisArg = callbackFn[1];
          callbackFn = callbackFn[0];
        }

        // invoke callback function with this arg and arguments
        callbackFn.apply(thisArg, e.data.slice(2));
      };
    }
    return this.WORKER;
  }

  /**
   * Terminate monero-javascript's singleton worker.
   */
  async terminateWorker() {
    if (this.WORKER) {
      this.WORKER.terminate();
      delete this.WORKER;
      this.WORKER = undefined;
    }
  }

  /**
   * Invoke a worker function and get the result with error handling.
   *
   * @param {string} objectId identifies the worker object to invoke
   * @param {string} fnName is the name of the function to invoke
   * @param {Object[]} args are function arguments to invoke with
   * @return {any} resolves with response payload from the worker or an error
   */
  async invokeWorker(
    objectId: undefined | string,
    fnName: string,
    args: any
  ): Promise<any> {
    assert(fnName.length >= 2);
    const worker = await this.getWorker();
    if (!this.WORKER_OBJECTS[objectId])
      this.WORKER_OBJECTS[objectId] = { callbacks: {} };

    const that = this;
    return await new Promise(function (resolve, reject) {
      const callbackId = GenUtils.getUUID();
      that.WORKER_OBJECTS[objectId].callbacks[callbackId] = function (
        resp: any
      ) {
        // TODO: this defines function once per callback
        resp
          ? resp.error
            ? reject(this.deserializeError(resp.error))
            : resolve(resp.result)
          : resolve(undefined);
        delete this.WORKER_OBJECTS[objectId].callbacks[callbackId];
      };
      worker.postMessage(
        [objectId, fnName, callbackId].concat(
          args === undefined ? [] : GenUtils.listify(args)
        )
      );
    });
  }

  serializeError(err: any) {
    const serializedErr = {
      name: err.name,
      message: err.message,
      stack: err.stack,
      type: err instanceof MoneroError ? "MoneroError" : "Error",
    };
    return serializedErr;
  }

  deserializeError(serializedErr: any) {
    const err =
      serializedErr.type === "MoneroError"
        ? new MoneroError(serializedErr.message)
        : new Error(serializedErr.message);
    err.name = serializedErr.name;
    err.stack = serializedErr.stack;
    return err;
  }

  // ------------------------------ PRIVATE HELPERS ---------------------------

  private _initWasmModule(wasmModule: any) {
    wasmModule.taskQueue = new ThreadPool(1);
    wasmModule.queueTask = async function (asyncFn: any) {
      return wasmModule.taskQueue.submit(asyncFn);
    };
  }

  private _prefixWindowsPath(path: any) {
    if (path.indexOf("C:") == 0 && path.indexOf("file://") == -1)
      path = "file://" + path; // prepend C: paths with file://
    return path;
  }
}

export default LibraryUtils;
