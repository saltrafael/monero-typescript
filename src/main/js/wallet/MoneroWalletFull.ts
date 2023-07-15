import assert from "assert";
import * as nodejsfs from "fs";
import Path from "path";
import GenUtils from "../common/GenUtils";
import LibraryUtils from "../common/LibraryUtils";
import TaskLooper from "../common/TaskLooper";
import MoneroAccount from "./model/MoneroAccount";
import MoneroAddressBookEntry from "./model/MoneroAddressBookEntry";
import MoneroBlock from "../daemon/model/MoneroBlock";
import MoneroCheckTx from "./model/MoneroCheckTx";
import MoneroCheckReserve from "./model/MoneroCheckReserve";
import MoneroDaemonRpc from "../daemon/MoneroDaemonRpc";
import MoneroError from "../common/MoneroError";
import MoneroIntegratedAddress from "./model/MoneroIntegratedAddress";
import MoneroKeyImage from "../daemon/model/MoneroKeyImage";
import MoneroKeyImageImportResult from "./model/MoneroKeyImageImportResult";
import MoneroMultisigInfo from "./model/MoneroMultisigInfo";
import MoneroMultisigInitResult from "./model/MoneroMultisigInitResult";
import MoneroMultisigSignResult from "./model/MoneroMultisigSignResult";
import MoneroNetworkType from "../daemon/model/MoneroNetworkType";
import MoneroOutputWallet from "./model/MoneroOutputWallet";
import MoneroRpcConnection from "../common/MoneroRpcConnection";
import MoneroSubaddress from "./model/MoneroSubaddress";
import MoneroSyncResult from "./model/MoneroSyncResult";
import MoneroTxConfig from "./model/MoneroTxConfig";
import MoneroTxSet from "./model/MoneroTxSet";
import MoneroTxWallet from "./model/MoneroTxWallet";
import MoneroWallet from "./MoneroWallet";
import MoneroWalletConfig, {
  MoneroWalletConfigOpts,
} from "./model/MoneroWalletConfig";
import MoneroWalletKeys from "./MoneroWalletKeys";
import MoneroWalletListener from "./model/MoneroWalletListener";
import MoneroMessageSignatureType from "./model/MoneroMessageSignatureType";
import MoneroMessageSignatureResult from "./model/MoneroMessageSignatureResult";

/**
 * Implements a Monero wallet using fully client-side WebAssembly bindings to monero-project's wallet2 in C++.
 *
 * @extends {MoneroWalletKeys}
 * @implements {MoneroWallet}
 * @hideconstructor
 */
class MoneroWalletFull extends MoneroWalletKeys {
  _browserMainPath: any;
  _fs: any;
  _fullListener: any;
  _fullListenerHandle: any;
  _listeners: any;
  _password: any;
  _path: any;
  _rejectUnauthorized: any;
  _rejectUnauthorizedConfigId: any;
  _syncLooper: any;
  _syncPeriodInMs: any;

  // --------------------------- STATIC UTILITIES -----------------------------

  /**
   * Check if a wallet exists at a given path.
   *
   * @param {string} path - path of the wallet on the file system
   * @param {typeof nodejsfs} - Node.js compatible file system to use (optional, defaults to disk if nodejs)
   * @return {boolean} true if a wallet exists at the given path, false otherwise
   */
  static walletExists(path: string, fs: typeof nodejsfs) {
    assert(path, "Must provide a path to look for a wallet");
    if (!fs) fs = MoneroWalletFull._getFs();
    if (!fs)
      throw new MoneroError(
        "Must provide file system to check if wallet exists"
      );
    const exists = fs.existsSync(path + ".keys");
    LibraryUtils.instance.log(1, "Wallet exists at " + path + ": " + exists);
    return exists;
  }

  /**
   * <p>Open an existing wallet using WebAssembly bindings to wallet2.h.</p>
   *
   * <p>Examples:<p>
   *
   * <code>
   * let wallet1 = await MoneroWalletFull.openWallet(<br>
   * &nbsp;&nbsp; "./wallets/wallet1",<br>
   * &nbsp;&nbsp; "supersecretpassword",<br>
   * &nbsp;&nbsp; MoneroNetworkType.STAGENET,<br>
   * &nbsp;&nbsp; "http://localhost:38081" // daemon uri<br>
   * );<br><br>
   *
   * let wallet2 = await MoneroWalletFull.openWallet({<br>
   * &nbsp;&nbsp; path: "./wallets/wallet2",<br>
   * &nbsp;&nbsp; password: "supersecretpassword",<br>
   * &nbsp;&nbsp; networkType: MoneroNetworkType.STAGENET,<br>
   * &nbsp;&nbsp; serverUri: "http://localhost:38081", // daemon configuration<br>
   * &nbsp;&nbsp; serverUsername: "superuser",<br>
   * &nbsp;&nbsp; serverPassword: "abctesting123"<br>
   * });
   * </code>
   *
   * @param {MoneroWalletConfig|object|string} configOrPath - MoneroWalletConfig or equivalent config object or a path to a wallet to open
   * @param {string} configOrPath.path - path of the wallet to open (optional if 'keysData' provided)
   * @param {string} configOrPath.password - password of the wallet to open
   * @param {string|number} configOrPath.networkType - network type of the wallet to open (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
   * @param {Uint8Array} configOrPath.keysData - wallet keys data to open (optional if path provided)
   * @param {Uint8Array} [configOrPath.cacheData] - wallet cache data to open (optional)
   * @param {string} [configOrPath.serverUri] - uri of the wallet's daemon (optional)
   * @param {string} [configOrPath.serverUsername] - username to authenticate with the daemon (optional)
   * @param {string} [configOrPath.serverPassword] - password to authenticate with the daemon (optional)
   * @param {boolean} [configOrPath.rejectUnauthorized] - reject self-signed server certificates if true (default true)
   * @param {MoneroRpcConnection|object} [configOrPath.server] - MoneroRpcConnection or equivalent JS object configuring the daemon connection (optional)
   * @param {boolean} [configOrPath.proxyToWorker] - proxies wallet operations to a worker in order to not block the main thread (default true)
   * @param {typeof nodejsfs} [configOrPath.fs] - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
   * @param {string} password - password of the wallet to open
   * @param {string|number} networkType - network type of the wallet to open
   * @param {string|MoneroRpcConnection} daemonUriOrConnection - daemon URI or MoneroRpcConnection
   * @param {boolean} [proxyToWorker] - proxies wallet operations to a worker in order to not block the main thread (default true)
   * @param {FileSystem} [fs] - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
   * @return {Promise<MoneroWalletFull>} the opened wallet
   */
  static async openWallet(
    configOrPath: MoneroWalletConfig | string | MoneroWalletConfigOpts,
    password: string,
    networkType: string | number,
    daemonUriOrConnection: string | MoneroRpcConnection,
    proxyToWorker: boolean = true,
    fs: typeof nodejsfs
  ): Promise<MoneroWalletFull> {
    // normalize and validate config
    let config;
    if (typeof configOrPath === "object") {
      config =
        configOrPath instanceof MoneroWalletConfig
          ? configOrPath
          : new MoneroWalletConfig(configOrPath);
      if (
        password !== undefined ||
        networkType !== undefined ||
        daemonUriOrConnection !== undefined ||
        proxyToWorker !== undefined ||
        fs !== undefined
      )
        throw new MoneroError(
          "Can specify config object or params but not both when opening WASM wallet"
        );
    } else {
      config = new MoneroWalletConfig({
        path: configOrPath,
        password,
        networkType,
        proxyToWorker,
        fs,
      });
      if (typeof daemonUriOrConnection === "object")
        config.server = daemonUriOrConnection;
      else config.serverUri = daemonUriOrConnection;
    }

    if (config.proxyToWorker === undefined) config.proxyToWorker = true;
    if (config.mnemonic !== undefined)
      throw new MoneroError("Cannot specify mnemonic when opening wallet");
    if (config.seedOffset !== undefined)
      throw new MoneroError("Cannot specify seed offset when opening wallet");
    if (config.primaryAddress !== undefined)
      throw new MoneroError(
        "Cannot specify primary address when opening wallet"
      );
    if (config.privateViewKey !== undefined)
      throw new MoneroError(
        "Cannot specify private view key when opening wallet"
      );
    if (config.privateSpendKey !== undefined)
      throw new MoneroError(
        "Cannot specify private spend key when opening wallet"
      );
    if (config.restoreHeight !== undefined)
      throw new MoneroError(
        "Cannot specify restore height when opening wallet"
      );
    if (config.language !== undefined)
      throw new MoneroError("Cannot specify language when opening wallet");
    if (config.saveCurrent === true)
      throw new MoneroError(
        "Cannot save current wallet when opening JNI wallet"
      );

    // read wallet data from disk if not provided
    if (!config.keysData) {
      const fs = config.fs ? config.fs : MoneroWalletFull._getFs();
      if (!fs)
        throw new MoneroError(
          "Must provide file system to read wallet data from"
        );
      if (!this.walletExists(config.path, fs))
        throw new MoneroError("Wallet does not exist at path: " + config.path);
      config.keysData = fs.readFileSync(config.path + ".keys");
      config.cacheData = fs.existsSync(config.path)
        ? fs.readFileSync(config.path)
        : "";
    }

    // open wallet from data
    return MoneroWalletFull._openWalletData(
      config.path,
      config.password,
      config.networkType,
      config.keysData,
      config.cacheData,
      config.server,
      config.proxyToWorker,
      config.fs
    );
  }

  /**
   * <p>Create a wallet using WebAssembly bindings to wallet2.h.<p>
   *
   * <p>Example:</p>
   *
   * <code>
   * let wallet = await MoneroWalletFull.createWallet({<br>
   * &nbsp;&nbsp; path: "./test_wallets/wallet1", // leave blank for in-memory wallet<br>
   * &nbsp;&nbsp; password: "supersecretpassword",<br>
   * &nbsp;&nbsp; networkType: MoneroNetworkType.STAGENET,<br>
   * &nbsp;&nbsp; mnemonic: "coexist igloo pamphlet lagoon...",<br>
   * &nbsp;&nbsp; restoreHeight: 1543218,<br>
   * &nbsp;&nbsp; server: new MoneroRpcConnection("http://localhost:38081", "daemon_user", "daemon_password_123"),<br>
   * });
   * </code>
   *
   * @param {object|MoneroWalletConfig} config - MoneroWalletConfig or equivalent config object
   * @param {string} config.path - path of the wallet to create (optional, in-memory wallet if not given)
   * @param {string} config.password - password of the wallet to create
   * @param {string|number} config.networkType - network type of the wallet to create (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
   * @param {string} config.mnemonic - mnemonic of the wallet to create (optional, random wallet created if neither mnemonic nor keys given)
   * @param {string} config.seedOffset - the offset used to derive a new seed from the given mnemonic to recover a secret wallet from the mnemonic phrase
   * @param {string} config.primaryAddress - primary address of the wallet to create (only provide if restoring from keys)
   * @param {string} [config.privateViewKey] - private view key of the wallet to create (optional)
   * @param {string} [config.privateSpendKey] - private spend key of the wallet to create (optional)
   * @param {number} [config.restoreHeight] - block height to start scanning from (defaults to 0 unless generating random wallet)
   * @param {string} [config.language] - language of the wallet's mnemonic phrase (defaults to "English" or auto-detected)
   * @param {string} [config.serverUri] - uri of the wallet's daemon (optional)
   * @param {string} [config.serverUsername] - username to authenticate with the daemon (optional)
   * @param {string} [config.serverPassword] - password to authenticate with the daemon (optional)
   * @param {boolean} [config.rejectUnauthorized] - reject self-signed server certificates if true (defaults to true)
   * @param {MoneroRpcConnection|object} [config.server] - MoneroRpcConnection or equivalent JS object providing daemon configuration (optional)
   * @param {boolean} [config.proxyToWorker] - proxies wallet operations to a worker in order to not block the main thread (default true)
   * @param {typeof nodejsfs} [config.fs] - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
   * @return {Promise<MoneroWalletFull>} the created wallet
   */
  static async createWallet(
    config?: MoneroWalletConfigOpts | MoneroWalletConfig
  ): Promise<MoneroWalletFull> {
    // normalize and validate config
    if (config === undefined)
      throw new MoneroError("Must provide config to create wallet");
    config =
      config instanceof MoneroWalletConfig
        ? config
        : new MoneroWalletConfig(config);
    if (
      config.mnemonic !== undefined &&
      (config.primaryAddress !== undefined ||
        config.privateViewKey !== undefined ||
        config.privateSpendKey !== undefined)
    ) {
      throw new MoneroError(
        "Wallet may be initialized with a mnemonic or keys but not both"
      );
    } // TODO: factor this much out to common
    if (config.networkType === undefined)
      throw new MoneroError(
        "Must provide a networkType: 'mainnet', 'testnet' or 'stagenet'"
      );
    MoneroNetworkType.validate(config.networkType);
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (config.saveCurrent === true)
      throw new MoneroError(
        "Cannot save current wallet when creating full WASM wallet"
      );
    if (config.path === undefined) config.path = "";
    if (
      config.path &&
      config.fs &&
      MoneroWalletFull.walletExists(config.path, config.fs)
    )
      throw new MoneroError("Wallet already exists: " + config.path);
    if (config.password === undefined) config.password = "";

    // create wallet
    if (config.mnemonic !== undefined) {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (config.language !== undefined)
        throw new MoneroError(
          "Cannot provide language when creating wallet from mnemonic"
        );
      return MoneroWalletFull._createWalletFromMnemonic(config);
    } else if (
      config.privateSpendKey !== undefined ||
      config.primaryAddress !== undefined
    ) {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (config.seedOffset !== undefined)
        throw new MoneroError(
          "Cannot provide seedOffset when creating wallet from keys"
        );
      return MoneroWalletFull._createWalletFromKeys(config);
    } else {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (config.seedOffset !== undefined)
        throw new MoneroError(
          "Cannot provide seedOffset when creating random wallet"
        );
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (config.restoreHeight !== undefined)
        throw new MoneroError(
          "Cannot provide restoreHeight when creating random wallet"
        );
      return MoneroWalletFull._createWalletRandom(config);
    }
  }

