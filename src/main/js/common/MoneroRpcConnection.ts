import GenUtils from "./GenUtils";
import HttpClient from "./HttpClient";
import LibraryUtils from "./LibraryUtils";
import MoneroError from "../common/MoneroError";
import MoneroRpcError from "../common/MoneroRpcError";
import MoneroUtils from "./MoneroUtils";

/**
 * Maintains a connection and sends requests to a Monero RPC API.
 */
class MoneroRpcConnection {
  _config: any;
  _fakeDisconnected: any;
  _isAuthenticated: any;
  _isOnline: any;
  _responseTime: any;
  attributes: any;

  static DEFAULT_CONFIG = {
    uri: undefined,
    username: undefined,
    password: undefined,
    rejectUnauthorized: true, // reject self-signed certificates if true
    proxyToWorker: false,
    priority: 0,
  };

  static SUPPORTED_FIELDS = [
    "uri",
    "username",
    "password",
    "rejectUnauthorized",
    "priority",
    "proxyToWorker",
  ];

  /**
   * <p>Construct a RPC connection.</p>
   *
   * <p>Examples:</p>
   *
   * <code>
   * let connection1 = new MoneroRpcConnection("http://localhost:38081", "daemon_user", "daemon_password_123")<br><br>
   *
   * let connection2 = new MoneroRpcConnection({<br>
   * &nbsp;&nbsp; uri: http://localhost:38081,<br>
   * &nbsp;&nbsp; username: "daemon_user",<br>
   * &nbsp;&nbsp; password: "daemon_password_123",<br>
   * &nbsp;&nbsp; rejectUnauthorized: false, // accept self-signed certificates e.g. for local development<br>
   * &nbsp;&nbsp; proxyToWorker: true // proxy request to worker (default false)<br>
   * });
   * </code>
   *
   * @param {string|object|MoneroRpcConnection} uriOrConfigOrConnection - RPC endpoint URI, MoneroRpcConnection, or equivalent JS object
   * @param {string} [username] - username to authenticate with the RPC endpoint (optional)
   * @param {string} [password] - password to authenticate with the RPC endpoint (optional)
   * @param {boolean} [rejectUnauthorized] - reject self-signed certificates if true (default true)
   * @param {boolean} [proxyToWorker] - use web worker (default true);
   */
  constructor(
    uriOrConfigOrConnection: string | object | MoneroRpcConnection,
    username?: string,
    password?: string,
    rejectUnauthorized?: boolean,
    proxyToWorker?: boolean
  ) {
    console.log("Creating new rpc connection");
    // validate and normalize config
    if (typeof uriOrConfigOrConnection === "string") {
      this._config = { uri: uriOrConfigOrConnection };
      this.setCredentials(username, password);
      if (rejectUnauthorized !== undefined)
        this._config.rejectUnauthorized = rejectUnauthorized;
      if (proxyToWorker !== undefined)
        this._config.proxyToWorker = proxyToWorker;
    } else if (typeof uriOrConfigOrConnection === "object") {
      if (
        username !== undefined ||
        password !== undefined ||
        rejectUnauthorized !== undefined ||
        proxyToWorker !== undefined
      )
        throw new MoneroError(
          "Can provide config object or params but not both"
        );
      if (uriOrConfigOrConnection instanceof MoneroRpcConnection)
        this._config = Object.assign({}, uriOrConfigOrConnection.config());
      else this._config = Object.assign({}, uriOrConfigOrConnection);
      this.setCredentials(this._config.username, this._config.password);
    } else if (uriOrConfigOrConnection !== undefined) {
      throw new MoneroError(
        "Invalid configuration to MoneroRpcConnection; must be string or MoneroRpcConnection or equivalent JS object"
      );
    }

    // merge default config
    this._config = Object.assign(
      {},
      MoneroRpcConnection.DEFAULT_CONFIG,
      this._config
    );
    console.log(JSON.stringify(this._config));
    // normalize uri
    if (this._config.uri) {
      this._config.uri = this._config.uri.replace(/\/$/, ""); // strip trailing slash
      if (!new RegExp("^\\w+://.+").test(this._config.uri))
        this._config.uri = "http://" + this._config.uri; // assume http if protocol not given
    }

    // fail with friendly message if using old api
    if (this._config.user || this._config.pass)
      throw new MoneroError(
        "Authentication fields 'user' and 'pass' have been renamed to 'username' and 'password'.  Please update to the new api"
      );

    // check for unsupported fields
    for (const key of Object.keys(this._config)) {
      if (!GenUtils.arrayContains(MoneroRpcConnection.SUPPORTED_FIELDS, key)) {
        throw new MoneroError(
          "RPC connection includes unsupported field: '" + key + "'"
        );
      }
    }
    console.log("Created new rpc connection");
  }

