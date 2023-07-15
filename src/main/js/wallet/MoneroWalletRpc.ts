import assert from "assert";
import GenUtils from "../common/GenUtils";
import LibraryUtils from "../common/LibraryUtils";
import TaskLooper from "../common/TaskLooper";
import MoneroAccount from "./model/MoneroAccount";
import MoneroAccountTag from "./model/MoneroAccountTag";
import MoneroAddressBookEntry from "./model/MoneroAddressBookEntry";
import MoneroBlock from "../daemon/model/MoneroBlock";
import MoneroBlockHeader from "../daemon/model/MoneroBlockHeader";
import MoneroCheckReserve from "./model/MoneroCheckReserve";
import MoneroCheckTx from "./model/MoneroCheckTx";
import MoneroDestination from "./model/MoneroDestination";
import MoneroError from "../common/MoneroError";
import MoneroIncomingTransfer from "./model/MoneroIncomingTransfer";
import MoneroIntegratedAddress from "./model/MoneroIntegratedAddress";
import MoneroKeyImage from "../daemon/model/MoneroKeyImage";
import MoneroKeyImageImportResult from "./model/MoneroKeyImageImportResult";
import MoneroMultisigInfo from "./model/MoneroMultisigInfo";
import MoneroMultisigInitResult from "./model/MoneroMultisigInitResult";
import MoneroMultisigSignResult from "./model/MoneroMultisigSignResult";
import MoneroOutgoingTransfer from "./model/MoneroOutgoingTransfer";
import MoneroOutputQuery from "./model/MoneroOutputQuery";
import MoneroOutputWallet from "./model/MoneroOutputWallet";
import MoneroRpcConnection from "../common/MoneroRpcConnection";
import MoneroRpcError from "../common/MoneroRpcError";
import MoneroSubaddress from "./model/MoneroSubaddress";
import MoneroSyncResult from "./model/MoneroSyncResult";
import MoneroTransferQuery from "./model/MoneroTransferQuery";
import MoneroTxConfig from "./model/MoneroTxConfig";
import MoneroTxQuery from "./model/MoneroTxQuery";
import MoneroTxSet from "./model/MoneroTxSet";
import MoneroTxWallet from "./model/MoneroTxWallet";
import MoneroUtils from "../common/MoneroUtils";
import MoneroVersion from "../daemon/model/MoneroVersion";
import MoneroWallet from "./MoneroWallet";
import MoneroWalletConfig, {
  MoneroWalletConfigOpts,
} from "./model/MoneroWalletConfig";
import MoneroWalletListener from "./model/MoneroWalletListener";
import MoneroMessageSignatureType from "./model/MoneroMessageSignatureType";
import MoneroMessageSignatureResult from "./model/MoneroMessageSignatureResult";
import ThreadPool from "../common/ThreadPool";
import SslOptions from "../common/SslOptions";

/**
 * Copyright (c) woodser
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Implements a MoneroWallet as a client of monero-wallet-rpc.
 *
 * @implements {MoneroWallet}
 * @hideconstructor
 */
class MoneroWalletRpc extends MoneroWallet {
  addressCache: any;
  config: any;
  daemonConnection: any;
  listeners: any;
  path: any;
  process: any;
  rpc: any;
  syncPeriodInMs: any;
  walletPoller: any;

  /**
   * <p>Construct a wallet RPC client (for internal use).</p>
   *
   * @param {string|object|MoneroRpcConnection|string[]} [uriOrConfig] - uri of monero-wallet-rpc or JS config object or MoneroRpcConnection or command line parameters to run a monero-wallet-rpc process internally
   * @param {string} [uriOrConfig.uri] - uri of monero-wallet-rpc
   * @param {string} [uriOrConfig.username] - username to authenticate with monero-wallet-rpc (optional)
   * @param {string} [uriOrConfig.password] - password to authenticate with monero-wallet-rpc (optional)
   * @param {boolean} [uriOrConfig.rejectUnauthorized] - rejects self-signed certificates if true (default true)
   * @param {string} [username] - username to authenticate with monero-wallet-rpc (optional)
   * @param {string} [password] - password to authenticate with monero-wallet-rpc (optional)
   * @param {boolean} [rejectUnauthorized] - rejects self-signed certificates if true (default true)
   */
  constructor(
    uriOrConfig: any,
    username: any,
    password: any,
    rejectUnauthorized: any
  ) {
    super();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (GenUtils.isArray(uriOrConfig))
      throw new MoneroError(
        "Array with command parameters is invalid first parameter, use `await connectToWalletRpc(...)`"
      );
    this.config = MoneroWalletRpc._normalizeConfig(
      uriOrConfig,
      username,
      password,
      rejectUnauthorized
    );
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
    this.rpc = new MoneroRpcConnection(this.config);
    this.addressCache = {}; // avoid unecessary requests for addresses
    // @ts-expect-error TS(2339): Property 'DEFAULT_SYNC_PERIOD_IN_MS' does not exis... Remove this comment to see the full error message
    this.syncPeriodInMs = MoneroWalletRpc.DEFAULT_SYNC_PERIOD_IN_MS;
    this.listeners = [];
  }

  /**
   * <p>Create a client connected to monero-wallet-rpc (for internal use).</p>
   *
   * @param {string|string[]|object|MoneroRpcConnection} uriOrConfig - uri of monero-wallet-rpc or terminal parameters or JS config object or MoneroRpcConnection
   * @param {string} uriOrConfig.uri - uri of monero-wallet-rpc
   * @param {string} [uriOrConfig.username] - username to authenticate with monero-wallet-rpc (optional)
   * @param {string} [uriOrConfig.password] - password to authenticate with monero-wallet-rpc (optional)
   * @param {boolean} [uriOrConfig.rejectUnauthorized] - rejects self-signed certificates if true (default true)
   * @param {string} [username] - username to authenticate with monero-wallet-rpc (optional)
   * @param {string} [password] - password to authenticate with monero-wallet-rpc (optional)
   * @param {boolean} [rejectUnauthorized] - rejects self-signed certificates if true (default true)
   * @return {MoneroWalletRpc} the wallet RPC client
   */
  static async _connectToWalletRpc(
    uriOrConfig: any,
    username: any,
    password: any,
    rejectUnauthorized: any
  ) {
    if (GenUtils.isArray(uriOrConfig))
      return MoneroWalletRpc._startWalletRpcProcess(uriOrConfig);
    // handle array as terminal command
    // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
    else return new MoneroWalletRpc(...arguments); // otherwise connect to server
  }

