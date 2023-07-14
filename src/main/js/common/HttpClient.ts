import GenUtils from "../common/GenUtils";
import LibraryUtils from "./LibraryUtils";
import MoneroUtils from "./MoneroUtils";
import ThreadPool from "./ThreadPool";
import PromiseThrottle from "promise-throttle";
import CryptoJS from "crypto-js";
import http from "http";
import https from "https";

export interface RequestOpts {
  method: string;
  uri: string;
  body: string | object | Uint8Array;
  username?: string;
  password?: string;
  headers?: object;
  requestApi?: string;
  resolveWithFullResponse?: boolean;
  rejectUnauthorized?: boolean;
  timeout?: number;
  proxyToWorker?: number;
}

/**
 * Handle HTTP requests with a uniform interface.
 *
 * @hideconstructor
 */
class HttpClient {
  // default request config
  private static _DEFAULT_REQUEST = {
    method: "GET",
    requestApi: "fetch",
    resolveWithFullResponse: false,
    rejectUnauthorized: true,
  };
  private static _PROMISE_THROTTLES: { [key: string]: any } = {};
  private static _TASK_QUEUES: { [key: string]: any } = {};
  private static _DEFAULT_TIMEOUT = 60000;
  private static _MAX_TIMEOUT = 2147483647; // max 32-bit signed number
  static _HTTP_AGENT: http.Agent;
  static _HTTPS_AGENT: https.Agent;

  /**
   * <p>Make a HTTP request.<p>
   *
   * @param {object} request - configures the request to make
   * @param {string} request.method - HTTP method ("GET", "PUT", "POST", "DELETE", etc)
   * @param {string} request.uri - uri to request
   * @param {string|object|Uint8Array} request.body - request body
   * @param {string} [request.username] - username to authenticate the request (optional)
   * @param {string} [request.password] - password to authenticate the request (optional)
   * @param {object} [request.headers] - headers to add to the request (optional)
   * @param {string} [request.requestApi] - one of "fetch" or "xhr" (default "fetch")
   * @param {boolean} [request.resolveWithFullResponse] - return full response if true, else body only (default false)
   * @param {boolean} [request.rejectUnauthorized] - whether or not to reject this-signed certificates (default true)
   * @param {number} request.timeout - maximum time allowed in milliseconds
   * @param {number} request.proxyToWorker - proxy request to worker thread
   * @returns {object} response - the response object
   * @returns {string|object|Uint8Array} response.body - the response body
   * @returns {number} response.statusCode - the response code
   * @returns {String} response.statusText - the response message
   * @returns {object} response.headers - the response headers
   */
  static async request(request: RequestOpts): Promise<{
    body: string | object | Uint8Array;
    statusCode: number;
    statusText: string;
    headers: object;
  }> {
    // proxy to worker if configured
    if (request.proxyToWorker) {
      try {
        return await LibraryUtils.instance.invokeWorker(
          GenUtils.getUUID(),
          "httpRequest",
          request
        );
      } catch (err: any) {
        if (err.message.length > 0 && err.message.charAt(0) === "{") {
          const parsed = JSON.parse(err.message);
          err.message = parsed.statusMessage;
          err.statusCode = parsed.statusCode;
        }
        throw err;
      }
    }

    // assign defaults
    const defaultRequest = Object.assign(
      { host: "" },
      HttpClient._DEFAULT_REQUEST,
      request
    );

    // validate request
    try {
      defaultRequest.host = new URL(defaultRequest.uri).host;
    } catch (err) {
      // hostname:port
      throw new Error("Invalid request URL: " + defaultRequest.uri);
    }
    if (
      defaultRequest.body &&
      !(
        typeof defaultRequest.body === "string" ||
        typeof defaultRequest.body === "object"
      )
    ) {
      throw new Error("Request body type is not string or object");
    }

    // initialize one task queue per host
    if (!HttpClient._TASK_QUEUES[defaultRequest.host])
      HttpClient._TASK_QUEUES[defaultRequest.host] = new ThreadPool(1);

    // initialize one promise throttle per host
    if (!HttpClient._PROMISE_THROTTLES[defaultRequest.host]) {
      HttpClient._PROMISE_THROTTLES[defaultRequest.host] = new PromiseThrottle({
        requestsPerSecond: MoneroUtils.MAX_REQUESTS_PER_SECOND, // TODO: HttpClient should not depend on MoneroUtils for configuration
        promiseImplementation: Promise,
      });
    }

    // request using fetch or xhr with timeout
    const timeout =
      defaultRequest.timeout === undefined
        ? HttpClient._DEFAULT_TIMEOUT
        : defaultRequest.timeout === 0
        ? HttpClient._MAX_TIMEOUT
        : defaultRequest.timeout;
    const requestPromise =
      defaultRequest.requestApi === "fetch"
        ? HttpClient._requestFetch(defaultRequest)
        : HttpClient._requestXhr(defaultRequest);
    const timeoutPromise = new Promise((resolve, reject) => {
      const id = setTimeout(() => {
        clearTimeout(id);
        reject("Request timed out in " + timeout + " milliseconds");
      }, timeout);
    });

    return Promise.race([requestPromise, timeoutPromise]) as Promise<{
      body: string | object | Uint8Array;
      statusCode: number;
      statusText: string;
      headers: object;
    }>;
  }

