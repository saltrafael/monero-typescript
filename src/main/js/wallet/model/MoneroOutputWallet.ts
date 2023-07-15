import assert from "assert";
import GenUtils from "../../common/GenUtils";
import MoneroOutput from "../../daemon/model/MoneroOutput";

/**
 * Models a Monero output with wallet extensions.
 * 
 * @class
 * @extends {MoneroOutput}
 */
class MoneroOutputWallet extends MoneroOutput {
  
  /**
   * Construct the model.
   * 
   * @param {MoneroOutputWallet|object} state is existing state to initialize from (optional)
   */
  constructor(state: any) {
    super(state);
  }
  
  getAccountIndex() {
    return this.state.accountIndex;
  }

  setAccountIndex(accountIndex: any) {
    this.state.accountIndex = accountIndex;
    return this;
  }

  getSubaddressIndex() {
    return this.state.subaddressIndex;
  }

  setSubaddressIndex(subaddressIndex: any) {
    this.state.subaddressIndex = subaddressIndex;
    return this;
  }
  
  isSpent() {
    return this.state.isSpent;
  }

  setIsSpent(isSpent: any) {
    this.state.isSpent = isSpent;
    return this;
  }
  
  /**
   * Indicates if this output has been deemed 'malicious' and will therefore
   * not be spent by the wallet.
   * 
   * @return Boolean is whether or not this output is frozen
   */
  isFrozen() {
    return this.state.isFrozen;
  }

  setIsFrozen(isFrozen: any) {
    this.state.isFrozen = isFrozen;
    return this;
  }
  
  isLocked() {
    if (this.getTx() === undefined) return undefined;
    return this.getTx().isLocked();
  }
  
  // @ts-expect-error TS(2416): Property 'copy' in type 'MoneroOutputWallet' is no... Remove this comment to see the full error message
  copy() {
    return new MoneroOutputWallet(this.toJson());
  }
  
  toJson() {
    let json = Object.assign({}, this.state, super.toJson());
    delete json.tx;
    return json;
  }
  
  /**
   * Updates this output by merging the latest information from the given
   * output.
   * 
   * Merging can modify or build references to the output given so it
   * should not be re-used or it should be copied before calling this method.
   * 
   * @param output is the output to merge into this one
   */
  // @ts-expect-error TS(2416): Property 'merge' in type 'MoneroOutputWallet' is n... Remove this comment to see the full error message
  merge(output: any) {
    assert(output instanceof MoneroOutputWallet);
    if (this === output) return;
    super.merge(output);
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setAccountIndex(GenUtils.reconcile(this.getAccountIndex(), output.getAccountIndex()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setSubaddressIndex(GenUtils.reconcile(this.getSubaddressIndex(), output.getSubaddressIndex()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 3.
    this.setIsSpent(GenUtils.reconcile(this.isSpent(), output.isSpent(), {resolveTrue: true})); // output can become spent
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setIsFrozen(GenUtils.reconcile(this.isFrozen(), output.isFrozen()));
    return this;
  }
  
  toString(indent: any) {
    let str = super.toString(indent) + "\n"
    str += GenUtils.kvLine("Account index", this.getAccountIndex(), indent);
    str += GenUtils.kvLine("Subaddress index", this.getSubaddressIndex(), indent);
    str += GenUtils.kvLine("Is spent", this.isSpent(), indent);
    str += GenUtils.kvLine("Is frozen", this.isFrozen(), indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

export default MoneroOutputWallet;