  static async _createWalletFromMnemonic(config: any) {
    if (config.proxyToWorker === undefined) config.setProxyToWorker(true);
    if (config.proxyToWorker)
      return MoneroWalletFullProxy._createWallet(config);

    // validate and normalize params
    let daemonConnection = config.server;
    let rejectUnauthorized = daemonConnection
      ? daemonConnection.getRejectUnauthorized()
      : true;
    if (config.restoreHeight === undefined) config.setRestoreHeight(0);
    if (config.seedOffset === undefined) config.setSeedOffset("");

    // load full wasm module
    let module = await LibraryUtils.instance.loadFullModule();

    // create wallet in queue
    let wallet = await module.queueTask(async function () {
      return new Promise(function (resolve, reject) {
        // register fn informing if unauthorized reqs should be rejected
        let rejectUnauthorizedFnId = GenUtils.getUUID();
        LibraryUtils.instance.setRejectUnauthorizedFn(
          rejectUnauthorizedFnId,
          function () {
            return rejectUnauthorized;
          }
        );

        // define callback for wasm
        const callbackFn = async function (cppAddress: any) {
          if (typeof cppAddress === "string")
            reject(new MoneroError(cppAddress));
          else
            resolve(
              new MoneroWalletFull(
                cppAddress,
                config.path,
                config.password,
                config.fs,
                config.getRejectUnauthorized(),
                rejectUnauthorizedFnId
              )
            );
        };

        // create wallet in wasm and invoke callback when done
        module.create_full_wallet(
          JSON.stringify(config.toJson()),
          rejectUnauthorizedFnId,
          callbackFn
        );
      });
    });

    // save wallet
    if (config.path) await wallet.save();
    return wallet;
  }

  static async _createWalletFromKeys(config: any) {
    if (config.proxyToWorker === undefined) config.setProxyToWorker(true);
    if (config.proxyToWorker)
      return MoneroWalletFullProxy._createWallet(config);

    // validate and normalize params
    MoneroNetworkType.validate(config.networkType);
    if (config.primaryAddress === undefined) config.setPrimaryAddress("");
    if (config.privateViewKey === undefined) config.setPrivateViewKey("");
    if (config.privateSpendKey === undefined) config.setPrivateSpendKey("");
    let daemonConnection = config.server;
    let rejectUnauthorized = daemonConnection
      ? daemonConnection.getRejectUnauthorized()
      : true;
    if (config.restoreHeight === undefined) config.setRestoreHeight(0);
    if (config.language === undefined) config.setLanguage("English");

    // load full wasm module
    let module = await LibraryUtils.instance.loadFullModule();

    // create wallet in queue
    let wallet = await module.queueTask(async function () {
      return new Promise(function (resolve, reject) {
        // register fn informing if unauthorized reqs should be rejected
        let rejectUnauthorizedFnId = GenUtils.getUUID();
        LibraryUtils.instance.setRejectUnauthorizedFn(
          rejectUnauthorizedFnId,
          function () {
            return rejectUnauthorized;
          }
        );

        // define callback for wasm
        let callbackFn = async function (cppAddress: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (typeof cppAddress === "string")
            reject(new MoneroError(cppAddress));
          else
            resolve(
              new MoneroWalletFull(
                cppAddress,
                config.path,
                config.password,
                config.fs,
                config.getRejectUnauthorized(),
                rejectUnauthorizedFnId
              )
            );
        };

        // create wallet in wasm and invoke callback when done
        module.create_full_wallet(
          JSON.stringify(config.toJson()),
          rejectUnauthorizedFnId,
          callbackFn
        );
      });
    });

    // save wallet
    if (config.path) await wallet.save();
    return wallet;
  }

  static async _createWalletRandom(config: any) {
    if (config.proxyToWorker === undefined) config.setProxyToWorker(true);
    if (config.proxyToWorker)
      return MoneroWalletFullProxy._createWallet(config);

    // validate and normalize params
    if (config.language === undefined) config.setLanguage("English");
    let daemonConnection = config.server;
    let rejectUnauthorized = daemonConnection
      ? daemonConnection.getRejectUnauthorized()
      : true;

    // load wasm module
    let module = await LibraryUtils.instance.loadFullModule();

    // create wallet in queue
    let wallet = await module.queueTask(async function () {
      return new Promise(function (resolve, reject) {
        // register fn informing if unauthorized reqs should be rejected
        let rejectUnauthorizedFnId = GenUtils.getUUID();
        LibraryUtils.instance.setRejectUnauthorizedFn(
          rejectUnauthorizedFnId,
          function () {
            return rejectUnauthorized;
          }
        );

        // define callback for wasm
        let callbackFn = async function (cppAddress: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (typeof cppAddress === "string")
            reject(new MoneroError(cppAddress));
          else
            resolve(
              new MoneroWalletFull(
                cppAddress,
                config.path,
                config.password,
                config.fs,
                config.getRejectUnauthorized(),
                rejectUnauthorizedFnId
              )
            );
        };

        // create wallet in wasm and invoke callback when done
        module.create_full_wallet(
          JSON.stringify(config.toJson()),
          rejectUnauthorizedFnId,
          callbackFn
        );
      });
    });

    // save wallet
    if (config.path) await wallet.save();
    return wallet;
  }

  static async getMnemonicLanguages() {
    let module = await LibraryUtils.instance.loadFullModule();
    return module.queueTask(async function () {
      return JSON.parse(module.get_keys_wallet_mnemonic_languages()).languages;
    });
  }

  // --------------------------- INSTANCE METHODS -----------------------------

  /**
   * Internal constructor which is given the memory address of a C++ wallet
   * instance.
   *
   * This method should not be called externally but should be called through
   * static wallet creation utilities in this class.
   *
   * @param {number} cppAddress - address of the wallet instance in C++
   * @param {string} path - path of the wallet instance
   * @param {string} password - password of the wallet instance
   * @param {typeof nodejsfs} fs - node.js-compatible file system to read/write wallet files
   * @param {boolean} rejectUnauthorized - specifies if unauthorized requests (e.g. self-signed certificates) should be rejected
   * @param {string} rejectUnauthorizedFnId - unique identifier for http_client_wasm to query rejectUnauthorized
   */
  constructor(
    cppAddress: any,
    path: any,
    password: any,
    fs: typeof nodejsfs,
    rejectUnauthorized: any,
    rejectUnauthorizedFnId: any
  ) {
    super(cppAddress);
    this._path = path;
    this._password = password;
    this._listeners = [];
    this._fs = fs ? fs : path ? MoneroWalletFull._getFs() : undefined;
    this._isClosed = false;
    this._fullListener = new WalletFullListener(this); // receives notifications from wasm c++
    this._fullListenerHandle = 0; // memory address of the wallet listener in c++
    this._rejectUnauthorized = rejectUnauthorized;
    this._rejectUnauthorizedConfigId = rejectUnauthorizedFnId;
    // @ts-expect-error TS(2339): Property 'DEFAULT_SYNC_PERIOD_IN_MS' does not exis... Remove this comment to see the full error message
    this._syncPeriodInMs = MoneroWalletFull.DEFAULT_SYNC_PERIOD_IN_MS;
    let that = this;
    LibraryUtils.instance.setRejectUnauthorizedFn(rejectUnauthorizedFnId, function () {
      return that._rejectUnauthorized;
    }); // register fn informing if unauthorized reqs should be rejected
  }

  // ------------ WALLET METHODS SPECIFIC TO WASM IMPLEMENTATION --------------

  /**
   * Get the maximum height of the peers the wallet's daemon is connected to.
   *
   * @return {number} the maximum height of the peers the wallet's daemon is connected to
   */
  async getDaemonMaxPeerHeight() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (resp: any) {
          resolve(resp);
        };

