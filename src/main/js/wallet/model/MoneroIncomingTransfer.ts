import assert from "assert";
import GenUtils from "../../common/GenUtils";
import MoneroTransfer from "./MoneroTransfer";

/**
 * Models an incoming transfer of funds to the wallet.
 * 
 * @extends {MoneroTransfer}
 */
class MoneroIncomingTransfer extends MoneroTransfer {
  state: any;

  /**
   * Construct the model.
   * 
   * @param {MoneroTransfer|object} state is existing state to initialize from (optional)
   */
  constructor(state: any) {
    super(state);
  }

  isIncoming() {
    return true;
  }

  getSubaddressIndex() {
    return this.state.subaddressIndex;
  }

  setSubaddressIndex(subaddressIndex: any) {
    this.state.subaddressIndex = subaddressIndex;
    return this;
  }

  getAddress() {
    return this.state.address;
  }

  setAddress(address: any) {
    this.state.address = address;
    return this;
  }

  /**
   * Return how many confirmations till it's not economically worth re-writing the chain.
   * That is, the number of confirmations before the transaction is highly unlikely to be
   * double spent or overwritten and may be considered settled, e.g. for a merchant to trust
   * as finalized.
   * 
   * @return {number} is the number of confirmations before it's not worth rewriting the chain
   */
  getNumSuggestedConfirmations() {
    return this.state.numSuggestedConfirmations;
  }

  setNumSuggestedConfirmations(numSuggestedConfirmations: any) {
    this.state.numSuggestedConfirmations = numSuggestedConfirmations;
    return this;
  }

  copy() {
    return new MoneroIncomingTransfer(this.toJson());
  }

  /**
   * Updates this transaction by merging the latest information from the given
   * transaction.
   * 
   * Merging can modify or build references to the transfer given so it
   * should not be re-used or it should be copied before calling this method.
   * 
   * @param {MoneroIncomingTransfer} transfer is the transfer to merge into this one
   */
  merge(transfer: any) {
    super.merge(transfer);
    assert(transfer instanceof MoneroIncomingTransfer);
    if (this === transfer) return this;
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setSubaddressIndex(GenUtils.reconcile(this.getSubaddressIndex(), transfer.getSubaddressIndex()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setAddress(GenUtils.reconcile(this.getAddress(), transfer.getAddress()));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 3.
    this.setNumSuggestedConfirmations(GenUtils.reconcile(this.getNumSuggestedConfirmations(), transfer.getNumSuggestedConfirmations(), {resolveMax: false}));
    return this;
  }

  // @ts-expect-error TS(2393): Duplicate function implementation.
  toString() {
    // @ts-expect-error TS(2554): Expected 0 arguments, but got 1.
    return this.toString(0);
  }

  // @ts-expect-error TS(2393): Duplicate function implementation.
  toString(indent: any) {
    let str = super.toString(indent) + "\n";
    str += GenUtils.kvLine("Subaddress index", this.getSubaddressIndex(), indent);
    str += GenUtils.kvLine("Address", this.getAddress(), indent);
    str += GenUtils.kvLine("Num suggested confirmations", this.getNumSuggestedConfirmations(), indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

export default MoneroIncomingTransfer;
