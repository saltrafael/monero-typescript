import assert from "assert";
import MoneroDestination from "./MoneroDestination";
import MoneroError from "../../common/MoneroError";

/**
 * Configures a transaction to send, sweep, or create a payment URI.
 */
class MoneroTxConfig {
  state: any;

  /**
   * <p>Generic request to transfer funds from a wallet.</p>
   * 
   * <p>Examples:</p>
   * 
   * <code>
   * let config1 = new MoneroTxConfig({<br>
   * &nbsp;&nbsp; accountIndex: 0,<br>
   * &nbsp;&nbsp; address: "59aZULsUF3YN...",<br>
   * &nbsp;&nbsp; amount: BigInt("500000"),<br>
   * &nbsp;&nbsp; priority: MoneroTxPriority.NORMAL,<br>
   * &nbsp;&nbsp; relay: true<br>
   * });<br><br>
   * </code>
   * 
   * @param {MoneroTxConfig|object} [config] - configures the transaction to create (optional)
   * @param {string} config.address - single destination address
   * @param {BigInt} config.amount - single destination amount
   * @param {number} config.accountIndex - source account index to transfer funds from
   * @param {number} config.subaddressIndex - source subaddress index to transfer funds from
   * @param {int[]} config.subaddressIndices - source subaddress indices to transfer funds from
   * @param {boolean} config.relay - relay the transaction to peers to commit to the blockchain
   * @param {MoneroTxPriority} [config.priority] - transaction priority (default MoneroTxPriority.NORMAL)
   * @param {MoneroDestination[]} config.destinations - addresses and amounts in a multi-destination tx
   * @param {string} config.paymentId - transaction payment ID
   * @param {number} [config.unlockHeight] - minimum height for the transaction to unlock (default 0)
   * @param {string} config.note - transaction note saved locally with the wallet
   * @param {string} config.recipientName - recipient name saved locally with the wallet
   * @param {boolean} config.canSplit - allow funds to be transferred using multiple transactions
   * @param {BigInt} config.belowAmount - for sweep requests, include outputs below this amount when sweeping wallet, account, subaddress, or all unlocked funds 
   * @param {boolean} config.sweepEachSubaddress - for sweep requests, sweep each subaddress individually instead of together if true
   * @param {string} config.keyImage - key image to sweep (ignored except in sweepOutput() requests)
   */
  constructor(config: any, relaxValidation: any) {  // relax validation for internal use to process json from rpc or cpp
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (arguments.length > 2) throw new MoneroError("MoneroTxConfig can be constructed with only two parameters but was given " + arguments.length)
    
    // initialize internal state
    if (!config) this.state = {};
    else if (config instanceof MoneroTxConfig) this.state = config.toJson();
    else if (typeof config === "object") {
      this.state = Object.assign({}, config);
      if (relaxValidation && typeof this.state.amount === "number") this.state.amount = BigInt(this.state.amount);
    }
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    else throw new MoneroError("Invalid argument given to MoneroTxConfig: " + typeof config);
    
    // deserialize if necessary
    if (this.state.destinations) {
      assert(this.state.address === undefined && this.state.amount === undefined, "Tx configuration may specify destinations or an address/amount but not both");
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      this.setDestinations(this.state.destinations.map((destination: any) => destination instanceof MoneroDestination ? destination : new MoneroDestination(destination)));
    }
    
    // alias 'address' and 'amount' to single destination to support e.g. createTx({address: "..."})
    if (this.state.address || this.state.amount) {
      assert(!this.state.destinations, "Tx configuration may specify destinations or an address/amount but not both");
      this.setAddress(this.state.address);
      this.setAmount(this.state.amount);
      delete this.state.address;
      delete this.state.amount;
    }
    
    // alias 'subaddressIndex' to subaddress indices
    if (this.state.subaddressIndex !== undefined) {
      this.setSubaddressIndices([this.state.subaddressIndex]);
      delete this.state.subaddressIndex;
    }
  }

