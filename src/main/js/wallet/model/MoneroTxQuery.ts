import assert from "assert";
import MoneroOutputQuery from "./MoneroOutputQuery";
import MoneroTransferQuery from "./MoneroTransferQuery";
import MoneroTxWallet from "./MoneroTxWallet";
import Filter from "../../common/Filter";

/**
 * <p>Configuration to query transactions.</p>
 * 
 * @class
 * @extends {MoneroTxWallet}
 */
class MoneroTxQuery extends MoneroTxWallet implements Filter {
  
  /**
   * <p>Construct the transaction query.</p>
   * 
   * <p>Example:</p>
   * 
   * <code>
   * &sol;&sol; get transactions with unlocked incoming transfers to account 0<br>
   * let txs = await wallet.getTxs({<br>
   * &nbsp;&nbsp; isLocked: false,<br>
   * &nbsp;&nbsp; transferQuery: {<br>
   * &nbsp;&nbsp;&nbsp;&nbsp; isIncoming: true,<br>
   * &nbsp;&nbsp;&nbsp;&nbsp; accountIndex: 0<br>
   * &nbsp;&nbsp; }<br>
   * });
   * </code>
   * 
   * <p>All configuration is optional.  All transactions are returned except those that don't meet criteria defined in this query.</p>
   * 
   * @param {object} config - tx query configuration
   * @param {string} config.hash - get a tx with this hash
   * @param {string[]} config.txHashes - get txs with these hashes
   * @param {number} config.height - get txs with this height
   * @param {number} config.minHeight - get txs with height greater than or equal to this height
   * @param {number} config.maxHeight - get txs with height less than or equal to this height
   * @param {boolean} config.isConfirmed - get confirmed or unconfirmed txs
   * @param {boolean} config.inTxPool - get txs in or out of the tx pool
   * @param {boolean} config.relay - get txs with the same relay status
   * @param {boolean} config.isRelayed - get relayed or non-relayed txs
   * @param {boolean} config.isFailed - get failed or non-failed txs
   * @param {boolean} config.isMinerTx - get miner or non-miner txs
   * @param {boolean} config.isLocked - get locked or unlocked txs
   * @param {boolean} config.isIncoming - get txs with or without incoming transfers
   * @param {boolean} config.isOutgoing - get txs with or without outgoing transfers
   * @param {string} config.paymentId - get txs with this payment ID
   * @param {string} config.paymentIds - get txs with a payment ID among these payment IDs
   * @param {boolean} config.hasPaymentId - get txs with or without payment IDs
   * @param {object|MoneroTransferQuery} config.transferQuery - get txs with transfers matching this transfer query
   * @param {object|MoneroOutputQuery} config.inputQuery - get txs with inputs matching this input query
   * @param {object|MoneroOutputQuery} config.outputQuery - get txs with outputs matching this output query
   */
  constructor(config: any) {
    super(config);
    
    // deserialize if necessary
    if (this.state.transferQuery && !(this.state.transferQuery instanceof MoneroTransferQuery)) this.state.transferQuery = new MoneroTransferQuery(this.state.transferQuery);
    if (this.state.inputQuery && !(this.state.inputQuery instanceof MoneroOutputQuery)) this.state.inputQuery = new MoneroOutputQuery(this.state.inputQuery);
    if (this.state.outputQuery && !(this.state.outputQuery instanceof MoneroOutputQuery)) this.state.outputQuery = new MoneroOutputQuery(this.state.outputQuery);
    
    // link cycles
    if (this.state.transferQuery) this.state.transferQuery.setTxQuery(this);
    if (this.state.inputQuery) this.state.inputQuery.setTxQuery(this);
    if (this.state.outputQuery) this.state.outputQuery.setTxQuery(this);
    
    // alias 'hash' to hashes
    if (this.state.hash) {
      this.setHashes([this.state.hash]);
      delete this.state.hash;
    }
  }
  
