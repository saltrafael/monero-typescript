/**
 * Result from syncing a Monero wallet.
 */
class MoneroSyncResult {
  numBlocksFetched: any;
  receivedMoney: any;

  constructor(numBlocksFetched: any, receivedMoney: any) {
    this.setNumBlocksFetched(numBlocksFetched);
    this.setReceivedMoney(receivedMoney);
  }

  getNumBlocksFetched() {
    return this.numBlocksFetched;
  }

  setNumBlocksFetched(numBlocksFetched: any) {
    this.numBlocksFetched = numBlocksFetched;
    return this;
  }

  getReceivedMoney() {
    return this.receivedMoney;
  }

  setReceivedMoney(receivedMoney: any) {
    this.receivedMoney = receivedMoney;
    return this;
  }
}

export default MoneroSyncResult;
