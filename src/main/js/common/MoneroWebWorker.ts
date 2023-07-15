import assert from "assert";
import GenUtils from "./GenUtils";
import HttpClient, { RequestOpts } from "./HttpClient";
import LibraryUtils from "./LibraryUtils";
import MoneroBan from "../daemon/model/MoneroBan";
import MoneroBlock from "../daemon/model/MoneroBlock";
import MoneroDaemonListener from "../daemon/model/MoneroDaemonListener";
import MoneroDaemonRpc, {
  MoneroDaemonRpcConfigOpts,
} from "../daemon/MoneroDaemonRpc";
import MoneroError from "./MoneroError";
import MoneroKeyImage from "../daemon/model/MoneroKeyImage";
import MoneroRpcConnection from "./MoneroRpcConnection";
import MoneroTxConfig from "../wallet/model/MoneroTxConfig";
import MoneroTxSet from "../wallet/model/MoneroTxSet";
import MoneroUtils from "../common/MoneroUtils";
import MoneroWalletConfig, {
  MoneroWalletConfigOpts,
} from "../wallet/model/MoneroWalletConfig";
import MoneroWalletListener from "../wallet/model/MoneroWalletListener";
import MoneroWalletFull from "../wallet/MoneroWalletFull";
import MoneroOutputWallet from "../wallet/model/MoneroOutputWallet";

/**
 * Internal listener to bridge notifications to external listeners.
 *
 */
class WalletWorkerHelperListener extends MoneroWalletListener {
  private _id: any;
  walletId: any;
  worker: any;

  constructor(walletId: any, id: any, worker: any) {
    super();
    this.walletId = walletId;
    this._id = id;
    this.worker = worker;
  }

  get id() {
    return this._id;
  }

  async onSyncProgress(
    height: number,
    startHeight: number,
    endHeight: number,
    percentDone: number,
    message: number
  ) {
    this.worker.postMessage([
      this.walletId,
      "onSyncProgress_" + this.id,
      height,
      startHeight,
      endHeight,
      percentDone,
      message,
    ]);
  }

  async onNewBlock(height: number) {
    this.worker.postMessage([this.walletId, "onNewBlock_" + this.id, height]);
  }

  async onBalancesChanged(newBalance: bigint, newUnlockedBalance: bigint) {
    this.worker.postMessage([
      this.walletId,
      "onBalancesChanged_" + this.id,
      newBalance.toString(),
      newUnlockedBalance.toString(),
    ]);
  }

  async onOutputReceived(output: MoneroOutputWallet) {
    let block = output.getTx().getBlock();
    if (block === undefined) {
      block = new MoneroBlock();
      block.txs = [output.getTx()];
    }
    this.worker.postMessage([
      this.walletId,
      "onOutputReceived_" + this.id,
      block.toJson(),
    ]); // serialize from root block
  }

  async onOutputSpent(output: MoneroOutputWallet) {
    let block = output.getTx().getBlock();
    if (block === undefined) {
      block = new MoneroBlock();
      block.txs = [output.getTx()];
    }
    this.worker.postMessage([
      this.walletId,
      "onOutputSpent_" + this.id,
      block.toJson(),
    ]); // serialize from root block
  }
}

/**
 * Worker to manage a daemon and wasm wallet off the main thread using messages.
 *
 * Required message format: e.data[0] = object id, e.data[1] = function name, e.data[2+] = function args
 *
 * For browser applications, this file must be browserified and placed in the web app root.
 *
 */
class MoneroWebWorker {
  [key: string]: any;
  static _INSTANCE: MoneroWebWorker | null = null;
  static _WORKER_OBJECTS: object;

  private constructor() {
    this._WORKER_OBJECTS = {};
    MoneroUtils.PROXY_TO_WORKER = false;
  }

  static get instance() {
    if (!MoneroWebWorker._INSTANCE) {
      MoneroWebWorker._INSTANCE = new MoneroWebWorker();
    }
    return MoneroWebWorker._INSTANCE;
  }

  // --------------------------- STATIC UTILITIES -------------------------------

  // TODO: object id not needed for static utilites, using throwaway uuid

  async httpRequest(_: object, opts: RequestOpts) {
    return await HttpClient.instance.request(
      Object.assign(opts, { proxyToWorker: false })
    )
      .then((r) => r)
      .catch((err) => {
        throw err.statusCode
          ? new Error(
              JSON.stringify({
                statusCode: err.statusCode,
                statusMessage: err.message,
              })
            )
          : err;
      });
  }
  async setLogLevel(_: object, level: string) {
    return LibraryUtils.instance.setLogLevel(level);
  }

  async getWasmMemoryUsed() {
    return LibraryUtils.instance.WASM_MODULE &&
      LibraryUtils.instance.WASM_MODULE.HEAP8
      ? LibraryUtils.instance.WASM_MODULE.HEAP8.length
      : undefined;
  }

  // ----------------------------- MONERO UTILS ---------------------------------

  async moneroUtilsGetIntegratedAddress(
    _: string,
    networkType: string,
    standardAddress: string,
    paymentId: string
  ) {
    return (
      await MoneroUtils.getIntegratedAddress(
        networkType,
        standardAddress,
        paymentId
      )
    ).toJson();
  }