  setCredentials(username: undefined | string, password: undefined | string) {
    if (username === "") username = undefined;
    if (password === "") password = undefined;
    if (username || password) {
      if (!username)
        throw new MoneroError(
          "username must be defined because password is defined"
        );
      if (!password)
        throw new MoneroError(
          "password must be defined because username is defined"
        );
    }
    if (this._config.username === "") this._config.username = undefined;
    if (this._config.password === "") this._config.password = undefined;
    if (
      this._config.username !== username ||
      this._config.password !== password
    ) {
      this._isOnline = undefined;
      this._isAuthenticated = undefined;
    }
    this._config.username = username;
    this._config.password = password;
    return this;
  }

  public get uri() {
    return this._config.uri;
  }

  public get username() {
    return this._config.username ? this._config.username : "";
  }

  public get password() {
    return this._config.password ? this._config.password : "";
  }

  public get rejectUnauthorized() {
    return this._config.rejectUnauthorized;
  }

  public set proxyToWorker(proxyToWorker: boolean) {
    this._config.proxyToWorker = proxyToWorker;
  }

  public get proxyToWorker() {
    return this._config.proxyToWorker;
  }

  public get config() {
    return this._config;
  }

  public get priority() {
    return this._config.priority;
  }

  /**
   * Set the connection's priority relative to other connections. Priority 1 is highest,
   * then priority 2, etc. The default priority of 0 is lowest priority.
   *
   * @param {number} [priority] - the connection priority (default 0)
   */
  public set priority(priority: number) {
    if (!(priority >= 0)) throw new MoneroError("Priority must be >= 0");
    this._config.priority = priority;
  }

  setAttribute(key: string, value: object) {
    if (!this.attributes) this.attributes = new Map();
    this.attributes.put(key, value);
    return this;
  }

  getAttribute(key: object) {
    return this.attributes.get(key);
  }

  /**
   * Check the connection status to update isOnline, isAuthenticated, and response time.
   *
   * @param {number} timeoutInMs - maximum response time before considered offline
   * @return {Promise<boolean>} true if there is a change in status, false otherwise
   */
  async checkConnection(timeoutInMs: number): Promise<boolean> {
    const isOnlineBefore = this._isOnline;
    const isAuthenticatedBefore = this._isAuthenticated;
    const startTime = Date.now();

    try {
      if (this._fakeDisconnected)
        throw new Error("Connection is fake disconnected");
      await this.sendJsonRequest("get_version", undefined, timeoutInMs);
      this._isOnline = true;
      this._isAuthenticated = true;
    } catch (err) {
      if (err instanceof MoneroRpcError && err.getCode() === 401) {
        this._isOnline = true;
        this._isAuthenticated = false;
      } else {
        this._isOnline = false;
        this._isAuthenticated = undefined;
        this._responseTime = undefined;
      }
    }
    if (this._isOnline) this._responseTime = Date.now() - startTime;
    return (
      isOnlineBefore !== this._isOnline ||
      isAuthenticatedBefore !== this._isAuthenticated
    );
  }

  /**
   * Indicates if the connection is connected according to the last call to checkConnection().<br><br>
   *
   * Note: must call checkConnection() manually unless using MoneroConnectionManager.
   */
  public get isConnected() {
    return this._isOnline === undefined
      ? undefined
      : this._isOnline && this._isAuthenticated !== false;
  }

