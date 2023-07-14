import MoneroError from "./MoneroError";

/**
 * Error when interacting with Monero RPC.
 */
class MoneroRpcError extends MoneroError {
  _rpcMethod: undefined | string;
  _rpcParams: undefined | object;

  /**
   * Constructs the error.
   *
   * @param {string} rpcDescription is a description of the error from rpc
   * @param {number} rpcCode is the error code from rpc
   * @param {string} rpcMethod is the rpc method invoked
   * @param {object} rpcParams are parameters sent with the rpc request
   */
  constructor(
    rpcDescription: string,
    rpcCode: number,
    rpcMethod: undefined | string,
    rpcParams: undefined | object
  ) {
    super(rpcDescription, rpcCode);
    this._rpcMethod = rpcMethod;
    this._rpcParams = rpcParams;
  }

  get rpcMethod() {
    return this._rpcMethod;
  }

  get rpcParams() {
    return this._rpcParams;
  }

  toString() {
    let str = super.toString();
    if (this.rpcMethod || this.rpcParams)
      str +=
        "\nRequest: '" +
        this.rpcMethod +
        "' with params: " +
        (typeof this.rpcParams === "object"
          ? JSON.stringify(this.rpcParams)
          : this.rpcParams);
    return str;
  }
}

export default MoneroRpcError;
