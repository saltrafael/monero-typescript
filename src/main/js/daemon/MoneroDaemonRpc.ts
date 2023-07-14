import assert from "assert";
// @ts-expect-error TS(2307): Cannot find module '../common/biginteger' or its c... Remove this comment to see the full error message
import {BigInteger} from "../common/biginteger";
import GenUtils from "../common/GenUtils";
import LibraryUtils from "../common/LibraryUtils";
import TaskLooper from "../common/TaskLooper";
import MoneroAltChain from "./model/MoneroAltChain";
import MoneroBan from "./model/MoneroBan";
import MoneroBlock from "./model/MoneroBlock";
import MoneroBlockHeader from "./model/MoneroBlockHeader";
import MoneroBlockTemplate from "./model/MoneroBlockTemplate";
import MoneroDaemon from "./MoneroDaemon";
import MoneroDaemonInfo from "./model/MoneroDaemonInfo";
import MoneroDaemonListener from "./model/MoneroDaemonListener";
import MoneroDaemonSyncInfo from "./model/MoneroDaemonSyncInfo";
import MoneroError from "../common/MoneroError";
import MoneroHardForkInfo from "./model/MoneroHardForkInfo";
import MoneroKeyImage from "./model/MoneroKeyImage";
import MoneroMinerTxSum from "./model/MoneroMinerTxSum";
import MoneroMiningStatus from "./model/MoneroMiningStatus";
import MoneroNetworkType from "./model/MoneroNetworkType";
import MoneroOutput from "./model/MoneroOutput";
import MoneroOutputHistogramEntry from "./model/MoneroOutputHistogramEntry";
import MoneroPeer from "./model/MoneroPeer";
import MoneroRpcConnection from "../common/MoneroRpcConnection";
import MoneroSubmitTxResult from "./model/MoneroSubmitTxResult";
import MoneroTx from "./model/MoneroTx";
import MoneroTxPoolStats from "./model/MoneroTxPoolStats";
import MoneroUtils from "../common/MoneroUtils";
import MoneroVersion from "./model/MoneroVersion";

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
 * Implements a MoneroDaemon as a client of monerod.
 * 
 * @implements {MoneroDaemon}
 * @hideconstructor
 */
class MoneroDaemonRpc extends MoneroDaemon {
  cachedHeaders: any;
  config: any;
  listeners: any;
  pollListener: any;
  process: any;
  rpc: any;

  /**
   * <p>Construct a daemon RPC client (for internal use).<p>
   * 
   * @param {string|object|MoneroRpcConnection} uriOrConfig - uri of monerod or JS config object or MoneroRpcConnection
   * @param {string} uriOrConfig.uri - uri of monerod
   * @param {string} [uriOrConfig.username] - username to authenticate with monerod (optional)
   * @param {string} [uriOrConfig.password] - password to authenticate with monerod (optional)
   * @param {boolean} [uriOrConfig.rejectUnauthorized] - rejects self-signed certificates if true (default true)
   * @param {number} [uriOrConfig.pollInterval] - poll interval to query for updates in ms (default 5000)
   * @param {string} [username] - username to authenticate with monerod (optional)
   * @param {string} [password] - password to authenticate with monerod (optional)
   * @param {boolean} [rejectUnauthorized] - rejects self-signed certificates if true (default true)
   * @param {number} [pollInterval] - poll interval to query for updates in ms (default 5000)
   * @param {boolean} [proxyToWorker] - runs the daemon client in a worker if true (default true)
   */
  constructor(uriOrConfig: any, username: any, password: any, rejectUnauthorized: any, pollInterval: any, proxyToWorker: any) {
    super();
    if (GenUtils.isArray(uriOrConfig)) throw new Error("Use connectToDaemonRpc(...) to use terminal parameters");
    this.config = MoneroDaemonRpc._normalizeConfig(uriOrConfig, username, password, rejectUnauthorized, pollInterval, proxyToWorker);
    if (this.config.proxyToWorker) throw new Error("Use connectToDaemonRpc(...) to proxy to worker");
    let rpcConfig = Object.assign({}, this.config);
    delete rpcConfig.proxyToWorker;
    delete rpcConfig.pollInterval;
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
    this.rpc = new MoneroRpcConnection(rpcConfig);
    this.listeners = [];      // block listeners
    this.cachedHeaders = {};  // cached headers for fetching blocks in bound chunks
  }

  /**
   * <p>Create a client connected to monerod (for internal use).</p>
   * 
   * @param {string|string[]|object|MoneroRpcConnection} uriOrConfig - uri of monerod or terminal parameters or JS config object or MoneroRpcConnection
   * @param {string} uriOrConfig.uri - uri of monerod
   * @param {string} [uriOrConfig.username] - username to authenticate with monerod (optional)
   * @param {string} [uriOrConfig.password] - password to authenticate with monerod (optional)
   * @param {boolean} [uriOrConfig.rejectUnauthorized] - rejects self-signed certificates if true (default true)
   * @param {number} [uriOrConfig.pollInterval] - poll interval to query for updates in ms (default 5000)
   * @param {boolean} [uriOrConfig.proxyToWorker] - run the daemon client in a worker if true (default true)
   * @param {string} [username] - username to authenticate with monerod (optional)
   * @param {string} [password] - password to authenticate with monerod (optional)
   * @param {boolean} [rejectUnauthorized] - rejects self-signed certificates if true (default true)
   * @param {number} [pollInterval] - poll interval to query for updates in ms (default 5000)
   * @param {boolean} [proxyToWorker] - runs the daemon client in a worker if true (default true)
   * @return {MoneroDaemonRpc} the daemon RPC client
   */
  static async _connectToDaemonRpc(uriOrConfig: any, username: any, password: any, rejectUnauthorized: any, pollInterval: any, proxyToWorker: any) {
    console.log("Running _connectTODaemonRpc");
    try{
      if (GenUtils.isArray(uriOrConfig)) {
        console.log("StartingMonerodProcess");
        return MoneroDaemonRpc._startMonerodProcess(uriOrConfig, rejectUnauthorized, pollInterval, proxyToWorker); // handle array as terminal command
      }
      console.log("Creating new config");
      let config = MoneroDaemonRpc._normalizeConfig(uriOrConfig, username, password, rejectUnauthorized, pollInterval, proxyToWorker);
      console.log("Config created");
      if (config.proxyToWorker) {
        console.log("using MoneroDaemonRpcProxy.connect");
        return MoneroDaemonRpcProxy.connect(config);
      }
      else { 
        console.log("Returning new MoneroDaemonRpc");
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 1.
        return new MoneroDaemonRpc(config);
      }
    } catch (e){
      console.log("_connectToDaemonRpc failed: " + e);
    }
  }

  static async _startMonerodProcess(cmd: any, rejectUnauthorized: any, pollInterval: any, proxyToWorker: any) {
    assert(GenUtils.isArray(cmd), "Must provide string array with command line parameters");
    
    // start process
    // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
    this.process = require('child_process').spawn(cmd[0], cmd.slice(1), {});
    // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
    this.process.stdout.setEncoding('utf8');
    // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
    this.process.stderr.setEncoding('utf8');
    
    // return promise which resolves after starting monerod
    let uri: any;
    let that = this;
    let output = "";
    return new Promise(function(resolve, reject) {
      
      // handle stdout
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.stdout.on('data', async function(this: any, data: any) {
        let line = data.toString();
        LibraryUtils.log(2, line);
        output += line + '\n'; // capture output in case of error
        
        // extract uri from e.g. "I Binding on 127.0.0.1 (IPv4):38085"
        let uriLineContains = "Binding on ";
        let uriLineContainsIdx = line.indexOf(uriLineContains);
        if (uriLineContainsIdx >= 0) {
          let host = line.substring(uriLineContainsIdx + uriLineContains.length, line.lastIndexOf(' '));
          let unformattedLine = line.replace(/\u001b\[.*?m/g, '').trim(); // remove color formatting
          let port = unformattedLine.substring(unformattedLine.lastIndexOf(':') + 1);
          let sslIdx = cmd.indexOf("--rpc-ssl");
          let sslEnabled = sslIdx >= 0 ? "enabled" == cmd[sslIdx + 1].toLowerCase() : false;
          uri = (sslEnabled ? "https" : "http") + "://" + host + ":" + port;
        }
        
        // read success message
        if (line.indexOf("core RPC server started ok") >= 0) {
          
          // get username and password from params
          let userPassIdx = cmd.indexOf("--rpc-login");
          let userPass = userPassIdx >= 0 ? cmd[userPassIdx + 1] : undefined;
          let username = userPass === undefined ? undefined : userPass.substring(0, userPass.indexOf(':'));
          let password = userPass === undefined ? undefined : userPass.substring(userPass.indexOf(':') + 1);
          
          // create client connected to internal process
          let daemon = await that._connectToDaemonRpc(uri, username, password, rejectUnauthorized, pollInterval, proxyToWorker);
          // @ts-expect-error TS(2571): Object is of type 'unknown'.
          daemon.process = that.process;
          
          // resolve promise with client connected to internal process 
          this.isResolved = true;
          resolve(daemon);
        }
      });
      
      // handle stderr
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.stderr.on('data', function(data: any) {
        if (LibraryUtils.getLogLevel() >= 2) console.error(data);
      });
      
      // handle exit
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.on("exit", function(this: any, code: any) {
        if (!this.isResolved) reject(new Error("monerod process terminated with exit code " + code + (output ? ":\n\n" + output : "")));
      });
      
      // handle error
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.on("error", function(this: any, err: any) {
        if (err.message.indexOf("ENOENT") >= 0) reject(new Error("monerod does not exist at path '" + cmd[0] + "'"));
        if (!this.isResolved) reject(err);
      });
      
      // handle uncaught exception
      // @ts-expect-error TS(2339): Property 'process' does not exist on type 'typeof ... Remove this comment to see the full error message
      that.process.on("uncaughtException", function(err: any, origin: any) {
        console.error("Uncaught exception in monerod process: " + err.message);
        console.error(origin);
        reject(err);
      });
    });
  }

  /**
   * Get the internal process running monerod.
   * 
   * @return the process running monerod, undefined if not created from new process
   */
  getProcess() {
    return this.process;
  }

  /**
   * Stop the internal process running monerod, if applicable.
   * 
   * @param {boolean} force specifies if the process should be destroyed forcibly
   * @return {Promise<number|undefined>} the exit code from stopping the process
   */
  async stopProcess(force: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.process === undefined) throw new MoneroError("MoneroDaemonRpc instance not created from new process");
    let listenersCopy = GenUtils.copyArray(this.getListeners());
    for (let listener of listenersCopy) await this.removeListener(listener);
    return GenUtils.killProcess(this.process, force ? "sigkill" : undefined);
  }

  async addListener(listener: any) {
    assert(listener instanceof MoneroDaemonListener, "Listener must be instance of MoneroDaemonListener");
    this.listeners.push(listener);
    this._refreshListening();
  }

  async removeListener(listener: any) {
    assert(listener instanceof MoneroDaemonListener, "Listener must be instance of MoneroDaemonListener");
    let idx = this.listeners.indexOf(listener);
    if (idx > -1) this.listeners.splice(idx, 1);
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    else throw new MoneroError("Listener is not registered with daemon");
    this._refreshListening();
  }

  getListeners() {
    return this.listeners;
  }

  /**
   * Get the daemon's RPC connection.
   * 
   * @return {MoneroRpcConnection} the daemon's rpc connection
   */
  async getRpcConnection() {
    return this.rpc;
  }

  // @ts-expect-error TS(2416): Property 'isConnected' in type 'MoneroDaemonRpc' i... Remove this comment to see the full error message
  async isConnected() {
    try {
      await this.getVersion();
      return true;
    } catch (e) {
      return false;
    }
  }

