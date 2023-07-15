import assert from "assert";
import GenUtils from "../../common/GenUtils";

/**
 * Models a Monero key image.
 */
class MoneroKeyImage {
  state: any;

  /**
   * Construct the model.
   *
   * @param {MoneroKeyImage|object|string} stateOrHex is a MoneroKeyImage, JS object, or hex string to initialize from (optional)
   * @param {string} signature is the key image's signature
   */
  constructor(
    stateOrHex?: MoneroKeyImage | object | string,
    signature?: string
  ) {
    if (!stateOrHex) this.state = {};
    else if (stateOrHex instanceof MoneroKeyImage)
      this.state = stateOrHex.toJson();
    else if (typeof stateOrHex === "object")
      this.state = Object.assign({}, stateOrHex);
    else if (typeof stateOrHex === "string") {
      this.state = {};
      this.setHex(stateOrHex);
      this.setSignature(signature);
    } else {
      // @ts-expect-error TS(2304): Cannot find name 'MoneroError'.
      throw new MoneroError(
        "stateOrHex must be a MoneroKeyImage, JavaScript object, or string"
      );
    }
  }

  getHex() {
    return this.state.hex;
  }

  setHex(hex: any) {
    this.state.hex = hex;
    return this;
  }

  getSignature() {
    return this.state.signature;
  }

  setSignature(signature: any) {
    this.state.signature = signature;
    return this;
  }

  copy() {
    // @ts-expect-error TS(2554): Expected 2 arguments, but got 1.
    return new MoneroKeyImage(this);
  }

  toJson() {
    return Object.assign({}, this.state);
  }

  merge(keyImage: any) {
    assert(keyImage instanceof MoneroKeyImage);
    if (keyImage === this) return this;
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setHex(GenUtils.reconcile(this.hex, keyImage.hex));
    // @ts-expect-error TS(2554): Expected 4 arguments, but got 2.
    this.setSignature(
      GenUtils.reconcile(this.getSignature(), keyImage.getSignature())
    );
    return this;
  }

  toString(indent = 0) {
    let str = "";
    str += GenUtils.kvLine("Hex", this.hex, indent);
    str += GenUtils.kvLine("Signature", this.getSignature(), indent);
    return str.slice(0, str.length - 1); // strip last newline
  }
}

export default MoneroKeyImage;