  // ----------------------------- PRIVATE HELPERS ----------------------------

  static async _requestFetch(req: any) {
    // build request options
    const opts: any = {
      method: req.method,
      uri: req.uri,
      body: req.body,
      agent: req.uri.startsWith("https")
        ? HttpClient._getHttpsAgent()
        : HttpClient._getHttpAgent(),
      rejectUnauthorized: req.rejectUnauthorized,
      resolveWithFullResponse: req.resolveWithFullResponse,
      requestCert: true, // TODO: part of config?
    };
    if (req.username) {
      opts.forever = true;
      opts.auth = {
        user: req.username,
        pass: req.password,
        sendImmediately: false,
      };
    }
    if (req.body instanceof Uint8Array) opts.encoding = null;

    const host = req.host;
    const resp = await HttpClient._TASK_QUEUES[host].submit(async function (
      this: any
    ) {
      return HttpClient._PROMISE_THROTTLES[host].add(
        function (opts: any) {
          return new Request(opts);
        }.bind(this, opts)
      );
    });

    // normalize response
    const normalizedResponse: any = {};
    if (req.resolveWithFullResponse) {
      normalizedResponse.statusCode = resp.statusCode;
      normalizedResponse.statusText = resp.statusMessage;
      normalizedResponse.headers = resp.headers;
      normalizedResponse.body = resp.body;
      normalizedResponse.body = resp;
    }
    return normalizedResponse;
  }

  static async _requestXhr(req: any) {
    if (req.headers)
      throw new Error("Custom headers not implemented in XHR request"); // TODO

    // collect params from request which change on await
    const method = req.method;
    const uri = req.uri;
    const host = req.host;
    const username = req.username;
    const password = req.password;
    const body = req.body;
    const isBinary = body instanceof Uint8Array;

    // queue and throttle requests to execute in serial and rate limited per host
    const resp = await HttpClient._TASK_QUEUES[host].submit(async function (
      this: any
    ) {
      return HttpClient._PROMISE_THROTTLES[host].add(
        function () {
          return new Promise(function (resolve, reject) {
            const digestAuthRequest = HttpClient.digestAuthRequest(
              method,
              uri,
              username,
              password
            );
            digestAuthRequest.request(
              function (resp: any) {
                resolve(resp);
              },
              function (resp: any) {
                if (resp.status) resolve(resp);
                else
                  reject(
                    new Error(
                      "Request failed without response: " + method + " " + uri
                    )
                  );
              },
              body
            );
          });
        }.bind(this)
      );
    });

    // normalize response
    const normalizedResponse: any = {};
    normalizedResponse.statusCode = resp.status;
    normalizedResponse.statusText = resp.statusText;
    normalizedResponse.headers = HttpClient._parseXhrResponseHeaders(
      resp.getAllResponseHeaders()
    );
    normalizedResponse.body = isBinary
      ? new Uint8Array(resp.response)
      : resp.response;
    if (normalizedResponse.body instanceof ArrayBuffer)
      normalizedResponse.body = new Uint8Array(normalizedResponse.body); // handle empty binary request
    return normalizedResponse;
  }