  // @ts-expect-error TS(2416): Property 'getVersion' in type 'MoneroDaemonRpc' is... Remove this comment to see the full error message
  async getVersion() {
    let resp = await this.rpc.sendJsonRequest("get_version");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return new MoneroVersion(resp.result.version, resp.result.release);
  }

  // @ts-expect-error TS(2416): Property 'isTrusted' in type 'MoneroDaemonRpc' is ... Remove this comment to see the full error message
  async isTrusted() {
    let resp = await this.rpc.sendPathRequest("get_height");
    MoneroDaemonRpc._checkResponseStatus(resp);
    return !resp.untrusted;
  }

  async getHeight() {
    let resp = await this.rpc.sendJsonRequest("get_block_count");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return resp.result.count;
  }

  async getBlockHash(height: any) {
    return (await this.rpc.sendJsonRequest("on_get_block_hash", [height])).result;  // TODO monero-wallet-rpc: no status returned
  }

  // @ts-expect-error TS(2416): Property 'getBlockTemplate' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async getBlockTemplate(walletAddress: any, reserveSize: any) {
    assert(walletAddress && typeof walletAddress === "string", "Must specify wallet address to be mined to");
    let resp = await this.rpc.sendJsonRequest("get_block_template", {wallet_address: walletAddress, reserve_size: reserveSize});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcBlockTemplate(resp.result);
  }

  // @ts-expect-error TS(2416): Property 'getLastBlockHeader' in type 'MoneroDaemo... Remove this comment to see the full error message
  async getLastBlockHeader() {
    let resp = await this.rpc.sendJsonRequest("get_last_block_header");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcBlockHeader(resp.result.block_header);
  }

  // @ts-expect-error TS(2416): Property 'getBlockHeaderByHash' in type 'MoneroDae... Remove this comment to see the full error message
  async getBlockHeaderByHash(blockHash: any) {
    let resp = await this.rpc.sendJsonRequest("get_block_header_by_hash", {hash: blockHash});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcBlockHeader(resp.result.block_header);
  }

  // @ts-expect-error TS(2416): Property 'getBlockHeaderByHeight' in type 'MoneroD... Remove this comment to see the full error message
  async getBlockHeaderByHeight(height: any) {
    let resp = await this.rpc.sendJsonRequest("get_block_header_by_height", {height: height});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcBlockHeader(resp.result.block_header);
  }

  // @ts-expect-error TS(2416): Property 'getBlockHeadersByRange' in type 'MoneroD... Remove this comment to see the full error message
  async getBlockHeadersByRange(startHeight: any, endHeight: any) {
    
    // fetch block headers
    let resp = await this.rpc.sendJsonRequest("get_block_headers_range", {
      start_height: startHeight,
      end_height: endHeight
    });
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    
    // build headers
    let headers = [];
    for (let rpcHeader of resp.result.headers) {
      headers.push(MoneroDaemonRpc._convertRpcBlockHeader(rpcHeader));
    }
    return headers;
  }

  // @ts-expect-error TS(2416): Property 'getBlockByHash' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async getBlockByHash(blockHash: any) {
    let resp = await this.rpc.sendJsonRequest("get_block", {hash: blockHash});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcBlock(resp.result);
  }

  // @ts-expect-error TS(2416): Property 'getBlockByHeight' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async getBlockByHeight(height: any) {
    let resp = await this.rpc.sendJsonRequest("get_block", {height: height});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcBlock(resp.result);
  }

  // @ts-expect-error TS(2416): Property 'getBlocksByHeight' in type 'MoneroDaemon... Remove this comment to see the full error message
  async getBlocksByHeight(heights: any) {
    
    // fetch blocks in binary
    let respBin = await this.rpc.sendBinaryRequest("get_blocks_by_height.bin", {heights: heights});
    
    // convert binary blocks to json
    let rpcBlocks = await MoneroUtils.binaryBlocksToJson(respBin);
    MoneroDaemonRpc._checkResponseStatus(rpcBlocks);
    
    // build blocks with transactions
    assert.equal(rpcBlocks.txs.length, rpcBlocks.blocks.length);    
    let blocks = [];
    for (let blockIdx = 0; blockIdx < rpcBlocks.blocks.length; blockIdx++) {
      
      // build block
      let block = MoneroDaemonRpc._convertRpcBlock(rpcBlocks.blocks[blockIdx]);
      block.setHeight(heights[blockIdx]);
      blocks.push(block);
      
      // build transactions
      let txs = [];
      for (let txIdx = 0; txIdx < rpcBlocks.txs[blockIdx].length; txIdx++) {
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        let tx = new MoneroTx();
        txs.push(tx);
        tx.setHash(rpcBlocks.blocks[blockIdx].tx_hashes[txIdx]);
        tx.setIsConfirmed(true);
        tx.setInTxPool(false);
        tx.setIsMinerTx(false);
        tx.setRelay(true);
        tx.setIsRelayed(true);
        tx.setIsFailed(false);
        tx.setIsDoubleSpend(false);
        MoneroDaemonRpc._convertRpcTx(rpcBlocks.txs[blockIdx][txIdx], tx);
      }
      
      // merge into one block
      block.setTxs([]);
      for (let tx of txs) {
        if (tx.getBlock()) block.merge(tx.getBlock());
        else block.getTxs().push(tx.setBlock(block));
      }
    }
    
    return blocks;
  }

  // @ts-expect-error TS(2416): Property 'getBlocksByRange' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async getBlocksByRange(startHeight: any, endHeight: any) {
    if (startHeight === undefined) startHeight = 0;
    if (endHeight === undefined) endHeight = (await this.getHeight()) - 1;
    let heights = [];
    for (let height = startHeight; height <= endHeight; height++) heights.push(height);
    return await this.getBlocksByHeight(heights);
  }

  // @ts-expect-error TS(2416): Property 'getBlocksByRangeChunked' in type 'Monero... Remove this comment to see the full error message
  async getBlocksByRangeChunked(startHeight: any, endHeight: any, maxChunkSize: any) {
    if (startHeight === undefined) startHeight = 0;
    if (endHeight === undefined) endHeight = (await this.getHeight()) - 1;
    let lastHeight = startHeight - 1;
    let blocks = [];
    while (lastHeight < endHeight) {
      for (let block of await this._getMaxBlocks(lastHeight + 1, endHeight, maxChunkSize)) {
        blocks.push(block);
      }
      lastHeight = blocks[blocks.length - 1].getHeight();
    }
    return blocks;
  }

  // @ts-expect-error TS(2416): Property 'getTxs' in type 'MoneroDaemonRpc' is not... Remove this comment to see the full error message
  async getTxs(txHashes: any, prune: any) {
        
    // validate input
    assert(Array.isArray(txHashes) && txHashes.length > 0, "Must provide an array of transaction hashes");
    assert(prune === undefined || typeof prune === "boolean", "Prune must be a boolean or undefined");
        
    // fetch transactions
    let resp = await this.rpc.sendPathRequest("get_transactions", {
      txs_hashes: txHashes,
      decode_as_json: true,
      prune: prune
    });
    try {
      MoneroDaemonRpc._checkResponseStatus(resp);
    } catch (e) {
      // @ts-expect-error TS(2571): Object is of type 'unknown'.
      if (e.message.indexOf("Failed to parse hex representation of transaction hash") >= 0) throw new MoneroError("Invalid transaction hash");
      throw e;
    }
        
    // build transaction models
    let txs = [];
    if (resp.txs) {
      for (let txIdx = 0; txIdx < resp.txs.length; txIdx++) {
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        let tx = new MoneroTx();
        tx.setIsMinerTx(false);
        txs.push(MoneroDaemonRpc._convertRpcTx(resp.txs[txIdx], tx));
      }
    }
    
    return txs;
  }

  // @ts-expect-error TS(2416): Property 'getTxHexes' in type 'MoneroDaemonRpc' is... Remove this comment to see the full error message
  async getTxHexes(txHashes: any, prune: any) {
    let hexes = [];
    for (let tx of await this.getTxs(txHashes, prune)) hexes.push(prune ? tx.getPrunedHex() : tx.getFullHex());
    return hexes;
  }

  // @ts-expect-error TS(2416): Property 'getMinerTxSum' in type 'MoneroDaemonRpc'... Remove this comment to see the full error message
  async getMinerTxSum(height: any, numBlocks: any) {
    if (height === undefined) height = 0;
    else assert(height >= 0, "Height must be an integer >= 0");
    if (numBlocks === undefined) numBlocks = await this.getHeight();
    else assert(numBlocks >= 0, "Count must be an integer >= 0");
    let resp = await this.rpc.sendJsonRequest("get_coinbase_tx_sum", {height: height, count: numBlocks});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let txSum = new MoneroMinerTxSum();
    txSum.setEmissionSum(BigInt(resp.result.emission_amount));
    txSum.setFeeSum(BigInt(resp.result.fee_amount));
    return txSum;
  }

  // @ts-expect-error TS(2416): Property 'getFeeEstimate' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async getFeeEstimate(graceBlocks: any) {
    let resp = await this.rpc.sendJsonRequest("get_fee_estimate", {grace_blocks: graceBlocks});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let feeEstimate = new MoneroFeeEstimate();
    feeEstimate.setFee(new BigInteger(resp.result.fee));
    let fees = [];
    for (let i = 0; i < resp.result.fees.length; i++) fees.push(new BigInteger(resp.result.fees[i]));
    feeEstimate.setFees(fees);
    feeEstimate.setQuantizationMask(new BigInteger(resp.result.quantization_mask));
    return feeEstimate;
  }

  // @ts-expect-error TS(2416): Property 'submitTxHex' in type 'MoneroDaemonRpc' i... Remove this comment to see the full error message
  async submitTxHex(txHex: any, doNotRelay: any) {
    let resp = await this.rpc.sendPathRequest("send_raw_transaction", {tx_as_hex: txHex, do_not_relay: doNotRelay});
    let result = MoneroDaemonRpc._convertRpcSubmitTxResult(resp);
    
    // set isGood based on status
    try {
      MoneroDaemonRpc._checkResponseStatus(resp); 
      result.setIsGood(true);
    } catch(e) {
      result.setIsGood(false);
    }
    return result;
  }

  async relayTxsByHash(txHashes: any) {
    let resp = await this.rpc.sendJsonRequest("relay_tx", {txids: txHashes});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
  }

  // @ts-expect-error TS(2416): Property 'getTxPool' in type 'MoneroDaemonRpc' is ... Remove this comment to see the full error message
  async getTxPool() {
    
    // send rpc request
    let resp = await this.rpc.sendPathRequest("get_transaction_pool");
    MoneroDaemonRpc._checkResponseStatus(resp);
    
    // build txs
    let txs = [];
    if (resp.transactions) {
      for (let rpcTx of resp.transactions) {
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        let tx = new MoneroTx();
        txs.push(tx);
        tx.setIsConfirmed(false);
        tx.setIsMinerTx(false);
        tx.setInTxPool(true);
        tx.setNumConfirmations(0);
        MoneroDaemonRpc._convertRpcTx(rpcTx, tx);
      }
    }
    
    return txs;
  }

  async getTxPoolHashes() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  async getTxPoolBacklog() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  // @ts-expect-error TS(2416): Property 'getTxPoolStats' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async getTxPoolStats() {
    let resp = await this.rpc.sendPathRequest("get_transaction_pool_stats");
    MoneroDaemonRpc._checkResponseStatus(resp);
    return MoneroDaemonRpc._convertRpcTxPoolStats(resp.pool_stats);
  }

  async flushTxPool(hashes: any) {
    if (hashes) hashes = GenUtils.listify(hashes);
    let resp = await this.rpc.sendJsonRequest("flush_txpool", {txids: hashes});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
  }

  async getKeyImageSpentStatuses(keyImages: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (keyImages === undefined || keyImages.length === 0) throw new MoneroError("Must provide key images to check the status of");
    let resp = await this.rpc.sendPathRequest("is_key_image_spent", {key_images: keyImages});
    MoneroDaemonRpc._checkResponseStatus(resp);
    return resp.spent_status;
  }

  async getOutputHistogram(amounts: any, minCount: any, maxCount: any, isUnlocked: any, recentCutoff: any) {
    
    // send rpc request
    let resp = await this.rpc.sendJsonRequest("get_output_histogram", {
      amounts: amounts,
      min_count: minCount,
      max_count: maxCount,
      unlocked: isUnlocked,
      recent_cutoff: recentCutoff
    });
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    
    // build histogram entries from response
    let entries: any = [];
    if (!resp.result.histogram) return entries;
    for (let rpcEntry of resp.result.histogram) {
      entries.push(MoneroDaemonRpc._convertRpcOutputHistogramEntry(rpcEntry));
    }
    return entries;
  }

  async getOutputDistribution(amounts: any, cumulative: any, startHeight: any, endHeight: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented (response 'distribution' field is binary)");
    
//    let amountStrs = [];
//    for (let amount of amounts) amountStrs.push(amount.toJSValue());
//    console.log(amountStrs);
//    console.log(cumulative);
//    console.log(startHeight);
//    console.log(endHeight);
//    
//    // send rpc request
//    console.log("*********** SENDING REQUEST *************");
//    if (startHeight === undefined) startHeight = 0;
//    let resp = await this.rpc.sendJsonRequest("get_output_distribution", {
//      amounts: amountStrs,
//      cumulative: cumulative,
//      from_height: startHeight,
//      to_height: endHeight
//    });
//    
//    console.log("RESPONSE");
//    console.log(resp);
//    
//    // build distribution entries from response
//    let entries = [];
//    if (!resp.result.distributions) return entries; 
//    for (let rpcEntry of resp.result.distributions) {
//      let entry = MoneroDaemonRpc._convertRpcOutputDistributionEntry(rpcEntry);
//      entries.push(entry);
//    }
//    return entries;
  }

  // @ts-expect-error TS(2416): Property 'getInfo' in type 'MoneroDaemonRpc' is no... Remove this comment to see the full error message
  async getInfo() {
    let resp = await this.rpc.sendJsonRequest("get_info");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcInfo(resp.result);
  }

  // @ts-expect-error TS(2416): Property 'getSyncInfo' in type 'MoneroDaemonRpc' i... Remove this comment to see the full error message
  async getSyncInfo() {
    let resp = await this.rpc.sendJsonRequest("sync_info");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcSyncInfo(resp.result);
  }

  // @ts-expect-error TS(2416): Property 'getHardForkInfo' in type 'MoneroDaemonRp... Remove this comment to see the full error message
  async getHardForkInfo() {
    let resp = await this.rpc.sendJsonRequest("hard_fork_info");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    return MoneroDaemonRpc._convertRpcHardForkInfo(resp.result);
  }

  async getAltChains() {
    
//    // mocked response for test
//    let resp = {
//        status: "OK",
//        chains: [
//          {
//            block_hash: "697cf03c89a9b118f7bdf11b1b3a6a028d7b3617d2d0ed91322c5709acf75625",
//            difficulty: 14114729638300280,
//            height: 1562062,
//            length: 2
//          }
//        ]
//    }
    
    let resp = await this.rpc.sendJsonRequest("get_alternate_chains");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    let chains: any = [];
    if (!resp.result.chains) return chains;
    for (let rpcChain of resp.result.chains) chains.push(MoneroDaemonRpc._convertRpcAltChain(rpcChain));
    return chains;
  }

  async getAltBlockHashes() {
    
//    // mocked response for test
//    let resp = {
//        status: "OK",
//        untrusted: false,
//        blks_hashes: ["9c2277c5470234be8b32382cdf8094a103aba4fcd5e875a6fc159dc2ec00e011","637c0e0f0558e284493f38a5fcca3615db59458d90d3a5eff0a18ff59b83f46f","6f3adc174a2e8082819ebb965c96a095e3e8b63929ad9be2d705ad9c086a6b1c","697cf03c89a9b118f7bdf11b1b3a6a028d7b3617d2d0ed91322c5709acf75625"]
//    }
    
    let resp = await this.rpc.sendPathRequest("get_alt_blocks_hashes");
    MoneroDaemonRpc._checkResponseStatus(resp);
    if (!resp.blks_hashes) return [];
    return resp.blks_hashes;
  }

  async getDownloadLimit() {
    return (await this._getBandwidthLimits())[0];
  }

  async setDownloadLimit(limit: any) {
    if (limit == -1) return await this.resetDownloadLimit();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!(GenUtils.isInt(limit) && limit > 0)) throw new MoneroError("Download limit must be an integer greater than 0");
    return (await this._setBandwidthLimits(limit, 0))[0];
  }

  async resetDownloadLimit() {
    return (await this._setBandwidthLimits(-1, 0))[0];
  }

  async getUploadLimit() {
    return (await this._getBandwidthLimits())[1];
  }

  async setUploadLimit(limit: any) {
    if (limit == -1) return await this.resetUploadLimit();
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!(GenUtils.isInt(limit) && limit > 0)) throw new MoneroError("Upload limit must be an integer greater than 0");
    return (await this._setBandwidthLimits(0, limit))[1];
  }

  async resetUploadLimit() {
    return (await this._setBandwidthLimits(0, -1))[1];
  }

  async getPeers() {
    let resp = await this.rpc.sendJsonRequest("get_connections");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    let peers: any = [];
    if (!resp.result.connections) return peers;
    for (let rpcConnection of resp.result.connections) {
      peers.push(MoneroDaemonRpc._convertRpcConnection(rpcConnection));
    }
    return peers;
  }

  // @ts-expect-error TS(2416): Property 'getKnownPeers' in type 'MoneroDaemonRpc'... Remove this comment to see the full error message
  async getKnownPeers() {
    
    // tx config
    let resp = await this.rpc.sendPathRequest("get_peer_list");
    MoneroDaemonRpc._checkResponseStatus(resp);
    
    // build peers
    let peers = [];
    if (resp.gray_list) {
      for (let rpcPeer of resp.gray_list) {
        let peer = MoneroDaemonRpc._convertRpcPeer(rpcPeer);
        peer.setIsOnline(false); // gray list means offline last checked
        peers.push(peer);
      }
    }
    if (resp.white_list) {
      for (let rpcPeer of resp.white_list) {
        let peer = MoneroDaemonRpc._convertRpcPeer(rpcPeer);
        peer.setIsOnline(true); // white list means online last checked
        peers.push(peer);
      }
    }
    return peers;
  }

  async setOutgoingPeerLimit(limit: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!(GenUtils.isInt(limit) && limit >= 0)) throw new MoneroError("Outgoing peer limit must be >= 0");
    let resp = await this.rpc.sendPathRequest("out_peers", {out_peers: limit});
    MoneroDaemonRpc._checkResponseStatus(resp);
  }

  async setIncomingPeerLimit(limit: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (!(GenUtils.isInt(limit) && limit >= 0)) throw new MoneroError("Incoming peer limit must be >= 0");
    let resp = await this.rpc.sendPathRequest("in_peers", {in_peers: limit});
    MoneroDaemonRpc._checkResponseStatus(resp);
  }

  // @ts-expect-error TS(2416): Property 'getPeerBans' in type 'MoneroDaemonRpc' i... Remove this comment to see the full error message
  async getPeerBans() {
    let resp = await this.rpc.sendJsonRequest("get_bans");
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    let bans = [];
    for (let rpcBan of resp.result.bans) {
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      let ban = new MoneroBan();
      ban.setHost(rpcBan.host);
      ban.setIp(rpcBan.ip);
      ban.setSeconds(rpcBan.seconds);
      bans.push(ban);
    }
    return bans;
  }

  async setPeerBans(bans: any) {
    let rpcBans = [];
    for (let ban of bans) rpcBans.push(MoneroDaemonRpc._convertToRpcBan(ban));
    let resp = await this.rpc.sendJsonRequest("set_bans", {bans: rpcBans});
    MoneroDaemonRpc._checkResponseStatus(resp.result);
  }

  async startMining(address: any, numThreads: any, isBackground: any, ignoreBattery: any) {
    assert(address, "Must provide address to mine to");
    assert(GenUtils.isInt(numThreads) && numThreads > 0, "Number of threads must be an integer greater than 0");
    assert(isBackground === undefined || typeof isBackground === "boolean");
    assert(ignoreBattery === undefined || typeof ignoreBattery === "boolean");
    let resp = await this.rpc.sendPathRequest("start_mining", {
      miner_address: address,
      threads_count: numThreads,
      do_background_mining: isBackground,
      ignore_battery: ignoreBattery,
    });
    MoneroDaemonRpc._checkResponseStatus(resp);
  }

  async stopMining() {
    let resp = await this.rpc.sendPathRequest("stop_mining");
    MoneroDaemonRpc._checkResponseStatus(resp);
  }

  // @ts-expect-error TS(2416): Property 'getMiningStatus' in type 'MoneroDaemonRp... Remove this comment to see the full error message
  async getMiningStatus() {
    let resp = await this.rpc.sendPathRequest("mining_status");
    MoneroDaemonRpc._checkResponseStatus(resp);
    return MoneroDaemonRpc._convertRpcMiningStatus(resp);
  }

  async submitBlocks(blockBlobs: any) {
    assert(Array.isArray(blockBlobs) && blockBlobs.length > 0, "Must provide an array of mined block blobs to submit");
    let resp = await this.rpc.sendJsonRequest("submit_block", blockBlobs);
    MoneroDaemonRpc._checkResponseStatus(resp.result);
  }

  // @ts-expect-error TS(2416): Property 'pruneBlockchain' in type 'MoneroDaemonRp... Remove this comment to see the full error message
  async pruneBlockchain(check: any) {
    let resp = await this.rpc.sendJsonRequest("prune_blockchain", {check: check}, 0);
    MoneroDaemonRpc._checkResponseStatus(resp.result);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let result = new MoneroPruneResult();
    result.setIsPruned(resp.result.pruned);
    result.setPruningSeed(resp.result.pruning_seed);
    return result;
  }

  async checkForUpdate() {
    let resp = await this.rpc.sendPathRequest("update", {command: "check"});
    MoneroDaemonRpc._checkResponseStatus(resp);
    return MoneroDaemonRpc._convertRpcUpdateCheckResult(resp);
  }

  async downloadUpdate(path: any) {
    let resp = await this.rpc.sendPathRequest("update", {command: "download", path: path});
    MoneroDaemonRpc._checkResponseStatus(resp);
    return MoneroDaemonRpc._convertRpcUpdateDownloadResult(resp);
  }

  async stop() {
    let resp = await this.rpc.sendPathRequest("stop_daemon");
    MoneroDaemonRpc._checkResponseStatus(resp);
  }

  // @ts-expect-error TS(2416): Property 'waitForNextBlockHeader' in type 'MoneroD... Remove this comment to see the full error message
  async waitForNextBlockHeader() {
    let that = this;
    return new Promise(async function(resolve) {
      await that.addListener(new (class extends MoneroDaemonListener {
        async onBlockHeader(header: any) {
          await that.removeListener(this);
          resolve(header);
        }
      })); 
    });
  }

  // ----------- ADD JSDOC FOR SUPPORTED DEFAULT IMPLEMENTATIONS --------------

  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async getTx() { return super.getTx(...arguments); }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async getTxHex() { return super.getTxHex(...arguments); }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async getKeyImageSpentStatus() { return super.getKeyImageSpentStatus(...arguments); }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async setPeerBan() { return super.setPeerBan(...arguments); }
  // @ts-expect-error TS(2556): A spread argument must either have a tuple type or... Remove this comment to see the full error message
  async submitBlock() { return super.submitBlock(...arguments); }

  // ------------------------------- PRIVATE ----------------------------------

  _refreshListening() {
    if (this.pollListener == undefined && this.listeners.length) this.pollListener = new DaemonPoller(this);
    if (this.pollListener !== undefined) this.pollListener.setIsPolling(this.listeners.length > 0);
  }

  async _getBandwidthLimits() {
    let resp = await this.rpc.sendPathRequest("get_limit");
    MoneroDaemonRpc._checkResponseStatus(resp);
    return [resp.limit_down, resp.limit_up];
  }

  async _setBandwidthLimits(downLimit: any, upLimit: any) {
    if (downLimit === undefined) downLimit = 0;
    if (upLimit === undefined) upLimit = 0;
    let resp = await this.rpc.sendPathRequest("set_limit", {limit_down: downLimit, limit_up: upLimit});
    MoneroDaemonRpc._checkResponseStatus(resp);
    return [resp.limit_down, resp.limit_up];
  }

  /**
   * Get a contiguous chunk of blocks starting from a given height up to a maximum
   * height or amount of block data fetched from the blockchain, whichever comes first.
   * 
   * @param {number} [startHeight] - start height to retrieve blocks (default 0)
   * @param {number} [maxHeight] - maximum end height to retrieve blocks (default blockchain height)
   * @param {number} [maxReqSize] - maximum amount of block data to fetch from the blockchain in bytes (default 3,000,000 bytes)
   * @return {MoneroBlock[]} are the resulting chunk of blocks
   */
  async _getMaxBlocks(startHeight: any, maxHeight: any, maxReqSize: any) {
    if (startHeight === undefined) startHeight = 0;
    if (maxHeight === undefined) maxHeight = (await this.getHeight()) - 1;
    // @ts-expect-error TS(2339): Property 'MAX_REQ_SIZE' does not exist on type 'ty... Remove this comment to see the full error message
    if (maxReqSize === undefined) maxReqSize = MoneroDaemonRpc.MAX_REQ_SIZE;
    
    // determine end height to fetch
    let reqSize = 0;
    let endHeight = startHeight - 1;
    while (reqSize < maxReqSize && endHeight < maxHeight) {
      
      // get header of next block
      let header = await this._getBlockHeaderByHeightCached(endHeight + 1, maxHeight);
      
      // block cannot be bigger than max request size
      assert(header.getSize() <= maxReqSize, "Block exceeds maximum request size: " + header.getSize());
      
      // done iterating if fetching block would exceed max request size
      if (reqSize + header.getSize() > maxReqSize) break;
      
      // otherwise block is included
      reqSize += header.getSize();
      endHeight++;
    }
    return endHeight >= startHeight ? await this.getBlocksByRange(startHeight, endHeight) : [];
  }

  /**
   * Retrieves a header by height from the cache or fetches and caches a header
   * range if not already in the cache.
   * 
   * @param {number} height - height of the header to retrieve from the cache
   * @param {number} maxHeight - maximum height of headers to cache
   */
  async _getBlockHeaderByHeightCached(height: any, maxHeight: any) {
    
    // get header from cache
    let cachedHeader = this.cachedHeaders[height];
    if (cachedHeader) return cachedHeader;
    
    // fetch and cache headers if not in cache
    // @ts-expect-error TS(2339): Property 'NUM_HEADERS_PER_REQ' does not exist on t... Remove this comment to see the full error message
    let endHeight = Math.min(maxHeight, height + MoneroDaemonRpc.NUM_HEADERS_PER_REQ - 1);  // TODO: could specify end height to cache to optimize small requests (would like to have time profiling in place though)
    let headers = await this.getBlockHeadersByRange(height, endHeight);
    for (let header of headers) {
      // @ts-expect-error TS(2532): Object is possibly 'undefined'.
      this.cachedHeaders[header.getHeight()] = header;
    }
    
    // return the cached header
    return this.cachedHeaders[height];
  }

  // --------------------------------- STATIC ---------------------------------

  static _normalizeConfig(uriOrConfigOrConnection: any, username: any, password: any, rejectUnauthorized: any, pollInterval: any, proxyToWorker: any) {
    let config;
    if (typeof uriOrConfigOrConnection === "string") config = {uri: uriOrConfigOrConnection, username: username, password: password, proxyToWorker: proxyToWorker, rejectUnauthorized: rejectUnauthorized, pollInterval: pollInterval};
    else {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (typeof uriOrConfigOrConnection !== "object") throw new MoneroError("Invalid configuration to create rpc client; must be string, object, or MoneroRpcConnection");
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (username || password || rejectUnauthorized || pollInterval || proxyToWorker) throw new MoneroError("Can provide config object or params or new MoneroDaemonRpc(...) but not both");
      if (uriOrConfigOrConnection instanceof MoneroRpcConnection) config = Object.assign({}, uriOrConfigOrConnection.getConfig());
      else config = Object.assign({}, uriOrConfigOrConnection);
    }
    if (config.server) {
      // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
      config = Object.assign(config, new MoneroRpcConnection(config.server).getConfig());
      delete config.server;
    }
    if (config.pollInterval === undefined) config.pollInterval = 5000; // TODO: move to config
    if (config.proxyToWorker === undefined) config.proxyToWorker = true;
    return config;
  }

  static _checkResponseStatus(resp: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (resp.status !== "OK") throw new MoneroError(resp.status);
  }

  static _convertRpcBlockHeader(rpcHeader: any) {
    if (!rpcHeader) return undefined;
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let header = new MoneroBlockHeader();
    for (let key of Object.keys(rpcHeader)) {
      let val = rpcHeader[key];
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      if (key === "block_size") GenUtils.safeSet(header, header.getSize, header.setSize, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "depth") GenUtils.safeSet(header, header.getDepth, header.setDepth, val);
      else if (key === "difficulty") { }  // handled by wide_difficulty
      else if (key === "cumulative_difficulty") { } // handled by wide_cumulative_difficulty
      else if (key === "difficulty_top64") { }  // handled by wide_difficulty
      else if (key === "cumulative_difficulty_top64") { } // handled by wide_cumulative_difficulty
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      else if (key === "wide_difficulty") header.setDifficulty(GenUtils.reconcile(header.getDifficulty(), MoneroDaemonRpc._prefixedHexToBI(val)));
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      else if (key === "wide_cumulative_difficulty") header.setCumulativeDifficulty(GenUtils.reconcile(header.getCumulativeDifficulty(), MoneroDaemonRpc._prefixedHexToBI(val)));
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "hash") GenUtils.safeSet(header, header.getHash, header.setHash, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "height") GenUtils.safeSet(header, header.getHeight, header.setHeight, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "major_version") GenUtils.safeSet(header, header.getMajorVersion, header.setMajorVersion, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "minor_version") GenUtils.safeSet(header, header.getMinorVersion, header.setMinorVersion, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "nonce") GenUtils.safeSet(header, header.getNonce, header.setNonce, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "num_txes") GenUtils.safeSet(header, header.getNumTxs, header.setNumTxs, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "orphan_status") GenUtils.safeSet(header, header.getOrphanStatus, header.setOrphanStatus, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "prev_hash" || key === "prev_id") GenUtils.safeSet(header, header.getPrevHash, header.setPrevHash, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "reward") GenUtils.safeSet(header, header.getReward, header.setReward, BigInt(val));
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "timestamp") GenUtils.safeSet(header, header.getTimestamp, header.setTimestamp, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "block_weight") GenUtils.safeSet(header, header.getWeight, header.setWeight, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "long_term_weight") GenUtils.safeSet(header, header.getLongTermWeight, header.setLongTermWeight, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "pow_hash") GenUtils.safeSet(header, header.getPowHash, header.setPowHash, val === "" ? undefined : val);
      else if (key === "tx_hashes") {}  // used in block model, not header model
      else if (key === "miner_tx") {}   // used in block model, not header model
      else if (key === "miner_tx_hash") header.setMinerTxHash(val);
      else console.log("WARNING: ignoring unexpected block header field: '" + key + "': " + val);
    }
    return header;
  }

  static _convertRpcBlock(rpcBlock: any) {
    
    // build block
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let block = new MoneroBlock(MoneroDaemonRpc._convertRpcBlockHeader(rpcBlock.block_header ? rpcBlock.block_header : rpcBlock));
    block.setHex(rpcBlock.blob);
    block.setTxHashes(rpcBlock.tx_hashes === undefined ? [] : rpcBlock.tx_hashes);
    
    // build miner tx
    let rpcMinerTx = rpcBlock.json ? JSON.parse(rpcBlock.json).miner_tx : rpcBlock.miner_tx;  // may need to be parsed from json
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let minerTx = new MoneroTx();
    block.setMinerTx(minerTx);
    minerTx.setIsConfirmed(true);
    minerTx.setIsMinerTx(true);
    MoneroDaemonRpc._convertRpcTx(rpcMinerTx, minerTx);
    
    return block;
  }

  /**
   * Transfers RPC tx fields to a given MoneroTx without overwriting previous values.
   * 
   * TODO: switch from safe set
   * 
   * @param rpcTx - RPC map containing transaction fields
   * @param tx  - MoneroTx to populate with values (optional)
   * @returns tx - same tx that was passed in or a new one if none given
   */
  static _convertRpcTx(rpcTx: any, tx: any) {
    if (rpcTx === undefined) return undefined;
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    if (tx === undefined) tx = new MoneroTx();
    
//    console.log("******** BUILDING TX ***********");
//    console.log(rpcTx);
//    console.log(tx.toString());
    
    // initialize from rpc map
    let header;
    for (let key of Object.keys(rpcTx)) {
      let val = rpcTx[key];
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      if (key === "tx_hash" || key === "id_hash") GenUtils.safeSet(tx, tx.getHash, tx.setHash, val);
      else if (key === "block_timestamp") {
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        if (!header) header = new MoneroBlockHeader();
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(header, header.getTimestamp, header.setTimestamp, val);
      }
      else if (key === "block_height") {
        // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
        if (!header) header = new MoneroBlockHeader();
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(header, header.getHeight, header.setHeight, val);
      }
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "last_relayed_time") GenUtils.safeSet(tx, tx.getLastRelayedTimestamp, tx.setLastRelayedTimestamp, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "receive_time" || key === "received_timestamp") GenUtils.safeSet(tx, tx.getReceivedTimestamp, tx.setReceivedTimestamp, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "confirmations") GenUtils.safeSet(tx, tx.getNumConfirmations, tx.setNumConfirmations, val); 
      else if (key === "in_pool") {
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(tx, tx.isConfirmed, tx.setIsConfirmed, !val);
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(tx, tx.inTxPool, tx.setInTxPool, val);
      }
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "double_spend_seen") GenUtils.safeSet(tx, tx.isDoubleSpendSeen, tx.setIsDoubleSpend, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "version") GenUtils.safeSet(tx, tx.getVersion, tx.setVersion, val);
      else if (key === "extra") {
        if (typeof val === "string") console.log("WARNING: extra field as string not being asigned to int[]: " + key + ": " + val); // TODO: how to set string to int[]? - or, extra is string which can encode int[]
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        else GenUtils.safeSet(tx, tx.getExtra, tx.setExtra, val);
      }
      else if (key === "vin") {
        if (val.length !== 1 || !val[0].gen) {  // ignore miner input TODO: why?
          tx.setInputs(val.map((rpcVin: any) => MoneroDaemonRpc._convertRpcOutput(rpcVin, tx)));
        }
      }
      else if (key === "vout") tx.setOutputs(val.map((rpcOutput: any) => MoneroDaemonRpc._convertRpcOutput(rpcOutput, tx)));
      else if (key === "rct_signatures") {
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(tx, tx.getRctSignatures, tx.setRctSignatures, val);
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        if (val.txnFee) GenUtils.safeSet(tx, tx.getFee, tx.setFee, BigInteger.parse(val.txnFee));
      } 
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "rctsig_prunable") GenUtils.safeSet(tx, tx.getRctSigPrunable, tx.setRctSigPrunable, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "unlock_time") GenUtils.safeSet(tx, tx.getUnlockHeight, tx.setUnlockHeight, val);
      else if (key === "as_json" || key === "tx_json") { }  // handled last so tx is as initialized as possible
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "as_hex" || key === "tx_blob") GenUtils.safeSet(tx, tx.getFullHex, tx.setFullHex, val ? val : undefined);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "blob_size") GenUtils.safeSet(tx, tx.getSize, tx.setSize, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "weight") GenUtils.safeSet(tx, tx.getWeight, tx.setWeight, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "fee") GenUtils.safeSet(tx, tx.getFee, tx.setFee, BigInt(val));
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "relayed") GenUtils.safeSet(tx, tx.isRelayed, tx.setIsRelayed, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "output_indices") GenUtils.safeSet(tx, tx.getOutputIndices, tx.setOutputIndices, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "do_not_relay") GenUtils.safeSet(tx, tx.getRelay, tx.setRelay, !val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "kept_by_block") GenUtils.safeSet(tx, tx.isKeptByBlock, tx.setIsKeptByBlock, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "signatures") GenUtils.safeSet(tx, tx.getSignatures, tx.setSignatures, val);
      else if (key === "last_failed_height") {
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        if (val === 0) GenUtils.safeSet(tx, tx.isFailed, tx.setIsFailed, false);
        else {
          // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
          GenUtils.safeSet(tx, tx.isFailed, tx.setIsFailed, true);
          // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
          GenUtils.safeSet(tx, tx.getLastFailedHeight, tx.setLastFailedHeight, val);
        }
      }
      else if (key === "last_failed_id_hash") {
        // @ts-expect-error TS(2339): Property 'DEFAULT_ID' does not exist on type 'type... Remove this comment to see the full error message
        if (val === MoneroDaemonRpc.DEFAULT_ID) GenUtils.safeSet(tx, tx.isFailed, tx.setIsFailed, false);
        else {
          // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
          GenUtils.safeSet(tx, tx.isFailed, tx.setIsFailed, true);
          // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
          GenUtils.safeSet(tx, tx.getLastFailedHash, tx.setLastFailedHash, val);
        }
      }
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "max_used_block_height") GenUtils.safeSet(tx, tx.getMaxUsedBlockHeight, tx.setMaxUsedBlockHeight, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "max_used_block_id_hash") GenUtils.safeSet(tx, tx.getMaxUsedBlockHash, tx.setMaxUsedBlockHash, val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "prunable_hash") GenUtils.safeSet(tx, tx.getPrunableHash, tx.setPrunableHash, val ? val : undefined);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "prunable_as_hex") GenUtils.safeSet(tx, tx.getPrunableHex, tx.setPrunableHex, val ? val : undefined);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "pruned_as_hex") GenUtils.safeSet(tx, tx.getPrunedHex, tx.setPrunedHex, val ? val : undefined);
      else console.log("WARNING: ignoring unexpected field in rpc tx: " + key + ": " + val);
    }
    
    // link block and tx
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (header) tx.setBlock(new MoneroBlock(header).setTxs([tx]));
    
    // TODO monerod: unconfirmed txs misreport block height and timestamp
    if (tx.getBlock() && tx.getBlock().getHeight() !== undefined && tx.getBlock().getHeight() === tx.getBlock().getTimestamp()) {
      tx.setBlock(undefined);
      tx.setIsConfirmed(false);
    }
    
    // initialize remaining known fields
    if (tx.isConfirmed()) {
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      GenUtils.safeSet(tx, tx.isRelayed, tx.setIsRelayed, true);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      GenUtils.safeSet(tx, tx.getRelay, tx.setRelay, true);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      GenUtils.safeSet(tx, tx.isFailed, tx.setIsFailed, false);
    } else {
      tx.setNumConfirmations(0);
    }
    if (tx.isFailed() === undefined) tx.setIsFailed(false);
    if (tx.getOutputIndices() && tx.getOutputs())  {
      assert.equal(tx.getOutputs().length, tx.getOutputIndices().length);
      for (let i = 0; i < tx.getOutputs().length; i++) {
        tx.getOutputs()[i].setIndex(tx.getOutputIndices()[i]);  // transfer output indices to outputs
      }
    }
    if (rpcTx.as_json) MoneroDaemonRpc._convertRpcTx(JSON.parse(rpcTx.as_json), tx);
    if (rpcTx.tx_json) MoneroDaemonRpc._convertRpcTx(JSON.parse(rpcTx.tx_json), tx);
    if (!tx.isRelayed()) tx.setLastRelayedTimestamp(undefined);  // TODO monerod: returns last_relayed_timestamp despite relayed: false, self inconsistent
    
    // return built transaction
    return tx;
  }

  static _convertRpcOutput(rpcOutput: any, tx: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let output = new MoneroOutput();
    output.setTx(tx);
    for (let key of Object.keys(rpcOutput)) {
      let val = rpcOutput[key];
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (key === "gen") throw new MoneroError("Output with 'gen' from daemon rpc is miner tx which we ignore (i.e. each miner input is undefined)");
      else if (key === "key") {
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(output, output.getAmount, output.setAmount, BigInt(val.amount));
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(output, output.getKeyImage, output.setKeyImage, new MoneroKeyImage(val.k_image));
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(output, output.getRingOutputIndices, output.setRingOutputIndices, val.key_offsets);
      }
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "amount") GenUtils.safeSet(output, output.getAmount, output.setAmount, BigInt(val));
      else if (key === "target") {
        let pubKey = val.key === undefined ? val.tagged_key.key : val.key; // TODO (monerod): rpc json uses {tagged_key={key=...}}, binary blocks use {key=...}
        // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
        GenUtils.safeSet(output, output.getStealthPublicKey, output.setStealthPublicKey, pubKey);
      }
      else console.log("WARNING: ignoring unexpected field output: " + key + ": " + val);
    }
    return output;
  }

  static _convertRpcBlockTemplate(rpcTemplate: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let template = new MoneroBlockTemplate();
    for (let key of Object.keys(rpcTemplate)) {
      let val = rpcTemplate[key];
      if (key === "blockhashing_blob") template.setBlockTemplateBlob(val);
      else if (key === "blocktemplate_blob") template.setBlockHashingBlob(val);
      else if (key === "difficulty") template.setDifficulty(BigInt(val));
      else if (key === "expected_reward") template.setExpectedReward(val);
      else if (key === "difficulty") { }  // handled by wide_difficulty
      else if (key === "difficulty_top64") { }  // handled by wide_difficulty
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      else if (key === "wide_difficulty") template.setDifficulty(GenUtils.reconcile(template.getDifficulty(), MoneroDaemonRpc._prefixedHexToBI(val)));
      else if (key === "height") template.setHeight(val);
      else if (key === "prev_hash") template.setPrevHash(val);
      else if (key === "reserved_offset") template.setReservedOffset(val);
      else if (key === "status") {}  // handled elsewhere
      else if (key === "untrusted") {}  // handled elsewhere
      else if (key === "seed_height") template.setSeedHeight(val);
      else if (key === "seed_hash") template.setSeedHash(val);
      else if (key === "next_seed_hash") template.setNextSeedHash(val);
      else console.log("WARNING: ignoring unexpected field in block template: " + key + ": " + val);
    }
    if ("" === template.getNextSeedHash()) template.setNextSeedHash(undefined);
    return template;
  }

  static _convertRpcInfo(rpcInfo: any) {
    if (!rpcInfo) return undefined;
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let info = new MoneroDaemonInfo();
    for (let key of Object.keys(rpcInfo)) {
      let val = rpcInfo[key];
      if (key === "version") info.setVersion(val);
      else if (key === "alt_blocks_count") info.setNumAltBlocks(val);
      else if (key === "block_size_limit") info.setBlockSizeLimit(val);
      else if (key === "block_size_median") info.setBlockSizeMedian(val);
      else if (key === "block_weight_limit") info.setBlockWeightLimit(val);
      else if (key === "block_weight_median") info.setBlockWeightMedian(val);
      else if (key === "bootstrap_daemon_address") { if (val) info.setBootstrapDaemonAddress(val); }
      else if (key === "difficulty") { }  // handled by wide_difficulty
      else if (key === "cumulative_difficulty") { } // handled by wide_cumulative_difficulty
      else if (key === "difficulty_top64") { }  // handled by wide_difficulty
      else if (key === "cumulative_difficulty_top64") { } // handled by wide_cumulative_difficulty
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      else if (key === "wide_difficulty") info.setDifficulty(GenUtils.reconcile(info.getDifficulty(), MoneroDaemonRpc._prefixedHexToBI(val)));
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      else if (key === "wide_cumulative_difficulty") info.setCumulativeDifficulty(GenUtils.reconcile(info.getCumulativeDifficulty(), MoneroDaemonRpc._prefixedHexToBI(val)));
      else if (key === "free_space") info.setFreeSpace(BigInt(val));
      else if (key === "database_size") info.setDatabaseSize(val);
      else if (key === "grey_peerlist_size") info.setNumOfflinePeers(val);
      else if (key === "height") info.setHeight(val);
      else if (key === "height_without_bootstrap") info.setHeightWithoutBootstrap(val);
      else if (key === "incoming_connections_count") info.setNumIncomingConnections(val);
      else if (key === "offline") info.setIsOffline(val);
      else if (key === "outgoing_connections_count") info.setNumOutgoingConnections(val);
      else if (key === "rpc_connections_count") info.setNumRpcConnections(val);
      else if (key === "start_time") info.setStartTimestamp(val);
      else if (key === "adjusted_time") info.setAdjustedTimestamp(val);
      else if (key === "status") {}  // handled elsewhere
      else if (key === "target") info.setTarget(val);
      else if (key === "target_height") info.setTargetHeight(val);
      else if (key === "top_block_hash") info.setTopBlockHash(val);
      else if (key === "tx_count") info.setNumTxs(val);
      else if (key === "tx_pool_size") info.setNumTxsPool(val);
      else if (key === "untrusted") {} // handled elsewhere
      else if (key === "was_bootstrap_ever_used") info.setWasBootstrapEverUsed(val);
      else if (key === "white_peerlist_size") info.setNumOnlinePeers(val);
      else if (key === "update_available") info.setUpdateAvailable(val);
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "nettype") GenUtils.safeSet(info, info.getNetworkType, info.setNetworkType, MoneroDaemon.parseNetworkType(val));
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "mainnet") { if (val) GenUtils.safeSet(info, info.getNetworkType, info.setNetworkType, MoneroNetworkType.MAINNET); }
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "testnet") { if (val) GenUtils.safeSet(info, info.getNetworkType, info.setNetworkType, MoneroNetworkType.TESTNET); }
      // @ts-expect-error TS(2554): Expected 6 arguments, but got 4.
      else if (key === "stagenet") { if (val) GenUtils.safeSet(info, info.getNetworkType, info.setNetworkType, MoneroNetworkType.STAGENET); }
      else if (key === "credits") info.setCredits(BigInt(val));
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      else if (key === "top_block_hash" || key === "top_hash") info.setTopBlockHash(GenUtils.reconcile(info.getTopBlockHash(), "" === val ? undefined : val))
      else if (key === "busy_syncing") info.setIsBusySyncing(val);
      else if (key === "synchronized") info.setIsSynchronized(val);
      else if (key === "restricted") info.setIsRestricted(val);
      else console.log("WARNING: Ignoring unexpected info field: " + key + ": " + val);
    }
    return info;
  }

  /**
   * Initializes sync info from RPC sync info.
   * 
   * @param rpcSyncInfo - rpc map to initialize the sync info from
   * @return {MoneroDaemonSyncInfo} is sync info initialized from the map
   */
  static _convertRpcSyncInfo(rpcSyncInfo: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let syncInfo = new MoneroDaemonSyncInfo();
    for (let key of Object.keys(rpcSyncInfo)) {
      let val = rpcSyncInfo[key];
      if (key === "height") syncInfo.setHeight(val);
      else if (key === "peers") {
        syncInfo.setPeers([]);
        let rpcConnections = val;
        for (let rpcConnection of rpcConnections) {
          syncInfo.getPeers().push(MoneroDaemonRpc._convertRpcConnection(rpcConnection.info));
        }
      }
      else if (key === "spans") {
        syncInfo.setSpans([]);
        let rpcSpans = val;
        for (let rpcSpan of rpcSpans) {
          syncInfo.getSpans().push(MoneroDaemonRpc._convertRpcConnectionSpan(rpcSpan));
        }
      } else if (key === "status") {}   // handled elsewhere
      else if (key === "target_height") syncInfo.setTargetHeight(BigInt(val));
      else if (key === "next_needed_pruning_seed") syncInfo.setNextNeededPruningSeed(val);
      else if (key === "overview") {  // this returns [] without pruning
        let overview;
        try {
          overview = JSON.parse(val);
          if (overview !== undefined && overview.length > 0) console.error("Ignoring non-empty 'overview' field (not implemented): " + overview); // TODO
        } catch (e) {
          // @ts-expect-error TS(2571): Object is of type 'unknown'.
          console.error("Failed to parse 'overview' field: " + overview + ": " + e.message);
        }
      }
      else if (key === "credits") syncInfo.setCredits(BigInt(val));
      else if (key === "top_hash") syncInfo.setTopBlockHash("" === val ? undefined : val);
      else if (key === "untrusted") {}  // handled elsewhere
      else console.log("WARNING: ignoring unexpected field in sync info: " + key + ": " + val);
    }
    return syncInfo;
  }

  static _convertRpcHardForkInfo(rpcHardForkInfo: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let info = new MoneroHardForkInfo();
    for (let key of Object.keys(rpcHardForkInfo)) {
      let val = rpcHardForkInfo[key];
      if (key === "earliest_height") info.setEarliestHeight(val);
      else if (key === "enabled") info.setIsEnabled(val);
      else if (key === "state") info.setState(val);
      else if (key === "status") {}     // handled elsewhere
      else if (key === "untrusted") {}  // handled elsewhere
      else if (key === "threshold") info.setThreshold(val);
      else if (key === "version") info.setVersion(val);
      else if (key === "votes") info.setNumVotes(val);
      else if (key === "voting") info.setVoting(val);
      else if (key === "window") info.setWindow(val);
      else if (key === "credits") info.setCredits(BigInt(val));
      else if (key === "top_hash") info.setTopBlockHash("" === val ? undefined : val);
      else console.log("WARNING: ignoring unexpected field in hard fork info: " + key + ": " + val);
    }
    return info;
  }

  static _convertRpcConnectionSpan(rpcConnectionSpan: any) {
    // @ts-expect-error TS(2552): Cannot find name 'MoneroConnectionSpan'. Did you m... Remove this comment to see the full error message
    let span = new MoneroConnectionSpan();
    for (let key of Object.keys(rpcConnectionSpan)) {
      let val = rpcConnectionSpan[key];
      if (key === "connection_id") span.setConnectionId(val);
      else if (key === "nblocks") span.setNumBlocks(val);
      else if (key === "rate") span.setRate(val);
      else if (key === "remote_address") { if (val !== "") span.setRemoteAddress(val); }
      else if (key === "size") span.setSize(val);
      else if (key === "speed") span.setSpeed(val);
      else if (key === "start_block_height") span.setStartHeight(val);
      else console.log("WARNING: ignoring unexpected field in daemon connection span: " + key + ": " + val);
    }
    return span;
  }

  static _convertRpcOutputHistogramEntry(rpcEntry: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let entry = new MoneroOutputHistogramEntry();
    for (let key of Object.keys(rpcEntry)) {
      let val = rpcEntry[key];
      if (key === "amount") entry.setAmount(BigInt(val));
      else if (key === "total_instances") entry.setNumInstances(val);
      else if (key === "unlocked_instances") entry.setNumUnlockedInstances(val);
      else if (key === "recent_instances") entry.setNumRecentInstances(val);
      else console.log("WARNING: ignoring unexpected field in output histogram: " + key + ": " + val);
    }
    return entry;
  }

  static _convertRpcSubmitTxResult(rpcResult: any) {
    assert(rpcResult);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let result = new MoneroSubmitTxResult();
    for (let key of Object.keys(rpcResult)) {
      let val = rpcResult[key];
      if (key === "double_spend") result.setIsDoubleSpend(val);
      else if (key === "fee_too_low") result.setIsFeeTooLow(val);
      else if (key === "invalid_input") result.setHasInvalidInput(val);
      else if (key === "invalid_output") result.setHasInvalidOutput(val);
      else if (key === "too_few_outputs") result.setHasTooFewOutputs(val);
      else if (key === "low_mixin") result.setIsMixinTooLow(val);
      else if (key === "not_relayed") result.setIsRelayed(!val);
      else if (key === "overspend") result.setIsOverspend(val);
      else if (key === "reason") result.setReason(val === "" ? undefined : val);
      else if (key === "too_big") result.setIsTooBig(val);
      else if (key === "sanity_check_failed") result.setSanityCheckFailed(val);
      else if (key === "credits") result.setCredits(BigInt(val))
      else if (key === "status" || key === "untrusted") {}  // handled elsewhere
      else if (key === "top_hash") result.setTopBlockHash("" === val ? undefined : val);
      else if (key === "tx_extra_too_big") result.setIsTxExtraTooBig(val);
      else console.log("WARNING: ignoring unexpected field in submit tx hex result: " + key + ": " + val);
    }
    return result;
  }

  static _convertRpcTxPoolStats(rpcStats: any) {
    assert(rpcStats);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let stats = new MoneroTxPoolStats();
    for (let key of Object.keys(rpcStats)) {
      let val = rpcStats[key];
      if (key === "bytes_max") stats.setBytesMax(val);
      else if (key === "bytes_med") stats.setBytesMed(val);
      else if (key === "bytes_min") stats.setBytesMin(val);
      else if (key === "bytes_total") stats.setBytesTotal(val);
      else if (key === "histo_98pc") stats.setHisto98pc(val);
      else if (key === "num_10m") stats.setNum10m(val);
      else if (key === "num_double_spends") stats.setNumDoubleSpends(val);
      else if (key === "num_failing") stats.setNumFailing(val);
      else if (key === "num_not_relayed") stats.setNumNotRelayed(val);
      else if (key === "oldest") stats.setOldestTimestamp(val);
      else if (key === "txs_total") stats.setNumTxs(val);
      else if (key === "fee_total") stats.setFeeTotal(BigInteger.parse(val));
      else if (key === "histo") {
        stats.setHisto(new Map());
        for (let elem of val) stats.getHisto().set(elem.bytes, elem.txs);
      }
      else console.log("WARNING: ignoring unexpected field in tx pool stats: " + key + ": " + val);
    }

    // uninitialize some stats if not applicable
    if (stats.getHisto98pc() === 0) stats.setHisto98pc(undefined);
    if (stats.getNumTxs() === 0) {
      stats.setBytesMin(undefined);
      stats.setBytesMed(undefined);
      stats.setBytesMax(undefined);
      stats.setHisto98pc(undefined);
      stats.setOldestTimestamp(undefined);
    }

    return stats;
  }

  static _convertRpcAltChain(rpcChain: any) {
    assert(rpcChain);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let chain = new MoneroAltChain();
    for (let key of Object.keys(rpcChain)) {
      let val = rpcChain[key];
      if (key === "block_hash") {}  // using block_hashes instead
      else if (key === "difficulty") { } // handled by wide_difficulty
      else if (key === "difficulty_top64") { }  // handled by wide_difficulty
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      else if (key === "wide_difficulty") chain.setDifficulty(GenUtils.reconcile(chain.getDifficulty(), MoneroDaemonRpc._prefixedHexToBI(val)));
      else if (key === "height") chain.setHeight(val);
      else if (key === "length") chain.setLength(val);
      else if (key === "block_hashes") chain.setBlockHashes(val);
      else if (key === "main_chain_parent_block") chain.setMainChainParentBlockHash(val);
      else console.log("WARNING: ignoring unexpected field in alternative chain: " + key + ": " + val);
    }
    return chain;
  }

  static _convertRpcPeer(rpcPeer: any) {
    assert(rpcPeer);
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let peer = new MoneroPeer();
    for (let key of Object.keys(rpcPeer)) {
      let val = rpcPeer[key];
      if (key === "host") peer.setHost(val);
      else if (key === "id") peer.setId("" + val);  // TODO monero-wallet-rpc: peer id is BigInt but string in `get_connections`
      else if (key === "ip") {} // host used instead which is consistently a string
      else if (key === "last_seen") peer.setLastSeenTimestamp(val);
      else if (key === "port") peer.setPort(val);
      else if (key === "rpc_port") peer.setRpcPort(val);
      else if (key === "pruning_seed") peer.setPruningSeed(val);
      else if (key === "rpc_credits_per_hash") peer.setRpcCreditsPerHash(BigInt(val));
      else console.log("WARNING: ignoring unexpected field in rpc peer: " + key + ": " + val);
    }
    return peer;
  }

  static _convertRpcConnection(rpcConnection: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let peer = new MoneroPeer();
    peer.setIsOnline(true);
    for (let key of Object.keys(rpcConnection)) {
      let val = rpcConnection[key];
      if (key === "address") peer.setAddress(val);
      else if (key === "avg_download") peer.setAvgDownload(val);
      else if (key === "avg_upload") peer.setAvgUpload(val);
      else if (key === "connection_id") peer.setId(val);
      else if (key === "current_download") peer.setCurrentDownload(val);
      else if (key === "current_upload") peer.setCurrentUpload(val);
      else if (key === "height") peer.setHeight(val);
      else if (key === "host") peer.setHost(val);
      else if (key === "ip") {} // host used instead which is consistently a string
      else if (key === "incoming") peer.setIsIncoming(val);
      else if (key === "live_time") peer.setLiveTime(val);
      else if (key === "local_ip") peer.setIsLocalIp(val);
      else if (key === "localhost") peer.setIsLocalHost(val);
      else if (key === "peer_id") peer.setId(val);
      else if (key === "port") peer.setPort(parseInt(val));
      else if (key === "rpc_port") peer.setRpcPort(val);
      else if (key === "recv_count") peer.setNumReceives(val);
      else if (key === "recv_idle_time") peer.setReceiveIdleTime(val);
      else if (key === "send_count") peer.setNumSends(val);
      else if (key === "send_idle_time") peer.setSendIdleTime(val);
      else if (key === "state") peer.setState(val);
      else if (key === "support_flags") peer.setNumSupportFlags(val);
      else if (key === "pruning_seed") peer.setPruningSeed(val);
      else if (key === "rpc_credits_per_hash") peer.setRpcCreditsPerHash(BigInt(val));
      else if (key === "address_type") peer.setType(val);
      else console.log("WARNING: ignoring unexpected field in peer: " + key + ": " + val);
    }
    return peer;
  }

  static _convertToRpcBan(ban: any) {
    let rpcBan = {};
    // @ts-expect-error TS(2339): Property 'host' does not exist on type '{}'.
    rpcBan.host = ban.getHost();
    // @ts-expect-error TS(2339): Property 'ip' does not exist on type '{}'.
    rpcBan.ip = ban.getIp();
    // @ts-expect-error TS(2339): Property 'ban' does not exist on type '{}'.
    rpcBan.ban = ban.isBanned();
    // @ts-expect-error TS(2339): Property 'seconds' does not exist on type '{}'.
    rpcBan.seconds = ban.getSeconds();
    return rpcBan;
  }

  static _convertRpcMiningStatus(rpcStatus: any) {
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
    let status = new MoneroMiningStatus();
    status.setIsActive(rpcStatus.active);
    status.setSpeed(rpcStatus.speed);
    status.setNumThreads(rpcStatus.threads_count);
    if (rpcStatus.active) {
      status.setAddress(rpcStatus.address);
      status.setIsBackground(rpcStatus.is_background_mining_enabled);
    }
    return status;
  }

  static _convertRpcUpdateCheckResult(rpcResult: any) {
    assert(rpcResult);
    // @ts-expect-error TS(2304): Cannot find name 'MoneroDaemonUpdateCheckResult'.
    let result = new MoneroDaemonUpdateCheckResult();
    for (let key of Object.keys(rpcResult)) {
      let val = rpcResult[key];
      if (key === "auto_uri") result.setAutoUri(val);
      else if (key === "hash") result.setHash(val);
      else if (key === "path") {} // handled elsewhere
      else if (key === "status") {} // handled elsewhere
      else if (key === "update") result.setIsUpdateAvailable(val);
      else if (key === "user_uri") result.setUserUri(val);
      else if (key === "version") result.setVersion(val);
      else if (key === "untrusted") {} // handled elsewhere
      else console.log("WARNING: ignoring unexpected field in rpc check update result: " + key + ": " + val);
    }
    if (result.getAutoUri() === "") result.setAutoUri(undefined);
    if (result.getUserUri() === "") result.setUserUri(undefined);
    if (result.getVersion() === "") result.setVersion(undefined);
    if (result.getHash() === "") result.setHash(undefined);
    return result;
  }

  static _convertRpcUpdateDownloadResult(rpcResult: any) {
    // @ts-expect-error TS(2304): Cannot find name 'MoneroDaemonUpdateDownloadResult... Remove this comment to see the full error message
    let result = new MoneroDaemonUpdateDownloadResult(MoneroDaemonRpc._convertRpcUpdateCheckResult(rpcResult));
    result.setDownloadPath(rpcResult["path"]);
    if (result.getDownloadPath() === "") result.setDownloadPath(undefined);
    return result;
  }

  /**
   * Converts a '0x' prefixed hexidecimal string to a BigInt.
   * 
   * @param hex is the '0x' prefixed hexidecimal string to convert
   * @return BigInt is the hexicedimal converted to decimal
   */
  static _prefixedHexToBI(hex: any) {
    assert(hex.substring(0, 2) === "0x");
    // @ts-expect-error TS(2554): Expected 1 arguments, but got 2.
    return BigInt(hex, 16);
  }
}

