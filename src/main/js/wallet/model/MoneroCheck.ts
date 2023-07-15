/**
 * Base class for results from checking a transaction or reserve proof.
 * 
 * @class
 */
class MoneroCheck {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
  }

  isGood() {
    return this.state.isGood;
  }

  setIsGood(isGood: any) {
    this.state.isGood = isGood;
    return this;
  }
}

export default MoneroCheck;