  /**
   * Indicates if the connection is online according to the last call to checkConnection().<br><br>
   *
   * Note: must call checkConnection() manually unless using MoneroConnectionManager.
   */
  public get isOnline() {
    return this._isOnline;
  }

  /**
   * Indicates if the connection is authenticated according to the last call to checkConnection().<br><br>
   *
   * Note: must call checkConnection() manually unless using MoneroConnectionManager.
   */
  public get isAuthenticated() {
    return this._isAuthenticated;
  }

  public get getResponseTime() {
    return this._responseTime;
  }

  /**
   * Send a JSON RPC request.
   *
   * @param {string} method - JSON RPC method to invoke
   * @param {object} params - request parameters
   * @param {number} timeoutInMs - request timeout in milliseconds
   * @return {object} is the response map
   */
  async sendJsonRequest(
    method: string,
    params: undefined | object,
    timeoutInMs: number
  ): Promise<object> {
    try {
      // build request body
      const body = JSON.stringify({
        // body is stringified so text/plain is returned so BigInts are preserved
        id: "0",
        jsonrpc: "2.0",
        method: method,
        params: params,
      });

      // logging
      if (LibraryUtils.instance.LOG_LEVEL >= 2)
        LibraryUtils.instance.log(
          2,
          "Sending json request with method '" + method + "' and body: " + body
        );

      // send http request
      const startTime = new Date().getTime();
      let resp: any = await HttpClient.instance.request({
        method: "POST",
        uri: this.uri() + "/json_rpc",
        username: this.username(),
        password: this.password(),
        body: body,
        timeout: timeoutInMs,
        rejectUnauthorized: this._config.rejectUnauthorized,
        requestApi: GenUtils.isFirefox() ? "xhr" : "fetch", // firefox issue: https://bugzilla.mozilla.org/show_bug.cgi?id=1491010
        proxyToWorker: this._config.proxyToWorker,
      });

      // validate response
      MoneroRpcConnection._validateHttpResponse(resp);

      // deserialize response
      if (resp.body[0] != "{") throw resp.body;
      resp = JSON.parse(
        resp.body.replace(/("[^"]*"\s*:\s*)(\d{16,})/g, '$1"$2"')
      ); // replace 16 or more digits with strings and parse
      if (LibraryUtils.instance.LOG_LEVEL >= 3) {
        const respStr = JSON.stringify(resp);
        LibraryUtils.instance.log(
          3,
          "Received response from method='" +
            method +
            "', response=" +
            respStr.substring(0, Math.min(1000, respStr.length)) +
            "(" +
            (new Date().getTime() - startTime) +
            " ms)"
        );
      }

      // check rpc response for errors
      MoneroRpcConnection._validateRpcResponse(resp, method, params);
      return resp;
    } catch (err: any) {
      if (err instanceof MoneroRpcError) throw err;
      else throw new MoneroRpcError(err, err.statusCode, method, params);
    }
  }

  /**
   * Send a RPC request to the given path and with the given paramters.
   *
   * E.g. "/get_transactions" with params
   *
   * @param {string} path - JSON RPC path to invoke
   * @param {object} params - request parameters
   * @param {number} timeoutInMs - request timeout in milliseconds
   * @return {object} is the response map
   */
  async sendPathRequest(
    path: string,
    params: object,
    timeoutInMs: number
  ): Promise<object> {
    try {
      // logging
      if (LibraryUtils.instance.LOG_LEVEL >= 2)
        LibraryUtils.instance.log(
          2,
          "Sending path request with path '" +
            path +
            "' and params: " +
            JSON.stringify(params)
        );

      // send http request
      const startTime = new Date().getTime();
      let resp: any = await HttpClient.instance.request({
        method: "POST",
        uri: this.uri() + "/" + path,
        username: this.username(),
        password: this.password(),
        body: JSON.stringify(params), // body is stringified so text/plain is returned so BigInts are preserved
        timeout: timeoutInMs,
        rejectUnauthorized: this._config.rejectUnauthorized,
        requestApi: GenUtils.isFirefox() ? "xhr" : "fetch",
        proxyToWorker: this._config.proxyToWorker,
      });

      // validate response
      MoneroRpcConnection._validateHttpResponse(resp);

      // deserialize response
      if (resp.body[0] != "{") throw resp.body;
      resp = JSON.parse(
        resp.body.replace(/("[^"]*"\s*:\s*)(\d{16,})/g, '$1"$2"')
      ); // replace 16 or more digits with strings and parse
      if (typeof resp === "string") resp = JSON.parse(resp); // TODO: some responses returned as strings?
      if (LibraryUtils.instance.LOG_LEVEL >= 3) {
        const respStr = JSON.stringify(resp);
        LibraryUtils.instance.log(
          3,
          "Received response from path='" +
            "POST" +
            "', response=" +
            respStr.substring(0, Math.min(1000, respStr.length)) +
            "(" +
            (new Date().getTime() - startTime) +
            " ms)"
        );
      }

      // check rpc response for errors
      MoneroRpcConnection._validateRpcResponse(resp, path, params);
      return resp;
    } catch (err) {
      if (err instanceof MoneroRpcError) throw err;
      else throw new MoneroRpcError(err, err.statusCode, path, params);
    }
  }

  /**
   * Send a binary RPC request.
   *
   * @param {string} path - path of the binary RPC method to invoke
   * @param {object} params - request parameters
   * @param {number} timeoutInMs - request timeout in milliseconds
   * @return {Uint8Array} the binary response
   */
  async sendBinaryRequest(path: string, params: object, timeoutInMs: number) {
    // serialize params
    const paramsBin = await MoneroUtils.jsonToBinary(params);

    try {
      // logging
      if (LibraryUtils.instance.LOG_LEVEL >= 2)
        LibraryUtils.instance.log(
          2,
          "Sending binary request with path '" +
            path +
            "' and params: " +
            JSON.stringify(params)
        );

      // send http request
      let resp: any = await HttpClient.instance.request({
        method: "POST",
        uri: this.uri() + "/" + path,
        username: this.username(),
        password: this.password(),
        body: paramsBin,
        timeout: timeoutInMs,
        rejectUnauthorized: this._config.rejectUnauthorized,
        requestApi: GenUtils.isFirefox() ? "xhr" : "fetch",
        proxyToWorker: this._config.proxyToWorker,
      });

      // validate response
      MoneroRpcConnection._validateHttpResponse(resp);

      // process response
      resp = resp.body;
      if (!(resp instanceof Uint8Array)) {
        console.error("resp is not uint8array");
        console.error(resp);
      }
      if (resp.error)
        throw new MoneroRpcError(
          resp.error.message,
          resp.error.code,
          path,
          params
        );
      return resp;
    } catch (err: any) {
      if (err instanceof MoneroRpcError) throw err;
      else throw new MoneroRpcError(err, err.statusCode, path, params);
    }
  }

  toString() {
    return (
      this.uri() +
      " (username=" +
      this.username() +
      ", password=" +
      (this.password() ? "***" : this.password()) +
      ", priority=" +
      this.priority +
      ", isOnline=" +
      this.isOnline() +
      ", isAuthenticated=" +
      this.isAuthenticated() +
      ")"
    );
  }

  // ------------------------------ PRIVATE HELPERS --------------------------

  static _validateHttpResponse(resp: any) {
    const code = resp.statusCode;
    if (code < 200 || code > 299) {
      const content = resp.body;
      throw new MoneroRpcError(
        code + " " + resp.statusText + (!content ? "" : ": " + content),
        code,
        undefined,
        undefined
      );
    }
  }

  static _validateRpcResponse(resp: any, method: any, params: any) {
    if (!resp.error) return;
    throw new MoneroRpcError(
      resp.error.message,
      resp.error.code,
      method,
      params
    );
  }

  _setFakeDisconnected(fakeDisconnected: any) {
    // used to test connection manager
    this._fakeDisconnected = fakeDisconnected;
  }
}

export default MoneroRpcConnection;
