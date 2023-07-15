
/**
 * Monero hard fork info.
 */
class MoneroHardForkInfo {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
    if (this.state.credits !== undefined && !(this.state.credits instanceof BigInt)) this.state.credits = BigInt(this.state.credits);
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (json.credits !== undefined) json.credits = json.credits.toString();
    return json;
  }

  getEarliestHeight() {
    return this.state.earliestHeight;
  }

  setEarliestHeight(earliestHeight: any) {
    this.state.earliestHeight = earliestHeight;
    return this;
  }

  isEnabled() {
    return this.state.isEnabled;
  }

  setIsEnabled(isEnabled: any) {
    this.state.isEnabled = isEnabled;
    return this;
  }

  getState() {
    return this.state.state;
  }

  setState(state: any) {
    this.state.state = state;
    return this;
  }

  getThreshold() {
    return this.state.threshold;
  }

  setThreshold(threshold: any) {
    this.state.threshold = threshold;
    return this;
  }

  getVersion() {
    return this.state.version;
  }

  setVersion(version: any) {
    this.state.version = version;
    return this;
  }

  getNumVotes() {
    return this.state.numVotes;
  }

  setNumVotes(numVotes: any) {
    this.state.numVotes = numVotes;
    return this;
  }

  getWindow() {
    return this.state.window;
  }

  setWindow(window: any) {
    this.state.window = window;
    return this;
  }

  getVoting() {
    return this.state.voting;
  }

  setVoting(voting: any) {
    this.state.voting = voting;
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
}

export default MoneroHardForkInfo;