        // call wasm and invoke callback when done
        that._module.get_daemon_max_peer_height(that._cppAddress, callbackFn);
      });
    });
  }

  /**
   * Indicates if the wallet's daemon is synced with the network.
   *
   * @return {boolean} true if the daemon is synced with the network, false otherwise
   */
  async isDaemonSynced() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (resp: any) {
          resolve(resp);
        };

        // call wasm and invoke callback when done
        that._module.is_daemon_synced(that._cppAddress, callbackFn);
      });
    });
  }

  /**
   * Indicates if the wallet is synced with the daemon.
   *
   * @return {boolean} true if the wallet is synced with the daemon, false otherwise
   */
  async isSynced() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (resp: any) {
          resolve(resp);
        };

        // call wasm and invoke callback when done
        that._module.is_synced(that._cppAddress, callbackFn);
      });
    });
  }

  /**
   * Get the wallet's network type (mainnet, testnet, or stagenet).
   *
   * @return {MoneroNetworkType} the wallet's network type
   */
  async getNetworkType() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.get_network_type(that._cppAddress);
    });
  }

  /**
   * Get the height of the first block that the wallet scans.
   *
   * @return {number} the height of the first block that the wallet scans
   */
  async getRestoreHeight() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.get_restore_height(that._cppAddress);
    });
  }

  /**
   * Set the height of the first block that the wallet scans.
   *
   * @param {number} restoreHeight - height of the first block that the wallet scans
   */
  async setRestoreHeight(restoreHeight: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.set_restore_height(that._cppAddress, restoreHeight);
    });
  }

  /**
   * Move the wallet from its current path to the given path.
   *
   * @param {string} path - the wallet's destination path
   */
  async moveTo(path: any) {
    return MoneroWalletFull._moveTo(path, this);
  }

  // -------------------------- COMMON WALLET METHODS -------------------------

  async addListener(listener: any) {
    this._assertNotClosed();
    assert(
      listener instanceof MoneroWalletListener,
      "Listener must be instance of MoneroWalletListener"
    );
    this._listeners.push(listener);
    await this._refreshListening();
  }

  async removeListener(listener: any) {
    this._assertNotClosed();
    let idx = this._listeners.indexOf(listener);
    if (idx > -1) this._listeners.splice(idx, 1);
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    else throw new MoneroError("Listener is not registered with wallet");
    await this._refreshListening();
  }

  getListeners() {
    this._assertNotClosed();
    return this._listeners;
  }

  async setDaemonConnection(uriOrRpcConnection: any) {
    this._assertNotClosed();

    // normalize connection
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
    let connection = !uriOrRpcConnection
      ? undefined
      : uriOrRpcConnection instanceof MoneroRpcConnection
      ? uriOrRpcConnection
      : new MoneroRpcConnection(uriOrRpcConnection);
    let uri = connection && connection.uri() ? connection.uri() : "";
    let username =
      connection && connection.username() ? connection.username() : "";
    let password =
      connection && connection.password() ? connection.password() : "";
    let rejectUnauthorized = connection
      ? connection.rejectUnauthorized()
      : undefined;
    this._rejectUnauthorized = rejectUnauthorized; // persist locally

    // set connection in queue
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        let callbackFn = function (resp: any) {
          resolve();
        };

        // call wasm and invoke callback when done
        that._module.set_daemon_connection(
          that._cppAddress,
          uri,
          username,
          password,
          callbackFn
        );
      });
    });
  }

  async getDaemonConnection() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let connectionContainerStr = that._module.get_daemon_connection(
          that._cppAddress
        );
        // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        if (!connectionContainerStr) resolve();
        else {
          let jsonConnection = JSON.parse(connectionContainerStr);
          // @ts-expect-error TS(2554): Expected 5 arguments, but got 4.
          resolve(
            new MoneroRpcConnection(
              jsonConnection.uri,
              jsonConnection.username,
              jsonConnection.password,
              that._rejectUnauthorized
            )
          );
        }
      });
    });
  }

  async isConnectedToDaemon() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (resp: any) {
          resolve(resp);
        };

        // call wasm and invoke callback when done
        that._module.is_connected_to_daemon(that._cppAddress, callbackFn);
      });
    });
  }

  async getVersion() {
    this._assertNotClosed();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  async getPath() {
    this._assertNotClosed();
    return this._path;
  }

  async getIntegratedAddress(standardAddress: any, paymentId: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      try {
        let result = that._module.get_integrated_address(
          that._cppAddress,
          standardAddress ? standardAddress : "",
          paymentId ? paymentId : ""
        );
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        if (result.charAt(0) !== "{") throw new MoneroError(result);
        return new MoneroIntegratedAddress(JSON.parse(result));
      } catch (err) {
        // @ts-expect-error TS(2571): Object is of type 'unknown'.
        if (err.message.includes("Invalid payment ID"))
          throw new MoneroError("Invalid payment ID: " + paymentId);
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(err.message);
      }
    });
  }

  async decodeIntegratedAddress(integratedAddress: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      try {
        let result = that._module.decode_integrated_address(
          that._cppAddress,
          integratedAddress
        );
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        if (result.charAt(0) !== "{") throw new MoneroError(result);
        return new MoneroIntegratedAddress(JSON.parse(result));
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(err.message);
      }
    });
  }

  async getHeight() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (resp: any) {
          resolve(resp);
        };

        // call wasm and invoke callback when done
        that._module.get_height(that._cppAddress, callbackFn);
      });
    });
  }

  async getDaemonHeight() {
    this._assertNotClosed();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!(await this.isConnectedToDaemon()))
      throw new MoneroError("Wallet is not connected to daemon");

    // schedule task
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (resp: any) {
          resolve(resp);
        };

        // call wasm and invoke callback when done
        that._module.get_daemon_height(that._cppAddress, callbackFn);
      });
    });
  }

  async getHeightByDate(year: any, month: any, day: any) {
    this._assertNotClosed();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!(await this.isConnectedToDaemon()))
      throw new MoneroError("Wallet is not connected to daemon");

    // schedule task
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (resp: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (typeof resp === "string") reject(new MoneroError(resp));
          else resolve(resp);
        };

        // call wasm and invoke callback when done
        that._module.get_height_by_date(
          that._cppAddress,
          year,
          month,
          day,
          callbackFn
        );
      });
    });
  }

  /**
   * Synchronize the wallet with the daemon as a one-time synchronous process.
   *
   * @param {MoneroWalletListener|number} [listenerOrStartHeight] - listener xor start height (defaults to no sync listener, the last synced block)
   * @param {number} [startHeight] - startHeight if not given in first arg (defaults to last synced block)
   * @param {boolean} [allowConcurrentCalls] - allow other wallet methods to be processed simultaneously during sync (default false)<br><br><b>WARNING</b>: enabling this option will crash wallet execution if another call makes a simultaneous network request. TODO: possible to sync wasm network requests in http_client_wasm.cpp?
   */
  // @ts-expect-error TS(2416): Property 'sync' in type 'MoneroWalletFull' is not ... Remove this comment to see the full error message
  async sync(
    listenerOrStartHeight: any,
    startHeight: any,
    allowConcurrentCalls: any
  ) {
    this._assertNotClosed();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!(await this.isConnectedToDaemon()))
      throw new MoneroError("Wallet is not connected to daemon");

    // normalize params
    startHeight =
      listenerOrStartHeight === undefined ||
      listenerOrStartHeight instanceof MoneroWalletListener
        ? startHeight
        : listenerOrStartHeight;
    let listener =
      listenerOrStartHeight instanceof MoneroWalletListener
        ? listenerOrStartHeight
        : undefined;
    if (startHeight === undefined)
      startHeight = Math.max(
        await this.getHeight(),
        await this.getRestoreHeight()
      );

    // register listener if given
    if (listener) await this.addListener(listener);

    // sync wallet
    let err;
    let result;
    try {
      let that = this;
      result = await (allowConcurrentCalls
        ? syncWasm()
        : that._module.queueTask(async function () {
            return syncWasm();
          }));
      function syncWasm() {
        that._assertNotClosed();
        return new Promise(function (resolve, reject) {
          // define callback for wasm
          let callbackFn = async function (resp: any) {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (resp.charAt(0) !== "{") reject(new MoneroError(resp));
            else {
              let respJson = JSON.parse(resp);
              resolve(
                new MoneroSyncResult(
                  respJson.numBlocksFetched,
                  respJson.receivedMoney
                )
              );
            }
          };

          // sync wallet in wasm and invoke callback when done
          that._module.sync(that._cppAddress, startHeight, callbackFn);
        });
      }
    } catch (e) {
      err = e;
    }

    // unregister listener
    if (listener) await this.removeListener(listener);

    // throw error or return
    if (err) throw err;
    return result;
  }

  async startSyncing(syncPeriodInMs: any) {
    this._assertNotClosed();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!(await this.isConnectedToDaemon()))
      throw new MoneroError("Wallet is not connected to daemon");
    // @ts-expect-error TS(2339): Property 'DEFAULT_SYNC_PERIOD_IN_MS' does not exis... Remove this comment to see the full error message
    this._syncPeriodInMs =
      syncPeriodInMs === undefined
        ? MoneroWalletFull.DEFAULT_SYNC_PERIOD_IN_MS
        : syncPeriodInMs;
    let that = this;
    if (!this._syncLooper)
      this._syncLooper = new TaskLooper(async function () {
        await that._backgroundSync();
      });
    this._syncLooper.start(this._syncPeriodInMs);
  }

  async stopSyncing() {
    this._assertNotClosed();
    if (this._syncLooper) this._syncLooper.stop();
    this._module.stop_syncing(this._cppAddress); // task is not queued so wallet stops immediately
  }

  async scanTxs(txHashes: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callbackFn = function (err: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (err) reject(new MoneroError(msg));
          // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
          else resolve();
        };
        that._module.scan_txs(
          that._cppAddress,
          JSON.stringify({ txHashes: txHashes }),
          callbackFn
        );
      });
    });
  }

  async rescanSpent() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        let callbackFn = function () {
          resolve();
        };
        that._module.rescan_spent(that._cppAddress, callbackFn);
      });
    });
  }

  async rescanBlockchain() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        let callbackFn = function () {
          resolve();
        };
        that._module.rescan_blockchain(that._cppAddress, callbackFn);
      });
    });
  }

  async getBalance(accountIdx: any, subaddressIdx: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();

      // get balance encoded in json string
      let balanceStr;
      if (accountIdx === undefined) {
        assert(
          subaddressIdx === undefined,
          "Subaddress index must be undefined if account index is undefined"
        );
        balanceStr = that._module.get_balance_wallet(that._cppAddress);
      } else if (subaddressIdx === undefined) {
        balanceStr = that._module.get_balance_account(
          that._cppAddress,
          accountIdx
        );
      } else {
        balanceStr = that._module.get_balance_subaddress(
          that._cppAddress,
          accountIdx,
          subaddressIdx
        );
      }

      // parse json string to BigInt
      return BigInt(JSON.parse(GenUtils.stringifyBIs(balanceStr)).balance);
    });
  }

  async getUnlockedBalance(accountIdx: any, subaddressIdx: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();

      // get balance encoded in json string
      let unlockedBalanceStr;
      if (accountIdx === undefined) {
        assert(
          subaddressIdx === undefined,
          "Subaddress index must be undefined if account index is undefined"
        );
        unlockedBalanceStr = that._module.get_unlocked_balance_wallet(
          that._cppAddress
        );
      } else if (subaddressIdx === undefined) {
        unlockedBalanceStr = that._module.get_unlocked_balance_account(
          that._cppAddress,
          accountIdx
        );
      } else {
        unlockedBalanceStr = that._module.get_unlocked_balance_subaddress(
          that._cppAddress,
          accountIdx,
          subaddressIdx
        );
      }

      // parse json string to BigInt
      return BigInt(
        JSON.parse(GenUtils.stringifyBIs(unlockedBalanceStr)).unlockedBalance
      );
    });
  }

  // @ts-expect-error TS(2416): Property 'getAccounts' in type 'MoneroWalletFull' ... Remove this comment to see the full error message
  async getAccounts(includeSubaddresses: any, tag: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let accountsStr = that._module.get_accounts(
        that._cppAddress,
        includeSubaddresses ? true : false,
        tag ? tag : ""
      );
      let accounts = [];
      for (let accountJson of JSON.parse(GenUtils.stringifyBIs(accountsStr))
        .accounts) {
        // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
        accounts.push(
          MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson))
        );
      }
      return accounts;
    });
  }

  async getAccount(accountIdx: any, includeSubaddresses: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let accountStr = that._module.get_account(
        that._cppAddress,
        accountIdx,
        includeSubaddresses ? true : false
      );
      let accountJson = JSON.parse(GenUtils.stringifyBIs(accountStr));
      // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
      return MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson));
    });
  }

  async createAccount(label: any) {
    if (label === undefined) label = "";
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let accountStr = that._module.create_account(that._cppAddress, label);
      let accountJson = JSON.parse(GenUtils.stringifyBIs(accountStr));
      // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
      return MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson));
    });
  }

  async getSubaddresses(accountIdx: any, subaddressIndices: any) {
    let args = {
      accountIdx: accountIdx,
      subaddressIndices:
        subaddressIndices === undefined
          ? []
          : GenUtils.listify(subaddressIndices),
    };
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let subaddressesJson = JSON.parse(
        GenUtils.stringifyBIs(
          that._module.get_subaddresses(that._cppAddress, JSON.stringify(args))
        )
      ).subaddresses;
      let subaddresses = [];
      // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
      for (let subaddressJson of subaddressesJson)
        subaddresses.push(
          MoneroWalletFull._sanitizeSubaddress(
            new MoneroSubaddress(subaddressJson)
          )
        );
      return subaddresses;
    });
  }

  async createSubaddress(accountIdx: any, label: any) {
    if (label === undefined) label = "";
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let subaddressStr = that._module.create_subaddress(
        that._cppAddress,
        accountIdx,
        label
      );
      let subaddressJson = JSON.parse(GenUtils.stringifyBIs(subaddressStr));
      // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
      return MoneroWalletFull._sanitizeSubaddress(
        new MoneroSubaddress(subaddressJson)
      );
    });
  }

  async setSubaddressLabel(accountIdx: any, subaddressIdx: any, label: any) {
    if (label === undefined) label = "";
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      that._module.set_subaddress_label(
        that._cppAddress,
        accountIdx,
        subaddressIdx,
        label
      );
    });
  }

  async getTxs(query: any, missingTxHashes: any) {
    this._assertNotClosed();

    // copy and normalize query up to block
    query = MoneroWallet._normalizeTxQuery(query);

    // schedule task
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (blocksJsonStr: any) {
          // check for error
          if (blocksJsonStr.charAt(0) !== "{") {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            reject(new MoneroError(blocksJsonStr));
            return;
          }

          // resolve with deserialized txs
          try {
            resolve(
              MoneroWalletFull._deserializeTxs(
                query,
                blocksJsonStr,
                missingTxHashes
              )
            );
          } catch (err) {
            reject(err);
          }
        };

        // call wasm and invoke callback when done
        that._module.get_txs(
          that._cppAddress,
          JSON.stringify(query.getBlock().toJson()),
          callbackFn
        );
      });
    });
  }

  async getTransfers(query: any) {
    this._assertNotClosed();

    // copy and normalize query up to block
    query = MoneroWallet._normalizeTransferQuery(query);

    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (blocksJsonStr: any) {
          // check for error
          if (blocksJsonStr.charAt(0) !== "{") {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            reject(new MoneroError(blocksJsonStr));
            return;
          }

          // resolve with deserialized transfers
          try {
            resolve(
              MoneroWalletFull._deserializeTransfers(query, blocksJsonStr)
            );
          } catch (err) {
            reject(err);
          }
        };

        // call wasm and invoke callback when done
        that._module.get_transfers(
          that._cppAddress,
          JSON.stringify(query.getTxQuery().getBlock().toJson()),
          callbackFn
        );
      });
    });
  }

  async getOutputs(query: any) {
    this._assertNotClosed();

    // copy and normalize query up to block
    query = MoneroWallet._normalizeOutputQuery(query);

    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (blocksJsonStr: any) {
          // check for error
          if (blocksJsonStr.charAt(0) !== "{") {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            reject(new MoneroError(blocksJsonStr));
            return;
          }

          // resolve with deserialized outputs
          try {
            resolve(MoneroWalletFull._deserializeOutputs(query, blocksJsonStr));
          } catch (err) {
            reject(err);
          }
        };

        // call wasm and invoke callback when done
        that._module.get_outputs(
          that._cppAddress,
          JSON.stringify(query.getTxQuery().getBlock().toJson()),
          callbackFn
        );
      });
    });
  }

  async exportOutputs(all: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.export_outputs(
          that._cppAddress,
          all,
          function (outputsHex: any) {
            resolve(outputsHex);
          }
        );
      });
    });
  }

  async importOutputs(outputsHex: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.import_outputs(
          that._cppAddress,
          outputsHex,
          function (numImported: any) {
            resolve(numImported);
          }
        );
      });
    });
  }

  async exportKeyImages(all: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callback = function (keyImagesStr: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (keyImagesStr.charAt(0) !== "{")
            reject(new MoneroError(keyImagesStr)); // json expected, else error
          let keyImages = [];
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          for (let keyImageJson of JSON.parse(
            GenUtils.stringifyBIs(keyImagesStr)
          ).keyImages)
            keyImages.push(new MoneroKeyImage(keyImageJson));
          resolve(keyImages);
        };
        that._module.export_key_images(that._cppAddress, all, callback);
      });
    });
  }

  async importKeyImages(keyImages: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callback = function (keyImageImportResultStr: any) {
          resolve(
            new MoneroKeyImageImportResult(
              JSON.parse(GenUtils.stringifyBIs(keyImageImportResultStr))
            )
          );
        };
        that._module.import_key_images(
          that._cppAddress,
          JSON.stringify({
            keyImages: keyImages.map((keyImage: any) => keyImage.toJson()),
          }),
          callback
        );
      });
    });
  }

  async getNewKeyImagesFromLastImport() {
    this._assertNotClosed();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  async freezeOutput(keyImage: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!keyImage) throw new MoneroError("Must specify key image to freeze");
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        let callbackFn = function () {
          resolve();
        };
        that._module.freeze_output(that._cppAddress, keyImage, callbackFn);
      });
    });
  }

  async thawOutput(keyImage: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!keyImage) throw new MoneroError("Must specify key image to thaw");
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
        let callbackFn = function () {
          resolve();
        };
        that._module.thaw_output(that._cppAddress, keyImage, callbackFn);
      });
    });
  }

  async isOutputFrozen(keyImage: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!keyImage)
      throw new MoneroError("Must specify key image to check if frozen");
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callbackFn = function (result: any) {
          resolve(result);
        };
        that._module.is_output_frozen(that._cppAddress, keyImage, callbackFn);
      });
    });
  }

  async createTxs(config: any) {
    this._assertNotClosed();

    // validate, copy, and normalize config
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    if (config.getCanSplit() === undefined) config.setCanSplit(true);

    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (txSetJsonStr: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (txSetJsonStr.charAt(0) !== "{")
            reject(new MoneroError(txSetJsonStr)); // json expected, else error
          else
            resolve(
              new MoneroTxSet(
                JSON.parse(GenUtils.stringifyBIs(txSetJsonStr))
              ).txs
            );
        };

        // create txs in wasm and invoke callback when done
        that._module.create_txs(
          that._cppAddress,
          JSON.stringify(config.toJson()),
          callbackFn
        );
      });
    });
  }

  async sweepOutput(config: any) {
    this._assertNotClosed();

    // normalize and validate config
    config = MoneroWallet._normalizeSweepOutputConfig(config);

    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (txSetJsonStr: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (txSetJsonStr.charAt(0) !== "{")
            reject(new MoneroError(txSetJsonStr)); // json expected, else error
          else
            resolve(
              new MoneroTxSet(
                JSON.parse(GenUtils.stringifyBIs(txSetJsonStr))
              ).txs[0]
            );
        };

        // sweep output in wasm and invoke callback when done
        that._module.sweep_output(
          that._cppAddress,
          JSON.stringify(config.toJson()),
          callbackFn
        );
      });
    });
  }

  async sweepUnlocked(config: any) {
    this._assertNotClosed();

    // validate and normalize config
    config = MoneroWallet._normalizeSweepUnlockedConfig(config);

    // return promise which resolves on callback
    let that = this;
    return that._module.queueTask(async function () {
      // TODO: could factor this pattern out, invoked with module params and callback handler
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (txSetsJson: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (txSetsJson.charAt(0) !== "{")
            reject(new MoneroError(txSetsJson)); // json expected, else error
          else {
            let txSets = [];
            for (let txSetJson of JSON.parse(GenUtils.stringifyBIs(txSetsJson))
              .txSets)
              txSets.push(new MoneroTxSet(txSetJson));
            let txs = [];
            for (let txSet of txSets)
              for (let tx of txSet.txs) txs.push(tx);
            resolve(txs);
          }
        };

        // sweep unlocked in wasm and invoke callback when done
        that._module.sweep_unlocked(
          that._cppAddress,
          JSON.stringify(config.toJson()),
          callbackFn
        );
      });
    });
  }

  async sweepDust(relay: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        let callbackFn = function (txSetJsonStr: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (txSetJsonStr.charAt(0) !== "{")
            reject(new MoneroError(txSetJsonStr)); // json expected, else error
          else {
            let txSet = new MoneroTxSet(
              JSON.parse(GenUtils.stringifyBIs(txSetJsonStr))
            );
            if (txSet.txs === undefined) txSet.setTxs([]);
            resolve(txSet.txs);
          }
        };

        // call wasm and invoke callback when done
        that._module.sweep_dust(that._cppAddress, relay, callbackFn);
      });
    });
  }

  async relayTxs(txsOrMetadatas: any) {
    this._assertNotClosed();
    assert(
      Array.isArray(txsOrMetadatas),
      "Must provide an array of txs or their metadata to relay"
    );
    let txMetadatas: any = [];
    for (let txOrMetadata of txsOrMetadatas)
      txMetadatas.push(
        txOrMetadata instanceof MoneroTxWallet
          ? txOrMetadata.getMetadata()
          : txOrMetadata
      );
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callback = function (txHashesJson: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (txHashesJson.charAt(0) !== "{")
            reject(new MoneroError(txHashesJson));
          else resolve(JSON.parse(txHashesJson).txHashes);
        };
        that._module.relay_txs(
          that._cppAddress,
          JSON.stringify({ txMetadatas: txMetadatas }),
          callback
        );
      });
    });
  }

  async describeTxSet(txSet: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      txSet = new MoneroTxSet()
        .setUnsignedTxHex(txSet.getUnsignedTxHex())
        .setSignedTxHex(txSet.getSignedTxHex())
        .setMultisigTxHex(txSet.getMultisigTxHex());
      try {
        return new MoneroTxSet(
          JSON.parse(
            GenUtils.stringifyBIs(
              that._module.describe_tx_set(
                that._cppAddress,
                JSON.stringify(txSet.toJson())
              )
            )
          )
        );
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(that._module.get_exception_message(err));
      }
    });
  }

  async signTxs(unsignedTxHex: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      try {
        return that._module.sign_txs(that._cppAddress, unsignedTxHex);
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(that._module.get_exception_message(err));
      }
    });
  }

  async submitTxs(signedTxHex: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callbackFn = function (resp: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (resp.charAt(0) !== "{") reject(new MoneroError(resp));
          else resolve(JSON.parse(resp).txHashes);
        };
        that._module.submit_txs(that._cppAddress, signedTxHex, callbackFn);
      });
    });
  }

  async signMessage(
    message: any,
    signatureType: any,
    accountIdx: any,
    subaddressIdx: any
  ) {
    // assign defaults
    // @ts-expect-error TS(2339): Property 'SIGN_WITH_SPEND_KEY' does not exist on t... Remove this comment to see the full error message
    signatureType =
      signatureType || MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY;
    accountIdx = accountIdx || 0;
    subaddressIdx = subaddressIdx || 0;

    // queue task to sign message
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      // @ts-expect-error TS(2339): Property 'SIGN_WITH_SPEND_KEY' does not exist on t... Remove this comment to see the full error message
      try {
        return that._module.sign_message(
          that._cppAddress,
          message,
          signatureType === MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY
            ? 0
            : 1,
          accountIdx,
          subaddressIdx
        );
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(that._module.get_exception_message(err));
      }
    });
  }

  async verifyMessage(message: any, address: any, signature: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let resultJson;
      try {
        resultJson = JSON.parse(
          that._module.verify_message(
            that._cppAddress,
            message,
            address,
            signature
          )
        );
      } catch (err) {
        resultJson = { isGood: false };
      }
      let result = new MoneroMessageSignatureResult(
        resultJson.isGood,
        !resultJson.isGood ? undefined : resultJson.isOld,
        // @ts-expect-error TS(2339): Property 'SIGN_WITH_SPEND_KEY' does not exist on t... Remove this comment to see the full error message
        !resultJson.isGood
          ? undefined
          : resultJson.signatureType === "spend"
          ? MoneroMessageSignatureType.SIGN_WITH_SPEND_KEY
          : MoneroMessageSignatureType.SIGN_WITH_VIEW_KEY,
        !resultJson.isGood ? undefined : resultJson.version
      );
      return result;
    });
  }

  async getTxKey(txHash: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      try {
        return that._module.get_tx_key(that._cppAddress, txHash);
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(that._module.get_exception_message(err));
      }
    });
  }

  async checkTxKey(txHash: any, txKey: any, address: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.check_tx_key(
          that._cppAddress,
          txHash,
          txKey,
          address,
          function (respJsonStr: any) {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (respJsonStr.charAt(0) !== "{")
              reject(new MoneroError(respJsonStr));
            else
              resolve(
                new MoneroCheckTx(
                  JSON.parse(GenUtils.stringifyBIs(respJsonStr))
                )
              );
          }
        );
      });
    });
  }

  async getTxProof(txHash: any, address: any, message: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.get_tx_proof(
          that._cppAddress,
          txHash || "",
          address || "",
          message || "",
          function (signature: any) {
            let errorKey = "error: ";
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (signature.indexOf(errorKey) === 0)
              reject(new MoneroError(signature.substring(errorKey.length)));
            else resolve(signature);
          }
        );
      });
    });
  }

  async checkTxProof(txHash: any, address: any, message: any, signature: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.check_tx_proof(
          that._cppAddress,
          txHash || "",
          address || "",
          message || "",
          signature || "",
          function (respJsonStr: any) {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (respJsonStr.charAt(0) !== "{")
              reject(new MoneroError(respJsonStr));
            else
              resolve(
                new MoneroCheckTx(
                  JSON.parse(GenUtils.stringifyBIs(respJsonStr))
                )
              );
          }
        );
      });
    });
  }

  async getSpendProof(txHash: any, message: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.get_spend_proof(
          that._cppAddress,
          txHash || "",
          message || "",
          function (signature: any) {
            let errorKey = "error: ";
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (signature.indexOf(errorKey) === 0)
              reject(new MoneroError(signature.substring(errorKey.length)));
            else resolve(signature);
          }
        );
      });
    });
  }

  async checkSpendProof(txHash: any, message: any, signature: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.check_spend_proof(
          that._cppAddress,
          txHash || "",
          message || "",
          signature || "",
          function (resp: any) {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            typeof resp === "string"
              ? reject(new MoneroError(resp))
              : resolve(resp);
          }
        );
      });
    });
  }

  async getReserveProofWallet(message: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.get_reserve_proof_wallet(
          that._cppAddress,
          message,
          function (signature: any) {
            let errorKey = "error: ";
            if (signature.indexOf(errorKey) === 0)
              reject(new MoneroError(signature.substring(errorKey.length), -1));
            else resolve(signature);
          }
        );
      });
    });
  }

  async getReserveProofAccount(accountIdx: any, amount: any, message: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.get_reserve_proof_account(
          that._cppAddress,
          accountIdx,
          amount.toString(),
          message,
          function (signature: any) {
            let errorKey = "error: ";
            if (signature.indexOf(errorKey) === 0)
              reject(new MoneroError(signature.substring(errorKey.length), -1));
            else resolve(signature);
          }
        );
      });
    });
  }

  async checkReserveProof(address: any, message: any, signature: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.check_reserve_proof(
          that._cppAddress,
          address,
          message,
          signature,
          function (respJsonStr: any) {
            if (respJsonStr.charAt(0) !== "{")
              reject(new MoneroError(respJsonStr, -1));
            else
              resolve(
                new MoneroCheckReserve(
                  JSON.parse(GenUtils.stringifyBIs(respJsonStr))
                )
              );
          }
        );
      });
    });
  }

  async getTxNotes(txHashes: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      try {
        return JSON.parse(
          that._module.get_tx_notes(
            that._cppAddress,
            JSON.stringify({ txHashes: txHashes })
          )
        ).txNotes;
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(that._module.get_exception_message(err));
      }
    });
  }

  async setTxNotes(txHashes: any, notes: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      try {
        that._module.set_tx_notes(
          that._cppAddress,
          JSON.stringify({ txHashes: txHashes, txNotes: notes })
        );
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(that._module.get_exception_message(err));
      }
    });
  }

  async getAddressBookEntries(entryIndices: any) {
    if (!entryIndices) entryIndices = [];
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let entries = [];
      for (let entryJson of JSON.parse(
        that._module.get_address_book_entries(
          that._cppAddress,
          JSON.stringify({ entryIndices: entryIndices })
        )
      ).entries) {
        entries.push(new MoneroAddressBookEntry(entryJson));
      }
      return entries;
    });
  }

  async addAddressBookEntry(address: any, description: any) {
    if (!address) address = "";
    if (!description) description = "";
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.add_address_book_entry(
        that._cppAddress,
        address,
        description
      );
    });
  }

  async editAddressBookEntry(
    index: any,
    setAddress: any,
    address: any,
    setDescription: any,
    description: any
  ) {
    if (!setAddress) setAddress = false;
    if (!address) address = "";
    if (!setDescription) setDescription = false;
    if (!description) description = "";
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      that._module.edit_address_book_entry(
        that._cppAddress,
        index,
        setAddress,
        address,
        setDescription,
        description
      );
    });
  }

  async deleteAddressBookEntry(entryIdx: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      that._module.delete_address_book_entry(that._cppAddress, entryIdx);
    });
  }

  async tagAccounts(tag: any, accountIndices: any) {
    if (!tag) tag = "";
    if (!accountIndices) accountIndices = [];
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      that._module.tag_accounts(
        that._cppAddress,
        JSON.stringify({ tag: tag, accountIndices: accountIndices })
      );
    });
  }

  async untagAccounts(accountIndices: any) {
    if (!accountIndices) accountIndices = [];
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      that._module.tag_accounts(
        that._cppAddress,
        JSON.stringify({ accountIndices: accountIndices })
      );
    });
  }

  async getAccountTags() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let accountTags = [];
      // @ts-expect-error TS(2304): Cannot find name 'MoneroAccountTag'.
      for (let accountTagJson of JSON.parse(
        that._module.get_account_tags(that._cppAddress)
      ).accountTags)
        accountTags.push(new MoneroAccountTag(accountTagJson));
      return accountTags;
    });
  }

  async setAccountTagLabel(tag: any, label: any) {
    if (!tag) tag = "";
    // @ts-expect-error TS(2552): Cannot find name 'llabel'. Did you mean 'label'?
    if (!llabel) label = "";
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      that._module.set_account_tag_label(that._cppAddress, tag, label);
    });
  }

  async getPaymentUri(config: any) {
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      try {
        return that._module.get_payment_uri(
          that._cppAddress,
          JSON.stringify(config.toJson())
        );
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError("Cannot make URI from supplied parameters");
      }
    });
  }

  async parsePaymentUri(uri: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      try {
        return new MoneroTxConfig(
          JSON.parse(
            GenUtils.stringifyBIs(
              that._module.parse_payment_uri(that._cppAddress, uri)
            )
          ),
          true
        ); // relax validation for unquoted big integers
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(err.message);
      }
    });
  }

  async getAttribute(key: any) {
    this._assertNotClosed();
    assert(typeof key === "string", "Attribute key must be a string");
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let value = that._module.get_attribute(that._cppAddress, key);
      return value === "" ? null : value;
    });
  }

  async setAttribute(key: any, val: any) {
    this._assertNotClosed();
    assert(typeof key === "string", "Attribute key must be a string");
    assert(typeof val === "string", "Attribute value must be a string");
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      that._module.set_attribute(that._cppAddress, key, val);
    });
  }

  async startMining(
    numThreads: any,
    backgroundMining: any,
    ignoreBattery: any
  ) {
    this._assertNotClosed();
    // @ts-expect-error TS(2554): Expected 6 arguments, but got 1.
    let daemon = new MoneroDaemonRpc(
      Object.assign((await this.getDaemonConnection()).getConfig(), {
        proxyToWorker: false,
      })
    );
    await daemon.startMining(
      await this.getPrimaryAddress(),
      numThreads,
      backgroundMining,
      ignoreBattery
    );
  }

  async stopMining() {
    this._assertNotClosed();
    // @ts-expect-error TS(2554): Expected 6 arguments, but got 1.
    let daemon = new MoneroDaemonRpc(
      Object.assign((await this.getDaemonConnection()).getConfig(), {
        proxyToWorker: false,
      })
    );
    await daemon.stopMining();
  }

  async isMultisigImportNeeded() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.is_multisig_import_needed(that._cppAddress);
    });
  }

  async isMultisig() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.is_multisig(that._cppAddress);
    });
  }

  async getMultisigInfo() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new MoneroMultisigInfo(
        JSON.parse(that._module.get_multisig_info(that._cppAddress))
      );
    });
  }

  async prepareMultisig() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.prepare_multisig(that._cppAddress);
    });
  }

  async makeMultisig(multisigHexes: any, threshold: any, password: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.make_multisig(
          that._cppAddress,
          JSON.stringify({
            multisigHexes: multisigHexes,
            threshold: threshold,
            password: password,
          }),
          (resp: any) => {
            let errorKey = "error: ";
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (resp.indexOf(errorKey) === 0)
              reject(new MoneroError(resp.substring(errorKey.length)));
            else resolve(resp);
          }
        );
      });
    });
  }

  async exchangeMultisigKeys(multisigHexes: any, password: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.exchange_multisig_keys(
          that._cppAddress,
          JSON.stringify({ multisigHexes: multisigHexes, password: password }),
          (resp: any) => {
            let errorKey = "error: ";
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (resp.indexOf(errorKey) === 0)
              reject(new MoneroError(resp.substring(errorKey.length)));
            else resolve(new MoneroMultisigInitResult(JSON.parse(resp)));
          }
        );
      });
    });
  }

  async exportMultisigHex() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.export_multisig_hex(that._cppAddress);
    });
  }

  async importMultisigHex(multisigHexes: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!GenUtils.isArray(multisigHexes))
      throw new MoneroError("Must provide string[] to importMultisigHex()");
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callbackFn = function (resp: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (typeof resp === "string") reject(new MoneroError(resp));
          else resolve(resp);
        };
        that._module.import_multisig_hex(
          that._cppAddress,
          JSON.stringify({ multisigHexes: multisigHexes }),
          callbackFn
        );
      });
    });
  }

  async signMultisigTxHex(multisigTxHex: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callbackFn = async function (resp: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (resp.charAt(0) !== "{") reject(new MoneroError(resp));
          else resolve(new MoneroMultisigSignResult(JSON.parse(resp)));
        };
        that._module.sign_multisig_tx_hex(
          that._cppAddress,
          multisigTxHex,
          callbackFn
        );
      });
    });
  }

  async submitMultisigTxHex(signedMultisigTxHex: any) {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        let callbackFn = function (resp: any) {
          // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
          if (resp.charAt(0) !== "{") reject(new MoneroError(resp));
          else resolve(JSON.parse(resp).txHashes);
        };
        that._module.submit_multisig_tx_hex(
          that._cppAddress,
          signedMultisigTxHex,
          callbackFn
        );
      });
    });
  }

  /**
   * Get the wallet's keys and cache data.
   *
   * @return {DataView[]} is the keys and cache data, respectively
   */
  async getData() {
    this._assertNotClosed();

    // queue call to wasm module
    let viewOnly = await this.isViewOnly();
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();

      // store views in array
      let views = [];

      // malloc cache buffer and get buffer location in c++ heap
      let cacheBufferLoc = JSON.parse(
        that._module.get_cache_file_buffer(that._cppAddress, that._password)
      );

      // read binary data from heap to DataView
      let view = new DataView(new ArrayBuffer(cacheBufferLoc.length));
      for (let i = 0; i < cacheBufferLoc.length; i++) {
        view.setInt8(
          i,
          that._module.HEAPU8[
            cacheBufferLoc.pointer / Uint8Array.BYTES_PER_ELEMENT + i
          ]
        );
      }

      // free binary on heap
      that._module._free(cacheBufferLoc.pointer);

      // write cache file
      views.push(Buffer.from(view.buffer));

      // malloc keys buffer and get buffer location in c++ heap
      let keysBufferLoc = JSON.parse(
        that._module.get_keys_file_buffer(
          that._cppAddress,
          that._password,
          viewOnly
        )
      );

      // read binary data from heap to DataView
      view = new DataView(new ArrayBuffer(keysBufferLoc.length));
      for (let i = 0; i < keysBufferLoc.length; i++) {
        view.setInt8(
          i,
          that._module.HEAPU8[
            keysBufferLoc.pointer / Uint8Array.BYTES_PER_ELEMENT + i
          ]
        );
      }

      // free binary on heap
      that._module._free(keysBufferLoc.pointer);

      // prepend keys file
      views.unshift(Buffer.from(view.buffer));
      return views;
    });
  }

  async changePassword(oldPassword: any, newPassword: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (oldPassword !== this._password)
      throw new MoneroError("Invalid original password."); // wallet2 verify_password loads from disk so verify password here
    if (newPassword === undefined) newPassword = "";
    let that = this;
    await that._module.queueTask(async function () {
      that._assertNotClosed();
      return new Promise(function (resolve, reject) {
        that._module.change_wallet_password(
          that._cppAddress,
          oldPassword,
          newPassword,
          async function (errMsg: any) {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (errMsg) reject(new MoneroError(errMsg));
            // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
            else resolve();
          }
        );
      });
    });
    this._password = newPassword;
    if (this._path) await this.save(); // auto save
  }

  async save() {
    return MoneroWalletFull._save(this);
  }

  async close(save: any) {
    if (this._isClosed) return; // no effect if closed
    await this._refreshListening();
    await this.stopSyncing();
    await super.close(save);
    delete this._path;
    delete this._password;
    delete this._listeners;
    delete this._fullListener;
    LibraryUtils.instance.setRejectUnauthorizedFn(
      this._rejectUnauthorizedConfigId,
      undefined
    ); // unregister fn informing if unauthorized reqs should be rejected
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

  // ---------------------------- PRIVATE HELPERS ----------------------------

  static _getFs() {
    // @ts-expect-error TS(2339): Property 'FS' does not exist on type 'typeof Moner... Remove this comment to see the full error message
    if (!MoneroWalletFull.FS)
      MoneroWalletFull.FS = GenUtils.isBrowser() ? undefined : require("fs");
    // @ts-expect-error TS(2339): Property 'FS' does not exist on type 'typeof Moner... Remove this comment to see the full error message
    return MoneroWalletFull.FS;
  }

  static async _openWalletData(
    path: any,
    password: any,
    networkType: any,
    keysData: any,
    cacheData: any,
    daemonUriOrConnection: any,
    proxyToWorker: any,
    fs: typeof nodejsfs
  ) {
    if (proxyToWorker)
      return MoneroWalletFullProxy.openWalletData(
        path,
        password,
        networkType,
        keysData,
        cacheData,
        daemonUriOrConnection,
        fs
      );

    // validate and normalize parameters
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (networkType === undefined)
      throw new MoneroError("Must provide the wallet's network type");
    MoneroNetworkType.validate(networkType);
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
    let daemonConnection =
      typeof daemonUriOrConnection === "string"
        ? new MoneroRpcConnection(daemonUriOrConnection)
        : daemonUriOrConnection;
    let daemonUri =
      daemonConnection && daemonConnection.getUri()
        ? daemonConnection.getUri()
        : "";
    let daemonUsername =
      daemonConnection && daemonConnection.getUsername()
        ? daemonConnection.getUsername()
        : "";
    let daemonPassword =
      daemonConnection && daemonConnection.getPassword()
        ? daemonConnection.getPassword()
        : "";
    let rejectUnauthorized = daemonConnection
      ? daemonConnection.getRejectUnauthorized()
      : true;

    // load wasm module
    let module = await LibraryUtils.instance.loadFullModule();

    // open wallet in queue
    return module.queueTask(async function () {
      return new Promise(function (resolve, reject) {
        // register fn informing if unauthorized reqs should be rejected
        let rejectUnauthorizedFnId = GenUtils.getUUID();
        LibraryUtils.instance.setRejectUnauthorizedFn(
          rejectUnauthorizedFnId,
          function () {
            return rejectUnauthorized;
          }
        );

        // define callback for wasm
        let callbackFn = async function (cppAddress: any) {
          if (typeof cppAddress === "string")
            reject(new MoneroError(cppAddress));
          else
            resolve(
              new MoneroWalletFull(
                cppAddress,
                path,
                password,
                fs,
                rejectUnauthorized,
                rejectUnauthorizedFnId
              )
            );
        };

        // create wallet in wasm and invoke callback when done
        module.open_wallet_full(
          password,
          networkType,
          keysData,
          cacheData,
          daemonUri,
          daemonUsername,
          daemonPassword,
          rejectUnauthorizedFnId,
          callbackFn
        );
      });
    });
  }

  async _backgroundSync() {
    let label = this._path
      ? this._path
      : this._browserMainPath
      ? this._browserMainPath
      : "in-memory wallet"; // label for log
    LibraryUtils.instance.log(1, "Background synchronizing " + label);
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 0.
    try {
      await this.sync();
    } catch (err) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (!this._isClosed)
        console.error(
          "Failed to background synchronize " + label + ": " + err.message
        );
    }
  }

  async _refreshListening() {
    let isEnabled = this._listeners.length > 0;
    let that = this;
    if (
      (that._fullListenerHandle === 0 && !isEnabled) ||
      (that._fullListenerHandle > 0 && isEnabled)
    )
      return; // no difference
    return that._module.queueTask(async function () {
      return new Promise(function (resolve, reject) {
        that._module.set_listener(
          that._cppAddress,
          that._fullListenerHandle,
          (newListenerHandle: any) => {
            // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
            if (typeof newListenerHandle === "string")
              reject(new MoneroError(newListenerHandle));
            else {
              that._fullListenerHandle = newListenerHandle;
              // @ts-expect-error TS(2794): Expected 1 arguments, but got 0. Did you forget to... Remove this comment to see the full error message
              resolve();
            }
          },
          isEnabled
            ? async function (
                height: any,
                startHeight: any,
                endHeight: any,
                percentDone: any,
                message: any
              ) {
                await that._fullListener.onSyncProgress(
                  height,
                  startHeight,
                  endHeight,
                  percentDone,
                  message
                );
              }
            : undefined,
          isEnabled
            ? async function (height: any) {
                await that._fullListener.onNewBlock(height);
              }
            : undefined,
          isEnabled
            ? async function (newBalanceStr: any, newUnlockedBalanceStr: any) {
                await that._fullListener.onBalancesChanged(
                  newBalanceStr,
                  newUnlockedBalanceStr
                );
              }
            : undefined,
          isEnabled
            ? async function (
                height: any,
                txHash: any,
                amountStr: any,
                accountIdx: any,
                subaddressIdx: any,
                version: any,
                unlockHeight: any,
                isLocked: any
              ) {
                await that._fullListener.onOutputReceived(
                  height,
                  txHash,
                  amountStr,
                  accountIdx,
                  subaddressIdx,
                  version,
                  unlockHeight,
                  isLocked
                );
              }
            : undefined,
          isEnabled
            ? async function (
                height: any,
                txHash: any,
                amountStr: any,
                accountIdxStr: any,
                subaddressIdxStr: any,
                version: any,
                unlockHeight: any,
                isLocked: any
              ) {
                await that._fullListener.onOutputSpent(
                  height,
                  txHash,
                  amountStr,
                  accountIdxStr,
                  subaddressIdxStr,
                  version,
                  unlockHeight,
                  isLocked
                );
              }
            : undefined
        );
      });
    });
  }

  static _sanitizeBlock(block: any) {
    for (let tx of block.txs) MoneroWalletFull._sanitizeTxWallet(tx);
    return block;
  }

  static _sanitizeTxWallet(tx: any) {
    assert(tx instanceof MoneroTxWallet);
    return tx;
  }

  static _sanitizeAccount(account: any) {
    if (account.getSubaddresses()) {
      for (let subaddress of account.getSubaddresses())
        MoneroWalletFull._sanitizeSubaddress(subaddress);
    }
    return account;
  }

  static _sanitizeSubaddress(subaddress: any) {
    if (subaddress.getLabel() === "") subaddress.setLabel(undefined);
    return subaddress;
  }

  static _deserializeBlocks(blocksJsonStr: any) {
    let blocksJson = JSON.parse(GenUtils.stringifyBIs(blocksJsonStr));
    let deserializedBlocks = {};
    // @ts-expect-error TS(2339): Property 'blocks' does not exist on type '{}'.
    deserializedBlocks.blocks = [];
    // @ts-expect-error TS(2339): Property 'missingTxHashes' does not exist on type ... Remove this comment to see the full error message
    deserializedBlocks.missingTxHashes = [];
    // @ts-expect-error TS(2339): Property 'blocks' does not exist on type '{}'.
    if (blocksJson.blocks)
      for (let blockJson of blocksJson.blocks)
        deserializedBlocks.blocks.push(
          MoneroWalletFull._sanitizeBlock(
            new MoneroBlock(
              blockJson,
              MoneroBlock.DeserializationType.TX_WALLET
            )
          )
        );
    // @ts-expect-error TS(2339): Property 'missingTxHashes' does not exist on type ... Remove this comment to see the full error message
    if (blocksJson.missingTxHashes)
      for (let missingTxHash of blocksJson.missingTxHashes)
        deserializedBlocks.missingTxHashes.push(missingTxHash);
    return deserializedBlocks;
  }

  static _deserializeTxs(query: any, blocksJsonStr: any, missingTxHashes: any) {
    // deserialize blocks
    let deserializedBlocks = MoneroWalletFull._deserializeBlocks(blocksJsonStr);
    // @ts-expect-error TS(2339): Property 'missingTxHashes' does not exist on type ... Remove this comment to see the full error message
    if (
      missingTxHashes === undefined &&
      deserializedBlocks.missingTxHashes.length > 0
    )
      throw new MoneroError(
        "Wallet missing requested tx hashes: " +
          deserializedBlocks.missingTxHashes
      );
    // @ts-expect-error TS(2339): Property 'missingTxHashes' does not exist on type ... Remove this comment to see the full error message
    for (let missingTxHash of deserializedBlocks.missingTxHashes)
      missingTxHashes.push(missingTxHash);
    // @ts-expect-error TS(2339): Property 'blocks' does not exist on type '{}'.
    let blocks = deserializedBlocks.blocks;

    // collect txs
    let txs = [];
    for (let block of blocks) {
      MoneroWalletFull._sanitizeBlock(block);
      for (let tx of block.txs) {
        if (block.getHeight() === undefined) tx.setBlock(undefined); // dereference placeholder block for unconfirmed txs
        txs.push(tx);
      }
    }

    // re-sort txs which is lost over wasm serialization  // TODO: confirm that order is lost
    if (query.getHashes() !== undefined) {
      let txMap = new Map();
      // @ts-expect-error TS(7052): Element implicitly has an 'any' type because type ... Remove this comment to see the full error message
      for (let tx of txs) txMap[tx.getHash()] = tx;
      let txsSorted = [];
      // @ts-expect-error TS(7052): Element implicitly has an 'any' type because type ... Remove this comment to see the full error message
      for (let txHash of query.getHashes())
        if (txMap[txHash] !== undefined) txsSorted.push(txMap[txHash]);
      txs = txsSorted;
    }

    return txs;
  }

  static _deserializeTransfers(query: any, blocksJsonStr: any) {
    // deserialize blocks
    let deserializedBlocks = MoneroWalletFull._deserializeBlocks(blocksJsonStr);
    // @ts-expect-error TS(2339): Property 'missingTxHashes' does not exist on type ... Remove this comment to see the full error message
    if (deserializedBlocks.missingTxHashes.length > 0)
      throw new MoneroError(
        "Wallet missing requested tx hashes: " +
          deserializedBlocks.missingTxHashes
      );
    // @ts-expect-error TS(2339): Property 'blocks' does not exist on type '{}'.
    let blocks = deserializedBlocks.blocks;

    // collect transfers
    let transfers = [];
    for (let block of blocks) {
      for (let tx of block.txs) {
        if (block.getHeight() === undefined) tx.setBlock(undefined); // dereference placeholder block for unconfirmed txs
        if (tx.getOutgoingTransfer() !== undefined)
          transfers.push(tx.getOutgoingTransfer());
        if (tx.getIncomingTransfers() !== undefined) {
          for (let transfer of tx.getIncomingTransfers())
            transfers.push(transfer);
        }
      }
    }

    return transfers;
  }

  static _deserializeOutputs(query: any, blocksJsonStr: any) {
    // deserialize blocks
    let deserializedBlocks = MoneroWalletFull._deserializeBlocks(blocksJsonStr);
    // @ts-expect-error TS(2339): Property 'missingTxHashes' does not exist on type ... Remove this comment to see the full error message
    if (deserializedBlocks.missingTxHashes.length > 0)
      throw new MoneroError(
        "Wallet missing requested tx hashes: " +
          deserializedBlocks.missingTxHashes
      );
    // @ts-expect-error TS(2339): Property 'blocks' does not exist on type '{}'.
    let blocks = deserializedBlocks.blocks;

    // collect outputs
    let outputs = [];
    for (let block of blocks) {
      for (let tx of block.txs) {
        for (let output of tx.getOutputs()) outputs.push(output);
      }
    }

    return outputs;
  }

  /**
   * Set the path of the wallet on the browser main thread if run as a worker.
   *
   * @param {string} browserMainPath - path of the wallet on the browser main thread
   */
  _setBrowserMainPath(browserMainPath: any) {
    this._browserMainPath = browserMainPath;
  }

  static async _moveTo(path: any, wallet: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (await wallet.isClosed()) throw new MoneroError("Wallet is closed");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!path) throw new MoneroError("Must provide path of destination wallet");

    // save and return if same path
    //import Path from "path";
    if (Path.normalize(wallet._path) === Path.normalize(path)) {
      await wallet.save();
      return;
    }

    // create destination directory if it doesn't exist
    let walletDir = Path.dirname(path);
    if (!wallet._fs.existsSync(walletDir)) {
      try {
        wallet._fs.mkdirSync(walletDir);
      } catch (err) {
        // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
        throw new MoneroError(
          "Destination path " +
            path +
            " does not exist and cannot be created: " +
            err.message
        );
      }
    }

    // write wallet files
    let data = await wallet.getData();
    wallet._fs.writeFileSync(path + ".keys", data[0], "binary");
    wallet._fs.writeFileSync(path, data[1], "binary");
    wallet._fs.writeFileSync(
      path + ".address.txt",
      await wallet.getPrimaryAddress()
    );
    let oldPath = wallet._path;
    wallet._path = path;

    // delete old wallet files
    if (oldPath) {
      wallet._fs.unlinkSync(oldPath + ".address.txt");
      wallet._fs.unlinkSync(oldPath + ".keys");
      wallet._fs.unlinkSync(oldPath);
    }
  }

  static async _save(wallet: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (await wallet.isClosed()) throw new MoneroError("Wallet is closed");

    // path must be set
    let path = await wallet.getPath();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!path)
      throw new MoneroError("Cannot save wallet because path is not set");

    // write wallet files to *.new
    let pathNew = path + ".new";
    let data = await wallet.getData();
    wallet._fs.writeFileSync(pathNew + ".keys", data[0], "binary");
    wallet._fs.writeFileSync(pathNew, data[1], "binary");
    wallet._fs.writeFileSync(
      pathNew + ".address.txt",
      await wallet.getPrimaryAddress()
    );

    // replace old wallet files with new
    wallet._fs.renameSync(pathNew + ".keys", path + ".keys");
    wallet._fs.renameSync(pathNew, path, path + ".keys");
    wallet._fs.renameSync(
      pathNew + ".address.txt",
      path + ".address.txt",
      path + ".keys"
    );
  }
}