  async moneroUtilsValidateAddress(
    _: string,
    address: string,
    networkType: string
  ) {
    return MoneroUtils.validateAddress(address, networkType);
  }

  async moneroUtilsJsonToBinary(_: any, json: object) {
    return MoneroUtils.jsonToBinary(json);
  }

  async moneroUtilsBinaryToJson(_: any, uint8arr: Uint8Array) {
    return MoneroUtils.binaryToJson(uint8arr);
  }

  async moneroUtilsBinaryBlocksToJson(_: any, uint8arr: Uint8Array) {
    return MoneroUtils.binaryBlocksToJson(uint8arr);
  }

  // ---------------------------- DAEMON METHODS --------------------------------

  async daemonAddListener(daemonId: string, listenerId: string) {
    const listener = new (class extends MoneroDaemonListener {
      async onBlockHeader(blockHeader: { toJson: () => object }) {
        self.postMessage([
          daemonId,
          "onBlockHeader_" + listenerId,
          blockHeader.toJson(),
        ]);
      }
    })();
    if (!this.daemonListeners) this.daemonListeners = {};
    this.daemonListeners[listenerId] = listener;
    await this.WORKER_OBJECTS[daemonId].addListener(listener);
  }

  async daemonRemoveListener(daemonId: string, listenerId: string) {
    if (!this.daemonListeners[listenerId])
      throw new MoneroError(
        "No daemon worker listener registered with id: " + listenerId
      );
    await this.WORKER_OBJECTS[daemonId].removeListener(
      this.daemonListeners[listenerId]
    );
    delete this.daemonListeners[listenerId];
  }

  async connectDaemonRpc(daemonId: string, config: MoneroDaemonRpcConfigOpts) {
    this.WORKER_OBJECTS[daemonId] = new MoneroDaemonRpc(config);
  }

  async daemonGetRpcConnection(daemonId: any) {
    const connection = await this.WORKER_OBJECTS[daemonId].getRpcConnection();
    return connection ? connection.getConfig() : undefined;
  }

