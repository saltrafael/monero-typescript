
/**
 * Models transaction pool statistics.
 */
class MoneroTxPoolStats {
  state: any;

  constructor(state: any) {
    this.state = Object.assign({}, state);
    if (this.state.feeTotal !== undefined && !(this.state.feeTotal instanceof BigInteger)) this.state.feeTotal = BigInteger.parse(this.state.feeTotal);
    if (this.state.histo !== undefined && !(this.state.histo instanceof Map)) this.state.histo = new Map(JSON.parse(this.state.histo));
  }

  toJson() {
    let json = Object.assign({}, this.state);
    if (json.feeTotal) json.feeTotal = json.feeTotal.toString();
    if (json.histo) json.histo = JSON.stringify([...json.histo]); // convert map to array of key-value pairs then stringify
    return json;
  }

  getNumTxs() {
    return this.state.numTxs;
  }

  setNumTxs(numTxs: any) {
    this.state.numTxs = numTxs;
    return this;
  }

  getNumNotRelayed() {
    return this.state.numNotRelayed;
  }

  setNumNotRelayed(numNotRelayed: any) {
    this.state.numNotRelayed = numNotRelayed;
    return this;
  }

  getNumFailing() {
    return this.state.numFailing;
  }

  setNumFailing(numFailing: any) {
    this.state.numFailing = numFailing;
    return this;
  }

  getNumDoubleSpends() {
    return this.state.numDoubleSpends;
  }

  setNumDoubleSpends(numDoubleSpends: any) {
    this.state.numDoubleSpends = numDoubleSpends;
    return this;
  }

  getNum10m() {
    return this.state.num10m;
  }

  setNum10m(num10m: any) {
    this.state.num10m = num10m;
    return this;
  }

  getFeeTotal() {
    return this.state.feeTotal;
  }

  setFeeTotal(feeTotal: any) {
    this.state.feeTotal = feeTotal;
    return this;
  }

  getBytesMax() {
    return this.state.bytesMax;
  }

  setBytesMax(bytesMax: any) {
    this.state.bytesMax = bytesMax;
    return this;
  }

  getBytesMed() {
    return this.state.bytesMed;
  }

  setBytesMed(bytesMed: any) {
    this.state.bytesMed = bytesMed;
    return this;
  }

  getBytesMin() {
    return this.state.bytesMin;
  }

  setBytesMin(bytesMin: any) {
    this.state.bytesMin = bytesMin;
    return this;
  }

  getBytesTotal() {
    return this.state.bytesTotal;
  }

  setBytesTotal(bytesTotal: any) {
    this.state.bytesTotal = bytesTotal;
    return this;
  }

  // TODO: histo... what?
  getHisto() {
    return this.state.histo;
  }

  setHisto(histo: any) {
    this.state.histo = histo;
    return this;
  }

  getHisto98pc() {
    return this.state.histo98pc;
  }

  setHisto98pc(histo98pc: any) {
    this.state.histo98pc = histo98pc;
    return this;
  }

  getOldestTimestamp() {
    return this.state.oldestTimestamp;
  }

  setOldestTimestamp(oldestTimestamp: any) {
    this.state.oldestTimestamp = oldestTimestamp;
    return this;
  }
}

export default MoneroTxPoolStats;