  static async _startWalletRpcProcess(cmd: any) {
    assert(
      GenUtils.isArray(cmd),
      "Must provide string array with command line parameters"
    );

    // start process
    // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
    this.process = require("child_process").spawn(cmd[0], cmd.slice(1), {});
    // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
    this.process.stdout.setEncoding("utf8");
    // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
    this.process.stderr.setEncoding("utf8");

    // return promise which resolves after starting monero-wallet-rpc
    let uri: any;
    let that = this;
    let output = "";
    return new Promise(function (resolve, reject) {
      // handle stdout
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.stdout.on("data", function (this: any, data: any) {
        let line = data.toString();
        LibraryUtils.instance.log(2, line);
        output += line + "\n"; // capture output in case of error

        // extract uri from e.g. "I Binding on 127.0.0.1 (IPv4):38085"
        let uriLineContains = "Binding on ";
        let uriLineContainsIdx = line.indexOf(uriLineContains);
        if (uriLineContainsIdx >= 0) {
          let host = line.substring(
            uriLineContainsIdx + uriLineContains.length,
            line.lastIndexOf(" ")
          );
          let unformattedLine = line.replace(/\u001b\[.*?m/g, "").trim(); // remove color formatting
          let port = unformattedLine.substring(
            unformattedLine.lastIndexOf(":") + 1
          );
          let sslIdx = cmd.indexOf("--rpc-ssl");
          let sslEnabled =
            sslIdx >= 0 ? "enabled" == cmd[sslIdx + 1].toLowerCase() : false;
          uri = (sslEnabled ? "https" : "http") + "://" + host + ":" + port;
        }

        // read success message
        if (line.indexOf("Starting wallet RPC server") >= 0) {
          // get username and password from params
          let userPassIdx = cmd.indexOf("--rpc-login");
          let userPass = userPassIdx >= 0 ? cmd[userPassIdx + 1] : undefined;
          let username =
            userPass === undefined
              ? undefined
              : userPass.substring(0, userPass.indexOf(":"));
          let password =
            userPass === undefined
              ? undefined
              : userPass.substring(userPass.indexOf(":") + 1);

          // create client connected to internal process
          // @ts-expect-error TS(2554): Expected 4 arguments, but got 3.
          let wallet = new MoneroWalletRpc(uri, username, password);
          // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
          wallet.process = that.process;

          // resolve promise with client connected to internal process
          this.isResolved = true;
          resolve(wallet);
        }
      });

      // handle stderr
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.stderr.on("data", function (data: any) {
        if (LibraryUtils.instance.LOG_LEVEL >= 2) console.error(data);
      });

      // handle exit
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.on("exit", function (this: any, code: any) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        if (!this.isResolved)
          reject(
            new MoneroError(
              "monero-wallet-rpc process terminated with exit code " +
                code +
                (output ? ":\n\n" + output : "")
            )
          );
      });

      // handle error
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.on("error", function (this: any, err: any) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        if (err.message.indexOf("ENOENT") >= 0)
          reject(
            new MoneroError(
              "monero-wallet-rpc does not exist at path '" + cmd[0] + "'"
            )
          );
        if (!this.isResolved) reject(err);
      });

      // handle uncaught exception
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.on("uncaughtException", function (err: any, origin: any) {
        console.error(
          "Uncaught exception in monero-wallet-rpc process: " + err.message
        );
        console.error(origin);
        reject(err);
      });
    });
  }

  // --------------------------- RPC WALLET METHODS ---------------------------

  /**
   * Get the internal process running monero-wallet-rpc.
   *
   * @return the process running monero-wallet-rpc, undefined if not created from new process
   */
  getProcess() {
    return this.process;
  }

  /**
   * Stop the internal process running monero-wallet-rpc, if applicable.
   *
   * @param {boolean} force specifies if the process should be destroyed forcibly
   * @return {Promise<number|undefined>} the exit code from stopping the process
   */
  async stopProcess(force: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.process === undefined)
      throw new MoneroError(
        "MoneroWalletRpc instance not created from new process"
      );
    let listenersCopy = GenUtils.copyArray(this.getListeners());
    for (let listener of listenersCopy) await this.removeListener(listener);
    return GenUtils.killProcess(this.process, force ? "sigkill" : undefined);
  }

  /**
   * Get the wallet's RPC connection.
   *
   * @return {MoneroWalletRpc} the wallet's rpc connection
   */
  getRpcConnection() {
    return this.rpc;
  }

  /**
   * <p>Open an existing wallet on the monero-wallet-rpc server.</p>
   *
   * <p>Example:<p>
   *
   * <code>
   * let wallet = new MoneroWalletRpc("http://localhost:38084", "rpc_user", "abc123");<br>
   * await wallet.openWallet("mywallet1", "supersecretpassword");<br>
   * await wallet.openWallet({<br>
   * &nbsp;&nbsp; path: "mywallet2",<br>
   * &nbsp;&nbsp; password: "supersecretpassword",<br>
   * &nbsp;&nbsp; serverUri: "http://locahost:38081",<br>
   * &nbsp;&nbsp; rejectUnauthorized: false<br>
   * });<br>
   * </code>
   *
   * @param {string|object|MoneroWalletConfig} pathOrConfig  - the wallet's name or configuration to open
   * @param {string} pathOrConfig.path - path of the wallet to create (optional, in-memory wallet if not given)
   * @param {string} pathOrConfig.password - password of the wallet to create
   * @param {string} pathOrConfig.serverUri - uri of a daemon to use (optional, monero-wallet-rpc usually started with daemon config)
   * @param {string} [pathOrConfig.serverUsername] - username to authenticate with the daemon (optional)
   * @param {string} [pathOrConfig.serverPassword] - password to authenticate with the daemon (optional)
   * @param {boolean} [pathOrConfig.rejectUnauthorized] - reject self-signed server certificates if true (defaults to true)
   * @param {MoneroRpcConnection|object} [pathOrConfig.server] - MoneroRpcConnection or equivalent JS object providing daemon configuration (optional)
   * @param {string} password is the wallet's password
   * @return {Promise<MoneroWalletRpc>} this wallet client
   */
  async openWallet(
    pathOrConfig: MoneroWalletConfigOpts | MoneroWalletConfig | string,
    password: string
  ): Promise<MoneroWalletRpc> {
    // normalize and validate config
    const config =
      pathOrConfig instanceof MoneroWalletConfig
        ? pathOrConfig
        : new MoneroWalletConfig(
            typeof pathOrConfig === "string"
              ? { path: pathOrConfig, password: password ? password : "" }
              : pathOrConfig
          );
    // TODO: ensure other fields are uninitialized?

    // open wallet on rpc server
    if (!config.path)
      throw new MoneroError("Must provide name of wallet to open");
    await this.rpc.sendJsonRequest("open_wallet", {
      filename: config.path,
      password: config.password,
    });
    await this._clear();
    this.path = config.path;

    // set daemon if provided
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
    if (config.server) return this.setDaemonConnection(config.server);
    return this;
  }

  /**
   * <p>Create and open a wallet on the monero-wallet-rpc server.<p>
   *
   * <p>Example:<p>
   *
   * <code>
   * &sol;&sol; construct client to monero-wallet-rpc<br>
   * let walletRpc = new MoneroWalletRpc("http://localhost:38084", "rpc_user", "abc123");<br><br>
   *
   * &sol;&sol; create and open wallet on monero-wallet-rpc<br>
   * await walletRpc.createWallet({<br>
   * &nbsp;&nbsp; path: "mywallet",<br>
   * &nbsp;&nbsp; password: "abc123",<br>
   * &nbsp;&nbsp; mnemonic: "coexist igloo pamphlet lagoon...",<br>
   * &nbsp;&nbsp; restoreHeight: 1543218l<br>
   * });
   *  </code>
   *
   * @param {object|MoneroWalletConfig} configOrOpts - MoneroWalletConfig or equivalent JS object
   * @param {string} config.path - path of the wallet to create (optional, in-memory wallet if not given)
   * @param {string} config.password - password of the wallet to create
   * @param {string} config.mnemonic - mnemonic of the wallet to create (optional, random wallet created if neither mnemonic nor keys given)
   * @param {string} config.seedOffset - the offset used to derive a new seed from the given mnemonic to recover a secret wallet from the mnemonic phrase
   * @param {string} config.primaryAddress - primary address of the wallet to create (only provide if restoring from keys)
   * @param {string} [config.privateViewKey] - private view key of the wallet to create (optional)
   * @param {string} [config.privateSpendKey] - private spend key of the wallet to create (optional)
   * @param {number} [config.restoreHeight] - block height to start scanning from (defaults to 0 unless generating random wallet)
   * @param {string} [config.language] - language of the wallet's mnemonic phrase (defaults to "English" or auto-detected)
   * @param {string} config.serverUri - uri of a daemon to use (optional, monero-wallet-rpc usually started with daemon config)
   * @param {string} [config.serverUsername] - username to authenticate with the daemon (optional)
   * @param {string} [config.serverPassword] - password to authenticate with the daemon (optional)
   * @param {boolean} [config.rejectUnauthorized] - reject self-signed server certificates if true (defaults to true)
   * @param {MoneroRpcConnection|object} [config.server] - MoneroRpcConnection or equivalent JS object providing daemon configuration (optional)
   * @param {boolean} [config.saveCurrent] - specifies if the current RPC wallet should be saved before being closed (default true)
   * @return {Promise<MoneroWalletRpc>} this wallet client
   */
  async createWallet(
    configOrOpts?: MoneroWalletConfigOpts | MoneroWalletConfig
  ): Promise<MoneroWalletRpc> {
    // normalize and validate config
    if (configOrOpts === undefined)
      throw new MoneroError("Must provide config to create wallet");

    const config =
      configOrOpts instanceof MoneroWalletConfig
        ? configOrOpts
        : new MoneroWalletConfig(configOrOpts);

    if (
      config.mnemonic !== undefined &&
      (config.primaryAddress !== undefined ||
        config.privateViewKey !== undefined ||
        config.privateSpendKey !== undefined)
    ) {
      throw new MoneroError(
        "Wallet may be initialized with a mnemonic or keys but not both"
      );
    }
    if (configOrOpts.networkType !== undefined)
      throw new MoneroError(
        "Cannot provide networkType when creating RPC wallet because server's network type is already set"
      );
    if (
      config.accountLookahead !== undefined ||
      config.subaddressLookahead !== undefined
    )
      throw new MoneroError(
        "monero-wallet-rpc does not support creating wallets with subaddress lookahead over rpc"
      );
    if (config.password === undefined) config.password = "";

    // create wallet
    if (config.mnemonic !== undefined) {
      await this._createWalletFromMnemonic(
        config.path,
        config.password,
        config.mnemonic,
        config.restoreHeight,
        config.language,
        config.seedOffset,
        config.saveCurrent
      );
    } else if (
      config.privateSpendKey !== undefined ||
      config.primaryAddress !== undefined
    ) {
      if (config.seedOffset !== undefined)
        throw new MoneroError(
          "Cannot provide seedOffset when creating wallet from keys"
        );
      await this._createWalletFromKeys(
        config.path,
        config.password,
        config.primaryAddress,
        config.privateViewKey,
        config.privateSpendKey,
        config.restoreHeight,
        config.language,
        config.saveCurrent
      );
    } else {
      if (config.seedOffset !== undefined)
        throw new MoneroError(
          "Cannot provide seedOffset when creating random wallet"
        );
      if (config.restoreHeight !== undefined)
        throw new MoneroError(
          "Cannot provide restoreHeight when creating random wallet"
        );
      if (config.saveCurrent === false)
        throw new MoneroError(
          "Current wallet is saved automatically when creating random wallet"
        );
      await this._createWalletRandom(
        config.path,
        config.password,
        config.language
      );
    }

    // set daemon if provided
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
    if (config.server) return this.setDaemonConnection(config.server);
    return this;
  }

  /**
   * Create and open a new wallet with a randomly generated seed on the RPC server.
   *
   * @param {string} name - name of the wallet file to create
   * @param {string} password - wallet's password
   * @param {string} language - language for the wallet's mnemonic phrase
   * @return {MoneroWalletRpc} this wallet client
   */
  async _createWalletRandom(name: any, password: any, language: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!name) throw new MoneroError("Name is not initialized");
    // @ts-expect-error TS(2339): Property 'DEFAULT_LANGUAGE' does not exist on type... Remove this comment to see the full error message
    if (!language) language = MoneroWallet.DEFAULT_LANGUAGE;
    let params = { filename: name, password: password, language: language };
    try {
      await this.rpc.sendJsonRequest("create_wallet", params);
    } catch (err) {
      this._handleCreateWalletError(name, err);
    }
    await this._clear();
    this.path = name;
    return this;
  }

  /**
   * Create and open a wallet from an existing mnemonic phrase on the RPC server,
   * closing the currently open wallet if applicable.
   *
   * @param {string} name - name of the wallet to create on the RPC server
   * @param {string} password - wallet's password
   * @param {string} mnemonic - mnemonic of the wallet to construct
   * @param {number} [restoreHeight] - block height to restore from (default = 0)
   * @param {string} language - language of the mnemonic in case the old language is invalid
   * @param {string} seedOffset - offset used to derive a new seed from the given mnemonic to recover a secret wallet from the mnemonic phrase
   * @param {boolean} saveCurrent - specifies if the current RPC wallet should be saved before being closed
   * @return {MoneroWalletRpc} this wallet client
   */
  async _createWalletFromMnemonic(
    name: any,
    password: any,
    mnemonic: any,
    restoreHeight: any,
    language: any,
    seedOffset: any,
    saveCurrent: any
  ) {
    try {
      await this.rpc.sendJsonRequest("restore_deterministic_wallet", {
        filename: name,
        password: password,
        seed: mnemonic,
        seed_offset: seedOffset,
        restore_height: restoreHeight,
        language: language,
        autosave_current: saveCurrent,
      });
    } catch (err) {
      this._handleCreateWalletError(name, err);
    }
    await this._clear();
    this.path = name;
    return this;
  }

  /**
   * Create a wallet on the RPC server from an address, view key, and (optionally) spend key.
   *
   * @param name - name of the wallet to create on the RPC server
   * @param password - password encrypt the wallet
   * @param networkType - wallet's network type
   * @param address - address of the wallet to construct
   * @param viewKey - view key of the wallet to construct
   * @param spendKey - spend key of the wallet to construct or null to create a view-only wallet
   * @param restoreHeight - block height to restore (i.e. scan the chain) from (default = 0)
   * @param language - wallet and mnemonic's language (default = "English")
   * @return {MoneroWalletRpc} this wallet client
   */
  async _createWalletFromKeys(
    name: any,
    password: any,
    address: any,
    viewKey: any,
    spendKey: any,
    restoreHeight: any,
    language: any,
    saveCurrent: any
  ) {
    if (restoreHeight === undefined) restoreHeight = 0;
    // @ts-expect-error TS(2339): Property 'DEFAULT_LANGUAGE' does not exist on type... Remove this comment to see the full error message
    if (language === undefined) language = MoneroWallet.DEFAULT_LANGUAGE;
    try {
      await this.rpc.sendJsonRequest("generate_from_keys", {
        filename: name,
        password: password,
        address: address,
        viewkey: viewKey,
        spendkey: spendKey,
        restore_height: restoreHeight,
        autosave_current: saveCurrent,
      });
    } catch (err) {
      this._handleCreateWalletError(name, err);
    }
    await this._clear();
    this.path = name;
    return this;
  }

  _handleCreateWalletError(name: any, err: any) {
    if (err.message === "Cannot create wallet. Already exists.")
      throw new MoneroRpcError(
        "Wallet already exists: " + name,
        err.getCode(),
        err.rpcMethod,
        err.rpcParams
      );
    if (err.message === "Electrum-style word list failed verification")
      throw new MoneroRpcError(
        "Invalid mnemonic",
        err.getCode(),
        err.rpcMethod,
        err.rpcParams
      );
    throw err;
  }

  // @ts-expect-error TS(2416): Property 'isViewOnly' in type 'MoneroWalletRpc' is... Remove this comment to see the full error message
  async isViewOnly() {
    try {
      await this.rpc.sendJsonRequest("query_key", { key_type: "mnemonic" });
      return false; // key retrieval succeeds if not view only
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (e.getCode() === -29) return true; // wallet is view only
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (e.getCode() === -1) return false; // wallet is offline but not view only
      throw e;
    }
  }

  /**
   * Set the wallet's daemon connection.
   *
   * @param {string|MoneroRpcConnection} [uriOrConnection] - the daemon's URI or connection (defaults to offline)
   * @param {boolean} isTrusted - indicates if the daemon in trusted
   * @param {SslOptions} sslOptions - custom SSL configuration
   */
  async setDaemonConnection(
    uriOrRpcConnection: any,
    isTrusted: any,
    sslOptions: any
  ) {
    const connection = !uriOrRpcConnection
      ? undefined
      : uriOrRpcConnection instanceof MoneroRpcConnection
      ? uriOrRpcConnection
      : new MoneroRpcConnection(uriOrRpcConnection);
    if (!sslOptions) sslOptions = new SslOptions();
    const params: any = {};
    params.address = connection ? connection.uri() : "bad_uri"; // TODO monero-wallet-rpc: bad daemon uri necessary for offline?
    params.username = connection ? connection.username() : "";
    params.password = connection ? connection.password() : "";
    params.trusted = isTrusted;
    params.ssl_support = "autodetect";
    params.ssl_private_key_path = sslOptions.privateKeyPath;
    params.ssl_certificate_path = sslOptions.certificatePath;
    params.ssl_ca_file = sslOptions.certificateAuthorityFile;
    params.ssl_allowed_fingerprints = sslOptions.allowedFingerprints;
    params.ssl_allow_any_cert = sslOptions.allowAnyCert;
    await this.rpc.sendJsonRequest("set_daemon", params);
    this.daemonConnection = connection;
  }

  async getDaemonConnection() {
    return this.daemonConnection;
  }

  // -------------------------- COMMON WALLET METHODS -------------------------

  async addListener(listener: any) {
    assert(
      listener instanceof MoneroWalletListener,
      "Listener must be instance of MoneroWalletListener"
    );
    this.listeners.push(listener);
    this._refreshListening();
  }

  async removeListener(listener: any) {
    let idx = this.listeners.indexOf(listener);
    if (idx > -1) this.listeners.splice(idx, 1);
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    else throw new MoneroError("Listener is not registered with wallet");
    this._refreshListening();
  }

  getListeners() {
    return this.listeners;
  }

  // @ts-expect-error TS(2416): Property 'isConnectedToDaemon' in type 'MoneroWall... Remove this comment to see the full error message
  async isConnectedToDaemon() {
    try {
      await this.checkReserveProof(await this.getPrimaryAddress(), "", ""); // TODO (monero-project): provide better way to know if wallet rpc is connected to daemon
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      throw new MoneroError("check reserve expected to fail");
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      return e.message.indexOf("Failed to connect to daemon") < 0;
    }
  }

  // @ts-expect-error TS(2416): Property 'getVersion' in type 'MoneroWalletRpc' is... Remove this comment to see the full error message
  async getVersion() {
    let resp = await this.rpc.sendJsonRequest("get_version");
    return new MoneroVersion(resp.result.version, resp.result.release);
  }

  async getPath() {
    return this.path;
  }

  async getMnemonic() {
    try {
      let resp = await this.rpc.sendJsonRequest("query_key", {
        key_type: "mnemonic",
      });
      return resp.result.key;
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (e.getCode() === -29) return undefined; // wallet is view-only
      throw e;
    }
  }

  async getMnemonicLanguage() {
    if ((await this.getMnemonic()) === undefined) return undefined;
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError(
      "MoneroWalletRpc.getMnemonicLanguage() not supported"
    );
  }

  /**
   * Get a list of available languages for the wallet's mnemonic phrase.
   *
   * @return {string[]} the available languages for the wallet's mnemonic phrase
   */
  async getMnemonicLanguages() {
    return (await this.rpc.sendJsonRequest("get_languages")).result.languages;
  }

  async getPrivateViewKey() {
    let resp = await this.rpc.sendJsonRequest("query_key", {
      key_type: "view_key",
    });
    return resp.result.key;
  }

  async getPrivateSpendKey() {
    // get private spend key which will throw error if wallet is view-only
    try {
      let resp = await this.rpc.sendJsonRequest("query_key", {
        key_type: "spend_key",
      });
      return resp.result.key;
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (e.getCode() === -29 && e.message.indexOf("watch-only") !== -1)
        return undefined; // return undefined if wallet is view-only
      throw e;
    }
  }

  // @ts-expect-error TS(7023): 'getAddress' implicitly has return type 'any' beca... Remove this comment to see the full error message
  async getAddress(accountIdx: any, subaddressIdx: any) {
    let subaddressMap = this.addressCache[accountIdx];
    if (!subaddressMap) {
      await this.getSubaddresses(accountIdx, undefined, true); // cache's all addresses at this account
      return this.getAddress(accountIdx, subaddressIdx); // recursive call uses cache
    }
    let address = subaddressMap[subaddressIdx];
    if (!address) {
      await this.getSubaddresses(accountIdx, undefined, true); // cache's all addresses at this account
      return this.addressCache[accountIdx][subaddressIdx];
    }
    return address;
  }

  // TODO: use cache
  // @ts-expect-error TS(2416): Property 'getAddressIndex' in type 'MoneroWalletRp... Remove this comment to see the full error message
  async getAddressIndex(address: any) {
    // fetch result and normalize error if address does not belong to the wallet
    let resp;
    try {
      resp = await this.rpc.sendJsonRequest("get_address_index", {
        address: address,
      });
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (e.getCode() === -2) throw new MoneroError(e.message);
      throw e;
    }

    // convert rpc response
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
    let subaddress = new MoneroSubaddress(address);
    subaddress.setAccountIndex(resp.result.index.major);
    subaddress.setIndex(resp.result.index.minor);
    return subaddress;
  }

  // @ts-expect-error TS(2416): Property 'getIntegratedAddress' in type 'MoneroWal... Remove this comment to see the full error message
  async getIntegratedAddress(standardAddress: any, paymentId: any) {
    try {
      let integratedAddressStr = (
        await this.rpc.sendJsonRequest("make_integrated_address", {
          standard_address: standardAddress,
          payment_id: paymentId,
        })
      ).result.integrated_address;
      return await this.decodeIntegratedAddress(integratedAddressStr);
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (e.message.includes("Invalid payment ID"))
        throw new MoneroError("Invalid payment ID: " + paymentId);
      throw e;
    }
  }

  // @ts-expect-error TS(2416): Property 'decodeIntegratedAddress' in type 'Monero... Remove this comment to see the full error message
  async decodeIntegratedAddress(integratedAddress: any) {
    let resp = await this.rpc.sendJsonRequest("split_integrated_address", {
      integrated_address: integratedAddress,
    });
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    return new MoneroIntegratedAddress()
      .setStandardAddress(resp.result.standard_address)
      .setPaymentId(resp.result.payment_id)
      .setIntegratedAddress(integratedAddress);
  }

  async getHeight() {
    return (await this.rpc.sendJsonRequest("get_height")).result.height;
  }

  async getDaemonHeight() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError(
      "monero-wallet-rpc does not support getting the chain height"
    );
  }

  async getHeightByDate(year: any, month: any, day: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError(
      "monero-wallet-rpc does not support getting a height by date"
    );
  }

  // @ts-expect-error TS(2416): Property 'sync' in type 'MoneroWalletRpc' is not a... Remove this comment to see the full error message
  async sync(startHeight: any, onProgress: any) {
    assert(
      onProgress === undefined,
      "Monero Wallet RPC does not support reporting sync progress"
    );
    try {
      let resp = await this.rpc.sendJsonRequest(
        "refresh",
        { start_height: startHeight },
        0
      );
      await this._poll();
      return new MoneroSyncResult(
        resp.result.blocks_fetched,
        resp.result.received_money
      );
    } catch (err) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (err.message === "no connection to daemon")
        throw new MoneroError("Wallet is not connected to daemon");
      throw err;
    }
  }

  async startSyncing(syncPeriodInMs: any) {
    // convert ms to seconds for rpc parameter
    // @ts-expect-error TS(2339): Property 'DEFAULT_SYNC_PERIOD_IN_MS' does not exis... Remove this comment to see the full error message
    let syncPeriodInSeconds = Math.round(
      (syncPeriodInMs === undefined
        ? MoneroWalletRpc.DEFAULT_SYNC_PERIOD_IN_MS
        : syncPeriodInMs) / 1000
    );

    // send rpc request
    await this.rpc.sendJsonRequest("auto_refresh", {
      enable: true,
      period: syncPeriodInSeconds,
    });

    // update sync period for poller
    this.syncPeriodInMs = syncPeriodInSeconds * 1000;
    if (this.walletPoller !== undefined)
      this.walletPoller.setPeriodInMs(syncPeriodInMs);

    // poll if listening
    await this._poll();
  }

  async stopSyncing() {
    return this.rpc.sendJsonRequest("auto_refresh", { enable: false });
  }

  async scanTxs(txHashes: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!txHashes || !txHashes.length)
      throw new MoneroError("No tx hashes given to scan");
    await this.rpc.sendJsonRequest("scan_tx", { txids: txHashes });
    await this._poll();
  }

  async rescanSpent() {
    await this.rpc.sendJsonRequest("rescan_spent", undefined, 0);
  }

  async rescanBlockchain() {
    await this.rpc.sendJsonRequest("rescan_blockchain", undefined, 0);
  }

  // @ts-expect-error TS(2416): Property 'getBalance' in type 'MoneroWalletRpc' is... Remove this comment to see the full error message
  async getBalance(accountIdx: any, subaddressIdx: any) {
    return (await this._getBalances(accountIdx, subaddressIdx))[0];
  }

  // @ts-expect-error TS(2416): Property 'getUnlockedBalance' in type 'MoneroWalle... Remove this comment to see the full error message
  async getUnlockedBalance(accountIdx: any, subaddressIdx: any) {
    return (await this._getBalances(accountIdx, subaddressIdx))[1];
  }

  // @ts-expect-error TS(2416): Property 'getAccounts' in type 'MoneroWalletRpc' i... Remove this comment to see the full error message
  async getAccounts(includeSubaddresses: any, tag: any, skipBalances: any) {
    // fetch accounts from rpc
    let resp = await this.rpc.sendJsonRequest("get_accounts", { tag: tag });

    // build account objects and fetch subaddresses per account using get_address
    // TODO monero-wallet-rpc: get_address should support all_accounts so not called once per account
    let accounts = [];
    for (let rpcAccount of resp.result.subaddress_accounts) {
      let account = MoneroWalletRpc._convertRpcAccount(rpcAccount);
      if (includeSubaddresses)
        account.setSubaddresses(
          await this.getSubaddresses(account.getIndex(), undefined, true)
        );
      accounts.push(account);
    }

    // fetch and merge fields from get_balance across all accounts
    if (includeSubaddresses && !skipBalances) {
      // these fields are not initialized if subaddress is unused and therefore not returned from `get_balance`
      for (let account of accounts) {
        for (let subaddress of account.getSubaddresses()) {
          subaddress.setBalance(BigInt(0));
          subaddress.setUnlockedBalance(BigInt(0));
          subaddress.setNumUnspentOutputs(0);
          subaddress.setNumBlocksToUnlock(0);
        }
      }

      // fetch and merge info from get_balance
      resp = await this.rpc.sendJsonRequest("get_balance", {
        all_accounts: true,
      });
      if (resp.result.per_subaddress) {
        for (let rpcSubaddress of resp.result.per_subaddress) {
          let subaddress = MoneroWalletRpc._convertRpcSubaddress(rpcSubaddress);

          // merge info
          let account = accounts[subaddress.getAccountIndex()];
          assert.equal(
            subaddress.getAccountIndex(),
            account.getIndex(),
            "RPC accounts are out of order"
          ); // would need to switch lookup to loop
          let tgtSubaddress = account.getSubaddresses()[subaddress.getIndex()];
          assert.equal(
            subaddress.getIndex(),
            tgtSubaddress.getIndex(),
            "RPC subaddresses are out of order"
          );
          if (subaddress.getBalance() !== undefined)
            tgtSubaddress.setBalance(subaddress.getBalance());
          if (subaddress.getUnlockedBalance() !== undefined)
            tgtSubaddress.setUnlockedBalance(subaddress.getUnlockedBalance());
          if (subaddress.getNumUnspentOutputs() !== undefined)
            tgtSubaddress.setNumUnspentOutputs(
              subaddress.getNumUnspentOutputs()
            );
        }
      }
    }

    // return accounts
    return accounts;
  }

  // TODO: getAccountByIndex(), getAccountByTag()
  // @ts-expect-error TS(2416): Property 'getAccount' in type 'MoneroWalletRpc' is... Remove this comment to see the full error message
  async getAccount(
    accountIdx: any,
    includeSubaddresses: any,
    skipBalances: any
  ) {
    assert(accountIdx >= 0);
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 0.
    for (let account of await this.getAccounts()) {
      if (account.getIndex() === accountIdx) {
        if (includeSubaddresses)
          account.setSubaddresses(
            await this.getSubaddresses(accountIdx, undefined, skipBalances)
          );
        return account;
      }
    }
    // @ts-expect-error TS(2304): Cannot find name 'Exception'.
    throw new Exception("Account with index " + accountIdx + " does not exist");
  }

  // @ts-expect-error TS(2416): Property 'createAccount' in type 'MoneroWalletRpc'... Remove this comment to see the full error message
  async createAccount(label: any) {
    label = label ? label : undefined;
    let resp = await this.rpc.sendJsonRequest("create_account", {
      label: label,
    });
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 4.
    return new MoneroAccount(
      resp.result.account_index,
      resp.result.address,
      BigInt(0),
      BigInt(0)
    );
  }

  // @ts-expect-error TS(2416): Property 'getSubaddresses' in type 'MoneroWalletRp... Remove this comment to see the full error message
  async getSubaddresses(
    accountIdx: any,
    subaddressIndices: any,
    skipBalances: any
  ) {
    // fetch subaddresses
    let params = {};
    // @ts-expect-error TS(2339): Property 'account_index' does not exist on type '{... Remove this comment to see the full error message
    params.account_index = accountIdx;
    // @ts-expect-error TS(2339): Property 'address_index' does not exist on type '{... Remove this comment to see the full error message
    if (subaddressIndices)
      params.address_index = GenUtils.listify(subaddressIndices);
    let resp = await this.rpc.sendJsonRequest("get_address", params);

    // initialize subaddresses
    let subaddresses = [];
    for (let rpcSubaddress of resp.result.addresses) {
      let subaddress = MoneroWalletRpc._convertRpcSubaddress(rpcSubaddress);
      subaddress.setAccountIndex(accountIdx);
      subaddresses.push(subaddress);
    }

    // fetch and initialize subaddress balances
    if (!skipBalances) {
      // these fields are not initialized if subaddress is unused and therefore not returned from `get_balance`
      for (let subaddress of subaddresses) {
        subaddress.setBalance(BigInt(0));
        subaddress.setUnlockedBalance(BigInt(0));
        subaddress.setNumUnspentOutputs(0);
        subaddress.setNumBlocksToUnlock(0);
      }

      // fetch and initialize balances
      resp = await this.rpc.sendJsonRequest("get_balance", params);
      if (resp.result.per_subaddress) {
        for (let rpcSubaddress of resp.result.per_subaddress) {
          let subaddress = MoneroWalletRpc._convertRpcSubaddress(rpcSubaddress);

          // transfer info to existing subaddress object
          for (let tgtSubaddress of subaddresses) {
            if (tgtSubaddress.getIndex() !== subaddress.getIndex()) continue; // skip to subaddress with same index
            if (subaddress.getBalance() !== undefined)
              tgtSubaddress.setBalance(subaddress.getBalance());
            if (subaddress.getUnlockedBalance() !== undefined)
              tgtSubaddress.setUnlockedBalance(subaddress.getUnlockedBalance());
            if (subaddress.getNumUnspentOutputs() !== undefined)
              tgtSubaddress.setNumUnspentOutputs(
                subaddress.getNumUnspentOutputs()
              );
            if (subaddress.getNumBlocksToUnlock() !== undefined)
              tgtSubaddress.setNumBlocksToUnlock(
                subaddress.getNumBlocksToUnlock()
              );
          }
        }
      }
    }

    // cache addresses
    let subaddressMap = this.addressCache[accountIdx];
    if (!subaddressMap) {
      subaddressMap = {};
      this.addressCache[accountIdx] = subaddressMap;
    }
    for (let subaddress of subaddresses) {
      subaddressMap[subaddress.getIndex()] = subaddress.getAddress();
    }

    // return results
    return subaddresses;
  }

  // @ts-expect-error TS(2416): Property 'getSubaddress' in type 'MoneroWalletRpc'... Remove this comment to see the full error message
  async getSubaddress(accountIdx: any, subaddressIdx: any, skipBalances: any) {
    assert(accountIdx >= 0);
    assert(subaddressIdx >= 0);
    return (
      await this.getSubaddresses(accountIdx, subaddressIdx, skipBalances)
    )[0];
  }

  // @ts-expect-error TS(2416): Property 'createSubaddress' in type 'MoneroWalletR... Remove this comment to see the full error message
  async createSubaddress(accountIdx: any, label: any) {
    // send request
    let resp = await this.rpc.sendJsonRequest("create_address", {
      account_index: accountIdx,
      label: label,
    });

    // build subaddress object
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 0.
    let subaddress = new MoneroSubaddress();
    subaddress.setAccountIndex(accountIdx);
    subaddress.setIndex(resp.result.address_index);
    subaddress.setAddress(resp.result.address);
    subaddress.setLabel(label ? label : undefined);
    subaddress.setBalance(BigInt(0));
    subaddress.setUnlockedBalance(BigInt(0));
    subaddress.setNumUnspentOutputs(0);
    subaddress.setIsUsed(false);
    subaddress.setNumBlocksToUnlock(0);
    return subaddress;
  }

  async setSubaddressLabel(accountIdx: any, subaddressIdx: any, label: any) {
    await this.rpc.sendJsonRequest("label_address", {
      index: { major: accountIdx, minor: subaddressIdx },
      label: label,
    });
  }

  // @ts-expect-error TS(7023): 'getTxs' implicitly has return type 'any' because ... Remove this comment to see the full error message
  async getTxs(query: any, missingTxHashes: any) {
    // copy query
    query = MoneroWallet._normalizeTxQuery(query);

    // temporarily disable transfer and output queries in order to collect all tx information
    let transferQuery = query.getTransferQuery();
    let inputQuery = query.getInputQuery();
    let outputQuery = query.getOutputQuery();
    query.setTransferQuery(undefined);
    query.setInputQuery(undefined);
    query.setOutputQuery(undefined);

    // fetch all transfers that meet tx query
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let transfers = await this._getTransfersAux(
      new MoneroTransferQuery().setTxQuery(
        MoneroWalletRpc._decontextualize(query.copy())
      )
    );

    // collect unique txs from transfers while retaining order
    let txs = [];
    let txsSet = new Set();
    for (let transfer of transfers) {
      if (!txsSet.has(transfer.getTx())) {
        txs.push(transfer.getTx());
        txsSet.add(transfer.getTx());
      }
    }

    // cache types into maps for merging and lookup
    let txMap = {};
    let blockMap = {};
    for (let tx of txs) {
      MoneroWalletRpc._mergeTx(tx, txMap, blockMap);
    }

    // fetch and merge outputs if requested
    if (query.getIncludeOutputs() || outputQuery) {
      // fetch outputs
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      let outputQueryAux = (
        outputQuery ? outputQuery.copy() : new MoneroOutputQuery()
      ).setTxQuery(MoneroWalletRpc._decontextualize(query.copy()));
      let outputs = await this._getOutputsAux(outputQueryAux);

      // merge output txs one time while retaining order
      let outputTxs: any = [];
      for (let output of outputs) {
        if (!outputTxs.includes(output.getTx())) {
          MoneroWalletRpc._mergeTx(output.getTx(), txMap, blockMap);
          outputTxs.push(output.getTx());
        }
      }
    }

    // restore transfer and output queries
    query.setTransferQuery(transferQuery);
    query.setInputQuery(inputQuery);
    query.setOutputQuery(outputQuery);

    // filter txs that don't meet transfer query
    let txsQueried = [];
    for (let tx of txs) {
      if (query.meetsCriteria(tx)) txsQueried.push(tx);
      else if (tx.getBlock() !== undefined)
        tx.getBlock().txs.splice(tx.getBlock().txs.indexOf(tx), 1);
    }
    txs = txsQueried;

    // collect unfound tx hashes
    if (query.getHashes()) {
      let unfoundTxHashes = [];
      for (let txHash of query.getHashes()) {
        let found = false;
        for (let tx of txs) {
          if (txHash === tx.getHash()) {
            found = true;
            break;
          }
        }
        if (!found) unfoundTxHashes.push(txHash);
      }

      // if txs not found, collect missing hashes or throw error if no collection given
      if (missingTxHashes)
        for (let unfoundTxHash of unfoundTxHashes)
          missingTxHashes.push(unfoundTxHash);
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      else if (unfoundTxHashes.length > 0)
        throw new MoneroError(
          "Wallet missing requested tx hashes: " + unfoundTxHashes
        );
    }

    // special case: re-fetch txs if inconsistency caused by needing to make multiple rpc calls
    for (let tx of txs) {
      if (tx.isConfirmed() && tx.getBlock() === undefined) {
        console.error(
          "Inconsistency detected building txs from multiple rpc calls, re-fetching txs"
        );
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        return this.getTxs(query);
      }
    }

    // order txs if tx hashes given then return
    if (query.getHashes() && query.getHashes().length > 0) {
      let txsById = new Map(); // store txs in temporary map for sorting
      for (let tx of txs) txsById.set(tx.getHash(), tx);
      let orderedTxs = [];
      for (let hash of query.getHashes())
        if (txsById.get(hash)) orderedTxs.push(txsById.get(hash));
      txs = orderedTxs;
    }
    return txs;
  }

  // @ts-expect-error TS(2416): Property 'getTransfers' in type 'MoneroWalletRpc' ... Remove this comment to see the full error message
  async getTransfers(query: any) {
    // copy and normalize query up to block
    query = MoneroWallet._normalizeTransferQuery(query);

    // get transfers directly if query does not require tx context (other transfers, outputs)
    if (!MoneroWalletRpc._isContextual(query))
      return this._getTransfersAux(query);

    // otherwise get txs with full models to fulfill query
    let transfers = [];
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    for (let tx of await this.getTxs(query.getTxQuery())) {
      for (let transfer of tx.filterTransfers(query)) {
        transfers.push(transfer);
      }
    }

    return transfers;
  }

  // @ts-expect-error TS(2416): Property 'getOutputs' in type 'MoneroWalletRpc' is... Remove this comment to see the full error message
  async getOutputs(query: any) {
    // copy and normalize query up to block
    query = MoneroWallet._normalizeOutputQuery(query);

    // get outputs directly if query does not require tx context (other outputs, transfers)
    if (!MoneroWalletRpc._isContextual(query))
      return this._getOutputsAux(query);

    // otherwise get txs with full models to fulfill query
    let outputs = [];
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    for (let tx of await this.getTxs(query.getTxQuery())) {
      for (let output of tx.filterOutputs(query)) {
        outputs.push(output);
      }
    }

    return outputs;
  }

  async exportOutputs(all: any) {
    return (await this.rpc.sendJsonRequest("export_outputs", { all: all }))
      .result.outputs_data_hex;
  }

  async importOutputs(outputsHex: any) {
    let resp = await this.rpc.sendJsonRequest("import_outputs", {
      outputs_data_hex: outputsHex,
    });
    return resp.result.num_imported;
  }

  async exportKeyImages(all: any) {
    return await this._rpcExportKeyImages(all);
  }

  // @ts-expect-error TS(2416): Property 'importKeyImages' in type 'MoneroWalletRp... Remove this comment to see the full error message
  async importKeyImages(keyImages: any) {
    // convert key images to rpc parameter
    let rpcKeyImages = keyImages.map((keyImage: any) => ({
      key_image: keyImage.hex,
      signature: keyImage.getSignature(),
    }));

    // send request
    let resp = await this.rpc.sendJsonRequest("import_key_images", {
      signed_key_images: rpcKeyImages,
    });

    // build and return result
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let importResult = new MoneroKeyImageImportResult();
    importResult.setHeight(resp.result.height);
    importResult.setSpentAmount(BigInt(resp.result.spent));
    importResult.setUnspentAmount(BigInt(resp.result.unspent));
    return importResult;
  }

  async getNewKeyImagesFromLastImport() {
    return await this._rpcExportKeyImages(false);
  }

  async freezeOutput(keyImage: any) {
    return this.rpc.sendJsonRequest("freeze", { key_image: keyImage });
  }

  async thawOutput(keyImage: any) {
    return this.rpc.sendJsonRequest("thaw", { key_image: keyImage });
  }

  // @ts-expect-error TS(2416): Property 'isOutputFrozen' in type 'MoneroWalletRpc... Remove this comment to see the full error message
  async isOutputFrozen(keyImage: any) {
    let resp = await this.rpc.sendJsonRequest("frozen", {
      key_image: keyImage,
    });
    return resp.result.frozen === true;
  }

  async createTxs(config: any) {
    // validate, copy, and normalize config
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    if (config.getCanSplit() === undefined) config.setCanSplit(true);
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config.getRelay() === true && (await this.isMultisig()))
      throw new MoneroError(
        "Cannot relay multisig transaction until co-signed"
      );

    // determine account and subaddresses to send from
    let accountIdx = config.getAccountIndex();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (accountIdx === undefined)
      throw new MoneroError("Must provide the account index to send from");
    let subaddressIndices =
      config.getSubaddressIndices() === undefined
        ? undefined
        : config.getSubaddressIndices().slice(0); // fetch all or copy given indices

    // build config parameters
    let params = {};
    // @ts-expect-error TS(2339): Property 'destinations' does not exist on type '{}... Remove this comment to see the full error message
    params.destinations = [];
    for (let destination of config.getDestinations()) {
      assert(destination.getAddress(), "Destination address is not defined");
      assert(destination.getAmount(), "Destination amount is not defined");
      // @ts-expect-error TS(2339): Property 'destinations' does not exist on type '{}... Remove this comment to see the full error message
      params.destinations.push({
        address: destination.getAddress(),
        amount: destination.getAmount().toString(),
      });
    }
    // @ts-expect-error TS(2339): Property 'account_index' does not exist on type '{... Remove this comment to see the full error message
    params.account_index = accountIdx;
    // @ts-expect-error TS(2339): Property 'subaddr_indices' does not exist on type ... Remove this comment to see the full error message
    params.subaddr_indices = subaddressIndices;
    // @ts-expect-error TS(2339): Property 'payment_id' does not exist on type '{}'.
    params.payment_id = config.getPaymentId();
    // @ts-expect-error TS(2339): Property 'unlock_time' does not exist on type '{}'... Remove this comment to see the full error message
    params.unlock_time = config.getUnlockHeight();
    // @ts-expect-error TS(2339): Property 'do_not_relay' does not exist on type '{}... Remove this comment to see the full error message
    params.do_not_relay = config.getRelay() !== true;
    assert(
      config.getPriority() === undefined ||
        (config.getPriority() >= 0 && config.getPriority() <= 3)
    );
    // @ts-expect-error TS(2339): Property 'priority' does not exist on type '{}'.
    params.priority = config.getPriority();
    // @ts-expect-error TS(2339): Property 'get_tx_hex' does not exist on type '{}'.
    params.get_tx_hex = true;
    // @ts-expect-error TS(2339): Property 'get_tx_metadata' does not exist on type ... Remove this comment to see the full error message
    params.get_tx_metadata = true;
    // @ts-expect-error TS(2339): Property 'get_tx_keys' does not exist on type '{}'... Remove this comment to see the full error message
    if (config.getCanSplit())
      params.get_tx_keys = true; // param to get tx key(s) depends if split
    // @ts-expect-error TS(2339): Property 'get_tx_key' does not exist on type '{}'.
    else params.get_tx_key = true;

    // send request
    let result;
    try {
      let resp = await this.rpc.sendJsonRequest(
        config.getCanSplit() ? "transfer_split" : "transfer",
        params
      );
      result = resp.result;
    } catch (err) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (err.message.indexOf("WALLET_RPC_ERROR_CODE_WRONG_ADDRESS") > -1)
        throw new MoneroError("Invalid destination address");
      throw err;
    }

    // pre-initialize txs iff present. multisig and view-only wallets will have tx set without transactions
    let txs: any;
    let numTxs = config.getCanSplit()
      ? result.fee_list !== undefined
        ? result.fee_list.length
        : 0
      : result.fee !== undefined
      ? 1
      : 0;
    if (numTxs > 0) txs = [];
    let copyDestinations = numTxs === 1;
    for (let i = 0; i < numTxs; i++) {
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      let tx = new MoneroTxWallet();
      MoneroWalletRpc._initSentTxWallet(config, tx, copyDestinations);
      tx.getOutgoingTransfer().setAccountIndex(accountIdx);
      if (subaddressIndices !== undefined && subaddressIndices.length === 1)
        tx.getOutgoingTransfer().setSubaddressIndices(subaddressIndices);
      txs.push(tx);
    }

    // notify of changes
    if (config.getRelay()) await this._poll();

    // initialize tx set from rpc response with pre-initialized txs
    if (config.getCanSplit())
      return MoneroWalletRpc._convertRpcSentTxsToTxSet(result, txs).txs;
    else
      return MoneroWalletRpc._convertRpcTxToTxSet(
        result,
        txs === undefined ? undefined : txs[0],
        true
      ).txs;
  }

  async sweepOutput(config: any) {
    // normalize and validate config
    config = MoneroWallet._normalizeSweepOutputConfig(config);

    // build config parameters
    let params = {};
    // @ts-expect-error TS(2339): Property 'address' does not exist on type '{}'.
    params.address = config.getDestinations()[0].getAddress();
    // @ts-expect-error TS(2339): Property 'account_index' does not exist on type '{... Remove this comment to see the full error message
    params.account_index = config.getAccountIndex();
    // @ts-expect-error TS(2339): Property 'subaddr_indices' does not exist on type ... Remove this comment to see the full error message
    params.subaddr_indices = config.getSubaddressIndices();
    // @ts-expect-error TS(2339): Property 'key_image' does not exist on type '{}'.
    params.key_image = config.getKeyImage();
    // @ts-expect-error TS(2339): Property 'unlock_time' does not exist on type '{}'... Remove this comment to see the full error message
    params.unlock_time = config.getUnlockHeight();
    // @ts-expect-error TS(2339): Property 'do_not_relay' does not exist on type '{}... Remove this comment to see the full error message
    params.do_not_relay = config.getRelay() !== true;
    assert(
      config.getPriority() === undefined ||
        (config.getPriority() >= 0 && config.getPriority() <= 3)
    );
    // @ts-expect-error TS(2339): Property 'priority' does not exist on type '{}'.
    params.priority = config.getPriority();
    // @ts-expect-error TS(2339): Property 'payment_id' does not exist on type '{}'.
    params.payment_id = config.getPaymentId();
    // @ts-expect-error TS(2339): Property 'get_tx_key' does not exist on type '{}'.
    params.get_tx_key = true;
    // @ts-expect-error TS(2339): Property 'get_tx_hex' does not exist on type '{}'.
    params.get_tx_hex = true;
    // @ts-expect-error TS(2339): Property 'get_tx_metadata' does not exist on type ... Remove this comment to see the full error message
    params.get_tx_metadata = true;

    // send request
    let resp = await this.rpc.sendJsonRequest("sweep_single", params);
    let result = resp.result;

    // notify of changes
    if (config.getRelay()) await this._poll();

    // build and return tx
    let tx = MoneroWalletRpc._initSentTxWallet(config, null, true);
    MoneroWalletRpc._convertRpcTxToTxSet(result, tx, true);
    tx.getOutgoingTransfer()
      .getDestinations()[0]
      .setAmount(tx.getOutgoingTransfer().getAmount()); // initialize destination amount
    return tx;
  }

  // @ts-expect-error TS(2416): Property 'sweepUnlocked' in type 'MoneroWalletRpc'... Remove this comment to see the full error message
  async sweepUnlocked(config: any) {
    // validate and normalize config
    config = MoneroWallet._normalizeSweepUnlockedConfig(config);

    // determine account and subaddress indices to sweep; default to all with unlocked balance if not specified
    let indices = new Map(); // maps each account index to subaddress indices to sweep
    if (config.getAccountIndex() !== undefined) {
      if (config.getSubaddressIndices() !== undefined) {
        indices.set(config.getAccountIndex(), config.getSubaddressIndices());
      } else {
        let subaddressIndices: any = [];
        indices.set(config.getAccountIndex(), subaddressIndices);
        // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
        for (let subaddress of await this.getSubaddresses(
          config.getAccountIndex()
        )) {
          if (
            GenUtils.compareBigInt(subaddress.getUnlockedBalance(), BigInt(0)) >
            0
          )
            subaddressIndices.push(subaddress.getIndex());
        }
      }
    } else {
      // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
      let accounts = await this.getAccounts(true);
      for (let account of accounts) {
        if (
          GenUtils.compareBigInt(account.getUnlockedBalance(), BigInt(0)) > 0
        ) {
          let subaddressIndices: any = [];
          indices.set(account.getIndex(), subaddressIndices);
          for (let subaddress of account.getSubaddresses()) {
            if (
              GenUtils.compareBigInt(
                subaddress.getUnlockedBalance(),
                BigInt(0)
              ) > 0
            )
              subaddressIndices.push(subaddress.getIndex());
          }
        }
      }
    }

    // sweep from each account and collect resulting tx sets
    let txs = [];
    for (let accountIdx of indices.keys()) {
      // copy and modify the original config
      let copy = config.copy();
      copy.setAccountIndex(accountIdx);
      copy.setSweepEachSubaddress(false);

      // sweep all subaddresses together  // TODO monero-project: can this reveal outputs belong to the same wallet?
      if (copy.getSweepEachSubaddress() !== true) {
        copy.setSubaddressIndices(indices.get(accountIdx));
        for (let tx of await this._rpcSweepAccount(copy)) txs.push(tx);
      }

      // otherwise sweep each subaddress individually
      else {
        for (let subaddressIdx of indices.get(accountIdx)) {
          copy.setSubaddressIndices([subaddressIdx]);
          for (let tx of await this._rpcSweepAccount(copy)) txs.push(tx);
        }
      }
    }

    // notify of changes
    if (config.getRelay()) await this._poll();
    return txs;
  }

  async sweepDust(relay: any) {
    if (relay === undefined) relay = false;
    let resp = await this.rpc.sendJsonRequest("sweep_dust", {
      do_not_relay: !relay,
    });
    if (relay) await this._poll();
    let result = resp.result;
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let txSet = MoneroWalletRpc._convertRpcSentTxsToTxSet(result);
    if (txSet.txs === undefined) return [];
    for (let tx of txSet.txs) {
      tx.setIsRelayed(!relay);
      tx.setInTxPool(tx.isRelayed());
    }
    return txSet.txs;
  }

  // @ts-expect-error TS(2416): Property 'relayTxs' in type 'MoneroWalletRpc' is n... Remove this comment to see the full error message
  async relayTxs(txsOrMetadatas: any) {
    assert(
      Array.isArray(txsOrMetadatas),
      "Must provide an array of txs or their metadata to relay"
    );
    let txHashes = [];
    for (let txOrMetadata of txsOrMetadatas) {
      let metadata =
        txOrMetadata instanceof MoneroTxWallet
          ? txOrMetadata.getMetadata()
          : txOrMetadata;
      let resp = await this.rpc.sendJsonRequest("relay_tx", { hex: metadata });
      txHashes.push(resp.result.tx_hash);
    }
    await this._poll(); // notify of changes
    return txHashes;
  }

  // @ts-expect-error TS(2416): Property 'describeTxSet' in type 'MoneroWalletRpc'... Remove this comment to see the full error message
  async describeTxSet(txSet: any) {
    let resp = await this.rpc.sendJsonRequest("describe_transfer", {
      unsigned_txset: txSet.getUnsignedTxHex(),
      multisig_txset: txSet.getMultisigTxHex(),
    });
    return MoneroWalletRpc._convertRpcDescribeTransfer(resp.result);
  }

  async signTxs(unsignedTxHex: any) {
    let resp = await this.rpc.sendJsonRequest("sign_transfer", {
      unsigned_txset: unsignedTxHex,
      export_raw: false,
    });
    await this._poll();
    return resp.result.signed_txset;
  }

  async submitTxs(signedTxHex: any) {
    let resp = await this.rpc.sendJsonRequest("submit_transfer", {
      tx_data_hex: signedTxHex,
    });
    await this._poll();
    return resp.result.tx_hash_list;
  }

  async signMessage(
    message: any,
    signatureType: any,
    accountIdx: any,
    subaddressIdx: any
  ) {
    let resp = await this.rpc.sendJsonRequest("sign", {
      data: message,
      // @ts-expect-error TS(2339): Property 'SIGN_WITH_SPEND_KEY' does not exist on t... Remove this comment to see the full error message
      signature_type:
        signatureType === MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY
          ? "spend"
          : "view",
      account_index: accountIdx,
      address_index: subaddressIdx,
    });
    return resp.result.signature;
  }

  // @ts-expect-error TS(2416): Property 'verifyMessage' in type 'MoneroWalletRpc'... Remove this comment to see the full error message
  async verifyMessage(message: any, address: any, signature: any) {
    try {
      let resp = await this.rpc.sendJsonRequest("verify", {
        data: message,
        address: address,
        signature: signature,
      });
      let result = new MoneroMessageSignatureResult(
        resp.result.good,
        !resp.result.good ? undefined : resp.result.old,
        // @ts-expect-error TS(2339): Property 'SIGN_WITH_VIEW_KEY' does not exist on ty... Remove this comment to see the full error message
        !resp.result.good
          ? undefined
          : !resp.result.signature_type
          ? undefined
          : resp.result.signature_type === "view"
          ? MoneroMessageSignatureType.SIGN_WITH_VIEW_KEY
          : MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY,
        !resp.result.good ? undefined : resp.result.version
      );
      return result;
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (e.getCode() === -2) return new MoneroMessageSignatureResult(false);
      throw e;
    }
  }

  async getTxKey(txHash: any) {
    try {
      return (await this.rpc.sendJsonRequest("get_tx_key", { txid: txHash }))
        .result.tx_key;
    } catch (e) {
      if (
        e instanceof MoneroRpcError &&
        e.getCode() === -8 &&
        e.message.includes("TX ID has invalid format")
      )
        e = new MoneroRpcError(
          "TX hash has invalid format",
          e.getCode(),
          e.rpcMethod,
          e.rpcParams
        ); // normalize error message
      throw e;
    }
  }

  // @ts-expect-error TS(2416): Property 'checkTxKey' in type 'MoneroWalletRpc' is... Remove this comment to see the full error message
  async checkTxKey(txHash: any, txKey: any, address: any) {
    try {
      // send request
      let resp = await this.rpc.sendJsonRequest("check_tx_key", {
        txid: txHash,
        tx_key: txKey,
        address: address,
      });

      // interpret result
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      let check = new MoneroCheckTx();
      check.setIsGood(true);
      check.setNumConfirmations(resp.result.confirmations);
      check.setInTxPool(resp.result.in_pool);
      check.setReceivedAmount(BigInt(resp.result.received));
      return check;
    } catch (e) {
      if (
        e instanceof MoneroRpcError &&
        e.getCode() === -8 &&
        e.message.includes("TX ID has invalid format")
      )
        e = new MoneroRpcError(
          "TX hash has invalid format",
          e.getCode(),
          e.rpcMethod,
          e.rpcParams
        ); // normalize error message
      throw e;
    }
  }

  async getTxProof(txHash: any, address: any, message: any) {
    try {
      let resp = await this.rpc.sendJsonRequest("get_tx_proof", {
        txid: txHash,
        address: address,
        message: message,
      });
      return resp.result.signature;
    } catch (e) {
      if (
        e instanceof MoneroRpcError &&
        e.getCode() === -8 &&
        e.message.includes("TX ID has invalid format")
      )
        e = new MoneroRpcError(
          "TX hash has invalid format",
          e.getCode(),
          e.rpcMethod,
          e.rpcParams
        ); // normalize error message
      throw e;
    }
  }

  // @ts-expect-error TS(2416): Property 'checkTxProof' in type 'MoneroWalletRpc' ... Remove this comment to see the full error message
  async checkTxProof(txHash: any, address: any, message: any, signature: any) {
    try {
      // send request
      let resp = await this.rpc.sendJsonRequest("check_tx_proof", {
        txid: txHash,
        address: address,
        message: message,
        signature: signature,
      });

      // interpret response
      let isGood = resp.result.good;
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      let check = new MoneroCheckTx();
      check.setIsGood(isGood);
      if (isGood) {
        check.setNumConfirmations(resp.result.confirmations);
        check.setInTxPool(resp.result.in_pool);
        check.setReceivedAmount(BigInt(resp.result.received));
      }
      return check;
    } catch (e) {
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      if (
        e instanceof MoneroRpcError &&
        e.getCode() === -1 &&
        e.message === "basic_string"
      )
        e = new MoneroRpcError("Must provide signature to check tx proof", -1);
      if (
        e instanceof MoneroRpcError &&
        e.getCode() === -8 &&
        e.message.includes("TX ID has invalid format")
      )
        e = new MoneroRpcError(
          "TX hash has invalid format",
          e.getCode(),
          e.rpcMethod,
          e.rpcParams
        );
      throw e;
    }
  }

  async getSpendProof(txHash: any, message: any) {
    try {
      let resp = await this.rpc.sendJsonRequest("get_spend_proof", {
        txid: txHash,
        message: message,
      });
      return resp.result.signature;
    } catch (e) {
      if (
        e instanceof MoneroRpcError &&
        e.getCode() === -8 &&
        e.message.includes("TX ID has invalid format")
      )
        e = new MoneroRpcError(
          "TX hash has invalid format",
          e.getCode(),
          e.rpcMethod,
          e.rpcParams
        ); // normalize error message
      throw e;
    }
  }

  async checkSpendProof(txHash: any, message: any, signature: any) {
    try {
      let resp = await this.rpc.sendJsonRequest("check_spend_proof", {
        txid: txHash,
        message: message,
        signature: signature,
      });
      return resp.result.good;
    } catch (e) {
      if (
        e instanceof MoneroRpcError &&
        e.getCode() === -8 &&
        e.message.includes("TX ID has invalid format")
      )
        e = new MoneroRpcError(
          "TX hash has invalid format",
          e.getCode(),
          e.rpcMethod,
          e.rpcParams
        ); // normalize error message
      throw e;
    }
  }

  async getReserveProofWallet(message: any) {
    let resp = await this.rpc.sendJsonRequest("get_reserve_proof", {
      all: true,
      message: message,
    });
    return resp.result.signature;
  }

  async getReserveProofAccount(accountIdx: any, amount: any, message: any) {
    let resp = await this.rpc.sendJsonRequest("get_reserve_proof", {
      account_index: accountIdx,
      amount: amount.toString(),
      message: message,
    });
    return resp.result.signature;
  }

  // @ts-expect-error TS(2416): Property 'checkReserveProof' in type 'MoneroWallet... Remove this comment to see the full error message
  async checkReserveProof(address: any, message: any, signature: any) {
    // send request
    let resp = await this.rpc.sendJsonRequest("check_reserve_proof", {
      address: address,
      message: message,
      signature: signature,
    });

    // interpret results
    let isGood = resp.result.good;
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let check = new MoneroCheckReserve();
    check.setIsGood(isGood);
    if (isGood) {
      check.setUnconfirmedSpentAmount(BigInt(resp.result.spent));
      check.setTotalAmount(BigInt(resp.result.total));
    }
    return check;
  }

  async getTxNotes(txHashes: any) {
    return (await this.rpc.sendJsonRequest("get_tx_notes", { txids: txHashes }))
      .result.notes;
  }

  async setTxNotes(txHashes: any, notes: any) {
    await this.rpc.sendJsonRequest("set_tx_notes", {
      txids: txHashes,
      notes: notes,
    });
  }

  // @ts-expect-error TS(2416): Property 'getAddressBookEntries' in type 'MoneroWa... Remove this comment to see the full error message
  async getAddressBookEntries(entryIndices: any) {
    let resp = await this.rpc.sendJsonRequest("get_address_book", {
      entries: entryIndices,
    });
    if (!resp.result.entries) return [];
    let entries = [];
    for (let rpcEntry of resp.result.entries) {
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      entries.push(
        new MoneroAddressBookEntry()
          .setIndex(rpcEntry.index)
          .setAddress(rpcEntry.address)
          .setDescription(rpcEntry.description)
          .setPaymentId(rpcEntry.payment_id)
      );
    }
    return entries;
  }

  async addAddressBookEntry(address: any, description: any) {
    let resp = await this.rpc.sendJsonRequest("add_address_book", {
      address: address,
      description: description,
    });
    return resp.result.index;
  }

  async editAddressBookEntry(
    index: any,
    setAddress: any,
    address: any,
    setDescription: any,
    description: any
  ) {
    let resp = await this.rpc.sendJsonRequest("edit_address_book", {
      index: index,
      set_address: setAddress,
      address: address,
      set_description: setDescription,
      description: description,
    });
  }

  async deleteAddressBookEntry(entryIdx: any) {
    await this.rpc.sendJsonRequest("delete_address_book", { index: entryIdx });
  }

  async tagAccounts(tag: any, accountIndices: any) {
    await this.rpc.sendJsonRequest("tag_accounts", {
      tag: tag,
      accounts: accountIndices,
    });
  }

  async untagAccounts(accountIndices: any) {
    await this.rpc.sendJsonRequest("untag_accounts", {
      accounts: accountIndices,
    });
  }

  // @ts-expect-error TS(2416): Property 'getAccountTags' in type 'MoneroWalletRpc... Remove this comment to see the full error message
  async getAccountTags() {
    let tags = [];
    let resp = await this.rpc.sendJsonRequest("get_account_tags");
    if (resp.result.account_tags) {
      for (let rpcAccountTag of resp.result.account_tags) {
        tags.push(
          new MoneroAccountTag(
            rpcAccountTag.tag ? rpcAccountTag.tag : undefined,
            rpcAccountTag.label ? rpcAccountTag.label : undefined,
            rpcAccountTag.accounts
          )
        );
      }
    }
    return tags;
  }

  async setAccountTagLabel(tag: any, label: any) {
    await this.rpc.sendJsonRequest("set_account_tag_description", {
      tag: tag,
      description: label,
    });
  }

  async getPaymentUri(config: any) {
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    let resp = await this.rpc.sendJsonRequest("make_uri", {
      address: config.getDestinations()[0].getAddress(),
      amount: config.getDestinations()[0].getAmount()
        ? config.getDestinations()[0].getAmount().toString()
        : undefined,
      payment_id: config.getPaymentId(),
      recipient_name: config.getRecipientName(),
      tx_description: config.getNote(),
    });
    return resp.result.uri;
  }

  // @ts-expect-error TS(2416): Property 'parsePaymentUri' in type 'MoneroWalletRp... Remove this comment to see the full error message
  async parsePaymentUri(uri: any) {
    assert(uri, "Must provide URI to parse");
    let resp = await this.rpc.sendJsonRequest("parse_uri", { uri: uri });
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let config = new MoneroTxConfig({
      address: resp.result.uri.address,
      amount: BigInt(resp.result.uri.amount),
    });
    config.setPaymentId(resp.result.uri.payment_id);
    config.setRecipientName(resp.result.uri.recipient_name);
    config.setNote(resp.result.uri.tx_description);
    if ("" === config.getDestinations()[0].getAddress())
      config.getDestinations()[0].setAddress(undefined);
    if ("" === config.getPaymentId()) config.setPaymentId(undefined);
    if ("" === config.getRecipientName()) config.setRecipientName(undefined);
    if ("" === config.getNote()) config.setNote(undefined);
    return config;
  }

  async getAttribute(key: any) {
    try {
      let resp = await this.rpc.sendJsonRequest("get_attribute", { key: key });
      return resp.result.value === "" ? undefined : resp.result.value;
    } catch (e) {
      if (e instanceof MoneroRpcError && e.getCode() === -45) return undefined;
      throw e;
    }
  }

  async setAttribute(key: any, val: any) {
    await this.rpc.sendJsonRequest("set_attribute", { key: key, value: val });
  }

  async startMining(
    numThreads: any,
    backgroundMining: any,
    ignoreBattery: any
  ) {
    await this.rpc.sendJsonRequest("start_mining", {
      threads_count: numThreads,
      do_background_mining: backgroundMining,
      ignore_battery: ignoreBattery,
    });
  }

  async stopMining() {
    await this.rpc.sendJsonRequest("stop_mining");
  }

  // @ts-expect-error TS(2416): Property 'isMultisigImportNeeded' in type 'MoneroW... Remove this comment to see the full error message
  async isMultisigImportNeeded() {
    let resp = await this.rpc.sendJsonRequest("get_balance");
    return resp.result.multisig_import_needed === true;
  }

  // @ts-expect-error TS(2416): Property 'getMultisigInfo' in type 'MoneroWalletRp... Remove this comment to see the full error message
  async getMultisigInfo() {
    let resp = await this.rpc.sendJsonRequest("is_multisig");
    let result = resp.result;
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let info = new MoneroMultisigInfo();
    info.setIsMultisig(result.multisig);
    info.setIsReady(result.ready);
    info.setThreshold(result.threshold);
    info.setNumParticipants(result.total);
    return info;
  }

  async prepareMultisig() {
    let resp = await this.rpc.sendJsonRequest("prepare_multisig", {
      enable_multisig_experimental: true,
    });
    this.addressCache = {};
    let result = resp.result;
    return result.multisig_info;
  }

  async makeMultisig(multisigHexes: any, threshold: any, password: any) {
    let resp = await this.rpc.sendJsonRequest("make_multisig", {
      multisig_info: multisigHexes,
      threshold: threshold,
      password: password,
    });
    this.addressCache = {};
    return resp.result.multisig_info;
  }

  // @ts-expect-error TS(2416): Property 'exchangeMultisigKeys' in type 'MoneroWal... Remove this comment to see the full error message
  async exchangeMultisigKeys(multisigHexes: any, password: any) {
    let resp = await this.rpc.sendJsonRequest("exchange_multisig_keys", {
      multisig_info: multisigHexes,
      password: password,
    });
    this.addressCache = {};
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let msResult = new MoneroMultisigInitResult();
    msResult.setAddress(resp.result.address);
    msResult.setMultisigHex(resp.result.multisig_info);
    if (msResult.getAddress().length === 0) msResult.setAddress(undefined);
    if (msResult.getMultisigHex().length === 0)
      msResult.setMultisigHex(undefined);
    return msResult;
  }

  async exportMultisigHex() {
    let resp = await this.rpc.sendJsonRequest("export_multisig_info");
    return resp.result.info;
  }

  async importMultisigHex(multisigHexes: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!GenUtils.isArray(multisigHexes))
      throw new MoneroError("Must provide string[] to importMultisigHex()");
    let resp = await this.rpc.sendJsonRequest("import_multisig_info", {
      info: multisigHexes,
    });
    return resp.result.n_outputs;
  }

  // @ts-expect-error TS(2416): Property 'signMultisigTxHex' in type 'MoneroWallet... Remove this comment to see the full error message
  async signMultisigTxHex(multisigTxHex: any) {
    let resp = await this.rpc.sendJsonRequest("sign_multisig", {
      tx_data_hex: multisigTxHex,
    });
    let result = resp.result;
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let signResult = new MoneroMultisigSignResult();
    signResult.setSignedMultisigTxHex(result.tx_data_hex);
    signResult.setTxHashes(result.tx_hash_list);
    return signResult;
  }

  async submitMultisigTxHex(signedMultisigTxHex: any) {
    let resp = await this.rpc.sendJsonRequest("submit_multisig", {
      tx_data_hex: signedMultisigTxHex,
    });
    return resp.result.tx_hash_list;
  }

  async changePassword(oldPassword: any, newPassword: any) {
    return this.rpc.sendJsonRequest("change_wallet_password", {
      old_password: oldPassword || "",
      new_password: newPassword || "",
    });
  }

  async save() {
    await this.rpc.sendJsonRequest("store");
  }

  async close(save: any) {
    if (save === undefined) save = false;
    await this._clear();
    await this.rpc.sendJsonRequest("close_wallet", { autosave_current: save });
  }

  // @ts-expect-error TS(2416): Property 'isClosed' in type 'MoneroWalletRpc' is n... Remove this comment to see the full error message
  async isClosed() {
    try {
      await this.getPrimaryAddress();
    } catch (e) {
      return (
        e instanceof MoneroRpcError &&
        e.getCode() === -13 &&
        e.message.indexOf("No wallet file") > -1
      );
    }
    return false;
  }

  /**
   * Save and close the current wallet and stop the RPC server.
   */
  async stop() {
    await this._clear();
    await this.rpc.sendJsonRequest("stop_wallet");
  }

  // ----------- ADD JSDOC FOR SUPPORTED DEFAULT IMPLEMENTATIONS --------------

  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async getNumBlocksToUnlock() {
    return super.getNumBlocksToUnlock(...arguments);
  }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async getTx() {
    return super.getTx(...arguments);
  }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async getIncomingTransfers() {
    return super.getIncomingTransfers(...arguments);
  }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async getOutgoingTransfers() {
    return super.getOutgoingTransfers(...arguments);
  }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async createTx() {
    return super.createTx(...arguments);
  }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async relayTx() {
    return super.relayTx(...arguments);
  }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async getTxNote() {
    return super.getTxNote(...arguments);
  }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async setTxNote() {
    return super.setTxNote(...arguments);
  }

  // -------------------------------- PRIVATE ---------------------------------

  async _clear() {
    this.listeners.splice(0, this.listeners.length);
    this._refreshListening();
    delete this.addressCache;
    this.addressCache = {};
    this.path = undefined;
  }

  async _getBalances(accountIdx: any, subaddressIdx: any) {
    if (accountIdx === undefined) {
      assert.equal(
        subaddressIdx,
        undefined,
        "Must provide account index with subaddress index"
      );
      let balance = BigInt(0);
      let unlockedBalance = BigInt(0);
      // @ts-expect-error TS(2554): Expected 3 arguments, but got 0.
      for (let account of await this.getAccounts()) {
        balance = balance + account.getBalance();
        unlockedBalance = unlockedBalance + account.getUnlockedBalance();
      }
      return [balance, unlockedBalance];
    } else {
      let params = {
        account_index: accountIdx,
        address_indices:
          subaddressIdx === undefined ? undefined : [subaddressIdx],
      };
      let resp = await this.rpc.sendJsonRequest("get_balance", params);
      if (subaddressIdx === undefined)
        return [
          BigInt(resp.result.balance),
          BigInt(resp.result.unlocked_balance),
        ];
      else
        return [
          BigInt(resp.result.per_subaddress[0].balance),
          BigInt(resp.result.per_subaddress[0].unlocked_balance),
        ];
    }
  }

  async _getAccountIndices(getSubaddressIndices: any) {
    let indices = new Map();
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 0.
    for (let account of await this.getAccounts()) {
      indices.set(
        account.getIndex(),
        getSubaddressIndices
          ? await this._getSubaddressIndices(account.getIndex())
          : undefined
      );
    }
    return indices;
  }

  async _getSubaddressIndices(accountIdx: any) {
    let subaddressIndices = [];
    let resp = await this.rpc.sendJsonRequest("get_address", {
      account_index: accountIdx,
    });
    for (let address of resp.result.addresses)
      subaddressIndices.push(address.address_index);
    return subaddressIndices;
  }

  async _getTransfersAux(query: any) {
    // build params for get_transfers rpc call
    let txQuery = query.getTxQuery();
    let canBeConfirmed =
      txQuery.isConfirmed() !== false &&
      txQuery.inTxPool() !== true &&
      txQuery.isFailed() !== true &&
      txQuery.isRelayed() !== false;
    let canBeInTxPool =
      txQuery.isConfirmed() !== true &&
      txQuery.inTxPool() !== false &&
      txQuery.isFailed() !== true &&
      txQuery.getHeight() === undefined &&
      txQuery.getMaxHeight() === undefined &&
      txQuery.isLocked() !== false;
    let canBeIncoming =
      query.isIncoming() !== false &&
      query.isOutgoing() !== true &&
      query.hasDestinations() !== true;
    let canBeOutgoing =
      query.isOutgoing() !== false && query.isIncoming() !== true;

    // check if fetching pool txs contradicted by configuration
    if (txQuery.inTxPool() === true && !canBeInTxPool) {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      throw new MoneroError(
        "Cannot fetch pool transactions because it contradicts configuration"
      );
    }

    let params = {};
    // @ts-expect-error TS(2339): Property 'in' does not exist on type '{}'.
    params.in = canBeIncoming && canBeConfirmed;
    // @ts-expect-error TS(2339): Property 'out' does not exist on type '{}'.
    params.out = canBeOutgoing && canBeConfirmed;
    // @ts-expect-error TS(2339): Property 'pool' does not exist on type '{}'.
    params.pool = canBeIncoming && canBeInTxPool;
    // @ts-expect-error TS(2339): Property 'pending' does not exist on type '{}'.
    params.pending = canBeOutgoing && canBeInTxPool;
    // @ts-expect-error TS(2339): Property 'failed' does not exist on type '{}'.
    params.failed =
      txQuery.isFailed() !== false &&
      txQuery.isConfirmed() !== true &&
      txQuery.inTxPool() != true;
    if (txQuery.getMinHeight() !== undefined) {
      // @ts-expect-error TS(2339): Property 'min_height' does not exist on type '{}'.
      if (txQuery.getMinHeight() > 0)
        params.min_height = txQuery.getMinHeight() - 1;
      // TODO monero-project: wallet2::get_payments() min_height is exclusive, so manually offset to match intended range (issues #5751, #5598)
      // @ts-expect-error TS(2339): Property 'min_height' does not exist on type '{}'.
      else params.min_height = txQuery.getMinHeight();
    }
    // @ts-expect-error TS(2339): Property 'max_height' does not exist on type '{}'.
    if (txQuery.getMaxHeight() !== undefined)
      params.max_height = txQuery.getMaxHeight();
    // @ts-expect-error TS(2339): Property 'filter_by_height' does not exist on type... Remove this comment to see the full error message
    params.filter_by_height =
      txQuery.getMinHeight() !== undefined ||
      txQuery.getMaxHeight() !== undefined;
    if (query.getAccountIndex() === undefined) {
      assert(
        query.getSubaddressIndex() === undefined &&
          query.getSubaddressIndices() === undefined,
        "Query specifies a subaddress index but not an account index"
      );
      // @ts-expect-error TS(2339): Property 'all_accounts' does not exist on type '{}... Remove this comment to see the full error message
      params.all_accounts = true;
    } else {
      // @ts-expect-error TS(2339): Property 'account_index' does not exist on type '{... Remove this comment to see the full error message
      params.account_index = query.getAccountIndex();

      // set subaddress indices param
      let subaddressIndices = new Set();
      if (query.getSubaddressIndex() !== undefined)
        subaddressIndices.add(query.getSubaddressIndex());
      if (query.getSubaddressIndices() !== undefined)
        query
          .getSubaddressIndices()
          .map((subaddressIdx: any) => subaddressIndices.add(subaddressIdx));
      // @ts-expect-error TS(2339): Property 'subaddr_indices' does not exist on type ... Remove this comment to see the full error message
      if (subaddressIndices.size)
        params.subaddr_indices = Array.from(subaddressIndices);
    }

    // cache unique txs and blocks
    let txMap = {};
    let blockMap = {};

    // build txs using `get_transfers`
    let resp = await this.rpc.sendJsonRequest("get_transfers", params);
    for (let key of Object.keys(resp.result)) {
      for (let rpcTx of resp.result[key]) {
        //if (rpcTx.txid === query.debugTxId) console.log(rpcTx);
        // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
        let tx = MoneroWalletRpc._convertRpcTxWithTransfer(rpcTx);
        if (tx.isConfirmed()) assert(tx.getBlock().txs.indexOf(tx) > -1);

        // replace transfer amount with destination sum
        // TODO monero-wallet-rpc: confirmed tx from/to same account has amount 0 but cached transfers
        if (
          tx.getOutgoingTransfer() !== undefined &&
          tx.isRelayed() &&
          !tx.isFailed() &&
          tx.getOutgoingTransfer().getDestinations() &&
          GenUtils.compareBigInt(tx.getOutgoingAmount(), BigInt(0)) === 0
        ) {
          let outgoingTransfer = tx.getOutgoingTransfer();
          let transferTotal = BigInt(0);
          for (let destination of outgoingTransfer.getDestinations())
            transferTotal = transferTotal + destination.getAmount();
          tx.getOutgoingTransfer().setAmount(transferTotal);
        }

        // merge tx
        MoneroWalletRpc._mergeTx(tx, txMap, blockMap);
      }
    }

    // sort txs by block height
    let txs = Object.values(txMap);
    txs.sort(MoneroWalletRpc._compareTxsByHeight);

    // filter and return transfers
    let transfers = [];
    for (let tx of txs) {
      // tx is not incoming/outgoing unless already set
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (tx.isIncoming() === undefined) tx.setIsIncoming(false);
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (tx.isOutgoing() === undefined) tx.setIsOutgoing(false);

      // sort incoming transfers
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (tx.getIncomingTransfers() !== undefined)
        tx.getIncomingTransfers().sort(
          MoneroWalletRpc._compareIncomingTransfers
        );

      // collect queried transfers, erase if excluded
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      for (let transfer of tx.filterTransfers(query)) {
        transfers.push(transfer);
      }

      // remove txs without requested transfer
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (
        tx.getBlock() !== undefined &&
        tx.getOutgoingTransfer() === undefined &&
        tx.getIncomingTransfers() === undefined
      ) {
        // @ts-expect-error TS(2571): Object is of type 'unknown'.
        tx.getBlock().txs.splice(tx.getBlock().txs.indexOf(tx), 1);
      }
    }

    return transfers;
  }

  async _getOutputsAux(query: any) {
    // determine account and subaddress indices to be queried
    let indices = new Map();
    if (query.getAccountIndex() !== undefined) {
      let subaddressIndices = new Set();
      if (query.getSubaddressIndex() !== undefined)
        subaddressIndices.add(query.getSubaddressIndex());
      if (query.getSubaddressIndices() !== undefined)
        query
          .getSubaddressIndices()
          .map((subaddressIdx: any) => subaddressIndices.add(subaddressIdx));
      indices.set(
        query.getAccountIndex(),
        subaddressIndices.size ? Array.from(subaddressIndices) : undefined
      ); // undefined will fetch from all subaddresses
    } else {
      assert.equal(
        query.getSubaddressIndex(),
        undefined,
        "Query specifies a subaddress index but not an account index"
      );
      assert(
        query.getSubaddressIndices() === undefined ||
          query.getSubaddressIndices().length === 0,
        "Query specifies subaddress indices but not an account index"
      );
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      indices = await this._getAccountIndices(); // fetch all account indices without subaddresses
    }

    // cache unique txs and blocks
    let txMap = {};
    let blockMap = {};

    // collect txs with outputs for each indicated account using `incoming_transfers` rpc call
    let params = {};
    // @ts-expect-error TS(2339): Property 'transfer_type' does not exist on type '{... Remove this comment to see the full error message
    params.transfer_type =
      query.isSpent() === true
        ? "unavailable"
        : query.isSpent() === false
        ? "available"
        : "all";
    // @ts-expect-error TS(2339): Property 'verbose' does not exist on type '{}'.
    params.verbose = true;
    for (let accountIdx of indices.keys()) {
      // send request
      // @ts-expect-error TS(2339): Property 'account_index' does not exist on type '{... Remove this comment to see the full error message
      params.account_index = accountIdx;
      // @ts-expect-error TS(2339): Property 'subaddr_indices' does not exist on type ... Remove this comment to see the full error message
      params.subaddr_indices = indices.get(accountIdx);
      let resp = await this.rpc.sendJsonRequest("incoming_transfers", params);

      // convert response to txs with outputs and merge
      if (resp.result.transfers === undefined) continue;
      for (let rpcOutput of resp.result.transfers) {
        let tx = MoneroWalletRpc._convertRpcTxWalletWithOutput(rpcOutput);
        MoneroWalletRpc._mergeTx(tx, txMap, blockMap);
      }
    }

    // sort txs by block height
    let txs = Object.values(txMap);
    txs.sort(MoneroWalletRpc._compareTxsByHeight);

    // collect queried outputs
    let outputs = [];
    for (let tx of txs) {
      // sort outputs
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (tx.getOutputs() !== undefined)
        tx.getOutputs().sort(MoneroWalletRpc._compareOutputs);

      // collect queried outputs, erase if excluded
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      for (let output of tx.filterOutputs(query)) outputs.push(output);

      // remove excluded txs from block
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (tx.getOutputs() === undefined && tx.getBlock() !== undefined) {
        // @ts-expect-error TS(2571): Object is of type 'unknown'.
        tx.getBlock().txs.splice(tx.getBlock().txs.indexOf(tx), 1);
      }
    }
    return outputs;
  }

  /**
   * Common method to get key images.
   *
   * @param all - pecifies to get all xor only new images from last import
   * @return {MoneroKeyImage[]} are the key images
   */
  async _rpcExportKeyImages(all: any) {
    let resp = await this.rpc.sendJsonRequest("export_key_images", {
      all: all,
    });
    if (!resp.result.signed_key_images) return [];
    return resp.result.signed_key_images.map(
      (rpcImage: any) =>
        new MoneroKeyImage(rpcImage.key_image, rpcImage.signature)
    );
  }

  async _rpcSweepAccount(config: any) {
    // validate config
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config === undefined)
      throw new MoneroError("Must provide sweep config");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config.getAccountIndex() === undefined)
      throw new MoneroError("Must provide an account index to sweep from");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (
      config.getDestinations() === undefined ||
      config.getDestinations().length != 1
    )
      throw new MoneroError("Must provide exactly one destination to sweep to");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config.getDestinations()[0].getAddress() === undefined)
      throw new MoneroError("Must provide destination address to sweep to");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config.getDestinations()[0].getAmount() !== undefined)
      throw new MoneroError("Cannot specify amount in sweep config");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config.getKeyImage() !== undefined)
      throw new MoneroError(
        "Key image defined; use sweepOutput() to sweep an output by its key image"
      );
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (
      config.getSubaddressIndices() !== undefined &&
      config.getSubaddressIndices().length === 0
    )
      throw new MoneroError(
        "Empty list given for subaddresses indices to sweep"
      );
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config.getSweepEachSubaddress())
      throw new MoneroError(
        "Cannot sweep each subaddress with RPC `sweep_all`"
      );

    // sweep from all subaddresses if not otherwise defined
    if (config.getSubaddressIndices() === undefined) {
      config.setSubaddressIndices([]);
      // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
      for (let subaddress of await this.getSubaddresses(
        config.getAccountIndex()
      )) {
        config.getSubaddressIndices().push(subaddress.getIndex());
      }
    }
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config.getSubaddressIndices().length === 0)
      throw new MoneroError("No subaddresses to sweep from");

    // common config params
    let params = {};
    let relay = config.getRelay() === true;
    // @ts-expect-error TS(2339): Property 'account_index' does not exist on type '{... Remove this comment to see the full error message
    params.account_index = config.getAccountIndex();
    // @ts-expect-error TS(2339): Property 'subaddr_indices' does not exist on type ... Remove this comment to see the full error message
    params.subaddr_indices = config.getSubaddressIndices();
    // @ts-expect-error TS(2339): Property 'address' does not exist on type '{}'.
    params.address = config.getDestinations()[0].getAddress();
    assert(
      config.getPriority() === undefined ||
        (config.getPriority() >= 0 && config.getPriority() <= 3)
    );
    // @ts-expect-error TS(2339): Property 'priority' does not exist on type '{}'.
    params.priority = config.getPriority();
    // @ts-expect-error TS(2339): Property 'unlock_time' does not exist on type '{}'... Remove this comment to see the full error message
    params.unlock_time = config.getUnlockHeight();
    // @ts-expect-error TS(2339): Property 'payment_id' does not exist on type '{}'.
    params.payment_id = config.getPaymentId();
    // @ts-expect-error TS(2339): Property 'do_not_relay' does not exist on type '{}... Remove this comment to see the full error message
    params.do_not_relay = !relay;
    // @ts-expect-error TS(2339): Property 'below_amount' does not exist on type '{}... Remove this comment to see the full error message
    params.below_amount = config.getBelowAmount();
    // @ts-expect-error TS(2339): Property 'get_tx_keys' does not exist on type '{}'... Remove this comment to see the full error message
    params.get_tx_keys = true;
    // @ts-expect-error TS(2339): Property 'get_tx_hex' does not exist on type '{}'.
    params.get_tx_hex = true;
    // @ts-expect-error TS(2339): Property 'get_tx_metadata' does not exist on type ... Remove this comment to see the full error message
    params.get_tx_metadata = true;

    // invoke wallet rpc `sweep_all`
    let resp = await this.rpc.sendJsonRequest("sweep_all", params);
    let result = resp.result;

    // initialize txs from response
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let txSet = MoneroWalletRpc._convertRpcSentTxsToTxSet(result);

    // initialize remaining known fields
    for (let tx of txSet.txs) {
      tx.setIsLocked(true);
      tx.setIsConfirmed(false);
      tx.setNumConfirmations(0);
      tx.setRelay(relay);
      tx.setInTxPool(relay);
      tx.setIsRelayed(relay);
      tx.setIsMinerTx(false);
      tx.setIsFailed(false);
      // @ts-expect-error TS(2339): Property 'RING_SIZE' does not exist on type 'typeo... Remove this comment to see the full error message
      tx.setRingSize(MoneroUtils.RING_SIZE);
      let transfer = tx.getOutgoingTransfer();
      transfer.setAccountIndex(config.getAccountIndex());
      if (config.getSubaddressIndices().length === 1)
        transfer.setSubaddressIndices(config.getSubaddressIndices());
      let destination = new MoneroDestination(
        config.getDestinations()[0].getAddress(),
        BigInt(transfer.getAmount())
      );
      transfer.setDestinations([destination]);
      tx.setOutgoingTransfer(transfer);
      tx.setPaymentId(config.getPaymentId());
      if (tx.getUnlockHeight() === undefined)
        tx.setUnlockHeight(
          config.getUnlockHeight() === undefined ? 0 : config.getUnlockHeight()
        );
      if (tx.getRelay()) {
        if (tx.getLastRelayedTimestamp() === undefined)
          tx.setLastRelayedTimestamp(+new Date().getTime()); // TODO (monero-wallet-rpc): provide timestamp on response; unconfirmed timestamps vary
        if (tx.isDoubleSpendSeen() === undefined) tx.setIsDoubleSpend(false);
      }
    }
    return txSet.txs;
  }

  _refreshListening() {
    if (this.walletPoller == undefined && this.listeners.length)
      this.walletPoller = new WalletPoller(this);
    if (this.walletPoller !== undefined)
      this.walletPoller.setIsPolling(this.listeners.length > 0);
  }

  /**
   * Poll if listening.
   */
  async _poll() {
    if (this.walletPoller !== undefined && this.walletPoller._isPolling)
      await this.walletPoller.poll();
  }

  // ---------------------------- PRIVATE STATIC ------------------------------

  static _normalizeConfig(
    uriOrConfigOrConnection: any,
    username: any,
    password: any,
    rejectUnauthorized: any
  ) {
    let config;
    if (typeof uriOrConfigOrConnection === "string")
      config = {
        uri: uriOrConfigOrConnection,
        username: username,
        password: password,
        rejectUnauthorized: rejectUnauthorized,
      };
    else {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (typeof uriOrConfigOrConnection !== "object")
        throw new MoneroError(
          "Invalid configuration to create rpc client; must be string, object, or MoneroRpcConnection"
        );
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (username || password || rejectUnauthorized)
        throw new MoneroError(
          "Can provide config object or params or new MoneroDaemonRpc(...) but not both"
        );
      if (uriOrConfigOrConnection instanceof MoneroRpcConnection)
        config = Object.assign({}, uriOrConfigOrConnection.config());
      else config = Object.assign({}, uriOrConfigOrConnection);
    }
    if (config.server) {
      // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
      config = Object.assign(
        config,
        new MoneroRpcConnection(config.server).config()
      );
      delete config.server;
    }
    return config;
  }

  /**
   * Remove criteria which requires looking up other transfers/outputs to
   * fulfill query.
   *
   * @param {MoneroTxQuery} query - the query to decontextualize
   * @return {MoneroTxQuery} a reference to the query for convenience
   */
  static _decontextualize(query: any) {
    query.setIsIncoming(undefined);
    query.setIsOutgoing(undefined);
    query.setTransferQuery(undefined);
    query.setInputQuery(undefined);
    query.setOutputQuery(undefined);
    return query;
  }

  static _isContextual(query: any) {
    if (!query) return false;
    if (!query.getTxQuery()) return false;
    if (query.getTxQuery().isIncoming() !== undefined) return true; // requires getting other transfers
    if (query.getTxQuery().isOutgoing() !== undefined) return true;
    if (query instanceof MoneroTransferQuery) {
      if (query.getTxQuery().getOutputQuery() !== undefined) return true; // requires getting other outputs
    } else if (query instanceof MoneroOutputQuery) {
      if (query.getTxQuery().getTransferQuery() !== undefined) return true; // requires getting other transfers
    } else {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      throw new MoneroError("query must be tx or transfer query");
    }
    return false;
  }

  static _convertRpcAccount(rpcAccount: any) {
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 0.
    let account = new MoneroAccount();
    for (let key of Object.keys(rpcAccount)) {
      let val = rpcAccount[key];
      if (key === "account_index") account.setIndex(val);
      else if (key === "balance") account.setBalance(BigInt(val));
      else if (key === "unlocked_balance")
        account.setUnlockedBalance(BigInt(val));
      else if (key === "base_address") account.setPrimaryAddress(val);
      else if (key === "tag") account.setTag(val);
      else if (key === "label") {
      } // label belongs to first subaddress
      else
        console.log(
          "WARNING: ignoring unexpected account field: " + key + ": " + val
        );
    }
    if ("" === account.getTag()) account.setTag(undefined);
    return account;
  }

  static _convertRpcSubaddress(rpcSubaddress: any) {
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 0.
    let subaddress = new MoneroSubaddress();
    for (let key of Object.keys(rpcSubaddress)) {
      let val = rpcSubaddress[key];
      if (key === "account_index") subaddress.setAccountIndex(val);
      else if (key === "address_index") subaddress.setIndex(val);
      else if (key === "address") subaddress.setAddress(val);
      else if (key === "balance") subaddress.setBalance(BigInt(val));
      else if (key === "unlocked_balance")
        subaddress.setUnlockedBalance(BigInt(val));
      else if (key === "num_unspent_outputs")
        subaddress.setNumUnspentOutputs(val);
      else if (key === "label") {
        if (val) subaddress.setLabel(val);
      } else if (key === "used") subaddress.setIsUsed(val);
      else if (key === "blocks_to_unlock") subaddress.setNumBlocksToUnlock(val);
      else if (key == "time_to_unlock") {
      } // ignoring
      else
        console.log(
          "WARNING: ignoring unexpected subaddress field: " + key + ": " + val
        );
    }
    return subaddress;
  }

  /**
   * Initializes a sent transaction.
   *
   * @param {MoneroTxConfig} config - send config
   * @param {MoneroTxWallet} [tx] - existing transaction to initialize (optional)
   * @param {boolean} copyDestinations - copies config destinations if true
   * @return {MoneroTxWallet} is the initialized send tx
   */
  static _initSentTxWallet(config: any, tx: any, copyDestinations: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    if (!tx) tx = new MoneroTxWallet();
    let relay = config.getRelay() === true;
    tx.setIsOutgoing(true);
    tx.setIsConfirmed(false);
    tx.setNumConfirmations(0);
    tx.setInTxPool(relay);
    tx.setRelay(relay);
    tx.setIsRelayed(relay);
    tx.setIsMinerTx(false);
    tx.setIsFailed(false);
    tx.setIsLocked(true);
    // @ts-expect-error TS(2339): Property 'RING_SIZE' does not exist on type 'typeo... Remove this comment to see the full error message
    tx.setRingSize(MoneroUtils.RING_SIZE);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let transfer = new MoneroOutgoingTransfer().setTx(tx);
    if (
      config.getSubaddressIndices() &&
      config.getSubaddressIndices().length === 1
    )
      transfer.setSubaddressIndices(config.getSubaddressIndices().slice(0)); // we know src subaddress indices iff config specifies 1
    if (copyDestinations) {
      let destCopies = [];
      for (let dest of config.getDestinations()) destCopies.push(dest.copy());
      transfer.setDestinations(destCopies);
    }
    tx.setOutgoingTransfer(transfer);
    tx.setPaymentId(config.getPaymentId());
    if (tx.getUnlockHeight() === undefined)
      tx.setUnlockHeight(
        config.getUnlockHeight() === undefined ? 0 : config.getUnlockHeight()
      );
    if (config.getRelay()) {
      if (tx.getLastRelayedTimestamp() === undefined)
        tx.setLastRelayedTimestamp(+new Date().getTime()); // TODO (monero-wallet-rpc): provide timestamp on response; unconfirmed timestamps vary
      if (tx.isDoubleSpendSeen() === undefined) tx.setIsDoubleSpend(false);
    }
    return tx;
  }

  /**
   * Initializes a tx set from a RPC map excluding txs.
   *
   * @param rpcMap - map to initialize the tx set from
   * @return MoneroTxSet - initialized tx set
   * @return the resulting tx set
   */
  static _convertRpcTxSet(rpcMap: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let txSet = new MoneroTxSet();
    txSet.setMultisigTxHex(rpcMap.multisig_txset);
    txSet.setUnsignedTxHex(rpcMap.unsigned_txset);
    txSet.setSignedTxHex(rpcMap.signed_txset);
    if (
      txSet.getMultisigTxHex() !== undefined &&
      txSet.getMultisigTxHex().length === 0
    )
      txSet.setMultisigTxHex(undefined);
    if (
      txSet.getUnsignedTxHex() !== undefined &&
      txSet.getUnsignedTxHex().length === 0
    )
      txSet.setUnsignedTxHex(undefined);
    if (
      txSet.getSignedTxHex() !== undefined &&
      txSet.getSignedTxHex().length === 0
    )
      txSet.setSignedTxHex(undefined);
    return txSet;
  }

  /**
   * Initializes a MoneroTxSet from from a list of rpc txs.
   *
   * @param rpcTxs - rpc txs to initialize the set from
   * @param txs - existing txs to further initialize (optional)
   * @return the converted tx set
   */
  static _convertRpcSentTxsToTxSet(rpcTxs: any, txs: any) {
    // build shared tx set
    let txSet = MoneroWalletRpc._convertRpcTxSet(rpcTxs);

    // get number of txs
    let numTxs = rpcTxs.fee_list ? rpcTxs.fee_list.length : 0;

    // done if rpc response contains no txs
    if (numTxs === 0) {
      assert.equal(txs, undefined);
      return txSet;
    }

    // pre-initialize txs if none given
    if (txs) txSet.setTxs(txs);
    else {
      txs = [];
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      for (let i = 0; i < numTxs; i++) txs.push(new MoneroTxWallet());
    }
    for (let tx of txs) {
      tx.setTxSet(txSet);
      tx.setIsOutgoing(true);
    }
    txSet.setTxs(txs);

    // initialize txs from rpc lists
    for (let key of Object.keys(rpcTxs)) {
      let val = rpcTxs[key];
      if (key === "tx_hash_list")
        for (let i = 0; i < val.length; i++) txs[i].setHash(val[i]);
      else if (key === "tx_key_list")
        for (let i = 0; i < val.length; i++) txs[i].setKey(val[i]);
      else if (key === "tx_blob_list")
        for (let i = 0; i < val.length; i++) txs[i].setFullHex(val[i]);
      else if (key === "tx_metadata_list")
        for (let i = 0; i < val.length; i++) txs[i].setMetadata(val[i]);
      else if (key === "fee_list")
        for (let i = 0; i < val.length; i++) txs[i].setFee(BigInt(val[i]));
      else if (key === "weight_list")
        for (let i = 0; i < val.length; i++) txs[i].setWeight(val[i]);
      else if (key === "amount_list") {
        for (let i = 0; i < val.length; i++) {
          if (txs[i].getOutgoingTransfer() !== undefined)
            txs[i].getOutgoingTransfer().setAmount(BigInt(val[i]));
          // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
          else
            txs[i].setOutgoingTransfer(
              new MoneroOutgoingTransfer()
                .setTx(txs[i])
                .setAmount(BigInt(val[i]))
            );
        }
      } else if (
        key === "multisig_txset" ||
        key === "unsigned_txset" ||
        key === "signed_txset"
      ) {
      } // handled elsewhere
      else if (key === "spent_key_images_list") {
        let inputKeyImagesList = val;
        for (let i = 0; i < inputKeyImagesList.length; i++) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          GenUtils.assertTrue(txs[i].getInputs() === undefined);
          txs[i].setInputs([]);
          for (let inputKeyImage of inputKeyImagesList[i]["key_images"]) {
            // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
            txs[i]
              .getInputs()
              .push(
                new MoneroOutputWallet()
                  .setKeyImage(new MoneroKeyImage().setHex(inputKeyImage))
                  .setTx(txs[i])
              );
          }
        }
      } else
        console.log(
          "WARNING: ignoring unexpected transaction field: " + key + ": " + val
        );
    }

    return txSet;
  }

  /**
   * Converts a rpc tx with a transfer to a tx set with a tx and transfer.
   *
   * @param rpcTx - rpc tx to build from
   * @param tx - existing tx to continue initializing (optional)
   * @param isOutgoing - specifies if the tx is outgoing if true, incoming if false, or decodes from type if undefined
   * @returns the initialized tx set with a tx
   */
  static _convertRpcTxToTxSet(rpcTx: any, tx: any, isOutgoing: any) {
    let txSet = MoneroWalletRpc._convertRpcTxSet(rpcTx);
    txSet.setTxs([
      MoneroWalletRpc._convertRpcTxWithTransfer(rpcTx, tx, isOutgoing).setTxSet(
        txSet
      ),
    ]);
    return txSet;
  }

  /**
   * Builds a MoneroTxWallet from a RPC tx.
   *
   * @param rpcTx - rpc tx to build from
   * @param tx - existing tx to continue initializing (optional)
   * @param isOutgoing - specifies if the tx is outgoing if true, incoming if false, or decodes from type if undefined
   * @returns {MoneroTxWallet} is the initialized tx
   */
  static _convertRpcTxWithTransfer(rpcTx: any, tx: any, isOutgoing: any) {
    // TODO: change everything to safe set

    // initialize tx to return
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    if (!tx) tx = new MoneroTxWallet();

    // initialize tx state from rpc type
    if (rpcTx.type !== undefined)
      isOutgoing = MoneroWalletRpc._decodeRpcType(rpcTx.type, tx);
    else
      assert.equal(
        typeof isOutgoing,
        "boolean",
        "Must indicate if tx is outgoing (true) xor incoming (false) since unknown"
      );

    // TODO: safe set
    // initialize remaining fields  TODO: seems this should be part of common function with DaemonRpc._convertRpcTx
    let header;
    let transfer;
    for (let key of Object.keys(rpcTx)) {
      let val = rpcTx[key];
      if (key === "txid") tx.setHash(val);
      else if (key === "tx_hash") tx.setHash(val);
      else if (key === "fee") tx.setFee(BigInt(val));
      else if (key === "note") {
        if (val) tx.setNote(val);
      } else if (key === "tx_key") tx.setKey(val);
      else if (key === "type") {
      } // type already handled
      else if (key === "tx_size") tx.setSize(val);
      else if (key === "unlock_time") tx.setUnlockHeight(val);
      else if (key === "weight") tx.setWeight(val);
      else if (key === "locked") tx.setIsLocked(val);
      else if (key === "tx_blob") tx.setFullHex(val);
      else if (key === "tx_metadata") tx.setMetadata(val);
      else if (key === "double_spend_seen") tx.setIsDoubleSpend(val);
      else if (key === "block_height" || key === "height") {
        if (tx.isConfirmed()) {
          // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
          if (!header) header = new MoneroBlockHeader();
          header.setHeight(val);
        }
      } else if (key === "timestamp") {
        if (tx.isConfirmed()) {
          // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
          if (!header) header = new MoneroBlockHeader();
          header.setTimestamp(val);
        } else {
          // timestamp of unconfirmed tx is current request time
        }
      } else if (key === "confirmations") tx.setNumConfirmations(val);
      else if (key === "suggested_confirmations_threshold") {
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        if (transfer === undefined)
          transfer = (
            isOutgoing
              ? new MoneroOutgoingTransfer()
              : new MoneroIncomingTransfer()
          ).setTx(tx);
        // @ts-expect-error TS(2339): Property 'setNumSuggestedConfirmations' does not e... Remove this comment to see the full error message
        if (!isOutgoing) transfer.setNumSuggestedConfirmations(val);
      } else if (key === "amount") {
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        if (transfer === undefined)
          transfer = (
            isOutgoing
              ? new MoneroOutgoingTransfer()
              : new MoneroIncomingTransfer()
          ).setTx(tx);
        transfer.setAmount(BigInt(val));
      } else if (key === "amounts") {
      } // ignoring, amounts sum to amount
      else if (key === "address") {
        if (!isOutgoing) {
          // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
          if (!transfer) transfer = new MoneroIncomingTransfer().setTx(tx);
          // @ts-expect-error TS(2339): Property 'setAddress' does not exist on type 'Mone... Remove this comment to see the full error message
          transfer.setAddress(val);
        }
      } else if (key === "payment_id") {
        // @ts-expect-error TS(2339): Property 'DEFAULT_PAYMENT_ID' does not exist on ty... Remove this comment to see the full error message
        if ("" !== val && MoneroTxWallet.DEFAULT_PAYMENT_ID !== val)
          tx.setPaymentId(val); // default is undefined
      } else if (key === "subaddr_index")
        assert(rpcTx.subaddr_indices); // handled by subaddr_indices
      else if (key === "subaddr_indices") {
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        if (!transfer)
          transfer = (
            isOutgoing
              ? new MoneroOutgoingTransfer()
              : new MoneroIncomingTransfer()
          ).setTx(tx);
        let rpcIndices = val;
        transfer.setAccountIndex(rpcIndices[0].major);
        if (isOutgoing) {
          let subaddressIndices = [];
          for (let rpcIndex of rpcIndices)
            subaddressIndices.push(rpcIndex.minor);
          // @ts-expect-error TS(2339): Property 'setSubaddressIndices' does not exist on ... Remove this comment to see the full error message
          transfer.setSubaddressIndices(subaddressIndices);
        } else {
          assert.equal(rpcIndices.length, 1);
          // @ts-expect-error TS(2339): Property 'setSubaddressIndex' does not exist on ty... Remove this comment to see the full error message
          transfer.setSubaddressIndex(rpcIndices[0].minor);
        }
      } else if (key === "destinations" || key == "recipients") {
        assert(isOutgoing);
        let destinations = [];
        for (let rpcDestination of val) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 0.
          let destination = new MoneroDestination();
          destinations.push(destination);
          for (let destinationKey of Object.keys(rpcDestination)) {
            if (destinationKey === "address")
              destination.setAddress(rpcDestination[destinationKey]);
            else if (destinationKey === "amount")
              destination.setAmount(BigInt(rpcDestination[destinationKey]));
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            else
              throw new MoneroError(
                "Unrecognized transaction destination field: " + destinationKey
              );
          }
        }
        if (transfer === undefined)
          transfer = new MoneroOutgoingTransfer({ tx: tx });
        // @ts-expect-error TS(2339): Property 'setDestinations' does not exist on type ... Remove this comment to see the full error message
        transfer.setDestinations(destinations);
      } else if (key === "multisig_txset" && val !== undefined) {
      } // handled elsewhere; this method only builds a tx wallet
      else if (key === "unsigned_txset" && val !== undefined) {
      } // handled elsewhere; this method only builds a tx wallet
      else if (key === "amount_in") tx.setInputSum(BigInt(val));
      else if (key === "amount_out") tx.setOutputSum(BigInt(val));
      else if (key === "change_address")
        tx.setChangeAddress(val === "" ? undefined : val);
      else if (key === "change_amount") tx.setChangeAmount(BigInt(val));
      else if (key === "dummy_outputs") tx.setNumDummyOutputs(val);
      else if (key === "extra") tx.setExtraHex(val);
      else if (key === "ring_size") tx.setRingSize(val);
      else if (key === "spent_key_images") {
        let inputKeyImages = val.key_images;
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        GenUtils.assertTrue(tx.getInputs() === undefined);
        tx.setInputs([]);
        for (let inputKeyImage of inputKeyImages) {
          // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
          tx.getInputs().push(
            new MoneroOutputWallet()
              .setKeyImage(new MoneroKeyImage().setHex(inputKeyImage))
              .setTx(tx)
          );
        }
      } else
        console.log(
          "WARNING: ignoring unexpected transaction field: " + key + ": " + val
        );
    }

    // link block and tx
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (header) tx.setBlock(new MoneroBlock(header).setTxs([tx]));

    // initialize final fields
    if (transfer) {
      if (tx.isConfirmed() === undefined) tx.setIsConfirmed(false);
      if (!transfer.getTx().isConfirmed()) tx.setNumConfirmations(0);
      if (isOutgoing) {
        tx.setIsOutgoing(true);
        if (tx.getOutgoingTransfer()) tx.getOutgoingTransfer().merge(transfer);
        else tx.setOutgoingTransfer(transfer);
      } else {
        tx.setIsIncoming(true);
        tx.setIncomingTransfers([transfer]);
      }
    }

    // return initialized transaction
    return tx;
  }

  static _convertRpcTxWalletWithOutput(rpcOutput: any) {
    // initialize tx
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let tx = new MoneroTxWallet();
    tx.setIsConfirmed(true);
    tx.setIsRelayed(true);
    tx.setIsFailed(false);

    // initialize output
    let output = new MoneroOutputWallet({ tx: tx });
    for (let key of Object.keys(rpcOutput)) {
      let val = rpcOutput[key];
      if (key === "amount") output.setAmount(BigInt(val));
      else if (key === "spent") output.setIsSpent(val);
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      else if (key === "key_image") {
        if ("" !== val) output.setKeyImage(new MoneroKeyImage(val));
      } else if (key === "global_index") output.setIndex(val);
      else if (key === "tx_hash") tx.setHash(val);
      else if (key === "unlocked") tx.setIsLocked(!val);
      else if (key === "frozen") output.setIsFrozen(val);
      else if (key === "pubkey") output.setStealthPublicKey(val);
      else if (key === "subaddr_index") {
        output.setAccountIndex(val.major);
        output.setSubaddressIndex(val.minor);
      }
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 0.
      else if (key === "block_height")
        tx.setBlock(new MoneroBlock().setHeight(val).setTxs([tx]));
      else
        console.log(
          "WARNING: ignoring unexpected transaction field: " + key + ": " + val
        );
    }

    // initialize tx with output
    tx.setOutputs([output]);
    return tx;
  }

  static _convertRpcDescribeTransfer(rpcDescribeTransferResult: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let txSet = new MoneroTxSet();
    for (let key of Object.keys(rpcDescribeTransferResult)) {
      let val = rpcDescribeTransferResult[key];
      if (key === "desc") {
        txSet.setTxs([]);
        for (let txMap of val) {
          let tx = MoneroWalletRpc._convertRpcTxWithTransfer(
            txMap,
            undefined,
            true
          );
          tx.setTxSet(txSet);
          txSet.txs.push(tx);
        }
      } else if (key === "summary") {
      } // TODO: support tx set summary fields?
      else
        console.log(
          "WARNING: ignoring unexpected descdribe transfer field: " +
            key +
            ": " +
            val
        );
    }
    return txSet;
  }

  /**
   * Decodes a "type" from monero-wallet-rpc to initialize type and state
   * fields in the given transaction.
   *
   * TODO: these should be safe set
   *
   * @param rpcType is the type to decode
   * @param tx is the transaction to decode known fields to
   * @return {boolean} true if the rpc type indicates outgoing xor incoming
   */
  static _decodeRpcType(rpcType: any, tx: any) {
    let isOutgoing;
    if (rpcType === "in") {
      isOutgoing = false;
      tx.setIsConfirmed(true);
      tx.setInTxPool(false);
      tx.setIsRelayed(true);
      tx.setRelay(true);
      tx.setIsFailed(false);
      tx.setIsMinerTx(false);
    } else if (rpcType === "out") {
      isOutgoing = true;
      tx.setIsConfirmed(true);
      tx.setInTxPool(false);
      tx.setIsRelayed(true);
      tx.setRelay(true);
      tx.setIsFailed(false);
      tx.setIsMinerTx(false);
    } else if (rpcType === "pool") {
      isOutgoing = false;
      tx.setIsConfirmed(false);
      tx.setInTxPool(true);
      tx.setIsRelayed(true);
      tx.setRelay(true);
      tx.setIsFailed(false);
      tx.setIsMinerTx(false); // TODO: but could it be?
    } else if (rpcType === "pending") {
      isOutgoing = true;
      tx.setIsConfirmed(false);
      tx.setInTxPool(true);
      tx.setIsRelayed(true);
      tx.setRelay(true);
      tx.setIsFailed(false);
      tx.setIsMinerTx(false);
    } else if (rpcType === "block") {
      isOutgoing = false;
      tx.setIsConfirmed(true);
      tx.setInTxPool(false);
      tx.setIsRelayed(true);
      tx.setRelay(true);
      tx.setIsFailed(false);
      tx.setIsMinerTx(true);
    } else if (rpcType === "failed") {
      isOutgoing = true;
      tx.setIsConfirmed(false);
      tx.setInTxPool(false);
      tx.setIsRelayed(true);
      tx.setRelay(true);
      tx.setIsFailed(true);
      tx.setIsMinerTx(false);
    } else {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      throw new MoneroError("Unrecognized transfer type: " + rpcType);
    }
    return isOutgoing;
  }

  /**
   * Merges a transaction into a unique set of transactions.
   *
   * @param {MoneroTxWallet} tx - the transaction to merge into the existing txs
   * @param {Object} txMap - maps tx hashes to txs
   * @param {Object} blockMap - maps block heights to blocks
   */
  static _mergeTx(tx: any, txMap: any, blockMap: any) {
    assert(tx.getHash() !== undefined);

    // merge tx
    let aTx = txMap[tx.getHash()];
    if (aTx === undefined) txMap[tx.getHash()] = tx; // cache new tx
    else aTx.merge(tx); // merge with existing tx

    // merge tx's block if confirmed
    if (tx.getHeight() !== undefined) {
      let aBlock = blockMap[tx.getHeight()];
      if (aBlock === undefined)
        blockMap[tx.getHeight()] = tx.getBlock(); // cache new block
      else aBlock.merge(tx.getBlock()); // merge with existing block
    }
  }

  /**
   * Compares two transactions by their height.
   */
  static _compareTxsByHeight(tx1: any, tx2: any) {
    if (tx1.getHeight() === undefined && tx2.getHeight() === undefined)
      return 0; // both unconfirmed
    else if (tx1.getHeight() === undefined) return 1; // tx1 is unconfirmed
    else if (tx2.getHeight() === undefined) return -1; // tx2 is unconfirmed
    let diff = tx1.getHeight() - tx2.getHeight();
    if (diff !== 0) return diff;
    return tx1.getBlock().txs.indexOf(tx1) - tx2.getBlock().txs.indexOf(tx2); // txs are in the same block so retain their original order
  }

  /**
   * Compares two transfers by ascending account and subaddress indices.
   */
  static _compareIncomingTransfers(t1: any, t2: any) {
    if (t1.getAccountIndex() < t2.getAccountIndex()) return -1;
    else if (t1.getAccountIndex() === t2.getAccountIndex())
      return t1.getSubaddressIndex() - t2.getSubaddressIndex();
    return 1;
  }

  /**
   * Compares two outputs by ascending account and subaddress indices.
   */
  static _compareOutputs(o1: any, o2: any) {
    // compare by height
    let heightComparison = MoneroWalletRpc._compareTxsByHeight(
      o1.getTx(),
      o2.getTx()
    );
    if (heightComparison !== 0) return heightComparison;

    // compare by account index, subaddress index, output index, then key image hex
    let compare = o1.getAccountIndex() - o2.getAccountIndex();
    if (compare !== 0) return compare;
    compare = o1.getSubaddressIndex() - o2.getSubaddressIndex();
    if (compare !== 0) return compare;
    compare = o1.getIndex() - o2.getIndex();
    if (compare !== 0) return compare;
    return o1.getKeyImage().hex.localeCompare(o2.getKeyImage().hex);
  }
}