// static variables
// @ts-expect-error TS(2339): Property 'DEFAULT_ID' does not exist on type 'type... Remove this comment to see the full error message
MoneroDaemonRpc.DEFAULT_ID = "0000000000000000000000000000000000000000000000000000000000000000";  // uninitialized tx or block hash from daemon rpc
// @ts-expect-error TS(2339): Property 'MAX_REQ_SIZE' does not exist on type 'ty... Remove this comment to see the full error message
MoneroDaemonRpc.MAX_REQ_SIZE = "3000000";  // max request size when fetching blocks from daemon
// @ts-expect-error TS(2339): Property 'NUM_HEADERS_PER_REQ' does not exist on t... Remove this comment to see the full error message
MoneroDaemonRpc.NUM_HEADERS_PER_REQ = "750";  // number of headers to fetch and cache per request

/**
 * Implements a MoneroDaemon by proxying requests to a worker.
 * 
 * @private
 */
class MoneroDaemonRpcProxy extends MoneroDaemon {
  daemonId: any;
  process: any;
  removeBlockListener: any;
  worker: any;
  wrappedListeners: any;

  // --------------------------- STATIC UTILITIES -----------------------------

  static async connect(config: any) {
    let daemonId = GenUtils.getUUID();
    config = Object.assign({}, config, {proxyToWorker: false});
    await LibraryUtils.invokeWorker(daemonId, "connectDaemonRpc", [config]);
    return new MoneroDaemonRpcProxy(daemonId, await LibraryUtils.getWorker());
  }

