import assert from "assert";
import GenUtils from "../../common/GenUtils";
import MoneroKeyImage from "./MoneroKeyImage";

/**
 * Models a Monero transaction output.
 * 
 * @class
 */
class MoneroOutput {
  state: any;

  /**
   * Construct the model.
   * 
   * @param {MoneroOutput|object} state is existing state to initialize from (optional)
   */
  constructor(state: any) {
    
    // initialize internal state
    if (!state) state = {};
    else if (state instanceof MoneroOutput) state = state.toJson();
    else if (typeof state === "object") state = Object.assign({}, state);
    // @ts-expect-error TS(2304): Cannot find name 'MoneroError'.
    else throw new MoneroError("state must be a MoneroOutput or JavaScript object");
    this.state = state;
    
    // deserialize fields if necessary
    if (state.amount !== undefined && !(state.amount instanceof BigInt)) state.amount = BigInt(state.amount);
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (state.keyImage && !(state.keyImage instanceof MoneroKeyImage)) state.keyImage = new MoneroKeyImage(state.keyImage);
  }

  getTx() {
    return this.state.tx;
  }

  setTx(tx: any) {
    this.state.tx = tx;
    return this;
  }

  getKeyImage() {
    return this.state.keyImage;
  }

  setKeyImage(keyImage: any) {
    assert(keyImage === undefined || keyImage instanceof MoneroKeyImage);
    this.state.keyImage = keyImage;
    return this;
  }

  getAmount() {
    return this.state.amount;
  }

  setAmount(amount: any) {
    this.state.amount = amount;
    return this;
  }

  getIndex() {
    return this.state.index;
  }

  setIndex(index: any) {
    this.state.index = index;
    return this;
  }

  getRingOutputIndices() {
    return this.state.ringOutputIndices;
  }

  setRingOutputIndices(ringOutputIndices: any) {
    this.state.ringOutputIndices = ringOutputIndices;
    return this;
  }

  getStealthPublicKey() {
    return this.state.stealthPublicKey;
  }

  setStealthPublicKey(stealthPublicKey: any) {
    this.state.stealthPublicKey = stealthPublicKey;
    return this;
  }

  copy() {
    return new MoneroOutput(this);
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getAmount() !== undefined) json.amount = this.getAmount() ? this.getAmount().toString() : undefined;
    if (this.getKeyImage() !== undefined) json.keyImage = this.getKeyImage() ? this.getKeyImage().toJson() : undefined;
    delete json.tx;
    return json;
  }

  merge(output: any) {
    assert(output instanceof MoneroOutput);
    if (this === output) return this;
    
    // merge txs if they're different which comes back to merging outputs
    if (this.getTx() !== output.getTx()) this.getTx().merge(output.getTx());
    
    // otherwise merge output fields
    else {
      if (this.getKeyImage() === undefined) this.setKeyImage(output.getKeyImage());
      else if (output.getKeyImage() !== undefined) this.getKeyImage().merge(output.getKeyImage());
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      this.setAmount(GenUtils.reconcile(this.getAmount(), output.getAmount()));
      // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
      this.setIndex(GenUtils.reconcile(this.getIndex(), output.getIndex()));
    }

    return this;
  }

  toString(indent = 0) {
    let str = "";
    if (this.getKeyImage() !== undefined) {
      str += GenUtils.kvLine("Key image", "", indent);
      str += this.getKeyImage().toString(indent + 1) + "\n";
    }
    str += GenUtils.kvLine("Amount", this.getAmount(), indent);
    str += GenUtils.kvLine("Index", this.getIndex(), indent);
    str += GenUtils.kvLine("Ring output indices", this.getRingOutputIndices(), indent);
    str += GenUtils.kvLine("Stealth public key", this.getStealthPublicKey(), indent);
    return str === "" ? str : str.slice(0, str.length - 1);  // strip last newline
  }
}

export default MoneroOutput;
