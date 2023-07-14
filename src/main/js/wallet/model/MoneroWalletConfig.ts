import * as nodejsfs from "fs";
import GenUtils from "../../common/GenUtils";
import MoneroError from "../../common/MoneroError";
import MoneroNetworkType from "../../daemon/model/MoneroNetworkType";
import MoneroRpcConnection from "../../common/MoneroRpcConnection";

export interface MoneroWalletConfigOpts {
  path: string;
  password: string;
  networkType?: string | number;
  serverUri?: string;
  serverUsername?: string;
  serverPassword?: string;
  rejectUnauthorized?: boolean;
  server?: MoneroRpcConnection;
  keysData?: Uint8Array;
  cacheData?: Uint8Array;
  proxyToWorker?: boolean;
  fs?: typeof nodejsfs;
  saveCurrent?: boolean;
  accountLookahead?: number;
  subaddressLookahead?: number;

  _mnemonic?: string;
  _seedOffset?: string;
  _primaryAddress?: string;
  _privateViewKey?: string;
  _privateSpendKey?: string;
  _restoreHeight?: number;
  _language?: string;
}

/**
 * Configuration to create a Monero wallet.
 */
class MoneroWalletConfig {
  config: MoneroWalletConfigOpts;

  static SUPPORTED_FIELDS = [
    "path",
    "password",
    "networkType",
    "serverUri",
    "serverUsername",
    "serverPassword",
    "rejectUnauthorized",
    "mnemonic",
    "seedOffset",
    "primaryAddress",
    "privateViewKey",
    "privateSpendKey",
    "restoreHeight",
    "language",
    "saveCurrent",
    "proxyToWorker",
    "fs",
    "keysData",
    "cacheData",
    "accountLookahead",
    "subaddressLookahead",
  ];

  /**
   * Construct a configuration to open or create a wallet.
   *
   * @param {object|MoneroWalletConfig} config - MoneroWalletConfig or equivalent config object
   * @param {string} config.path - path of the wallet to open or create
   * @param {string} config.password - password of the wallet to open
   * @param {string|number} config.networkType - network type of the wallet to open (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
   * @param {string} [config.serverUri] - uri of the wallet's server (optional)
   * @param {string} [config.serverUsername] - username of the wallet's server (optional)
   * @param {string} [config.serverPassword] - password of the wallet's server (optional)
   * @param {boolean} [config.rejectUnauthorized] - reject self-signed server certificates if true (default true)
   * @param {MoneroRpcConnection|object} [config.server] - MoneroRpcConnection or equivalent JS object configuring the server connection (optional)
   * @param {Uint8Array} [config.keysData] - wallet keys data to open (optional)
   * @param {Uint8Array} [config.cacheData] - wallet cache data to open (optional)
   * @param {boolean} [config.proxyToWorker] - proxies wallet operations to a worker in order to not block the main thread (default true)
   * @param {typeof nodejsfs} [config.fs] - Node.js compatible file system to use (defaults to disk or in-memory FS if browser)
   * @param {boolean} config.saveCurrent - specifies if the current RPC wallet should be saved before being closed (optional)
   * @param {number} config.accountLookahead - number of accounts to scan (optional)
   * @param {number} config.subaddressLookahead - number of subaddresses to scan per account (optional)
   */
  constructor(config?: MoneroWalletConfigOpts | MoneroWalletConfig) {
    // initialize internal config
    if (config instanceof MoneroWalletConfig) config = config.toJson();
    else if (typeof config === "object") config = Object.assign({}, config);
    else
      throw new MoneroError(
        "config must be a MoneroWalletConfig or Config object"
      );

    this.config = config;

    // normalize config
    this.networkType = "networkType" in config ? config.networkType : undefined;
    this.server = config.server;
    this.config.server = undefined;

    // check for unsupported fields
    for (const key of Object.keys(this.config)) {
      if (!GenUtils.arrayContains(MoneroWalletConfig.SUPPORTED_FIELDS, key)) {
        throw new MoneroError(
          "Wallet config includes unsupported field: '" + key + "'"
        );
      }
    }
  }

  toJson() {
    const json = Object.assign({}, this.config);
    json.fs = undefined; // remove filesystem
    return json;
  }

  public get path() {
    return this.config.path;
  }

  public set path(path: string) {
    Object.assign(this.config, { path });
  }

  public get password() {
    return this.config.password;
  }

  public set password(password: string) {
    Object.assign(this.config, { password });
  }

  public get networkType() {
    return this.config.networkType;
  }

