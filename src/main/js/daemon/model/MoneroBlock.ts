import assert from "assert";
import GenUtils from "../../common/GenUtils";
import MoneroBlockHeader from "./MoneroBlockHeader";
import MoneroTx from "./MoneroTx";
import MoneroTxQuery from "../../wallet/model/MoneroTxQuery";
import MoneroTxWallet from "../../wallet/model/MoneroTxWallet";

/**
 * Models a Monero block in the blockchain.
 *
 * @extends {MoneroBlockHeader}
 */
class MoneroBlock extends MoneroBlockHeader {
  static DeserializationType = { TX: 0, TX_WALLET: 1, TX_QUERY: 2 } as const;

  /**
   * Construct the model.
   *
   * @param {MoneroBlock|MoneroBlockHeader|object} state is existing state to initialize from (optional)
   * @param {MoneroBlock.DeserializationType} txType informs the tx deserialization type (MoneroTx, MoneroTxWallet, MoneroTxQuery)
   */
  constructor(
    state: MoneroBlock | MoneroBlockHeader | object,
    txType?: (typeof MoneroBlock.DeserializationType)[keyof typeof MoneroBlock.DeserializationType]
  ) {
    super(state);
    state = this.state;

    // deserialize miner tx
    if (
      "minerTx" in state &&
      state.minerTx &&
      !(state.minerTx instanceof MoneroTx)
    )
      state.minerTx = new MoneroTx(state.minerTx).setBlock(this);

    // deserialize non-miner txs
    if ("txs" in state && state.txs) {
      for (let i = 0; i < state.txs.length; i++) {
        if (
          txType === MoneroBlock.DeserializationType.TX ||
          txType === undefined
        ) {
          if (!(state.txs[i] instanceof MoneroTx))
            state.txs[i] = new MoneroTx(state.txs[i]).setBlock(this);
        } else if (txType === MoneroBlock.DeserializationType.TX_WALLET) {
          if (!(state.txs[i] instanceof MoneroTxWallet))
            state.txs[i] = new MoneroTxWallet(state.txs[i]).setBlock(this);
        } else if (txType === MoneroBlock.DeserializationType.TX_QUERY) {
          if (!(state.txs[i] instanceof MoneroTxQuery))
            state.txs[i] = new MoneroTxQuery(state.txs[i]).setBlock(this);
        } else {
          throw new Error("Unrecognized tx deserialization type: " + txType);
        }
      }
    }
  }

  get hex() {
    return this.state.hex;
  }

  set hex(hex) {
    this.state.hex = hex;
  }

  get minerTx() {
    return this.state.minerTx;
  }

  set minerTx(minerTx) {
    this.state.minerTx = minerTx;
  }

  get txs() {
    return this.state.txs;
  }

  set txs(txs) {
    this.state.txs = txs;
  }

  get txHashes() {
    return this.state.txHashes;
  }

  set txHashes(txHashes) {
    this.state.txHashes = txHashes;
  }

  copy() {
    return new MoneroBlock(this);
  }

  toJson() {
    const json = super.toJson();
    if (this.minerTx !== undefined) json.minerTx = this.minerTx.toJson();
    if (this.txs !== undefined) {
      json.txs = [];
      for (const tx of this.txs) json.txs.push(tx.toJson());
    }
    return json;
  }

  merge(block: any) {
    assert(block instanceof MoneroBlock);
    if (this === block) return this;

    // merge header fields
    super.merge(block);

    // merge reconcilable block extensions
    this.hex = GenUtils.reconcile(this.hex, block.hex);
    this.txHashes = GenUtils.reconcile(this.txHashes, block.txHashes);

    // merge miner tx
    if (this.minerTx === undefined) this.minerTx = block.minerTx;
    if (block.minerTx !== undefined) {
      block.minerTx.setBlock(this);
      this.minerTx.merge(block.minerTx);
    }

    // merge non-miner txs
    if (block.txs !== undefined) {
      for (const tx of block.txs) {
        tx.setBlock(this);
        MoneroBlock._mergeTx(this.txs, tx);
      }
    }

    return this;
  }

  toString(indent = 0) {
    let str = super.toString(indent) + "\n";
    str += GenUtils.kvLine("Hex", this.hex, indent);
    if (this.txs !== undefined) {
      str += GenUtils.kvLine("Txs", "", indent);
      for (const tx of this.txs) {
        str += tx.toString(indent + 1) + "\n";
      }
    }
    if (this.minerTx !== undefined) {
      str += GenUtils.kvLine("Miner tx", "", indent);
      str += this.minerTx.toString(indent + 1) + "\n";
    }
    str += GenUtils.kvLine("Txs hashes", this.txHashes, indent);
    return str[str.length - 1] === "\n" ? str.slice(0, str.length - 1) : str; // strip last newline
  }

  // private helper to merge txs
  static _mergeTx(txs: any, tx: any) {
    for (const aTx of txs) {
      if (aTx.getHash() === tx.getHash()) {
        aTx.merge(tx);
        return;
      }
    }
    txs.push(tx);
  }
}

export default MoneroBlock;
