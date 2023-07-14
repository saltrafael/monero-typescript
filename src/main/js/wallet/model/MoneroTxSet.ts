import assert from "assert";
import GenUtils from "../../common/GenUtils";
import MoneroTxWallet from "./MoneroTxWallet";
import MoneroUtils from "../../common/MoneroUtils";

/**
 * Groups transactions who share common hex data which is needed in order to
 * sign and submit the transactions.
 * 
 * For example, multisig transactions created from createTxs() share a common
 * hex string which is needed in order to sign and submit the multisig
 * transactions.
 */
class MoneroTxSet {
  state: any;

  constructor(state: any) {
    
    // initialize internal state
    if (!state) state = {};
    else if (typeof state === "object") state = Object.assign({}, state);
    // @ts-expect-error TS(2304): Cannot find name 'MoneroError'.
    else throw new MoneroError("state must be JavaScript object");
    this.state = state;
    
    // deserialize txs
    if (state.txs) {
      for (let i = 0; i < state.txs.length; i++) {
        if (!(state.txs[i] instanceof MoneroTxWallet)) state.txs[i] = new MoneroTxWallet(state.txs[i]);
        state.txs[i].setTxSet(this);
      }
    }
  }

  toJson() {
    let json = Object.assign({}, this.state); // copy state
    if (this.txs !== undefined) {
      json.txs = [];
      for (let tx of this.txs) json.txs.push(tx.toJson());
    }
    return json;
  }

  getTxs() {
    return this.state.txs;
  }

  setTxs(txs: any) {
    this.state.txs = txs;
    return this;
  }

  getMultisigTxHex() {
    return this.state.multisigTxHex;
  }

  setMultisigTxHex(multisigTxHex: any) {
    this.state.multisigTxHex = multisigTxHex;
    return this;
  }

  getUnsignedTxHex() {
    return this.state.unsignedTxHex;
  }

  setUnsignedTxHex(unsignedTxHex: any) {
    this.state.unsignedTxHex = unsignedTxHex;
    return this;
  }

  getSignedTxHex() {
    return this.state.signedTxHex;
  }

  setSignedTxHex(signedTxHex: any) {
    this.state.signedTxHex = signedTxHex;
    return this;
  }

  merge(txSet: any) {
    assert(txSet instanceof MoneroTxSet);
    if (this === txSet) return this;
    
    // merge sets
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setMultisigTxHex(GenUtils.reconcile(this.getMultisigTxHex(), txSet.getMultisigTxHex()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setUnsignedTxHex(GenUtils.reconcile(this.getUnsignedTxHex(), txSet.getUnsignedTxHex()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setSignedTxHex(GenUtils.reconcile(this.getSignedTxHex(), txSet.getSignedTxHex()));
    
    // merge txs
    if (txSet.txs !== undefined) {
      for (let tx of txSet.txs) {
        tx.setTxSet(this);
        MoneroUtils.mergeTx(this.txs, tx);
      }
    }

    return this;
  }

  toString(indent = 0) {
    let str = "";
    str += GenUtils.kvLine("Multisig tx hex: ", this.getMultisigTxHex(), indent);
    str += GenUtils.kvLine("Unsigned tx hex: ", this.getUnsignedTxHex(), indent);
    str += GenUtils.kvLine("Signed tx hex: ", this.getSignedTxHex(), indent);
    if (this.txs !== undefined) {
      str += GenUtils.kvLine("Txs", "", indent);
      for (let tx of this.txs) {
        str += tx.toString(indent + 1) + "\n";
      }
    }
    return str;
  }
}

export default MoneroTxSet;