/**
 * Implements a MoneroWallet by proxying requests to a worker which runs a full wallet.
 *
 * TODO: sort these methods according to master sort in MoneroWallet.js
 * TODO: probably only allow one listener to worker then propogate to registered listeners for performance
 * TODO: ability to recycle worker for use in another wallet
 * TODO: using LibraryUtils.instance.WORKER_OBJECTS directly breaks encapsulation
 *
 * @private
 */
class MoneroWalletFullProxy extends MoneroWallet {
  _fs: any;
  _path: any;
  _walletId: any;
  _worker: any;
  _wrappedListeners: any;

  // -------------------------- WALLET STATIC UTILS ---------------------------

  static async openWalletData(
    path: any,
    password: any,
    networkType: any,
    keysData: any,
    cacheData: any,
    daemonUriOrConnection: any,
    fs: typeof nodejsfs
  ) {
    let walletId = GenUtils.getUUID();
    if (password === undefined) password = "";
    let daemonUriOrConfig =
      daemonUriOrConnection instanceof MoneroRpcConnection
        ? daemonUriOrConnection.config()
        : daemonUriOrConnection;
    await LibraryUtils.instance.invokeWorker(walletId, "openWalletData", [
      path,
      password,
      networkType,
      keysData,
      cacheData,
      daemonUriOrConfig,
    ]);
    let wallet = new MoneroWalletFullProxy(
      walletId,
      await LibraryUtils.instance.getWorker(),
      path,
      fs
    );
    if (path) await wallet.save();
    return wallet;
  }