  // ---------------------------- INSTANCE METHODS ----------------------------

  constructor(daemonId: any, worker: any) {
    super();
    this.daemonId = daemonId;
    this.worker = worker;
    this.wrappedListeners = [];
  }

  async getProcess() {
    return undefined; // proxy does not have access to process
  }

  async stopProcess(force: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.process === undefined) throw new MoneroError("MoneroDaemonRpcProxy instance not created from new process");
    let listenersCopy = GenUtils.copyArray(this.getListeners());
    for (let listener of listenersCopy) await this.removeListener(listener);
    return GenUtils.killProcess(this.process, force ? "sigkill" : undefined);
  }

  // @ts-expect-error TS(2416): Property 'addListener' in type 'MoneroDaemonRpcPro... Remove this comment to see the full error message
  async addListener(listener: any) {
    let wrappedListener = new DaemonWorkerListener(listener);
    let listenerId = wrappedListener.getId();
    // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
    LibraryUtils.WORKER_OBJECTS[this.daemonId].callbacks["onBlockHeader_" + listenerId] = [wrappedListener.onBlockHeader, wrappedListener];
    this.wrappedListeners.push(wrappedListener);
    return this._invokeWorker("daemonAddListener", [listenerId]);
  }

  async removeListener(listener: any) {
    for (let i = 0; i < this.wrappedListeners.length; i++) {
      if (this.wrappedListeners[i].getListener() === listener) {
        let listenerId = this.wrappedListeners[i].getId();
        await this._invokeWorker("daemonRemoveListener", [listenerId]);
        // @ts-expect-error TS(2339): Property 'WORKER_OBJECTS' does not exist on type '... Remove this comment to see the full error message
        delete LibraryUtils.WORKER_OBJECTS[this.daemonId].callbacks["onBlockHeader_" + listenerId];
        this.wrappedListeners.splice(i, 1);
        return;
      }
    }
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Listener is not registered with daemon");
  }

  getListeners() {
    let listeners = [];
    for (let wrappedListener of this.wrappedListeners) listeners.push(wrappedListener.getListener());
    return listeners;
  }

  async getRpcConnection() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let config = await this._invokeWorker("daemonGetRpcConnection");
    // @ts-expect-error TS(2554): Expected 5 arguments, but got 1.
    return new MoneroRpcConnection(config);
  }

  // @ts-expect-error TS(2416): Property 'isConnected' in type 'MoneroDaemonRpcPro... Remove this comment to see the full error message
  async isConnected() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonIsConnected");
  }

  // @ts-expect-error TS(2416): Property 'getVersion' in type 'MoneroDaemonRpcProx... Remove this comment to see the full error message
  async getVersion() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let versionJson = await this._invokeWorker("daemonGetVersion");
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    return new MoneroVersion(versionJson.number, versionJson.isRelease);
  }

  // @ts-expect-error TS(2416): Property 'isTrusted' in type 'MoneroDaemonRpcProxy... Remove this comment to see the full error message
  async isTrusted() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonIsTrusted");
  }

  // @ts-expect-error TS(2416): Property 'getHeight' in type 'MoneroDaemonRpcProxy... Remove this comment to see the full error message
  async getHeight() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonGetHeight");
  }

  // @ts-expect-error TS(2416): Property 'getBlockHash' in type 'MoneroDaemonRpcPr... Remove this comment to see the full error message
  async getBlockHash(height: any) {
    return this._invokeWorker("daemonGetBlockHash", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getBlockTemplate' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async getBlockTemplate(walletAddress: any, reserveSize: any) {
    return new MoneroBlockTemplate(await this._invokeWorker("daemonGetBlockTemplate", Array.from(arguments)));
  }

  // @ts-expect-error TS(2416): Property 'getLastBlockHeader' in type 'MoneroDaemo... Remove this comment to see the full error message
  async getLastBlockHeader() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroBlockHeader(await this._invokeWorker("daemonGetLastBlockHeader"));
  }

  // @ts-expect-error TS(2416): Property 'getBlockHeaderByHash' in type 'MoneroDae... Remove this comment to see the full error message
  async getBlockHeaderByHash(blockHash: any) {
    return new MoneroBlockHeader(await this._invokeWorker("daemonGetBlockHeaderByHash", Array.from(arguments)));
  }

  // @ts-expect-error TS(2416): Property 'getBlockHeaderByHeight' in type 'MoneroD... Remove this comment to see the full error message
  async getBlockHeaderByHeight(height: any) {
    return new MoneroBlockHeader(await this._invokeWorker("daemonGetBlockHeaderByHeight", Array.from(arguments)));
  }

  // @ts-expect-error TS(2416): Property 'getBlockHeadersByRange' in type 'MoneroD... Remove this comment to see the full error message
  async getBlockHeadersByRange(startHeight: any, endHeight: any) {
    let blockHeadersJson = await this._invokeWorker("daemonGetBlockHeadersByRange", Array.from(arguments));
    let headers = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let blockHeaderJson of blockHeadersJson) headers.push(new MoneroBlockHeader(blockHeaderJson));
    return headers;
  }

  // @ts-expect-error TS(2416): Property 'getBlockByHash' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async getBlockByHash(blockHash: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroBlock(await this._invokeWorker("daemonGetBlockByHash", Array.from(arguments)));
  }

  // @ts-expect-error TS(2416): Property 'getBlocksByHash' in type 'MoneroDaemonRp... Remove this comment to see the full error message
  async getBlocksByHash(blockHashes: any, startHeight: any, prune: any) {
    let blocksJson = await this._invokeWorker("daemonGetBlocksByHash", Array.from(arguments));
    let blocks = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let blockJson of blocksJson) blocks.push(new MoneroBlock(blockJson));
    return blocks;
  }

  // @ts-expect-error TS(2416): Property 'getBlockByHeight' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async getBlockByHeight(height: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroBlock(await this._invokeWorker("daemonGetBlockByHeight", Array.from(arguments)));
  }

  // @ts-expect-error TS(2416): Property 'getBlocksByHeight' in type 'MoneroDaemon... Remove this comment to see the full error message
  async getBlocksByHeight(heights: any) {
    let blocksJson = await this._invokeWorker("daemonGetBlocksByHeight", Array.from(arguments));
    let blocks = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let blockJson of blocksJson) blocks.push(new MoneroBlock(blockJson));
    return blocks;
  }

  // @ts-expect-error TS(2416): Property 'getBlocksByRange' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async getBlocksByRange(startHeight: any, endHeight: any) {
    let blocksJson = await this._invokeWorker("daemonGetBlocksByRange", Array.from(arguments));
    let blocks = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let blockJson of blocksJson) blocks.push(new MoneroBlock(blockJson));
    return blocks;
  }

  // @ts-expect-error TS(2416): Property 'getBlocksByRangeChunked' in type 'Monero... Remove this comment to see the full error message
  async getBlocksByRangeChunked(startHeight: any, endHeight: any, maxChunkSize: any) {
    let blocksJson = await this._invokeWorker("daemonGetBlocksByRangeChunked", Array.from(arguments));
    let blocks = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let blockJson of blocksJson) blocks.push(new MoneroBlock(blockJson));
    return blocks;
  }

  // @ts-expect-error TS(2416): Property 'getBlockHashes' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async getBlockHashes(blockHashes: any, startHeight: any) {
    return this._invokeWorker("daemonGetBlockHashes", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getTxs' in type 'MoneroDaemonRpcProxy' i... Remove this comment to see the full error message
  async getTxs(txHashes: any, prune = false) {
    
    // deserialize txs from blocks
    let blocks = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let blockJson of await this._invokeWorker("daemonGetTxs", Array.from(arguments))) {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      blocks.push(new MoneroBlock(blockJson));
    }
    
    // collect txs
    let txs = [];
    for (let block of blocks) {
      for (let tx of block.getTxs()) {
        if (!tx.isConfirmed()) tx.setBlock(undefined);
        txs.push(tx);
      }
    }
    return txs;
  }

  // @ts-expect-error TS(2416): Property 'getTxHexes' in type 'MoneroDaemonRpcProx... Remove this comment to see the full error message
  async getTxHexes(txHashes: any, prune = false) {
    return this._invokeWorker("daemonGetTxHexes", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getMinerTxSum' in type 'MoneroDaemonRpcP... Remove this comment to see the full error message
  async getMinerTxSum(height: any, numBlocks: any) {
    return new MoneroMinerTxSum(await this._invokeWorker("daemonGetMinerTxSum", Array.from(arguments)));
  }

  // @ts-expect-error TS(2416): Property 'getFeeEstimate' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async getFeeEstimate(graceBlocks: any) {
    return new MoneroFeeEstimate(await this._invokeWorker("daemonGetFeeEstimate", Array.from(arguments)));
  }

  // @ts-expect-error TS(2416): Property 'submitTxHex' in type 'MoneroDaemonRpcPro... Remove this comment to see the full error message
  async submitTxHex(txHex: any, doNotRelay: any) {
    return new MoneroSubmitTxResult(await this._invokeWorker("daemonSubmitTxHex", Array.from(arguments)));
  }

  // @ts-expect-error TS(2416): Property 'relayTxsByHash' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async relayTxsByHash(txHashes: any) {
    return this._invokeWorker("daemonRelayTxsByHash", Array.from(arguments));
  }

  async getTxPool() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let blockJson = await this._invokeWorker("daemonGetTxPool");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    let txs = new MoneroBlock(blockJson).getTxs();
    for (let tx of txs) tx.setBlock(undefined);
    return txs ? txs : [];
  }

  // @ts-expect-error TS(2416): Property 'getTxPoolHashes' in type 'MoneroDaemonRp... Remove this comment to see the full error message
  async getTxPoolHashes() {
    return this._invokeWorker("daemonGetTxPoolHashes", Array.from(arguments));
  }

  async getTxPoolBacklog() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  // @ts-expect-error TS(2416): Property 'getTxPoolStats' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async getTxPoolStats() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroTxPoolStats(await this._invokeWorker("daemonGetTxPoolStats"));
  }

  // @ts-expect-error TS(2416): Property 'flushTxPool' in type 'MoneroDaemonRpcPro... Remove this comment to see the full error message
  async flushTxPool(hashes: any) {
    return this._invokeWorker("daemonFlushTxPool", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getKeyImageSpentStatuses' in type 'Moner... Remove this comment to see the full error message
  async getKeyImageSpentStatuses(keyImages: any) {
    return this._invokeWorker("daemonGetKeyImageSpentStatuses", Array.from(arguments));
  }

  async getOutputs(outputs: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  // @ts-expect-error TS(2416): Property 'getOutputHistogram' in type 'MoneroDaemo... Remove this comment to see the full error message
  async getOutputHistogram(amounts: any, minCount: any, maxCount: any, isUnlocked: any, recentCutoff: any) {
    let entries = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let entryJson of await this._invokeWorker("daemonGetOutputHistogram", [amounts, minCount, maxCount, isUnlocked, recentCutoff])) {
      entries.push(new MoneroOutputHistogramEntry(entryJson));
    }
    return entries;
  }

  async getOutputDistribution(amounts: any, cumulative: any, startHeight: any, endHeight: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  // @ts-expect-error TS(2416): Property 'getInfo' in type 'MoneroDaemonRpcProxy' ... Remove this comment to see the full error message
  async getInfo() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroDaemonInfo(await this._invokeWorker("daemonGetInfo"));
  }

  // @ts-expect-error TS(2416): Property 'getSyncInfo' in type 'MoneroDaemonRpcPro... Remove this comment to see the full error message
  async getSyncInfo() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroDaemonSyncInfo(await this._invokeWorker("daemonGetSyncInfo"));
  }

  // @ts-expect-error TS(2416): Property 'getHardForkInfo' in type 'MoneroDaemonRp... Remove this comment to see the full error message
  async getHardForkInfo() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroHardForkInfo(await this._invokeWorker("daemonGetHardForkInfo"));
  }

  // @ts-expect-error TS(2416): Property 'getAltChains' in type 'MoneroDaemonRpcPr... Remove this comment to see the full error message
  async getAltChains() {
    let altChains = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let altChainJson of await this._invokeWorker("daemonGetAltChains")) altChains.push(new MoneroAltChain(altChainJson));
    return altChains;
  }

  // @ts-expect-error TS(2416): Property 'getAltBlockHashes' in type 'MoneroDaemon... Remove this comment to see the full error message
  async getAltBlockHashes() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonGetAltBlockHashes");
  }

  // @ts-expect-error TS(2416): Property 'getDownloadLimit' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async getDownloadLimit() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonGetDownloadLimit");
  }

  // @ts-expect-error TS(2416): Property 'setDownloadLimit' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async setDownloadLimit(limit: any) {
    return this._invokeWorker("daemonSetDownloadLimit", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'resetDownloadLimit' in type 'MoneroDaemo... Remove this comment to see the full error message
  async resetDownloadLimit() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonResetDownloadLimit");
  }

  // @ts-expect-error TS(2416): Property 'getUploadLimit' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async getUploadLimit() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonGetUploadLimit");
  }

  // @ts-expect-error TS(2416): Property 'setUploadLimit' in type 'MoneroDaemonRpc... Remove this comment to see the full error message
  async setUploadLimit(limit: any) {
    return this._invokeWorker("daemonSetUploadLimit", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'resetUploadLimit' in type 'MoneroDaemonR... Remove this comment to see the full error message
  async resetUploadLimit() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonResetUploadLimit");
  }

  // @ts-expect-error TS(2416): Property 'getPeers' in type 'MoneroDaemonRpcProxy'... Remove this comment to see the full error message
  async getPeers() {
    let peers = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let peerJson of await this._invokeWorker("daemonGetPeers")) peers.push(new MoneroPeer(peerJson));
    return peers;
  }

  // @ts-expect-error TS(2416): Property 'getKnownPeers' in type 'MoneroDaemonRpcP... Remove this comment to see the full error message
  async getKnownPeers() {
    let peers = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let peerJson of await this._invokeWorker("daemonGetKnownPeers")) peers.push(new MoneroPeer(peerJson));
    return peers;
  }

  // @ts-expect-error TS(2416): Property 'setOutgoingPeerLimit' in type 'MoneroDae... Remove this comment to see the full error message
  async setOutgoingPeerLimit(limit: any) {
    return this._invokeWorker("daemonSetIncomingPeerLimit", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'setIncomingPeerLimit' in type 'MoneroDae... Remove this comment to see the full error message
  async setIncomingPeerLimit(limit: any) {
    return this._invokeWorker("daemonSetIncomingPeerLimit", Array.from(arguments));
  }

  // @ts-expect-error TS(2416): Property 'getPeerBans' in type 'MoneroDaemonRpcPro... Remove this comment to see the full error message
  async getPeerBans() {
    let bans = [];
    // @ts-expect-error TS(2571): Object is of type 'unknown'.
    for (let banJson of await this._invokeWorker("daemonGetPeerBans")) bans.push(new MoneroBan(banJson));
    return bans;
  }

  // @ts-expect-error TS(2416): Property 'setPeerBans' in type 'MoneroDaemonRpcPro... Remove this comment to see the full error message
  async setPeerBans(bans: any) {
    let bansJson = [];
    for (let ban of bans) bansJson.push(ban.toJson());
    return this._invokeWorker("daemonSetPeerBans", [bansJson]);
  }

  // @ts-expect-error TS(2416): Property 'startMining' in type 'MoneroDaemonRpcPro... Remove this comment to see the full error message
  async startMining(address: any, numThreads: any, isBackground: any, ignoreBattery: any) {
    return this._invokeWorker("daemonStartMining", Array.from(arguments));
  }

  async stopMining() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    await this._invokeWorker("daemonStopMining")
  }

  // @ts-expect-error TS(2416): Property 'getMiningStatus' in type 'MoneroDaemonRp... Remove this comment to see the full error message
  async getMiningStatus() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroMiningStatus(await this._invokeWorker("daemonGetMiningStatus"));
  }

  async submitBlocks(blockBlobs: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  // @ts-expect-error TS(2416): Property 'pruneBlockchain' in type 'MoneroDaemonRp... Remove this comment to see the full error message
  async pruneBlockchain(check: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroPruneResult(await this._invokeWorker("daemonPruneBlockchain"));
  }

  async checkForUpdate() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  async downloadUpdate(path: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    throw new MoneroError("Not implemented");
  }

  // @ts-expect-error TS(2416): Property 'stop' in type 'MoneroDaemonRpcProxy' is ... Remove this comment to see the full error message
  async stop() {
    while (this.wrappedListeners.length) await this.removeBlockListener(this.wrappedListeners[0].getListener());
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return this._invokeWorker("daemonStop");
  }

  // @ts-expect-error TS(2416): Property 'waitForNextBlockHeader' in type 'MoneroD... Remove this comment to see the full error message
  async waitForNextBlockHeader() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroBlockHeader(await this._invokeWorker("daemonWaitForNextBlockHeader"));
  }

  // --------------------------- PRIVATE HELPERS ------------------------------

  // TODO: duplicated with MoneroWalletFullProxy
  async _invokeWorker(fnName: any, args: any) {
    return LibraryUtils.invokeWorker(this.daemonId, fnName, args);
  }
}

