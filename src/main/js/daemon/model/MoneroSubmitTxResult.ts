
/**
 * Models the result from submitting a tx to a daemon.
 */
class MoneroSubmitTxResult {
  state: any;

  constructor(state: any) {
    state = Object.assign({}, state);
    this.state = state;
    
    // deserialize BigInts
    if (state.credits !== undefined && !(state.credits instanceof BigInt)) state.credits = BigInt(state.credits);
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (json.credits !== undefined) json.credits = json.credits.toString();
    return json;
  }

  isGood() {
    return this.state.isGood;
  }

  setIsGood(isGood: any) {
    this.state.isGood = isGood;
    return this;
  }

  isRelayed() {
    return this.state.isRelayed;
  }

  setIsRelayed(isRelayed: any) {
    this.state.isRelayed = isRelayed;
    return this;
  }

  isDoubleSpendSeen() {
    return this.state.isDoubleSpendSeen;
  }

  setIsDoubleSpend(isDoubleSpendSeen: any) {
    this.state.isDoubleSpendSeen = isDoubleSpendSeen
    return this;
  }

  isFeeTooLow() {
    return this.state.isFeeTooLow;
  }

  setIsFeeTooLow(isFeeTooLow: any) {
    this.state.isFeeTooLow = isFeeTooLow;
    return this;
  }

  isMixinTooLow() {
    return this.state.isMixinTooLow;
  }

  setIsMixinTooLow(isMixinTooLow: any) {
    this.state.isMixinTooLow = isMixinTooLow;
    return this;
  }

  hasInvalidInput() {
    return this.state.hasInvalidInput;
  }

  setHasInvalidInput(hasInvalidInput: any) {
    this.state.hasInvalidInput = hasInvalidInput;
    return this;
  }

  hasInvalidOutput() {
    return this.state.hasInvalidOutput;
  }

  setHasInvalidOutput(hasInvalidOutput: any) {
    this.state.hasInvalidOutput = hasInvalidOutput;
    return this;
  }

  hasTooFewOutputs() {
    return this.state.hasTooFewOutputs;
  }

  setHasTooFewOutputs(hasTooFewOutputs: any) {
    this.state.hasTooFewOutputs = hasTooFewOutputs;
    return this;
  }

  isOverspend() {
    return this.state.isOverspend;
  }

  setIsOverspend(isOverspend: any) {
    this.state.isOverspend = isOverspend;
    return this;
  }

  getReason() {
    return this.state.reason;
  }

  setReason(reason: any) {
    this.state.reason = reason;
    return this;
  }

  isTooBig() {
    return this.state.isTooBig;
  }

  setIsTooBig(isTooBig: any) {
    this.state.isTooBig = isTooBig;
    return this;
  }

  getSanityCheckFailed() {
    return this.state.sanityCheckFailed;
  }

  setSanityCheckFailed(sanityCheckFailed: any) {
    this.state.sanityCheckFailed = sanityCheckFailed;
    return this;
  }

  getCredits() {
    return this.state.credits;
  }

  setCredits(credits: any) {
    this.state.credits = credits;
    return this;
  }

  getTopBlockHash() {
    return this.state.topBlockHash;
  }

  setTopBlockHash(topBlockHash: any) {
    this.state.topBlockHash = topBlockHash;
    return this;
  }

  isTxExtraTooBig() {
    return this.state.isTxExtraTooBig;
  }

  setIsTxExtraTooBig(isTxExtraTooBig: any) {
    this.state.isTxExtraTooBig = isTxExtraTooBig;
    return this;
  }
}

export default MoneroSubmitTxResult;