  copy() {
    return new MoneroTxQuery(this);
  }
  
  toJson() {
    let json = Object.assign({}, this.state, super.toJson()); // merge json onto inherited state
    if (this.getTransferQuery() !== undefined) json.transferQuery = this.getTransferQuery().toJson();
    if (this.getInputQuery() !== undefined) json.inputQuery = this.getInputQuery().toJson();
    if (this.getOutputQuery() !== undefined) json.outputQuery = this.getOutputQuery().toJson();
    delete json.block;  // do not serialize parent block
    return json;
  }
  
  isIncoming() {
    return this.state.isIncoming;
  }
  
  setIsIncoming(isIncoming: any) {
    this.state.isIncoming = isIncoming;
    return this;
  }
  
  isOutgoing() {
    return this.state.isOutgoing;
  }
  
  setIsOutgoing(isOutgoing: any) {
    this.state.isOutgoing = isOutgoing;
    return this;
  }

  getHashes() {
    return this.state.hashes;
  }

  setHashes(hashes: any) {
    this.state.hashes = hashes;
    return this;
  }
  
  setHash(hash: any) {
    if (hash === undefined) return this.setHashes(undefined);
    assert(typeof hash === "string");
    return this.setHashes([hash]);
  }
  
  hasPaymentId() {
    return this.state.hasPaymentId;
  }
  
  setHasPaymentId() {
    // @ts-expect-error TS(2663): Cannot find name 'hasPaymentId'. Did you mean the ... Remove this comment to see the full error message
    this.state.hasPaymentId = hasPaymentId;
    return this;
  }
  
  getPaymentIds() {
    return this.state.paymentIds;
  }

  setPaymentIds(paymentIds: any) {
    this.state.paymentIds = paymentIds;
    return this;
  }
  
  setPaymentId(paymentId: any) {
    if (paymentId === undefined) return this.setPaymentIds(undefined);
    assert(typeof paymentId === "string");
    return this.setPaymentIds([paymentId]);
  }
  
  getHeight() {
    return this.state.height;
  }
  
  setHeight(height: any) {
    this.state.height = height;
    return this;
  }
  
  getMinHeight() {
    return this.state.minHeight;
  }

  setMinHeight(minHeight: any) {
    this.state.minHeight = minHeight;
    return this;
  }

  getMaxHeight() {
    return this.state.maxHeight;
  }

  setMaxHeight(maxHeight: any) {
    this.state.maxHeight = maxHeight;
    return this;
  }
  
  getIncludeOutputs() {
    return this.state.includeOutputs;
  }

  setIncludeOutputs(includeOutputs: any) {
    this.state.includeOutputs = includeOutputs;
    return this;
  }
  
  getTransferQuery() {
    return this.state.transferQuery;
  }
  
  setTransferQuery(transferQuery: any) {
    this.state.transferQuery = transferQuery;
    if (transferQuery) transferQuery.state.txQuery = this;
    return this;
  }
  
  getInputQuery() {
    return this.state.inputQuery;
  }
  
  setInputQuery(inputQuery: any) {
    this.state.inputQuery = inputQuery;
    if (inputQuery) inputQuery.state.txQuery = this;
    return this;
  }
  
  getOutputQuery() {
    return this.state.outputQuery;
  }
  
  setOutputQuery(outputQuery: any) {
    this.state.outputQuery = outputQuery;
    if (outputQuery) outputQuery.state.txQuery = this;
    return this;
  }
  
