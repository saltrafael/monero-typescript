/**
 * Models the result of signing multisig tx hex.
 */
class MoneroMultisigSignResult {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
  }

  toJson() {
    return Object.assign({}, this.state);
  }

  getSignedMultisigTxHex() {
    return this.state.signedMultisigTxHex;
  }

  setSignedMultisigTxHex(signedTxMultisigHex: any) {
    this.state.signedMultisigTxHex = signedTxMultisigHex;
  }

  getTxHashes() {
    return this.state.txHashes;
  }

  setTxHashes(txHashes: any) {
    this.state.txHashes = txHashes;
  }
}

export default MoneroMultisigSignResult;
