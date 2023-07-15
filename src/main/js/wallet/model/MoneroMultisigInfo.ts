/**
 * Models information about a multisig wallet.
 */
class MoneroMultisigInfo {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
  }

  toJson() {
    return Object.assign({}, this.state);
  }

  isMultisig() {
    return this.state.isMultisig;
  }

  setIsMultisig(isMultisig: any) {
    this.state.isMultisig = isMultisig;
    return this;
  }

  isReady() {
    return this.state.isReady;
  }

  setIsReady(isReady: any) {
    this.state.isReady = isReady;
  }

  getThreshold() {
    return this.state.threshold;
  }

  setThreshold(threshold: any) {
    this.state.threshold = threshold;
  }

  getNumParticipants() {
    return this.state.numParticipants;
  }

  setNumParticipants(numParticipants: any) {
    this.state.numParticipants = numParticipants;
  }
}

export default MoneroMultisigInfo;