/**
 * Polls monero-wallet-rpc to provide listener notifications.
 *
 * @class
 * @ignore
 */
class WalletPoller {
  _isPolling: any;
  _looper: any;
  _numPolling: any;
  _prevBalances: any;
  _prevConfirmedNotifications: any;
  _prevLockedTxs: any;
  _prevUnconfirmedNotifications: any;
  _threadPool: any;
  _wallet: any;

  constructor(wallet: any) {
    let that = this;
    this._wallet = wallet;
    this._looper = new TaskLooper(async function () {
      await that.poll();
    });
    this._prevLockedTxs = [];
    this._prevUnconfirmedNotifications = new Set(); // tx hashes of previous notifications
    this._prevConfirmedNotifications = new Set(); // tx hashes of previously confirmed but not yet unlocked notifications
    this._threadPool = new ThreadPool(1); // synchronize polls
    this._numPolling = 0;
  }

  setIsPolling(isPolling: any) {
    this._isPolling = isPolling;
    if (isPolling) this._looper.start(this._wallet.syncPeriodInMs);
    else this._looper.stop();
  }

  setPeriodInMs(periodInMs: any) {
    this._looper.setPeriodInMs(periodInMs);
  }

  async poll() {
    // synchronize polls
    let that = this;
    return this._threadPool.submit(async function () {
      try {
        // skip if next poll is already queued
        if (that._numPolling > 1) return;
        that._numPolling++;

        // skip if wallet is closed
        if (await that._wallet.isClosed()) return;

        // take initial snapshot
        // @ts-expect-error TS(2339): Property '_prevHeight' does not exist on type 'Wal... Remove this comment to see the full error message
        if (that._prevHeight === undefined) {
          // @ts-expect-error TS(2339): Property '_prevHeight' does not exist on type 'Wal... Remove this comment to see the full error message
          that._prevHeight = await that._wallet.getHeight();
          // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
          that._prevLockedTxs = await that._wallet.getTxs(
            new MoneroTxQuery().setIsLocked(true)
          );
          that._prevBalances = await that._wallet._getBalances();
          that._numPolling--;
          return;
        }

        // announce height changes
        let height = await that._wallet.getHeight();
        // @ts-expect-error TS(2339): Property '_prevHeight' does not exist on type 'Wal... Remove this comment to see the full error message
        if (that._prevHeight !== height) {
          // @ts-expect-error TS(2339): Property '_prevHeight' does not exist on type 'Wal... Remove this comment to see the full error message
          for (let i = that._prevHeight; i < height; i++)
            await that._onNewBlock(i);
          // @ts-expect-error TS(2339): Property '_prevHeight' does not exist on type 'Wal... Remove this comment to see the full error message
          that._prevHeight = height;
        }

        // get locked txs for comparison to previous
        let minHeight = Math.max(0, height - 70); // only monitor recent txs
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        let lockedTxs = await that._wallet.getTxs(
          new MoneroTxQuery()
            .setIsLocked(true)
            .setMinHeight(minHeight)
            .setIncludeOutputs(true)
        );

        // collect hashes of txs no longer locked
        let noLongerLockedHashes = [];
        for (let prevLockedTx of that._prevLockedTxs) {
          if (that._getTx(lockedTxs, prevLockedTx.getHash()) === undefined) {
            noLongerLockedHashes.push(prevLockedTx.getHash());
          }
        }

        // save locked txs for next comparison
        that._prevLockedTxs = lockedTxs;

        // fetch txs which are no longer locked
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        let unlockedTxs =
          noLongerLockedHashes.length === 0
            ? []
            : await that._wallet.getTxs(
                new MoneroTxQuery()
                  .setIsLocked(false)
                  .setMinHeight(minHeight)
                  .setHashes(noLongerLockedHashes)
                  .setIncludeOutputs(true),
                []
              ); // ignore missing tx hashes which could be removed due to re-org

        // announce new unconfirmed and confirmed outputs
        for (let lockedTx of lockedTxs) {
          let searchSet = lockedTx.isConfirmed()
            ? that._prevConfirmedNotifications
            : that._prevUnconfirmedNotifications;
          let unannounced = !searchSet.has(lockedTx.getHash());
          searchSet.add(lockedTx.getHash());
          if (unannounced) await that._notifyOutputs(lockedTx);
        }

        // announce new unlocked outputs
        for (let unlockedTx of unlockedTxs) {
          that._prevUnconfirmedNotifications.delete(unlockedTx.getHash());
          that._prevConfirmedNotifications.delete(unlockedTx.getHash());
          await that._notifyOutputs(unlockedTx);
        }

        // announce balance changes
        await that._checkForChangedBalances();
        that._numPolling--;
      } catch (err) {
        that._numPolling--;
        console.error(
          "Failed to background poll " + (await that._wallet.getPath())
        );
      }
    });
  }