  /**
   * Get a singleton instance of an HTTP client to share.
   *
   * @return {http.Agent} a shared agent for network requests among library instances
   */
  static _getHttpAgent(): http.Agent {
    if (!HttpClient._HTTP_AGENT) {
      HttpClient._HTTP_AGENT = new http.Agent({ keepAlive: true });
    }
    return HttpClient._HTTP_AGENT;
  }

  /**
   * Get a singleton instance of an HTTPS client to share.
   *
   * @return {https.Agent} a shared agent for network requests among library instances
   */
  static _getHttpsAgent(): https.Agent {
    if (!HttpClient._HTTPS_AGENT) {
      HttpClient._HTTPS_AGENT = new https.Agent({ keepAlive: true });
    }
    return HttpClient._HTTPS_AGENT;
  }

  static _parseXhrResponseHeaders(headersStr: string) {
    const headerMap: any = {};
    const headers = headersStr.trim().split(/[\r\n]+/);
    for (const header of headers) {
      const headerVals = header.split(": ");
      headerMap[headerVals[0]] = headerVals[1];
    }
    return headerMap;
  }

  static digestAuthRequest(
    method: string,
    url: string,
    username: string,
    password: string
  ) {
    return new DigestAuthRequest(method, url, username, password);
  }
}

/**
 * Modification of digest auth request by @inorganik.
 *
 * Dependent on CryptoJS MD5 hashing: http://crypto-js.googlecode.com/svn/tags/3.1.2/build/rollups/md5.js
 *
 * MIT licensed.
 */
class DigestAuthRequest {
  method: string;
  url: string;
  username: string;
  password: string;

  scheme = null; // we just echo the scheme, to allow for 'Digest', 'X-Digest', 'JDigest' etc
  nonce = null; // server issued nonce
  realm = null; // server issued realm
  qop = null; // "quality of protection" - '' or 'auth' or 'auth-int'
  response: any = null; // hashed response to server challenge
  opaque = null; // hashed response to server challenge
  nc = 1; // nonce count - increments with each request used with the same nonce
  cnonce: any = null; // client nonce

  // settings
  timeout = 60000; // timeout
  loggingOn = false; // toggle console logging

  // determine if a post, so that request will send data
  post = false;

  data: any;
  successFn: any;
  errorFn: any;

  firstRequest: any;
  authenticatedRequest: any;

  constructor(method: string, url: string, username: string, password: string) {
    if (method.toLowerCase() === "post" || method.toLowerCase() === "put") {
      this.post = true;
    }

    this.method = method;
    this.url = url;
    this.username = username;
    this.password = password;
  }

  // start here
  // successFn - will be passed JSON data
  // errorFn - will be passed the failed authenticatedRequest
  // data - optional, for POSTS
  request(successFn: any, errorFn: any, data: any) {
    // stringify json
    if (data) {
      try {
        this.data =
          data instanceof Uint8Array || typeof data === "string"
            ? data
            : JSON.stringify(data);
      } catch (err) {
        console.error(err);
        throw err;
      }
    }
    this.successFn = successFn;
    this.errorFn = errorFn;

    if (!this.nonce) {
      this.makeUnauthenticatedRequest(this.data);
    } else {
      this.makeAuthenticatedRequest();
    }
  }

