/**
 * Result of pruning the blockchain.
 */
class MoneroPruneResult {
  state: any;

  constructor(state: any) {
    state = Object.assign({}, state);
    this.state = state;
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (this.isPruned()) json.isPruned = this.isPruned();
    if (this.getPruningSeed()) json.pruningSeed = this.getPruningSeed();
    return json;
  }

  isPruned() {
    return this.state.isPruned;
  }

  setIsPruned(isPruned: any) {
    this.state.isPruned = isPruned;
    return this;
  }

  getPruningSeed() {
    return this.state.pruningSeed;
  }

  setPruningSeed(pruningSeed: any) {
    this.state.pruningSeed = pruningSeed;
    return this;
  }
}

module.exports = MoneroPruneResult;