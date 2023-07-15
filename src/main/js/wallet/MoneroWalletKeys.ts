import assert from "assert";
import LibraryUtils from "../common/LibraryUtils";
import MoneroError from "../common/MoneroError";
import MoneroNetworkType from "../daemon/model/MoneroNetworkType";
import MoneroSubaddress from "./model/MoneroSubaddress";
import MoneroVersion from "../daemon/model/MoneroVersion";
import MoneroWallet from "./MoneroWallet";
import MoneroWalletConfig from "./model/MoneroWalletConfig";

/**
 * Implements a MoneroWallet which only manages keys using WebAssembly.
 *
 * @implements {MoneroWallet}
 * @hideconstructor
 */
class MoneroWalletKeys extends MoneroWallet {
  _cppAddress: any;
  _isClosed: any;
  _module: any;

  // --------------------------- STATIC UTILITIES -----------------------------

  /**
   * <p>Create a wallet using WebAssembly bindings to monero-project.</p>
   *
   * <p>Example:</p>
   *
   * <code>
   * let wallet = await MoneroWalletKeys.createWallet({<br>
   * &nbsp;&nbsp; password: "abc123",<br>
   * &nbsp;&nbsp; networkType: MoneroNetworkType.STAGENET,<br>
   * &nbsp;&nbsp; mnemonic: "coexist igloo pamphlet lagoon..."<br>
   * });
   * </code>
   *
   * @param {MoneroWalletConfig|object} config - MoneroWalletConfig or equivalent config object
   * @param {string|number} config.networkType - network type of the wallet to create (one of "mainnet", "testnet", "stagenet" or MoneroNetworkType.MAINNET|TESTNET|STAGENET)
   * @param {string} config.mnemonic - mnemonic of the wallet to create (optional, random wallet created if neither mnemonic nor keys given)
   * @param {string} config.seedOffset - the offset used to derive a new seed from the given mnemonic to recover a secret wallet from the mnemonic phrase
   * @param {string} config.primaryAddress - primary address of the wallet to create (only provide if restoring from keys)
   * @param {string} [config.privateViewKey] - private view key of the wallet to create (optional)
   * @param {string} [config.privateSpendKey] - private spend key of the wallet to create (optional)
   * @param {string} [config.language] - language of the wallet's mnemonic phrase (defaults to "English" or auto-detected)
   * @return {Promise<MoneroWalletKeys>} the created wallet
   */
  static async createWallet(
    config: MoneroWalletConfig,
  ): Promise<MoneroWalletKeys> {
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
        "Wallet may be initialized with a mnemonic or keys but not both",
      );
    }
    if (config.networkType === undefined)
      throw new MoneroError(
        "Must provide a networkType: 'mainnet', 'testnet' or 'stagenet'",
      );
    if (config.saveCurrent === true)
      throw new MoneroError(
        "Cannot save current wallet when creating keys-only wallet",
      );

    // create wallet
    if (config.mnemonic !== undefined) {
      if (config.language !== undefined)
        throw new MoneroError(
          "Cannot provide language when creating wallet from mnemonic",
        );
      return MoneroWalletKeys._createWalletFromMnemonic(
        config.networkType,
        config.mnemonic,
        config.seedOffset,
      );
    } else if (
      config.privateSpendKey !== undefined ||
      config.primaryAddress !== undefined
    ) {
      if (config.seedOffset !== undefined)
        throw new MoneroError(
          "Cannot provide seedOffset when creating wallet from keys",
        );
      return MoneroWalletKeys._createWalletFromKeys(
        config.networkType,
        config.primaryAddress,
        config.privateViewKey,
        config.privateSpendKey,
        config.language,
      );
    } else {
      if (config.seedOffset !== undefined)
        throw new MoneroError(
          "Cannot provide seedOffset when creating random wallet",
        );
      if (config.restoreHeight !== undefined)
        throw new MoneroError(
          "Cannot provide restoreHeight when creating random wallet",
        );
      return MoneroWalletKeys._createWalletRandom(
        config.networkType,
        config.language,
      );
    }
  }

  static async _createWalletRandom(networkType: any, language: any) {
    // validate and sanitize params
    MoneroNetworkType.validate(networkType);
    if (language === undefined) language = "English";

    // load wasm module
    const module = await LibraryUtils.instance.loadKeysModule();

    // queue call to wasm module
    return module.queueTask(async function () {
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        const callbackFn = async function (cppAddress: any) {
          if (typeof cppAddress === "string")
            reject(new MoneroError(cppAddress));
          else resolve(new MoneroWalletKeys(cppAddress));
        };

        // create wallet in wasm and invoke callback when done
        module.create_keys_wallet_random(networkType, language, callbackFn);
      });
    });
  }

  static async _createWalletFromMnemonic(
    networkType: any,
    mnemonic: any,
    seedOffset: any,
  ) {
    // validate and sanitize params
    MoneroNetworkType.validate(networkType);
    if (mnemonic === undefined)
      throw Error("Must define mnemonic phrase to create wallet from");
    if (seedOffset === undefined) seedOffset = "";

    // load wasm module
    const module = await LibraryUtils.instance.loadKeysModule();

    // queue call to wasm module
    return module.queueTask(async function () {
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        const callbackFn = async function (cppAddress: any) {
          if (typeof cppAddress === "string")
            reject(new MoneroError(cppAddress));
          else resolve(new MoneroWalletKeys(cppAddress));
        };

        // create wallet in wasm and invoke callback when done
        module.create_keys_wallet_from_mnemonic(
          networkType,
          mnemonic,
          seedOffset,
          callbackFn,
        );
      });
    });
  }

  static async _createWalletFromKeys(
    networkType: any,
    address: any,
    privateViewKey: any,
    privateSpendKey: any,
    language: any,
  ) {
    // validate and sanitize params
    MoneroNetworkType.validate(networkType);
    if (address === undefined) address = "";
    if (privateViewKey === undefined) privateViewKey = "";
    if (privateSpendKey === undefined) privateSpendKey = "";
    if (language === undefined) language = "English";

    // load wasm module
    const module = await LibraryUtils.instance.loadKeysModule();

    // queue call to wasm module
    return module.queueTask(async function () {
      return new Promise(function (resolve, reject) {
        // define callback for wasm
        const callbackFn = async function (cppAddress: any) {
          if (typeof cppAddress === "string")
            reject(new MoneroError(cppAddress));
          else resolve(new MoneroWalletKeys(cppAddress));
        };

        // create wallet in wasm and invoke callback when done
        module.create_keys_wallet_from_keys(
          networkType,
          address,
          privateViewKey,
          privateSpendKey,
          language,
          callbackFn,
        );
      });
    });
  }

  static async getMnemonicLanguages() {
    const module = await LibraryUtils.instance.loadKeysModule();
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
   */
  constructor(cppAddress: any) {
    super();
    this._cppAddress = cppAddress;
    this._module = LibraryUtils.instance.WASM_MODULE;
    if (!this._module.create_full_wallet)
      throw new MoneroError(
        "WASM module not loaded - create wallet instance using static utilities",
      ); // static utilites pre-load wasm module
  }

  async addListener(listener: any) {
    throw new MoneroError("MoneroWalletKeys does not support adding listeners");
  }

  async removeListener(listener: any) {
    throw new MoneroError(
      "MoneroWalletKeys does not support removing listeners",
    );
  }

  async isViewOnly() {
    const that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.is_view_only(that._cppAddress);
    });
  }

  async isConnectedToDaemon() {
    return false;
  }

  async getVersion() {
    const that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      const versionStr = that._module.get_version(that._cppAddress);
      const versionJson = JSON.parse(versionStr);
      return new MoneroVersion(versionJson.number, versionJson.isRelease);
    });
  }

  /**
   * @ignore
   */
  getPath() {
    this._assertNotClosed();
    throw new MoneroError("MoneroWalletKeys does not support a persisted path");
  }

  async getMnemonic() {
    const that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      const mnemonic = that._module.get_mnemonic(that._cppAddress);
      const errorStr = "error: ";
      if (mnemonic.indexOf(errorStr) === 0)
        throw new MoneroError(mnemonic.substring(errorStr.length));
      return mnemonic ? mnemonic : undefined;
    });
  }

  async getMnemonicLanguage() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let mnemonicLanguage = that._module.get_mnemonic_language(
        that._cppAddress,
      );
      return mnemonicLanguage ? mnemonicLanguage : undefined;
    });
  }

  async getPrivateSpendKey() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      let privateSpendKey = that._module.get_private_spend_key(
        that._cppAddress,
      );
      return privateSpendKey ? privateSpendKey : undefined;
    });
  }

  async getPrivateViewKey() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.get_private_view_key(that._cppAddress);
    });
  }

  async getPublicViewKey() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.get_public_view_key(that._cppAddress);
    });
  }

  async getPublicSpendKey() {
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.get_public_spend_key(that._cppAddress);
    });
  }

  async getAddress(accountIdx: any, subaddressIdx: any) {
    this._assertNotClosed();
    assert(typeof accountIdx === "number");
    let that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      return that._module.get_address(
        that._cppAddress,
        accountIdx,
        subaddressIdx,
      );
    });
  }

  async getAddressIndex(address: any) {
    this._assertNotClosed();
    const that = this;
    return that._module.queueTask(async function () {
      that._assertNotClosed();
      const resp = that._module.get_address_index(that._cppAddress, address);
      if (resp.charAt(0) !== "{") throw new MoneroError(resp);
      return new MoneroSubaddress(JSON.parse(resp));
    });
  }

  getAccounts() {
    this._assertNotClosed();
    throw new MoneroError(
      "MoneroWalletKeys does not support getting an enumerable set of accounts; query specific accounts",
    );
  }

  // getIntegratedAddress(paymentId)  // TODO
  // decodeIntegratedAddress

  async close(save: any) {
    if (this._isClosed) return; // closing a closed wallet has no effect

    // save wallet if requested
    if (save) this.save();

    // queue task to use wasm module
    const that = this;
    return that._module.queueTask(async function () {
      return new Promise(function (resolve) {
        if (that._isClosed) {
          resolve();
          return;
        }

        // define callback for wasm
        const callbackFn = async function () {
          delete that._cppAddress;
          that._isClosed = true;
          resolve();
        };

        // close wallet in wasm and invoke callback when done
        that._module.close(that._cppAddress, false, callbackFn); // saving handled external to webassembly
      });
    });
  }

  async isClosed() {
    return this._isClosed;
  }

  // ----------- ADD JSDOC FOR SUPPORTED DEFAULT IMPLEMENTATIONS --------------

  async getPrimaryAddress() {
    return super.getPrimaryAddress(...arguments);
  }
  async getSubaddress() {
    return super.getSubaddress(...arguments);
  }

  // ----------------------------- PRIVATE HELPERS ----------------------------

  _assertNotClosed() {
    if (this._isClosed) throw new MoneroError("Wallet is closed");
  }
}

export default MoneroWalletKeys;