  makeUnauthenticatedRequest(data: any) {
    this.firstRequest = new XMLHttpRequest();
    this.firstRequest.open(this.method, this.url, true);
    this.firstRequest.timeout = this.timeout;
    // if we are posting, add appropriate headers
    if (this.post && data) {
      if (typeof data === "string") {
        this.firstRequest.setRequestHeader("Content-type", "text/plain");
      } else {
        this.firstRequest.responseType = "arraybuffer";
      }
    }

    const that = this;

    this.firstRequest.onreadystatechange = function () {
      // 2: received headers,  3: loading, 4: done
      if (that.firstRequest.readyState === 2) {
        const responseHeaders = that.firstRequest
          .getAllResponseHeaders()
          .split("\n");
        // get authenticate header
        let digestHeaders;
        for (let i = 0; i < responseHeaders.length; i++) {
          if (responseHeaders[i].match(/www-authenticate/i) != null) {
            digestHeaders = responseHeaders[i];
          }
        }

        if (digestHeaders != null) {
          // parse auth header and get digest auth keys
          digestHeaders = digestHeaders.slice(
            digestHeaders.indexOf(":") + 1,
            -1
          );
          digestHeaders = digestHeaders.split(",");
          that.scheme = digestHeaders[0].split(/\s/)[1];
          for (let i = 0; i < digestHeaders.length; i++) {
            const equalIndex = digestHeaders[i].indexOf("="),
              key = digestHeaders[i].substring(0, equalIndex);
            let val = digestHeaders[i].substring(equalIndex + 1);
            val = val.replace(/['"]+/g, "");
            // find realm
            if (key.match(/realm/i) != null) {
              that.realm = val;
            }
            // find nonce
            if (key.match(/nonce/i) != null) {
              that.nonce = val;
            }
            // find opaque
            if (key.match(/opaque/i) != null) {
              that.opaque = val;
            }
            // find QOP
            if (key.match(/qop/i) != null) {
              that.qop = val;
            }
          }
          // client generated keys
          that.cnonce = that.generateCnonce();
          that.nc++;
          // if logging, show headers received:
          that.log("received headers:");
          that.log("  realm: " + that.realm);
          that.log("  nonce: " + that.nonce);
          that.log("  opaque: " + that.opaque);
          that.log("  qop: " + that.qop);
          // now we can make an authenticated request
          that.makeAuthenticatedRequest();
        }
      }
      if (that.firstRequest.readyState === 4) {
        if (that.firstRequest.status === 200) {
          that.log("Authentication not required for " + that.url);
          if (data instanceof Uint8Array) {
            that.successFn(that.firstRequest);
          } else {
            if (that.firstRequest.responseText !== "undefined") {
              if (that.firstRequest.responseText.length > 0) {
                // If JSON, parse and return object
                if (that.isJson(that.firstRequest.responseText)) {
                  // TODO: redundant
                  that.successFn(that.firstRequest);
                } else {
                  that.successFn(that.firstRequest);
                }
              }
            } else {
              that.successFn();
            }
          }
        }
      }
    };
    // send
    if (this.post) {
      // in case digest auth not required
      this.firstRequest.send(this.data);
    } else {
      this.firstRequest.send();
    }
    this.log("Unauthenticated request to " + this.url);

    // handle error
    this.firstRequest.onerror = function () {
      if (that.firstRequest.status !== 401) {
        that.log(
          "Error (" +
            that.firstRequest.status +
            ") on unauthenticated request to " +
            that.url
        );
        that.errorFn(that.firstRequest);
      }
    };
  }

  makeAuthenticatedRequest() {
    this.response = this.formulateResponse();
    this.authenticatedRequest = new XMLHttpRequest();
    this.authenticatedRequest.open(this.method, this.url, true);
    this.authenticatedRequest.timeout = this.timeout;
    const digestAuthHeader =
      this.scheme +
      " " +
      'username="' +
      this.username +
      '", ' +
      'realm="' +
      this.realm +
      '", ' +
      'nonce="' +
      this.nonce +
      '", ' +
      'uri="' +
      this.url +
      '", ' +
      'response="' +
      this.response +
      '", ' +
      'opaque="' +
      this.opaque +
      '", ' +
      "qop=" +
      this.qop +
      ", " +
      "nc=" +
      ("00000000" + this.nc).slice(-8) +
      ", " +
      'cnonce="' +
      this.cnonce +
      '"';
    this.authenticatedRequest.setRequestHeader(
      "Authorization",
      digestAuthHeader
    );
    this.log("digest auth header response to be sent:");
    this.log(digestAuthHeader);
    // if we are posting, add appropriate headers
    if (this.post && this.data) {
      if (typeof this.data === "string") {
        this.authenticatedRequest.setRequestHeader(
          "Content-type",
          "text/plain"
        );
      } else {
        this.authenticatedRequest.responseType = "arraybuffer";
      }
    }

    const that = this;

    this.authenticatedRequest.onload = function () {
      // success
      if (
        that.authenticatedRequest.status >= 200 &&
        that.authenticatedRequest.status < 400
      ) {
        // increment nonce count
        that.nc++;
        // return data
        if (that.data instanceof Uint8Array) {
          that.successFn(that.authenticatedRequest);
        } else {
          if (
            that.authenticatedRequest.responseText !== "undefined" &&
            that.authenticatedRequest.responseText.length > 0
          ) {
            // If JSON, parse and return object
            if (that.isJson(that.authenticatedRequest.responseText)) {
              // TODO: redundant from not parsing
              that.successFn(that.authenticatedRequest);
            } else {
              that.successFn(that.authenticatedRequest);
            }
          } else {
            that.successFn();
          }
        }
      }
      // failure
      else {
        that.nonce = null;
        that.errorFn(that.authenticatedRequest);
      }
    };
    // handle errors
    this.authenticatedRequest.onerror = function () {
      that.log(
        "Error (" +
          that.authenticatedRequest.status +
          ") on authenticated request to " +
          that.url
      );
      that.nonce = null;
      that.errorFn(that.authenticatedRequest);
    };
    // send
    if (this.post) {
      this.authenticatedRequest.send(this.data);
    } else {
      this.authenticatedRequest.send();
    }
    this.log("Authenticated request to " + this.url);
  }

  // hash response based on server challenge
  formulateResponse() {
    const HA1 = CryptoJS.MD5(
      this.username + ":" + this.realm + ":" + this.password
    ).toString();
    const HA2 = CryptoJS.MD5(this.method + ":" + this.url).toString();
    const response = CryptoJS.MD5(
      HA1 +
        ":" +
        this.nonce +
        ":" +
        ("00000000" + this.nc).slice(-8) +
        ":" +
        this.cnonce +
        ":" +
        this.qop +
        ":" +
        HA2
    ).toString();
    return response;
  }

  // generate 16 char client nonce
  generateCnonce() {
    const characters = "abcdef0123456789";
    let token = "";
    for (let i = 0; i < 16; i++) {
      const randNum = Math.round(Math.random() * characters.length);
      token += characters.substr(randNum, 1);
    }
    return token;
  }

  abort() {
    this.log("[digestAuthRequest] Aborted request to " + this.url);
    if (this.firstRequest != null) {
      if (this.firstRequest.readyState != 4) this.firstRequest.abort();
    }
    if (this.authenticatedRequest != null) {
      if (this.authenticatedRequest.readyState != 4)
        this.authenticatedRequest.abort();
    }
  }

  isJson(str: any) {
    try {
      JSON.parse(str);
    } catch (err) {
      return false;
    }
    return true;
  }

  log(str: any) {
    if (this.loggingOn) {
      console.log("[digestAuthRequest] " + str);
    }
  }
}

export default HttpClient;