  public set networkType(networkTypeOrStr: undefined | string | number) {
    Object.assign(this.config, {
      networkType:
        typeof networkTypeOrStr === "string"
          ? MoneroNetworkType.parse(networkTypeOrStr)
          : networkTypeOrStr,
    });
  }

  public get server() {
    return !this.config.serverUri
      ? undefined
      : new MoneroRpcConnection({
          uri: this.config.serverUri,
          username: this.config.serverUsername,
          password: this.config.serverPassword,
          rejectUnauthorized: this.config.rejectUnauthorized,
        });
  }

  public set server(server: undefined | MoneroRpcConnection) {
    if (server && !(server instanceof MoneroRpcConnection))
      server = new MoneroRpcConnection(server);

    this.config.serverUri = server === undefined ? undefined : server.uri;
    this.config.serverUsername =
      server === undefined ? undefined : server.username;
    this.config.serverPassword =
      server === undefined ? undefined : server.password;
    this.config.rejectUnauthorized =
      server === undefined ? undefined : server.rejectUnauthorized;
  }

  public get serverUri() {
    return this.config.serverUri;
  }

  public set serverUri(serverUri: undefined | string) {
    Object.assign(this.config, { serverUri });
  }

  public get serverUsername() {
    return this.config.serverUsername;
  }

  public set serverUsername(serverUsername: undefined | string) {
    Object.assign(this.config, { serverUsername });
  }

  public get serverPassword() {
    return this.config.serverPassword;
  }

  public set serverPassword(serverPassword: undefined | string) {
    Object.assign(this.config, { serverPassword });
  }

  public get rejectUnauthorized() {
    return this.config.rejectUnauthorized;
  }

  public set rejectUnauthorized(rejectUnauthorized: undefined | boolean) {
    Object.assign(this.config, { rejectUnauthorized });
  }

  public get mnemonic() {
    return this.config._mnemonic;
  }

  public set mnemonic(mnemonic: undefined | string) {
    Object.assign(this.config, { mnemonic });
  }

  public get seedOffset() {
    return this.config._seedOffset;
  }

  public set seedOffset(seedOffset: undefined | string) {
    Object.assign(this.config, { seedOffset });
  }

  public get primaryAddress() {
    return this.config._primaryAddress;
  }

  public set primaryAddress(primaryAddress: undefined | string) {
    Object.assign(this.config, { primaryAddress });
  }

  public get privateViewKey() {
    return this.config._privateViewKey;
  }

  public set privateViewKey(privateViewKey: undefined | string) {
    Object.assign(this.config, { privateViewKey });
  }

  public get privateSpendKey() {
    return this.config._privateSpendKey;
  }

  public set privateSpendKey(privateSpendKey: undefined | string) {
    Object.assign(this.config, { privateSpendKey });
  }

  public get restoreHeight() {
    return this.config._restoreHeight;
  }

  public set restoreHeight(restoreHeight: undefined | number) {
    Object.assign(this.config, { restoreHeight });
  }

  public get language() {
    return this.config._language;
  }

  public set language(language: undefined | string) {
    Object.assign(this.config, { language });
  }

  public get saveCurrent() {
    return this.config.saveCurrent;
  }

  public set saveCurrent(saveCurrent: undefined | boolean) {
    Object.assign(this.config, { saveCurrent });
  }

  public get proxyToWorker() {
    return this.config.proxyToWorker;
  }

  public set proxyToWorker(proxyToWorker: undefined | boolean) {
    Object.assign(this.config, { proxyToWorker });
  }

  public get fs() {
    return this.config.fs;
  }

  public set fs(fs: undefined | typeof nodejsfs) {
    Object.assign(this.config, { fs });
  }

  public get keysData() {
    return this.config.keysData;
  }

  public set keysData(keysData: undefined | Uint8Array) {
    Object.assign(this.config, { keysData });
  }

  public get cacheData() {
    return this.config.cacheData;
  }

  public set cacheData(cacheData: undefined | Uint8Array) {
    Object.assign(this.config, { cacheData });
  }

  public get accountLookahead() {
    return this.config.accountLookahead;
  }

  public set accountLookahead(accountLookahead: undefined | number) {
    Object.assign(this.config, { accountLookahead });
  }

  public get subaddressLookahead() {
    return this.config.subaddressLookahead;
  }

  public set subaddressLookahead(subaddressLookahead: undefined | number) {
    Object.assign(this.config, { subaddressLookahead });
  }
}

export default MoneroWalletConfig;
