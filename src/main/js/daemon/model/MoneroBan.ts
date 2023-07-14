/**
 * Monero banhammer.
 */
class MoneroBan {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
  }

  toJson() {
    return Object.assign({}, this.state);
  }

  getHost() {
    return this.state.host;
  }

  setHost(host: any) {
    this.state.host = host;
    return this;
  }

  getIp() {
    return this.state.ip;
  }

  setIp(ip: any) {
    this.state.ip = ip;
    return this;
  }

  isBanned() {
    return this.state.isBanned;
  }

  setIsBanned(isBanned: any) {
    this.state.isBanned = isBanned;
    return this;
  }

  getSeconds() {
    return this.state.seconds;
  }

  setSeconds(seconds: any) {
    this.state.seconds = seconds;
    return this;
  }
}

export default MoneroBan;