  copy() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroTxConfig(this);
  }

  toJson() {
    let json = Object.assign({}, this.state); // copy state
    if (this.getDestinations() !== undefined) {
      json.destinations = [];
      for (let destination of this.getDestinations()) json.destinations.push(destination.toJson());
    }
    if (this.getFee() !== undefined) json.fee = this.getFee().toString();
    if (this.getBelowAmount() !== undefined) json.belowAmount = this.getBelowAmount().toString();
    return json;
  }

  /**
   * Set the address of a single-destination configuration.
   * 
   * @param {string} address - the address to set for the single destination
   * @return {MoneroTxConfig} this configuration for chaining
   */
  setAddress(address: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.state.destinations !== undefined && this.state.destinations.length > 1) throw new MoneroError("Cannot set address because MoneroTxConfig already has multiple destinations");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.state.destinations === undefined || this.state.destinations.length === 0) this.addDestination(new MoneroDestination(address));
    else this.state.destinations[0].setAddress(address);
    return this;
  }

  /**
   * Get the address of a single-destination configuration.
   * 
   * @return {string} the address of the single destination
   */
  getAddress() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.state.destinations === undefined || this.state.destinations.length !== 1) throw new MoneroError("Cannot get address because MoneroTxConfig does not have exactly one destination");
    return this.state.destinations[0].getAddress();
  }

  /**
   * Set the amount of a single-destination configuration.
   * 
   * @param {BigInt|string} amount - the amount to set for the single destination
   * @return {MoneroTxConfig} this configuration for chaining
   */
  setAmount(amount: any) {
    if (amount !== undefined && !(this.state.amount instanceof BigInt)) {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (typeof amount === "number") throw new MoneroError("Destination amount must be BigInt or string");
      try { amount = BigInt(amount); }
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      catch (err) { throw new MoneroError("Invalid destination amount: " + amount); }
    }
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.state.destinations !== undefined && this.state.destinations.length > 1) throw new MoneroError("Cannot set amount because MoneroTxConfig already has multiple destinations");
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.state.destinations === undefined || this.state.destinations.length === 0) this.addDestination(new MoneroDestination(undefined, amount));
    else this.state.destinations[0].setAmount(amount);
    return this;
  }

  /**
   * Get the amount of a single-destination configuration.
   * 
   * @return {BigInt} the amount of the single destination
   */
  getAmount() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (this.state.destinations === undefined || this.state.destinations.length !== 1) throw new MoneroError("Cannot get amount because MoneroTxConfig does not have exactly one destination");
    return this.state.destinations[0].getAmount();
  }

  // @ts-expect-error TS(7023): 'addDestination' implicitly has return type 'any' ... Remove this comment to see the full error message
  addDestination(destinationOrAddress: any, amount: any) {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    if (typeof destinationOrAddress === "string") return this.addDestination(new MoneroDestination(destinationOrAddress, amount));
    assert(destinationOrAddress instanceof MoneroDestination);
    if (this.state.destinations === undefined) this.state.destinations = [];
    this.state.destinations.push(destinationOrAddress);
    return this;
  }

  getDestinations() {
    return this.state.destinations;
  }

  setDestinations(destinations: any) {
    if (arguments.length > 1) destinations = Array.from(arguments);
    this.state.destinations = destinations;
    return this;
  }

  setDestination(destination: any) {
    return this.setDestinations(destination ? [destination] : destination);
  }

  getPaymentId() {
    return this.state.paymentId;
  }

  setPaymentId(paymentId: any) {
    this.state.paymentId = paymentId;
    return this;
  }

  getPriority() {
    return this.state.priority;
  }

  setPriority(priority: any) {
    this.state.priority = priority;
    return this;
  }

  getFee() {
    return this.state.fee;
  }

  setFee(fee: any) {
    this.state.fee = fee;
    return this;
  }

  getAccountIndex() {
    return this.state.accountIndex;
  }

  setAccountIndex(accountIndex: any) {
    this.state.accountIndex = accountIndex;
    return this;
  }

  setSubaddressIndex(subaddressIndex: any) {
    this.setSubaddressIndices([subaddressIndex]);
    return this;
  }

  getSubaddressIndices() {
    return this.state.subaddressIndices;
  }

  setSubaddressIndices(subaddressIndices: any) {
    if (arguments.length > 1) subaddressIndices = Array.from(arguments);
    this.state.subaddressIndices = subaddressIndices;
    return this;
  }

  getUnlockHeight() {
    return this.state.unlockHeight;
  }

  setUnlockHeight(unlockHeight: any) {
    this.state.unlockHeight = unlockHeight;
    return this;
  }

  getRelay() {
    return this.state.relay;
  }

  setRelay(relay: any) {
    this.state.relay = relay;
    return this;
  }

  getCanSplit() {
    return this.state.canSplit;
  }

  setCanSplit(canSplit: any) {
    this.state.canSplit = canSplit;
    return this;
  }

  getNote() {
    return this.state.note;
  }

  setNote(note: any) {
    this.state.note = note;
    return this;
  }

  getRecipientName() {
    return this.state.recipientName;
  }

  setRecipientName(recipientName: any) {
    this.state.recipientName = recipientName;
    return this;
  }

  // --------------------------- SPECIFIC TO SWEEP ----------------------------

  getBelowAmount() {
    return this.state.belowAmount;
  }

  setBelowAmount(belowAmount: any) {
    this.state.belowAmount = belowAmount;
    return this;
  }

  getSweepEachSubaddress() {
    return this.state.sweepEachSubaddress;
  }

  setSweepEachSubaddress(sweepEachSubaddress: any) {
    this.state.sweepEachSubaddress = sweepEachSubaddress;
    return this;
  }

  /**
   * Get the key image hex of the output to sweep.
   * 
   * return {string} is the key image hex of the output to sweep
   */
  getKeyImage() {
    return this.state.keyImage;
  }

  /**
   * Set the key image hex of the output to sweep.
   * 
   * @param {string} keyImage is the key image hex of the output to sweep
   */
  setKeyImage(keyImage: any) {
    this.state.keyImage = keyImage;
    return this;
  }
}

export default MoneroTxConfig