  static async _createWallet(config: any) {
    if (config.path && MoneroWalletFull.walletExists(config.path, config.fs))
      throw new MoneroError("Wallet already exists: " + path);
    let walletId = GenUtils.getUUID();
    await LibraryUtils.instance.invokeWorker(walletId, "_createWallet", [
      config.toJson(),
    ]);
    let wallet = new MoneroWalletFullProxy(
      walletId,
      await LibraryUtils.instance.getWorker(),
      config.path,
      config.fs
    );
    if (config.path) await wallet.save();
    return wallet;
  }

  // --------------------------- INSTANCE METHODS ----------------------------

  /**
   * Internal constructor which is given a worker to communicate with via messages.
   *
   * This method should not be called externally but should be called through
   * static wallet creation utilities in this class.
   *
   * @param {string} walletId - identifies the wallet with the worker
   * @param {Worker} worker - worker to communicate with via messages
   */
  constructor(walletId: any, worker: any, path: any, fs: typeof nodejsfs) {
    super();
    this._walletId = walletId;
    this._worker = worker;
    this._path = path;
    this._fs = fs ? fs : path ? MoneroWalletFull._getFs() : undefined;
    this._wrappedListeners = [];
  }

  // @ts-expect-error TS(2416): Property 'isViewOnly' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async isViewOnly() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("isViewOnly");
  }

  async getNetworkType() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getNetworkType");
  }

  async getVersion() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  getPath() {
    return this._path;
  }

  // @ts-expect-error TS(2416): Property 'getMnemonic' in type 'MoneroWalletFullPr... Remove this comment to see the full error message
  async getMnemonic() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getMnemonic");
  }

  // @ts-expect-error TS(2416): Property 'getMnemonicLanguage' in type 'MoneroWall... Remove this comment to see the full error message
  async getMnemonicLanguage() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getMnemonicLanguage");
  }

  async getMnemonicLanguages() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getMnemonicLanguages");
  }

  // @ts-expect-error TS(2416): Property 'getPrivateSpendKey' in type 'MoneroWalle... Remove this comment to see the full error message
  async getPrivateSpendKey() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getPrivateSpendKey");
  }

  // @ts-expect-error TS(2416): Property 'getPrivateViewKey' in type 'MoneroWallet... Remove this comment to see the full error message
  async getPrivateViewKey() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getPrivateViewKey");
  }

  // @ts-expect-error TS(2416): Property 'getPublicViewKey' in type 'MoneroWalletF... Remove this comment to see the full error message
  async getPublicViewKey() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getPublicViewKey");
  }

  // @ts-expect-error TS(2416): Property 'getPublicSpendKey' in type 'MoneroWallet... Remove this comment to see the full error message
  async getPublicSpendKey() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getPublicSpendKey");
  }

  // @ts-expect-error TS(2416): Property 'getAddress' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async getAddress(accountIdx: any, subaddressIdx: any) {
    return this._invokeWorker("getAddress", Array.from(arguments));
  }

  async getAddressIndex(address: any) {
    let subaddressJson = await this._invokeWorker(
      "getAddressIndex",
      Array.from(arguments)
    );
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
    return MoneroWalletFull._sanitizeSubaddress(
      new MoneroSubaddress(subaddressJson)
    );
  }

  // @ts-expect-error TS(2416): Property 'setSubaddressLabel' in type 'MoneroWalle... Remove this comment to see the full error message
  async setSubaddressLabel(accountIdx: any, subaddressIdx: any, label: any) {
    return this._invokeWorker("setSubaddressLabel", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getIntegratedAddress' in type 'MoneroWal... Remove this comment to see the full error message
  async getIntegratedAddress(standardAddress: any, paymentId: any) {
    return new MoneroIntegratedAddress(
      await this._invokeWorker("getIntegratedAddress", Array.from(arguments))
    );
  }

  // @ts-expect-error TS(2416): Property 'decodeIntegratedAddress' in type 'Monero... Remove this comment to see the full error message
  async decodeIntegratedAddress(integratedAddress: any) {
    return new MoneroIntegratedAddress(
      await this._invokeWorker("decodeIntegratedAddress", Array.from(arguments))
    );
  }

  async setDaemonConnection(uriOrRpcConnection: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!uriOrRpcConnection) await this._invokeWorker("setDaemonConnection");
    else {
      // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
      let connection = !uriOrRpcConnection
        ? undefined
        : uriOrRpcConnection instanceof MoneroRpcConnection
        ? uriOrRpcConnection
        : new MoneroRpcConnection(uriOrRpcConnection);
      await this._invokeWorker(
        "setDaemonConnection",
        connection ? connection.config() : undefined
      );
    }
  }

  // @ts-expect-error TS(2416): Property 'getDaemonConnection' in type 'MoneroWall... Remove this comment to see the full error message
  async getDaemonConnection() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let rpcConfig = await this._invokeWorker("getDaemonConnection");
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
    return rpcConfig ? new MoneroRpcConnection(rpcConfig) : undefined;
  }

  // @ts-expect-error TS(2416): Property 'isConnectedToDaemon' in type 'MoneroWall... Remove this comment to see the full error message
  async isConnectedToDaemon() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("isConnectedToDaemon");
  }

  async getRestoreHeight() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getRestoreHeight");
  }

  async setRestoreHeight(restoreHeight: any) {
    return this._invokeWorker("setRestoreHeight", [restoreHeight]);
  }

  // @ts-expect-error TS(2416): Property 'getDaemonHeight' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async getDaemonHeight() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getDaemonHeight");
  }

  async getDaemonMaxPeerHeight() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getDaemonMaxPeerHeight");
  }

  // @ts-expect-error TS(2416): Property 'getHeightByDate' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async getHeightByDate(year: any, month: any, day: any) {
    return this._invokeWorker("getHeightByDate", [year, month, day]);
  }

  async isDaemonSynced() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("isDaemonSynced");
  }

  // @ts-expect-error TS(2416): Property 'getHeight' in type 'MoneroWalletFullProx... Remove this comment to see the full error message
  async getHeight() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getHeight");
  }

  // @ts-expect-error TS(2416): Property 'addListener' in type 'MoneroWalletFullPr... Remove this comment to see the full error message
  async addListener(listener: any) {
    let wrappedListener = new WalletWorkerListener(listener);
    let listenerId = wrappedListener.getId();
    // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
    LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
      "onSyncProgress_" + listenerId
    ] = [wrappedListener.onSyncProgress, wrappedListener];
    // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
    LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
      "onNewBlock_" + listenerId
    ] = [wrappedListener.onNewBlock, wrappedListener];
    // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
    LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
      "onBalancesChanged_" + listenerId
    ] = [wrappedListener.onBalancesChanged, wrappedListener];
    // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
    LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
      "onOutputReceived_" + listenerId
    ] = [wrappedListener.onOutputReceived, wrappedListener];
    // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
    LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
      "onOutputSpent_" + listenerId
    ] = [wrappedListener.onOutputSpent, wrappedListener];
    this._wrappedListeners.push(wrappedListener);
    return this._invokeWorker("addListener", [listenerId]);
  }

  async removeListener(listener: any) {
    for (let i = 0; i < this._wrappedListeners.length; i++) {
      if (this._wrappedListeners[i].getListener() === listener) {
        let listenerId = this._wrappedListeners[i].getId();
        await this._invokeWorker("removeListener", [listenerId]);
        // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
        delete LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
          "onSyncProgress_" + listenerId
        ];
        // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
        delete LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
          "onNewBlock_" + listenerId
        ];
        // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
        delete LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
          "onBalancesChanged_" + listenerId
        ];
        // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
        delete LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
          "onOutputReceived_" + listenerId
        ];
        // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
        delete LibraryUtils.instance.WORKER_OBJECTS[this._walletId].callbacks[
          "onOutputSpent_" + listenerId
        ];
        this._wrappedListeners.splice(i, 1);
        return;
      }
    }
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Listener is not registered with wallet");
  }

  getListeners() {
    let listeners = [];
    for (let wrappedListener of this._wrappedListeners)
      listeners.push(wrappedListener.getListener());
    return listeners;
  }

  async isSynced() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("isSynced");
  }

  // @ts-expect-error TS(2416): Property 'sync' in type 'MoneroWalletFullProxy' is... Remove this comment to see the full error message
  async sync(
    listenerOrStartHeight: any,
    startHeight: any,
    allowConcurrentCalls: any
  ) {
    // normalize params
    startHeight =
      listenerOrStartHeight instanceof MoneroWalletListener
        ? startHeight
        : listenerOrStartHeight;
    let listener =
      listenerOrStartHeight instanceof MoneroWalletListener
        ? listenerOrStartHeight
        : undefined;
    // @ts-expect-error TS(2345): Argument of type 'unknown' is not assignable to pa... Remove this comment to see the full error message
    if (startHeight === undefined)
      startHeight = Math.max(
        await this.getHeight(),
        await this.getRestoreHeight()
      );

    // register listener if given
    if (listener) await this.addListener(listener);

    // sync wallet in worker
    let err;
    let result;
    try {
      let resultJson = await this._invokeWorker("sync", [
        startHeight,
        allowConcurrentCalls,
      ]);
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      result = new MoneroSyncResult(
        resultJson.numBlocksFetched,
        resultJson.receivedMoney
      );
    } catch (e) {
      err = e;
    }

    // unregister listener
    if (listener) await this.removeListener(listener);

    // throw error or return
    if (err) throw err;
    return result;
  }

  // @ts-expect-error TS(2416): Property 'startSyncing' in type 'MoneroWalletFullP... Remove this comment to see the full error message
  async startSyncing(syncPeriodInMs: any) {
    return this._invokeWorker("startSyncing", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'stopSyncing' in type 'MoneroWalletFullPr... Remove this comment to see the full error message
  async stopSyncing() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("stopSyncing");
  }

  // @ts-expect-error TS(2416): Property 'scanTxs' in type 'MoneroWalletFullProxy'... Remove this comment to see the full error message
  async scanTxs(txHashes: any) {
    assert(
      Array.isArray(txHashes),
      "Must provide an array of txs hashes to scan"
    );
    return this._invokeWorker("scanTxs", [txHashes]);
  }

  // @ts-expect-error TS(2416): Property 'rescanSpent' in type 'MoneroWalletFullPr... Remove this comment to see the full error message
  async rescanSpent() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("rescanSpent");
  }

  // @ts-expect-error TS(2416): Property 'rescanBlockchain' in type 'MoneroWalletF... Remove this comment to see the full error message
  async rescanBlockchain() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("rescanBlockchain");
  }

  // @ts-expect-error TS(2416): Property 'getBalance' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async getBalance(accountIdx: any, subaddressIdx: any) {
    // @ts-expect-error TS(2345): Argument of type 'unknown' is not assignable to pa... Remove this comment to see the full error message
    return BigInt(
      await this._invokeWorker("getBalance", Array.from(arguments))
    );
  }

  // @ts-expect-error TS(2416): Property 'getUnlockedBalance' in type 'MoneroWalle... Remove this comment to see the full error message
  async getUnlockedBalance(accountIdx: any, subaddressIdx: any) {
    let unlockedBalanceStr = await this._invokeWorker(
      "getUnlockedBalance",
      Array.from(arguments)
    );
    // @ts-expect-error TS(2345): Argument of type 'unknown' is not assignable to pa... Remove this comment to see the full error message
    return BigInt(unlockedBalanceStr);
  }

  // @ts-expect-error TS(2416): Property 'getAccounts' in type 'MoneroWalletFullPr... Remove this comment to see the full error message
  async getAccounts(includeSubaddresses: any, tag: any) {
    let accounts = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let accountJson of await this._invokeWorker(
      "getAccounts",
      Array.from(arguments)
    )) {
      // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
      accounts.push(
        MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson))
      );
    }
    return accounts;
  }

  async getAccount(accountIdx: any, includeSubaddresses: any) {
    let accountJson = await this._invokeWorker(
      "getAccount",
      Array.from(arguments)
    );
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
    return MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson));
  }

  async createAccount(label: any) {
    let accountJson = await this._invokeWorker(
      "createAccount",
      Array.from(arguments)
    );
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
    return MoneroWalletFull._sanitizeAccount(new MoneroAccount(accountJson));
  }

  // @ts-expect-error TS(2416): Property 'getSubaddresses' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async getSubaddresses(accountIdx: any, subaddressIndices: any) {
    let subaddresses = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let subaddressJson of await this._invokeWorker(
      "getSubaddresses",
      Array.from(arguments)
    )) {
      // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
      subaddresses.push(
        MoneroWalletFull._sanitizeSubaddress(
          new MoneroSubaddress(subaddressJson)
        )
      );
    }
    return subaddresses;
  }

  async createSubaddress(accountIdx: any, label: any) {
    let subaddressJson = await this._invokeWorker(
      "createSubaddress",
      Array.from(arguments)
    );
    // @ts-expect-error TS(2554): Expected 3 arguments, but got 1.
    return MoneroWalletFull._sanitizeSubaddress(
      new MoneroSubaddress(subaddressJson)
    );
  }

  // @ts-expect-error TS(2416): Property 'getTxs' in type 'MoneroWalletFullProxy' ... Remove this comment to see the full error message
  async getTxs(query: any, missingTxHashes: any) {
    query = MoneroWallet._normalizeTxQuery(query);
    let respJson = await this._invokeWorker("getTxs", [
      query.getBlock().toJson(),
      missingTxHashes,
    ]);
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    return MoneroWalletFull._deserializeTxs(
      query,
      JSON.stringify({
        blocks: respJson.blocks,
        missingTxHashes: respJson.missingTxHashes,
      }),
      missingTxHashes
    ); // initialize txs from blocks json string TODO: this stringifies then utility parses, avoid
  }

  // @ts-expect-error TS(2416): Property 'getTransfers' in type 'MoneroWalletFullP... Remove this comment to see the full error message
  async getTransfers(query: any) {
    query = MoneroWallet._normalizeTransferQuery(query);
    let blockJsons = await this._invokeWorker("getTransfers", [
      query.getTxQuery().getBlock().toJson(),
    ]);
    return MoneroWalletFull._deserializeTransfers(
      query,
      JSON.stringify({ blocks: blockJsons })
    ); // initialize transfers from blocks json string TODO: this stringifies then utility parses, avoid
  }

  // @ts-expect-error TS(2416): Property 'getOutputs' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async getOutputs(query: any) {
    query = MoneroWallet._normalizeOutputQuery(query);
    let blockJsons = await this._invokeWorker("getOutputs", [
      query.getTxQuery().getBlock().toJson(),
    ]);
    return MoneroWalletFull._deserializeOutputs(
      query,
      JSON.stringify({ blocks: blockJsons })
    ); // initialize transfers from blocks json string TODO: this stringifies then utility parses, avoid
  }

  // @ts-expect-error TS(2416): Property 'exportOutputs' in type 'MoneroWalletFull... Remove this comment to see the full error message
  async exportOutputs(all: any) {
    return this._invokeWorker("exportOutputs", [all]);
  }

  // @ts-expect-error TS(2416): Property 'importOutputs' in type 'MoneroWalletFull... Remove this comment to see the full error message
  async importOutputs(outputsHex: any) {
    return this._invokeWorker("importOutputs", [outputsHex]);
  }

  // @ts-expect-error TS(2416): Property 'exportKeyImages' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async exportKeyImages(all: any) {
    let keyImages = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let keyImageJson of await this._invokeWorker("getKeyImages", [all]))
      keyImages.push(new MoneroKeyImage(keyImageJson));
    return keyImages;
  }

  // @ts-expect-error TS(2416): Property 'importKeyImages' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async importKeyImages(keyImages: any) {
    let keyImagesJson = [];
    for (let keyImage of keyImages) keyImagesJson.push(keyImage.toJson());
    return new MoneroKeyImageImportResult(
      await this._invokeWorker("importKeyImages", [keyImagesJson])
    );
  }

  async getNewKeyImagesFromLastImport() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError(
      "MoneroWalletFull.getNewKeyImagesFromLastImport() not implemented"
    );
  }

  // @ts-expect-error TS(2416): Property 'freezeOutput' in type 'MoneroWalletFullP... Remove this comment to see the full error message
  async freezeOutput(keyImage: any) {
    return this._invokeWorker("freezeOutput", [keyImage]);
  }

  // @ts-expect-error TS(2416): Property 'thawOutput' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async thawOutput(keyImage: any) {
    return this._invokeWorker("thawOutput", [keyImage]);
  }

  // @ts-expect-error TS(2416): Property 'isOutputFrozen' in type 'MoneroWalletFul... Remove this comment to see the full error message
  async isOutputFrozen(keyImage: any) {
    return this._invokeWorker("isOutputFrozen", [keyImage]);
  }

  async createTxs(config: any) {
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    let txSetJson = await this._invokeWorker("createTxs", [config.toJson()]);
    return new MoneroTxSet(txSetJson).txs;
  }

  async sweepOutput(config: any) {
    config = MoneroWallet._normalizeSweepOutputConfig(config);
    let txSetJson = await this._invokeWorker("sweepOutput", [config.toJson()]);
    return new MoneroTxSet(txSetJson).txs[0];
  }

  // @ts-expect-error TS(2416): Property 'sweepUnlocked' in type 'MoneroWalletFull... Remove this comment to see the full error message
  async sweepUnlocked(config: any) {
    config = MoneroWallet._normalizeSweepUnlockedConfig(config);
    let txSetsJson = await this._invokeWorker("sweepUnlocked", [
      config.toJson(),
    ]);
    let txs = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let txSetJson of txSetsJson)
      for (let tx of new MoneroTxSet(txSetJson).txs) txs.push(tx);
    return txs;
  }

  async sweepDust(relay: any) {
    return (
      new MoneroTxSet(
        await this._invokeWorker("sweepDust", [relay])
      ).txs || []
    );
  }

  // @ts-expect-error TS(2416): Property 'relayTxs' in type 'MoneroWalletFullProxy... Remove this comment to see the full error message
  async relayTxs(txsOrMetadatas: any) {
    assert(
      Array.isArray(txsOrMetadatas),
      "Must provide an array of txs or their metadata to relay"
    );
    let txMetadatas = [];
    for (let txOrMetadata of txsOrMetadatas)
      txMetadatas.push(
        txOrMetadata instanceof MoneroTxWallet
          ? txOrMetadata.getMetadata()
          : txOrMetadata
      );
    return this._invokeWorker("relayTxs", [txMetadatas]);
  }

  // @ts-expect-error TS(2416): Property 'describeTxSet' in type 'MoneroWalletFull... Remove this comment to see the full error message
  async describeTxSet(txSet: any) {
    return new MoneroTxSet(
      await this._invokeWorker("describeTxSet", [txSet.toJson()])
    );
  }

  // @ts-expect-error TS(2416): Property 'signTxs' in type 'MoneroWalletFullProxy'... Remove this comment to see the full error message
  async signTxs(unsignedTxHex: any) {
    return this._invokeWorker("signTxs", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'submitTxs' in type 'MoneroWalletFullProx... Remove this comment to see the full error message
  async submitTxs(signedTxHex: any) {
    return this._invokeWorker("submitTxs", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'signMessage' in type 'MoneroWalletFullPr... Remove this comment to see the full error message
  async signMessage(
    message: any,
    signatureType: any,
    accountIdx: any,
    subaddressIdx: any
  ) {
    return this._invokeWorker("signMessage", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'verifyMessage' in type 'MoneroWalletFull... Remove this comment to see the full error message
  async verifyMessage(message: any, address: any, signature: any) {
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 1.
    return new MoneroMessageSignatureResult(
      await this._invokeWorker("verifyMessage", Array.from(arguments))
    );
  }

  // @ts-expect-error TS(2416): Property 'getTxKey' in type 'MoneroWalletFullProxy... Remove this comment to see the full error message
  async getTxKey(txHash: any) {
    return this._invokeWorker("getTxKey", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'checkTxKey' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async checkTxKey(txHash: any, txKey: any, address: any) {
    return new MoneroCheckTx(
      await this._invokeWorker("checkTxKey", Array.from(arguments))
    );
  }

  // @ts-expect-error TS(2416): Property 'getTxProof' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async getTxProof(txHash: any, address: any, message: any) {
    return this._invokeWorker("getTxProof", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'checkTxProof' in type 'MoneroWalletFullP... Remove this comment to see the full error message
  async checkTxProof(txHash: any, address: any, message: any, signature: any) {
    return new MoneroCheckTx(
      await this._invokeWorker("checkTxProof", Array.from(arguments))
    );
  }

  // @ts-expect-error TS(2416): Property 'getSpendProof' in type 'MoneroWalletFull... Remove this comment to see the full error message
  async getSpendProof(txHash: any, message: any) {
    return this._invokeWorker("getSpendProof", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'checkSpendProof' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async checkSpendProof(txHash: any, message: any, signature: any) {
    return this._invokeWorker("checkSpendProof", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getReserveProofWallet' in type 'MoneroWa... Remove this comment to see the full error message
  async getReserveProofWallet(message: any) {
    return this._invokeWorker("getReserveProofWallet", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getReserveProofAccount' in type 'MoneroW... Remove this comment to see the full error message
  async getReserveProofAccount(accountIdx: any, amount: any, message: any) {
    try {
      return await this._invokeWorker("getReserveProofAccount", [
        accountIdx,
        amount.toString(),
        message,
      ]);
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      throw new MoneroError(e.message, -1);
    }
  }

  // @ts-expect-error TS(2416): Property 'checkReserveProof' in type 'MoneroWallet... Remove this comment to see the full error message
  async checkReserveProof(address: any, message: any, signature: any) {
    try {
      return new MoneroCheckReserve(
        await this._invokeWorker("checkReserveProof", Array.from(arguments))
      );
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      throw new MoneroError(e.message, -1);
    }
  }

  // @ts-expect-error TS(2416): Property 'getTxNotes' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async getTxNotes(txHashes: any) {
    return this._invokeWorker("getTxNotes", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'setTxNotes' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async setTxNotes(txHashes: any, notes: any) {
    return this._invokeWorker("setTxNotes", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getAddressBookEntries' in type 'MoneroWa... Remove this comment to see the full error message
  async getAddressBookEntries(entryIndices: any) {
    if (!entryIndices) entryIndices = [];
    let entries = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let entryJson of await this._invokeWorker(
      "getAddressBookEntries",
      Array.from(arguments)
    )) {
      entries.push(new MoneroAddressBookEntry(entryJson));
    }
    return entries;
  }

  // @ts-expect-error TS(2416): Property 'addAddressBookEntry' in type 'MoneroWall... Remove this comment to see the full error message
  async addAddressBookEntry(address: any, description: any) {
    return this._invokeWorker("addAddressBookEntry", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'editAddressBookEntry' in type 'MoneroWal... Remove this comment to see the full error message
  async editAddressBookEntry(
    index: any,
    setAddress: any,
    address: any,
    setDescription: any,
    description: any
  ) {
    return this._invokeWorker("editAddressBookEntry", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'deleteAddressBookEntry' in type 'MoneroW... Remove this comment to see the full error message
  async deleteAddressBookEntry(entryIdx: any) {
    return this._invokeWorker("deleteAddressBookEntry", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'tagAccounts' in type 'MoneroWalletFullPr... Remove this comment to see the full error message
  async tagAccounts(tag: any, accountIndices: any) {
    return this._invokeWorker("tagAccounts", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'untagAccounts' in type 'MoneroWalletFull... Remove this comment to see the full error message
  async untagAccounts(accountIndices: any) {
    return this._invokeWorker("untagAccounts", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getAccountTags' in type 'MoneroWalletFul... Remove this comment to see the full error message
  async getAccountTags() {
    return this._invokeWorker("getAccountTags", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'setAccountTagLabel' in type 'MoneroWalle... Remove this comment to see the full error message
  async setAccountTagLabel(tag: any, label: any) {
    return this._invokeWorker("setAccountTagLabel", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getPaymentUri' in type 'MoneroWalletFull... Remove this comment to see the full error message
  async getPaymentUri(config: any) {
    config = MoneroWallet._normalizeCreateTxsConfig(config);
    return this._invokeWorker("getPaymentUri", [config.toJson()]);
  }

  // @ts-expect-error TS(2416): Property 'parsePaymentUri' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async parsePaymentUri(uri: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroTxConfig(
      await this._invokeWorker("parsePaymentUri", Array.from(arguments))
    );
  }

  // @ts-expect-error TS(2416): Property 'getAttribute' in type 'MoneroWalletFullP... Remove this comment to see the full error message
  async getAttribute(key: any) {
    return this._invokeWorker("getAttribute", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'setAttribute' in type 'MoneroWalletFullP... Remove this comment to see the full error message
  async setAttribute(key: any, val: any) {
    return this._invokeWorker("setAttribute", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'startMining' in type 'MoneroWalletFullPr... Remove this comment to see the full error message
  async startMining(
    numThreads: any,
    backgroundMining: any,
    ignoreBattery: any
  ) {
    return this._invokeWorker("startMining", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'stopMining' in type 'MoneroWalletFullPro... Remove this comment to see the full error message
  async stopMining() {
    return this._invokeWorker("stopMining", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'isMultisigImportNeeded' in type 'MoneroW... Remove this comment to see the full error message
  async isMultisigImportNeeded() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("isMultisigImportNeeded");
  }

  async isMultisig() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("isMultisig");
  }

  // @ts-expect-error TS(2416): Property 'getMultisigInfo' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async getMultisigInfo() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroMultisigInfo(await this._invokeWorker("getMultisigInfo"));
  }

  // @ts-expect-error TS(2416): Property 'prepareMultisig' in type 'MoneroWalletFu... Remove this comment to see the full error message
  async prepareMultisig() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("prepareMultisig");
  }

  // @ts-expect-error TS(2416): Property 'makeMultisig' in type 'MoneroWalletFullP... Remove this comment to see the full error message
  async makeMultisig(multisigHexes: any, threshold: any, password: any) {
    return await this._invokeWorker("makeMultisig", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'exchangeMultisigKeys' in type 'MoneroWal... Remove this comment to see the full error message
  async exchangeMultisigKeys(multisigHexes: any, password: any) {
    return new MoneroMultisigInitResult(
      await this._invokeWorker("exchangeMultisigKeys", Array.from(arguments))
    );
  }

  // @ts-expect-error TS(2416): Property 'exportMultisigHex' in type 'MoneroWallet... Remove this comment to see the full error message
  async exportMultisigHex() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("exportMultisigHex");
  }

  // @ts-expect-error TS(2416): Property 'importMultisigHex' in type 'MoneroWallet... Remove this comment to see the full error message
  async importMultisigHex(multisigHexes: any) {
    return this._invokeWorker("importMultisigHex", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'signMultisigTxHex' in type 'MoneroWallet... Remove this comment to see the full error message
  async signMultisigTxHex(multisigTxHex: any) {
    return new MoneroMultisigSignResult(
      await this._invokeWorker("signMultisigTxHex", Array.from(arguments))
    );
  }

  // @ts-expect-error TS(2416): Property 'submitMultisigTxHex' in type 'MoneroWall... Remove this comment to see the full error message
  async submitMultisigTxHex(signedMultisigTxHex: any) {
    return this._invokeWorker("submitMultisigTxHex", Array.from(arguments));
  }

  async getData() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("getData");
  }

  async moveTo(path: any) {
    return MoneroWalletFull._moveTo(path, this);
  }

  async changePassword(oldPassword: any, newPassword: any) {
    await this._invokeWorker("changePassword", Array.from(arguments));
    if (this._path) await this.save(); // auto save
  }

  async save() {
    return MoneroWalletFull._save(this);
  }

  async close(save: any) {
    if (save) await this.save();
    while (this._wrappedListeners.length)
      await this.removeListener(this._wrappedListeners[0].getListener());
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    await this._invokeWorker("close");
    // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
    delete LibraryUtils.instance.WORKER_OBJECTS[this._walletId];
  }

  // @ts-expect-error TS(2416): Property 'isClosed' in type 'MoneroWalletFullProxy... Remove this comment to see the full error message
  async isClosed() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("isClosed");
  }

  // --------------------------- PRIVATE HELPERS ------------------------------

  async _invokeWorker(fnName: any, args: any) {
    return await LibraryUtils.instance.invokeWorker(this._walletId, fnName, args);
  }
}

// -------------------------------- LISTENING ---------------------------------

/**
 * Receives notifications directly from wasm c++.
 *
 * @private
 */
class WalletFullListener {
  _wallet: any;

  constructor(wallet: any) {
    this._wallet = wallet;
  }

  async onSyncProgress(
    height: any,
    startHeight: any,
    endHeight: any,
    percentDone: any,
    message: any
  ) {
    for (let listener of this._wallet.getListeners())
      await listener.onSyncProgress(
        height,
        startHeight,
        endHeight,
        percentDone,
        message
      );
  }

  async onNewBlock(height: any) {
    for (let listener of this._wallet.getListeners())
      await listener.onNewBlock(height);
  }

  async onBalancesChanged(newBalanceStr: any, newUnlockedBalanceStr: any) {
    for (let listener of this._wallet.getListeners())
      await listener.onBalancesChanged(
        BigInt(newBalanceStr),
        BigInt(newUnlockedBalanceStr)
      );
  }

  async onOutputReceived(
    height: any,
    txHash: any,
    amountStr: any,
    accountIdx: any,
    subaddressIdx: any,
    version: any,
    unlockHeight: any,
    isLocked: any
  ) {
    // build received output
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let output = new MoneroOutputWallet();
    output.setAmount(BigInt(amountStr));
    output.setAccountIndex(accountIdx);
    output.setSubaddressIndex(subaddressIdx);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let tx = new MoneroTxWallet();
    tx.setHash(txHash);
    tx.setVersion(version);
    tx.setUnlockHeight(unlockHeight);
    output.setTx(tx);
    tx.setOutputs([output]);
    tx.setIsIncoming(true);
    tx.setIsLocked(isLocked);
    if (height > 0) {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 0.
      let block = new MoneroBlock().setHeight(height);
      block.setTxs([tx]);
      tx.setBlock(block);
      tx.setIsConfirmed(true);
      tx.setInTxPool(false);
      tx.setIsFailed(false);
    } else {
      tx.setIsConfirmed(false);
      tx.setInTxPool(true);
    }

    // announce output
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    for (let listener of this._wallet.getListeners())
      await listener.onOutputReceived(tx.getOutputs()[0]);
  }

  async onOutputSpent(
    height: any,
    txHash: any,
    amountStr: any,
    accountIdxStr: any,
    subaddressIdxStr: any,
    version: any,
    unlockHeight: any,
    isLocked: any
  ) {
    // build spent output
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let output = new MoneroOutputWallet();
    output.setAmount(BigInt(amountStr));
    if (accountIdxStr) output.setAccountIndex(parseInt(accountIdxStr));
    if (subaddressIdxStr) output.setSubaddressIndex(parseInt(subaddressIdxStr));
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let tx = new MoneroTxWallet();
    tx.setHash(txHash);
    tx.setVersion(version);
    tx.setUnlockHeight(unlockHeight);
    tx.setIsLocked(isLocked);
    output.setTx(tx);
    tx.setInputs([output]);
    if (height > 0) {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 0.
      let block = new MoneroBlock().setHeight(height);
      block.setTxs([tx]);
      tx.setBlock(block);
      tx.setIsConfirmed(true);
      tx.setInTxPool(false);
      tx.setIsFailed(false);
    } else {
      tx.setIsConfirmed(false);
      tx.setInTxPool(true);
    }

    // notify wallet listeners
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    for (let listener of this._wallet.getListeners())
      await listener.onOutputSpent(tx.getInputs()[0]);
  }
}

/**
 * Internal listener to bridge notifications to external listeners.
 *
 * @private
 */
class WalletWorkerListener {
  _id: any;
  _listener: any;

  constructor(listener: any) {
    this._id = GenUtils.getUUID();
    this._listener = listener;
  }

  getId() {
    return this._id;
  }

  getListener() {
    return this._listener;
  }

  onSyncProgress(
    height: any,
    startHeight: any,
    endHeight: any,
    percentDone: any,
    message: any
  ) {
    this._listener.onSyncProgress(
      height,
      startHeight,
      endHeight,
      percentDone,
      message
    );
  }

  async onNewBlock(height: any) {
    await this._listener.onNewBlock(height);
  }

  async onBalancesChanged(newBalanceStr: any, newUnlockedBalanceStr: any) {
    await this._listener.onBalancesChanged(
      BigInt(newBalanceStr),
      BigInt(newUnlockedBalanceStr)
    );
  }

  async onOutputReceived(blockJson: any) {
    // @ts-expect-error TS(2339): Property 'DeserializationType' does not exist on t... Remove this comment to see the full error message
    let block = new MoneroBlock(
      blockJson,
      MoneroBlock.DeserializationType.TX_WALLET
    );
    await this._listener.onOutputReceived(block.txs[0].getOutputs()[0]);
  }

  async onOutputSpent(blockJson: any) {
    // @ts-expect-error TS(2339): Property 'DeserializationType' does not exist on t... Remove this comment to see the full error message
    let block = new MoneroBlock(
      blockJson,
      MoneroBlock.DeserializationType.TX_WALLET
    );
    await this._listener.onOutputSpent(block.txs[0].getInputs()[0]);
  }
}

// @ts-expect-error TS(2339): Property 'DEFAULT_SYNC_PERIOD_IN_MS' does not exis... Remove this comment to see the full error message
MoneroWalletFull.DEFAULT_SYNC_PERIOD_IN_MS = 10000; // 10 second sync period by default

export default MoneroWalletFull;