  async daemonIsConnected(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].isConnected();
  }

  async daemonGetVersion(daemonId: any) {
    return (await this.WORKER_OBJECTS[daemonId].getVersion()).toJson();
  }

  async daemonIsTrusted(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].isTrusted();
  }

  async daemonGetHeight(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].getHeight();
  }

  async daemonGetBlockHash(daemonId: any, height: any) {
    return this.WORKER_OBJECTS[daemonId].getBlockHash(height);
  }

  async daemonGetBlockTemplate(
    daemonId: any,
    walletAddress: any,
    reserveSize: any
  ) {
    return (
      await this.WORKER_OBJECTS[daemonId].getBlockTemplate(
        walletAddress,
        reserveSize
      )
    ).toJson();
  }

  async daemonGetLastBlockHeader(daemonId: any) {
    return (await this.WORKER_OBJECTS[daemonId].getLastBlockHeader()).toJson();
  }

  async daemonGetBlockHeaderByHash(daemonId: any, hash: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].getBlockHeaderByHash(hash)
    ).toJson();
  }

  async daemonGetBlockHeaderByHeight(daemonId: any, height: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].getBlockHeaderByHeight(height)
    ).toJson();
  }

  async daemonGetBlockHeadersByRange(
    daemonId: any,
    startHeight: any,
    endHeight: any
  ) {
    const blockHeadersJson = [];
    for (const blockHeader of await this.WORKER_OBJECTS[
      daemonId
    ].getBlockHeadersByRange(startHeight, endHeight))
      blockHeadersJson.push(blockHeader.toJson());
    return blockHeadersJson;
  }

  async daemonGetBlockByHash(daemonId: any, blockHash: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].getBlockByHash(blockHash)
    ).toJson();
  }

  async daemonGetBlocksByHash(
    daemonId: any,
    blockHashes: any,
    startHeight: any,
    prune: any
  ) {
    const blocksJson = [];
    for (const block of await this.WORKER_OBJECTS[daemonId].getBlocksByHash(
      blockHashes,
      startHeight,
      prune
    ))
      blocksJson.push(block.toJson());
    return blocksJson;
  }

  async daemonGetBlockByHeight(daemonId: any, height: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].getBlockByHeight(height)
    ).toJson();
  }

  async daemonGetBlocksByHeight(daemonId: any, heights: any) {
    const blocksJson = [];
    for (const block of await this.WORKER_OBJECTS[daemonId].getBlocksByHeight(
      heights
    ))
      blocksJson.push(block.toJson());
    return blocksJson;
  }

  async daemonGetBlocksByRange(
    daemonId: any,
    startHeight: any,
    endHeight: any
  ) {
    const blocksJson = [];
    for (const block of await this.WORKER_OBJECTS[daemonId].getBlocksByRange(
      startHeight,
      endHeight
    ))
      blocksJson.push(block.toJson());
    return blocksJson;
  }

  async daemonGetBlocksByRangeChunked(
    daemonId: any,
    startHeight: any,
    endHeight: any,
    maxChunkSize: any
  ) {
    const blocksJson = [];
    for (const block of await this.WORKER_OBJECTS[
      daemonId
    ].getBlocksByRangeChunked(startHeight, endHeight, maxChunkSize))
      blocksJson.push(block.toJson());
    return blocksJson;
  }

  // async daemonGetBlockHashes(
  //   daemonId: any,
  //   blockHashes: any,
  //   startHeight: any
  // ) {
  //   throw new Error("worker.getBlockHashes not implemented");
  // }

  // TODO: factor common code with self.txs
  async daemonGetTxs(daemonId: any, txHashes: any, prune: any) {
    // get txs
    const txs = await this.WORKER_OBJECTS[daemonId].getTxs(txHashes, prune);

    // collect unique blocks to preserve model relationships as trees (based on monero_wasm_bridge.cpp::get_txs)
    const blocks = [];
    let unconfirmedBlock = undefined;
    const seenBlocks = new Set();
    for (const tx of txs) {
      if (!tx.getBlock()) {
        if (unconfirmedBlock) {
          unconfirmedBlock = new MoneroBlock();
          unconfirmedBlock.txs = [];
        }
        tx.setBlock(unconfirmedBlock);
        if (unconfirmedBlock instanceof MoneroBlock)
          unconfirmedBlock.txs.push(tx);
      }
      if (!seenBlocks.has(tx.getBlock())) {
        seenBlocks.add(tx.getBlock());
        blocks.push(tx.getBlock());
      }
    }

    // serialize blocks to json
    for (let i = 0; i < blocks.length; i++) blocks[i] = blocks[i].toJson();
    return blocks;
  }

  async daemonGetTxHexes(daemonId: any, txHashes: any, prune: any) {
    return this.WORKER_OBJECTS[daemonId].getTxHexes(txHashes, prune);
  }

  async daemonGetMinerTxSum(daemonId: any, height: any, numBlocks: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].getMinerTxSum(height, numBlocks)
    ).toJson();
  }

  async daemonGetFeeEstimate(daemonId: any, graceBlocks: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].getFeeEstimate(graceBlocks)
    ).toJson();
  }

  async daemonSubmitTxHex(daemonId: any, txHex: any, doNotRelay: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].submitTxHex(txHex, doNotRelay)
    ).toJson();
  }

  async daemonRelayTxsByHash(daemonId: any, txHashes: any) {
    return this.WORKER_OBJECTS[daemonId].relayTxsByHash(txHashes);
  }

  async daemonGetTxPool(daemonId: any) {
    const txs = await this.WORKER_OBJECTS[daemonId].getTxPool();
    const block = new MoneroBlock();
    block.txs = txs;
    for (const tx of txs) tx.setBlock(block);
    return block.toJson();
  }

  async daemonGetTxPoolHashes(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].getTxPoolHashes();
  }

  //async getTxPoolBacklog() {
  //  throw new MoneroError("Not implemented");
  //}

  async daemonGetTxPoolStats(daemonId: any) {
    return (await this.WORKER_OBJECTS[daemonId].getTxPoolStats()).toJson();
  }

  async daemonFlushTxPool(daemonId: any, hashes: any) {
    return this.WORKER_OBJECTS[daemonId].flushTxPool(hashes);
  }

  async daemonGetKeyImageSpentStatuses(daemonId: any, keyImages: any) {
    return this.WORKER_OBJECTS[daemonId].getKeyImageSpentStatuses(keyImages);
  }

  //
  //async getOutputs(outputs) {
  //  throw new MoneroError("Not implemented");
  //}

  async daemonGetOutputHistogram(
    daemonId: any,
    amounts: any,
    minCount: any,
    maxCount: any,
    isUnlocked: any,
    recentCutoff: any
  ) {
    const entriesJson = [];
    for (const entry of await this.WORKER_OBJECTS[daemonId].getOutputHistogram(
      amounts,
      minCount,
      maxCount,
      isUnlocked,
      recentCutoff
    )) {
      entriesJson.push(entry.toJson());
    }
    return entriesJson;
  }

  //
  //async getOutputDistribution(amounts, cumulative, startHeight, endHeight) {
  //  throw new MoneroError("Not implemented");
  //}

  async daemonGetInfo(daemonId: any) {
    return (await this.WORKER_OBJECTS[daemonId].getInfo()).toJson();
  }

  async daemonGetSyncInfo(daemonId: any) {
    return (await this.WORKER_OBJECTS[daemonId].getSyncInfo()).toJson();
  }

  async daemonGetHardForkInfo(daemonId: any) {
    return (await this.WORKER_OBJECTS[daemonId].getHardForkInfo()).toJson();
  }

  async daemonGetAltChains(daemonId: any) {
    const altChainsJson = [];
    for (const altChain of await this.WORKER_OBJECTS[daemonId].getAltChains())
      altChainsJson.push(altChain.toJson());
    return altChainsJson;
  }

  async daemonGetAltBlockHashes(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].getAltBlockHashes();
  }

  async daemonGetDownloadLimit(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].getDownloadLimit();
  }

  async daemonSetDownloadLimit(daemonId: any, limit: any) {
    return this.WORKER_OBJECTS[daemonId].setDownloadLimit(limit);
  }

  async daemonResetDownloadLimit(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].resetDownloadLimit();
  }

  async daemonGetUploadLimit(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].getUploadLimit();
  }

  async daemonSetUploadLimit(daemonId: any, limit: any) {
    return this.WORKER_OBJECTS[daemonId].setUploadLimit(limit);
  }

  async daemonResetUploadLimit(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].resetUploadLimit();
  }

  async daemonGetPeers(daemonId: any) {
    const peersJson = [];
    for (const peer of await this.WORKER_OBJECTS[daemonId].getPeers())
      peersJson.push(peer.toJson());
    return peersJson;
  }
  async daemonGetKnownPeers(daemonId: any) {
    const peersJson = [];
    for (const peer of await this.WORKER_OBJECTS[daemonId].getKnownPeers())
      peersJson.push(peer.toJson());
    return peersJson;
  }

  async daemonSetOutgoingPeerLimit(daemonId: any, limit: any) {
    return this.WORKER_OBJECTS[daemonId].setOutgoingPeerLimit(limit);
  }

  async daemonSetIncomingPeerLimit(daemonId: any, limit: any) {
    return this.WORKER_OBJECTS[daemonId].setIncomingPeerLimit(limit);
  }

  async daemonGetPeerBans(daemonId: any) {
    const bansJson = [];
    for (const ban of await this.WORKER_OBJECTS[daemonId].getPeerBans())
      bansJson.push(ban.toJson());
    return bansJson;
  }

  async daemonSetPeerBans(daemonId: any, bansJson: any) {
    const bans = [];
    for (const banJson of bansJson) bans.push(new MoneroBan(banJson));
    return this.WORKER_OBJECTS[daemonId].setPeerBans(bans);
  }

  async daemonStartMining(
    daemonId: any,
    address: any,
    numThreads: any,
    isBackground: any,
    ignoreBattery: any
  ) {
    return this.WORKER_OBJECTS[daemonId].startMining(
      address,
      numThreads,
      isBackground,
      ignoreBattery
    );
  }

  async daemonStopMining(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].stopMining();
  }

  async daemonGetMiningStatus(daemonId: any) {
    return (await this.WORKER_OBJECTS[daemonId].getMiningStatus()).toJson();
  }

  async daemonPruneBlockchain(daemonId: any, check: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].pruneBlockchain(check)
    ).toJson();
  }

  //
  //async submitBlocks(blockBlobs) {
  //  throw new MoneroError("Not implemented");
  //}
  //
  //async checkForUpdate() {
  //  throw new MoneroError("Not implemented");
  //}
  //
  //async downloadUpdate(path) {
  //  throw new MoneroError("Not implemented");
  //}

  async daemonStop(daemonId: any) {
    return this.WORKER_OBJECTS[daemonId].stop();
  }

  async daemonWaitForNextBlockHeader(daemonId: any) {
    return (
      await this.WORKER_OBJECTS[daemonId].waitForNextBlockHeader()
    ).toJson();
  }

  //------------------------------ WALLET METHODS -------------------------------

  async openWalletData(
    walletId: any,
    path: any,
    password: any,
    networkType: any,
    keysData: any,
    cacheData: any,
    daemonUriOrConfig: any
  ) {
    const daemonConnection = daemonUriOrConfig
      ? new MoneroRpcConnection(daemonUriOrConfig)
      : undefined;
    this.WORKER_OBJECTS[walletId] = await MoneroWalletFull.openWallet({
      path: "",
      password: password,
      networkType: networkType,
      keysData: keysData,
      cacheData: cacheData,
      server: daemonConnection,
      proxyToWorker: false,
    });
    this.WORKER_OBJECTS[walletId]._setBrowserMainPath(path);
  }

  async _createWallet(walletId: any, configJson?: MoneroWalletConfigOpts) {
    const config = new MoneroWalletConfig(configJson);
    const path = config.path;
    config.path = "";
    config.proxyToWorker = false;
    this.WORKER_OBJECTS[walletId] = await MoneroWalletFull.createWallet(config);
    this.WORKER_OBJECTS[walletId]._setBrowserMainPath(path);
  }

  async isViewOnly(walletId: any) {
    return this.WORKER_OBJECTS[walletId].isViewOnly();
  }

  async getNetworkType(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getNetworkType();
  }

  //
  //async getVersion() {
  //  throw new Error("Not implemented");
  //}

  async getMnemonic(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getMnemonic();
  }

  async getMnemonicLanguage(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getMnemonicLanguage();
  }

  async getMnemonicLanguages(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getMnemonicLanguages();
  }

  async getPrivateSpendKey(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getPrivateSpendKey();
  }

  async getPrivateViewKey(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getPrivateViewKey();
  }

  async getPublicViewKey(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getPublicViewKey();
  }

  async getPublicSpendKey(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getPublicSpendKey();
  }

  async getAddress(walletId: any, accountIdx: any, subaddressIdx: any) {
    return this.WORKER_OBJECTS[walletId].getAddress(accountIdx, subaddressIdx);
  }

  async getAddressIndex(walletId: any, address: any) {
    return (
      await this.WORKER_OBJECTS[walletId].getAddressIndex(address)
    ).toJson();
  }

  async setSubaddressLabel(
    walletId: any,
    accountIdx: any,
    subaddressIdx: any,
    label: any
  ) {
    await this.WORKER_OBJECTS[walletId].setSubaddressLabel(
      accountIdx,
      subaddressIdx,
      label
    );
  }

  async getIntegratedAddress(
    walletId: any,
    standardAddress: any,
    paymentId: any
  ) {
    return (
      await this.WORKER_OBJECTS[walletId].getIntegratedAddress(
        standardAddress,
        paymentId
      )
    ).toJson();
  }

  async decodeIntegratedAddress(walletId: any, integratedAddress: any) {
    return (
      await this.WORKER_OBJECTS[walletId].decodeIntegratedAddress(
        integratedAddress
      )
    ).toJson();
  }

  async setDaemonConnection(walletId: any, config: any) {
    return this.WORKER_OBJECTS[walletId].setDaemonConnection(
      config
        ? new MoneroRpcConnection(
            Object.assign(config, { proxyToWorker: false })
          )
        : undefined
    );
  }

  async getDaemonConnection(walletId: any) {
    const connection = await this.WORKER_OBJECTS[
      walletId
    ].getDaemonConnection();
    return connection ? connection.getConfig() : undefined;
  }

  async isConnectedToDaemon(walletId: any) {
    return this.WORKER_OBJECTS[walletId].isConnectedToDaemon();
  }

  async getRestoreHeight(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getRestoreHeight();
  }

  async setRestoreHeight(walletId: any, restoreHeight: any) {
    return this.WORKER_OBJECTS[walletId].setRestoreHeight(restoreHeight);
  }

  async getDaemonHeight(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getDaemonHeight();
  }

  async getDaemonMaxPeerHeight(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getDaemonMaxPeerHeight();
  }

  async getHeightByDate(walletId: any, year: any, month: any, day: any) {
    return this.WORKER_OBJECTS[walletId].getHeightByDate(year, month, day);
  }

  async isDaemonSynced(walletId: any) {
    return this.WORKER_OBJECTS[walletId].isDaemonSynced();
  }

  async getHeight(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getHeight();
  }

  async addListener(walletId: any, listenerId: any) {
    const listener = new WalletWorkerHelperListener(walletId, listenerId, self);
    if (!this.listeners) this.listeners = [];
    this.listeners.push(listener);
    await this.WORKER_OBJECTS[walletId].addListener(listener);
  }

  async removeListener(walletId: any, listenerId: any) {
    for (let i = 0; i < this.listeners.length; i++) {
      if (this.listeners[i].getId() !== listenerId) continue;
      await this.WORKER_OBJECTS[walletId].removeListener(this.listeners[i]);
      this.listeners.splice(i, 1);
      return;
    }
    throw new MoneroError("Listener is not registered with wallet");
  }

  async isSynced(walletId: any) {
    return this.WORKER_OBJECTS[walletId].isSynced();
  }

  async sync(walletId: any, startHeight: any, allowConcurrentCalls: any) {
    return await this.WORKER_OBJECTS[walletId].sync(
      undefined,
      startHeight,
      allowConcurrentCalls
    );
  }

  async startSyncing(walletId: any, syncPeriodInMs: any) {
    return this.WORKER_OBJECTS[walletId].startSyncing(syncPeriodInMs);
  }

  async stopSyncing(walletId: any) {
    return this.WORKER_OBJECTS[walletId].stopSyncing();
  }

  async scanTxs(walletId: any, txHashes: any) {
    return this.WORKER_OBJECTS[walletId].scanTxs(txHashes);
  }

  async rescanSpent(walletId: any) {
    return this.WORKER_OBJECTS[walletId].rescanSpent();
  }

  async rescanBlockchain(walletId: any) {
    return this.WORKER_OBJECTS[walletId].rescanBlockchain();
  }

  async getBalance(walletId: any, accountIdx: any, subaddressIdx: any) {
    return (
      await this.WORKER_OBJECTS[walletId].getBalance(accountIdx, subaddressIdx)
    ).toString();
  }

  async getUnlockedBalance(walletId: any, accountIdx: any, subaddressIdx: any) {
    return (
      await this.WORKER_OBJECTS[walletId].getUnlockedBalance(
        accountIdx,
        subaddressIdx
      )
    ).toString();
  }

  async getAccounts(walletId: any, includeSubaddresses: any, tag: any) {
    const accountJsons = [];
    for (const account of await this.WORKER_OBJECTS[walletId].getAccounts(
      includeSubaddresses,
      tag
    ))
      accountJsons.push(account.toJson());
    return accountJsons;
  }

  async getAccount(walletId: any, accountIdx: any, includeSubaddresses: any) {
    return (
      await this.WORKER_OBJECTS[walletId].getAccount(
        accountIdx,
        includeSubaddresses
      )
    ).toJson();
  }

  async createAccount(walletId: any, label: any) {
    return (await this.WORKER_OBJECTS[walletId].createAccount(label)).toJson();
  }

  async getSubaddresses(
    walletId: any,
    accountIdx: any,
    subaddressIndices: any
  ) {
    const subaddressJsons = [];
    for (const subaddress of await this.WORKER_OBJECTS[
      walletId
    ].getSubaddresses(accountIdx, subaddressIndices))
      subaddressJsons.push(subaddress.toJson());
    return subaddressJsons;
  }

  async createSubaddress(walletId: any, accountIdx: any, label: any) {
    return (
      await this.WORKER_OBJECTS[walletId].createSubaddress(accountIdx, label)
    ).toJson();
  }

  // TODO: easier or more efficient way than serializing from root blocks?
  async getTxs(walletId: any, blockJsonQuery: any, missingTxHashes: any) {
    // deserialize query which is json string rooted at block
    const query = new MoneroBlock(
      blockJsonQuery,
      MoneroBlock.DeserializationType.TX_QUERY
    ).txs[0];

    // get txs
    const txs = await this.WORKER_OBJECTS[walletId].getTxs(
      query,
      missingTxHashes
    );

    // collect unique blocks to preserve model relationships as trees (based on monero_wasm_bridge.cpp::get_txs)
    const seenBlocks = new Set();
    let unconfirmedBlock = undefined;
    const blocks = [];
    for (const tx of txs) {
      if (!tx.getBlock()) {
        if (!unconfirmedBlock) {
          unconfirmedBlock = new MoneroBlock();
          unconfirmedBlock.txs = [];
        }
        tx.setBlock(unconfirmedBlock);
        unconfirmedBlock.txs.push(tx);
      }
      if (!seenBlocks.has(tx.getBlock())) {
        seenBlocks.add(tx.getBlock());
        blocks.push(tx.getBlock());
      }
    }

    // serialize blocks to json
    for (let i = 0; i < blocks.length; i++) blocks[i] = blocks[i].toJson();
    return { blocks: blocks, missingTxHashes: missingTxHashes };
  }

  async getTransfers(walletId: any, blockJsonQuery: any) {
    // deserialize query which is json string rooted at block
    const query = new MoneroBlock(
      blockJsonQuery,
      MoneroBlock.DeserializationType.TX_QUERY
    ).txs[0].getTransferQuery();

    // get transfers
    const transfers = await this.WORKER_OBJECTS[walletId].getTransfers(query);

    // collect unique blocks to preserve model relationships as tree
    let unconfirmedBlock = undefined;
    const blocks = [];
    const seenBlocks = new Set();
    for (const transfer of transfers) {
      const tx = transfer.getTx();
      if (!tx.getBlock()) {
        if (!unconfirmedBlock) {
          unconfirmedBlock = new MoneroBlock();
          unconfirmedBlock.txs = [];
        }
        tx.setBlock(unconfirmedBlock);
        unconfirmedBlock.txs.push(tx);
      }
      if (!seenBlocks.has(tx.getBlock())) {
        seenBlocks.add(tx.getBlock());
        blocks.push(tx.getBlock());
      }
    }

    // serialize blocks to json
    for (let i = 0; i < blocks.length; i++) blocks[i] = blocks[i].toJson();
    return blocks;
  }

  async getOutputs(walletId: any, blockJsonQuery: any) {
    // deserialize query which is json string rooted at block
    const query = new MoneroBlock(
      blockJsonQuery,
      MoneroBlock.DeserializationType.TX_QUERY
    ).txs[0].getOutputQuery();

    // get outputs
    const outputs = await this.WORKER_OBJECTS[walletId].getOutputs(query);

    // collect unique blocks to preserve model relationships as tree
    let unconfirmedBlock = undefined;
    const blocks = [];
    const seenBlocks = new Set();
    for (const output of outputs) {
      const tx = output.getTx();
      if (!tx.getBlock()) {
        if (!unconfirmedBlock) {
          unconfirmedBlock = new MoneroBlock();
          unconfirmedBlock.txs = [];
        }
        tx.setBlock(unconfirmedBlock);
        unconfirmedBlock.txs.push(tx);
      }
      if (!seenBlocks.has(tx.getBlock())) {
        seenBlocks.add(tx.getBlock());
        blocks.push(tx.getBlock());
      }
    }

    // serialize blocks to json
    for (let i = 0; i < blocks.length; i++) blocks[i] = blocks[i].toJson();
    return blocks;
  }

  async exportOutputs(walletId: any, all: any) {
    return this.WORKER_OBJECTS[walletId].exportOutputs(all);
  }

  async importOutputs(walletId: any, outputsHex: any) {
    return this.WORKER_OBJECTS[walletId].importOutputs(outputsHex);
  }

  async getKeyImages(walletId: any, all: any) {
    const keyImagesJson = [];
    for (const keyImage of await this.WORKER_OBJECTS[walletId].exportKeyImages(
      all
    ))
      keyImagesJson.push(keyImage.toJson());
    return keyImagesJson;
  }

  async importKeyImages(walletId: any, keyImagesJson: any) {
    const keyImages = [];
    for (const keyImageJson of keyImagesJson)
      keyImages.push(new MoneroKeyImage(keyImageJson));
    return (
      await this.WORKER_OBJECTS[walletId].importKeyImages(keyImages)
    ).toJson();
  }

  //async getNewKeyImagesFromLastImport() {
  //  throw new MoneroError("Not implemented");
  //}

  async freezeOutput(walletId: any, keyImage: any) {
    return this.WORKER_OBJECTS[walletId].freezeOutput(keyImage);
  }

  async thawOutput(walletId: any, keyImage: any) {
    return this.WORKER_OBJECTS[walletId].thawOutput(keyImage);
  }

  async isOutputFrozen(walletId: any, keyImage: any) {
    return this.WORKER_OBJECTS[walletId].isOutputFrozen(keyImage);
  }

  async createTxs(walletId: any, config: any) {
    if (typeof config === "object") config = new MoneroTxConfig(config);
    const txs = await this.WORKER_OBJECTS[walletId].createTxs(config);
    return txs[0].getTxSet().toJson();
  }

  async sweepOutput(walletId: any, config: any) {
    if (typeof config === "object") config = new MoneroTxConfig(config);
    const tx = await this.WORKER_OBJECTS[walletId].sweepOutput(config);
    return tx.getTxSet().toJson();
  }

  async sweepUnlocked(walletId: any, config: any) {
    if (typeof config === "object") config = new MoneroTxConfig(config);
    const txs = await this.WORKER_OBJECTS[walletId].sweepUnlocked(config);
    const txSets = [];
    for (const tx of txs)
      if (!GenUtils.arrayContains(txSets, tx.getTxSet()))
        txSets.push(tx.getTxSet());
    const txSetsJson = [];
    for (const txSet of txSets) txSetsJson.push(txSet.toJson());
    return txSetsJson;
  }

  async sweepDust(walletId: any, relay: any) {
    const txs = await this.WORKER_OBJECTS[walletId].sweepDust(relay);
    return txs.length === 0 ? {} : txs[0].getTxSet().toJson();
  }

  async relayTxs(walletId: any, txMetadatas: any) {
    return this.WORKER_OBJECTS[walletId].relayTxs(txMetadatas);
  }

  async describeTxSet(walletId: any, txSetJson: any) {
    return (
      await this.WORKER_OBJECTS[walletId].describeTxSet(
        new MoneroTxSet(txSetJson)
      )
    ).toJson();
  }

  async signTxs(walletId: any, unsignedTxHex: any) {
    return this.WORKER_OBJECTS[walletId].signTxs(unsignedTxHex);
  }

  async submitTxs(walletId: any, signedTxHex: any) {
    return this.WORKER_OBJECTS[walletId].submitTxs(signedTxHex);
  }

  async signMessage(
    walletId: any,
    message: any,
    signatureType: any,
    accountIdx: any,
    subaddressIdx: any
  ) {
    return this.WORKER_OBJECTS[walletId].signMessage(
      message,
      signatureType,
      accountIdx,
      subaddressIdx
    );
  }

  async verifyMessage(
    walletId: any,
    message: any,
    address: any,
    signature: any
  ) {
    return (
      await this.WORKER_OBJECTS[walletId].verifyMessage(
        message,
        address,
        signature
      )
    ).toJson();
  }

  async getTxKey(walletId: any, txHash: any) {
    return this.WORKER_OBJECTS[walletId].getTxKey(txHash);
  }

  async checkTxKey(walletId: any, txHash: any, txKey: any, address: any) {
    return (
      await this.WORKER_OBJECTS[walletId].checkTxKey(txHash, txKey, address)
    ).toJson();
  }

  async getTxProof(walletId: any, txHash: any, address: any, message: any) {
    return this.WORKER_OBJECTS[walletId].getTxProof(txHash, address, message);
  }

  async checkTxProof(
    walletId: any,
    txHash: any,
    address: any,
    message: any,
    signature: any
  ) {
    return (
      await this.WORKER_OBJECTS[walletId].checkTxProof(
        txHash,
        address,
        message,
        signature
      )
    ).toJson();
  }

  async getSpendProof(walletId: any, txHash: any, message: any) {
    return this.WORKER_OBJECTS[walletId].getSpendProof(txHash, message);
  }

  async checkSpendProof(
    walletId: any,
    txHash: any,
    message: any,
    signature: any
  ) {
    return this.WORKER_OBJECTS[walletId].checkSpendProof(
      txHash,
      message,
      signature
    );
  }

  async getReserveProofWallet(walletId: any, message: any) {
    return this.WORKER_OBJECTS[walletId].getReserveProofWallet(message);
  }

  async getReserveProofAccount(
    walletId: any,
    accountIdx: any,
    amountStr: any,
    message: any
  ) {
    return this.WORKER_OBJECTS[walletId].getReserveProofAccount(
      accountIdx,
      amountStr,
      message
    );
  }

  async checkReserveProof(
    walletId: any,
    address: any,
    message: any,
    signature: any
  ) {
    return (
      await this.WORKER_OBJECTS[walletId].checkReserveProof(
        address,
        message,
        signature
      )
    ).toJson();
  }

  async getTxNotes(walletId: any, txHashes: any) {
    return this.WORKER_OBJECTS[walletId].getTxNotes(txHashes);
  }

  async setTxNotes(walletId: any, txHashes: any, txNotes: any) {
    return this.WORKER_OBJECTS[walletId].setTxNotes(txHashes, txNotes);
  }

  async getAddressBookEntries(walletId: any, entryIndices: any) {
    const entriesJson = [];
    for (const entry of await this.WORKER_OBJECTS[
      walletId
    ].getAddressBookEntries(entryIndices))
      entriesJson.push(entry.toJson());
    return entriesJson;
  }

  async addAddressBookEntry(walletId: any, address: any, description: any) {
    return this.WORKER_OBJECTS[walletId].addAddressBookEntry(
      address,
      description
    );
  }

  async editAddressBookEntry(
    walletId: any,
    index: any,
    setAddress: any,
    address: any,
    setDescription: any,
    description: any
  ) {
    return this.WORKER_OBJECTS[walletId].editAddressBookEntry(
      index,
      setAddress,
      address,
      setDescription,
      description
    );
  }

  async deleteAddressBookEntry(walletId: any, index: any) {
    return this.WORKER_OBJECTS[walletId].deleteAddressBookEntry(index);
  }

  // async tagAccounts(walletId: any, tag: any, accountIndices: any) {
  //   throw new Error("Not implemented");
  // }

  // async untagAccounts(walletId: any, accountIndices: any) {
  //   throw new Error("Not implemented");
  // }

  // async getAccountTags(walletId: any) {
  //   throw new Error("Not implemented");
  // }

  // async setAccountTagLabel(walletId: any, tag: any, label: any) {
  //   throw new Error("Not implemented");
  // }

  async getPaymentUri(walletId: any, configJson: any) {
    return this.WORKER_OBJECTS[walletId].getPaymentUri(
      new MoneroTxConfig(configJson)
    );
  }

  async parsePaymentUri(walletId: any, uri: any) {
    return (await this.WORKER_OBJECTS[walletId].parsePaymentUri(uri)).toJson();
  }

  async getAttribute(walletId: any, key: any) {
    return this.WORKER_OBJECTS[walletId].getAttribute(key);
  }

  async setAttribute(walletId: any, key: any, value: any) {
    return this.WORKER_OBJECTS[walletId].setAttribute(key, value);
  }

  async startMining(
    walletId: any,
    numThreads: any,
    backgroundMining: any,
    ignoreBattery: any
  ) {
    return this.WORKER_OBJECTS[walletId].startMining(
      numThreads,
      backgroundMining,
      ignoreBattery
    );
  }

  async stopMining(walletId: any) {
    return this.WORKER_OBJECTS[walletId].stopMining();
  }

  async isMultisigImportNeeded(walletId: any) {
    return this.WORKER_OBJECTS[walletId].isMultisigImportNeeded();
  }

  async isMultisig(walletId: any) {
    return this.WORKER_OBJECTS[walletId].isMultisig();
  }

  async getMultisigInfo(walletId: any) {
    return (await this.WORKER_OBJECTS[walletId].getMultisigInfo()).toJson();
  }

  async prepareMultisig(walletId: any) {
    return this.WORKER_OBJECTS[walletId].prepareMultisig();
  }

  async makeMultisig(
    walletId: any,
    multisigHexes: any,
    threshold: any,
    password: any
  ) {
    return await this.WORKER_OBJECTS[walletId].makeMultisig(
      multisigHexes,
      threshold,
      password
    );
  }

  async exchangeMultisigKeys(walletId: any, multisigHexes: any, password: any) {
    return (
      await this.WORKER_OBJECTS[walletId].exchangeMultisigKeys(
        multisigHexes,
        password
      )
    ).toJson();
  }

  async exportMultisigHex(walletId: any) {
    return this.WORKER_OBJECTS[walletId].exportMultisigHex();
  }

  async importMultisigHex(walletId: any, multisigHexes: any) {
    return this.WORKER_OBJECTS[walletId].importMultisigHex(multisigHexes);
  }

  async signMultisigTxHex(walletId: any, multisigTxHex: any) {
    return (
      await this.WORKER_OBJECTS[walletId].signMultisigTxHex(multisigTxHex)
    ).toJson();
  }

  async submitMultisigTxHex(walletId: any, signedMultisigTxHex: any) {
    return this.WORKER_OBJECTS[walletId].submitMultisigTxHex(
      signedMultisigTxHex
    );
  }

  async getData(walletId: any) {
    return this.WORKER_OBJECTS[walletId].getData();
  }

  async changePassword(walletId: any, oldPassword: any, newPassword: any) {
    return this.WORKER_OBJECTS[walletId].changePassword(
      oldPassword,
      newPassword
    );
  }

  async isClosed(walletId: any) {
    return this.WORKER_OBJECTS[walletId].isClosed();
  }

  async close(walletId: any, save: any) {
    return this.WORKER_OBJECTS[walletId].close(save); // TODO: remove listeners and delete wallet from WORKER_OBJECTS
  }
}

self.onmessage = async function (e) {
  const workerInstance = MoneroWebWorker.instance;

  // validate params
  const objectId = e.data[0];
  const fnName = e.data[1];
  const callbackId = e.data[2];
  assert(fnName, "Must provide function name to worker");
  assert(callbackId, "Must provide callback id to worker");
  if (!(fnName in workerInstance))
    throw new Error("Method '" + fnName + "' is not registered with worker");
  e.data.splice(1, 2); // remove function name and callback id to apply function with arguments

  // execute worker function and post result to callback
  try {
    postMessage([
      objectId,
      callbackId,
      { result: await workerInstance[fnName].apply(null, e.data) },
    ]);
  } catch (e) {
    postMessage([
      objectId,
      callbackId,
      { error: LibraryUtils.instance.serializeError(e) },
    ]);
  }
};
