/**
 * Monero daemon connection span.
 */
class MoneroConnectionSpan {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
  }

  toJson() {
    return Object.assign({}, this.state);
  }

  getConnectionId() {
    return this.state.connectionId;
  }

  setConnectionId(connectionId: any) {
    this.state.connectionId = connectionId;
    return this;
  }

  getNumBlocks() {
    return this.state.numBlocks;
  }

  setNumBlocks(numBlocks: any) {
    this.state.numBlocks = numBlocks;
    return this;
  }

  getRemoteAddress() {
    return this.state.remoteAddress;
  }

  setRemoteAddress(remoteAddress: any) {
    this.state.remoteAddress = remoteAddress;
    return this;
  }

  getRate() {
    return this.state.rate;
  }

  setRate(rate: any) {
    this.state.rate = rate;
    return this;
  }

  getSpeed() {
    return this.state.speed;
  }

  setSpeed(speed: any) {
    this.state.speed = speed;
    return this;
  }

  getSize() {
    return this.state.size;
  }

  setSize(size: any) {
    this.state.size = size;
    return this;
  }

  getStartHeight() {
    return this.state.startHeight;
  }

  setStartHeight(startHeight: any) {
    this.state.startHeight = startHeight;
    return this;
  }
}

export default MoneroConnectionSpan;
