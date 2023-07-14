import GenUtils from "../../common/GenUtils";
import MoneroError from "../../common/MoneroError";

/**
 * Models an outgoing transfer destination.
 */
class MoneroDestination {
  state: any;

  /**
   * Construct the model.
   * 
   * @param {MoneroDestination|object|string} stateOrAddress is a MoneroDestination, JS object, or hex string to initialize from (optional)
   * @param {BigInt|string} amount - the destination amount
   */
  constructor(stateOrAddress: any, amount: any) {
    if (!stateOrAddress) this.state = {};
    else if (stateOrAddress instanceof MoneroDestination) this.state = stateOrAddress.toJson();
    else if (typeof stateOrAddress === "object") {
      this.state = Object.assign({}, stateOrAddress);
      if (typeof this.state.amount === "number") this.state.amount = BigInt(this.state.amount);
    } else if (typeof stateOrAddress === "string")  {
      this.state = {};
      this.setAddress(stateOrAddress);
    }
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    else throw new MoneroError("stateOrAddress must be a MoneroDestination, JavaScript object, or hex string");
    if (amount) this.state.amount = amount;
    this.setAmount(this.state.amount);
  }

  getAddress() {
    return this.state.address;
  }

  setAddress(address: any) {
    this.state.address = address;
    return this;
  }

  getAmount() {
    return this.state.amount;
  }

  setAmount(amount: any) {
    if (amount !== undefined && !(this.state.amount instanceof BigInt)) {
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      if (typeof amount === "number") throw new MoneroError("Destination amount must be BigInt or string");
      try { amount = BigInt(amount); }
      // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
      catch (err) { throw new MoneroError("Invalid destination amount: " + amount); }
    }
    this.state.amount = amount;
    return this;
  }

  copy() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroDestination(this);
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getAmount() !== undefined) json.amount = this.getAmount().toString();
    return json;
  }

  toString(indent = 0) {
    let str = GenUtils.kvLine("Address", this.getAddress(), indent);
    str += GenUtils.kvLine("Amount", this.getAmount() ? this.getAmount().toString() : undefined, indent);
    return str.slice(0, str.length - 1);  // strip last newline
  }
}

export default MoneroDestination;
