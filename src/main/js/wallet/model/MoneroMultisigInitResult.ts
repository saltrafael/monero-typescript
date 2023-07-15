/**
 * Models the result of initializing a multisig wallet which results in the
 * multisig wallet's address xor another multisig hex to share with
 * participants to create the wallet.
 */
class MoneroMultisigInitResult {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
  }

  toJson() {
    return Object.assign({}, this.state);
  }

  getAddress() {
    return this.state.address;
  }

  setAddress(address: any) {
    this.state.address = address;
    return this;
  }

  getMultisigHex() {
    return this.state.multisigHex;
  }

  setMultisigHex(multisigHex: any) {
    this.state.multisigHex = multisigHex;
    return this;
  }
}

export default MoneroMultisigInitResult;