/**
 * Polls a Monero daemon for updates and notifies listeners as they occur.
 * 
 * @class
 * @ignore
 */
class DaemonPoller {
  _daemon: any;
  _isPolling: any;
  _lastHeader: any;
  _looper: any;

  constructor(daemon: any) {
    let that = this;
    this._daemon = daemon;
    this._looper = new TaskLooper(async function() { await that.poll(); });
  }

  setIsPolling(isPolling: any) {
    this._isPolling = isPolling;
    if (isPolling) this._looper.start(this._daemon.config.pollInterval);
    else this._looper.stop();
  }

  async poll() {
    try {
      
      // get latest block header
      let header = await this._daemon.getLastBlockHeader();
      
      // save first header for comparison
      if (!this._lastHeader) {
        this._lastHeader = await this._daemon.getLastBlockHeader();
        return;
      }
      
      // compare header to last
      if (header.getHash() !== this._lastHeader.getHash()) {
        this._lastHeader = header;
        for (let listener of this._daemon.getListeners()) {
          await listener.onBlockHeader(header); // notify listener
        }
      }
    } catch (err) {
      console.error("Failed to background poll daemon header");
      console.error(err);
    }
  }
}

/**
 * Internal listener to bridge notifications to external listeners.
 * 
 * @private
 */
class DaemonWorkerListener {
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

  async onBlockHeader(headerJson: any) {
    return this._listener.onBlockHeader(new MoneroBlockHeader(headerJson));
  }
}

export default MoneroDaemonRpc;