  meetsCriteria(tx: any, queryChildren: any) {
    if (!(tx instanceof MoneroTxWallet)) throw new Error("Tx not given to MoneroTxQuery.meetsCriteria(tx)");
    if (queryChildren === undefined) queryChildren = true;
    
    // filter on tx
    if (this.getHash() !== undefined && this.getHash() !== tx.getHash()) return false;
    if (this.getPaymentId() !== undefined && this.getPaymentId() !== tx.getPaymentId()) return false;
    if (this.isConfirmed() !== undefined && this.isConfirmed() !== tx.isConfirmed()) return false;
    if (this.inTxPool() !== undefined && this.inTxPool() !== tx.inTxPool()) return false;
    if (this.getRelay() !== undefined && this.getRelay() !== tx.getRelay()) return false;
    if (this.isRelayed() !== undefined && this.isRelayed() !== tx.isRelayed()) return false;
    if (this.isFailed() !== undefined && this.isFailed() !== tx.isFailed()) return false;
    if (this.isMinerTx() !== undefined && this.isMinerTx() !== tx.isMinerTx()) return false;
    if (this.isLocked() !== undefined && this.isLocked() !== tx.isLocked()) return false;
    
    // filter on having a payment id
    if (this.hasPaymentId() !== undefined) {
      if (this.hasPaymentId() && tx.getPaymentId() === undefined) return false;
      if (!this.hasPaymentId() && tx.getPaymentId() !== undefined) return false;
    }
    
    // filter on incoming
    if (this.isIncoming() !== undefined) {
      if (this.isIncoming() && !tx.isIncoming()) return false;
      if (!this.isIncoming() && tx.isIncoming()) return false;
    }
    
    // filter on outgoing
    if (this.isOutgoing() !== undefined) {
      if (this.isOutgoing() && !tx.isOutgoing()) return false;
      if (!this.isOutgoing() && tx.isOutgoing()) return false;
    }
    
    // filter on remaining fields
    let txHeight = tx.getBlock() === undefined ? undefined : tx.getBlock().getHeight();
    if (this.getHashes() !== undefined && !this.getHashes().includes(tx.getHash())) return false;
    if (this.getPaymentIds() !== undefined && !this.getPaymentIds().includes(tx.getPaymentId())) return false;
    if (this.getHeight() !== undefined && (txHeight === undefined || txHeight !== this.getHeight())) return false;
    if (this.getMinHeight() !== undefined && txHeight !== undefined && txHeight < this.getMinHeight()) return false; // do not filter unconfirmed
    if (this.getMaxHeight() !== undefined && (txHeight === undefined || txHeight > this.getMaxHeight())) return false;
    // TODO: filtering not complete
    
    // done if not querying transfers or outputs
    if (!queryChildren) return true;
    
    // at least one transfer must meet transfer filter if defined
    if (this.getTransferQuery() !== undefined) {
      let matchFound = false;
      if (tx.getOutgoingTransfer() && this.getTransferQuery().meetsCriteria(tx.getOutgoingTransfer(), false)) matchFound = true;
      else if (tx.getIncomingTransfers()) {
        for (let incomingTransfer of tx.getIncomingTransfers()) {
          if (this.getTransferQuery().meetsCriteria(incomingTransfer, false)) {
            matchFound = true;
            break;
          }
        }
      }
      if (!matchFound) return false;
    }
    
    // at least one input must meet input query if defined
    if (this.getInputQuery() !== undefined) {
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      if (tx.getInputs() === undefined || tx.getInputs().length === 0) return false;
      let matchFound = false;
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      for (let input of tx.getInputs()) {
        if (this.getInputQuery().meetsCriteria(input, false)) {
          matchFound = true;
          break;
        }
      }
      if (!matchFound) return false;
    }
    
    // at least one output must meet output query if defined
    if (this.getOutputQuery() !== undefined) {
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      if (tx.getOutputs() === undefined || tx.getOutputs().length === 0) return false;
      let matchFound = false;
      // @ts-expect-error TS(2554): Expected 1 arguments, but got 0.
      for (let output of tx.getOutputs()) {
        if (this.getOutputQuery().meetsCriteria(output, false)) {
          matchFound = true;
          break;
        }
      }
      if (!matchFound) return false;
    }
    
    return true;  // transaction meets filter criteria
  }
}

export default MoneroTxQuery;
