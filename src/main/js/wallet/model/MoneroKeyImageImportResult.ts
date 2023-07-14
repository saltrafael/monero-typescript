
/**
 * Models results from importing key images.
 */
class MoneroKeyImageImportResult {
  state: any;

  constructor(state: any) {
    state = Object.assign({}, state);
    if (state.spentAmount !== undefined && !(state.spentAmount instanceof BigInt)) state.spentAmount = BigInt(state.spentAmount);
    if (state.unspentAmount !== undefined && !(state.unspentAmount instanceof BigInt)) state.unspentAmount = BigInt(state.unspentAmount);
    this.state = state;
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (this.getSpentAmount() !== undefined) json.spentAmount = this.getSpentAmount().toString();
    if (this.getUnspentAmount() !== undefined) json.unspentAmount = this.getUnspentAmount().toString();
    return json;
  }

  getHeight() {
    return this.state.height;
  }

  setHeight(height: any) {
    this.state.height = height;
    return this;
  }

  getSpentAmount() {
    return this.state.spentAmount;
  }

  setSpentAmount(spentAmount: any) {
    this.state.spentAmount = spentAmount;
    return this;
  }

  getUnspentAmount() {
    return this.state.unspentAmount;
  }

  setUnspentAmount(unspentAmount: any) {
    this.state.unspentAmount = unspentAmount;
    return this;
  }
}

export default MoneroKeyImageImportResult;
