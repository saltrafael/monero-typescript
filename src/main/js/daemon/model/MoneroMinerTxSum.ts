
/**
 * Model for the summation of miner emissions and fees.
 */
class MoneroMinerTxSum {
  state: any;

  constructor(state: any) {
    state = Object.assign({}, state);
    this.state = state;
    
    // deserialize BigInts
    if (state.emissionSum !== undefined && !(state.emissionSum instanceof BigInt)) state.emissionSum = BigInt(state.emissionSum);
    if (state.feeSum !== undefined && !(state.feeSum instanceof BigInt)) state.feeSum = BigInt(state.feeSum);
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getEmissionSum() !== undefined) json.emissionSum = this.getEmissionSum().toString();
    if (this.getFeeSum() !== undefined) json.feeSum = this.getFeeSum().toString();
    return json;
  }

  getEmissionSum() {
    return this.state.emissionSum;
  }

  setEmissionSum(emissionSum: any) {
    this.state.emissionSum = emissionSum;
    return this;
  }

  getFeeSum() {
    return this.state.feeSum;
  }

  setFeeSum(feeSum: any) {
    this.state.feeSum = feeSum;
    return this;
  }
}

export default MoneroMinerTxSum;