  async _onNewBlock(height: any) {
    for (let listener of this._wallet.getListeners())
      await listener.onNewBlock(height);
  }

  async _notifyOutputs(tx: any) {
    // notify spent outputs // TODO (monero-project): monero-wallet-rpc does not allow scrape of tx inputs so providing one input with outgoing amount
    if (tx.getOutgoingTransfer() !== undefined) {
      assert(tx.getInputs() === undefined);
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      let output = new MoneroOutputWallet()
        .setAmount(tx.getOutgoingTransfer().getAmount() + tx.getFee())
        .setAccountIndex(tx.getOutgoingTransfer().getAccountIndex())
        .setSubaddressIndex(
          tx.getOutgoingTransfer().getSubaddressIndices().length === 1
            ? tx.getOutgoingTransfer().getSubaddressIndices()[0]
            : undefined
        ) // initialize if transfer sourced from single subaddress
        .setTx(tx);
      tx.setInputs([output]);
      for (let listener of this._wallet.getListeners())
        await listener.onOutputSpent(output);
    }

    // notify received outputs
    if (tx.getIncomingTransfers() !== undefined) {
      if (tx.getOutputs() !== undefined && tx.getOutputs().length > 0) {
        // TODO (monero-project): outputs only returned for confirmed txs
        for (let output of tx.getOutputs()) {
          for (let listener of this._wallet.getListeners())
            await listener.onOutputReceived(output);
        }
      } else {
        // TODO (monero-project): monero-wallet-rpc does not allow scrape of unconfirmed received outputs so using incoming transfer values
        let outputs = [];
        for (let transfer of tx.getIncomingTransfers()) {
          // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
          outputs.push(
            new MoneroOutputWallet()
              .setAccountIndex(transfer.getAccountIndex())
              .setSubaddressIndex(transfer.getSubaddressIndex())
              .setAmount(transfer.getAmount())
              .setTx(tx)
          );
        }
        tx.setOutputs(outputs);
        for (let listener of this._wallet.getListeners()) {
          for (let output of tx.getOutputs())
            await listener.onOutputReceived(output);
        }
      }
    }
  }

  _getTx(txs: any, txHash: any) {
    for (let tx of txs) if (txHash === tx.getHash()) return tx;
    return undefined;
  }

  async _checkForChangedBalances() {
    let balances = await this._wallet._getBalances();
    if (
      GenUtils.compareBigInt(balances[0], this._prevBalances[0]) !== 0 ||
      GenUtils.compareBigInt(balances[1], this._prevBalances[1]) !== 0
    ) {
      this._prevBalances = balances;
      for (let listener of await this._wallet.getListeners())
        await listener.onBalancesChanged(balances[0], balances[1]);
      return true;
    }
    return false;
  }
}

// @ts-expect-error TS(2339): Property 'DEFAULT_SYNC_PERIOD_IN_MS' does not exis... Remove this comment to see the full error message
MoneroWalletRpc.DEFAULT_SYNC_PERIOD_IN_MS = 20000; // default period between syncs in ms (defined by DEFAULT_AUTO_REFRESH_PERIOD in wallet_rpc_server.cpp)

export default MoneroWalletRpc;
